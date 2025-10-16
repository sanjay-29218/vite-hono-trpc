import { trpc, type RouterOutputs } from "@/utils/trpc";
import { createAuthClient } from "better-auth/react";
import { createContext, useContext, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

interface ChatContextType {
  activeThreadId: string | null;
  setActiveThreadId: (activeThreadId: string | null | undefined) => void;
  chats: RouterOutputs["chat"]["getChats"];
  isLoading: boolean;
  refetchChats: () => void;
  refetchApiKeys: () => void;
  apiKeys: RouterOutputs["apiKey"]["listApiKeys"];
}

const ChatContext = createContext<ChatContextType | null>(null);

const { useSession } = createAuthClient();

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [params] = useSearchParams();
  const { data: session } = useSession();
  const threadId = params.get("threadId") ?? "";
  const {
    data: chats,
    isLoading,
    refetch: refetchChatsQuery,
  } = trpc.chat.getChats.useQuery(undefined, {
    enabled: !!session,
  });

  const { data: apiKeys, refetch: refetchApiKeysQuery } =
    trpc.apiKey.listApiKeys.useQuery(undefined, {
      enabled: !!session,
    });
  const [activeThreadId, setActiveThreadId] = useState<string | null>(threadId);

  // normalize date fields to Date objects for context consumers
  const memoizedChats = useMemo(
    () =>
      (chats ?? []).map((c: any) => ({
        ...c,
        createdAt: new Date(c.createdAt as unknown as string),
        updatedAt: c.updatedAt
          ? new Date(c.updatedAt as unknown as string)
          : null,
      })),
    [chats]
  );

  return (
    <ChatContext.Provider
      value={{
        activeThreadId,
        setActiveThreadId: (activeThreadId: string | null | undefined) => {
          setActiveThreadId(activeThreadId ?? null);
        },
        chats: memoizedChats,
        isLoading,
        refetchChats: () => {
          void refetchChatsQuery();
        },
        refetchApiKeys: () => {
          void refetchApiKeysQuery();
        },
        apiKeys: apiKeys ?? [],
      }}
    >
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
