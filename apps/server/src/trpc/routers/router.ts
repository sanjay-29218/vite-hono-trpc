import { createTRPCRouter } from "../server";
import messageRouter from "./message";

const appRouter = createTRPCRouter({
  message: messageRouter,
});

export default appRouter;
export type AppRouter = typeof appRouter;
