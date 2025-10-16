import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatComposer from "./ChatComposer";
import ChatMessageWrapper from "./ChatContainer";
import { useUIChat } from "@/providers/ChatProvider";
import { fetchWithErrorHandlers } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import HomeSuggestions from "./HomeSuggestions";

export default function NewChat() {
  const { refetchChats, setActiveThreadId, activeThreadId } = useUIChat();
  const threadIdRef = useRef<string>(activeThreadId ?? crypto.randomUUID());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [model, setModel] = useState("");
  const isNewConversation = useRef(!activeThreadId);
  const [composerInput, setComposerInput] = useState("");
  const [isHomeSuggestionsVisible, setIsHomeSuggestionsVisible] = useState(
    isNewConversation.current
  );
  // Preload existing messages if a thread is selected
  const { data: serverMessages, refetch: refetchMessages } =
    trpc.message.getMessages.useQuery(
      { threadId: threadIdRef.current ?? "" },
      { enabled: !!threadIdRef.current }
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
    messages: initialMessages,
    transport,
    onFinish: () => {
      if (isNewConversation.current) {
        isNewConversation.current = false;
        refetchChats();
      }
      refetchMessages();
    },
    onError: (error) => {
      console.error(error);
    },
  });

  useEffect(() => {
    setModel(localStorage.getItem("selectedModel") ?? "");
  }, []);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, setMessages]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const onSend = useCallback(
    (inputMessage: string) => {
      const text = (inputMessage ?? "").trim();
      if (text.length === 0) {
        return;
      }

      if (isNewConversation.current) {
        window.history.replaceState(
          {},
          "",
          `/?threadId=${threadIdRef.current}`
        );
      }

      // Optimistically show the user message immediately for great UX
      void sendMessage({
        role: "user",
        parts: [{ type: "text", text: inputMessage }],
      });
      // Always snap to bottom after sending
      setTimeout(() => {
        scrollToBottom("smooth");
      }, 100);
    },
    [scrollToBottom, sendMessage]
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
      {isHomeSuggestionsVisible && isNewConversation.current && (
        <HomeSuggestions
          className="flex flex-1 items-center justify-center"
          onToggle={setIsHomeSuggestionsVisible}
          onPrefill={onSend}
          visible={isHomeSuggestionsVisible}
        />
      )}
      <ChatMessageWrapper
        messages={messages}
        status={status}
        onScrollToBottom={scrollToBottom}
        scrollContainerRef={scrollContainerRef}
      />
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
