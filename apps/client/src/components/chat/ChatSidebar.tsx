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
import { Trash2, Settings, Sparkles, Loader2, LogOut } from "lucide-react";
import { useUIChat } from "@/providers/ChatProvider";
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";
import { memo, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import SettingCard from "@/components/setting/SettingCard";
import { Tooltip } from "@/components/ui/tooltip";
import { type User } from "better-auth";
import { Link, useNavigate } from "react-router";
import { WarningModal } from "@/components/ui-element/Modal";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
const { useSession } = authClient;

export default function ChatSidebar() {
  const {
    isLoading,
    setActiveThreadId,
    setNewConversationKey,
    setChatMessages,
  } = useUIChat();
  const router = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;

  useEffect(() => {
    const handler = () => setSettingsOpen(true);
    window.addEventListener("open-settings", handler as EventListener);
    return () =>
      window.removeEventListener("open-settings", handler as EventListener);
  }, []);

  // New chat is created lazily on first message from /chat
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
                    localStorage.removeItem("active_chat_id");
                    setActiveThreadId(null);
                    setChatMessages([]);
                    setNewConversationKey(crypto.randomUUID());
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
            <ChatList
              isLoading={isLoading}
              onSelect={(id) => {
                localStorage.setItem("active_chat_id", id);
                setNewConversationKey(null);
                setActiveThreadId(id);
              }}
              user={user ?? null}
            />
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
                        setActiveThreadId(null);
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
}

const ChatList = memo(
  function ChatList({
    isLoading,
    onSelect,
    user,
  }: {
    isLoading: boolean;
    onSelect: (id: string) => void;
    user: User | null;
  }) {
    const { activeThreadId, setActiveThreadId, refetchChats } = useUIChat();
    const navigate = useNavigate();
    const { mutate: deleteChat, isPending: isDeleting } =
      trpc.chat.deleteChat.useMutation({
        onSuccess: ({ id: deletedId }: { id: string }) => {
          if (deletedId === activeThreadId) {
            setActiveThreadId(null);
            void navigate("/");
          }
          refetchChats();
        },
        onError: (error) => {
          console.error(error);
        },
      });

    const { chats } = useUIChat();
    const [openWarningModal, setOpenWarningModal] = useState<{
      id: string;
      open: boolean;
    } | null>(null);

    if (!user && !isLoading) {
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
        {isLoading && (
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

        {!isLoading && chats.length === 0 && (
          <SidebarMenuItem>
            <SidebarMenuButton>No chats yet</SidebarMenuButton>
          </SidebarMenuItem>
        )}

        {chats.map((chat) => (
          <SidebarMenuItem key={chat.id}>
            <SidebarMenuButton
              asChild
              isActive={activeThreadId === chat.id}
              className="w-full"
            >
              <Link to={`/chat/${chat.id}`} onClick={() => onSelect(chat.id)}>
                {chat.title}
              </Link>
            </SidebarMenuButton>
            <SidebarMenuAction
              aria-label="Delete"
              onClick={() => {
                setOpenWarningModal({ id: chat.id, open: true });
              }}
              className="cursor-pointer"
            >
              {isDeleting && openWarningModal?.id === chat.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="text-destructive size-4" />
              )}
            </SidebarMenuAction>
          </SidebarMenuItem>
        ))}

        <WarningModal
          title="Delete Chat"
          description="Are you sure you want to delete this chat?"
          open={openWarningModal?.open ?? false}
          onConfirm={() => {
            deleteChat(
              { id: openWarningModal?.id ?? "" },
              {
                onSuccess: () => {
                  setOpenWarningModal(null);
                },
              }
            );
          }}
          onClose={() => {
            setOpenWarningModal(null);
          }}
          isLoading={isDeleting}
        />
      </SidebarMenu>
    );
  },
  (prev, next) => prev.isLoading === next.isLoading
);
