import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatComposer from "./ChatComposer";
import ChatMessageWrapper from "./ChatContainer";
import HomeSuggestions from "./HomeSuggestions";
import { useUIChat } from "@/providers/ChatProvider";
import { fetchWithErrorHandlers } from "@/lib/utils";

export default function ChatPreview() {
  const isNewConversation = useRef(true);
  const { setActiveChatId, refetchChats } = useUIChat();
  const resolvedThreadId = "1";
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [model, setModel] = useState("");
  const [isHomeSuggestionsVisible, setIsHomeSuggestionsVisible] = useState(
    isNewConversation.current
  );
  const [composerInput, setComposerInput] = useState("");

  useEffect(() => {
    setModel(localStorage.getItem("selectedModel") ?? "");
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chat`,
        fetch: fetchWithErrorHandlers,
        prepareSendMessagesRequest(req) {
          return {
            body: {
              threadId: resolvedThreadId,
              userMessage: req.messages.at(-1),
              prevMessages: req.messages,
              model: model,
              ...req.body,
            },
          };
        },
      }),
    [resolvedThreadId, model]
  );

  // initialize use chat hook
  const { sendMessage, messages, status, stop } = useChat({
    id: resolvedThreadId,
    messages: [],
    transport,
    onFinish: () => {
      if (isNewConversation.current) {
        isNewConversation.current = false;
        setActiveChatId(resolvedThreadId);
        refetchChats();
      }
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const onSend = useCallback(
    (inputMessage: string) => {
      const text = (inputMessage ?? "").trim();
      if (text.length === 0) {
        // If empty input during a new conversation, keep suggestions visible and no-op
        if (isNewConversation.current) {
          setIsHomeSuggestionsVisible(true);
        }
        return;
      }
      void sendMessage({
        role: "user",
        parts: [{ type: "text", text: inputMessage }],
      });
      setComposerInput("");
      if (isNewConversation.current) {
        window.history.replaceState({}, "", `/chat/${resolvedThreadId}`);
      }
      // Always snap to bottom after sending
      setTimeout(() => {
        scrollToBottom("smooth");
      }, 100);
    },
    [scrollToBottom, sendMessage, isNewConversation, resolvedThreadId]
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
      {isNewConversation.current && isHomeSuggestionsVisible ? (
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
