import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import { schema } from "../db/schema.js";

// Determine baseURL - should be the server URL, not client URL
const getBaseURL = () => {
  // In Vercel, use VERCEL_URL if available (this is the server URL)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Use explicit BASE_URL if set
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  // Fallback to hardcoded server URL for now
  return "https://vite-hono-trpc-server.vercel.app";
};

export const auth = betterAuth({
  baseURL: getBaseURL(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: [
    "https://vite-hono-trpc-client.vercel.app",
    "http://localhost:5173",
  ],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
});

export type AuthType = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};
