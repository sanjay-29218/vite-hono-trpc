import { eq, inArray, and, or, lt } from "drizzle-orm";
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
  getChatsInfinite: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).optional(),
          cursor: z
            .object({
              updatedAt: z.string(), // ISO
              id: z.string(),
            })
            .optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { session, db } = await ctx;
      const { id: userId } = session?.user as { id: string };
      const limit = input?.limit ?? 10;
      const cursor = input?.cursor;

      const baseWhere = eq(thread.userId, userId);
      const where = cursor
        ? and(
            baseWhere,
            or(
              lt(thread.updatedAt, new Date(cursor.updatedAt)),
              and(
                eq(thread.updatedAt, new Date(cursor.updatedAt)),
                lt(thread.id, cursor.id)
              )
            )
          )
        : baseWhere;

      const rows = await db.query.thread.findMany({
        where,
        orderBy: (t, { desc }) => [desc(t.updatedAt), desc(t.id)],
        limit: limit + 1,
      });

      const items = rows.slice(0, limit);
      const next = rows.length > limit ? rows[limit - 1] : undefined;
      const nextCursor =
        next && next.updatedAt
          ? { updatedAt: next.updatedAt.toISOString(), id: next.id }
          : undefined;

      return { items, nextCursor };
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
  getChatsWithMessagesInfinite: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).optional(),
          cursor: z
            .object({
              updatedAt: z.string(), // ISO
              id: z.string(),
            })
            .optional(),
          messageLimit: z.number().min(1).max(500).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { session, db } = await ctx;
      const { id: userId } = session?.user as { id: string };
      const limit = input?.limit ?? 10;
      const cursor = input?.cursor;
      const perThreadMessageLimit = input?.messageLimit;

      const baseWhere = eq(thread.userId, userId);
      const where = cursor
        ? and(
            baseWhere,
            or(
              lt(thread.updatedAt, new Date(cursor.updatedAt)),
              and(
                eq(thread.updatedAt, new Date(cursor.updatedAt)),
                lt(thread.id, cursor.id)
              )
            )
          )
        : baseWhere;

      const rows = await db.query.thread.findMany({
        where,
        orderBy: (t, { desc }) => [desc(t.updatedAt), desc(t.id)],
        limit: limit + 1,
      });

      const itemsOnly = rows.slice(0, limit);
      if (itemsOnly.length === 0)
        return { items: [] as ThreadWithMessages[], nextCursor: undefined };

      const threadIds = itemsOnly.map((c) => c.id);
      const msgs = await db.query.threadMessages.findMany({
        where: inArray(threadMessages.threadId, threadIds),
        orderBy: (m, { asc }) => [asc(m.createdAt)],
      });

      const grouped = new Map<
        string,
        Array<typeof threadMessages.$inferSelect>
      >();
      for (const m of msgs) {
        const list = grouped.get(m.threadId) ?? [];
        list.push(m);
        grouped.set(m.threadId, list);
      }

      const items: ThreadWithMessages[] = itemsOnly.map((c) => {
        const list = grouped.get(c.id) ?? [];
        const limited = perThreadMessageLimit
          ? list.slice(Math.max(0, list.length - perThreadMessageLimit))
          : list;
        return { ...c, messages: limited } as ThreadWithMessages;
      });

      const next = rows.length > limit ? rows[limit - 1] : undefined;
      const nextCursor =
        next && next.updatedAt
          ? { updatedAt: next.updatedAt.toISOString(), id: next.id }
          : undefined;

      return { items, nextCursor };
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
  updateThreadModel: protectedProcedure
    .input(z.object({ threadId: z.string(), model: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { session, db } = await ctx;
      const { id: userId } = session?.user as { id: string };
      const { threadId, model } = input;

      // Verify the thread belongs to the user
      const existingThread = await db.query.thread.findFirst({
        where: eq(thread.id, threadId),
      });

      if (!existingThread || existingThread.userId !== userId) {
        throw new Error("Thread not found or unauthorized");
      }

      await db
        .update(thread)
        .set({ model, updatedAt: new Date() })
        .where(eq(thread.id, threadId));

      return { threadId, model };
    }),
  //   used for streaming the chat
});
