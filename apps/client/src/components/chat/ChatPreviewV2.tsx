import { useCallback, useRef } from "react";
import ChatComposer from "./ChatComposer";
import ChatMessageWrapper from "./ChatContainer";
import type { ChatApi } from "./ChatV2";
import type { UIMessage } from "ai";

interface ChatPreviewV2Props {
  chatApi?: ChatApi;
  messages: UIMessage[];
}
export default function ChatPreviewV2({
  chatApi,
  messages,
}: ChatPreviewV2Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  if (!chatApi) return null;

  const onSend = useCallback(
    (inputMessage: string) => {
      const text = (inputMessage ?? "").trim();
      if (text.length === 0) return;
      // Optimistically show the user message immediately for great UX
      chatApi.send(inputMessage);
      // Always snap to bottom after sending
      setTimeout(() => {
        scrollToBottom("smooth");
      }, 100);
    },
    [scrollToBottom, chatApi]
  );

  return (
    <div className="relative flex h-full flex-col justify-between p-4">
      <ChatMessageWrapper
        messages={messages}
        status={chatApi.status}
        onScrollToBottom={scrollToBottom}
        scrollContainerRef={scrollContainerRef}
      />
      <ChatComposer
        onSend={onSend}
        model={"gemini-2.5-flash"}
        onModelChange={(m) => {}}
        onStopResponse={() => {
          chatApi.stop();
        }}
        status={chatApi.status}
      />
    </div>
  );
}
