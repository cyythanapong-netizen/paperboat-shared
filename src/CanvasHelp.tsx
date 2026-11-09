import { Fragment, useRef, useState } from "react";
import { useDismiss } from "./dismiss.tsx";

/** What the canvas does with a pointer and keys, one line each. */
export const CANVAS_GESTURES: [string, string][] = [
  ["Add a block", "`/` or double-click the canvas"],
  ["Select", "Click a block · `Ctrl`-drag a box · `Ctrl`-click adds"],
  ["Rotate", "`R` turns clockwise · `Shift+R` turns counter-clockwise"],
  ["Flip", "`F` mirrors horizontal · `Alt+F` (or `Shift+F`) vertical"],
  ["Duplicate", "`Ctrl+D` · `Alt`-drag a block"],
  ["Comment out · bypass", "`Ctrl+/` · `Ctrl+Shift+Y`"],
  ["Delete", "`Delete` or `Backspace`"],
  ["Pan · zoom", "Drag the canvas · the wheel"],
  ["Remove a wire", "Drag its end off the port"],
  ["Move a port", "Drag its name to another side · double-click puts it back"],
  ["Open a group", "Double-click it · `Alt+↑` or `Esc` comes back · ▾ collapses"],
  ["Undo · redo", "`Ctrl+Z` · `Ctrl+Shift+Z`"],
];

/** Text with `keys` between backticks shown as pills. */
export function Keys({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, i) => (i % 2 ? <kbd key={i} className="kbd">{part}</kbd> : part))}
    </>
  );
}

/** The canvas's "?" key: the gestures as a short list, on demand. Esc or a click elsewhere closes it. */
export function CanvasHelp({ gestures = CANVAS_GESTURES }: { gestures?: [string, string][] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useDismiss(box, () => setOpen(false), { enabled: open });

  return (
    <div ref={box} className="nodrag">
      {open && (
        <section className="help-pop" role="dialog" aria-label="Canvas gestures">
          <h3>On the canvas</h3>
          <dl>
            {gestures.map(([what, how]) => (
              <Fragment key={what}>
                <dt>{what}</dt>
                <dd>
                  <Keys text={how} />
                </dd>
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
