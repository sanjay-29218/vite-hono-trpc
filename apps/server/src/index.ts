import { Hono } from "hono";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import appRouter from "./trpc/routers/router.js";
import { createTRPCContext } from "./trpc/context.js";
import { logger } from "hono/logger";
import authRouter from "./routes/auth.js";
const app = new Hono();

app.get("/health", (c) => c.text("OK"));
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
    credentials: true,
  })
);
app.use("*", logger());
app.route("/api/auth", authRouter);
app.all("/trpc/*", async (c) => {
  return await fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => createTRPCContext(c),
  });
});

export default app;
