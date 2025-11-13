import { createTRPCRouter } from "../server.js";
import { messageRouter } from "./message.js";
import { apiKeyRouter } from "./apikey.js";
import { chatRouter } from "./chat.js";
import type { inferRouterInputs } from "@trpc/server";
import type { inferRouterOutputs } from "@trpc/server";

const appRouter = createTRPCRouter({
  message: messageRouter,
  apiKey: apiKeyRouter,
  chat: chatRouter,
});

export default appRouter;

export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;

export type AppRouter = typeof appRouter;
