import { initTRPC, TRPCError } from "@trpc/server";
import { createTRPCContext } from "./context";

const t = initTRPC.context<ReturnType<typeof createTRPCContext>>().create();
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const { session } = await ctx;
  if (!session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({ ctx: { ...ctx, session } });
});
