// The one modal every app opens: an overlay, a dialog with a head (title, tags, ×) and the app's
// body. Esc or a press outside closes it and focus goes back where it was. Its look is
// .modal-* in plates.css; `className` sizes it (about-dialog, modal-window).
import { useRef, type ReactNode } from "react";
import { useDismiss, useFocusReturn } from "./dismiss.tsx";

export function Modal({ title, tags = [], label, className = "", onClose, children }: {
  title: ReactNode;
  /** Short facts beside the title: a version, a server. */
  tags?: (string | false | undefined | null)[];
  /** The dialog's name for assistive tech, when `title` isn't plain text. */
  label?: string;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  useDismiss(dialog, () => onClose());
  useFocusReturn(dialog);
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={label ?? (typeof title === "string" ? title : undefined)} data-own-keys>
      <div ref={dialog} className={`modal-dialog${className ? ` ${className}` : ""}`}>
        <header className="modal-head">
          <h3>{title}</h3>
          {tags.filter((t): t is string => !!t).map((t) => <span key={t} className="tag">{t}</span>)}
          <span className="sp" />
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>
        {children}
      </div>
    </div>
  );
}
