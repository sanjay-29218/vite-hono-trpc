import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { QueryClient } from "@tanstack/react-query";
import type { AppRouter } from "../../../server/src/trpc/routers/router";
import type {
  RouterInputs,
  RouterOutputs,
} from "../../../server/src/trpc/routers/router";

export const trpc = createTRPCReact<AppRouter>();

export const queryClient = new QueryClient();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      // Prefer explicit env var. Fallback to dev backend directly
      // so auth cookies (set on :3000) are sent with requests.
      url: (import.meta.env.VITE_API_URL as string | undefined)
        ? `${import.meta.env.VITE_API_URL as string}/trpc`
        : "http://localhost:3000/trpc",
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
    }),
  ],
});

export type { RouterInputs, RouterOutputs };
