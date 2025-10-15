import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { thread, threadMessages } from "../../db/schema";
import { createTRPCRouter, protectedProcedure } from "../server";

type ThreadWithMessages = typeof thread.$inferSelect & {
  messages: Array<typeof threadMessages.$inferSelect>;
};

export const chatRouter = createTRPCRouter({
  getChats: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = await ctx;
    const { id: userId } = session?.user as { id: string };
    const chats = await db.query.thread.findMany({
      where: eq(thread.userId, userId),
      orderBy: (thread, { desc }) => [desc(thread.updatedAt)],
    });
    return chats;
  }),
  getChatsWithMessages: protectedProcedure
    .input(
      z
        .object({
          messageLimit: z.number().min(1).max(500).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { session, db } = await ctx;
      const { id: userId } = session?.user as { id: string };

      const chats = await db.query.thread.findMany({
        where: eq(thread.userId, userId),
        orderBy: (t, { desc }) => [desc(t.updatedAt)],
      });

      if (chats.length === 0) return [] as ThreadWithMessages[];

      const threadIds = chats.map((c) => c.id);
      const msgs = await db.query.threadMessages.findMany({
        where: inArray(threadMessages.threadId, threadIds),
        orderBy: (m, { asc }) => [asc(m.createdAt)],
      });

      const limit = input?.messageLimit;
      const grouped = new Map<
        string,
        Array<typeof threadMessages.$inferSelect>
      >();
      for (const m of msgs) {
        const list = grouped.get(m.threadId) ?? [];
        list.push(m);
        grouped.set(m.threadId, list);
      }

      return chats.map((c) => {
        const list = grouped.get(c.id) ?? [];
        const limited = limit
          ? list.slice(Math.max(0, list.length - limit))
          : list;
        return { ...c, messages: limited } as ThreadWithMessages;
      });
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
