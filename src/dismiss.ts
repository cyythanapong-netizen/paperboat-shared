/** A floating surface that a press outside it, or Escape, can dismiss. */
export type DismissLayer = {
  /** Whether a press landed inside this surface. */
  contains: (target: EventTarget | null) => boolean;
  /** Whether a press landed on the control that toggles this surface. */
  trigger?: (target: EventTarget | null) => boolean;
  /** Close on a press outside. A layer that opts out also shields the layers under it. */
  outside: boolean;
  /** Close on Escape. */
  escape: boolean;
  close: (reason: "outside" | "escape") => void;
};

export type DismissOptions = {
  /** Register while true; false while the surface is closed. Default true. */
  enabled?: boolean;
  /** Close on a press outside. Alert dialogs set false. Default true. */
  outside?: boolean;
  /** Close on Escape. Default true. */
  escape?: boolean;
  /** The control that opens the surface: a press on it is left to that control. */
  triggerRef?: { current: HTMLElement | null };
};

/**
 * The layers an outside press closes, topmost first. Scanning stops at the surface the
 * press landed in, so pressing a parent surface closes only the surfaces above it, and
 * pressing a toggle leaves that surface to the toggle's own click. A layer that opts out
 * of outside dismissal is a barrier: nothing under it closes.
 */
export function dismissOnPress(open: readonly DismissLayer[], target: EventTarget | null): number[] {
  const closing: number[] = [];
  for (let i = open.length - 1; i >= 0; i--) {
    const layer = open[i];
    if (layer.contains(target) || layer.trigger?.(target)) break;
    if (!layer.outside) break;
    closing.push(i);
  }
  return closing;
}

/** The layer Escape closes: only the topmost, never a dialog under it. */
export function dismissOnEscape(open: readonly DismissLayer[]): number | undefined {
  const top = open.length - 1;
  return top >= 0 && open[top].escape ? top : undefined;
}
