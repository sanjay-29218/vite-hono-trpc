import { useCallback, useEffect, useRef } from "react";
import { observer } from "mobx-react-lite";
import ChatComposer from "./ChatComposer";
import ChatMessageWrapper from "./ChatContainer";
import { useUIChat } from "@/providers/ChatProvider";
import { trpc } from "@/utils/trpc";

const ChatPreview = observer(function ChatPreview() {
  const { activeChatSession } = useUIChat();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const updateThreadModel = trpc.chat.updateThreadModel.useMutation();

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const onSend = useCallback(
    (inputMessage: string) => {
      const text = (inputMessage ?? "").trim();
      if (text.length === 0) return;
      void activeChatSession?.chatApi?.send(inputMessage);
      // Always snap to bottom after sending
      setTimeout(() => {
        scrollToBottom("smooth");
      }, 100);
    },
    [scrollToBottom, activeChatSession]
  );

  useEffect(() => {
    if (activeChatSession) {
      setTimeout(() => {
        scrollToBottom("smooth");
      }, 100);
    }
  }, [activeChatSession, scrollToBottom]);

  return (
    <div className="relative flex h-full flex-col justify-between p-4">
      <ChatMessageWrapper
        messages={activeChatSession?.messages ?? []}
        status={activeChatSession?.status ?? "ready"}
        onScrollToBottom={scrollToBottom}
        scrollContainerRef={scrollContainerRef}
      />
      <ChatComposer
        onSend={onSend}
        model={activeChatSession?.model ?? "gemini-2.5-flash"}
        onModelChange={(m) => {
          const newModel = m ?? "gemini-2.5-flash";
          activeChatSession?.setModel(newModel);
          // Update model in database if thread exists
          if (activeChatSession?.id && !activeChatSession.isNew) {
            void updateThreadModel.mutate({
              threadId: activeChatSession.id,
              model: newModel,
            });
          }
        }}
        onStopResponse={() => {
          void activeChatSession?.chatApi?.stop();
        }}
        status={activeChatSession?.status ?? "ready"}
      />
    </div>
  );
});

export default ChatPreview;
