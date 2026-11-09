// Compiler messages as data: shared by the card UI and by apps that decide what to show.
// No React here, so the words and the filtering can be tested without a DOM.

export type MessageLevel = "error" | "warning" | "info";

/** One compiler message: what it says, and where it says it. */
export type Message = {
  level: MessageLevel;
  text: string;
  file?: string;
  line?: number;
  column?: number;
};

export type MessageFilter = "all" | "error" | "warning";

/** `DoublePendulum.mo:18:5`, or just the file when omc gave no line. */
export function messageSource(message: Message): string {
  if (!message.file) return "";
  const at = message.line ? `:${message.line}${message.column ? `:${message.column}` : ""}` : "";
  return `${message.file}${at}`;
}

export function visibleMessages(messages: Message[], filter: MessageFilter): Message[] {
  return filter === "all" ? messages : messages.filter((message) => message.level === filter);
}

export function messageCounts(messages: Message[]): { error: number; warning: number; info: number } {
  const count = (level: MessageLevel) => messages.filter((message) => message.level === level).length;
  return { error: count("error"), warning: count("warning"), info: count("info") };
}
