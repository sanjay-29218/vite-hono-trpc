import { useCallback, useEffect, useRef, useState } from "react";
import ChatComposer from "./ChatComposer";
import { useUIChat } from "@/providers/ChatProvider";
import HomeSuggestions from "./HomeSuggestions";
import { useNavigate } from "react-router";

export default function NewChat() {
  const {
    sendText,
    stopResponse,
    model,
    setModel,
    setChatMessages,
    setActiveThreadId,
  } = useUIChat();
  const threadIdRef = useRef<string>("");
  const [composerInput, setComposerInput] = useState("");
  const [isHomeSuggestionsVisible, setIsHomeSuggestionsVisible] =
    useState(true);
  const navigate = useNavigate();

  const onSend = useCallback(
    (inputMessage: string) => {
      const text = (inputMessage ?? "").trim();
      if (text.length === 0) return;

      if (!threadIdRef.current) {
        const newId = crypto.randomUUID();
        threadIdRef.current = newId;
        // Ensure provider state is reset and active thread is set before first send
        setChatMessages([]);
        setActiveThreadId(newId);
        void navigate(`/chat/${newId}`, { replace: true });
      }

      void sendText(inputMessage, { threadId: threadIdRef.current });
    },
    [sendText, navigate, setChatMessages, setActiveThreadId]
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
