import { useEffect, useMemo } from "react";
import { observer } from "mobx-react-lite";
import { useUIChat } from "@/providers/ChatProvider";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { fetchWithErrorHandlers } from "@/lib/utils";
import ChatSession from "./ChatSession";

/**
 * ChatSessionManager - Always mounted component that manages all chat session APIs
 * This ensures all chats can stream in parallel and chatApi is always initialized
 */

export const ChatSessionManager = observer(function ChatSessionManager() {
  const { chatSessions } = useUIChat();

  return (
    <>
      {chatSessions.map((chat) => (
        <ChatSessionController key={chat.id} chat={chat} />
      ))}
    </>
  );
});

/**
 * Individual controller for each chat session
 * Manages the useChat hook and keeps chatApi initialized
 */

const ChatSessionController = observer(function ChatSessionController({
  chat,
}: {
  chat: ChatSession;
}) {
  const { refetchChats } = useUIChat();
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chat`,
        fetch: fetchWithErrorHandlers,
        prepareSendMessagesRequest(req) {
          const threadIdForRequest = chat.id;
          const userMsg = req.messages.at(-1);
          return {
            body: {
              threadId: threadIdForRequest,
              userMessage: userMsg,
              prevMessages: req.messages,
              model: chat.model ?? "gemini-2.5-flash",
              ...req.body,
            },
          };
        },
      }),
    [chat.id, chat.model]
  );

  const { messages, sendMessage, status, stop } = useChat({
    id: chat.id,
    messages: chat.messages,
    transport,
    onFinish: () => {
      if (chat.isNew) {
        void refetchChats();
        chat.setIsNew(false);
      }
    },
    onError: (error) => {
      console.error(error);
    },
  });

  // Initialize chatApi when chat session is created or dependencies change
  useEffect(() => {
    chat.init(
      messages,
      status,
      {
        send: (message: string) => {
          void sendMessage({
            role: "user",
            parts: [{ type: "text", text: message }],
          });
        },
        stop: () => {
          void stop();
        },
        status,
      },
      chat.model ?? "gemini-2.5-flash"
    );

    // If a pending message exists (e.g., from NewChat), send it immediately
    if (chat.pendingMessage) {
      const messageToSend = chat.pendingMessage;
      chat.clearPendingMessage();
      void sendMessage({
        role: "user",
        parts: [{ type: "text", text: messageToSend }],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id, sendMessage, stop]);

  // Sync messages and status back to the session
  useEffect(() => {
    chat.setMessages(messages);
    chat.setStatus(status);
  }, [messages, chat, status]);

  return null; // No UI, just manages the hook
});
