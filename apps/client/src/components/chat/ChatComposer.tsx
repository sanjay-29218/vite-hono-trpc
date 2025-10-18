/**
 * This component lets user to compose a chat message
 */
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, ChevronDownIcon, StopCircleIcon } from "lucide-react";
import { Fragment, memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip } from "../ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useUIChat } from "@/providers/ChatProvider";
import { type ChatStatus } from "ai";
import { ALL_PROVIDER_META } from "@/lib/ai-providers";
import { createAuthClient } from "better-auth/react";
import { trpc } from "@/utils/trpc";
import { cn } from "@/lib/utils";

const { useSession } = createAuthClient();
interface ChatComposerProps {
  onSend: (message: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  onInputChange?: (message: string) => void;
  onStopResponse?: () => void;
  status: ChatStatus;
}

function ChatComposer(props: ChatComposerProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [hasAnnouncedTyping, setHasAnnouncedTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { data: session } = useSession();

  const sendCurrentMessage = () => {
    if (!session) return;
    const text = inputMessage.trim();
    if (!text) return;
    props.onSend(inputMessage);
    setInputMessage("");
    props.onInputChange?.("");
    setHasAnnouncedTyping(false);
  };

  return (
    <Tooltip
      disabled={!!session}
      text="You need to be logged in to send messages"
      asChild
    >
      <div
        className={cn(
          "bg-background mx-auto flex h-fit w-full max-w-4xl resize-none flex-col items-center gap-2 rounded-md border border-gray-500/50 p-2",
          !session && "cursor-not-allowed"
        )}
      >
        <Textarea
          placeholder="Ask anything..."
          className="resize-y ring-0 focus:ring-offset-0 focus-visible:ring-0"
          value={inputMessage}
          rows={3}
          ref={textareaRef}
          readOnly={!session}
          disabled={!session}
          onChange={(e) => {
            const val = e.target.value;
            setInputMessage(val);
            props.onInputChange?.(val);
            if (!hasAnnouncedTyping && val.trim().length > 0) {
              window.dispatchEvent(new CustomEvent("chat-started-typing"));
              setHasAnnouncedTyping(true);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (session) sendCurrentMessage();
            }
          }}
        />
        <div
          className={cn(
            "flex w-full items-center justify-between",
            !session && "pointer-events-none"
          )}
        >
          <ChatModelSelector
            model={props.model}
            onModelChange={props.onModelChange}
          />

          <MessageSendStopButton
            message={inputMessage}
            onSend={sendCurrentMessage}
            disabled={!session}
            onStopResponse={props.onStopResponse}
            status={props.status}
          />
        </div>
      </div>
    </Tooltip>
  );
}

export default memo(ChatComposer);

interface MessageSendButtonProps {
  message: string;
  onSend: () => void;
  disabled?: boolean;
  onStopResponse?: () => void;
  status: ChatStatus;
}
const MessageSendStopButton = (props: MessageSendButtonProps) => {
  const showStopButton =
    props.status === "submitted" || props.status === "streaming";

  return (
    <Tooltip
      text={showStopButton ? "Stop" : "Send (Enter). New line: Shift+Enter"}
      asChild
    >
      {showStopButton ? (
        <Button
          variant="outline"
          className="size-10 cursor-pointer rounded-full"
          onClick={() => props.onStopResponse?.()}
          disabled={props.disabled}
          aria-label="Stop"
        >
          <StopCircleIcon />
        </Button>
      ) : (
        <Button
          variant="outline"
          className="size-10 cursor-pointer rounded-full"
          onClick={() => props.onSend()}
          disabled={props.disabled || !props.message.trim()}
          aria-label="Send (Enter). New line: Shift+Enter"
        >
          <ArrowUp />
        </Button>
      )}
    </Tooltip>
  );
};

interface ChatModelSelectorProps {
  model: string;
  onModelChange: (model: string) => void;
}

const ChatModelSelector = (props: ChatModelSelectorProps) => {
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const { isPending } = trpc.apiKey.listApiKeys.useQuery(undefined);
  const { apiKeys } = useUIChat();

  const availableModels = useMemo(() => {
    const models: { key: string; name: string; providerName: string }[] = [];

    apiKeys?.forEach((k) => {
      const provider = ALL_PROVIDER_META.find((p) => p.name === k.providerName);
      if (!provider) return;
      Object.values(provider.models ?? {}).forEach((m) => {
        models.push({
          key: m.key,
          name: m.name,
          providerName: k.providerName,
        });
      });
    });

    return models;
  }, [apiKeys]);

  // Default model selection via effect to avoid setState in render
  useEffect(() => {
    if (!props.model && availableModels.length > 0) {
      const first = availableModels[0]!.key;
      props.onModelChange(first);
      localStorage.setItem("selectedModel", first);
    }
    // only run when available models computed or prop model changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableModels, props.model]);

  return (
    <Fragment>
      <Popover open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline">
            {availableModels.some((m) => m.key === props.model)
              ? props.model
              : (availableModels[0]?.name ?? "Add model")}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          {isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-40" />
            </div>
          ) : availableModels.length === 0 ? (
            <button
              className="text-muted-foreground text-sm underline"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("open-settings"));
                setModelSelectorOpen(false);
              }}
            >
              Add model
            </button>
          ) : (
            <div className="grid gap-2">
              {availableModels.map((m) => (
                <button
                  key={m.key}
                  className="hover:bg-accent rounded-md px-2 py-1 text-left text-sm"
                  onClick={() => {
                    localStorage.setItem("selectedModel", m.key);
                    props.onModelChange(m.key);
                    setModelSelectorOpen(false);
                  }}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </Fragment>
  );
};
