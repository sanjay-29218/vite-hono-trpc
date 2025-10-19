import { useCallback, useRef } from "react";
import ChatComposer from "./ChatComposer";
import ChatMessageWrapper from "./ChatContainer";
import { useUIChat } from "@/providers/ChatProvider";

export default function ChatPreview() {
  const {
    activeThreadId,
    chatMessages,
    chatStatus,
    sendText,
    stopResponse,
    model,
    setModel,
  } = useUIChat();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const threadIdRef = useRef(activeThreadId);

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
