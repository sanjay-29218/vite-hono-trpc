import type { ChatStatus, UIMessage } from "ai";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { memo, useEffect } from "react";
import { Response } from "../ai-elements/response";
import { CodeBlock, CodeBlockCopyButton } from "../ai-elements/code-block";
import type { StreamingContent } from "./ChatSession";
import { observer } from "mobx-react-lite";
import type { BundledLanguage } from "shiki";
import { useUIChat } from "@/providers/ChatProvider";

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
export default memo(ChatMessageList);

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
            // <Markdown content={text} />
            <AssistantMarkdown content={text} />
          )}
        </MessageContent>
      </Message>
    );
  },
  // Rely on referential equality; messages are keyed by id in the list
  (prevProps, nextProps) => prevProps.message === nextProps.message
);

ChatMessage.displayName = "ChatMessage";

// Parse markdown to extract fenced code blocks and render them with CodeBlock
const AssistantMarkdown = observer(function AssistantMarkdown({
  content,
}: {
  content: string;
}) {
  const segments: Array<StreamingContent> = [];
  const fence = /```([\w+\-.]*)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(content)) !== null) {
    // here exec method finds the first match and sets the index to the end of the match
    const full = match[0];
    const langRaw = match[1] ?? undefined;
    const rawCode = match[2] ?? "";
    const start = match.index;
    // when new text is starting
    if (start > lastIndex) {
      segments.push({ type: "text", text: content.slice(lastIndex, start) });
    }
    // when code is continuing
    segments.push({
      type: "code",
      code: rawCode.replace(/\n$/, ""),
      lang: langRaw || undefined,
    });
    lastIndex = start + full.length;
  }
  // no remaining code block
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
            code={seg.code ?? ""}
            language={((seg.lang as string) || "text") as BundledLanguage}
            showLineNumbers
          >
            <CodeBlockCopyButton />
          </CodeBlock>
        )
      )}
    </div>
  );
});

export const StreamingMarkdown = observer(function StreamingMarkdown({
  content,
}: {
  content: string;
}) {
  const { activeChatSession } = useUIChat();

  useEffect(() => {
    activeChatSession?.concatStreamingContent(content);
  }, [content, activeChatSession]);

  return (
    <div className="grid gap-3">
      {activeChatSession?.streamingContent.map((seg) =>
        seg.type === "text" ? (
          <Response key={seg.id || seg.start}>{seg.text}</Response>
        ) : (
          <CodeBlock
            key={seg.id || seg.start}
            code={seg.code ?? ""}
            language={((seg.lang as string) || "text") as BundledLanguage}
            showLineNumbers={seg.isCodeCompleted ?? false}
          >
            <CodeBlockCopyButton />
          </CodeBlock>
        )
      )}
    </div>
  );
});

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
            <StreamingMarkdown
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
