/**
 * The Squero Studio logo, `squero [om]`: "squero" over its five water dots, the product code in
 * bold ink brackets. Inline SVG; the geometry is in logo.ts.
 */

import {
  SQUERO_LOGO_VIEWBOX,
  WATER_DOTS,
  WATER_Y,
  DOT_SIZE,
  TAG_GEOMETRY,
  type SqueroLogoProps,
  logoWidth,
} from "./logo.ts";

export function SqueroLogo({ product = "OM", height = 20, running = false }: SqueroLogoProps) {
  const width = logoWidth(height);
  const cls = running ? "logo-live" : "logo-idle";

  return (
    <svg
      className={`squero-logo ${cls}`}
      width={width}
      height={height}
      viewBox={`${SQUERO_LOGO_VIEWBOX.x} ${SQUERO_LOGO_VIEWBOX.y} ${SQUERO_LOGO_VIEWBOX.width} ${SQUERO_LOGO_VIEWBOX.height}`}
      shapeRendering="geometricPrecision"
      aria-hidden="true"
      style={{ ["--lr" as any]: `${DOT_SIZE}px` }}
    >
      <text
        x={0}
        y={0}
        className="squero-logo-ink"
        fontFamily="var(--font-sans)"
        fontWeight={600}
        fontSize={100}
      >
        squero
      </text>
      <g className="squero-logo-water" shapeRendering="crispEdges">
        {WATER_DOTS.map((x, i) => (
          <g key={i} className={`w w${i + 1}`}>
            <rect x={x} y={WATER_Y} width={DOT_SIZE} height={DOT_SIZE} />
          </g>
        ))}
      </g>
      <text
        x={TAG_GEOMETRY.x}
        y={0}
        className="squero-logo-ink"
        fontFamily="var(--font-mono)"
        fontWeight={600}
        fontSize={TAG_GEOMETRY.fontSize}
      >
        [{product.toLowerCase()}]
      </text>
    </svg>
  );
}
