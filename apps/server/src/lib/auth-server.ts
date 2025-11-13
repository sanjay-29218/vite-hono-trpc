import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import { schema } from "../db/schema.js";
export const auth = betterAuth({
  baseURL: "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  // Allow requests from the frontend development server
  trustedOrigins: ["http://localhost:5173"],
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
