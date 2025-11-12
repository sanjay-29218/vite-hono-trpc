import { eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../server";
import { apiKey } from "../../db/schema";
import { TRPCError } from "@trpc/server";
export const apiKeyRouter = createTRPCRouter({
  listApiKeys: protectedProcedure.query(async ({ ctx }) => {
    const { db, session } = await ctx;
    const userId = session?.user?.id;
    if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });
    const rows = await db
      .select()
      .from(apiKey)
      .where(eq(apiKey.userId, userId as string));
    return rows;
  }),
  createApiKey: protectedProcedure
    .input(
      z.object({
        providerId: z.string(),
        key: z.string(),
        providerName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { providerId, key, providerName } = input;
      const { session, db } = await ctx;
      const { id: userId } = session?.user as { id: string };
      const [created] = await db
        .insert(apiKey)
        .values({
          id: crypto.randomUUID(),
          modelProviderId: providerId,
          key,
          providerName,
          userId,
        })
        .returning({ id: apiKey.id });
      return created?.id;
    }),
  updateApiKey: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        key: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, key } = input;
      // Optionally, verify ownership by user id in where clause if needed
      const { db } = await ctx;
      const [updated] = await db
        .update(apiKey)
        .set({ key })
        .where(eq(apiKey.id, id))
        .returning({ id: apiKey.id });
      return updated?.id ?? id;
    }),
  deleteApiKey: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      const { db } = await ctx;
      await db.delete(apiKey).where(eq(apiKey.id, id));
      return id;
    }),
});
