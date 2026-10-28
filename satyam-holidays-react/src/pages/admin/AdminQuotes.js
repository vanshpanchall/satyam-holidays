import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  PiCaretRight,
  PiCheckCircle,
  PiEye,
  PiHourglassMedium,
  PiMagnifyingGlass,
  PiPercent,
  PiPlus,
} from "react-icons/pi";
import { apiUrl, fetchWithAuth, safeJson } from "../../config/siteConfig";
import { Empty, StatTile, StatusPill, inrCompact, timeAgo } from "./adminUi";
import { QUOTE_STATUS_LABELS, quoteStatus } from "./quoteUtils";

const FILTERS = ["all", "draft", "sent", "expired", "accepted", "declined"];

const AdminQuotes = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchWithAuth(apiUrl("/api/v1/quotes"))
      .then(safeJson)
      .then((json) => {
        if (!json.success) throw new Error(json.message || "Couldn't load quotes");
        setData(json.data);
      })
      .catch((err) => setError(err.message));
  }, []);

  const quotes = useMemo(() => data?.quotes || [], [data]);
  const counts = useMemo(() => {
    const c = { all: quotes.length };
    quotes.forEach((q) => {
      const s = quoteStatus(q);
      c[s] = (c[s] || 0) + 1;
    });
    return c;
  }, [quotes]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quotes
      .filter((x) => filter === "all" || quoteStatus(x) === filter)
      .filter(
        (x) =>
          !q ||
          [x.number, x.title, x.customer?.name, x.customer?.phone, x.destination]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
      );
  }, [quotes, filter, query]);

  const stats = data?.stats;
  const awaitingValue = quotes
    .filter((q) => quoteStatus(q) === "sent")
    .reduce((s, q) => s + (q.totals?.total || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <p className="text-sm text-muted">
          Build itemised quotes, send them as a branded link or PDF, and see when customers open
          them.
        </p>
        <Link to="/admin/quotes/new" className="btn btn-accent h-10 w-fit">
          <PiPlus className="h-4 w-4" /> New quote
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile
          label="Awaiting an answer"
          value={stats ? stats.awaiting : "—"}
          hint={stats ? `${inrCompact(awaitingValue)} on the table` : undefined}
          icon={PiHourglassMedium}
        />
        <StatTile
          label="Opened, not answered"
          value={stats ? stats.viewedNotAnswered : "—"}
          hint="worth a follow-up call"
          icon={PiEye}
        />
        <StatTile
          label="Accepted value"
          value={stats ? inrCompact(stats.acceptedValue) : "—"}
          hint={stats ? `${inrCompact(stats.acceptedProfit)} margin` : undefined}
          icon={PiCheckCircle}
        />
        <StatTile
          label="Acceptance rate"
          value={stats?.acceptanceRate != null ? `${stats.acceptanceRate}%` : "—"}
          hint="of answered quotes"
          icon={PiPercent}
        />
      </div>

      <div className="card space-y-3 p-3 sm:p-4">
        <label className="relative block">
          <span className="sr-only">Search quotes</span>
          <PiMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search number, customer or trip"
            className="field h-11 pl-11"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`chip h-8 px-3 text-[13px] ${filter === f ? "chip-active" : ""}`}
            >
              {f === "all" ? "All" : QUOTE_STATUS_LABELS[f]}
              <span className="text-xs opacity-60">{counts[f] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="card overflow-hidden">
        {!data && !error ? (
          <div className="space-y-2 p-4" role="status" aria-label="Loading quotes">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-14 rounded-2xl" />
            ))}
          </div>
        ) : visible.length ? (
          <ul className="divide-y divide-line">
            {visible.map((q) => {
              const status = quoteStatus(q);
              return (
                <li key={q._id}>
                  <Link
                    to={`/admin/quotes/${q._id}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 transition hover:bg-raised md:grid-cols-[8rem_minmax(0,1.4fr)_minmax(0,1fr)_7rem_6rem_1.25rem] md:gap-4 md:px-5"
                  >
                    <span className="hidden text-xs tabular-nums text-muted md:block">
                      {q.number}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-fg">{q.title}</span>
                      <span className="block truncate text-xs text-muted">
                        {q.customer?.name}
                        <span className="md:hidden"> · {q.number}</span>
                      </span>
                    </span>
                    <span className="hidden min-w-0 text-xs text-muted md:block">
                      {q.viewCount > 0 ? (
                        <span className="flex items-center gap-1">
                          <PiEye className="h-3.5 w-3.5" aria-hidden="true" /> Opened {q.viewCount}×
                          · last {timeAgo(q.lastViewedAt)}
                        </span>
                      ) : status === "draft" ? (
                        `Edited ${timeAgo(q.updatedAt)}`
                      ) : (
                        `Sent ${timeAgo(q.sentAt)} · not opened yet`
                      )}
                    </span>
                    <span className="text-right md:text-left">
                      <span className="block text-sm font-medium tabular-nums text-fg">
                        {inrCompact(q.totals?.total)}
                      </span>
                      <span className="md:hidden">
                        <StatusPill status={status} label={QUOTE_STATUS_LABELS[status]} />
                      </span>
                    </span>
                    <span className="hidden md:block">
                      <StatusPill status={status} label={QUOTE_STATUS_LABELS[status]} />
                    </span>
                    <PiCaretRight
                      className="hidden h-4 w-4 text-muted md:block"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty title={quotes.length ? "No quotes match" : "No quotes yet"}>
            {quotes.length
              ? "Try another filter."
              : "Start one here, or from an enquiry so the customer's details are filled in for you."}
          </Empty>
        )}
      </section>
    </div>
  );
};

export default AdminQuotes;
