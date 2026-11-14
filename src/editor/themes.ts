// Editor themes as palettes: one flat set of colours each, turned into CodeMirror's chrome and
// syntax highlighting by themeExtension. The built-ins ship here; a user adds their own in the
// config file as [themes.<name>], starting from a built-in (`base`) and overriding any colour.
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

export type EditorPalette = {
  dark: boolean;
  background: string; foreground: string; gutter: string; gutterText: string;
  activeLine: string; selection: string; cursor: string;
  /** Tooltips and completion lists. */
  panel: string; panelLine: string;
  comment: string; keyword: string; string: string; builtin: string; escape: string; number: string;
  operator: string; punctuation: string; property: string; function: string; type: string;
  definition: string; error: string;
};

/** A user's theme: a built-in to start from and the colours it changes. */
export type ThemeSpec = Partial<EditorPalette> & { base?: string };

export const EDITOR_THEMES: Record<string, EditorPalette> = {
  paper: {
    dark: false, background: "#f2f2ef", foreground: "#161616", gutter: "#eaeae6", gutterText: "#9d9d97",
    activeLine: "rgba(0,0,0,.045)", selection: "rgba(0,0,0,.13)", cursor: "#b03d0a", panel: "#f2f2ef", panelLine: "#161616",
    comment: "#7a7a73", keyword: "#7c3aed", string: "#15803d", builtin: "#0f766e", escape: "#b45309", number: "#b45309",
    operator: "#55554f", punctuation: "#8a8a84", property: "#1d4ed8", function: "#1d4ed8", type: "#a16207",
    definition: "#000000", error: "#b42318",
  },
  ink: {
    dark: true, background: "var(--surface-screen)", foreground: "#d6d6d0", gutter: "var(--surface-screen)", gutterText: "#4f4f4a",
    activeLine: "rgba(255,255,255,.045)", selection: "rgba(255,255,255,.18)", cursor: "var(--signal)", panel: "#191919", panelLine: "#3a3a3a",
    comment: "#6f737a", keyword: "#c792ea", string: "#98c379", builtin: "#56b6c2", escape: "#d19a66", number: "#e5c07b",
    operator: "#a6adc8", punctuation: "#7f848e", property: "#61afef", function: "#61afef", type: "#e5c07b",
    definition: "#f2f2ee", error: "#e06c75",
  },
  sepia: {
    dark: false, background: "#f3ead7", foreground: "#3a2f23", gutter: "#ebe0c9", gutterText: "#a8977a",
    activeLine: "rgba(90,60,20,.06)", selection: "rgba(120,80,30,.18)", cursor: "#a0441b", panel: "#f7f0e1", panelLine: "#3a2f23",
    comment: "#9a8a6e", keyword: "#8f3f71", string: "#5f7f1f", builtin: "#2d7a74", escape: "#b0631f", number: "#b0631f",
    operator: "#6b5d4b", punctuation: "#9a8a6e", property: "#2f5f9a", function: "#2f5f9a", type: "#946b00",
    definition: "#1f1710", error: "#b3261e",
  },
  harbor: {
    dark: true, background: "#0e1621", foreground: "#c5d1de", gutter: "#0e1621", gutterText: "#3d4d60",
    activeLine: "rgba(120,170,255,.06)", selection: "rgba(120,170,255,.22)", cursor: "#ffb454", panel: "#131d2a", panelLine: "#2a3a4e",
    comment: "#5c6f86", keyword: "#c3a6ff", string: "#a5d68a", builtin: "#6fd3d1", escape: "#f0a35e", number: "#f5c86e",
    operator: "#8fa3ba", punctuation: "#6a7d94", property: "#7fb4ff", function: "#7fb4ff", type: "#f5c86e",
    definition: "#eef3f8", error: "#ff7a85",
  },
  contrast: {
    dark: true, background: "#000000", foreground: "#ffffff", gutter: "#000000", gutterText: "#8a8a8a",
    activeLine: "rgba(255,255,255,.08)", selection: "rgba(255,255,255,.3)", cursor: "#ffcc00", panel: "#000000", panelLine: "#ffffff",
    comment: "#b0b0b0", keyword: "#ff9de2", string: "#9fef8f", builtin: "#7ff0ff", escape: "#ffb366", number: "#ffe066",
    operator: "#ffffff", punctuation: "#cfcfcf", property: "#8cc8ff", function: "#8cc8ff", type: "#ffe066",
    definition: "#ffffff", error: "#ff6b6b",
  },
};

/** The palette `theme` names: "ui" follows the app (paper or ink), a user theme starts from its base. */
export function paletteOf(theme: string, appTheme: "light" | "dark", custom: Record<string, ThemeSpec> = {}): EditorPalette {
  const ui = EDITOR_THEMES[appTheme === "dark" ? "ink" : "paper"];
  const own = custom[theme];
  if (own) {
    const { base, ...colours } = own;
    return { ...(EDITOR_THEMES[base ?? ""] ?? ui), ...colours };
  }
  return EDITOR_THEMES[theme] ?? ui;
}

// Built once per palette: a settings change (font, wrap) reconfigures the theme too, and
// HighlightStyle.define mints new CSS classes every call.
const built = new Map<string, Extension>();

export function themeExtension(p: EditorPalette): Extension {
  const key = JSON.stringify(p);
  let ext = built.get(key);
  if (!ext) built.set(key, (ext = buildTheme(p)));
  return ext;
}

function buildTheme(p: EditorPalette): Extension {
  const chrome = EditorView.theme({
    "&": { height: "100%", backgroundColor: p.background, color: p.foreground },
    ".cm-content": { caretColor: p.cursor },
    // Opaque: the sticky gutters (line numbers, git, an app's own) sit over text scrolled sideways when wrap is off.
    ".cm-gutters": { backgroundColor: p.gutter, border: "none", color: p.gutterText },
    ".cm-activeLine": { backgroundColor: p.activeLine },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: p.foreground },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: p.cursor },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: p.selection },
    ".cm-selectionMatch": { backgroundColor: `color-mix(in srgb, ${p.selection} 50%, transparent)` },
    ".cm-matchingBracket, .cm-nonmatchingBracket": { backgroundColor: `color-mix(in srgb, ${p.selection} 60%, transparent)`, outline: `1px solid ${p.gutterText}` },
    ".cm-tooltip": { backgroundColor: p.panel, border: `1px solid ${p.panelLine}`, color: p.foreground, fontFamily: "var(--font-mono)", fontSize: "10px", borderRadius: "5px", boxShadow: `0 8px 22px rgb(0 0 0 / ${p.dark ? ".5" : ".16"})` },
    ".cm-tooltip.cm-tooltip-autocomplete": { overflow: "hidden" },
    ".cm-tooltip-autocomplete > ul": { fontFamily: "var(--font-mono)", fontSize: "11px", maxHeight: "16em", padding: "3px" },
    ".cm-tooltip-autocomplete > ul > li": { padding: "3px 7px", lineHeight: "1.5", borderLeft: "2px solid transparent" },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "transparent", color: p.definition, borderLeftColor: p.cursor },
    ".cm-completionDetail": { color: p.comment, fontStyle: "normal", fontSize: "9.5px", marginLeft: "8px" },
    ".cm-completionMatchedText": { color: p.cursor, textDecoration: "none" },
    ".cm-completionInfo": { backgroundColor: p.panel, border: `1px solid ${p.panelLine}`, color: p.foreground, padding: "6px 8px", fontFamily: "var(--font-mono)", fontSize: "10px" },
    ".cm-lintRange-warning": { textDecorationColor: p.cursor },
    ".cm-lint-marker-warning": { color: p.cursor },
  }, { dark: p.dark });
  const highlight = HighlightStyle.define([
    { tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment], color: p.comment, fontStyle: "italic" },
    { tag: [tags.keyword, tags.operatorKeyword, tags.typeOperator, tags.macroName], color: p.keyword },
    { tag: tags.string, color: p.string },
    { tag: [tags.special(tags.string), tags.atom, tags.standard(tags.variableName)], color: p.builtin },
    { tag: tags.escape, color: p.escape },
    { tag: [tags.number, tags.bool, tags.null], color: p.number },
    { tag: tags.operator, color: p.operator },
    { tag: tags.punctuation, color: p.punctuation },
    { tag: tags.variableName, color: p.foreground },
    { tag: [tags.propertyName], color: p.property },
    { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: p.function },
    { tag: tags.typeName, color: p.type },
    { tag: [tags.definition(tags.variableName), tags.definition(tags.typeName)], color: p.definition, fontWeight: "600" },
    { tag: tags.special(tags.variableName), color: p.error },
    { tag: tags.invalid, color: p.error, textDecoration: "underline wavy" },
  ]);
  return [chrome, syntaxHighlighting(highlight)];
}
