import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  PiArrowSquareOut,
  PiArrowUUpLeft,
  PiCheck,
  PiEnvelopeSimple,
  PiMagnifyingGlass,
  PiProhibit,
  PiSealCheck,
  PiStarFill,
  PiTrash,
  PiWarning,
  PiX,
} from "react-icons/pi";
import { apiUrl, fetchWithAuth, safeJson, toastApiError } from "../../config/siteConfig";
import Select from "../../components/ui/Select";
import BarList from "../../components/charts/BarList";
import { Avatar, Empty, Panel, StatTile, StatusPill, timeAgo } from "./adminUi";

const PAGE_SIZE = 20;
const TABS = [
  { id: "pending", label: "To review" },
  { id: "approved", label: "Published" },
  { id: "rejected", label: "Rejected" },
  { id: "spam", label: "Spam" },
];

const Stars = ({ rating }) => (
  <span className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
    {Array.from({ length: 5 }, (_, i) => (
      <PiStarFill
        key={i}
        aria-hidden="true"
        className={`h-3.5 w-3.5 ${i < rating ? "text-saffron-500" : "text-line"}`}
      />
    ))}
  </span>
);

const ReplyBox = ({ review, onSaved, onCancel }) => {
  const [text, setText] = useState(review.adminReply?.text || "");
  const [saving, setSaving] = useState(false);
  const save = async (value) => {
    setSaving(true);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/v1/reviews/${review._id}/reply`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      const json = await safeJson(res);
      if (res.ok && json.success) {
        toast.success(value ? "Reply published" : "Reply removed");
        onSaved(json.data);
      } else toastApiError(json, "Couldn't save the reply");
    } catch (err) {
      toastApiError(err, "Couldn't save the reply");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="mt-4 rounded-2xl bg-raised p-4">
      <label htmlFor={`reply-${review._id}`} className="text-xs font-medium text-muted">
        Public reply — shown under the review on the package page
      </label>
      <textarea
        id={`reply-${review._id}`}
        rows={3}
        maxLength={1000}
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Thank you, ${review.name.split(" ")[0]}! …`}
        className="mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving || !text.trim()}
          onClick={() => save(text.trim())}
          className="btn btn-ink h-9 px-4"
        >
          {saving ? "Saving…" : "Publish reply"}
        </button>
        {review.adminReply?.text && (
          <button
            type="button"
            disabled={saving}
            onClick={() => save("")}
            className="btn btn-ghost h-9 px-4 text-red-600"
          >
            Remove reply
          </button>
        )}
        <button type="button" onClick={onCancel} className="btn btn-ghost h-9 px-4">
          Cancel
        </button>
      </div>
    </div>
  );
};

const ReviewModeration = () => {
  const [tab, setTab] = useState("pending");
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState(null);
  const [packages, setPackages] = useState([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [packageId, setPackageId] = useState("");
  const [rating, setRating] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [replying, setReplying] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const json = await safeJson(await fetchWithAuth(apiUrl("/api/v1/reviews/admin/stats")));
      if (json.success) setStats(json.data);
    } catch {
      // stats are secondary
    }
  }, []);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: tab,
        limit: String(PAGE_SIZE),
        page: String(page),
      });
      if (search) params.set("q", search);
      if (packageId) params.set("packageId", packageId);
      if (rating) params.set("rating", rating);
      const json = await safeJson(await fetchWithAuth(apiUrl(`/api/v1/reviews?${params}`)));
      if (!json.success) throw new Error(json.message);
      setReviews(json.data || []);
      setPagination({
        page: json.pagination?.page || page,
        totalPages: json.pagination?.totalPages || 1,
        total: json.pagination?.total ?? (json.data || []).length,
      });
    } catch (err) {
      toastApiError(err, "Couldn't load reviews");
    } finally {
      setLoading(false);
    }
  }, [tab, page, search, packageId, rating]);

  useEffect(() => {
    loadReviews();
    setSelected(new Set());
  }, [loadReviews]);

  useEffect(() => {
    loadStats();
    fetchWithAuth(apiUrl("/api/v1/packages?limit=100"))
      .then(safeJson)
      .then((json) => json.success && setPackages(json.data || []))
      .catch(() => {});
  }, [loadStats]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(query.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const refresh = () => {
    loadReviews();
    loadStats();
  };

  const act = async (request, success) => {
    try {
      const res = await request();
      const json = await safeJson(res);
      if (res.ok && json.success) {
        toast.success(success);
        refresh();
      } else toastApiError(json, "Action failed");
    } catch (err) {
      toastApiError(err, "Action failed");
    }
  };

  const setStatus = (id, status) =>
    act(
      () =>
        fetchWithAuth(apiUrl(`/api/v1/reviews/${id}/status`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }),
      status === "approved" ? "Review published" : `Marked as ${status}`
    );

  const bulk = (status) =>
    act(
      () =>
        fetchWithAuth(apiUrl("/api/v1/reviews/bulk/status"), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [...selected], status }),
        }),
      `${selected.size} review${selected.size > 1 ? "s" : ""} updated`
    );

  const remove = (review) => {
    if (!window.confirm(`Delete the review by ${review.name}? This can't be undone.`)) return;
    act(
      () => fetchWithAuth(apiUrl(`/api/v1/reviews/${review._id}`), { method: "DELETE" }),
      "Review deleted"
    );
  };

  const toggleVerified = (review) =>
    act(
      () =>
        fetchWithAuth(apiUrl(`/api/v1/reviews/${review._id}/verify`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verified: !review.verified }),
        }),
      review.verified ? "Verified badge removed" : "Marked as verified traveller"
    );

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = reviews.length > 0 && reviews.every((r) => selected.has(r._id));

  const packageOptions = useMemo(
    () => [
      { value: "", label: "All packages" },
      ...packages.map((p) => ({ value: p._id || p.id, label: p.name })),
    ],
    [packages]
  );

  const counts = stats?.counts || {};

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Waiting for moderation"
          value={counts.pending ?? "—"}
          goodWhenUp={false}
          hint="not yet visible on the site"
        />
        <StatTile label="Published reviews" value={counts.approved ?? "—"} />
        <StatTile
          label="Average published rating"
          value={stats ? `${stats.averageRating || "—"}★` : "—"}
        />
        <StatTile
          label="Published without a reply"
          value={stats?.unanswered ?? "—"}
          goodWhenUp={false}
          hint="replying builds trust"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <section className="card overflow-hidden">
          {/* Status tabs */}
          <div
            className="flex gap-1 overflow-x-auto border-b border-line px-3 scrollbar-none"
            role="tablist"
            aria-label="Review status"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => {
                  setTab(t.id);
                  setPage(1);
                }}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3.5 text-sm ${
                  tab === t.id ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg"
                }`}
              >
                {t.label}
                <span className="rounded-full bg-raised px-2 py-0.5 text-xs text-muted">
                  {counts[t.id] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="grid gap-3 border-b border-line p-4 md:grid-cols-[1fr_14rem_10rem]">
            <div className="relative">
              <PiMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email or text"
                aria-label="Search reviews"
                className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-sm text-fg focus:border-accent focus:outline-none"
              />
            </div>
            <Select
              aria-label="Package"
              value={packageId}
              onChange={(v) => {
                setPackageId(v);
                setPage(1);
              }}
              options={packageOptions}
              className="!h-11 !text-sm"
            />
            <Select
              aria-label="Rating"
              value={rating}
              onChange={(v) => {
                setRating(v);
                setPage(1);
              }}
              className="!h-11 !text-sm"
              options={[
                { value: "", label: "Any rating" },
                ...[5, 4, 3, 2, 1].map((n) => ({
                  value: String(n),
                  label: `${n} star${n > 1 ? "s" : ""}`,
                })),
              ]}
            />
          </div>

          {/* Bulk bar */}
          {reviews.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 border-b border-line bg-raised/60 px-4 py-2.5 text-sm">
              <label className="flex items-center gap-2 text-muted">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() =>
                    setSelected(allSelected ? new Set() : new Set(reviews.map((r) => r._id)))
                  }
                  className="h-4 w-4 accent-saffron-500"
                />
                {selected.size ? `${selected.size} selected` : "Select all"}
              </label>
              {selected.size > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tab !== "approved" && (
                    <button
                      type="button"
                      onClick={() => bulk("approved")}
                      className="btn btn-ink h-8 px-3 text-[13px]"
                    >
                      <PiCheck className="h-4 w-4" /> Publish
                    </button>
                  )}
                  {tab !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => bulk("rejected")}
                      className="btn btn-ghost h-8 px-3 text-[13px]"
                    >
                      <PiProhibit className="h-4 w-4" /> Reject
                    </button>
                  )}
                  {tab !== "spam" && (
                    <button
                      type="button"
                      onClick={() => bulk("spam")}
                      className="btn btn-ghost h-8 px-3 text-[13px]"
                    >
                      <PiWarning className="h-4 w-4" /> Spam
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* List */}
          <div
            className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}
            aria-busy={loading}
          >
            {reviews.length === 0 && !loading ? (
              <Empty title={tab === "pending" ? "Nothing to moderate" : "No reviews here"}>
                {search || packageId || rating
                  ? "Try clearing the filters."
                  : tab === "pending"
                    ? "New reviews land here before they go live."
                    : null}
              </Empty>
            ) : (
              <ul className="divide-y divide-line">
                {reviews.map((r) => {
                  const pkg = r.packageId && typeof r.packageId === "object" ? r.packageId : null;
                  return (
                    <li
                      key={r._id}
                      className={`flex gap-3 p-4 md:p-5 ${selected.has(r._id) ? "bg-saffron-500/[0.04]" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(r._id)}
                        onChange={() => toggleSelect(r._id)}
                        aria-label={`Select review by ${r.name}`}
                        className="mt-2.5 h-4 w-4 shrink-0 accent-saffron-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={r.name} />
                            <div>
                              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                                {r.name}
                                {r.verified && (
                                  <span className="inline-flex items-center gap-1 text-xs font-normal text-emerald-700 dark:text-emerald-400">
                                    <PiSealCheck className="h-3.5 w-3.5" /> Verified
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted">
                                <a href={`mailto:${r.email}`} className="hover:text-fg">
                                  {r.email}
                                </a>{" "}
                                · {timeAgo(r.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {r.spamScore > 0 && (
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs ${r.spamScore >= 50 ? "bg-red-500/10 text-red-700 dark:text-red-400" : "bg-raised text-muted"}`}
                                title="Automatic spam score (0–100)"
                              >
                                Spam score {r.spamScore}
                              </span>
                            )}
                            <StatusPill status={r.status} />
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Stars rating={r.rating} />
                          {pkg && (
                            <a
                              href={`/packages/${pkg.slug || pkg._id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
                            >
                              {pkg.name} <PiArrowSquareOut className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        {r.title && <p className="mt-2 text-sm font-medium text-fg">{r.title}</p>}
                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted">
                          {r.comment}
                        </p>

                        {r.adminReply?.text && replying !== r._id && (
                          <div className="mt-3 border-l-2 border-saffron-500/60 pl-3 text-sm">
                            <p className="text-xs text-muted">
                              Your reply · {timeAgo(r.adminReply.repliedAt)}
                            </p>
                            <p className="mt-0.5 text-fg">{r.adminReply.text}</p>
                          </div>
                        )}

                        {replying === r._id ? (
                          <ReplyBox
                            review={r}
                            onCancel={() => setReplying(null)}
                            onSaved={(updated) => {
                              setReplying(null);
                              setReviews((prev) =>
                                prev.map((x) =>
                                  x._id === r._id ? { ...x, adminReply: updated.adminReply } : x
                                )
                              );
                              loadStats();
                            }}
                          />
                        ) : (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {r.status !== "approved" && (
                              <button
                                type="button"
                                onClick={() => setStatus(r._id, "approved")}
                                className="btn btn-ink h-8 px-3 text-[13px]"
                              >
                                <PiCheck className="h-4 w-4" /> Publish
                              </button>
                            )}
                            {r.status === "approved" && (
                              <button
                                type="button"
                                onClick={() => setStatus(r._id, "pending")}
                                className="btn btn-ghost h-8 px-3 text-[13px]"
                              >
                                <PiX className="h-4 w-4" /> Unpublish
                              </button>
                            )}
                            {r.status !== "rejected" && r.status !== "approved" && (
                              <button
                                type="button"
                                onClick={() => setStatus(r._id, "rejected")}
                                className="btn btn-ghost h-8 px-3 text-[13px]"
                              >
                                <PiProhibit className="h-4 w-4" /> Reject
                              </button>
                            )}
                            {r.status !== "spam" && (
                              <button
                                type="button"
                                onClick={() => setStatus(r._id, "spam")}
                                className="btn btn-ghost h-8 px-3 text-[13px]"
                              >
                                <PiWarning className="h-4 w-4" /> Spam
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setReplying(r._id)}
                              className="btn btn-ghost h-8 px-3 text-[13px]"
                            >
                              <PiArrowUUpLeft className="h-4 w-4" />{" "}
                              {r.adminReply?.text ? "Edit reply" : "Reply"}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleVerified(r)}
                              className="btn btn-ghost h-8 px-3 text-[13px]"
                              aria-pressed={!!r.verified}
                            >
                              <PiSealCheck className="h-4 w-4" />{" "}
                              {r.verified ? "Unverify" : "Verify traveller"}
                            </button>
                            <a
                              href={`mailto:${r.email}?subject=${encodeURIComponent("Your review on Satyam Holidays")}`}
                              className="btn btn-ghost h-8 px-3 text-[13px]"
                            >
                              <PiEnvelopeSimple className="h-4 w-4" /> Email
                            </a>
                            <button
                              type="button"
                              onClick={() => remove(r)}
                              className="btn btn-ghost h-8 px-3 text-[13px] text-red-600"
                              aria-label={`Delete review by ${r.name}`}
                            >
                              <PiTrash className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {pagination.totalPages > 1 && (
            <nav
              aria-label="Review pages"
              className="flex items-center justify-between border-t border-line px-4 py-3 text-sm"
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn btn-ghost h-9 px-4"
              >
                Previous
              </button>
              <span className="text-muted">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn btn-ghost h-9 px-4"
              >
                Next
              </button>
            </nav>
          )}
        </section>

        <aside className="space-y-6">
          <Panel title="Published ratings" description="Spread of stars on live reviews">
            <BarList
              max={Math.max(1, ...Object.values(stats?.distribution || { 1: 0 }))}
              rows={[5, 4, 3, 2, 1].map((n) => ({
                key: String(n),
                label: `${n} star${n > 1 ? "s" : ""}`,
                value: stats?.distribution?.[n] || 0,
              }))}
            />
          </Panel>
          <Panel
            title="How moderation works"
            bodyClassName="p-5 text-sm leading-relaxed text-muted"
          >
            <ul className="list-disc space-y-2 pl-4">
              <li>
                New reviews wait here until published. Obvious spam is filtered automatically.
              </li>
              <li>
                Publishing updates the package's star rating and review count from its published
                reviews.
              </li>
              <li>Your replies appear under the review on the package page.</li>
              <li>Use “Verify traveller” only for people who actually booked with you.</li>
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
};

export default ReviewModeration;
