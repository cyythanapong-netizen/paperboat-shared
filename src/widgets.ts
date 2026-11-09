// The shared widgets' manifest: one mark per widget, no components (import those from their
// own subpath, so a consumer never bundles a widget it does not use).

import { scopeWidget } from "./scope/widget.ts";

export { scopeWidget };
export type { WidgetMeta } from "./widget.ts";

export const widgets = [scopeWidget] as const;
