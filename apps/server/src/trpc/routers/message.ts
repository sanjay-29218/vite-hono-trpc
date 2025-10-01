import { publicProcedure, createTRPCRouter } from "../server.js";

const messageRouter = createTRPCRouter({
  getMessage: publicProcedure.query(() => "hello tRPC v10!"),
  getMessage2: publicProcedure.query(() => "hello tRPC v10!2"),
});

export default messageRouter;
