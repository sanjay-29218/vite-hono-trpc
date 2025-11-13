import type { Context as HonoContext } from "hono";
import type { BlankEnv, BlankInput } from "hono/types";
import { db } from "../db/index.js";
import { auth } from "../lib/auth-server.js";
export async function createTRPCContext(
  c?: HonoContext<BlankEnv, "/trpc/*", BlankInput>
) {
  if (!c) {
    throw new Error("Context is undefined");
  }
  const session = await auth.api.getSession({
    headers: c.req.header(),
  });
  return {
    c,
    session,
    db,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
