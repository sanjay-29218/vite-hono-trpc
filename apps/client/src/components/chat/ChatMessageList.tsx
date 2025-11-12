import type { UIMessage } from "ai";
import { memo } from "react";
import { ChatMessage } from "./ChatMessage";

interface ChatMessageListProps {
  messages: UIMessage[];
  scrollParentRef?: React.RefObject<HTMLDivElement | null>;
}

function ChatMessageList(props: ChatMessageListProps) {
  const messages = props.messages ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="relative py-6">
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
      </div>
    </div>
  );
}

// Avoid deep equality on large message arrays; it's very expensive during streaming.
export default memo(ChatMessageList, (prevProps, nextProps) => {
  // Only re-render if the array length changed or message IDs changed
  if (prevProps.messages.length !== nextProps.messages.length) {
    return false;
  }
  // Check if message IDs are the same (referential equality for messages array)
  return (
    prevProps.messages === nextProps.messages ||
    prevProps.messages.every(
      (msg, idx) => msg.id === nextProps.messages[idx]?.id
    )
  );
});

ChatMessageList.displayName = "ChatMessageList";
