import { createTRPCRouter } from "../server.js";
import { messageRouter } from "./message.js";
import { apiKeyRouter } from "./apikey.js";
import { chatRouter } from "./chat.js";

const appRouter = createTRPCRouter({
  message: messageRouter,
  apiKey: apiKeyRouter,
  chat: chatRouter,
});

export default appRouter;
export type AppRouter = typeof appRouter;
