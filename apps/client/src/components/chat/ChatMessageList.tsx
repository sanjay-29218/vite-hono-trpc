import type { ChatStatus, UIMessage } from "ai";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import {
  CodeBlock,
  CodeBlockCopyButton,
} from "@/components/ai-elements/code-block";
import { memo } from "react";
import isEqual from "lodash/isEqual";

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

export default memo(ChatMessageList, (prevProps, nextProps) => {
  // Fast path: referentially equal messages prevents re-render.
  if (prevProps.messages === nextProps.messages) {
    return true;
  }
  // Fallback: deep equality to avoid unnecessary rerenders if parent creates
  // a new array instance without content change.
  return isEqual(prevProps.messages, nextProps.messages);
});

ChatMessageList.displayName = "ChatMessageList";

function getMessageText(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .filter(Boolean)
    .join("\n\n");
}

interface ChatMessageProps {
  message: UIMessage;
}

const ChatMessage = memo(
  (props: ChatMessageProps) => {
    const text = getMessageText(props.message);
    const isUser = props.message.role === "user";
    return (
      <Message from={props.message.role}>
        <MessageContent variant={isUser ? "contained" : "flat"}>
          {isUser ? (
            <div className="whitespace-pre-wrap">{text}</div>
          ) : (
            <AssistantMarkdown content={text} />
          )}
        </MessageContent>
      </Message>
    );
  },
  (prevProps, nextProps) =>
    prevProps.message === nextProps.message ||
    isEqual(prevProps.message, nextProps.message)
);

ChatMessage.displayName = "ChatMessage";

// Parse markdown to extract fenced code blocks and render them with CodeBlock
export function AssistantMarkdown({ content }: { content: string }) {
  const segments: Array<
    | { type: "text"; text: string }
    | { type: "code"; code: string; lang?: string }
  > = [];

  const fence = /```([\w+\-.]*)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(content)) !== null) {
    const full = match[0];
    const langRaw = match[1] ?? undefined;
    const rawCode = match[2] ?? "";
    const start = match.index;
    if (start > lastIndex) {
      segments.push({ type: "text", text: content.slice(lastIndex, start) });
    }
    segments.push({
      type: "code",
      code: rawCode.replace(/\n$/, ""),
      lang: langRaw || undefined,
    });
    lastIndex = start + full.length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: "text", text: content.slice(lastIndex) });
  }

  if (segments.length === 0) {
    return <Response>{content}</Response>;
  }

  return (
    <div className="grid gap-3">
      {segments.map((seg, idx) =>
        seg.type === "text" ? (
          <Response key={idx}>{seg.text}</Response>
        ) : (
          <CodeBlock
            key={idx}
            code={seg.code}
            language={(seg.lang as any) || "text"}
            showLineNumbers
          >
            <CodeBlockCopyButton />
          </CodeBlock>
        )
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span
        className="bg-muted-foreground h-2 w-2 animate-bounce rounded-full"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="bg-muted-foreground h-2 w-2 animate-bounce rounded-full"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="bg-muted-foreground h-2 w-2 animate-bounce rounded-full"
        style={{ animationDelay: "300ms" }}
      />
      <span className="sr-only">Assistant is typing</span>
    </div>
  );
}

interface AiResponseStreamingProps {
  status: ChatStatus;
  messages: UIMessage[] | undefined;
  isStreamingAssistant: boolean;
}
export function AiResponseStreaming({
  status,
  messages,
  isStreamingAssistant,
}: AiResponseStreamingProps) {
  if (status === "submitted") {
    return (
      <div className="mx-auto max-w-4xl py-6">
        <TypingIndicator />
      </div>
    );
  }
  if (!isStreamingAssistant) return null;
  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex h-full flex-col gap-4 pb-6">
        <Message from="assistant">
          <MessageContent variant="flat">
            <AssistantMarkdown
              content={
                messages
                  ?.map((message) =>
                    message.parts
                      .map((part) => (part.type === "text" ? part.text : ""))
                      .filter(Boolean)
                      .join("\n\n")
                  )
                  .join("\n\n") ?? ""
              }
            />
          </MessageContent>
        </Message>
      </div>
    </div>
  );
}
