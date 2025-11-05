import { useCallback, useEffect, useState } from "react";
import ChatComposer from "./ChatComposer";
import { useUIChat } from "@/providers/ChatProvider";
import HomeSuggestions from "./HomeSuggestions";
import { useNavigate } from "react-router";
import ChatSession from "./ChatSession";

export default function NewChat() {
  const { chatSessions, setChatSessions } = useUIChat();
  const [composerInput, setComposerInput] = useState("");
  const [isHomeSuggestionsVisible, setIsHomeSuggestionsVisible] =
    useState(true);
  const navigate = useNavigate();

  const onSend = useCallback(
    (inputMessage: string) => {
      setIsHomeSuggestionsVisible(false);
      const text = (inputMessage ?? "").trim();
      if (text.length === 0) return;

      const newId = crypto.randomUUID();
      const newSession = new ChatSession(
        newId,
        [],
        "New Chat",
        "gemini-2.5-flash",
        undefined,
        true
      );
      newSession.setPendingMessage(text);
      setChatSessions([newSession, ...chatSessions]);
      void navigate(`/chat/${newId}`, { replace: true });
    },
    [navigate, setChatSessions, chatSessions]
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
        model={"gemini-2.5-flash"}
        onModelChange={() => {}}
        onInputChange={setComposerInput}
        onStopResponse={() => {}}
        status={"ready"}
      />
    </div>
  );
}
