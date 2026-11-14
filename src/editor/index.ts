// The Studio code editor, shared by Squero Studio MX and OM (styles in editor.css).
export { CodeEditor, DEFAULT_EDITOR_SETTINGS, type CodeEditorProps, type EditorPos, type EditorSettings } from "./CodeEditor.tsx";
export { EditorSettingsKey } from "./EditorSettingsKey.tsx";
export { EDITOR_THEMES, paletteOf, themeExtension, type EditorPalette, type ThemeSpec } from "./themes.ts";
export { configTemplate, readConfig, useEditorSettings, type ConfigFile, type ConfigStore } from "./useEditorSettings.ts";
export { gitGutter, gitMarks, textOf, type GitKind } from "./gitGutter.ts";
