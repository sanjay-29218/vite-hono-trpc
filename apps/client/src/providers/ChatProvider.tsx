import { trpc, type RouterOutputs } from "@/utils/trpc";
import { createAuthClient } from "better-auth/react";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useParams } from "react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ChatStatus, type UIMessage } from "ai";
import { fetchWithErrorHandlers } from "@/lib/utils";
import { toast } from "sonner";

interface ChatContextType {
  activeThreadId: string | null;
  setActiveThreadId: (activeThreadId: string | null | undefined) => void;
  chats: RouterOutputs["chat"]["getChats"];
  setChats: (chats: RouterOutputs["chat"]["getChats"]) => void;
  isLoading: boolean;
  refetchChats: () => void;
  refetchApiKeys: () => void;
  apiKeys: RouterOutputs["apiKey"]["listApiKeys"];
  apiKeysLoading: boolean;
  newConversationKey: string | null;
  setNewConversationKey: (newConversationKey: string | null) => void;
  // Chat session (provider-hosted useChat)
  chatMessages: UIMessage[];
  chatStatus: ChatStatus;
  sendText: (text: string, opts?: { threadId?: string }) => Promise<void>;
  stopResponse: () => void;
  setChatMessages: (messages: UIMessage[]) => void;
  model: string;
  setModel: (model: string) => void;
  cachedMessages: Map<string, UIMessage[]>;
}

const ChatContext = createContext<ChatContextType | null>(null);

const { useSession } = createAuthClient();

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { chatId } = useParams();
  const { data: session } = useSession();
  const [newConversationKey, setNewConversationKey] = useState<string | null>(
    null
  );
  const [chats, setChats] = useState<RouterOutputs["chat"]["getChats"]>([]);
  const [model, setModel] = useState<string>("");
  const modelRef = useRef<string>("");
  const activeThreadIdRef = useRef<string | null>(chatId);
  const cachedMessagesRef = useRef<Map<string, UIMessage[]>>(new Map());
  const {
    data: serverChats,
    isLoading,
    refetch: refetchChatsQuery,
  } = trpc.chat.getChats.useQuery(undefined, {
    enabled: !!session,
  });

  const { data: chatWithMessages } = trpc.chat.getChatsWithMessages.useQuery(
    { messageLimit: 20 },
    {
      enabled: !!session,
      refetchOnMount: false,
    }
  );

  useMemo(() => {
    if (serverChats) {
      setChats(serverChats);
    }
  }, [serverChats]);

  // sync chatWithMessages to cachedMessagesRef
  useEffect(() => {
    if (chatWithMessages) {
      chatWithMessages.forEach((chat) => {
        cachedMessagesRef.current.set(
          chat.id,
          chat.messages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: [{ type: "text" as const, text: String(message.content) }],
          }))
        );
      });
    }
  }, [chatWithMessages]);

  const {
    data: apiKeys,
    refetch: refetchApiKeysQuery,
    isPending: isApiKeysPending,
  } = trpc.apiKey.listApiKeys.useQuery(undefined, {
    enabled: !!session,
    // Avoid refetching on remounts like thread view switches
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
  const [activeThreadId, setActiveThreadIdState] = useState<string | null>(
    chatId || null
  );

  // Keep activeThreadId in sync with route changes
  useEffect(() => {
    setActiveThreadIdState(chatId ?? null);
    activeThreadIdRef.current = chatId ?? null;
  }, [chatId]);

  // expose chats as-is (keep types aligned)
  const memoizedChats = useMemo(() => chats ?? [], [chats]);

  // Keep transport stable across model changes; use ref inside request body
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chat`,
        fetch: fetchWithErrorHandlers,
        prepareSendMessagesRequest(req) {
          const userMsg = req.messages.at(-1);
          return {
            body: {
              threadId: activeThreadIdRef.current ?? activeThreadId ?? "",
              userMessage: userMsg,
              prevMessages: req.messages,
              model: modelRef.current,
              ...req.body,
            },
          };
        },
      }),
    []
  );

  const { data: serverMessages, refetch: refetchServerMessages } =
    trpc.message.getMessages.useQuery(
      { threadId: activeThreadId ?? "" },
      { enabled: !!activeThreadId }
    );

  // this is used to hydrate the messages from the server after every message is sent

  useEffect(() => {
    if (
      serverMessages &&
      serverMessages.length > 0 &&
      !cachedMessagesRef.current.has(activeThreadId ?? "")
    ) {
      cachedMessagesRef.current.set(
        activeThreadId ?? "",
        serverMessages.map((message) => ({
          id: message.id,
          role: message.role,
          parts: [{ type: "text" as const, text: String(message.content) }],
        }))
      );
    }
  }, [serverMessages, activeThreadId]);

  const {
    sendMessage: baseSendMessage,
    messages,
    status,
    stop,
    setMessages,
  } = useChat({
    id: "global-chat",
    messages: [],
    transport,
    onFinish: () => {
      // After a completion, refresh chats so sidebar updates
      void refetchChatsQuery();
      // we are syncing the messages with the server, so we need to delete the cached messages
      cachedMessagesRef.current.delete(activeThreadId ?? "");
      void refetchServerMessages();
    },
    onError: (error) => {
      toast.error(
        error.message ?? "An error occurred while sending the message"
      );
    },
  });

  // hydrate the messages from the cached messages
  useEffect(() => {
    if (activeThreadId && cachedMessagesRef.current.has(activeThreadId)) {
      setMessages(cachedMessagesRef.current.get(activeThreadId) ?? []);
    }
  }, [activeThreadId, setMessages]);
  // Initialize model from localStorage once

  useEffect(() => {
    const initial = localStorage.getItem("selectedModel") ?? "";
    setModel(initial);
    modelRef.current = initial;
  }, []);

  // Keep ref in sync with state without re-creating transport
  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  const sendText = useCallback(
    async (text: string, opts?: { threadId?: string }) => {
      const trimmed = (text ?? "").trim();
      setActiveThreadIdState(opts?.threadId ?? activeThreadId ?? "");
      activeThreadIdRef.current = opts?.threadId ?? activeThreadId ?? "";
      if (!trimmed) return;
      await baseSendMessage({
        role: "user",
        parts: [{ type: "text", text: trimmed }],
      });
    },
    [baseSendMessage, activeThreadId, setActiveThreadIdState]
  );

  // Derive visible messages/status for the currently active thread.
  const visibleMessages = useMemo(() => {
    return messages;
  }, [messages]);

  const visibleStatus: ChatStatus = useMemo(() => {
    return activeThreadId ? status : "ready";
  }, [activeThreadId, status]);

  const stopResponseCb = useCallback(() => stop(), [stop]);

  const setChatMessagesCb = useCallback(
    (msgs: UIMessage[]) => {
      setMessages(msgs);
    },
    [setMessages]
  );

  return (
    <ChatContext.Provider
      value={{
        activeThreadId,
        setActiveThreadId: (nextActive: string | null | undefined) => {
          setActiveThreadIdState(nextActive ?? null);
        },
        chats: memoizedChats,
        isLoading,
        refetchChats: () => {
          void refetchChatsQuery();
        },
        refetchApiKeys: () => {
          void refetchApiKeysQuery();
        },
        cachedMessages: cachedMessagesRef.current,
        apiKeys: apiKeys ?? [],
        apiKeysLoading: !!isApiKeysPending,
        newConversationKey,
        setNewConversationKey: (newConversationKey: string | null) => {
          setNewConversationKey(newConversationKey);
        },
        chatMessages: visibleMessages,
        chatStatus: visibleStatus,
        sendText,
        stopResponse: stopResponseCb,
        setChatMessages: setChatMessagesCb,
        setChats: (chats: RouterOutputs["chat"]["getChats"]) => {
          setChats(chats);
        },
        model,
        setModel: (m: string) => {
          setModel(m);
          localStorage.setItem("selectedModel", m);
        },
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
