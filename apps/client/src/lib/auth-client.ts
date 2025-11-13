import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const RAW_AUTH_BASE_URL = (
  import.meta as unknown as { env?: Record<string, string | undefined> }
).env?.VITE_API_URL;
const AUTH_BASE_URL = RAW_AUTH_BASE_URL
  ? RAW_AUTH_BASE_URL + "/api/auth"
  : "http://localhost:3000/api/auth";

export const authClient = createAuthClient({
  baseURL: AUTH_BASE_URL,
  plugins: [adminClient()],
});
