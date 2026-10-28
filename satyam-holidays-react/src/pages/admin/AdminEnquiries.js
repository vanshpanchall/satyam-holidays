import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import {
  PiBellRinging,
  PiCaretRight,
  PiClockCountdown,
  PiDownloadSimple,
  PiFire,
  PiKanban,
  PiMagnifyingGlass,
  PiPlus,
  PiRows,
  PiTray,
  PiWallet,
} from "react-icons/pi";
import siteConfig, {
  apiUrl,
  fetchWithAuth,
  safeJson,
  toastApiError,
} from "../../config/siteConfig";
import Select from "../../components/ui/Select";
import AddLeadModal from "./AddLeadModal";
import EnquiryDrawer from "./EnquiryDrawer";
import PipelineBoard from "./PipelineBoard";
import {
  Avatar,
  Empty,
  OPEN_STAGES,
  PIPELINE,
  SOURCE_LABELS,
  StatTile,
  StatusPill,
  destinationLabel,
  estimatedValue,
  inrCompact,
  isFollowUpDue,
  leadTier,
  pctChange,
  stageLabel,
  timeAgo,
} from "./adminUi";

const DAY_MS = 24 * 60 * 60 * 1000;
const SLA_MS = 2 * 60 * 60 * 1000;
const POLL_MS = 30000;
const VIEW_KEY = "admin.enquiries.view";
const idOf = (e) => e._id || e.id;

const QUICK_FILTERS = [
  {
    id: "hot",
    label: "Hot leads",
    icon: PiFire,
    test: (e) => leadTier(e.leadScore).id === "hot" && OPEN_STAGES.includes(e.status),
  },
  { id: "due", label: "Follow-up due", icon: PiBellRinging, test: isFollowUpDue },
  {
    id: "waiting",
    label: "Waiting > 2h",
    icon: PiClockCountdown,
    test: (e) => e.status === "pending" && Date.now() - new Date(e.createdAt) > SLA_MS,
  },
];

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "score", label: "Lead score" },
  { value: "travel", label: "Travelling soonest" },
  { value: "waiting", label: "Waiting longest" },
];

const sorters = {
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  score: (a, b) => (b.leadScore || 0) - (a.leadScore || 0),
  travel: (a, b) =>
    (a.travelDate ? new Date(a.travelDate) : Infinity) -
    (b.travelDate ? new Date(b.travelDate) : Infinity),
  waiting: (a, b) =>
    Number(OPEN_STAGES.includes(b.status)) - Number(OPEN_STAGES.includes(a.status)) ||
    new Date(a.statusChangedAt || a.createdAt) - new Date(b.statusChangedAt || b.createdAt),
};

const readView = () => {
  try {
    return localStorage.getItem(VIEW_KEY) === "board" ? "board" : "table";
  } catch {
    return "table";
  }
};

/** The list endpoint caps pages at 100, so walk the cursor (bounded) to get every lead */
const fetchAllEnquiries = async () => {
  const all = [];
  let cursor = "";
  for (let page = 0; page < 20; page += 1) {
    const res = await fetchWithAuth(
      apiUrl(`/api/enquiries?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`)
    );
    const json = await safeJson(res);
    if (!res.ok || !json.success) throw new Error(json.message || "Failed to load enquiries");
    all.push(...(json.data || []));
    if (!json.pagination?.hasNextPage || !json.pagination?.nextCursor) break;
    cursor = json.pagination.nextCursor;
  }
  return all;
};

const AdminEnquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [quotes, setQuotes] = useState({ list: [], stats: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState(readView);
  const [stage, setStage] = useState("all");
  const [quick, setQuick] = useState("");
  const [source, setSource] = useState("");
  const [sort, setSort] = useState("newest");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [savingCrm, setSavingCrm] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const loadRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [list, quoteRes] = await Promise.all([
        fetchAllEnquiries(),
        fetchWithAuth(apiUrl("/api/v1/quotes"))
          .then(safeJson)
          .catch(() => null),
      ]);
      setEnquiries(list);
      if (quoteRes?.success) setQuotes({ list: quoteRes.data.quotes, stats: quoteRes.data.stats });
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  loadRef.current = load;

  useEffect(() => {
    load();
    const timer = setInterval(() => loadRef.current?.(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const socket = io(siteConfig.api.baseUrl, { transports: ["websocket", "polling"] });
    socket.on("new-enquiry", (e) => {
      toast.info(`New enquiry from ${e?.name || "a visitor"}`);
      loadRef.current?.();
    });
    socket.on("enquiry-updated", () => loadRef.current?.());
    return () => socket.disconnect();
  }, []);

  // ?id=<enquiry> deep links (dashboard, notifications) open the drawer
  const deepLinkId = searchParams.get("id");
  useEffect(() => {
    if (deepLinkId) setSelectedId(deepLinkId);
  }, [deepLinkId]);
  const selected = enquiries.find((e) => idOf(e) === selectedId) || null;
  useEffect(() => {
    // Deep-linked lead outside the loaded list: fetch it on its own
    if (!selectedId || loading || selected) return;
    fetchWithAuth(apiUrl(`/api/enquiries/${selectedId}`))
      .then(safeJson)
      .then((json) => json.success && json.data && setEnquiries((prev) => [json.data, ...prev]))
      .catch(() => {});
  }, [selectedId, loading, selected]);

  const closeDrawer = useCallback(() => {
    setSelectedId(null);
    if (searchParams.get("id")) {
      searchParams.delete("id");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const changeView = (next) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // ignore
    }
  };

  const replaceEnquiry = (updated) =>
    setEnquiries((prev) => prev.map((e) => (idOf(e) === idOf(updated) ? { ...e, ...updated } : e)));

  const updateStatus = async (id, status) => {
    const before = enquiries.find((e) => idOf(e) === id);
    if (!before || before.status === status) return;
    // Optimistic: the card moves immediately and snaps back if the server refuses
    replaceEnquiry({ ...before, status, statusChangedAt: new Date().toISOString() });
    try {
      const res = await fetchWithAuth(apiUrl(`/api/enquiries/${id}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await safeJson(res);
      if (!res.ok || !json.success) throw json;
      replaceEnquiry(json.data);
      toast.success(`${before.name} → ${stageLabel(status)}`);
    } catch (err) {
      replaceEnquiry(before);
      toastApiError(err, "Couldn't update the stage");
    }
  };

  const saveCrm = async (payload) => {
    if (!selected) return false;
    setSavingCrm(true);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/enquiries/${idOf(selected)}/crm`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await safeJson(res);
      if (!res.ok || !json.success) throw json;
      replaceEnquiry(json.data);
      toast.success(payload.note ? "Note added" : "Follow-up saved");
      return true;
    } catch (err) {
      toastApiError(err, "Couldn't save");
      return false;
    } finally {
      setSavingCrm(false);
    }
  };

  const exportExcel = async () => {
    try {
      const res = await fetchWithAuth(apiUrl("/api/enquiries/export/excel"));
      if (!res.ok)
        throw new Error(res.status === 404 ? "No enquiries to export yet" : "Export failed");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `enquiries_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toastApiError(err, "Export failed");
    }
  };

  /* ── Insights ─────────────────────────────────────────── */
  const insights = useMemo(() => {
    const now = Date.now();
    const age = (e) => now - new Date(e.createdAt);
    const open = enquiries.filter((e) => OPEN_STAGES.includes(e.status));
    const pending = enquiries.filter((e) => e.status === "pending");
    return {
      thisWeek: enquiries.filter((e) => age(e) < 7 * DAY_MS).length,
      lastWeek: enquiries.filter((e) => age(e) >= 7 * DAY_MS && age(e) < 14 * DAY_MS).length,
      pending: pending.length,
      overSla: pending.filter((e) => age(e) > SLA_MS).length,
      due: enquiries.filter(isFollowUpDue).length,
      openCount: open.length,
      openValue: open.reduce((s, e) => s + estimatedValue(e), 0),
    };
  }, [enquiries]);

  const latestQuote = useMemo(() => {
    const map = new Map();
    // list is newest first, so the first quote seen per enquiry is the latest
    quotes.list.forEach((q) => q.enquiry && !map.has(q.enquiry) && map.set(q.enquiry, q));
    return map;
  }, [quotes.list]);

  /* ── Filtering ────────────────────────────────────────── */
  const sources = useMemo(
    () => [...new Set(enquiries.map((e) => e.source || "website"))].sort(),
    [enquiries]
  );
  const stageCounts = useMemo(() => {
    const counts = { all: enquiries.length };
    PIPELINE.forEach((s) => (counts[s.id] = enquiries.filter((e) => e.status === s.id).length));
    return counts;
  }, [enquiries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const quickTest = QUICK_FILTERS.find((f) => f.id === quick)?.test;
    return enquiries
      .filter((e) => view === "board" || stage === "all" || e.status === stage)
      .filter((e) => !source || (e.source || "website") === source)
      .filter((e) => !quickTest || quickTest(e))
      .filter(
        (e) =>
          !q ||
          [e.name, e.email, e.phone, e.destination, destinationLabel(e.destination)]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
      )
      .sort(sorters[sort]);
  }, [enquiries, view, stage, source, quick, query, sort]);

  const filtersActive = quick || source || query || (view === "table" && stage !== "all");

  return (
    <div className="space-y-6">
      {/* Intro + actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted">
            Every lead from the website, phone and WhatsApp in one place.
          </p>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-line p-1" role="group" aria-label="View">
            {[
              ["table", "Table", PiRows],
              ["board", "Board", PiKanban],
            ].map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => changeView(id)}
                className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-sm transition ${
                  view === id ? "bg-fg text-page" : "text-muted hover:text-fg"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowAddLead(true)}
            className="btn btn-accent h-10"
          >
            <PiPlus className="h-4 w-4" /> Add lead
          </button>
          <button type="button" onClick={exportExcel} className="btn btn-ghost h-10">
            <PiDownloadSimple className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile
          label="New this week"
          value={insights.thisWeek}
          delta={pctChange(insights.thisWeek, insights.lastWeek)}
          comparison="vs last week"
          icon={PiTray}
        />
        <StatTile
          label="Awaiting first reply"
          value={insights.pending}
          hint={insights.overSla ? `${insights.overSla} waiting over 2h` : "all within 2h"}
          icon={PiClockCountdown}
        />
        <StatTile
          label="Follow-ups due"
          value={insights.due}
          hint="today or overdue"
          icon={PiBellRinging}
        />
        <StatTile
          label="Open pipeline"
          value={inrCompact(insights.openValue)}
          hint={`${insights.openCount} open · ${quotes.stats?.awaiting || 0} quotes awaiting answer`}
          icon={PiWallet}
        />
      </div>

      {/* Filters */}
      <div className="card space-y-3 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search enquiries</span>
            <PiMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, email or destination"
              className="field h-11 pl-11"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 lg:flex">
            <Select
              variant="pill"
              value={source}
              onChange={setSource}
              aria-label="Source"
              options={[
                { value: "", label: "All sources" },
                ...sources.map((s) => ({ value: s, label: SOURCE_LABELS[s] || s })),
              ]}
              className="w-full lg:w-44"
            />
            <Select
              variant="pill"
              value={sort}
              onChange={setSort}
              aria-label="Sort"
              options={SORTS}
              className="w-full lg:w-48"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {view === "table" &&
            [{ id: "all", label: "All" }, ...PIPELINE].map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={stage === s.id}
                onClick={() => setStage(s.id)}
                className={`chip h-8 px-3 text-[13px] ${stage === s.id ? "chip-active" : ""}`}
              >
                {s.label} <span className="text-xs opacity-60">{stageCounts[s.id]}</span>
              </button>
            ))}
          {view === "table" && (
            <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
          )}
          {QUICK_FILTERS.map(({ id, label, icon: Icon, test }) => {
            const count = enquiries.filter(test).length;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={quick === id}
                onClick={() => setQuick(quick === id ? "" : id)}
                className={`chip h-8 gap-1.5 px-3 text-[13px] ${quick === id ? "chip-active" : ""}`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
                <span className="text-xs opacity-60">{count}</span>
              </button>
            );
          })}
          {filtersActive && (
            <button
              type="button"
              onClick={() => {
                setQuick("");
                setSource("");
                setQuery("");
                setStage("all");
              }}
              className="ml-1 text-sm text-muted underline underline-offset-4 hover:text-fg"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading enquiries">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-16 rounded-2xl" />
          ))}
        </div>
      ) : view === "board" ? (
        <>
          <p className="text-xs text-muted">
            Drag a card to change its stage — press and hold on touch screens, or use space and the
            arrow keys.
            {filtersActive ? ` Showing ${filtered.length} of ${enquiries.length}.` : ""}
          </p>
          <PipelineBoard
            enquiries={filtered}
            quotesByEnquiry={latestQuote}
            onMove={updateStatus}
            onOpen={(e) => setSelectedId(idOf(e))}
          />
        </>
      ) : (
        <section className="card overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_6rem_7rem_6.5rem_1.25rem] gap-4 border-b border-line bg-raised px-5 py-3 text-[11px] uppercase tracking-[0.14em] text-muted md:grid">
            <span>Customer</span>
            <span>Trip</span>
            <span>Lead</span>
            <span>Stage</span>
            <span>Received</span>
            <span />
          </div>
          {filtered.length ? (
            <ul className="divide-y divide-line">
              {filtered.map((e) => {
                const tier = leadTier(e.leadScore);
                const quote = latestQuote.get(idOf(e));
                return (
                  <li key={idOf(e)}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(idOf(e))}
                      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-left transition hover:bg-raised md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_6rem_7rem_6.5rem_1.25rem] md:gap-4 md:px-5"
                    >
                      <span className="flex min-w-0 items-center gap-3 md:col-auto">
                        <Avatar name={e.name} />
                        <span className="hidden min-w-0 md:block">
                          <span className="block truncate text-sm font-medium text-fg">
                            {e.name}
                          </span>
                          <span className="block truncate text-xs text-muted">{e.phone}</span>
                        </span>
                      </span>
                      {/* Phones: one stacked summary column */}
                      <span className="min-w-0 md:hidden">
                        <span className="block truncate text-sm font-medium text-fg">{e.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {destinationLabel(e.destination)} · {timeAgo(e.createdAt)}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <StatusPill status={e.status} label={stageLabel(e.status)} />
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tier.className}`}
                          >
                            {tier.label}
                          </span>
                          {isFollowUpDue(e) && (
                            <span className="text-[11px] font-medium text-red-600 dark:text-red-400">
                              Follow-up due
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="hidden min-w-0 md:block">
                        <span className="block truncate text-sm text-fg">
                          {destinationLabel(e.destination)}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {e.travelDate
                            ? new Date(e.travelDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "Dates flexible"}
                          {quote ? ` · quote ${inrCompact(quote.totals?.total)}` : ""}
                        </span>
                      </span>
                      <span className="hidden md:block">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tier.className}`}
                        >
                          {tier.label}
                        </span>
                      </span>
                      <span className="hidden md:block">
                        <StatusPill status={e.status} label={stageLabel(e.status)} />
                        {isFollowUpDue(e) && (
                          <span className="mt-1 block text-[11px] font-medium text-red-600 dark:text-red-400">
                            Follow-up due
                          </span>
                        )}
                      </span>
                      <span className="hidden text-xs text-muted md:block">
                        {timeAgo(e.createdAt)}
                      </span>
                      <PiCaretRight className="h-4 w-4 text-muted" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty title={enquiries.length ? "No enquiries match" : "No enquiries yet"}>
              {enquiries.length
                ? "Try clearing a filter."
                : "They'll appear here the moment someone submits a form or you add a lead."}
            </Empty>
          )}
        </section>
      )}

      {selected && (
        <EnquiryDrawer
          enquiry={selected}
          onClose={closeDrawer}
          onStatus={updateStatus}
          onCrm={saveCrm}
          saving={savingCrm}
        />
      )}
      {showAddLead && (
        <AddLeadModal
          onClose={() => setShowAddLead(false)}
          onCreated={(lead) => setEnquiries((prev) => [lead, ...prev])}
        />
      )}
    </div>
  );
};

export default AdminEnquiries;
