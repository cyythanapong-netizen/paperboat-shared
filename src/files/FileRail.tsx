// The rail around a FileTree, shared by the Studio apps: a tab strip ([ files ] and any others),
// the + key (the tree's new-item menu), the folder head, the tree, a foot, and an optional collapse
// to a standing tab. The app owns the tree and every mutation; this is only the frame.
import type { ReactNode } from "react";

export function FileRail({
  label, tabs = ["files"], tab = "files", onTab, onAdd, addTitle = "New file or folder",
  name, nameTitle, badge, headKeys, foot, collapsed, onToggle, tree, children, className = "",
}: {
  /** The rail's accessible name ("Files", "Files and library"). */
  label: string;
  tabs?: readonly string[];
  tab?: string;
  onTab?: (tab: string) => void;
  /** The + key, shown on the files tab: open the tree's new menu at (x, y). */
  onAdd?: (x: number, y: number) => void;
  addTitle?: string;
  /** The workspace name in the head, its tooltip, and the label at the head's end. */
  name: ReactNode;
  nameTitle?: string;
  badge?: ReactNode;
  /** Small keys between the name and the badge (open folder, say). */
  headKeys?: ReactNode;
  foot?: ReactNode;
  /** With onToggle: a chevron in the tab strip folds the rail to a standing tab. */
  collapsed?: boolean;
  onToggle?: () => void;
  /** The files tab's body: the FileTree, or what stands in for it. */
  tree: ReactNode;
  /** Other tabs' bodies, kept mounted by the app (each `hidden` while its tab is not shown). */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <aside className={`rail${collapsed ? " collapsed" : ""}${className ? ` ${className}` : ""}`} aria-label={label}>
      <div className="rail-tabs" role="tablist" aria-label={label}>
        {tabs.map((one) => (
          <button key={one} type="button" role="tab" aria-selected={tab === one} className={`rail-tab${tab === one ? " on" : ""}`} onClick={() => onTab?.(one)}>
            {one}
          </button>
        ))}
        {onAdd && tab === "files" && (
          <button
            type="button"
            className="key small rail-add"
            title={addTitle}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onAdd(rect.left, rect.bottom + 4);
            }}
          >+</button>
        )}
        {onToggle && (
          <button type="button" className="panel-toggle" onClick={onToggle} title={`Hide ${tab}`} aria-label={`Hide ${tab}`} aria-expanded={!collapsed}>
            <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9 3 5 7l4 4" /></svg>
          </button>
        )}
      </div>
      <div className="rail-body">
        <div className="files-panel" hidden={tab !== "files"}>
          <div className="files-head">
            <span className="nm" title={nameTitle}>{name}</span>
            {headKeys}
            <span className="lbl">{badge}</span>
          </div>
          {tree}
          {foot != null && <p className="files-foot">{foot}</p>}
        </div>
        {children}
      </div>
      {onToggle && (
        <button type="button" className="panel-stand" onClick={onToggle} title={`Show ${tab}`} aria-label={`Show ${tab}`}>
          <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M5 3l4 4-4 4" /></svg>
          <span>{tab}</span>
        </button>
      )}
    </aside>
  );
}
