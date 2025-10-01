import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const AUTH_BASE_URL =
  (import.meta as any).env?.VITE_BETTER_AUTH_URL ??
  "http://localhost:3000/api/auth";

export const authClient = createAuthClient({
  baseURL: AUTH_BASE_URL,
  plugins: [adminClient()],
  socialProviders: {
    google: {
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
    },
  },
});
