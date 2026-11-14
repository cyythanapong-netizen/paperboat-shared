# @paperboat/shared

The UI kit behind Paperboat's apps, with no domain logic: nothing here knows about a simulation
runtime or Modelica.

| Area | Files |
| --- | --- |
| Tokens, Geist fonts, light/dark | `src/tokens.css`, `src/base.css` (page, type, keys, fields, wells, screens: every app's base, imported by plates.css), `src/plates.css` (plate, port, wire, menu, bar, modal rules) |
| Controls and menus | `Menus.tsx`, `commands.ts`, `NumberField.tsx`, `Dock.tsx` |
| Blocks and ports | `Compact.tsx`, `Icon.tsx` + `icon.ts` (the `view.icon` primitive renderer), `portLayout.tsx`, `ports.ts` (wire rules for causal and acausal/Modelica connectors), `wireSnap.tsx`, `wireRouting.ts` (square routes, both canvases), `wireBends.tsx` (draggable wire segments) |
| Scope and instruments | `Dashboard.tsx`, `dashboardLayout.ts` |
| Plots | `src/plot/`: `Plot2D`, `HeatFigure`, `Colorbar`, `TexText` (MATLAB figures) and the shared `Scope`/`Sparkline` |
| Shell | `Shell.tsx` (wordmark, `ProjectLabel`, `BarEnd` and `PanelToggle`, `StatusPill`, `Switch`, `ThemeToggle`, `useThemeChoice`), `Modal.tsx` (the one overlay dialog every app opens), `Logo.tsx` |
| Code editor | `src/editor/`: `CodeEditor` (CodeMirror 6: themes, settings, git gutter; the app brings its language), `EditorSettingsKey` (the sliders popover), `themes.ts` (palette themes: paper, ink, sepia, harbor, contrast), `useSqueroConfig` (the app theme and editor settings in the user's `squero.toml` through the app's `ConfigStore`; `src/toml.ts` is the TOML subset it reads and patches), `gitGutter.ts`, `editor.css`. CodeMirror is a peer: dedupe `@codemirror/*` and `@lezer/highlight` in the app's Vite config. |
| File rail | `src/files/`: `FileTree` and `FileRail` (tab strip, + key, folder head, foot, fold to a standing tab) with `files.css`. The app keeps the mutations. |
| Squero Studio shell | `src/squero/`: `SqueroLogo` + `logo.ts` (geometry), `AboutSquero` (the About dialog; each app passes its facts) and `squero.css` (logo, busy `.wave`, modals, About). Used by Squero Studio OM and MX. |
| Dismissal | `dismiss.tsx` (`useDismiss`, `useFocusReturn`): an outside press or Escape closes a floating surface, with a single layer stack for nested popovers |
| Canvas utilities | `undo.ts`, `clipboard.ts`, `graphLayout.ts` |
| Protocol types | `protocol.ts`, **generated** from `paperboat/protocol/schema/paperboat-0.schema.json` by `python3 protocol/gen_ts.py` in the `paperboat` repo. Do not edit by hand. |

It is a TypeScript-source package (`main` is `src/index.ts`); the consuming app's bundler compiles it.

## Use

Apps depend on a sibling checkout:

```json
"@paperboat/shared": "file:../paperboat-shared"
```

Run `npm install` here once so the kit's own dependencies exist. In the consuming app's Vite config
add `resolve: { dedupe: ["react", "react-dom", "@xyflow/react"] }` so there is one React.

```ts
import { Compact, Shell } from "@paperboat/shared";
import "@paperboat/shared/tokens.css";
import "@paperboat/shared/plates.css";
```

Also exported: `@paperboat/shared/icon`, `@paperboat/shared/fixtures/icons` (icon test fixtures), and
`@paperboat/shared/plot` (`Plot2D`, `HeatFigure`, `Colorbar`, `TexText`, `Scope`, `Sparkline`), and
`@paperboat/shared/squero` + `squero.css` for the Squero Studio apps.

```ts
import { Plot2D } from "@paperboat/shared/plot";
```

## Dismissal

A floating surface registers itself with `useDismiss(ref, onClose, options)`: a primary press
outside `ref`, or Escape when it is the topmost surface, closes it. Pass `triggerRef` for the
button that opened it so its click still toggles instead of closing and reopening. Nested
surfaces close one at a time, topmost first. Alert dialogs pass `outside: false`; they then
also shield the surfaces under them from outside presses. Drawers are panels, not popovers,
and stay on their explicit toggle.

## Develop

```sh
npm install
npm run build   # typecheck
npm test        # includes the view.icon token rule and the port rules
```

`test/fixtures/modelica/*.icon.json` are the Modelica importer goldens, copied from
`paperboat/engine/tests/data/modelica/`; refresh them when the importer's output changes.

## CI

`.github/workflows/ci.yml` builds and tests here, then builds and tests `paperboat` (`apps/web`) and
`squero-studio-om` against this checkout, so a breaking change shows up before it merges.

## Versioning

SemVer, tagged `vX.Y.Z[-alpha.N]`; `package.json` holds the number. It shares a MAJOR.MINOR line
with `paperboat` (`0.1.x` pairs with `0.1.x`); a breaking change bumps MINOR. Consumers pin it by
tag: `paperboat pkg install paperboat-shared@<version>`. Full rules: `paperboat/GUIDELINES.md` §9.
