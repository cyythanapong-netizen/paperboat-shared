// The solver settings dialog shared by Paperboat (Run ▸ Solver settings…) and Squero Studio's
// Simulate run: the solvers grouped by what they're for, the chosen one's options grouped by
// what they change, each option's default shown and resettable. Each app says which solvers
// and options it has; the dialog knows none.

import { useRef, useEffect } from "react";
import { NumberField } from "./NumberField.tsx";
import { useDismiss } from "./dismiss.tsx";

export type SolverFamily = "explicit" | "adaptive" | "implicit" | "discrete";

export type SolverInfo = {
  id: string;
  label: string;
  family: SolverFamily;
  /** One line: when to pick it. */
  blurb: string;
  /** The option keys it takes, in order. */
  options: string[];
  /** Marked as the one to start with. */
  recommended?: boolean;
};

export type SolverOptionInfo = {
  key: string;
  label: string;
  /** What it changes, in plain words. */
  hint: string;
  group: "Accuracy" | "Steps" | "Output" | "Time";
  unit?: string;
  whole?: boolean;
  /** A value it accepts. */
  valid: (v: number) => boolean;
  /** What 0 means, when 0 is special ("automatic"). */
  zero?: string;
};

export const FAMILIES: Record<SolverFamily, { title: string; blurb: string }> = {
  explicit: { title: "Fixed step", blurb: "Fast and predictable; needs small steps for stiff or fast dynamics." },
  adaptive: { title: "Adaptive", blurb: "Picks its step to meet a tolerance; good for most smooth models." },
  implicit: { title: "Implicit (stiff, DAE)", blurb: "For stiff systems and constraints: mechanisms, circuits, chemistry." },
  discrete: { title: "Discrete", blurb: "A difference equation, once per clock step." },
};

const ORDER: SolverFamily[] = ["implicit", "adaptive", "explicit", "discrete"];

/**
 * The dialog. `values` are the user's own (absent: the default), `defaults` what the solver
 * uses otherwise; `onOption(key, undefined)` resets one.
 */
export function SolverSettings({
  title = "Solver settings",
  intro,
  solvers,
  options,
  solver,
  values,
  defaults,
  onSolver,
  onOption,
  onReset,
  onClose,
}: {
  title?: string;
  intro?: string;
  solvers: SolverInfo[];
  options: SolverOptionInfo[];
  solver: string;
  values: Record<string, number | undefined>;
  defaults: Record<string, number>;
  onSolver: (id: string) => void;
  onOption: (key: string, value: number | undefined) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => root.current?.querySelector<HTMLElement>("[aria-checked=true]")?.focus(), []);
  useDismiss(root, onClose);
  const chosen = solvers.find((s) => s.id === solver) ?? solvers[0];
  const shown = (chosen?.options ?? []).map((k) => options.find((o) => o.key === k)).filter((o): o is SolverOptionInfo => !!o);
  const groups = [...new Set(shown.map((o) => o.group))];

  return (
    <section
      className="console-window solver-settings"
      role="dialog"
      aria-label={title}
      data-own-keys
      ref={root}
    >
      <header className="console-head">
        <h2>{title}</h2>
        <span className="spacer" />
        <button className="key small" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>
      <div className="solver-body">
        <div className="solver-list" role="radiogroup" aria-label="Solver">
          {intro && <p className="solver-intro">{intro}</p>}
          {ORDER.filter((f) => solvers.some((s) => s.family === f)).map((f) => (
            <div key={f} className="solver-family">
              <h3 title={FAMILIES[f].blurb}>{FAMILIES[f].title}</h3>
              {solvers
                .filter((s) => s.family === f)
                .map((s) => (
                  <button
                    key={s.id}
                    role="radio"
                    aria-checked={s.id === chosen?.id}
                    className={`solver-pick${s.id === chosen?.id ? " on" : ""}`}
                    onClick={() => onSolver(s.id)}
                    onKeyDown={(e) => {
                      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                      e.preventDefault();
                      const flat = ORDER.flatMap((g) => solvers.filter((x) => x.family === g));
                      const next = flat[(flat.indexOf(s) + (e.key === "ArrowDown" ? 1 : flat.length - 1)) % flat.length];
                      onSolver(next.id);
                      requestAnimationFrame(() => root.current?.querySelector<HTMLElement>("[aria-checked=true]")?.focus());
                    }}
                  >
                    <span className="solver-name">
                      {s.label}
                      {s.recommended && <span className="solver-badge">recommended</span>}
                    </span>
                    <span className="solver-blurb">{s.blurb}</span>
                  </button>
                ))}
            </div>
          ))}
        </div>
        <div className="solver-options">
          {chosen && (
            <p className="solver-about">
              <b>{chosen.label}</b>: {FAMILIES[chosen.family].blurb}
            </p>
          )}
          {!shown.length && <p className="solver-about">No options.</p>}
          {groups.map((g) => (
            <fieldset key={g} className="solver-group">
              <legend>{g}</legend>
              {shown
                .filter((o) => o.group === g)
                .map((o) => {
                  const own = values[o.key];
                  const value = own ?? defaults[o.key] ?? 0;
                  return (
                    <div key={o.key} className={`solver-field${own !== undefined ? " changed" : ""}`}>
                      <label className="solver-row">
                      <span className="solver-label">
                        <span>
                          {o.label}
                          {o.unit && <span className="solver-unit">, {o.unit}</span>}
                        </span>
                        <span className="solver-hint">
                          {o.hint}
                          {o.zero ? ` 0: ${o.zero}.` : ""}
                        </span>
                      </span>
                      <NumberField
                        className="num well"
                        aria-label={o.label}
                        value={value}
                        valid={(v) => o.valid(v) && (!o.whole || Number.isInteger(v))}
                        onChange={(v) => onOption(o.key, v)}
                      />
                      </label>
                      <button
                        type="button"
                        className="key small solver-undo"
                        title={`Back to the default (${defaults[o.key] ?? 0})`}
                        aria-label={`Reset ${o.label}`}
                        disabled={own === undefined}
                        onClick={() => onOption(o.key, undefined)}
                      >
                        ↺
                      </button>
                    </div>
                  );
                })}
            </fieldset>
          ))}
        </div>
      </div>
      <footer className="solver-foot">
        <button type="button" className="key" onClick={onReset}>
          Defaults
        </button>
        <button type="button" className="key primary" onClick={onClose}>
          Done
        </button>
      </footer>
    </section>
  );
}
