import { eq } from "drizzle-orm";
import { z } from "zod";
import { threadMessages } from "../../db/schema";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../server";

export const messageRouter = createTRPCRouter({
  createMessage: protectedProcedure
    .input(
      z.object({
        threadId: z.string(),
        content: z.string(),
        parentMessageId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { threadId, content, parentMessageId } = input;
      const messageId = crypto.randomUUID();
      const { db } = await ctx;
      await db.insert(threadMessages).values({
        id: messageId,
        threadId,
        content,
        role: "user",
        isActive: true,
        version: 1,
        parentMessageId,
        createdAt: new Date(),
      });
      return { messageId };
    }),
  getMessages: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { threadId } = input;
      const { db } = await ctx;
      const messages = await db.query.threadMessages.findMany({
        where: eq(threadMessages.threadId, threadId),
        orderBy: (threadMessages, { asc }) => [asc(threadMessages.createdAt)],
      });
      return messages;
    }),
  publicMesages: publicProcedure.query(async ({ ctx }) => {
    return "Hello, world!";
  }),
});
