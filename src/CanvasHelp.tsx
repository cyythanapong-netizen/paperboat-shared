import { Fragment, useEffect, useRef, useState } from "react";

/** What the canvas does with a pointer and keys, one line each. */
export const CANVAS_GESTURES: [string, string][] = [
  ["Add a block", "/ or double-click the canvas"],
  ["Select", "Click a block · Ctrl-drag a box · Ctrl-click adds"],
  ["Rotate", "R turns clockwise · Shift+R turns counter-clockwise"],
  ["Flip", "F mirrors horizontal · Alt+F (or Shift+F) vertical"],
  ["Duplicate", "Ctrl+D · Alt-drag a block"],
  ["Comment out · bypass", "Ctrl+/ · Ctrl+Shift+Y"],
  ["Delete", "Delete or Backspace"],
  ["Pan · zoom", "Drag the canvas · the wheel"],
  ["Remove a wire", "Drag its end off the port"],
  ["Move a port", "Drag its name to another side · double-click puts it back"],
  ["Open a group", "Double-click it · Alt+↑ or Esc comes back · ▾ collapses"],
  ["Undo · redo", "Ctrl+Z · Ctrl+Shift+Z"],
];

/** The canvas's "?" key: the gestures as a short list, on demand. Esc or a click elsewhere closes it. */
export function CanvasHelp({ gestures = CANVAS_GESTURES }: { gestures?: [string, string][] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
    };
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as globalThis.Node) && setOpen(false);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [open]);

  return (
    <div ref={box} className="nodrag">
      {open && (
        <section className="help-pop" role="dialog" aria-label="Canvas gestures">
          <h3>On the canvas</h3>
          <dl>
            {gestures.map(([what, how]) => (
              <Fragment key={what}>
                <dt>{what}</dt>
                <dd>{how}</dd>
              </Fragment>
            ))}
          </dl>
        </section>
      )}
      <button
        className={`key small help-key${open ? " on" : ""}`}
        aria-expanded={open}
        title="What the canvas does (?)"
        onClick={() => setOpen(!open)}
      >
        ?
      </button>
    </div>
  );
}
