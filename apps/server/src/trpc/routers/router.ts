import { createTRPCRouter } from "../server.js";
import messageRouter from "./message.js";

const appRouter = createTRPCRouter({
  message: messageRouter,
});

export default appRouter;
export type AppRouter = typeof appRouter;
