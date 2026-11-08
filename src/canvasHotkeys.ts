// Unified canvas hotkeys across diagram and visual block editors.
// Ignores events when the user is typing in form inputs, text areas, or custom key listeners.

import { useEffect, useRef } from "react";
import { ownKeys, typing } from "./commands.ts";

export interface CanvasHotkeyHandlers {
  hasSelection?: boolean;
  onInsert?: () => void;
  onRotateCW?: () => void;
  onRotateCCW?: () => void;
  onFlipH?: () => void;
  onFlipV?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onComment?: () => void;
  onBypass?: () => void;
  onSelectAll?: () => void;
  onEscape?: () => void;
  onHelp?: () => void;
}

export function useCanvasHotkeys(handlers: CanvasHotkeyHandlers, enabled: boolean = true) {
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    if (!enabled) return;

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (typing(t) || ownKeys(t)) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const alt = e.altKey;
      const shift = e.shiftKey;
      const key = e.key.toLowerCase();
      const code = e.code;
      const h = latest.current;

      // 1. Quick Add / Insert: '/' without ctrl/meta/alt
      if (e.key === "/" && !ctrl && !alt) {
        e.preventDefault();
        h.onInsert?.();
        return;
      }

      // 2. Help cheat sheet: '?'
      if (e.key === "?" && !ctrl && !alt) {
        e.preventDefault();
        h.onHelp?.();
        return;
      }

      // 3. Escape: deselect / up-level
      if (e.key === "Escape") {
        e.preventDefault();
        h.onEscape?.();
        return;
      }

      // 4. Select All: Ctrl+A (⌘A)
      if (ctrl && key === "a" && !alt && !shift) {
        if (h.onSelectAll) {
          e.preventDefault();
          h.onSelectAll();
          return;
        }
      }

      // Selection-dependent actions
      if (h.hasSelection) {
        // Rotate: R (CW 90°) / Shift+R (CCW 90°)
        if (key === "r" && !ctrl && !alt) {
          e.preventDefault();
          if (shift) h.onRotateCCW?.();
          else h.onRotateCW?.();
          return;
        }

        // Flip Horizontal: F without modifiers
        if (key === "f" && !ctrl && !alt && !shift) {
          e.preventDefault();
          h.onFlipH?.();
          return;
        }

        // Flip Vertical: Alt+F (or Shift+F as browser fallback)
        if ((key === "f" && alt && !ctrl) || (key === "f" && shift && !ctrl && !alt)) {
          e.preventDefault();
          h.onFlipV?.();
          return;
        }

        // Duplicate: Ctrl+D (⌘D)
        if (ctrl && key === "d" && !alt && !shift) {
          e.preventDefault();
          h.onDuplicate?.();
          return;
        }

        // Delete: Delete / Backspace
        if ((e.key === "Delete" || e.key === "Backspace") && !ctrl && !alt) {
          e.preventDefault();
          h.onDelete?.();
          return;
        }

        // Comment: Ctrl+/ (⌘/)
        if (ctrl && (e.key === "/" || code === "Slash") && !alt && !shift) {
          e.preventDefault();
          h.onComment?.();
          return;
        }

        // Bypass: Ctrl+Shift+Y (⌘⇧Y)
        if (ctrl && shift && (key === "y" || code === "KeyY") && !alt) {
          e.preventDefault();
          h.onBypass?.();
          return;
        }
      }
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [enabled]);
}
