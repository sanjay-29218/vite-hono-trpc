import type { ChatStatus, UIMessage } from "ai";
import { action, makeObservable, observable } from "mobx";

interface ChatApi {
  send: (message: string) => void;
  stop: () => void;
  status: ChatStatus;
}

export interface StreamingContent {
  text?: string;
  code?: string;
  lang?: string;
  type: "text" | "code";
  id?: string;
  start?: number;
  end?: number;
  isCodeCompleted?: boolean;
}

export default class ChatSession {
  id: string; // thread id
  title?: string;
  messages: UIMessage[];
  status: ChatStatus;
  model: string;
  chatApi?: ChatApi;
  isStreaming?: boolean;
  pendingMessage?: string; // Message to send when chatApi is ready
  isNew?: boolean;
  streamingContent: StreamingContent[];
  constructor(
    id: string,
    messages: UIMessage[],
    title?: string,
    model?: string,
    chatApi?: ChatApi,
    isNew: boolean = false
  ) {
    this.id = id;
    this.messages = messages;
    this.status = "ready";
    this.title = title;
    this.model = model ?? "gemini-2.5-flash";
    this.chatApi = chatApi;
    this.isNew = isNew;
    this.streamingContent = [];
    makeObservable(this, {
      setChatApi: action,
      chatApi: observable,
      messages: observable,
      setMessages: action,
      status: observable,
      setStatus: action,
      model: observable,
      setModel: action,
      init: action,
      isStreaming: observable,
      pendingMessage: observable,
      setPendingMessage: action,
      clearPendingMessage: action,
      isNew: observable,
      setIsNew: action,
      streamingContent: observable,
      setStreamingContent: action,
      clearStreamingContent: action,
      concatStreamingContent: action,
    });
  }
  init(messages: UIMessage[], status: ChatStatus, api: ChatApi, model: string) {
    this.messages = messages;
    this.status = status;
    this.chatApi = api;

    this.model = model;
  }

  setChatApi(chatApi: ChatApi) {
    this.chatApi = chatApi;
  }

  setMessages(messages: UIMessage[]) {
    this.messages = messages;
  }
  setStatus(status: ChatStatus) {
    this.status = status;
    if (status === "streaming" || status === "submitted") {
      this.isStreaming = true;
    } else {
      this.isStreaming = false;
    }
  }
  setIsNew(isNew: boolean) {
    this.isNew = isNew;
  }
  setModel(model: string) {
    this.model = model;
  }
  setPendingMessage(message: string) {
    this.pendingMessage = message;
  }
  clearPendingMessage() {
    this.pendingMessage = undefined;
  }
  setStreamingContent(streamingContent: StreamingContent[]) {
    this.streamingContent = streamingContent;
  }
  concatStreamingContent(content: string) {
    const lastSegment = this.streamingContent.at(-1);
    // this will get the chunk of content that is not yet in the streaming content
    const chunk = content.slice(lastSegment?.end ?? 0);

    if (chunk.length === 0) return;

    // Fixed regexes: starting fence has lang or newline, ending fence is just ```
    const codeFenceStartRegex = /(^|\n)```[\w+\-.]*\s*\n/;
    const isCodeBlockStarting = codeFenceStartRegex.test(chunk);

    let isCodeBlockCompleted = false;
    if (lastSegment?.type === "code") {
      // only check for code block completion if the last segment is a code block
      const codeFenceEndRegex = /(^|\n)```\s*$/;
      isCodeBlockCompleted = codeFenceEndRegex.test(chunk);
    }
    let lang: string | undefined;
    if (isCodeBlockStarting) {
      // Extract language - match the full fence including lang

      const langMatch = chunk.match(/```([\w+\-.]*)\s*\n/);
      lang = langMatch?.[1] || undefined;
    }

    // Handle initial case when array is empty
    if (!lastSegment) {
      if (isCodeBlockStarting) {
        // Strip the fence marker from the chunk
        const codeContent = chunk.replace(/^(.*?\n)?```[\w+\-.]*\s*\n/, "");
        this.streamingContent.push({
          type: "code",
          code: codeContent,
          lang: lang,
          start: 0,
          end: chunk.length,
          id: crypto.randomUUID(),
        });
      } else {
        this.streamingContent.push({
          type: "text",
          text: chunk,
          start: 0,
          end: chunk.length,
          id: crypto.randomUUID(),
        });
      }
      return;
    }

    // Text Continuation Case
    // if last segment is text and not a code block, concatenate the chunk
    if (lastSegment?.type === "text" && !isCodeBlockStarting) {
      lastSegment.text = (lastSegment.text ?? "") + chunk;
      lastSegment.start = lastSegment.start ?? 0;
      lastSegment.end = (lastSegment.end ?? 0) + chunk.length;
      return;
    }

    // New Code Block Starting Case
    // if last segment is text and the chunk is a code block starting, create a new code block segment
    if (lastSegment?.type === "text" && isCodeBlockStarting) {
      // Strip the fence marker
      const codeContent = chunk.replace(/^(.*?\n)?```[\w+\-.]*\s*\n/, "");
      this.streamingContent.push({
        type: "code",
        code: codeContent,
        lang: lang,
        start: lastSegment.end ?? 0,
        end: (lastSegment.end ?? 0) + chunk.length,
        id: crypto.randomUUID(),
      });
      return;
    }

    // Code Block Continuation Case
    // if last segment is code block and the chunk is not closing, concatenate the chunk
    if (
      lastSegment?.type === "code" &&
      !lastSegment.isCodeCompleted &&
      !isCodeBlockCompleted
    ) {
      lastSegment.code = (lastSegment.code ?? "") + chunk;
      lastSegment.start = lastSegment.start ?? 0;
      lastSegment.end = (lastSegment.end ?? 0) + chunk.length;
      return;
    }

    // Code Block Closing Case
    // if last segment is code block and the chunk is closing the code block
    if (lastSegment?.type === "code" && isCodeBlockCompleted) {
      // Strip the closing fence marker
      const codeContent = chunk.replace(/```\s*$/, "");
      lastSegment.code = (lastSegment.code ?? "") + codeContent;
      lastSegment.start = lastSegment.start ?? 0;
      lastSegment.end = (lastSegment.end ?? 0) + chunk.length;
      lastSegment.isCodeCompleted = true;
      return;
    }

    // New Text After Completed Code Case
    // if last segment is code and it is completed and the chunk is text block
    if (
      lastSegment?.type === "code" &&
      lastSegment.isCodeCompleted &&
      !isCodeBlockStarting
    ) {
      this.streamingContent.push({
        type: "text",
        text: chunk,
        start: lastSegment.end ?? 0,
        end: (lastSegment.end ?? 0) + chunk.length,
        id: crypto.randomUUID(),
      });
      return;
    }

    // New Code Block After Completed Code Case
    // if last segment is code and it is completed and the new chunk is again a code block
    if (
      lastSegment?.type === "code" &&
      lastSegment.isCodeCompleted &&
      isCodeBlockStarting
    ) {
      // Strip the fence marker
      const codeContent = chunk.replace(/^(.*?\n)?```[\w+\-.]*\s*\n/, "");
      this.streamingContent.push({
        type: "code",
        code: codeContent,
        lang: lang,
        start: lastSegment.end ?? 0,
        end: (lastSegment.end ?? 0) + chunk.length,
        id: crypto.randomUUID(),
      });
      return;
    }
  }

  clearStreamingContent() {
    this.streamingContent = [];
  }
}
