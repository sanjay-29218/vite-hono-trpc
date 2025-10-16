import ChatSidebar from "./components/chat/ChatSidebar";
import NewChat from "./components/chat/NewChat";
import { SidebarInset, SidebarTrigger } from "./components/ui/sidebar";
import { cn } from "./lib/utils";
import { useUIChat } from "./providers/ChatProvider";

function App() {
  const { activeThreadId } = useUIChat();

  console.log("activeThreadId in app", activeThreadId);
  return (
    <div className={cn("relative flex h-screen w-full overflow-hidden")}>
      <ChatSidebar />
      <SidebarInset>
        <SidebarTrigger className="absolute top-4 left-4 z-50" />
        <NewChat key={activeThreadId} />
        {/* <ChatPreview key={activeThreadId} /> */}
      </SidebarInset>
    </div>
  );
}

export default App;
