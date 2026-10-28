import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import {
  PiArrowRight,
  PiBellRinging,
  PiChartLineUp,
  PiDownloadSimple,
  PiPlus,
  PiStarFill,
  PiSuitcaseRolling,
  PiTray,
  PiWarningCircle,
} from "react-icons/pi";
import siteConfig, {
  apiUrl,
  fetchWithAuth,
  safeJson,
  toastApiError,
} from "../../config/siteConfig";
import ColumnChart from "../../components/charts/ColumnChart";
import BarList from "../../components/charts/BarList";
import AddLeadModal from "./AddLeadModal";
import {
  Avatar,
  Empty,
  Panel,
  StatTile,
  StatusPill,
  stageLabel,
  destinationLabel,
  inrCompact,
  pctChange,
  timeAgo,
  toChartRows,
} from "./adminUi";

const POLL_MS = 60000;
const SERIES = [{ key: "received", label: "Enquiries", color: "series-1" }];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const HEALTH_LABELS = { ok: "Online", off: "Offline", na: "Not configured", wait: "Checking…" };
const HEALTH_DOT = { ok: "bg-emerald-500", off: "bg-red-500", na: "bg-fg/30", wait: "bg-fg/20" };

const AttentionRow = ({ enquiry, reason, onOpen }) => (
  <li>
    <button
      type="button"
      onClick={() => onOpen(enquiry)}
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-raised"
    >
      <Avatar name={enquiry.name} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-fg">{enquiry.name}</span>
        <span className="block truncate text-xs text-muted">
          {destinationLabel(enquiry.destination)} · {enquiry.phone}
        </span>
      </span>
      <span className="shrink-0 text-right text-xs text-red-600 dark:text-red-400">{reason}</span>
    </button>
  </li>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [health, setHealth] = useState({ api: "wait", db: "wait", email: "wait", cache: "wait" });
  const loadRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth(apiUrl("/api/crm/dashboard"));
      const json = await safeJson(res);
      if (!res.ok || !json.success) throw new Error(json.message || "Couldn't load the dashboard");
      setData(json.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadHealth = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/health"));
      const h = res.ok ? await res.json() : null;
      setHealth({
        api: res.ok ? "ok" : "off",
        db: h?.database === "connected" ? "ok" : "off",
        email: h?.integrations?.emailProvider ? "ok" : "na",
        cache: h?.redis === "connected" ? "ok" : h?.redis === "not_configured" ? "na" : "off",
      });
    } catch {
      setHealth({ api: "off", db: "off", email: "off", cache: "off" });
    }
  }, []);

  loadRef.current = load;

  useEffect(() => {
    load();
    loadHealth();
    const timer = setInterval(() => loadRef.current?.(), POLL_MS);
    return () => clearInterval(timer);
  }, [load, loadHealth]);

  // Live updates when the backend pushes new / changed enquiries
  useEffect(() => {
    const socket = io(siteConfig.api.baseUrl, { transports: ["websocket", "polling"] });
    socket.on("new-enquiry", (enquiry) => {
      toast.info(`New enquiry from ${enquiry?.name || "a visitor"}`);
      loadRef.current?.();
    });
    socket.on("enquiry-updated", () => loadRef.current?.());
    return () => socket.disconnect();
  }, []);

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

  const openEnquiry = (enquiry) => navigate(`/admin/enquiries?id=${enquiry._id || enquiry.id}`);

  if (error && !data) {
    return (
      <div className="card flex flex-col items-start gap-4 p-8">
        <PiWarningCircle className="h-8 w-8 text-red-500" />
        <p className="font-display text-2xl text-fg">The dashboard didn't load.</p>
        <p className="text-sm text-muted">{error}</p>
        <button type="button" onClick={load} className="btn btn-ink">
          Try again
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading dashboard">
        <div className="skeleton h-16 w-2/3 rounded-3xl" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-36 rounded-3xl" />
          ))}
        </div>
        <div className="skeleton h-80 rounded-3xl" />
      </div>
    );
  }

  const { kpis, packages, attention, recent, topDestinations } = data;
  const rows = toChartRows(data.series);
  const monthTotal = rows.reduce((s, r) => s + r.values.received, 0);
  const attentionItems = [
    ...attention.followUps.map((e) => ({ e, reason: "Follow-up due" })),
    ...attention.waitingTooLong
      .filter((e) => !attention.followUps.some((f) => f._id === e._id))
      .map((e) => ({ e, reason: `Waiting ${timeAgo(e.createdAt).replace(" ago", "")}` })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h2 className="mt-1 font-display text-3xl text-fg">
            {greeting()}.{" "}
            <span className="text-muted">
              {kpis.pending
                ? `${kpis.pending} enquir${kpis.pending === 1 ? "y is" : "ies are"} waiting for a reply.`
                : "You're all caught up."}
            </span>
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowAddLead(true)} className="btn btn-accent">
            <PiPlus className="h-4 w-4" /> Add lead
          </button>
          <Link to="/admin/packages" className="btn btn-ghost">
            <PiSuitcaseRolling className="h-4 w-4" /> Packages
          </Link>
          <button type="button" onClick={exportExcel} className="btn btn-ghost">
            <PiDownloadSimple className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile
          label="New enquiries this week"
          value={kpis.newThisWeek}
          delta={pctChange(kpis.newThisWeek, kpis.newLastWeek)}
          comparison="vs last week"
          icon={PiTray}
        />
        <StatTile
          label="Waiting for a reply"
          value={kpis.pending}
          goodWhenUp={false}
          hint="pending enquiries"
          icon={PiBellRinging}
        />
        <StatTile
          label="Conversion, last 30 days"
          value={`${kpis.conversionRate30d}%`}
          hint="enquiries confirmed"
          icon={PiChartLineUp}
        />
        <StatTile
          label="Confirmed value, last 30 days"
          value={inrCompact(kpis.wonValue30d)}
          hint="estimated from budget × travellers"
          icon={PiStarFill}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Enquiries, last 30 days"
          description={`${monthTotal} received`}
          action={
            <Link to="/admin/crm" className="text-sm text-muted hover:text-fg">
              Full report <PiArrowRight className="inline h-3.5 w-3.5" />
            </Link>
          }
        >
          <ColumnChart
            title="Enquiries per day, last 30 days"
            data={rows}
            series={SERIES}
            height={200}
          />
        </Panel>

        <Panel
          title="Needs attention"
          description="Overdue follow-ups and enquiries waiting over 2 hours"
          bodyClassName="p-2"
        >
          {attentionItems.length ? (
            <ul>
              {attentionItems.slice(0, 6).map(({ e, reason }) => (
                <AttentionRow key={e._id} enquiry={e} reason={reason} onOpen={openEnquiry} />
              ))}
            </ul>
          ) : (
            <Empty title="Nothing overdue">Every enquiry has been picked up.</Empty>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2 xl:self-start"
          title="Latest enquiries"
          action={
            <Link to="/admin/enquiries" className="text-sm text-muted hover:text-fg">
              All enquiries <PiArrowRight className="inline h-3.5 w-3.5" />
            </Link>
          }
          bodyClassName="p-0"
        >
          {recent.length ? (
            <ul className="divide-y divide-line">
              {recent.map((e) => (
                <li key={e._id}>
                  <button
                    type="button"
                    onClick={() => openEnquiry(e)}
                    className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-3.5 text-left transition hover:bg-raised md:grid-cols-[auto_1.2fr_1fr_auto_auto] md:px-6"
                  >
                    <Avatar name={e.name} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-fg">{e.name}</span>
                      <span className="block truncate text-xs text-muted">{e.phone}</span>
                    </span>
                    <span className="hidden truncate text-sm text-muted md:block">
                      {destinationLabel(e.destination)}
                    </span>
                    <span className="hidden text-xs text-muted md:block">
                      {timeAgo(e.createdAt)}
                    </span>
                    <StatusPill status={e.status} label={stageLabel(e.status)} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No enquiries yet">
              They'll appear here the moment someone submits the form.
            </Empty>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Popular destinations" description="Enquiries, last 30 days">
            <BarList
              rows={topDestinations.map((d) => ({
                key: d.destination,
                label: destinationLabel(d.destination),
                value: d.count,
              }))}
              emptyText="No enquiries in the last 30 days"
            />
          </Panel>

          <Panel title="Site content" bodyClassName="p-5">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Published packages", packages.published, "/admin/packages"],
                ["Drafts", packages.drafts, "/admin/packages"],
                ["Upcoming departures", packages.upcomingDepartures, "/admin/packages"],
                ["Reviews to moderate", kpis.reviewsPending, "/admin/reviews"],
              ].map(([label, value, to]) => (
                <Link
                  key={label}
                  to={to}
                  className="rounded-2xl bg-raised p-3 transition hover:bg-line/60"
                >
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="mt-1 text-xl font-semibold text-fg">{value}</dd>
                </Link>
              ))}
            </dl>
          </Panel>

          <Panel title="System status" bodyClassName="p-5">
            <ul className="space-y-2.5 text-sm">
              {[
                ["API server", health.api],
                ["Database", health.db],
                ["Email service", health.email],
                ["Cache (Redis)", health.cache],
              ].map(([label, state]) => (
                <li key={label} className="flex items-center justify-between">
                  <span className="text-muted">{label}</span>
                  <span className="flex items-center gap-2 text-fg">
                    <span
                      className={`h-2 w-2 rounded-full ${HEALTH_DOT[state]}`}
                      aria-hidden="true"
                    />
                    {HEALTH_LABELS[state]}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {showAddLead && <AddLeadModal onClose={() => setShowAddLead(false)} onCreated={load} />}
    </div>
  );
};

export default AdminDashboard;
