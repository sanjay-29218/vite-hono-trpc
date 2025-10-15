import ChatPreview from "./components/chat/ChatPreview";
import ChatSidebar from "./components/chat/ChatSidebar";
import { SidebarInset, SidebarTrigger } from "./components/ui/sidebar";
import { cn } from "./lib/utils";
import { useSearchParams } from "react-router";
import { trpc } from "./utils/trpc";
import { useState } from "react";
import type { RouterOutputs } from "./utils/trpc";

function App() {
  const [params] = useSearchParams();
  const [selectedThread, setSelectedThread] =
    useState<RouterOutputs["chat"]["getChats"][number]>();
  const threadId = params.get("threadId") ?? "";
  const { data: threads } = trpc.chat.getChats.useQuery(undefined, {
    enabled: !!threadId,
  });

  console.log("threads", threads);

  return (
    <div className={cn("relative flex h-screen w-full overflow-hidden")}>
      <ChatSidebar onSelectThread={setSelectedThread} />
      <SidebarInset>
        <SidebarTrigger className="absolute top-4 left-4 z-50" />
        <ChatPreview thread={selectedThread} />
      </SidebarInset>
    </div>
  );
}

export default App;
