import { Hono } from "hono";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import appRouter from "./trpc/routers/router";
import { createTRPCContext } from "./trpc/context";
const app = new Hono();

app.use("*", cors());
app.all("/trpc/*", async (c) => {
  return await fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => createTRPCContext(c),
  });
});

export default app;
