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
    const codeFenceStartRegex = /(^|\n)```([\w+\-.]*)?[\s\n]?$/;
    const isCodeBlockStarting = codeFenceStartRegex.test(chunk);
    const isCodeBlockCompleted = /```[\s\n]*$/.test(chunk);
    const langMatch = chunk.match(/```(\w+)?/);
    const lang = langMatch?.[1] ?? undefined;

    // Handle initial case when array is empty
    if (!lastSegment) {
      this.streamingContent.push({
        type: isCodeBlockStarting ? "code" : "text",
        lang: isCodeBlockStarting ? lang : undefined,
        start: 0,
        end: chunk.length,
      });
      return;
    }

    // if last segment is text and not a code block, concatenate the chunk
    if (lastSegment?.type === "text" && !isCodeBlockStarting) {
      lastSegment.text += chunk;
      lastSegment.start = lastSegment.start ?? 0;
      lastSegment.end = (lastSegment.end ?? 0) + chunk.length;
      return;
    }

    // if last segment is text or code and the chunk is a code block starting, create a new code block segment
    if (
      (lastSegment?.type === "text" && isCodeBlockStarting) ||
      (lastSegment?.type === "code" && isCodeBlockStarting)
    ) {
      debugger;
      const newSegment: StreamingContent = {
        type: "code",
        code: chunk,
        lang: lang,
        start: lastSegment.end ?? 0,
        end: (lastSegment.end ?? 0) + chunk.length,
        id: crypto.randomUUID(),
      };
      this.streamingContent.push(newSegment);
      return;
    }

    // if last segment is code block and the chunk is not a code block, this means it is continuation of the code block, concatenate the chunk
    if (lastSegment?.type === "code" && !lastSegment.isCodeCompleted) {
      lastSegment.code += chunk;
      lastSegment.start = lastSegment.start ?? 0;
      lastSegment.end = (lastSegment.end ?? 0) + chunk.length;
      lastSegment.isCodeCompleted = false;
      return;
    }

    // if last segment is code and it is completed and the chunk is text block,
    // create a new text segment
    if (
      lastSegment?.type === "code" &&
      lastSegment.isCodeCompleted &&
      !isCodeBlockStarting
    ) {
      debugger;
      this.streamingContent.push({
        type: "text",
        text: chunk,
        start: lastSegment.end ?? 0,
        end: (lastSegment.end ?? 0) + chunk.length,
        id: crypto.randomUUID(),
      });
      return;
    }

    // if last segment is code and it is completed and the new chunk is again a code block,

    // if last segment is code block and the chunk is a code block, this means it is closing the code block,
    if (lastSegment?.type === "code" && isCodeBlockCompleted) {
      lastSegment.code += chunk;
      lastSegment.start = lastSegment.start ?? 0;
      lastSegment.end = (lastSegment.end ?? 0) + chunk.length;
      lastSegment.isCodeCompleted = true;
      return;
    }
  }

  clearStreamingContent() {
    this.streamingContent = [];
  }
}
