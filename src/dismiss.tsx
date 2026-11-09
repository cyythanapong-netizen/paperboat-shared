import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { dismissOnEscape, dismissOnPress, type DismissLayer, type DismissOptions } from "./dismiss.ts";

const layers: DismissLayer[] = [];
let listening = false;

const onPointerDown = (event: PointerEvent) => {
  if (event.button !== 0) return; // primary button, touch or pen; a right-click leaves it open
  for (const i of dismissOnPress(layers, event.target)) layers[i].close("outside");
};

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key !== "Escape" || event.isComposing) return;
  const i = dismissOnEscape(layers);
  if (i === undefined) return;
  event.preventDefault();
  event.stopPropagation();
  layers[i].close("escape");
};

function listen() {
  if (listening) return;
  listening = true;
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onKeyDown, true);
}

function unlisten() {
  if (!listening) return;
  listening = false;
  document.removeEventListener("pointerdown", onPointerDown, true);
  document.removeEventListener("keydown", onKeyDown, true);
}

/**
 * Dismiss a floating surface the same way everywhere: a primary press outside `ref`, or
 * Escape when it is the topmost surface. `triggerRef` is the control that opened it; a press
 * there is left alone, so its click still toggles instead of closing and reopening. Pass
 * `outside: false` for a dialog that must wait for a choice; it then also shields what is
 * under it from outside presses.
 */
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  onClose: (reason: "outside" | "escape") => void,
  { enabled = true, outside = true, escape = true, triggerRef }: DismissOptions = {},
) {
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;
    const within = (element: { current: HTMLElement | null }) => (target: EventTarget | null) =>
      !!target && target instanceof Node && !!element.current?.contains(target);
    const layer: DismissLayer = {
      contains: within(ref),
      trigger: triggerRef ? within(triggerRef) : undefined,
      outside,
      escape,
      close: (reason) => close.current(reason),
    };
    layers.push(layer);
    listen();
    return () => {
      const i = layers.indexOf(layer);
      if (i >= 0) layers.splice(i, 1);
      if (!layers.length) unlisten();
    };
  }, [enabled, ref, triggerRef, outside, escape]);
}

/**
 * Focus for a window floating over the page: on open, its first button (the primary
 * `button.run` before the rest) when `root` is given; on close, back to where focus was.
 */
export function useFocusReturn(root?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    root?.current?.querySelector<HTMLElement>("button.run, button")?.focus();
    return () => {
      if (before?.isConnected) before.focus?.();
    };
  }, [root]);
}
