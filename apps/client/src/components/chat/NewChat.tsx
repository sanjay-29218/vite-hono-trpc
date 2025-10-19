import { useCallback, useEffect, useState } from "react";
import ChatComposer from "./ChatComposer";
import { useUIChat } from "@/providers/ChatProvider";
import HomeSuggestions from "./HomeSuggestions";
import { useNavigate } from "react-router";
import type { RouterOutputs } from "@/utils/trpc";

export default function NewChat() {
  const {
    sendText,
    stopResponse,
    model,
    setModel,
    setChatMessages,
    setActiveThreadId,
    setChats,
    chats,
  } = useUIChat();
  const [composerInput, setComposerInput] = useState("");
  const [isHomeSuggestionsVisible, setIsHomeSuggestionsVisible] =
    useState(true);
  const navigate = useNavigate();

  const onSend = useCallback(
    (inputMessage: string) => {
      // Hide suggestions immediately to avoid flicker before navigation
      setIsHomeSuggestionsVisible(false);
      const text = (inputMessage ?? "").trim();
      if (text.length === 0) return;

      const newId = crypto.randomUUID();
      const newChat: RouterOutputs["chat"]["getChats"][number] = {
        id: newId,
        title: "New Chat",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: "new",
      };
      const newChats = [newChat, ...chats];
      setChats(newChats);
      // Ensure provider state is reset and active thread is set before first send
      setChatMessages([]);
      setActiveThreadId(newId);
      void navigate(`/chat/${newId}`, { replace: true });

      void sendText(inputMessage, { threadId: newId });
    },
    [sendText, navigate, setChatMessages, setActiveThreadId, chats, setChats]
  );

  useEffect(() => {
    setIsHomeSuggestionsVisible(composerInput.trim().length === 0);
  }, [composerInput]);

  return (
    <div className="relative flex h-full flex-col justify-between p-4">
      {isHomeSuggestionsVisible ? (
        <HomeSuggestions
          className="flex flex-1 items-center justify-center"
          onToggle={setIsHomeSuggestionsVisible}
          onPrefill={onSend}
          visible={isHomeSuggestionsVisible}
        />
      ) : (
        <div className="flex flex-1 "></div>
      )}
      <ChatComposer
        onSend={onSend}
        model={model}
        onModelChange={(m) => setModel(m)}
        onInputChange={setComposerInput}
        onStopResponse={() => {
          void stopResponse();
        }}
        status={"ready"}
      />
    </div>
  );
}
