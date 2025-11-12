"use client";

import { Response } from "@/components/ai-elements/response";
import { cn } from "@/lib/utils";
import { memo, useMemo } from "react";
import { LightAsync as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { github } from "react-syntax-highlighter/dist/esm/styles/hljs";

// Register a small, fast set of common languages for highlight.js
// Keep this lean for perf; unknown langs will render without highlighting
import jsLang from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import tsLang from "react-syntax-highlighter/dist/esm/languages/hljs/typescript";
import bashLang from "react-syntax-highlighter/dist/esm/languages/hljs/bash";
import jsonLang from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import xmlLang from "react-syntax-highlighter/dist/esm/languages/hljs/xml"; // html/xml
import cssLang from "react-syntax-highlighter/dist/esm/languages/hljs/css";
import yamlLang from "react-syntax-highlighter/dist/esm/languages/hljs/yaml";
import mdLang from "react-syntax-highlighter/dist/esm/languages/hljs/markdown";
import pythonLang from "react-syntax-highlighter/dist/esm/languages/hljs/python";
import goLang from "react-syntax-highlighter/dist/esm/languages/hljs/go";
import rustLang from "react-syntax-highlighter/dist/esm/languages/hljs/rust";
import sqlLang from "react-syntax-highlighter/dist/esm/languages/hljs/sql";

SyntaxHighlighter.registerLanguage("javascript", jsLang);
SyntaxHighlighter.registerLanguage("typescript", tsLang);
SyntaxHighlighter.registerLanguage("bash", bashLang);
SyntaxHighlighter.registerLanguage("shell", bashLang);
SyntaxHighlighter.registerLanguage("json", jsonLang);
SyntaxHighlighter.registerLanguage("xml", xmlLang);
SyntaxHighlighter.registerLanguage("html", xmlLang);
SyntaxHighlighter.registerLanguage("css", cssLang);
SyntaxHighlighter.registerLanguage("yaml", yamlLang);
SyntaxHighlighter.registerLanguage("yml", yamlLang);
SyntaxHighlighter.registerLanguage("markdown", mdLang);
SyntaxHighlighter.registerLanguage("python", pythonLang);
SyntaxHighlighter.registerLanguage("go", goLang);
SyntaxHighlighter.registerLanguage("rust", rustLang);
SyntaxHighlighter.registerLanguage("sql", sqlLang);

type Segment =
  | { type: "text"; text: string; start: number }
  | { type: "code"; code: string; lang?: string; start: number };

function normalizeLanguage(lang?: string) {
  if (!lang) return undefined;
  const l = lang.toLowerCase();
  if (l === "js" || l === "jsx") return "javascript";
  if (l === "ts" || l === "tsx") return "typescript";
  if (l === "sh" || l === "zsh") return "bash";
  if (l === "yml") return "yaml";
  if (l === "htm" || l === "html" || l === "xml") return "xml";
  return l;
}

export type MarkdownProps = {
  content: string;
  className?: string;
  showLineNumbers?: boolean;
  // When streaming, render code blocks as plain <pre><code> to avoid re-highlighting on every tick
  isStreaming?: boolean;
};

// Lightweight markdown renderer that streams well:
// - Splits fenced code blocks and highlights with highlight.js via react-syntax-highlighter
// - Non-code segments are rendered with existing <Response> (Streamdown) for markdown text
export const Markdown = memo(function Markdown({
  content,
  className,
  showLineNumbers = false,
  isStreaming = false,
}: MarkdownProps) {
  const segments = useMemo<Segment[]>(() => {
    const result: Segment[] = [];
    const fence = /```([\w+\-.]*)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = fence.exec(content)) !== null) {
      const full = match[0];
      const langRaw = match[1] ?? undefined;
      const rawCode = match[2] ?? "";
      const start = match.index;
      if (start > lastIndex) {
        result.push({
          type: "text",
          text: content.slice(lastIndex, start),
          start: lastIndex,
        });
      }
      result.push({
        type: "code",
        code: rawCode.replace(/\n$/, ""),
        lang: normalizeLanguage(langRaw || undefined),
        start,
      });
      lastIndex = start + full.length;
    }
    if (lastIndex < content.length) {
      result.push({
        type: "text",
        text: content.slice(lastIndex),
        start: lastIndex,
      });
    }
    return result;
  }, [content]);

  if (segments.length === 0) {
    return <Response className={className}>{content}</Response>;
  }

  return (
    <div className={cn("grid gap-3", className)}>
      {segments.map((seg) => {
        if (seg.type === "text") {
          return <Response key={`text:${seg.start}`}>{seg.text}</Response>;
        }

        const language = seg.lang as string | undefined;

        return (
          <div
            key={`code:${seg.start}`}
            className="group relative w-full overflow-hidden rounded-md border bg-background text-foreground"
          >
            <div className="relative">
              {isStreaming ? (
                <div className="relative">
                  <pre className="overflow-x-auto p-4 text-sm">
                    <code className="font-mono text-sm">{seg.code}</code>
                  </pre>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden dark:hidden">
                    <SyntaxHighlighter
                      language={language}
                      style={github}
                      showLineNumbers={showLineNumbers}
                      customStyle={{
                        margin: 0,
                        background: "transparent",
                        padding: "1rem",
                        fontSize: "0.875rem",
                      }}
                      codeTagProps={{ className: "font-mono text-sm" }}
                    >
                      {seg.code}
                    </SyntaxHighlighter>
                  </div>
                  <div className="hidden overflow-hidden dark:block">
                    <SyntaxHighlighter
                      language={language}
                      style={atomOneDark}
                      showLineNumbers={showLineNumbers}
                      customStyle={{
                        margin: 0,
                        background: "transparent",
                        padding: "1rem",
                        fontSize: "0.875rem",
                      }}
                      codeTagProps={{ className: "font-mono text-sm" }}
                    >
                      {seg.code}
                    </SyntaxHighlighter>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});
