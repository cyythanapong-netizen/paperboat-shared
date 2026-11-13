import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useDismiss } from "./dismiss.tsx";
// RunOptions and VarControls are passed or slotted if needed
export type DockProps = {
  canRun: boolean;
  whyNot?: string;
  running: boolean;
  status?: string;
  statusText?: ReactNode;
  optionsSlot?: ReactNode;
  controlsSlot?: ReactNode;
  onRun: () => void;
  onCancel: () => void;
};

/**
 * The run dock (#78): Run, Cancel, the next run's length and speed, and where the run is. It floats at
 * the bottom of the pages (glass: it sits over live content), so the top bar can be menus only.
 */
export function Dock({
  canRun,
  whyNot,
  running,
  status,
  statusText,
  optionsSlot,
  controlsSlot,
  onRun,
  onCancel,
}: DockProps) {
  return (
    <div className="dock" role="group" aria-label="Run">
      <button className="key run" disabled={!canRun} title={canRun ? "Run the flow" : whyNot} onClick={onRun}>
        ▶ Run
      </button>
      <button className="key" disabled={!running} title={running ? "Stop the run" : "No run in progress"} onClick={onCancel}>
        ■ Cancel
      </button>
      {optionsSlot}
      {controlsSlot}
      {/* Where the run is, when there is one. The slot stays mounted so its first word is announced,
          but it takes no room while it has nothing to say: a hidden placeholder left a blank patch
          beside Cancel (#341). A replay key or variable controls already widen the dock, so a run may. */}
      <span className={`run-status${status ? ` status-${status}` : " run-status-empty"}`} aria-live="polite" aria-atomic="true">
        {status ? statusText : null}
      </span>
    </div>
  );
}

export type BackendInfo = {
  protocol?: string;
  blocksCount?: number;
  objectsCount?: number;
  stationView?: string;
  solver?: string;
  dt?: number;
  duration?: number;
  toolkits?: { name: string; installed: boolean; version?: string }[];
  variablesCount?: number;
};

/** One row of `paperboat list --json` (the `/__paperboat/backends` endpoint). */
type RunningBackend = {
  kind?: string;
  name?: string;
  engine?: string;
  domain?: string;
  port: number;
  url: string;
};

/**
 * File > Backend…: which backend the app talks to. A packaged app has one and never needs this; it is for
 * tinkerers pointing the app at another (an address, such as ws://localhost:8765). Esc or Close leaves.
 */
export function BackendWindow({
  url,
  connection,
  engine,
  info,
  onConnect,
  onClose,
}: {
  url: string;
  connection: string;
  engine: string;
  info?: BackendInfo;
  onConnect: (url: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(url);
  const [running, setRunning] = useState<RunningBackend[]>([]);
  const [looking, setLooking] = useState(true);
  const [listMissing, setListMissing] = useState(false);
  const root = useRef<HTMLElement>(null);
  useDismiss(root, onClose);

  // The CLI serves `/__paperboat/backends` (Vite in a checkout, the static server in a
  // package). A host without it keeps the address field; it never blocks connecting by hand.
  const loadRunning = () => {
    setLooking(true);
    fetch("/__paperboat/backends", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((list: RunningBackend[]) => {
        setRunning(list.filter((b) => b.kind === undefined || b.kind === "backend"));
        setListMissing(false);
      })
      .catch(() => {
        setRunning([]);
        setListMissing(true);
      })
      .finally(() => setLooking(false));
  };
  useEffect(() => {
    loadRunning();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the dialog opens
  }, []);

  const presets = ["ws://localhost:8765", "ws://127.0.0.1:8765"];

  return (
    <section className="console-window backend-window" role="dialog" aria-label="Backend" data-own-keys ref={root}>
      <header className="console-head">
        <h2>Backend</h2>
        <span className={`lbl conn-${connection}`}>{connection === "open" ? `connected: ${engine || "ready"}` : connection}</span>
        <button className="key small" title="Close (Esc)" onClick={onClose}>
          Close
        </button>
      </header>
      <form
        className="backend-form"
        onSubmit={(e) => {
          e.preventDefault();
          onConnect(draft.trim());
        }}
      >
        <label className="lbl" htmlFor="backend-address">
          Address
        </label>
        <span className="well field">
          <input id="backend-address" autoFocus value={draft} spellCheck={false} onChange={(e) => setDraft(e.target.value)} size={28} />
        </span>
        <button className="key">Connect</button>
      </form>
      <div className="backend-running">
        <div className="backend-running-head">
          <span className="lbl muted">Running backends</span>
          <button type="button" className="key small" onClick={loadRunning} disabled={looking}>
            {looking ? "Looking…" : "Refresh"}
          </button>
        </div>
        {running.length > 0 ? (
          <ul>
            {running.map((b) => {
              const target = b.url || `ws://localhost:${b.port}`;
              const name = b.engine || b.domain || b.name || `port ${b.port}`;
              return (
                <li key={target}>
                  <button
                    type="button"
                    className={`backend-pick${url === target ? " current" : ""}`}
                    aria-current={url === target ? "true" : undefined}
                    title={`Connect to ${name} on ${target}`}
                    onClick={() => {
                      setDraft(target);
                      onConnect(target);
                    }}
                  >
                    <span className="name">{name}</span>
                    <span className="lbl">{target}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <span className="lbl muted">
            {looking ? "Looking for running backends…" : listMissing ? "The CLI list is not available here; type an address below." : "No backends are running."}
          </span>
        )}
      </div>
      <div className="backend-presets">
        <span className="lbl muted">Presets:</span>
        {presets.map((p) => (
          <button key={p} type="button" className="key small" onClick={() => setDraft(p)}>
            {p}
          </button>
        ))}
      </div>
      {connection === "open" ? (
        <div className="backend-card">
          <div className="backend-card-head">
            <span>{engine || "Paperboat Engine"}</span>
            <span className="lbl conn-open">connected</span>
          </div>
          <div className="backend-grid">
            <div className="backend-grid-item">
              <span className="lbl">Protocol</span>
              <span className="val">{info?.protocol ?? "paperboat/0"}</span>
            </div>
            <div className="backend-grid-item">
              <span className="lbl">Blocks catalog</span>
              <span className="val">{info?.blocksCount !== undefined ? `${info.blocksCount} ${info.blocksCount === 1 ? "block" : "blocks"}` : "–"}</span>
            </div>
            <div className="backend-grid-item">
              <span className="lbl">Station</span>
              <span className="val">
                {info?.objectsCount !== undefined ? `${info.objectsCount} ${info.objectsCount === 1 ? "object" : "objects"}` : "–"}
                {info?.stationView ? ` · ${info.stationView}` : ""}
              </span>
            </div>
            <div className="backend-grid-item">
              <span className="lbl">Solver default</span>
              <span className="val">
                {info?.solver ?? "–"}
                {info?.dt ? ` (dt: ${info.dt}s${info.duration ? `, dur: ${info.duration}s` : ""})` : info?.duration ? ` (${info.duration}s)` : ""}
              </span>
            </div>
            {info?.toolkits && info.toolkits.length > 0 && (
              <div className="backend-grid-item" style={{ gridColumn: "1 / -1" }}>
                <span className="lbl">Toolkits</span>
                <span className="val">
                  {info.toolkits.map((t) => `${t.name}${t.installed ? "" : " (not installed)"}`).join(", ")}
                </span>
              </div>
            )}
            {info?.variablesCount !== undefined && info.variablesCount > 0 && (
              <div className="backend-grid-item">
                <span className="lbl">Variables</span>
                <span className="val">{info.variablesCount} defaults</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="backend-card muted">
          <span>{connection === "connecting" ? `Connecting to backend at ${draft}…` : "Not connected. Enter address and click Connect."}</span>
        </div>
      )}
      <p className="muted backend-note">The backend runs the domain: its blocks, its station and its physics. The app reconnects by itself when it restarts.</p>
    </section>
  );
}
