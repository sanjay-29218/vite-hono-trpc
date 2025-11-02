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
  loadMoreChats: () => void;
  hasMoreChats: boolean;
  isFetchingMoreChats: boolean;
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
  // Per-thread status helpers
  isThreadLoading: (id: string) => boolean;
  sessionsVersion: number;
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
  // per-thread concurrent sessions
  type SessionAPI = {
    send: (text: string) => Promise<void>;
    stop: () => void;
    setMessages: (messages: UIMessage[]) => void;
  };
  type SessionData = { messages: UIMessage[]; status: ChatStatus };
  const sessionsRef = useRef<
    Map<string, { api: SessionAPI; data: SessionData }>
  >(new Map());
  const pendingResolversRef = useRef<Map<string, (api: SessionAPI) => void>>(
    new Map()
  );
  const [mountedSessionIds, setMountedSessionIds] = useState<string[]>([]);
  const [sessionVersion, setSessionVersion] = useState(0);
  const {
    data: chatPages,
    isLoading,
    refetch: refetchChatsQuery,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.chat.getChatsInfinite.useInfiniteQuery(
    { limit: 10 },
    {
      enabled: !!session,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    }
  );

  const { data: chatWithMessages } = trpc.chat.getChatsWithMessages.useQuery(
    { messageLimit: 20 },
    {
      enabled: !!session,
      refetchOnMount: false,
    }
  );

  useEffect(() => {
    const flattened = chatPages?.pages.flatMap((p) => p.items) ?? [];
    setChats(flattened as RouterOutputs["chat"]["getChats"]);
  }, [chatPages]);

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
  // removed unused global transport; each session manages its own transport

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

  // session helpers
  const ensureSessionMounted = useCallback((id: string) => {
    setMountedSessionIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const waitForSessionApi = useCallback(
    (id: string) =>
      new Promise<SessionAPI>((resolve) => {
        const existing = sessionsRef.current.get(id)?.api;
        if (existing) return resolve(existing);
        pendingResolversRef.current.set(id, resolve);
        ensureSessionMounted(id);
      }),
    [ensureSessionMounted]
  );

  // Pre-mount a session for the active thread to avoid first-send blank state
  useEffect(() => {
    if (activeThreadId) ensureSessionMounted(activeThreadId);
  }, [activeThreadId, ensureSessionMounted]);

  const handleRegister = useCallback((id: string, api: SessionAPI) => {
    const existing = sessionsRef.current.get(id)?.data;
    const cached = cachedMessagesRef.current.get(id) ?? [];
    const dataToUse: SessionData = existing ?? {
      messages: cached,
      status: "ready",
    };

    // Seed the underlying useChat instance so it doesn't start empty and wipe the view
    if (!existing && cached.length > 0) {
      api.setMessages(cached);
    }

    sessionsRef.current.set(id, {
      api,
      data: dataToUse,
    });
    const pending = pendingResolversRef.current.get(id);
    if (pending) {
      pending(api);
      pendingResolversRef.current.delete(id);
    }
    setSessionVersion((v) => v + 1);
  }, []);

  const handleState = useCallback((id: string, data: SessionData) => {
    const entry = sessionsRef.current.get(id);
    if (entry) {
      entry.data = data;
      setSessionVersion((v) => v + 1);
    }
  }, []);

  const onSessionFinish = useCallback(
    (id: string) => {
      void refetchChatsQuery();
      cachedMessagesRef.current.delete(id);
      if (id === (activeThreadIdRef.current ?? activeThreadId ?? "")) {
        void refetchServerMessages();
      }
    },
    [refetchChatsQuery, refetchServerMessages, activeThreadId]
  );
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
      const targetId = opts?.threadId ?? activeThreadId ?? "";
      setActiveThreadIdState(targetId);
      activeThreadIdRef.current = targetId;
      if (!trimmed || !targetId) return;
      const api =
        sessionsRef.current.get(targetId)?.api ||
        (await waitForSessionApi(targetId));
      await api.send(trimmed);
    },
    [activeThreadId, setActiveThreadIdState, waitForSessionApi]
  );

  // Derive visible messages/status for the currently active thread.
  const idForVisible = activeThreadId ?? undefined;
  const visibleMessages: UIMessage[] = (() => {
    if (!idForVisible) return [];
    const entry = sessionsRef.current.get(idForVisible);
    if (entry)
      return entry.data.messages.length > 0
        ? entry.data.messages
        : (cachedMessagesRef.current.get(idForVisible) ?? []);
    return cachedMessagesRef.current.get(idForVisible) ?? [];
  })();

  const visibleStatus: ChatStatus = (() => {
    const id = activeThreadId ?? undefined;
    if (!id) return "ready" as ChatStatus;
    const entry = sessionsRef.current.get(id);
    return entry?.data.status ?? "ready";
  })();

  const stopResponseCb = useCallback(() => {
    const id = activeThreadIdRef.current ?? activeThreadId ?? null;
    if (!id) return;
    const api = sessionsRef.current.get(id)?.api;
    api?.stop();
  }, [activeThreadId]);

  const setChatMessagesCb = useCallback(
    (msgs: UIMessage[]) => {
      const id = activeThreadIdRef.current ?? activeThreadId ?? null;
      if (!id) return;
      const api = sessionsRef.current.get(id)?.api;
      if (api) {
        api.setMessages(msgs);
      } else {
        cachedMessagesRef.current.set(id, msgs);
      }
    },
    [activeThreadId]
  );

  const isThreadLoading = useCallback((id: string) => {
    const status = sessionsRef.current.get(id)?.data.status;
    return status === "submitted" || status === "streaming";
  }, []);

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
        loadMoreChats: () => {
          if (hasNextPage) void fetchNextPage();
        },
        hasMoreChats: !!hasNextPage,
        isFetchingMoreChats: !!isFetchingNextPage,
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
        isThreadLoading,
        sessionsVersion: sessionVersion,
      }}
    >
      {children}
      {/* Hidden per-thread chat sessions to enable parallel streaming */}
      {mountedSessionIds.map((id) => (
        <ChatSession
          key={id}
          threadId={id}
          modelRef={modelRef}
          onRegister={handleRegister}
          onState={handleState}
          onFinish={onSessionFinish}
        />
      ))}
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
function ChatSession(props: {
  threadId: string;
  modelRef: React.MutableRefObject<string>;
  onRegister: (
    id: string,
    api: {
      send: (text: string) => Promise<void>;
      stop: () => void;
      setMessages: (messages: UIMessage[]) => void;
    }
  ) => void;
  onState: (
    id: string,
    data: { messages: UIMessage[]; status: ChatStatus }
  ) => void;
  onFinish: (id: string) => void;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chat`,
        fetch: fetchWithErrorHandlers,
        prepareSendMessagesRequest(req) {
          const userMsg = req.messages.at(-1);
          return {
            body: {
              threadId: props.threadId,
              userMessage: userMsg,
              prevMessages: req.messages,
              model: props.modelRef.current,
              ...req.body,
            },
          };
        },
      }),
    [props.threadId, props.modelRef]
  );

  const { sendMessage, messages, status, stop, setMessages } = useChat({
    id: `chat-${props.threadId}`,
    messages: [],
    transport,
    onFinish: () => props.onFinish(props.threadId),
    onError: (error) => {
      toast.error(
        error.message ?? "An error occurred while sending the message"
      );
    },
  });

  useEffect(() => {
    props.onRegister(props.threadId, {
      send: async (text: string) => {
        await sendMessage({
          role: "user",
          parts: [{ type: "text", text }],
        });
      },
      stop,
      setMessages,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.threadId, sendMessage, stop, setMessages]);

  useEffect(() => {
    props.onState(props.threadId, { messages, status });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.threadId, messages, status]);

  return null;
}
