import { trpc } from "@/utils/trpc";
import { createAuthClient } from "better-auth/react";
import { createContext, useContext, useMemo, useState } from "react";

const ChatContext = createContext<{
  activeChatId?: string | null;
  setActiveChatId: (activeChatId?: string | null) => undefined;
  chats: {
    id: string;
    createdAt: Date;
    updatedAt: Date | null;
    userId: string;
    title: string;
  }[];
  isLoading: boolean;
  refetchChats: () => undefined;
  refetchApiKeys: () => undefined;
  apiKeys: {
    id: string;
    key: string;
    providerName: string;
  }[];
}>({
  activeChatId: null,
  setActiveChatId: (activeChatId?: string | null) => undefined,
  chats: [],
  isLoading: false,
  refetchChats: () => undefined,
  refetchApiKeys: () => undefined,
  apiKeys: [],
});

const { useSession } = createAuthClient();

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
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
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

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
        activeChatId,
        setActiveChatId: (activeChatId?: string | null) => {
          setActiveChatId(activeChatId ?? null);
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
  return useContext(ChatContext);
};
