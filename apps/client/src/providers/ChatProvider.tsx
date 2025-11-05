import ChatSession from "@/components/chat/ChatSession";
import { ChatSessionManager } from "@/components/chat/ChatSessionManager";
import { trpc } from "@/utils/trpc";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";

interface ChatContextType {
  chatSessions: ChatSession[];
  activeChatSession?: ChatSession;
  setChatSessions: (chatSessions: ChatSession[]) => void;
  isChatsLoading: boolean;
  refetchChats: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { chatId } = useParams();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const utils = trpc.useUtils();

  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    trpc.chat.getChatsWithMessagesInfinite.useInfiniteQuery(
      {
        limit: 10,
      },
      {
        getNextPageParam: (last) => last.nextCursor ?? undefined,
      }
    );

  // setting up chat sessions from the database (merge with existing sessions)
  useEffect(() => {
    const chatsWithMessages = data?.pages.flatMap((page) => page.items) ?? [];
    const serverSessions = chatsWithMessages.map(
      (chat) =>
        new ChatSession(
          chat.id,
          chat.messages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: [{ type: "text", text: message.content }],
          })),
          chat.title,
          "gemini-2.5-flash",
          undefined
        )
    );
    setChatSessions((prev) => {
      const serverIds = new Set(serverSessions.map((s) => s.id));
      const preservedLocal = prev.filter((s) => !serverIds.has(s.id));
      // Keep server-provided order (sorted by updatedAt desc) at the top,
      // append any local-only sessions after to avoid random reordering.
      return [...serverSessions, ...preservedLocal];
    });
  }, [data]);

  const activeChatSession = useMemo(
    () => chatSessions.find((chat) => chat.id === chatId),
    [chatSessions, chatId]
  );

  return (
    <ChatContext.Provider
      value={{
        chatSessions,
        activeChatSession,
        setChatSessions,
        isChatsLoading: isLoading,
        refetchChats: () => {
          void utils.chat.getChatsWithMessagesInfinite.invalidate();
        },
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
      }}
    >
      <ChatSessionManager />
      {children}
    </ChatContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useUIChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useUIChat must be used within a ChatProvider");
  }
  return context;
};

// Internal component that hosts one independent chat session per thread.
