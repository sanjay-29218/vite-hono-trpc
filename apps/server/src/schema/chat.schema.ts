import { type UIMessage } from "ai";
import { z } from "zod";

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1).max(2000),
});

const stepStartSchema = z.object({
  type: z.enum(["step-start"]),
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: z.enum(["image/jpeg", "image/png"]),
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema, stepStartSchema]);

const roleSchema = z.enum(["user", "assistant", "system"]);

const messageSchema = z.object({
  id: z.string(),
  role: roleSchema,
  parts: z.array(partSchema),
});

export const postRequestBodySchema = z.object({
  threadId: z.string().uuid(),
  userMessage: messageSchema,
  //   prevMessages: z.array(messageSchema),
  prevMessages: z.custom<UIMessage[]>(),
  model: z.string(),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
