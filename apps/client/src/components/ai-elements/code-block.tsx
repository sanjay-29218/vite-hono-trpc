"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type CodeBlockContextType = {
  code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: "",
});

export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  children?: ReactNode;
};

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  className,
  children,
  ...props
}: CodeBlockProps) => (
  <CodeBlockContext.Provider value={{ code }}>
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-md border bg-background text-foreground",
        className
      )}
      {...props}
    >
      <LazyHighlightedBlock
        code={code}
        language={language}
        showLineNumbers={showLineNumbers}
      />
      {children && (
        <div className="absolute top-2 right-2 flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  </CodeBlockContext.Provider>
);

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const { code } = useContext(CodeBlockContext);

  const copyToClipboard = async () => {
    if (typeof window === "undefined" || !navigator.clipboard.writeText) {
      onError?.(new Error("Clipboard API not available"));
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      onCopy?.();
      setTimeout(() => setIsCopied(false), timeout);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      className={cn("shrink-0", className)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Icon size={14} />}
    </Button>
  );
};

// Internal: Lazy load highlighter only when visible and render a single theme
function LazyHighlightedBlock({
  code,
  language,
  showLineNumbers,
}: {
  code: string;
  language: string;
  showLineNumbers: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [Highlighter, setHighlighter] = useState<
    ((props: any) => React.ReactNode) | null
  >(null);
  const [themeStyle, setThemeStyle] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);

  const LONG_THRESHOLD = 400;
  const COLLAPSED_LINES = 250;

  const isLong = useMemo(
    () => code.split("\n").length > LONG_THRESHOLD,
    [code]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || Highlighter) return;
    // Load on first visibility
    void (async () => {
      const [{ Prism }, styles] = await Promise.all([
        import("react-syntax-highlighter"),
        import("react-syntax-highlighter/dist/esm/styles/prism"),
      ]);
      // Prefer OS scheme; if your app toggles class 'dark', this will still look OK
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setHighlighter(() => Prism);
      setThemeStyle(
        prefersDark ? (styles as any).oneDark : (styles as any).oneLight
      );
    })();
  }, [Highlighter, isVisible]);

  const displayCode = useMemo(() => {
    if (!isLong || expanded) return code;
    const lines = code.split("\n");
    const sliced = lines.slice(0, COLLAPSED_LINES).join("\n");
    return `${sliced}\n// … ${lines.length - COLLAPSED_LINES} more lines hidden`;
  }, [code, isLong, expanded]);

  return (
    <div ref={containerRef} className="relative">
      {Highlighter && themeStyle ? (
        <Highlighter
          className="overflow-hidden"
          codeTagProps={{ className: "font-mono text-sm" }}
          customStyle={{
            margin: 0,
            padding: "1rem",
            fontSize: "0.875rem",
            background: "hsl(var(--background))",
            color: "hsl(var(--foreground))",
          }}
          language={language}
          lineNumberStyle={{
            color: "hsl(var(--muted-foreground))",
            paddingRight: "1rem",
            minWidth: "2.5rem",
          }}
          showLineNumbers={showLineNumbers}
          style={themeStyle}
        >
          {displayCode}
        </Highlighter>
      ) : (
        <div className="h-24 w-full animate-pulse bg-muted/40" />
      )}

      {isLong && (
        <div className="absolute bottom-2 right-2 z-[1]">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setExpanded((s) => !s)}
          >
            {expanded ? "Collapse" : "Show more"}
          </Button>
        </div>
      )}
    </div>
  );
}
