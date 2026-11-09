// The Scope's inputs, without the host: a channel is a label, a unit and its samples.
// The Paperboat app's Channel (with a TraceBuffer) and Studio's run series both fit.

/** The samples a channel plots: parallel time and value arrays. */
export type ScopeSamples = { times: ArrayLike<number>; values: ArrayLike<number> };

/** One plotted line: a label, its colour slot by position, and its samples. */
export type ScopeChannel = {
  /** Unique in the scope; the legend and the hidden list use it. */
  id: string;
  /** What the legend says. */
  label: string;
  unit?: string;
  buf: ScopeSamples;
};

/** An output a monitor can be wired to ("+ tap"): an id the host understands, and what to show. */
export type TapPort = { id: string; label: string; unit?: string };
