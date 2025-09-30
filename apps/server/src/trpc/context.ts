import type { Context as HonoContext } from "hono";
import type { BlankEnv, BlankInput } from "hono/types";

export async function createTRPCContext(
  c?: HonoContext<BlankEnv, "/trpc/*", BlankInput>
) {
  if (!c) {
    throw new Error("Context is undefined");
  }
  return {
    c,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
