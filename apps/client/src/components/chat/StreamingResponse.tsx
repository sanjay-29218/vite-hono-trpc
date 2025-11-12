import type { ChatStatus, UIMessage } from "ai";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { useEffect } from "react";
import { Response } from "../ai-elements/response";
import { CodeBlock, CodeBlockCopyButton } from "../ai-elements/code-block";
import { observer } from "mobx-react-lite";
import type { BundledLanguage } from "shiki";
import { useUIChat } from "@/providers/ChatProvider";

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
