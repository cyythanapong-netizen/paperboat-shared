// The sliders key and its popover: theme, font, size, line height, tab, wrap, autocomplete,
// brackets and lint. The popover sits under the key's positioned container (`.editor-settings`).
import { useRef, useState } from "react";
import { useDismiss, useFocusReturn } from "../dismiss.tsx";
import type { EditorSettings } from "./CodeEditor.tsx";
import { EDITOR_THEMES } from "./themes.ts";
import type { ConfigFile } from "./useEditorSettings.ts";

export function EditorSettingsKey({ settings, onSettings, lintNote, file }: {
  settings: EditorSettings;
  onSettings: (next: EditorSettings) => void;
  /** What the app's linter checks, shown beside the lint switch ("% comments"). */
  lintNote?: string;
  /** The config file the settings live in, shown at the foot so a user knows where to edit them. */
  file?: ConfigFile;
}) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const gear = useRef<HTMLButtonElement>(null);
  // The same dismissal rule as the menus: a press outside or Escape closes; focus goes back.
  useDismiss(panel, () => setOpen(false), { enabled: open, triggerRef: gear });
  useFocusReturn(open ? panel : undefined);
  const set = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => onSettings({ ...settings, [key]: value });

  return (
    <>
      <button ref={gear} type="button" className={`key small settings-key ${open ? "on" : ""}`} onClick={() => setOpen((v) => !v)} title="Editor settings" aria-label="Editor settings" aria-expanded={open}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2.5 5.25h2.1M6.8 5.25h6.7M2.5 10.75h4M9.8 10.75h3.7" />
          <circle cx="5.6" cy="5.25" r="1.5" />
          <circle cx="8.1" cy="10.75" r="1.5" />
        </svg>
      </button>
      {open && (
        <div ref={panel} className="editor-settings" role="dialog" aria-label="Editor settings" data-own-keys>
          <div className="es-head"><b>editor</b><span className="sp" /><button type="button" className="plain tag" onClick={() => setOpen(false)}>close</button></div>
          <label className="es-row"><span>theme</span>
            <select value={settings.theme} onChange={(e) => set("theme", e.target.value)}>
              <option value="ui">follow ui</option>
              {Object.keys(EDITOR_THEMES).map((t) => <option key={t} value={t}>{t}</option>)}
              {Object.keys(settings.themes ?? {}).filter((t) => !(t in EDITOR_THEMES)).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="es-row"><span>font</span>
            <select value={settings.font} onChange={(e) => set("font", e.target.value as EditorSettings["font"])}>
              <option value="geist">Geist Mono</option>
              <option value="system">System mono</option>
              <option value="serif">Serif</option>
            </select>
          </label>
          <label className="es-row"><span>size</span>
            <select value={settings.fontSize} onChange={(e) => set("fontSize", Number(e.target.value))}>
              {[11, 12, 13, 14, 15, 16].map((n) => <option key={n} value={n}>{n} px</option>)}
            </select>
          </label>
          <label className="es-row"><span>line height</span>
            <select value={settings.lineHeight} onChange={(e) => set("lineHeight", Number(e.target.value))}>
              {[20, 22, 24, 26, 28].map((n) => <option key={n} value={n}>{n} px</option>)}
            </select>
          </label>
          <label className="es-row"><span>tab</span>
            <select value={settings.tabSize} onChange={(e) => set("tabSize", Number(e.target.value))}>
              {[2, 4, 8].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="es-check"><input type="checkbox" checked={settings.wrap} onChange={(e) => set("wrap", e.target.checked)} /> wrap lines</label>
          <label className="es-check"><input type="checkbox" checked={settings.autocomplete} onChange={(e) => set("autocomplete", e.target.checked)} /> autocomplete</label>
          <label className="es-check"><input type="checkbox" checked={settings.brackets} onChange={(e) => set("brackets", e.target.checked)} /> close brackets</label>
          <label className="es-check"><input type="checkbox" checked={settings.lint} onChange={(e) => set("lint", e.target.checked)} /> lint{lintNote ? <> <span className="tag">{lintNote}</span></> : null}</label>
          {file && <div className="es-file" title="Edit this file for your own themes; the Studio reads it again when its window regains focus">
            <code>{file.path}</code>{file.error && <span className="es-error">{file.error}</span>}
          </div>}
        </div>
      )}
    </>
  );
}
