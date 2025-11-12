import { type ChatStatus, type UIMessage } from "ai";
import ChatMessageList from "./ChatMessageList";
import { AiResponseStreaming } from "./StreamingResponse";
import {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

  // Keep a stable reference to the previous messages array
  const prevMessagesRef = useRef<UIMessage[]>([]);
  const prevMessageIdsRef = useRef<string>("");

  const prevMessages = useMemo(() => {
    const isStreaming = status === "streaming" && messages.length > 0;
    const messagesToUse = isStreaming ? messages.slice(0, -1) : messages;
    const currentMessageIds = messagesToUse.map((m) => m.id).join(",");

    // Only create a new array if message IDs actually changed
    if (currentMessageIds !== prevMessageIdsRef.current) {
      prevMessageIdsRef.current = currentMessageIds;
      prevMessagesRef.current = messagesToUse;
      return messagesToUse;
    }

    // If IDs haven't changed but we're streaming, the last message is updating
    // Return the stable reference to prevent re-renders of the list
    // The message objects themselves should maintain referential equality
    return prevMessagesRef.current;
  }, [messages, status]);

  const handleScrollToBottom = useCallback(() => {
    onScrollToBottom();
    setIsAtBottom(true);
  }, [onScrollToBottom]);

  const lastMessage = messages.at(-1);
  const isStreamingAssistant =
    status === "streaming" && lastMessage?.role === "assistant";

  // Observe container size to decide when to show the scroll-to-bottom button
  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const next = el.clientHeight + el.scrollTop >= el.scrollHeight;
      // Avoid redundant state updates which can cause render loops
      setIsAtBottom((prev) => (prev === next ? prev : next));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollContainerRef]);

  // Track scroll position once; guard redundant updates
  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handler = () => {
      const next = el.clientHeight + el.scrollTop >= el.scrollHeight;
      setIsAtBottom((prev) => (prev === next ? prev : next));
    };
    el.addEventListener("scroll", handler);
    return () => el.removeEventListener("scroll", handler);
  }, [scrollContainerRef]);

  return (
    <>
      <div ref={scrollContainerRef} className="relative flex-1 overflow-y-auto">
        <ChatMessageList
          messages={prevMessages}
          scrollParentRef={scrollContainerRef}
        />
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
