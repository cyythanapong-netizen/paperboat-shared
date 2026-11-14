// The Studio code editor: CodeMirror 6 with the palette themes (themes.ts), the user's editor
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
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { lintGutter } from "@codemirror/lint";
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, type CompletionSource } from "@codemirror/autocomplete";
import { gitGutter } from "./gitGutter.ts";
import { paletteOf, themeExtension, type ThemeSpec } from "./themes.ts";

export type EditorSettings = {
  /** "ui" (paper or ink, following the app), a built-in theme's name or one of `themes`. */
  theme: string;
  fontSize: number;
  font: "geist" | "system" | "serif";
  lineHeight: number;
  tabSize: number;
  wrap: boolean;
  autocomplete: boolean;
  brackets: boolean;
  lint: boolean;
  /** The user's own themes, from the config file's [themes.<name>] tables. */
  themes?: Record<string, ThemeSpec>;
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

  const themeExt = () => themeExtension(paletteOf(settings.theme, appTheme, settings.themes));
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
