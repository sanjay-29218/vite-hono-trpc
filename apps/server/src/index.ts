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
app.use(
  "*",
  cors({
    origin: "http://localhost:5173",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

app.use("*", logger());
app.route("/api/chat", chatRouter);
app.all("/trpc/*", async (c) => {
  return await fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => createTRPCContext(c),
  });
});

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

export default app;
