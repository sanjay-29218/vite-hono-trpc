import { Hono } from "hono";
import { auth } from "@/lib/auth-server";
import { db } from "@/db";
import { apiKey, thread, threadMessages } from "@/db/schema";
import {
  streamText,
  convertToModelMessages,
  generateText,
  consumeStream,
  smoothStream,
} from "ai";
import { and, eq } from "drizzle-orm";
import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { ChatSDKError } from "@/lib/error";
import { postRequestBodySchema } from "@/schema/chat.schema";

const ModelMap = {
  "gemini-2.5-flash": google("gemini-2.5-flash"),
  "gemini-2.5-flash-lite": google("gemini-2.5-flash-lite"),
  "gemini-2.5-pro": google("gemini-2.5-pro"),
};

const router = new Hono();

router.post("/", async (c) => {
  try {
    const session = await auth.api.getSession({
      headers: c.req.header(),
    });

    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await c.req.json();
    const res = postRequestBodySchema.safeParse(body);

    if (!res.success) {
      return new ChatSDKError(
        "bad_request:api",
        res.error.message
      ).toResponse();
    }
    const { threadId, userMessage, prevMessages, model } = res.data;

    // Resolve per-user provider API key and model
    const providerId = "google";
    const userKeyRows = await db
      .select({ key: apiKey.key })
      .from(apiKey)
      .where(
        and(
          eq(apiKey.userId, session.user.id),
          eq(apiKey.isActive, true),
          eq(apiKey.modelProviderId, providerId)
        )
      )
      .limit(1);

    const googleApiKey = userKeyRows?.[0]?.key;
    const modelId = model || "gemini-2.5-flash";

    const selectedModel = googleApiKey
      ? createGoogleGenerativeAI({ apiKey: googleApiKey })(modelId)
      : (ModelMap[modelId as keyof typeof ModelMap] ??
        ModelMap["gemini-2.5-flash"]);

    let providedThreadId = threadId;
    // see if the conversation exist or not
    const conversation = await db.query.thread.findFirst({
      where: eq(thread.id, threadId),
    });
    const isNewConversation = !conversation;

    // Update model if it has changed for existing conversation
    if (!isNewConversation && conversation.model !== modelId) {
      await db
        .update(thread)
        .set({ model: modelId, updatedAt: new Date() })
        .where(eq(thread.id, threadId));
    }

    if (isNewConversation) {
      let generatedTitle: { text: string };
      try {
        generatedTitle = await generateText({
          model: selectedModel,
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that generates titles for chats. make it short and concise. Even if the user message is small and not meaningful, generate a title for it.",
            },
            {
              role: "user",
              content: `Generate a title for the following chat: ${userMessage?.parts?.[0]?.type === "text" ? userMessage?.parts?.[0]?.text : userMessage?.parts?.[0]?.type === "file" ? userMessage?.parts?.[0]?.name : userMessage?.parts?.[0]?.type === "step-start" ? "Step Start" : ""}`,
            },
          ],
        });
      } catch (err: any) {
        try {
          const parsed = JSON.parse(err?.error?.responseBody ?? "{}");
          const status = parsed?.error?.status;
          if (status === "INVALID_ARGUMENT") {
            return new ChatSDKError("bad_request:api_key").toResponse();
          }
        } catch (_) {}
        return new ChatSDKError("bad_request:api").toResponse();
      }

      const [newThread] = await db
        .insert(thread)
        .values({
          id: threadId,
          userId: session.user.id,
          title: generatedTitle.text,
          model: modelId,
        })
        .returning();
      if (!newThread) {
        throw new ChatSDKError("bad_request:database");
      }
      providedThreadId = newThread.id;
    }

    // Save user message first
    const previousMessage = prevMessages.at(-1);

    if (userMessage) {
      await db.insert(threadMessages).values({
        id: userMessage.id,
        threadId: providedThreadId,
        content:
          userMessage.parts?.[0]?.type === "text"
            ? userMessage?.parts?.[0]?.text
            : userMessage?.parts?.[0]?.type === "file"
              ? userMessage?.parts?.[0]?.name
              : userMessage?.parts?.[0]?.type === "step-start"
                ? "Step Start"
                : "",
        role: "user",
        parentMessageId: previousMessage?.id ? previousMessage?.id : "",
        version: 1,
      });
      // bump thread.updatedAt so updated ordering reflects new activity
      await db
        .update(thread)
        .set({ updatedAt: new Date() })
        .where(eq(thread.id, providedThreadId));
    }

    let providerError: { status?: string; message?: string } | undefined;
    let partialAssistantText = "";
    const result = streamText({
      model: selectedModel,
      messages: convertToModelMessages(
        prevMessages.map((message) => ({
          id: message.id,
          role: message.role,
          parts: message.parts,
        }))
      ),
      onFinish: async ({ text }) => {
        await db.insert(threadMessages).values({
          id: crypto.randomUUID(),
          threadId: providedThreadId,
          content: text,
          role: "assistant",
          parentMessageId: userMessage.id,
          version: 1,
        });
        // ensure updatedAt is bumped after assistant finishes
        await db
          .update(thread)
          .set({ updatedAt: new Date() })
          .where(eq(thread.id, providedThreadId));
      },
      experimental_transform: smoothStream({
        chunking: "word",
      }),
      abortSignal: c.req.raw.signal,
      onChunk: (chunk) => {
        if (chunk.chunk.type === "text-delta") {
          partialAssistantText += chunk.chunk.text;
        }
      },
      onAbort: async ({ steps }) => {
        // save to db
        console.log("❌ Aborted  steps", steps);
        await db.insert(threadMessages).values({
          id: crypto.randomUUID(),
          threadId: providedThreadId,
          content: partialAssistantText,
          role: "assistant",
          parentMessageId: userMessage.id,
          version: 1,
        });
        // also bump updatedAt on abort to reflect activity
        await db
          .update(thread)
          .set({ updatedAt: new Date() })
          .where(eq(thread.id, providedThreadId));
      },
      onError: (error: any) => {
        try {
          const parsed = JSON.parse(error?.error?.responseBody ?? "{}");
          providerError = {
            status: parsed?.error?.status,
            message: parsed?.error?.message,
          };
          console.error("✅Chat API error:", providerError.status);
        } catch (e) {
          console.error("✅Chat API error (unparsed)", error);
        }
        // Do not throw inside the stream callback; capture and handle after.
      },
    });

    try {
      const stream = result.toUIMessageStreamResponse({
        consumeSseStream: consumeStream,
      });
      return stream;
    } catch (e) {
      if (providerError?.status === "INVALID_ARGUMENT") {
        return new ChatSDKError("bad_request:api_key").toResponse();
      }
      return new ChatSDKError(
        "bad_request:stream",
        providerError?.message
      ).toResponse();
    }
  } catch (error) {
    console.error(" ✅ ✅ Chat API error:", error);

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    if (error instanceof Response) {
      return error;
    }

    const cause = error instanceof Error ? error.message : undefined;
    return new ChatSDKError("bad_request:api", cause).toResponse();
  }
});

export default router;
