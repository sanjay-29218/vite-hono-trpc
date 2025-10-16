import { type ChatStatus, type UIMessage } from "ai";
import ChatMessageList, { AiResponseStreaming } from "./ChatMessageList";
import { memo, useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";

interface ChatContainerProps {
  messages: UIMessage[];
  status: ChatStatus;
  onScrollToBottom: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export default function ChatMessageWrapper(props: ChatContainerProps) {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const { messages, status, onScrollToBottom, scrollContainerRef } = props;
  console.log("messages on chat message wrapper", messages);

  const prevMessages = useMemo(
    () => (status === "streaming" ? messages.slice(0, -1) : messages),
    [messages, status]
  );

  const handleScrollToBottom = useCallback(() => {
    onScrollToBottom();
    setIsAtBottom(true);
  }, [onScrollToBottom]);

  const lastMessage = messages.at(-1);
  const isStreamingAssistant =
    status === "streaming" && lastMessage?.role === "assistant";

  // this is used to observe the container and show scroll to bottom button when reponse is comming
  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setIsAtBottom(el.clientHeight + el.scrollTop >= el.scrollHeight);
    });
    observer.observe(el);
    return () => observer.disconnect();
  });

  // this is used to observe the container and show scroll to bottom button when reponse is comming
  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handler = () => {
      setIsAtBottom(el.clientHeight + el.scrollTop >= el.scrollHeight);
    };
    el.addEventListener("scroll", handler);
    return () => el.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      <div ref={scrollContainerRef} className="relative flex-1 overflow-y-auto">
        <ChatMessageList messages={prevMessages} />
        <AiResponseStreaming
          status={status}
          messages={lastMessage ? [lastMessage] : undefined}
          isStreamingAssistant={isStreamingAssistant}
        />
      </div>
      <ScrollToBottomButton
        visible={!isAtBottom}
        onClick={handleScrollToBottom}
      />
    </>
  );
}

const ScrollToBottomButton = memo(
  (props: { visible: boolean; onClick: () => void }) => {
    if (!props.visible) return null;
    return (
      <div className="absolute bottom-44 left-1/2 z-10 -translate-x-1/2">
        <Button
          size="sm"
          variant="secondary"
          className="shadow"
          onClick={props.onClick}
        >
          <ArrowDown className="mr-1 h-4 w-4" />
          Scroll to bottom
        </Button>
      </div>
    );
  },
  (prev, next) => prev.visible === next.visible && prev.onClick === next.onClick
);

ScrollToBottomButton.displayName = "ScrollToBottomButton";

ScrollToBottomButton.displayName = "ScrollToBottomButton";
