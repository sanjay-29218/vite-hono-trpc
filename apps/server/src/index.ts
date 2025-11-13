import { Hono } from "hono";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import appRouter from "./trpc/routers/router.js";
import { createTRPCContext } from "./trpc/context.js";
import { logger } from "hono/logger";
import { auth } from "./lib/auth-server.js";
import chatRouter from "./routes/chat.js";
const app = new Hono();

app.get("/health", (c) => c.text("OK"));

// CORS middleware - must be before routes
app.use(
  "*",
  cors({
    origin: [
      "https://vite-hono-trpc-client.vercel.app",
      "http://localhost:5173",
    ],
    allowHeaders: ["Content-Type", "Authorization", "Cookie", "Set-Cookie"],
    allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE", "PATCH"],
    exposeHeaders: ["Content-Length", "Set-Cookie"],
    maxAge: 600,
    credentials: true,
  })
);

app.use("*", logger());

// Auth routes - handle all methods including OPTIONS
// Better-auth handles its own routing, so we match any path under /api/auth
app.all("/api/auth/*", async (c) => {
  return auth.handler(c.req.raw);
});

// Also handle /api/auth without trailing path for root auth endpoints
app.all("/api/auth", async (c) => {
  return auth.handler(c.req.raw);
});

app.route("/api/chat", chatRouter);

app.all("/trpc/*", async (c) => {
  return await fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => createTRPCContext(c),
  });
});

// Export for Bun/Node.js runtime
export default {
  port: 3000,
  fetch: app.fetch,
  idleTimeout: 120,
};

// Also export the app directly for Vercel/serverless
export { app };
