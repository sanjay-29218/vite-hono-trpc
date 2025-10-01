import ChatPreview from "./components/chat/ChatPreview";
import ChatSidebar from "./components/chat/ChatSidebar";
import { SidebarInset, SidebarTrigger } from "./components/ui/sidebar";
import { cn } from "./lib/utils";

function App() {
  return (
    <div className={cn("relative flex h-screen w-full overflow-hidden")}>
      <ChatSidebar />
      <SidebarInset>
        <SidebarTrigger className="absolute top-4 left-4 z-50" />
        <ChatPreview />
      </SidebarInset>
    </div>
  );
}

export default App;
