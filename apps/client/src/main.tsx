import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { queryClient, trpc, trpcClient } from "./utils/trpc";
import AppLayout from "./App";
import { ChatProvider } from "./providers/ChatProvider";
import { RouterProvider, createBrowserRouter, Outlet } from "react-router";
import { SidebarProvider } from "./components/ui/sidebar";
import NewChat from "./components/chat/NewChat";
import ChatPreview from "./components/chat/ChatPreview";
import { useUIChat } from "./providers/ChatProvider";
import { Toaster } from "./components/ui/sonner";

function Root() {
  return (
    <SidebarProvider>
      <ChatProvider>
        <AppLayout>
          <Outlet />
        </AppLayout>
      </ChatProvider>
    </SidebarProvider>
  );
}

export function NewChatElement() {
  const { activeThreadId, newConversationKey } = useUIChat();
  const resolvedNewConversationKey = activeThreadId ?? newConversationKey;
  return <NewChat key={resolvedNewConversationKey} />;
}

export function ChatPreviewElement() {
  const { activeThreadId } = useUIChat();
  return <ChatPreview key={activeThreadId ?? undefined} />;
}

const routeList = [
  { index: true, element: <NewChatElement /> },
  { path: "chat/:chatId", element: <ChatPreviewElement /> },
];

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: routeList,
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Toaster />
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <RouterProvider router={router} />
    </trpc.Provider>
  </StrictMode>
);
