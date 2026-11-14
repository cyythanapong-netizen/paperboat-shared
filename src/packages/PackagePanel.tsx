// The package manager panel (first Squero MX's "julia up", now every app's): the runtime and its
// channels, the environment's installed packages, and a registry to search and add from.
// Squero MX shows Julia (juliaup, the workspace project, General), Paperboat its toolkits,
// Squero Studio OM the Modelica libraries. The app owns loading and the actions; this owns layout,
// the environment/registry switch, search and the detail card.
import { useEffect, useState } from "react";
import { GlideBrackets } from "../Shell.tsx";

export type RuntimeChannel = { name: string; version: string; /** A newer version, if any. */ update?: string; current?: boolean };
/** A key the app adds to a section's head or foot (Restart backend, Update index). */
export type PackageAction = { label: string; run: () => void; title?: string; disabled?: boolean };

export type PackageRuntime = {
  /** "julia up", "paperboat", "openmodelica". */
  title: string;
  /** "juliaup 1.17.4", "0.1.0-alpha.3". */
  tag?: string;
  channels?: RuntimeChannel[];
  /** Under the channels when there are none (how to install the runtime manager, say). */
  hint?: string;
  update?: PackageAction;
};

export type InstalledPackage = {
  name: string;
  version?: string;
  /** In words, beside the version: "installing…", "required". */
  status?: string;
  /** Why it can't be removed; absent: it can. */
  keep?: string;
};

export type PackageEnvironment = {
  /** "environment", "toolkits", "libraries". */
  title: string;
  tag?: string;
  path?: string;
  tags?: string[];
  packages: InstalledPackage[];
  /** "No packages in this project yet." */
  empty?: string;
  /** Keys in the foot (Update packages, Restart backend). */
  actions?: PackageAction[];
  remove?: (name: string) => void;
};

export type RegistryItem = {
  name: string;
  latest?: string;
  /** A second line under the name (a path, a short description). */
  note?: string;
  description?: string;
  repo?: string;
  versions?: string[];
};
export type RegistryDetail = RegistryItem & { facts?: string[]; id?: string };

export type PackageRegistry = {
  /** "General", "toolkits.toml", "OpenModelica index". */
  title: string;
  source?: string;
  /** What shows before a search: the popular shelf, or the whole catalog when it is small. */
  items: RegistryItem[];
  itemsLabel?: string;
  /** A server-side search for a big registry; absent: `items` are filtered here. */
  search?: (query: string) => Promise<{ results: RegistryItem[]; total: number }>;
  /** More about one package; absent: the card shows what `items` has. */
  detail?: (name: string) => Promise<RegistryDetail>;
  /** Add (install) a package, at a version when the card offers a choice. */
  add: (name: string, version?: string) => void;
  /** Versions pick from the card's list (Paperboat's tags); else they are shown only. */
  pickVersion?: boolean;
  loading?: string;
  error?: string;
  retry?: () => void;
};

export type PackagePanelProps = {
  runtime: PackageRuntime | null;
  environment: PackageEnvironment | null;
  registry: PackageRegistry;
  /** One operation at a time: what is running, in words ("adding Plots"); "" when idle. */
  busy: string;
  error?: string;
  /** The last command's output tail. */
  output?: string;
  /** Read once while nothing is known yet. */
  loading?: string;
  /** The words for one package, for hints ("package", "toolkit", "library"). */
  noun?: string;
};

type View = "environment" | "registry";

const Remove = ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) => (
  <button className="pk-rm" type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick}>
    <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M4 4l6 6M10 4l-6 6" /></svg>
  </button>
);

const repoLabel = (repo: string) => repo.replace(/^https?:\/\/(www\.)?github\.com\//, "").replace(/\.git$/, "");

export function PackagePanel({ runtime, environment, registry, busy, error, output, loading, noun = "package" }: PackagePanelProps) {
  const [view, setView] = useState<View>("environment");
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ results: RegistryItem[]; total: number } | null>(null);
  const [searching, setSearching] = useState("");
  const [searchError, setSearchError] = useState("");
  const [detail, setDetail] = useState<RegistryDetail | null>(null);
  const [version, setVersion] = useState("");
  const installed = new Set((environment?.packages ?? []).map((p) => p.name));
  const text = query.trim();
  const local = !registry.search;

  // A big registry is searched by the app (debounced); a small one is filtered here.
  useEffect(() => {
    if (local || view !== "registry" || text.length < 2) {
      setFound(null);
      setSearchError("");
      return;
    }
    let live = true;
    const timer = setTimeout(() => {
      setSearching(`searching ${registry.title}`);
      setSearchError("");
      registry.search!(text)
        .then((r) => live && setFound(r))
        .catch((e) => live && setSearchError(String((e as Error).message ?? e)))
        .finally(() => live && setSearching(""));
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [text, view, local, registry.search, registry.title]);

  const filtered = local && text ? registry.items.filter((i) => `${i.name} ${i.description ?? ""} ${i.note ?? ""}`.toLowerCase().includes(text.toLowerCase())) : null;
  const shown = filtered ?? found?.results ?? registry.items;
  const count = filtered ? filtered.length : found ? found.total : undefined;

  const open = (item: RegistryItem) => {
    setVersion(item.versions?.[0] ?? item.latest ?? "");
    if (!registry.detail) return setDetail(item);
    setDetail(null);
    setSearching(`reading ${item.name}`);
    registry
      .detail(item.name)
      .then((d) => {
        setDetail(d);
        setVersion(d.versions?.[0] ?? d.latest ?? "");
      })
      .catch((e) => setSearchError(String((e as Error).message ?? e)))
      .finally(() => setSearching(""));
  };

  const Busy = ({ what }: { what: string }) => <div className="pk-busy">{what}…</div>;

  return (
    <div className="pk">
      {runtime && (
        <>
          <div className="pk-head">
            <div className="pk-title">
              <b>{runtime.title}</b>
              {runtime.tag && <span className="tag">{runtime.tag}</span>}
            </div>
            {runtime.update && (
              <button className="key small" onClick={runtime.update.run} disabled={Boolean(busy) || runtime.update.disabled} title={runtime.update.title}>
                {runtime.update.label}
              </button>
            )}
          </div>
          {runtime.channels && runtime.channels.length > 0 ? (
            <div className="pk-chans">
              {runtime.channels.map((c) => (
                <div className={`pk-ch${c.current ? " on" : ""}`} key={c.name}>
                  <span className="nm">{c.current ? `[ ${c.name} ]` : c.name}</span>
                  <span className="ver">{c.version}</span>
                  <span className={`upd${c.update ? " has" : ""}`}>{c.update ? `→ ${c.update}` : "current"}</span>
                </div>
              ))}
            </div>
          ) : (
            runtime.hint && <p className="hint">{runtime.hint}</p>
          )}
          <div className="rule" />
        </>
      )}

      <div className="pk-subtabs" role="tablist" aria-label="Packages view">
        <GlideBrackets />
        <button type="button" role="tab" aria-selected={view === "environment"} className={`opt${view === "environment" ? " on" : ""}`} onClick={() => setView("environment")}>
          {environment?.title ?? "environment"}
        </button>
        <button type="button" role="tab" aria-selected={view === "registry"} className={`opt${view === "registry" ? " on" : ""}`} onClick={() => setView("registry")}>
          registry
        </button>
      </div>

      {view === "environment" ? (
        !environment ? (
          <div className="pk-loading">{loading ? `${loading}…` : "Nothing reported yet."}</div>
        ) : (
          <>
            {(environment.tag || environment.path) && (
              <div className="pk-head">
                <div className="pk-title">
                  <b>{environment.title}</b>
                  {environment.tag && <span className="tag">{environment.tag}</span>}
                </div>
              </div>
            )}
            {environment.path && <div className="pk-path" title={environment.path}>{environment.path}</div>}
            {environment.tags && environment.tags.length > 0 && (
              <div className="pk-tags">
                {environment.tags.map((t) => (
                  <span className="tag" key={t}>{t}</span>
                ))}
              </div>
            )}
            <div className="pk-list">
              {environment.packages.map((p) => (
                <div className="pk-pkg" key={p.name}>
                  <span className="nm">{p.name}</span>
                  <span className="ver">{p.status ?? p.version ?? "—"}</span>
                  {environment.remove ? (
                    <Remove label={p.keep ?? `Remove ${p.name}`} disabled={Boolean(busy) || Boolean(p.keep)} onClick={() => environment.remove!(p.name)} />
                  ) : (
                    <span />
                  )}
                </div>
              ))}
              {environment.packages.length === 0 && <p className="hint">{environment.empty ?? `No ${noun}s yet. Add one from the registry.`}</p>}
            </div>
            <div className="pk-foot">
              <button className="key small" type="button" onClick={() => setView("registry")}>
                Browse registry
              </button>
              <span className="sp" />
              {environment.actions?.map((a) => (
                <button key={a.label} className="key small" onClick={a.run} disabled={Boolean(busy) || a.disabled} title={a.title}>
                  {a.label}
                </button>
              ))}
              <span className="tag">{environment.packages.length} installed</span>
            </div>
          </>
        )
      ) : (
        <>
          <form className="pk-find" onSubmit={(e) => e.preventDefault()}>
            <span className="prompt" aria-hidden>find</span>
            <input value={query} onChange={(e) => (setQuery(e.target.value), setDetail(null))} placeholder={`search ${registry.title}`} aria-label={`Search ${registry.title}`} spellCheck={false} />
          </form>
          <div className="pk-tags">
            <span className="tag">{registry.title}{registry.source ? ` · ${registry.source}` : ""}</span>
            <span className="tag">{count !== undefined ? `${count} match${count === 1 ? "" : "es"}` : registry.itemsLabel ?? `${registry.items.length}`}</span>
          </div>
          {detail ? (
            <div className="pk-card">
              <div className="pk-card-head">
                <b>{detail.name}</b>
                <span className="tag">{detail.latest || "—"}</span>
                <Remove label="Close" onClick={() => setDetail(null)} />
              </div>
              <p className="pk-desc">{detail.description || "No description."}</p>
              {detail.facts && detail.facts.length > 0 && (
                <div className="pk-facts">
                  {detail.facts.map((f) => (
                    <span key={f}>{f}</span>
                  ))}
                </div>
              )}
              {detail.versions && detail.versions.length > 0 && !registry.pickVersion && (
                <div className="pk-versions">
                  {detail.versions.map((v) => (
                    <span className="tag" key={v}>{v}</span>
                  ))}
                </div>
              )}
              {detail.repo && (
                <a className="pk-repo" href={detail.repo.replace(/\.git$/, "")} target="_blank" rel="noreferrer">
                  {repoLabel(detail.repo)}
                </a>
              )}
              <div className="pk-actions">
                {registry.pickVersion && detail.versions && detail.versions.length > 0 && (
                  <select className="well" value={version} onChange={(e) => setVersion(e.target.value)} aria-label="Version">
                    {detail.versions.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                )}
                {installed.has(detail.name) && (!registry.pickVersion || version === environment?.packages.find((p) => p.name === detail.name)?.version) ? (
                  <span className="tag pk-installed">installed</span>
                ) : (
                  <button className="key small" type="button" disabled={Boolean(busy)} onClick={() => registry.add(detail.name, registry.pickVersion ? version : undefined)}>
                    {installed.has(detail.name) ? `Switch to ${version}` : `Add ${detail.name}`}
                  </button>
                )}
                <span className="sp" />
                {detail.id && <span className="tag">{detail.id}</span>}
              </div>
            </div>
          ) : (
            <div className="pk-results">
              {shown.map((item) => (
                <div className="pk-row" key={item.name}>
                  <button className="pk-name" type="button" onClick={() => open(item)}>
                    <span className="nm">{item.name}</span>
                    {(item.note ?? item.description) && <span className="note">{item.note ?? item.description}</span>}
                  </button>
                  <span className="tag pk-latest">{item.latest ?? ""}</span>
                  {installed.has(item.name) ? (
                    <span className="tag pk-installed">added</span>
                  ) : (
                    <button className="key small" type="button" disabled={Boolean(busy)} onClick={() => (registry.pickVersion ? open(item) : registry.add(item.name))}>
                      Add
                    </button>
                  )}
                </div>
              ))}
              {!searching && !registry.loading && shown.length === 0 && !searchError && !registry.error && (
                <p className="hint">{text ? `No ${noun} matches “${text}”.` : `The registry lists no ${noun}s.`}</p>
              )}
            </div>
          )}
          {(searching || registry.loading) && <Busy what={searching || registry.loading!} />}
          {(searchError || registry.error) && (
            <div className="pk-error">
              {searchError || registry.error}
              {registry.retry && !searchError && (
                <button type="button" className="plain tag" onClick={registry.retry}>
                  retry
                </button>
              )}
            </div>
          )}
        </>
      )}

      {busy && <Busy what={busy} />}
      {error && <div className="pk-error">{error}</div>}
      {output && <pre className="pk-log" aria-label="Last command output">{output.slice(-2400)}</pre>}
    </div>
  );
}
