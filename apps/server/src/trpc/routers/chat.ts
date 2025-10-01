import { eq } from "drizzle-orm";
import { z } from "zod";
import { thread } from "../db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const chatRouter = createTRPCRouter({
  getChats: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = await ctx;
    const { id: userId } = session.user;
    const chats = await db.query.thread.findMany({
      where: eq(thread.userId, userId),
      orderBy: (thread, { desc }) => [desc(thread.updatedAt)],
    });
    return chats;
  }),
  getChatById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = await ctx;
      const { id } = input;
      const chat = await db.query.thread.findFirst({
        where: eq(thread.id, id),
      });
      return chat;
    }),
  deleteChat: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      const { db } = await ctx;
      await db.delete(thread).where(eq(thread.id, id));
      return { id };
    }),
  //   used for streaming the chat
});
