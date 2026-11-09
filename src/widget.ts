// A shared widget's public mark: what it is, which version of its props it takes, and what
// it is for. A toolkit's instrument kind uses the same id, so the adapter and any app that
// imports the widget cannot drift apart.
//
// A widget is presentation only: no host, protocol or registry. The adapter that maps a
// backend's data to its props stays in the toolkit (GUIDELINES §7).

export type WidgetMeta = {
  /** Stable identity, the same string a toolkit uses as its instrument kind. */
  id: string;
  /** The props/behaviour contract; bump when a consumer must change. */
  version: number;
  /** A user-facing name. */
  title: string;
  /** One sentence: what it shows or does. */
  description: string;
  /** What it is good for, so a host or docs can find it ("time-series", "xy", "fft"). */
  tags: readonly string[];
  /** The settings object it keeps; bump when an old saved setting needs a migration. */
  settingsVersion?: number;
};
