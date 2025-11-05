import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Settings, Sparkles, LogOut, Trash, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import SettingCard from "@/components/setting/SettingCard";
import { Tooltip } from "@/components/ui/tooltip";
import { type User } from "better-auth";
import { Link, useNavigate } from "react-router";
import { WarningModal } from "@/components/ui-element/Modal";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useUIChat } from "@/providers/ChatProvider";
import { useChatList } from "@/hooks/use-chat-list";
import ChatSession from "./ChatSession";
import { observer } from "mobx-react-lite";
import { useParams } from "react-router";
const { useSession } = authClient;

const ChatSidebar = observer(function ChatSidebar() {
  const router = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <Sidebar collapsible="offcanvas" className="border-r pb-4">
      <SidebarRail />
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Tooltip
              text="You need to be logged in to create a new chat"
              asChild
            >
              <SidebarMenuButton asChild size="lg">
                <Link
                  to="/"
                  onClick={(e) => {
                    if (!user) {
                      e.preventDefault();
                      return;
                    }
                    toast.info("Creating new chat...");
                    localStorage.removeItem("active_chat_id");
                  }}
                  className="w-full justify-start gap-2"
                >
                  New chat
                </Link>
              </SidebarMenuButton>
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <ChatList user={user ?? null} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setSettingsOpen(true)}
              variant={"default"}
            >
              <Settings className="size-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!user && (
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() =>
                authClient.signIn.social(
                  {
                    provider: "google",
                    callbackURL: `${window.location.origin}/`,
                  },
                  {
                    onSuccess: () => {
                      void router(`/`);
                      window.location.reload();
                    },
                  }
                )
              }
            >
              <Sparkles className="size-4" />
              <span>Sign In With Google</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        {user && (
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Avatar className="size-5">
                <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{user?.name}</span>
            </SidebarMenuButton>

            <Tooltip text="Sign out" asChild>
              <SidebarMenuAction
                aria-label="More"
                onClick={() =>
                  authClient.signOut(
                    {},
                    {
                      onSuccess: () => {
                        // Clear client caches and session
                        localStorage.removeItem("active_chat_id");
                        localStorage.removeItem("selectedModel");
                        void router("/");
                      },
                      onError: () => {},
                    }
                  )
                }
                className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer"
              >
                <LogOut className="size-4" />
              </SidebarMenuAction>
            </Tooltip>
          </SidebarMenuItem>
        )}
      </SidebarFooter>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Manage your settings and preferences.
            </DialogDescription>
          </DialogHeader>
          <SettingCard />
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
});

const ChatList = observer(function ChatList({ user }: { user: User | null }) {
  const { chatSessions, isChatsLoading } = useUIChat();
  const { deleteChatById, isDeleting } = useChatList();

  const [openWarningModal, setOpenWarningModal] = useState<{
    id: string;
    open: boolean;
  } | null>(null);

  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton>Sign in to see your chats</SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      {isChatsLoading && (
        <>
          {Array.from({ length: 6 }).map((_, i) => (
            <SidebarMenuItem key={`s-${i}`}>
              <div className="w-full px-2 py-1.5">
                <Skeleton className="h-5 w-full" />
              </div>
            </SidebarMenuItem>
          ))}
        </>
      )}

      {chatSessions.length === 0 && (
        <SidebarMenuItem>
          <SidebarMenuButton>No chats yet</SidebarMenuButton>
        </SidebarMenuItem>
      )}

      {chatSessions.map((chat) => (
        <ChatSidebarItem
          chat={chat}
          key={chat.id}
          onDelete={(id: string) => setOpenWarningModal({ id, open: true })}
        />
      ))}

      {/* Infinite scroll sentinel */}
      {/* {hasNextPage && (
        <SidebarMenuItem>
          <div ref={sentinelRef} className="w-full px-2 py-2">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading more...
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground">
                Scroll to load more
              </div>
            )}
          </div>
        </SidebarMenuItem>
      )} */}

      <WarningModal
        title="Delete Chat"
        description="Are you sure you want to delete this chat?"
        open={openWarningModal?.open ?? false}
        onConfirm={() => {
          const id = openWarningModal?.id ?? "";
          deleteChatById(id);
          setOpenWarningModal(null);
        }}
        onClose={() => {
          setOpenWarningModal(null);
        }}
        isLoading={isDeleting}
      />
    </SidebarMenu>
  );
});

const ChatSidebarItem = observer(function ChatSidebarItem({
  chat,
  onDelete,
}: {
  chat: ChatSession;
  onDelete: (id: string) => void;
}) {
  const { chatId } = useParams();

  return (
    <SidebarMenuItem key={chat.id}>
      <SidebarMenuButton
        asChild
        isActive={chat.id === chatId}
        className="w-full"
      >
        <Link to={`/chat/${chat.id}`}>{chat.title}</Link>
      </SidebarMenuButton>
      <SidebarMenuAction onClick={() => !chat.isStreaming && onDelete(chat.id)}>
        {chat.isStreaming ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash className="size-4 text-red-500 cursor-pointer" />
        )}
      </SidebarMenuAction>
    </SidebarMenuItem>
  );
});

export default ChatSidebar;
