// The Files tree shared by Paperboat Studio apps: Squero OM's Modelica packages and classes,
// MX's Julia scripts and folders. It owns only the interaction state (collapse, menu, drop);
// the host owns the entries and the mutations.
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export type FileIcon =
  | "folder" | "package" | "model" | "block" | "connector" | "record" | "function" | "file" | "class";

export type FileEntry = {
  path: string;
  name: string;
  /** 0 for a root row, +1 per folder level. */
  depth: number;
  kind: "folder" | "file";
  icon: FileIcon;
  /** A short right-hand label ("jl", "package", …). */
  badge?: string;
};

export type FileLabels = {
  newFile?: string;
  newFolder?: string;
  open?: string;
  rename?: string;
  duplicate?: string;
  delete?: string;
  copyPath?: string;
  empty?: string;
};

export type FileActions = {
  onOpen?: (entry: FileEntry) => void;
  onNewFile?: (parent?: FileEntry) => void;
  onNewFolder?: (parent?: FileEntry) => void;
  onRename?: (entry: FileEntry) => void;
  onDuplicate?: (entry: FileEntry) => void;
  onDelete?: (entry: FileEntry) => void;
  onCopyPath?: (entry: FileEntry) => void;
  /** Move `source` into `target`; no target means the workspace root. */
  onMove?: (source: FileEntry, target?: FileEntry) => void;
};

export type FileTreeHandle = { openNewMenu: (x: number, y: number) => void };

type Menu = { entry?: FileEntry; x: number; y: number };

function visible(entries: readonly FileEntry[], collapsed: ReadonlySet<string>): FileEntry[] {
  const out: FileEntry[] = [];
  let hiddenBelow: number | null = null;
  for (const entry of entries) {
    if (hiddenBelow !== null && entry.depth > hiddenBelow) continue;
    hiddenBelow = null;
    out.push(entry);
    if (entry.kind === "folder" && collapsed.has(entry.path)) hiddenBelow = entry.depth;
  }
  return out;
}

function KindGlyph({ icon }: { icon: FileIcon }) {
  const common = { viewBox: "0 0 16 16", "aria-hidden": true } as const;
  switch (icon) {
    case "folder":
    case "package":
      return <svg {...common}><path d="M1.5 4.5h4.7l1.3 1.8h7v7.2h-13z" /></svg>;
    case "model":
      return <svg {...common}><rect x="2.5" y="2.5" width="11" height="11" rx="1.2" /><path d="M5.5 8h5" /></svg>;
    case "block":
      return <svg {...common}><rect x="2.5" y="3.5" width="8" height="9" rx="1.2" /><path d="M10.5 8H14M12 6.5 14 8l-2 1.5" /></svg>;
    case "connector":
      return <svg {...common}><circle cx="8" cy="8" r="3.6" /><circle cx="8" cy="8" r="1" /></svg>;
    case "record":
      return <svg {...common}><rect x="2.5" y="3" width="11" height="10" rx="1.2" /><path d="M2.5 6.5h11M6.5 6.5V13" /></svg>;
    case "function":
      return <svg {...common}><path d="M9.5 3.5c-1.8 0-2.5 1-2.5 3v6M4.5 8h4M10 8h2.5" /></svg>;
    default:
      return <svg {...common}><path d="M4 2.5h6l2 2v9H4z" /><path d="M10 2.5v2h2" /></svg>;
  }
}

export const FileTree = forwardRef<FileTreeHandle, {
  entries: readonly FileEntry[];
  active?: string;
  actions: FileActions;
  labels?: FileLabels;
  ariaLabel?: string;
}>(function FileTree({ entries, active, actions, labels = {}, ariaLabel = "Workspace" }, ref) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [menu, setMenu] = useState<Menu | null>(null);
  const [drop, setDrop] = useState<string | null>(null);
  const rows = visible(entries, collapsed);
  const DND = "application/x-paperboat-file";

  useImperativeHandle(ref, () => ({
    openNewMenu: (x, y) => setMenu({ x, y }),
  }), []);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", close);
    };
  }, [menu]);

  const close = () => setMenu(null);
  const toggle = (path: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const move = (source: string, target?: FileEntry) => {
    if (!actions.onMove) return;
    const from = entries.find((e) => e.path === source);
    if (from) actions.onMove(from, target);
  };

  const parentOf = (entry?: FileEntry) => (entry?.kind === "folder" ? entry : undefined);
  const menuAt = (entry: FileEntry | undefined, x: number, y: number) => setMenu({ entry, x, y });

  const item = (label: string, run: () => void, danger = false) => (
    <button type="button" role="menuitem" className={danger ? "danger" : ""} onClick={() => { run(); close(); }}>{label}</button>
  );

  return (
    <div
      className="files-tree"
      role="tree"
      aria-label={ariaLabel}
      onDragOver={(e) => { if (e.dataTransfer.types.includes(DND)) e.preventDefault(); }}
      onDrop={(e) => {
        const source = e.dataTransfer.getData(DND);
        setDrop(null);
        if (source) move(source);
      }}
    >
      {rows.length === 0 && <p className="files-empty">{labels.empty ?? "No files here yet."}</p>}
      {rows.map((entry) => {
        const here = entry.path === active;
        const open = entry.kind === "folder" && !collapsed.has(entry.path);
        return (
          <button
            key={entry.path}
            type="button"
            role="treeitem"
            aria-expanded={entry.kind === "folder" ? open : undefined}
            aria-selected={entry.kind === "file" ? here : undefined}
            className={`file-row${here ? " on" : ""}${drop === entry.path ? " drop-target" : ""}`}
            style={{ paddingLeft: 8 + entry.depth * 14 }}
            title={entry.path}
            draggable={!!actions.onMove}
            onDragStart={(e) => {
              if (!actions.onMove) return;
              e.dataTransfer.setData(DND, entry.path);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (entry.kind !== "folder" || !e.dataTransfer.types.includes(DND)) return;
              e.preventDefault();
              setDrop(entry.path);
            }}
            onDragLeave={() => setDrop((current) => (current === entry.path ? null : current))}
            onDrop={(e) => {
              if (entry.kind !== "folder") return;
              e.preventDefault();
              e.stopPropagation();
              const source = e.dataTransfer.getData(DND);
              setDrop(null);
              if (source) move(source, entry);
            }}
            onClick={() => (entry.kind === "folder" ? toggle(entry.path) : actions.onOpen?.(entry))}
            onKeyDown={(e) => {
              if ((e.key === "Delete" || e.key === "Backspace") && actions.onDelete) {
                e.preventDefault();
                actions.onDelete(entry);
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (entry.kind === "folder") toggle(entry.path);
                else actions.onOpen?.(entry);
              } else if (e.key === "F2" && actions.onRename) {
                e.preventDefault();
                actions.onRename(entry);
              } else if (e.key === "ArrowRight" && entry.kind === "folder" && collapsed.has(entry.path)) {
                e.preventDefault();
                toggle(entry.path);
              } else if (e.key === "ArrowLeft" && entry.kind === "folder" && !collapsed.has(entry.path)) {
                e.preventDefault();
                toggle(entry.path);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              menuAt(entry, e.clientX, e.clientY);
            }}
          >
            <span className="caret">{entry.kind === "folder" ? (open ? "▾" : "▸") : ""}</span>
            <span className="file-icon" title={entry.icon}><KindGlyph icon={entry.icon} /></span>
            <span className="nm">{entry.name}</span>
            <span className="k">{entry.badge ?? ""}</span>
          </button>
        );
      })}

      {menu && (
        <>
          <div className="file-menu-scrim" onPointerDown={close} />
          <div
            className="file-menu"
            role="menu"
            aria-label="File actions"
            style={{ left: Math.min(menu.x, window.innerWidth - 230), top: Math.min(menu.y, window.innerHeight - 280) }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {actions.onNewFile && item(labels.newFile ?? "New file…", () => actions.onNewFile?.(parentOf(menu.entry)))}
            {actions.onNewFolder && item(labels.newFolder ?? "New folder…", () => actions.onNewFolder?.(parentOf(menu.entry)))}
            {menu.entry && actions.onOpen && menu.entry.kind === "file" && item(labels.open ?? "Open", () => actions.onOpen?.(menu.entry!))}
            {menu.entry && actions.onRename && <hr />}
            {menu.entry && actions.onRename && item(labels.rename ?? "Rename…", () => actions.onRename?.(menu.entry!))}
            {menu.entry && actions.onDuplicate && menu.entry.kind === "file" && item(labels.duplicate ?? "Duplicate…", () => actions.onDuplicate?.(menu.entry!))}
            {menu.entry && actions.onDelete && <hr />}
            {menu.entry && actions.onDelete && item(labels.delete ?? "Delete…", () => actions.onDelete?.(menu.entry!), true)}
            {menu.entry && actions.onCopyPath && <hr />}
            {menu.entry && actions.onCopyPath && item(labels.copyPath ?? "Copy path", () => actions.onCopyPath?.(menu.entry!))}
          </div>
        </>
      )}
    </div>
  );
});
