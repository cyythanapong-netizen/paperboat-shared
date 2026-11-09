import { useRef, useState } from "react";
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
      {status && <span className={`run-status status-${status}`}>{statusText}</span>}
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
  const root = useRef<HTMLElement>(null);
  useDismiss(root, onClose);

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
              <span className="lbl">Blocks Catalog</span>
              <span className="val">{info?.blocksCount !== undefined ? `${info.blocksCount} blocks` : "–"}</span>
            </div>
            <div className="backend-grid-item">
              <span className="lbl">Station</span>
              <span className="val">
                {info?.objectsCount !== undefined ? `${info.objectsCount} objects` : "–"}
                {info?.stationView ? ` · ${info.stationView}` : ""}
              </span>
            </div>
            <div className="backend-grid-item">
              <span className="lbl">Solver Default</span>
              <span className="val">
                {info?.solver ? info.solver.toUpperCase() : "–"}
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
