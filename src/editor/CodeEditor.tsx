// The Studio code editor: CodeMirror 6 with the flat-mono light/dark themes, the user's editor
// settings (font, size, line height, tab, wrap, brackets, autocomplete, lint), a git gutter and the
// cursor readout. The app brings its language and anything of its own (completions, lint, gutters,
// keys); Squero Studio MX passes Julia, OM passes Modelica.
import { useEffect, useRef } from "react";
import { Compartment, EditorState, Prec, type Extension } from "@codemirror/state";
import {
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter,
  drawSelection, dropCursor, rectangularSelection, crosshairCursor, type KeyBinding,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting, bracketMatching, indentOnInput } from "@codemirror/language";
import { lintGutter } from "@codemirror/lint";
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, type CompletionSource } from "@codemirror/autocomplete";
import { tags } from "@lezer/highlight";
import { gitGutter } from "./gitGutter.ts";

export type EditorSettings = {
  theme: "ui" | "dark" | "light";
  fontSize: number;
  font: "geist" | "system" | "serif";
  lineHeight: number;
  tabSize: number;
  wrap: boolean;
  autocomplete: boolean;
  brackets: boolean;
  lint: boolean;
};

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  theme: "ui", fontSize: 12, font: "geist", lineHeight: 22,
  tabSize: 2, wrap: true, autocomplete: true, brackets: true, lint: true,
};

const FONTS: Record<EditorSettings["font"], string> = {
  geist: "var(--font-mono)",
  system: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  serif: "ui-serif, Georgia, Cambria, serif",
};

const darkHighlight = HighlightStyle.define([
  { tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment], color: "#6f737a", fontStyle: "italic" },
  { tag: [tags.keyword, tags.operatorKeyword, tags.typeOperator], color: "#c792ea" },
  { tag: tags.string, color: "#98c379" },
  { tag: tags.special(tags.string), color: "#56b6c2" },
  { tag: tags.escape, color: "#d19a66" },
  { tag: [tags.number, tags.bool, tags.null], color: "#e5c07b" },
  { tag: tags.atom, color: "#56b6c2" },
  { tag: tags.operator, color: "#a6adc8" },
  { tag: tags.punctuation, color: "#7f848e" },
  { tag: tags.variableName, color: "#d6d6d0" },
  { tag: tags.propertyName, color: "#61afef" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "#61afef" },
  { tag: tags.standard(tags.variableName), color: "#56b6c2" },
  { tag: tags.typeName, color: "#e5c07b" },
  { tag: tags.macroName, color: "#c678dd" },
  { tag: tags.definition(tags.variableName), color: "#f2f2ee", fontWeight: "600" },
  { tag: tags.definition(tags.typeName), color: "#f2f2ee", fontWeight: "600" },
  { tag: tags.special(tags.variableName), color: "#e06c75" },
  { tag: tags.invalid, color: "#e06c75", textDecoration: "underline wavy" },
]);

const lightHighlight = HighlightStyle.define([
  { tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment], color: "#7a7a73", fontStyle: "italic" },
  { tag: [tags.keyword, tags.operatorKeyword, tags.typeOperator], color: "#7c3aed" },
  { tag: tags.string, color: "#15803d" },
  { tag: tags.special(tags.string), color: "#0f766e" },
  { tag: tags.escape, color: "#b45309" },
  { tag: [tags.number, tags.bool, tags.null], color: "#b45309" },
  { tag: tags.atom, color: "#0f766e" },
  { tag: tags.operator, color: "#55554f" },
  { tag: tags.punctuation, color: "#8a8a84" },
  { tag: tags.variableName, color: "#161616" },
  { tag: tags.propertyName, color: "#1d4ed8" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "#1d4ed8" },
  { tag: tags.standard(tags.variableName), color: "#0f766e" },
  { tag: tags.typeName, color: "#a16207" },
  { tag: tags.macroName, color: "#9333ea" },
  { tag: tags.definition(tags.variableName), color: "#000000", fontWeight: "600" },
  { tag: tags.definition(tags.typeName), color: "#000000", fontWeight: "600" },
  { tag: tags.special(tags.variableName), color: "#b42318" },
  { tag: tags.invalid, color: "#b42318", textDecoration: "underline wavy" },
]);

const darkTheme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "transparent", color: "#d6d6d0" },
  ".cm-content": { caretColor: "var(--signal)" },
  // Opaque: the sticky gutters (line numbers, git, an app's own) sit over text scrolled sideways when wrap is off.
  ".cm-gutters": { backgroundColor: "var(--surface-screen)", border: "none", color: "#4f4f4a" },
  ".cm-activeLine": { backgroundColor: "rgba(255,255,255,.045)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#f2f2ee" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--signal)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: "rgba(255,255,255,.18)" },
  ".cm-selectionMatch": { backgroundColor: "rgba(255,255,255,.08)" },
  ".cm-matchingBracket, .cm-nonmatchingBracket": { backgroundColor: "rgba(255,255,255,.1)", outline: "1px solid #4a4a4a" },
  ".cm-tooltip": { backgroundColor: "#191919", border: "1px solid #3a3a3a", color: "#d6d6d0", fontFamily: "var(--font-mono)", fontSize: "10px", borderRadius: "5px", boxShadow: "0 8px 22px rgb(0 0 0 / .5)" },
  ".cm-tooltip.cm-tooltip-autocomplete": { overflow: "hidden" },
  ".cm-tooltip-autocomplete > ul": { fontFamily: "var(--font-mono)", fontSize: "11px", maxHeight: "16em", padding: "3px" },
  ".cm-tooltip-autocomplete > ul > li": { padding: "3px 7px", lineHeight: "1.5", borderLeft: "2px solid transparent" },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "transparent", color: "#f2f2ee", borderLeftColor: "var(--signal)" },
  ".cm-completionDetail": { color: "#8a8a84", fontStyle: "normal", fontSize: "9.5px", marginLeft: "8px" },
  ".cm-completionMatchedText": { color: "var(--signal)", textDecoration: "none" },
  ".cm-completionInfo": { backgroundColor: "#191919", border: "1px solid #3a3a3a", color: "#d6d6d0", padding: "6px 8px", fontFamily: "var(--font-mono)", fontSize: "10px" },
  ".cm-lintRange-warning": { textDecorationColor: "var(--signal)" },
  ".cm-lint-marker-warning": { color: "var(--signal)" },
}, { dark: true });

const lightTheme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "#f2f2ef", color: "#161616" },
  ".cm-content": { caretColor: "#b03d0a" },
  ".cm-gutters": { backgroundColor: "#eaeae6", border: "none", color: "#9d9d97" },
  ".cm-activeLine": { backgroundColor: "rgba(0,0,0,.045)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#161616" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#b03d0a" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: "rgba(0,0,0,.13)" },
  ".cm-selectionMatch": { backgroundColor: "rgba(0,0,0,.06)" },
  ".cm-matchingBracket, .cm-nonmatchingBracket": { backgroundColor: "rgba(0,0,0,.08)", outline: "1px solid #9d9d97" },
  ".cm-tooltip": { backgroundColor: "#f2f2ef", border: "1px solid #161616", color: "#161616", fontFamily: "var(--font-mono)", fontSize: "10px", borderRadius: "5px", boxShadow: "0 8px 22px rgb(0 0 0 / .16)" },
  ".cm-tooltip.cm-tooltip-autocomplete": { overflow: "hidden" },
  ".cm-tooltip-autocomplete > ul": { fontFamily: "var(--font-mono)", fontSize: "11px", maxHeight: "16em", padding: "3px" },
  ".cm-tooltip-autocomplete > ul > li": { padding: "3px 7px", lineHeight: "1.5", borderLeft: "2px solid transparent" },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "transparent", color: "#161616", borderLeftColor: "#b03d0a" },
  ".cm-completionDetail": { color: "#6f6f69", fontStyle: "normal", fontSize: "9.5px", marginLeft: "8px" },
  ".cm-completionMatchedText": { color: "#b03d0a", textDecoration: "none" },
  ".cm-completionInfo": { backgroundColor: "#f2f2ef", border: "1px solid #161616", color: "#161616", padding: "6px 8px", fontFamily: "var(--font-mono)", fontSize: "10px" },
  ".cm-lintRange-warning": { textDecorationColor: "#b03d0a" },
  ".cm-lint-marker-warning": { color: "#b03d0a" },
}, { dark: false });

const geometry = (s: EditorSettings) => EditorView.theme({
  ".cm-scroller": { fontFamily: FONTS[s.font], fontSize: `${s.fontSize}px`, lineHeight: `${s.lineHeight}px` },
  ".cm-content": { padding: "8px 0" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 10px 0 12px" },
});

export type EditorPos = { line: number; col: number; selected: number };

export type CodeEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  settings: EditorSettings;
  appTheme: "light" | "dark";
  ariaLabel: string;
  /** The language (a StreamLanguage or a Lezer one); read at mount. */
  language: Extension;
  /** Keys above the defaults (run cell, Tab helpers); read at mount, so bind through refs. */
  keys?: readonly KeyBinding[];
  /** Completion sources, used while `settings.autocomplete` is on; read at mount. */
  completions?: readonly CompletionSource[];
  /** The app's linter, used while `settings.lint` is on; read at mount. */
  lint?: Extension;
  /** Anything else of the app's; reconfigured whenever it changes identity (memoise it). */
  extra?: Extension;
  /** HEAD's copy of this file for the git gutter; null when untracked or outside a repository. */
  base?: string | null;
  readOnly?: boolean;
  onPos?: (pos: EditorPos) => void;
  /** The live view (null on unmount), for the app's own commands: jump to a line, read the text. */
  onView?: (view: EditorView | null) => void;
};

const posOf = (state: EditorState): EditorPos => {
  const sel = state.selection.main;
  const line = state.doc.lineAt(sel.head);
  return { line: line.number, col: sel.head - line.from + 1, selected: sel.to - sel.from };
};

/** One document; remount (`key`) for another. `value` is the initial text, then the editor owns it. */
export function CodeEditor({
  value, onChange, settings, appTheme, ariaLabel, language, keys, completions, lint, extra, base, readOnly, onPos, onView,
}: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const change = useRef(onChange);
  change.current = onChange;
  const pos = useRef(onPos);
  pos.current = onPos;
  const c = useRef({
    theme: new Compartment(), font: new Compartment(), wrap: new Compartment(), tab: new Compartment(),
    auto: new Compartment(), brackets: new Compartment(), lint: new Compartment(), git: new Compartment(),
    extra: new Compartment(), readOnly: new Compartment(),
  }).current;

  const resolved = settings.theme === "ui" ? appTheme : settings.theme;
  const themeExt = () => [resolved === "dark" ? darkTheme : lightTheme, syntaxHighlighting(resolved === "dark" ? darkHighlight : lightHighlight)];
  const autoExt = () => (settings.autocomplete && completions?.length ? autocompletion({ override: [...completions], activateOnTyping: true, icons: true }) : []);
  const bracketExt = () => (settings.brackets ? [bracketMatching(), closeBrackets()] : []);
  const lintExt = () => (settings.lint && lint ? [lintGutter(), lint] : []);
  const gitExt = () => (base != null ? gitGutter(base) : []);
  const readOnlyExt = () => (readOnly ? [EditorState.readOnly.of(true), EditorView.editable.of(false)] : []);

  useEffect(() => {
    const instance = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          drawSelection(),
          dropCursor(),
          rectangularSelection(),
          crosshairCursor(),
          indentOnInput(),
          Prec.high(keymap.of([...(keys ?? [])])),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab, ...closeBracketsKeymap, ...completionKeymap]),
          language,
          c.theme.of(themeExt()),
          c.font.of(geometry(settings)),
          c.wrap.of(settings.wrap ? EditorView.lineWrapping : []),
          c.tab.of(EditorState.tabSize.of(settings.tabSize)),
          c.auto.of(autoExt()),
          c.brackets.of(bracketExt()),
          c.lint.of(lintExt()),
          c.git.of(gitExt()),
          c.extra.of(extra ?? []),
          c.readOnly.of(readOnlyExt()),
          EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) change.current?.(u.state.doc.toString());
            if (u.docChanged || u.selectionSet) pos.current?.(posOf(u.state));
          }),
        ],
      }),
      parent: host.current!,
    });
    view.current = instance;
    onView?.(instance);
    pos.current?.(posOf(instance.state));
    return () => {
      onView?.(null);
      instance.destroy();
      view.current = null;
    };
    // One document per mount: the caller remounts with `key` for another file.
  }, []);

  useEffect(() => {
    view.current?.dispatch({
      effects: [
        c.theme.reconfigure(themeExt()),
        c.font.reconfigure(geometry(settings)),
        c.wrap.reconfigure(settings.wrap ? EditorView.lineWrapping : []),
        c.tab.reconfigure(EditorState.tabSize.of(settings.tabSize)),
        c.auto.reconfigure(autoExt()),
        c.brackets.reconfigure(bracketExt()),
        c.lint.reconfigure(lintExt()),
      ],
    });
  }, [settings, appTheme]);

  useEffect(() => { view.current?.dispatch({ effects: c.git.reconfigure(gitExt()) }); }, [base]);
  useEffect(() => { view.current?.dispatch({ effects: c.extra.reconfigure(extra ?? []) }); }, [extra]);
  useEffect(() => { view.current?.dispatch({ effects: c.readOnly.reconfigure(readOnlyExt()) }); }, [readOnly]);

  return <div className="cm-host" ref={host} />;
}
