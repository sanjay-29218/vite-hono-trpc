import { createTRPCRouter } from "../server";
import { messageRouter } from "./message";
import { apiKeyRouter } from "./apikey";
import { chatRouter } from "./chat";
import { inferRouterInputs } from "@trpc/server";
import { inferRouterOutputs } from "@trpc/server";

const appRouter = createTRPCRouter({
  message: messageRouter,
  apiKey: apiKeyRouter,
  chat: chatRouter,
});

export default appRouter;

export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;

export type AppRouter = typeof appRouter;
