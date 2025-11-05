import { useEffect, useMemo, useRef } from "react";
import { trpc } from "@/utils/trpc";
import { useNavigate, useParams } from "react-router";

export function useChatList() {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const utils = trpc.useUtils();

  const {
    data: chatPages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.chat.getChatsInfinite.useInfiniteQuery(
    { limit: 10 },
    {
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    }
  );

  const chats = useMemo(
    () => chatPages?.pages.flatMap((p) => p.items) ?? [],
    [chatPages]
  );

  const { mutate: deleteChat, isPending: isDeleting } =
    trpc.chat.deleteChat.useMutation({
      onSuccess: ({ id: deletedId }: { id: string }) => {
        void utils.chat.getChatsInfinite.invalidate();
        if (deletedId === chatId) void navigate("/");
      },
      onError: (error) => {
        console.error(error);
      },
    });

  const deleteChatById = (id: string) => deleteChat({ id });

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    chats,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    sentinelRef,
    deleteChatById,
    isDeleting,
    activeChatId: chatId,
  } as const;
}
