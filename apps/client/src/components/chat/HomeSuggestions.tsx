import { memo, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "../ui/tooltip";
import { createAuthClient } from "better-auth/react";
import { cn } from "@/lib/utils";

type TabKey = "create" | "explore" | "debug";

const TABS: { key: TabKey; label: string }[] = [
  { key: "create", label: "Create" },
  { key: "explore", label: "Explore" },
  { key: "debug", label: "Debug" },
];

const QUESTIONS: Record<TabKey, string[]> = {
  create: [
    "Draft a product spec for a mobile notes app",
    "Generate a marketing plan for a SaaS launch",
    "Write a concise README for a Next.js project",
  ],
  explore: [
    "Explain vector databases in simple terms",
    "What’s the difference between RAG and fine-tuning?",
    "Summarize the latest on multimodal LLMs",
  ],
  debug: [
    "Why does my React memo not prevent re-renders?",
    "Fix a TypeScript error: type 'unknown' is not assignable",
    "Optimize slow Next.js server actions",
  ],
};

function emitPrefill(text: string) {
  window.dispatchEvent(new CustomEvent("chat-prefill", { detail: { text } }));
}

interface HomeSuggestionsProps {
  className?: string;
  onToggle?: (visible: boolean) => void;
  onPrefill?: (text: string) => void;
  visible?: boolean;
}

const { useSession } = createAuthClient();
function HomeSuggestions(props: HomeSuggestionsProps) {
  const [active, setActive] = useState<TabKey>("create");
  const [internalVisible, setInternalVisible] = useState(true);
  const { data: session } = useSession();

  useEffect(() => {
    const onTyping = () => {
      props.onToggle?.(false);
      setInternalVisible(false);
    };
    const onHide = () => {
      props.onToggle?.(false);
      setInternalVisible(false);
    };
    window.addEventListener("chat-started-typing", onTyping);
    window.addEventListener("home-suggestions-hide", onHide);
    return () => {
      window.removeEventListener("chat-started-typing", onTyping);
      window.removeEventListener("home-suggestions-hide", onHide);
    };
  }, []);

  const items = useMemo(() => QUESTIONS[active], [active]);

  return (
    <AnimatePresence>
      {(props.visible ?? internalVisible) ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
          className={props.className}
        >
          <div className="mx-auto w-full max-w-4xl">
            <h2 className="my-4 text-center text-3xl font-bold">
              How can I help you today?
            </h2>
            <div className="my-5 flex justify-center gap-5">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActive(t.key)}
                  className={`rounded-full border px-3 py-1 text-sm ${active === t.key ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Tooltip
              disabled={!!session}
              text="You need to be logged in to use this feature"
              asChild
            >
              <ul
                className={cn(
                  "grid gap-2 md:grid-cols-2",
                  !session && "pointer-events-none"
                )}
              >
                {items.map((q, idx) => (
                  <motion.li
                    key={`${active}-${idx}`}
                    layout
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <button
                      onClick={() => {
                        emitPrefill(q);
                        props.onPrefill?.(q);
                        setInternalVisible(false);
                      }}
                      className="hover:bg-accent w-full rounded-md border px-3 py-2 text-left text-sm"
                    >
                      {q}
                    </button>
                  </motion.li>
                ))}
              </ul>
            </Tooltip>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default memo(HomeSuggestions);
