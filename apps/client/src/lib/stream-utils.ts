import type { UIMessage } from "ai";

export interface StreamChunk {
  type: "message" | "text-delta";
  message?: UIMessage;
  textDelta?: string;
}

export interface StreamCallbacks {
  onMessage?: (message: UIMessage) => void;
  onTextDelta?: (delta: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Parses an SSE (Server-Sent Events) stream from a Response body
 * and calls appropriate callbacks for each chunk type
 */
export async function parseSSEStream(
  response: Response,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) {
        reader.cancel();
        break;
      }

      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const jsonStr = line.slice(6);
            const data = JSON.parse(jsonStr) as StreamChunk;

            // Debug logging
            if (data.type === "message" && data.message) {
              callbacks.onMessage?.(data.message);
            } else if (data.type === "text-delta" && data.textDelta) {
              callbacks.onTextDelta?.(data.textDelta);
            } else {
              // Log unexpected format for debugging
              console.log("Unexpected SSE data format:", data);
            }
          } catch (e) {
            // Skip invalid JSON lines
            console.warn("Failed to parse SSE data:", line, e);
          }
        } else if (line.trim() && !line.startsWith(":")) {
          // Log non-data lines for debugging
          console.log("Non-data SSE line:", line);
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      reader.cancel();
      return;
    }
    callbacks.onError?.(
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}
