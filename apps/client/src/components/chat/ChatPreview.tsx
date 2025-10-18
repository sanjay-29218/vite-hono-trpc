import { type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import ChatComposer from "./ChatComposer";
import ChatMessageWrapper from "./ChatContainer";
import { useUIChat } from "@/providers/ChatProvider";
import { trpc } from "@/utils/trpc";
import { useParams } from "react-router";

export default function ChatPreview() {
  const {
    activeThreadId,
    chatMessages,
    chatStatus,
    sendText,
    stopResponse,
    setChatMessages,
    model,
    setModel,
  } = useUIChat();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const threadIdRef = useRef(activeThreadId);
  const { chatId } = useParams();

  // Preload existing messages if a thread is selected
  const { data: serverMessages } = trpc.message.getMessages.useQuery(
    { threadId: chatId ?? "" },
    { enabled: !!chatId }
  );

  const initialMessages: UIMessage[] = useMemo(() => {
    return (serverMessages ?? []).map((m) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: "text" as const, text: String(m.content) }],
    }));
  }, [serverMessages]);

  // keep threadIdRef in sync with route/active thread
  useEffect(() => {
    threadIdRef.current = chatId ?? activeThreadId;
  }, [activeThreadId, chatId]);

  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setChatMessages(initialMessages);
    }
  }, [initialMessages, setChatMessages]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const onSend = useCallback(
    (inputMessage: string) => {
      const text = (inputMessage ?? "").trim();
      if (text.length === 0) return;
      // Optimistically show the user message immediately for great UX
      void sendText(inputMessage, {
        threadId: threadIdRef.current ?? undefined,
      });
      // Always snap to bottom after sending
      setTimeout(() => {
        scrollToBottom("smooth");
      }, 100);
    },
    [scrollToBottom, sendText]
  );

  console.log("chatMessages", chatMessages);

  return (
    <div className="relative flex h-full flex-col justify-between p-4">
      <ChatMessageWrapper
        messages={chatMessages}
        status={chatStatus}
        onScrollToBottom={scrollToBottom}
        scrollContainerRef={scrollContainerRef}
      />
      <ChatComposer
        onSend={onSend}
        model={model}
        onModelChange={(m) => setModel(m)}
        onStopResponse={() => {
          void stopResponse();
        }}
        status={chatStatus}
      />
    </div>
  );
}
