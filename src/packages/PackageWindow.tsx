// The window every app opens its package manager in: floating over the page, titled with the
// bootstrapped runtime's version tags. The package manager is opened rarely, so it gets no tab
// or dock of its own. Esc or a press outside closes it.
import { useRef, type ReactNode } from "react";
import { useDismiss, useFocusReturn } from "../dismiss.tsx";

export function PackageWindow({ title, tags = [], onClose, children }: {
  title: string;
  /** Short facts in the head: the runtime and its version, say. */
  tags?: string[];
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  useDismiss(dialog, () => onClose());
  useFocusReturn(dialog);
  return (
    <div className="pk-overlay" role="dialog" aria-modal="true" aria-label={title} data-own-keys>
      <div ref={dialog} className="pk-window">
        <header className="pk-window-head">
          <h3>{title}</h3>
          {tags.filter(Boolean).map((t) => <span key={t} className="tag">{t}</span>)}
          <span className="sp" />
          <button type="button" className="pk-close" onClick={onClose} aria-label="Close">×</button>
        </header>
        {children}
      </div>
    </div>
  );
}
