import { publicProcedure, createTRPCRouter } from "../server";

const messageRouter = createTRPCRouter({
  getMessage: publicProcedure.query(() => "hello tRPC v10!"),
});

export default messageRouter;
