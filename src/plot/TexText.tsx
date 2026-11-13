// MATLAB text in the figure: the `tex` interpreter's subscripts, superscripts and Greek
// commands, and the `latex` interpreter's `$…$` maths. KaTeX draws the maths; plain words stay
// in the axes font, as MATLAB's default TeX interpreter does.
import { createElement, Fragment, useMemo } from "react";
import "katex/dist/katex.min.css";
import { texParts, type Interpreter } from "./tex.ts";

export type { Interpreter } from "./tex.ts";
export { texParts, texToMath } from "./tex.ts";

export type TexTextProps = {
  text?: string;
  interpreter?: Interpreter;
  className?: string;
  /** The element the text draws in (a title is often a div, a tick label a span). */
  as?: "span" | "div";
};

export function TexText({ text = "", interpreter = "tex", className, as = "span" }: TexTextProps) {
  const parts = useMemo(() => texParts(text, interpreter), [text, interpreter]);
  const children = parts.map((part, index) =>
    part.html !== undefined
      ? createElement("span", { key: index, className: "pb-tex-math", dangerouslySetInnerHTML: { __html: part.html } })
      : createElement(Fragment, { key: index }, part.text),
  );
  return createElement(as, { className: ["pb-tex", className].filter(Boolean).join(" "), "aria-label": text }, ...children);
}
