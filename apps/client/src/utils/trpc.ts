import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { QueryClient } from "@tanstack/react-query";
import type { AppRouter } from "../../../server/src/trpc/routers/router";

export const trpc = createTRPCReact<AppRouter>();

export const queryClient = new QueryClient();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      // Prefer explicit env var. Example values:
      // Production: https://vite-hono-trpc-server.vercel.app/trpc
      // Preview:    https://<your-preview-backend>.vercel.app/trpc
      // Dev:        http://localhost:3000/trpc
      url:
        (`${import.meta.env.VITE_API_URL as string}/trpc` as
          | string
          | undefined) ||
        (typeof window === "undefined"
          ? "http://localhost:3000/trpc"
          : "/api/trpc"),
    }),
  ],
});
