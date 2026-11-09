import { useEffect, useRef, useState } from "react";
import { useDismiss } from "./dismiss.tsx";
/** One Console line; `node` names the block it is about. */
export type Log = { level: string; text: string; node?: string };
type Logs = Log[];

/** One line as plain text, for a bug report or a chat: level, block, message. */
export function logText(l: Log): string {
  const text = l.node && l.text.startsWith(`${l.node}: `) ? l.text.slice(l.node.length + 2) : l.text;
  return `[${l.level}]${l.node ? ` ${l.node}:` : ""} ${text}`;
}

/** A small key that copies `text` and says so for a moment. */
function CopyKey({ text, label = "copy", title, className = "log-copy" }: { text: () => string; label?: string; title: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className={className}
      title={title}
      onClick={() =>
        void navigator.clipboard?.writeText(text()).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        })
      }
    >
      {done ? "copied" : label}
    </button>
  );
}

/**
 * The Console: what the backend and app logged, newest last. Active from startup before the
 * first run so non-run actions and errors are visible immediately. A line that names a block
 * has a button that shows the block on the Flow page; every line has a copy key on hover.
 */
export function Console({ logs, onBlock }: { logs: Logs; onBlock?: (id: string) => void }) {
  const list = useRef<HTMLOListElement | null>(null);
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [logs.length]);
  return (
    <ol ref={list} className="logs screen">
      {logs.length === 0 ? (
        <li className="log-info">Console ready.</li>
      ) : (
        logs.map((l, i) => (
          <li key={i} className={`log-${l.level}`}>
            {l.node && onBlock && (
              <button className="log-node" title="Show this block on the Flow page" onClick={() => onBlock(l.node!)}>
                {l.node}
              </button>
            )}
            {l.node && l.text.startsWith(`${l.node}: `) ? l.text.slice(l.node.length + 2) : l.text}
            <CopyKey text={() => logText(l)} title="Copy this line" />
          </li>
        ))
      )}
    </ol>
  );
}

/** The Console as a window floating in the middle of the screen; the header's Console key toggles it. */
export function ConsoleWindow({
  logs,
  errors,
  onBlock,
  onClose,
}: {
  logs: Logs;
  errors: number;
  onBlock?: (id: string) => void;
  onClose: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  useDismiss(root, onClose);
  return (
    <section className="console-window" role="dialog" aria-label="Console" ref={root}>
      <header className="console-head">
        <h2>Console</h2>
        <span className="lbl">{`${logs.length} ${logs.length === 1 ? "line" : "lines"}${errors ? ` · ${errors} ${errors === 1 ? "error" : "errors"}` : ""}`}</span>
        {logs.length > 0 && <CopyKey text={() => logs.map(logText).join("\n")} label="Copy all" title="Copy every line as plain text" className="key small" />}
        <button className="key small" title="Close the Console (Esc)" onClick={onClose}>
          Close
        </button>
      </header>
      <div className="console-body">
        <Console logs={logs} onBlock={onBlock} />
      </div>
    </section>
  );
}
