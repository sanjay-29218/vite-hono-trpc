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
  return <NewChat key={crypto.randomUUID()} />;
}

export function ChatPreviewElement() {
  const { activeChatSession } = useUIChat();
  return <ChatPreview key={activeChatSession?.id ?? undefined} />;
}

const routeList = [
  { index: true, element: <NewChatElement /> },
  { path: "chat/:chatId", element: <ChatPreviewElement /> },
];

const router = createBrowserRouter([
  {
    path: "/",
    children: routeList,
    element: <Root />,
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
