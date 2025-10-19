import ChatSidebar from "./components/chat/ChatSidebar";
import { SidebarInset, SidebarTrigger } from "./components/ui/sidebar";
import { cn } from "./lib/utils";
import type { PropsWithChildren } from "react";

function AppLayout(props: PropsWithChildren) {
  return (
    <div className={cn("relative flex h-screen w-full overflow-hidden")}>
      <ChatSidebar />
      <SidebarInset>
        <SidebarTrigger className="absolute top-4 left-4 z-50" />
        {props.children}
      </SidebarInset>
    </div>
  );
}

export default AppLayout;
