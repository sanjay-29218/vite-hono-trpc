import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Element } from "hast";
import { CheckIcon, CopyIcon } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  memo,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type BundledLanguage, codeToHtml, type ShikiTransformer } from "shiki";
import { debounce } from "lodash";

type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: BundledLanguage;
  showLineNumbers?: boolean;
};

type CodeBlockContextType = {
  code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: "",
});

const lineNumberTransformer: ShikiTransformer = {
  name: "line-numbers",
  line(node: Element, line: number) {
    node.children.unshift({
      type: "element",
      tagName: "span",
      properties: {
        className: [
          "inline-block",
          "min-w-10",
          "mr-4",
          "text-right",
          "select-none",
          "text-muted-foreground",
        ],
      },
      children: [{ type: "text", value: String(line) }],
    });
  },
};

export async function highlightCode(
  code: string,
  language: BundledLanguage,
  showLineNumbers = false
) {
  const transformers: ShikiTransformer[] = showLineNumbers
    ? [lineNumberTransformer]
    : [];

  return await Promise.all([
    codeToHtml(code, {
      lang: language,
      theme: "one-light",
      transformers,
    }),
    // codeToHtml(code, {
    //   lang: language,
    //   theme: "one-dark-pro",
    //   transformers,
    // }),
  ]);
}

export const CodeBlock = memo(
  ({
    code,
    language,
    showLineNumbers = false,
    className,
    children,
    ...props
  }: CodeBlockProps) => {
    const [html, setHtml] = useState<string>("");
    const mounted = useRef(false);

    // Debounce highlighting to avoid re-processing on every character change
    const debouncedHighlight = useMemo(
      () =>
        debounce(
          (
            codeToHighlight: string,
            lang: BundledLanguage,
            showNumbers: boolean
          ) => {
            highlightCode(codeToHighlight, lang, showNumbers).then(
              ([light]) => {
                if (mounted.current) {
                  setHtml(light);
                }
              }
            );
          },
          150 // Wait 150ms before highlighting
        ),
      []
    );

    useEffect(() => {
      mounted.current = true;
      debouncedHighlight(code, language, showLineNumbers);

      return () => {
        mounted.current = false;
        debouncedHighlight.cancel();
      };
    }, [code, language, showLineNumbers, debouncedHighlight]);

    // Show plain code fallback while debouncing or if HTML not ready
    const plainCodeFallback = useMemo(() => {
      if (!html) {
        return (
          <pre className="m-0 overflow-auto bg-background p-4 font-mono text-sm text-foreground">
            <code>{code}</code>
          </pre>
        );
      }
      return null;
    }, [html, code]);

    return (
      <CodeBlockContext.Provider value={{ code }}>
        <div
          className={cn(
            "group relative w-full overflow-hidden rounded-md border bg-background text-foreground",
            className
          )}
          {...props}
        >
          <div className="relative">
            {plainCodeFallback || (
              <div
                className="overflow-hidden [&>pre]:m-0 [&>pre]:bg-background! [&>pre]:p-4 [&>pre]:text-foreground! [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: "this is needed."
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )}
            {children && (
              <div className="absolute top-2 right-2 flex items-center gap-2">
                {children}
              </div>
            )}
          </div>
        </div>
      </CodeBlockContext.Provider>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison - only re-render if props actually changed
    return (
      prevProps.code === nextProps.code &&
      prevProps.language === nextProps.language &&
      prevProps.showLineNumbers === nextProps.showLineNumbers
    );
  }
);

CodeBlock.displayName = "CodeBlock";

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
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
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
