import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatComposer from "./ChatComposer";
import ChatMessageWrapper from "./ChatContainer";
import HomeSuggestions from "./HomeSuggestions";
import { useUIChat } from "@/providers/ChatProvider";
import { fetchWithErrorHandlers } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

export default function ChatPreview() {
  const { activeThreadId, setActiveThreadId, refetchChats } = useUIChat();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [model, setModel] = useState("");
  const threadIdRef = useRef(activeThreadId);
  const isNewConversation = useRef(!threadIdRef.current);
  const [isHomeSuggestionsVisible, setIsHomeSuggestionsVisible] = useState(
    isNewConversation.current
  );
  const [composerInput, setComposerInput] = useState("");

  // Preload existing messages if a thread is selected
  const { data: serverMessages, refetch: refetchMessages } =
    trpc.message.getMessages.useQuery(
      { threadId: activeThreadId ?? "" },
      { enabled: !!activeThreadId }
    );

  const initialMessages: UIMessage[] = useMemo(() => {
    return (serverMessages ?? []).map((m) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: "text" as const, text: String(m.content) }],
    }));
  }, [serverMessages]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chat`,
        fetch: fetchWithErrorHandlers,
        prepareSendMessagesRequest(req) {
          return {
            body: {
              threadId: threadIdRef.current ?? "",
              userMessage: req.messages.at(-1),
              prevMessages: req.messages,
              model: model,
              ...req.body,
            },
          };
        },
      }),
    [model]
  );

  const { sendMessage, messages, status, stop, setMessages } = useChat({
    id: threadIdRef.current || "new",
    messages: initialMessages ?? [],
    transport,
    onFinish: () => {
      if (isNewConversation.current) {
        isNewConversation.current = false;
        setActiveThreadId(threadIdRef.current);
        refetchChats();
      } else {
        refetchMessages();
      }
    },
    onError: (error) => {
      console.error(error);
    },
  });

  useEffect(() => {
    setModel(localStorage.getItem("selectedModel") ?? "");
  }, []);

  console.log("initialMessages", initialMessages, "messages", messages);

  useEffect(() => {
    if (
      initialMessages &&
      initialMessages.length > 0 &&
      !isNewConversation.current
    ) {
      setMessages(initialMessages);
    }
  }, [initialMessages, setMessages]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const onSend = useCallback(
    (inputMessage: string) => {
      const text = (inputMessage ?? "").trim();
      setIsHomeSuggestionsVisible(false);
      if (text.length === 0) {
        // If empty input during a new conversation, keep suggestions visible and no-op
        if (isNewConversation.current) {
          setIsHomeSuggestionsVisible(true);
        }
        return;
      }
      if (isNewConversation.current) {
        // create a new thread id before sending so the request uses the correct id
        const newId = crypto.randomUUID();
        threadIdRef.current = newId;
        window.history.replaceState({}, "", `/?threadId=${newId}`);
        // Hide suggestions immediately since user started a new chat
        setIsHomeSuggestionsVisible(false);
      }
      // Optimistically show the user message immediately for great UX
      void sendMessage({
        role: "user",
        parts: [{ type: "text", text: inputMessage }],
      });
      setComposerInput("");
      // Always snap to bottom after sending
      setTimeout(() => {
        scrollToBottom("smooth");
      }, 100);
    },
    [scrollToBottom, sendMessage, isNewConversation, threadIdRef]
  );

  // Keep HomeSuggestions visible when new chat and composer is empty
  useEffect(() => {
    if (!isNewConversation.current) return;
    const show =
      composerInput.trim().length === 0 && (messages?.length ?? 0) === 0;
    setIsHomeSuggestionsVisible(show);
  }, [composerInput, messages]);

  return (
    <div className="relative flex h-full flex-col justify-between p-4">
      {isNewConversation.current &&
      isHomeSuggestionsVisible &&
      messages.length === 0 ? (
        <HomeSuggestions
          className="flex flex-1 items-center justify-center"
          onToggle={setIsHomeSuggestionsVisible}
          onPrefill={onSend}
          visible={isHomeSuggestionsVisible}
        />
      ) : (
        <ChatMessageWrapper
          messages={messages}
          status={status}
          onScrollToBottom={scrollToBottom}
          scrollContainerRef={scrollContainerRef}
        />
      )}
      <ChatComposer
        onSend={onSend}
        model={model}
        onModelChange={(m) => setModel(m)}
        onInputChange={setComposerInput}
        onStopResponse={() => {
          void stop();
        }}
        status={status}
      />
    </div>
  );
}
