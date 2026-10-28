import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  PiArrowSquareOut,
  PiArrowsClockwise,
  PiCheckCircle,
  PiInstagramLogo,
  PiLinkBreak,
  PiProhibit,
  PiSparkle,
  PiTray,
  PiWarningCircle,
  PiXCircle,
} from "react-icons/pi";
import { apiUrl, fetchWithAuth, safeJson, toastApiError } from "../../config/siteConfig";
import Select from "../../components/ui/Select";
import { Empty, Panel, StatTile, StatusPill, timeAgo } from "./adminUi";

const STATUS = {
  pending: { label: "Waiting", pill: "pending" },
  processing: { label: "Reading…", pill: "contacted" },
  imported: { label: "Draft created", pill: "accepted" },
  not_package: { label: "Not a package", pill: "draft" },
  skipped: { label: "Skipped", pill: "draft" },
  failed: { label: "Failed", pill: "declined" },
};

const FILTERS = [
  ["all", "All"],
  ["imported", "Drafts"],
  ["pending", "Waiting"],
  ["not_package", "Not packages"],
  ["failed", "Failed"],
  ["skipped", "Skipped"],
];

const api = async (path, options) => {
  const res = await fetchWithAuth(apiUrl(`/api/v1/instagram${path}`), {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await safeJson(res);
  if (!res.ok || !json.success) throw json;
  return json.data;
};

const ConnectPanel = ({ onConnected }) => {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const connect = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const account = await api("/connect", {
        method: "POST",
        body: JSON.stringify({ accessToken: token }),
      });
      toast.success(`Connected @${account.username}`);
      setToken("");
      onConnected();
    } catch (err) {
      toastApiError(err, "Couldn't connect");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="Connect your Instagram account"
      description="One-time setup. Posts are read through Instagram's official API — nothing is posted or changed on Instagram."
    >
      <ol className="mb-5 space-y-2 text-sm text-muted">
        {[
          "Open developers.facebook.com → My Apps → Create app → choose “Other” → “Business”.",
          "Add the “Instagram” product and pick “API setup with Instagram login”.",
          "Under “Generate access tokens”, add the satyamholidays account and click Generate token.",
          "Copy the token and paste it below.",
        ].map((step, i) => (
          <li key={step} className="grid grid-cols-[1.5rem_1fr] gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised text-xs font-medium text-fg">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <form onSubmit={connect} className="space-y-3">
        <label className="block">
          <span className="label">Access token</span>
          <textarea
            rows={3}
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="IGAA…"
            spellCheck={false}
            autoComplete="off"
            className="field resize-none font-mono text-xs"
          />
          <span className="mt-1.5 block text-xs text-muted">
            Stored privately on the server and renewed automatically. A Facebook-login token (from
            the Graph API Explorer) also works.
          </span>
        </label>
        <button
          type="submit"
          disabled={busy || token.trim().length < 20}
          className="btn btn-accent"
        >
          <PiInstagramLogo className="h-4 w-4" /> {busy ? "Checking…" : "Connect"}
        </button>
      </form>
    </Panel>
  );
};

const AdminInstagram = () => {
  const [status, setStatus] = useState(null);
  const [imports, setImports] = useState([]);
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState("25");
  const [run, setRun] = useState(null); // { done, total, current }
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, list] = await Promise.all([api("/status"), api("/imports")]);
      setStatus(s);
      setImports(list);
    } catch (err) {
      toastApiError(err, "Couldn't load Instagram");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const processOne = async (item) => {
    const updated = await api(`/imports/${item._id}/process`, { method: "POST" });
    setImports((prev) =>
      prev.map((x) => (x._id === item._id ? { ...x, ...updated, package: x.package } : x))
    );
    return updated;
  };

  /** Sync, then read every waiting post one at a time (each is one short request) */
  const syncAndImport = async () => {
    setRun({ done: 0, total: 0, current: "Checking Instagram for new posts…" });
    try {
      const result = await api("/sync", {
        method: "POST",
        body: JSON.stringify({ limit: Number(limit) }),
      });
      const list = await api("/imports");
      setImports(list);
      const queue = list.filter((i) => i.status === "pending");
      if (!queue.length) {
        toast.info(result.added ? "New posts added" : `No new posts in the last ${result.checked}`);
        return;
      }
      let created = 0;
      for (let n = 0; n < queue.length; n += 1) {
        setRun({
          done: n,
          total: queue.length,
          current: queue[n].caption?.split("\n")[0] || "Reading post…",
        });
        try {
          const r = await processOne(queue[n]);
          if (r.status === "imported") created += 1;
        } catch (err) {
          toastApiError(err, "A post couldn't be read");
        }
      }
      toast.success(
        created
          ? `${created} draft package${created > 1 ? "s" : ""} created — review and publish them`
          : "Done — no new packages found in these posts"
      );
    } catch (err) {
      toastApiError(err, "Sync failed");
    } finally {
      setRun(null);
      load();
    }
  };

  const importOne = async (item) => {
    setBusyId(item._id);
    try {
      const r = await processOne(item);
      if (r.status === "imported") toast.success("Draft package created");
      else if (r.status === "not_package") toast.info("This post doesn't look like a package");
      else toast.error(r.error || "Couldn't import this post");
      load();
    } catch (err) {
      toastApiError(err, "Couldn't import this post");
    } finally {
      setBusyId(null);
    }
  };

  const skip = async (item) => {
    setBusyId(item._id);
    try {
      const updated = await api(`/imports/${item._id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "skipped" }),
      });
      setImports((prev) =>
        prev.map((x) => (x._id === item._id ? { ...x, status: updated.status } : x))
      );
    } catch (err) {
      toastApiError(err, "Couldn't skip");
    } finally {
      setBusyId(null);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Disconnect Instagram? Already-created packages stay as they are.")) return;
    try {
      await api("/connect", { method: "DELETE" });
      toast.success("Disconnected");
      load();
    } catch (err) {
      toastApiError(err, "Couldn't disconnect");
    }
  };

  const counts = useMemo(() => {
    const c = { all: imports.length };
    imports.forEach((i) => (c[i.status] = (c[i.status] || 0) + 1));
    return c;
  }, [imports]);
  const drafts = imports.filter(
    (i) => i.status === "imported" && i.package && i.package.isActive === false
  ).length;
  const visible = imports.filter((i) => filter === "all" || i.status === filter);

  if (!status) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading">
        <div className="skeleton h-28 rounded-3xl" />
        <div className="skeleton h-72 rounded-3xl" />
      </div>
    );
  }

  const account = status.account;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Turn the packages your team already posts on Instagram into draft trips on the website.
        Every import is a draft — check the price and dates, then publish.
      </p>

      {!status.connected ? (
        <ConnectPanel onConnected={load} />
      ) : (
        <>
          <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {account.picture ? (
                <img
                  src={account.picture}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white">
                  <PiInstagramLogo className="h-6 w-6" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-medium text-fg">@{account.username}</p>
                <p className="truncate text-xs text-muted">
                  {account.accountType ? `${account.accountType.toLowerCase()} account · ` : ""}
                  {account.lastSyncAt
                    ? `last synced ${timeAgo(account.lastSyncAt)}`
                    : "not synced yet"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                variant="pill"
                value={limit}
                onChange={setLimit}
                aria-label="How many recent posts to check"
                options={[
                  { value: "10", label: "Last 10 posts" },
                  { value: "25", label: "Last 25 posts" },
                  { value: "50", label: "Last 50 posts" },
                  { value: "100", label: "Last 100 posts" },
                ]}
              />
              <button
                type="button"
                onClick={syncAndImport}
                disabled={!!run}
                className="btn btn-accent h-10"
              >
                <PiArrowsClockwise className={`h-4 w-4 ${run ? "animate-spin" : ""}`} />{" "}
                {run ? "Working…" : "Sync & import"}
              </button>
              {!account.fromEnv && (
                <button
                  type="button"
                  onClick={disconnect}
                  className="icon-btn h-10 w-10"
                  aria-label="Disconnect Instagram"
                  title="Disconnect"
                >
                  <PiLinkBreak className="h-4 w-4" />
                </button>
              )}
            </div>
          </section>

          {(!status.ai || !status.imageHosting) && (
            <div className="flex items-start gap-3 rounded-2xl border border-saffron-500/30 bg-saffron-500/5 p-4 text-sm text-fg">
              <PiWarningCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
              <div className="space-y-1">
                {!status.ai && (
                  <p>
                    <strong>Flyer reading is off.</strong> Add{" "}
                    <code className="rounded bg-raised px-1">GEMINI_API_KEY</code> on the server so
                    Gujarati/English flyers are read; until then only the caption is used.
                  </p>
                )}
                {!status.imageHosting && (
                  <p>
                    <strong>Image hosting is off.</strong> Cloudinary keys are missing, so photos
                    won't be copied — add them or upload photos to each draft by hand.
                  </p>
                )}
              </div>
            </div>
          )}

          {run && (
            <div className="card p-5" role="status" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="flex min-w-0 items-center gap-2 text-fg">
                  <PiSparkle className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span className="truncate">{run.current}</span>
                </p>
                {run.total > 0 && (
                  <span className="shrink-0 tabular-nums text-muted">
                    {run.done} / {run.total}
                  </span>
                )}
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-saffron-500 transition-all"
                  style={{ width: run.total ? `${(run.done / run.total) * 100}%` : "8%" }}
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                Keep this page open — each post takes a few seconds to read.
              </p>
            </div>
          )}
        </>
      )}

      {imports.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatTile
              label="Drafts to review"
              value={drafts}
              hint="created, not yet published"
              icon={PiTray}
            />
            <StatTile label="Imported in total" value={counts.imported || 0} icon={PiCheckCircle} />
            <StatTile
              label="Not packages"
              value={(counts.not_package || 0) + (counts.skipped || 0)}
              hint="greetings, notices, skipped"
              icon={PiProhibit}
            />
            <StatTile
              label="Need attention"
              value={(counts.failed || 0) + (counts.pending || 0)}
              hint="failed or waiting"
              icon={PiXCircle}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
                className={`chip h-8 px-3 text-[13px] ${filter === id ? "chip-active" : ""}`}
              >
                {label} <span className="text-xs opacity-60">{counts[id] || 0}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {status.connected &&
        (visible.length ? (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((item) => {
              const s = STATUS[item.status] || STATUS.pending;
              const thumb = item.package?.image || item.thumbnailUrl;
              const busy = busyId === item._id || item.status === "processing";
              return (
                <li key={item._id} className="card flex flex-col overflow-hidden">
                  <div className="flex gap-3 p-4">
                    <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-raised">
                      {thumb && (
                        <img
                          src={thumb}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <StatusPill status={s.pill} label={s.label} />
                        <span className="shrink-0 text-xs text-muted">
                          {item.postedAt ? timeAgo(item.postedAt) : ""}
                        </span>
                      </div>
                      {item.package ? (
                        <p className="mt-2 line-clamp-1 font-medium text-fg">{item.package.name}</p>
                      ) : null}
                      <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-muted">
                        {item.caption || "(no caption)"}
                      </p>
                    </div>
                  </div>
                  {(item.notes || item.error) && (
                    <p
                      className={`mx-4 mb-3 rounded-xl px-3 py-2 text-xs ${
                        item.error
                          ? "bg-red-500/10 text-red-700 dark:text-red-300"
                          : "bg-raised text-muted"
                      }`}
                    >
                      {item.error || item.notes}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
                    {item.status === "imported" && item.package ? (
                      <Link
                        to={`/admin/packages?edit=${item.package._id}`}
                        className="btn btn-ink h-9 px-3 text-sm"
                      >
                        Review draft
                      </Link>
                    ) : (
                      ["pending", "failed", "not_package", "skipped"].includes(item.status) && (
                        <button
                          type="button"
                          onClick={() => importOne(item)}
                          disabled={busy || !!run}
                          className="btn btn-ink h-9 px-3 text-sm"
                        >
                          {busy
                            ? "Reading…"
                            : item.status === "pending"
                              ? "Import"
                              : item.status === "failed"
                                ? "Try again"
                                : "Import anyway"}
                        </button>
                      )
                    )}
                    {["pending", "failed"].includes(item.status) && (
                      <button
                        type="button"
                        onClick={() => skip(item)}
                        disabled={busy}
                        className="btn btn-ghost h-9 px-3 text-sm"
                      >
                        Skip
                      </button>
                    )}
                    {item.permalink && (
                      <a
                        href={item.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
                      >
                        Instagram <PiArrowSquareOut className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="card">
            <Empty title={imports.length ? "Nothing here" : "No posts imported yet"}>
              {imports.length
                ? "Try another filter."
                : "Press “Sync & import” to read your latest posts."}
            </Empty>
          </div>
        ))}
    </div>
  );
};

export default AdminInstagram;
