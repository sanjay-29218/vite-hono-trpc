import { Hono } from "hono";
import { auth } from "../lib/auth-server.js";
import type { AuthType } from "../lib/auth-server.js";

const router = new Hono<{ Bindings: AuthType }>({
  strict: false,
});

// Mounted at "/api/auth" in index.ts, so handle everything under that mount
router.on(["POST", "GET"], "/*", (c) => {
  return auth.handler(c.req.raw);
});

export default router;
