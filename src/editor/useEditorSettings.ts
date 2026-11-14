// The editor settings, kept in the user's config file (squero.toml, shared by Squero Studio MX
// and OM) through the app's ConfigStore: [editor] holds the settings, [themes.<name>] the user's
// own themes. The file is read on mount and whenever the window regains focus, so a hand edit
// shows up on return; a change in the settings popover rewrites just the keys that changed.
// Without a store (no server) the settings live in localStorage, as they did before the file.
import { useCallback, useEffect, useRef, useState } from "react";
import { readStored, writeStored } from "../storage.ts";
import { parseToml, patchToml, type TomlTable, type TomlValue } from "../toml.ts";
import { DEFAULT_EDITOR_SETTINGS, type EditorSettings } from "./CodeEditor.tsx";
import { EDITOR_THEMES, type EditorPalette, type ThemeSpec } from "./themes.ts";

/** The config file as the app's server reaches it. `text` is null while there is no file yet. */
export type ConfigStore = {
  read(): Promise<{ path: string; text: string | null }>;
  write(text: string): Promise<void>;
};

/** Where the settings came from: the file's path (for the popover) and what went wrong reading or writing it. */
export type ConfigFile = { path: string; error?: string };

const KEYS: Record<string, keyof EditorSettings> = {
  theme: "theme", font: "font", font_size: "fontSize", line_height: "lineHeight", tab_size: "tabSize",
  wrap: "wrap", autocomplete: "autocomplete", brackets: "brackets", lint: "lint",
};
const FONTS = ["geist", "system", "serif"];
const PALETTE_KEYS = Object.keys(EDITOR_THEMES.paper) as (keyof EditorPalette)[];
const snake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** Settings as stored before the file, or by a file: unknown keys dropped, the old light/dark names mapped. */
function clean(raw: Record<string, unknown>): EditorSettings {
  const out: EditorSettings = { ...DEFAULT_EDITOR_SETTINGS };
  for (const key of Object.values(KEYS)) {
    const v = raw[key];
    if (key === "themes" || typeof v !== typeof DEFAULT_EDITOR_SETTINGS[key]) continue;
    if (key === "font" && !FONTS.includes(v as string)) continue;
    (out as Record<string, unknown>)[key] = v;
  }
  out.theme = ({ light: "paper", dark: "ink" } as Record<string, string>)[out.theme] ?? out.theme;
  return out;
}

/** The settings and themes a config file sets; throws on a file outside the TOML subset. */
export function readConfig(text: string): EditorSettings {
  const doc = parseToml(text);
  const editor = (typeof doc.editor === "object" ? doc.editor : {}) as TomlTable;
  const raw: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(editor)) if (KEYS[k]) raw[KEYS[k]] = v;
  const settings = clean(raw);
  const themes: Record<string, ThemeSpec> = {};
  for (const [name, t] of Object.entries(typeof doc.themes === "object" ? doc.themes : {})) {
    if (typeof t !== "object") continue;
    const spec: ThemeSpec = {};
    if (typeof t.base === "string") spec.base = t.base;
    if (typeof t.dark === "boolean") spec.dark = t.dark;
    for (const k of PALETTE_KEYS) if (k !== "dark" && typeof t[snake(k)] === "string") (spec as Record<string, unknown>)[k] = t[snake(k)];
    themes[name] = spec;
  }
  if (Object.keys(themes).length) settings.themes = themes;
  return settings;
}

const tomlOf = (s: EditorSettings): Record<string, TomlValue> =>
  Object.fromEntries(Object.entries(KEYS).map(([k, key]) => [k, s[key] as TomlValue]));

/** The file a first run writes: the current settings, every key commented, and a sample theme. */
export function configTemplate(s: EditorSettings): string {
  const t = tomlOf(s);
  return `# Squero Studio settings, read by Squero Studio MX and OM.
# Edit freely: the Studios read this file again when their window regains focus, and the
# editor's settings popover writes its changes back here, keeping your comments.

[editor]
theme = ${JSON.stringify(t.theme)}  # "ui" follows the app: paper when light, ink when dark. Built in: ${Object.keys(EDITOR_THEMES).join(", ")}; or one of [themes] below
font = ${JSON.stringify(t.font)}  # geist, system or serif
font_size = ${t.font_size}
line_height = ${t.line_height}
tab_size = ${t.tab_size}
wrap = ${t.wrap}
autocomplete = ${t.autocomplete}
brackets = ${t.brackets}
lint = ${t.lint}

# Your own theme: start from a built-in (base) and change any colour; then set theme = "mine".
# Colours: ${PALETTE_KEYS.filter((k) => k !== "dark").map(snake).join(", ")}.
# [themes.mine]
# base = "ink"
# keyword = "#ff9e64"
# string = "#b5e08c"
`;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * The editor settings for `store`'s file, with `legacyKey` (the app's old localStorage key) as
 * the fallback and the seed of a first file. Pass a stable store (module constant or memoised).
 */
export function useEditorSettings(store: ConfigStore | undefined, legacyKey: string): [EditorSettings, (next: EditorSettings) => void, ConfigFile | undefined] {
  const [settings, setSettings] = useState<EditorSettings>(() => clean(readStored(legacyKey, isObject) ?? {}));
  const [file, setFile] = useState<ConfigFile>();
  const current = useRef(settings);
  current.current = settings;

  useEffect(() => {
    if (!store) return;
    let live = true;
    const load = async () => {
      let got: { path: string; text: string | null };
      try { got = await store.read(); } catch { return; } // no server: localStorage only
      if (!live) return;
      try {
        if (got.text == null) await store.write(configTemplate(current.current));
        else setSettings(readConfig(got.text));
        setFile({ path: got.path });
      } catch (e) {
        if (live) setFile({ path: got.path, error: message(e) });
      }
    };
    void load();
    window.addEventListener("focus", load);
    return () => { live = false; window.removeEventListener("focus", load); };
  }, [store]);

  const update = useCallback((next: EditorSettings) => {
    const before = tomlOf(current.current);
    const changed = Object.fromEntries(Object.entries(tomlOf(next)).filter(([k, v]) => before[k] !== v));
    setSettings(next);
    const { themes: _, ...own } = next;
    writeStored(legacyKey, own);
    if (!store || !Object.keys(changed).length) return;
    void (async () => {
      try {
        const { path, text } = await store.read();
        const out = patchToml(text ?? configTemplate(next), "editor", changed);
        await store.write(out);
        try { readConfig(out); setFile({ path }); } catch (e) { setFile({ path, error: message(e) }); }
      } catch (e) {
        setFile((f) => (f ? { ...f, error: `not saved: ${message(e)}` } : f));
      }
    })();
  }, [store, legacyKey]);

  return [settings, update, file];
}
