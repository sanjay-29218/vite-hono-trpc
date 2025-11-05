import { useUIChat } from "@/providers/ChatProvider";
import { trpc } from "@/utils/trpc";
import { useNavigate, useParams } from "react-router";

export function useChatList() {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const { refetchChats } = useUIChat();

  const { mutate: deleteChat, isPending: isDeleting } =
    trpc.chat.deleteChat.useMutation({
      onSuccess: ({ id: deletedId }: { id: string }) => {
        if (deletedId === chatId) void navigate("/");
        void refetchChats();
      },
      onError: (error) => {
        console.error(error);
      },
    });

  const deleteChatById = (id: string) => deleteChat({ id });

  return {
    deleteChatById,
    isDeleting,
    activeChatId: chatId,
  } as const;
}
