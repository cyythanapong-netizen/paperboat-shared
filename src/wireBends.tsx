import { EdgeLabelRenderer, useReactFlow } from "@xyflow/react";
import { useRef, useState, type ReactNode } from "react";
import { dragSegment, type Point } from "./wireRouting.ts";

/** Shorter segments get no handle: there is no room to grab them. */
const MIN_GRAB = 14;

/**
 * Movable wire segments (both canvases' wires): while `editable`, every segment shows a handle
 * at its middle; dragging one moves it across itself. The drag is drawn live and handed to
 * `onBends` once, on release, as the bends between the two ports. The caller draws `points`.
 */
export function useWireBends(
  points: Point[],
  editable: boolean,
  onBends: (bends: Point[]) => void | Promise<void>,
): { points: Point[]; handles: ReactNode } {
  const { screenToFlowPosition } = useReactFlow();
  const [draft, setDraft] = useState<Point[] | null>(null);
  const grab = useRef<{ i: number; base: Point[]; moved: Point[] | null } | null>(null);
  const shown = draft ?? points;

  const handles =
    editable || draft ? (
      <EdgeLabelRenderer>
        {shown.slice(0, -1).map((p, i) => {
          const q = shown[i + 1];
          if (Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) < MIN_GRAB) return null;
          const across = p[1] === q[1] ? "ns" : "ew";
          return (
            <div
              key={i}
              className={`wire-bend ${across} nodrag nopan`}
              style={{ transform: `translate(-50%, -50%) translate(${(p[0] + q[0]) / 2}px, ${(p[1] + q[1]) / 2}px)` }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                grab.current = { i, base: shown, moved: null };
              }}
              onPointerMove={(e) => {
                const g = grab.current;
                if (!g) return;
                const at = screenToFlowPosition({ x: e.clientX, y: e.clientY });
                g.moved = dragSegment(g.base, g.i, [at.x, at.y]);
                setDraft(g.moved);
              }}
              onPointerUp={() => {
                const moved = grab.current?.moved;
                grab.current = null;
                if (!moved) return setDraft(null);
                // keep the draft until the owner has the new bends, so the wire doesn't jump back
                void Promise.resolve(onBends(moved.slice(1, -1))).finally(() => setDraft(null));
              }}
              onClick={(e) => e.stopPropagation()}
            />
          );
        })}
      </EdgeLabelRenderer>
    ) : null;

  return { points: shown, handles };
}
