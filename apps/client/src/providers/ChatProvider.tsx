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

interface ChatContextType {
  activeThreadId: string | null;
  setActiveThreadId: (activeThreadId: string | null | undefined) => void;
  chats: RouterOutputs["chat"]["getChats"];
  isLoading: boolean;
  refetchChats: () => void;
  refetchApiKeys: () => void;
  apiKeys: RouterOutputs["apiKey"]["listApiKeys"];
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
}

const ChatContext = createContext<ChatContextType | null>(null);

const { useSession } = createAuthClient();

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { chatId } = useParams();
  const { data: session } = useSession();
  const threadIdFromRoute = chatId ?? null;
  const [newConversationKey, setNewConversationKey] = useState<string | null>(
    null
  );
  const [model, setModel] = useState<string>("");
  const currentSendThreadIdRef = useRef<string | null>(null);
  // Cache messages per thread to quickly rehydrate when switching
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
  const [activeThreadId, setActiveThreadIdState] = useState<string | null>(
    chatId || null
  );

  // Keep activeThreadId in sync with route changes
  useEffect(() => {
    setActiveThreadIdState(threadIdFromRoute ?? null);
  }, [threadIdFromRoute]);

  // expose chats as-is (keep types aligned)
  const memoizedChats = useMemo(() => chats ?? [], [chats]);

  // Build a transport once per model (and keep it stable otherwise)
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chat`,
        fetch: fetchWithErrorHandlers,
        prepareSendMessagesRequest(req) {
          const threadIdForRequest =
            currentSendThreadIdRef.current ?? activeThreadId ?? "";
          const userMsg = req.messages.at(-1);
          return {
            body: {
              threadId: threadIdForRequest,
              userMessage: userMsg,
              prevMessages: req.messages,
              model,
              ...req.body,
            },
          };
        },
      }),
    [model, activeThreadId]
  );

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
    },
    onError: (error) => {
      console.error(error);
    },
  });

  console.log("messages", messages);

  // Initialize model from localStorage once
  useEffect(() => {
    setModel(localStorage.getItem("selectedModel") ?? "");
  }, []);

  const sendText = useCallback(
    async (text: string, opts?: { threadId?: string }) => {
      const trimmed = (text ?? "").trim();
      if (!trimmed) return;
      // Decide which thread this send belongs to
      const threadIdForRequest = opts?.threadId ?? activeThreadId ?? "";
      currentSendThreadIdRef.current = threadIdForRequest;
      await baseSendMessage({
        role: "user",
        parts: [{ type: "text", text: trimmed }],
      });
    },
    [activeThreadId, baseSendMessage]
  );

  // Derive visible messages/status for the currently active thread.
  const visibleMessages = useMemo(() => {
    return messages;
  }, [messages]);

  const visibleStatus: ChatStatus = useMemo(() => {
    const sendingThread = currentSendThreadIdRef.current;
    return sendingThread === activeThreadId ? status : ("ready" as ChatStatus);
  }, [activeThreadId, status]);

  const stopResponseCb = useCallback(() => stop(), [stop]);

  const setChatMessagesCb = useCallback(
    (msgs: UIMessage[]) => {
      console.log("setChatMessagesCb", msgs);
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
        apiKeys: apiKeys ?? [],
        newConversationKey,
        setNewConversationKey: (newConversationKey: string | null) => {
          setNewConversationKey(newConversationKey);
        },
        chatMessages: visibleMessages,
        chatStatus: visibleStatus,
        sendText,
        stopResponse: stopResponseCb,
        setChatMessages: setChatMessagesCb,
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
