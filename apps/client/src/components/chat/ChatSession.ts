import type { ChatStatus, UIMessage } from "ai";
import { action, makeObservable, observable } from "mobx";

interface ChatApi {
  send: (message: string) => void;
  stop: () => void;
  status: ChatStatus;
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
}
