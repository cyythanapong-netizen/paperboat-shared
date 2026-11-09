import { Position } from "@xyflow/react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { isRef } from "./bindings.ts";
import { useDismiss } from "./dismiss.tsx";
import { Icon } from "./Icon.tsx";
import { iconValid, plateSize } from "./icon.ts";
import { connectorHint, hasIconPorts, placeIconPorts, placePorts, portHint, portLabel, SIDES, signOf, type PortSides } from "./ports.ts";
import type { BlockDef, Connectors, IconDef, ParamValue } from "./protocol.ts";
import { PortHandle } from "./wireSnap.tsx";

export function Glyph({ name }: { name: string }) {
  return (
    <svg className="glyph" viewBox="0 0 30 30" aria-hidden="true">
      <text x="15" y="21" textAnchor="middle">
        {name}
      </text>
    </svg>
  );
}

/** A param as the caption shows it: a bound one by its variable's name or formula (#36). */
const show = (v: ParamValue | undefined) =>
  isRef(v) ? ("var" in v ? v.var : `ƒ ${v.expr}`) : typeof v === "number" ? String(+v.toFixed(4)).replace("-", "−") : typeof v === "boolean" ? (v ? "on" : "off") : String(v ?? "");

/** The caption's value: `{k}` and `{min}…{max}` with the block's params filled in. */
export function captionValue(template: string | undefined, params: Record<string, ParamValue>): string {
  return template ? template.replace(/\{(\w+)\}/g, (_, id: string) => show(params[id])) : "";
}

/**
 * A simple block as a small plate (#70): a glyph in a 64×56 box, bare port dots (a port's
 * name shows on hover), and the block's name and main value as a caption. Click opens its
 * params in a popover; double-click unfolds it into the full card (`onExpand`).
 * `word` is what is happening to it (queued, running, cached, failed), said in words and in the outline.
 */
export function CompactBlock({
  id,
  def,
  sides,
  params,
  selected,
  commented,
  word,
  progress,
  onExpand,
  popover,
  connectors,
  wires,
}: {
  id: string;
  def: BlockDef;
  sides?: PortSides;
  params: Record<string, ParamValue>;
  selected: boolean;
  commented?: boolean;
  word?: "queued" | "running" | "cached" | "failed";
  progress?: number;
  onExpand: () => void;
  /** The param rows shown in the popover. */
  popover: ReactNode;
  /** The catalog's connector classes, for `view.icon.ports`. */
  connectors?: Connectors;
  /** How many wires meet at each icon port (3 or more draw a junction dot). */
  wires?: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selected) setOpen(false);
  }, [selected]);
  useDismiss(root, () => setOpen(false), { enabled: open });

  const value = captionValue(def.view?.value, params);
  const glyphName = def.view?.glyph ? captionValue(def.view.glyph, params) : "const";
  const spread = (n: number, i: number) => `${((i + 1) / (n + 1)) * 100}%`;
  const hasParams = def.params.length > 0;
  const icon = iconValid(def.view?.icon) ? def.view?.icon : undefined; // else the plain plate
  const size = icon ? plateSize(icon) : undefined;
  const placedPorts = placePorts(def, sides);
  return (
    <div
      ref={root}
      className={["compact-block", `kind-${def.kind}`, selected && "selected", commented && "commented", word && word, open && "open"].filter(Boolean).join(" ")}
      onDoubleClick={onExpand}
    >
      <div
        className="plate"
        role="button"
        tabIndex={0}
        aria-expanded={hasParams ? open : undefined}
        aria-label={`${def.label}${value ? ` ${value}` : ""}`}
        style={size && { width: size.w, height: size.h }}
        title={hasParams ? "Click for its params; double-click for the full block" : "Double-click for the full block"}
        onClick={() => hasParams && setOpen(!open)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if ((e.key === "Enter" || e.key === " ") && hasParams) setOpen(!open);
        }}
      >
        {icon ? <Icon icon={icon} type={def.type} fill={(t) => captionValue(t, params)} /> : <Glyph name={glyphName} />}
        {hasIconPorts(icon) ? (
          <IconPorts icon={icon!} params={params} connectors={connectors} wires={wires} />
        ) : (
          <>
            {SIDES.map((side) => {
              const list = placedPorts[side];
              const isVert = side === "left" || side === "right";
              return (
                <Fragment key={side}>
                  {list.map((e, i) => {
                    const coord = spread(list.length, i);
                    const inputIdx = e.dir === "in" ? def.inputs.findIndex((p) => p.id === e.port.id) : -1;
                    const sign = inputIdx >= 0 ? signOf(def, params, inputIdx) : "";
                    const signStyle =
                      side === "left"
                        ? { left: 6, top: coord, transform: "translateY(-50%)" }
                        : side === "right"
                          ? { right: 6, top: coord, transform: "translateY(-50%)" }
                          : side === "top"
                            ? { top: 6, left: coord, transform: "translateX(-50%)" }
                            : { bottom: 6, left: coord, transform: "translateX(-50%)" };
                    return (
                      <Fragment key={e.port.id}>
                        <PortHandle
                          type={e.dir === "in" ? "target" : "source"}
                          position={SIDE_POSITION[side]}
                          id={e.port.id}
                          top={isVert ? coord : undefined}
                          left={!isVert ? coord : undefined}
                          label={portLabel(e.port)}
                          title={portHint(e.port)}
                          className={`t-${e.port.type}`}
                        />
                        {sign && (
                          <span className="plate-sign" style={signStyle} aria-hidden="true">
                            {sign}
                          </span>
                        )}
                      </Fragment>
                    );
                  })}
                </Fragment>
              );
            })}
          </>
        )}
        {word === "running" && progress !== undefined && progress < 1 && <i className="plate-prog" style={{ width: `${progress * 100}%` }} />}
      </div>
      <div className="plate-cap">
        <span className={word ? `cap-${word}` : undefined}>{word ?? def.label}</span>
        {value && <span className="plate-val">{value}</span>}
      </div>
      {open && (
        <div className="popover nodrag nowheel" onDoubleClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <div className="popover-title">
            {def.label}
            <span>{id}</span>
          </div>
          {popover}
        </div>
      )}
    </div>
  );
}

const SIDE_POSITION = { left: Position.Left, right: Position.Right, top: Position.Top, bottom: Position.Bottom } as const;

/**
 * An icon's connector ports (§4): a handle per port in the connector's shape and size, at `side`
 * and `at`. An acausal port has no direction, so it carries a source and a target handle in one
 * place and a wire starts or ends there either way. A port hidden by its `if` keeps an invisible
 * handle so its wires stay. 3 or more wires on a port draw a 4px junction dot.
 */
function IconPorts({ icon, params, connectors, wires }: { icon: IconDef; params: Record<string, ParamValue>; connectors?: Connectors; wires?: Record<string, number> }) {
  return (
    <>
      {placeIconPorts(icon, params).map(({ port, at, hidden, count }) => {
        const c = connectors?.[port.class];
        const along = port.side === "left" || port.side === "right" ? { top: `${at}%` } : { left: `${at}%` };
        const fill = (port.variant ?? c?.alt) === "filled" ? "filled" : "hollow"; // a port's own variant wins over the class's look
        const look = `ip ip-${c?.handle ?? "circle"} ip-${c?.size ?? 8} ip-${fill} k-${c?.kind ?? "output"}${hidden ? " ip-hidden" : ""}`;
        const title = connectorHint(port.id, c);
        const kinds: ("source" | "target")[] = !c || c.kind === "acausal" ? ["source", "target"] : c.kind === "output" ? ["source"] : ["target"];
        return (
          <Fragment key={port.id}>
            {kinds.map((type) => (
              <PortHandle key={type} type={type} position={SIDE_POSITION[port.side]} id={port.id} {...along} label={hidden ? undefined : port.id} title={title} className={look} color={c?.color} />
            ))}
            {count !== undefined && !hidden && (
              <span className={`ip-count side-${port.side}`} style={along} aria-hidden="true">
                {count}
              </span>
            )}
            {(wires?.[port.id] ?? 0) >= 3 && <i className="ip-junction" style={along} data-side={port.side} aria-hidden="true" />}
          </Fragment>
        );
      })}
    </>
  );
}
