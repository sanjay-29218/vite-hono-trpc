import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChatSDKError, type ErrorCode } from "./error";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      let code: string | undefined;
      let cause: string | undefined;
      try {
        const data = await response.clone().json();
        code = data?.code;
        cause = data?.cause ?? data?.message;
      } catch {
        try {
          const text = await response.text();
          cause = text;
        } catch {
          // ignore
        }
      }

      console.error("❌ Chat Fetch Error", "code", code, "cause", cause);

      if (code) {
        throw new ChatSDKError(code as ErrorCode, cause);
      }
      throw new ChatSDKError("bad_request:api", cause);
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new ChatSDKError("offline:chat");
    }

    throw error;
  }
}
