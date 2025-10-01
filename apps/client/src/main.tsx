import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { queryClient, trpc, trpcClient } from "./utils/trpc";
import App from "./App";
import { ChatProvider } from "./providers/ChatProvider";
import { BrowserRouter } from "react-router";
import { SidebarProvider } from "./components/ui/sidebar";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <BrowserRouter>
        <SidebarProvider>
          <ChatProvider>
            <App />
          </ChatProvider>
        </SidebarProvider>
      </BrowserRouter>
    </trpc.Provider>
  </StrictMode>
);
