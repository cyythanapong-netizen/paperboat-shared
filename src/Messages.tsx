// Error, warning and info cards, shared by every app that talks to a compiler: omc in Studio,
// and whatever backend a host app's console reports on. The card says its level in words, keeps
// the prose in sans and the source location in mono, and shows selection by line, never a fill.

import { useState } from "react";
import { Switch } from "./Shell.tsx";
import { messageCounts, messageSource, visibleMessages, type Message, type MessageFilter } from "./messages.ts";

/** One message as a card. `onSelect` marks it; `onOpen` jumps to its source line. */
export function MessageCard({
  message,
  selected = false,
  onSelect,
  onOpen,
}: {
  message: Message;
  selected?: boolean;
  onSelect?: () => void;
  onOpen?: (message: Message) => void;
}) {
  const source = messageSource(message);
  return (
    <article
      className={`msg ${message.level}${selected ? " sel" : ""}${onSelect ? " selectable" : ""}`}
      data-level={message.level}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-pressed={onSelect ? selected : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (!onSelect) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <span className="msg-level">{message.level}</span>
      <div className="msg-body">
        <p className="msg-text">{message.text}</p>
        {source &&
          (onOpen ? (
            <button
              type="button"
              className="msg-source"
              onClick={(event) => {
                event.stopPropagation();
                onOpen(message);
              }}
            >
              {source}
            </button>
          ) : (
            <span className="msg-source">{source}</span>
          ))}
      </div>
    </article>
  );
}

/**
 * The cards in the caller's order. The filter is a bracketed choice, so the chosen view is ink
 * and the rest grey; "all", errors or warnings.
 */
export function MessageList({
  messages,
  selected,
  onSelect,
  onOpen,
  empty = "No messages.",
  filters = true,
}: {
  messages: Message[];
  selected?: Message | null;
  onSelect?: (message: Message) => void;
  onOpen?: (message: Message) => void;
  empty?: string;
  filters?: boolean;
}) {
  const [filter, setFilter] = useState<MessageFilter>("all");
  const shown = visibleMessages(messages, filter);
  const counts = messageCounts(messages);

  return (
    <div className="messages">
      {filters && messages.length > 0 && (
        <div className="messages-filter">
          <Switch
            label="show"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: `all ${messages.length}`, hint: "Every message" },
              { value: "error", label: `errors ${counts.error}`, hint: "Errors only" },
              { value: "warning", label: `warnings ${counts.warning}`, hint: "Warnings only" },
            ]}
          />
        </div>
      )}
      <div className="messages-list">
        {shown.length === 0 ? (
          <p className="msg-empty">{messages.length === 0 ? empty : "No messages at this level."}</p>
        ) : (
          shown.map((message, i) => (
            <MessageCard
              key={`${message.file ?? ""}:${message.line ?? ""}:${message.column ?? ""}:${i}`}
              message={message}
              selected={message === selected}
              onSelect={onSelect ? () => onSelect(message) : undefined}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </div>
  );
}
