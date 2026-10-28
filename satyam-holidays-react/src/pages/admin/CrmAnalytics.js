import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { PiDownloadSimple, PiFire, PiPhone, PiTimer, PiWhatsappLogo } from "react-icons/pi";
import { apiUrl, fetchWithAuth, safeJson, toastApiError } from "../../config/siteConfig";
import ColumnChart from "../../components/charts/ColumnChart";
import BarList from "../../components/charts/BarList";
import Select from "../../components/ui/Select";
import { DESTINATIONS } from "../../config/enquiryOptions";
import { toTel, toWhatsApp } from "../../utils/format";
import {
  Avatar,
  Empty,
  Panel,
  StatTile,
  StatusPill,
  stageLabel,
  budgetLabel,
  destinationLabel,
  inrCompact,
  minutesLabel,
  pctChange,
  sourceLabel,
  timeAgo,
  toChartRows,
  travellersLabel,
} from "./adminUi";

const PERIODS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "0", label: "All time" },
];

const SERIES = [
  { key: "received", label: "Received", color: "series-1" },
  { key: "confirmed", label: "Confirmed", color: "series-3" },
];

const BREAKDOWNS = [
  { key: "byDestination", label: "Destination", format: destinationLabel },
  { key: "bySource", label: "Channel", format: sourceLabel },
  { key: "byBudget", label: "Budget", format: budgetLabel },
  { key: "byTravellers", label: "Group size", format: travellersLabel },
];

const Breakdown = ({ rows, format }) =>
  rows.length ? (
    <div className="-mx-5 overflow-x-auto md:-mx-6">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="px-5 py-2 font-medium md:px-6">Segment</th>
            <th className="px-3 py-2 text-right font-medium">Enquiries</th>
            <th className="px-3 py-2 text-right font-medium">Confirmed</th>
            <th className="px-3 py-2 text-right font-medium">Conversion</th>
            <th className="px-5 py-2 text-right font-medium md:px-6">Est. value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line tabular-nums">
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="px-5 py-2.5 text-fg md:px-6">{format(r.key)}</td>
              <td className="px-3 py-2.5 text-right text-fg">{r.enquiries}</td>
              <td className="px-3 py-2.5 text-right text-fg">{r.confirmed}</td>
              <td className="px-3 py-2.5 text-right">
                <span className="inline-flex items-center gap-2 text-fg">
                  <span
                    className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-series-3/15 sm:block"
                    aria-hidden="true"
                  >
                    <span
                      className="block h-full rounded-full bg-series-3"
                      style={{ width: `${Math.min(100, r.conversionRate)}%` }}
                    />
                  </span>
                  {r.conversionRate}%
                </span>
              </td>
              <td className="px-5 py-2.5 text-right text-fg md:px-6">{inrCompact(r.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty title="No enquiries in this period" />
  );

const ExportPanel = () => {
  const [filters, setFilters] = useState({
    status: "",
    destination: "",
    startDate: "",
    endDate: "",
    leadScoreMin: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (key) => (v) => setFilters((f) => ({ ...f, [key]: v?.target ? v.target.value : v }));
  const input =
    "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-fg focus:border-accent focus:outline-none";

  const download = async () => {
    setBusy(true);
    try {
      const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
      const res = await fetchWithAuth(apiUrl(`/api/v1/crm/export?${params}`));
      if (!res.ok) throw new Error("Export failed");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } catch (err) {
      toastApiError(err, "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Export leads" description="CSV with lead score, SLA and estimated value">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          aria-label="Status"
          value={filters.status}
          onChange={set("status")}
          className="!h-[2.75rem] !text-sm"
          options={[
            { value: "", label: "Any status" },
            ...["pending", "contacted", "quoted", "confirmed", "cancelled"].map((s) => ({
              value: s,
              label: s[0].toUpperCase() + s.slice(1),
            })),
          ]}
        />
        <Select
          aria-label="Destination"
          value={filters.destination}
          onChange={set("destination")}
          className="!h-[2.75rem] !text-sm"
          options={[{ value: "", label: "Any destination" }, ...DESTINATIONS]}
        />
        <label className="text-xs text-muted">
          From
          <input
            type="date"
            value={filters.startDate}
            onChange={set("startDate")}
            className={`${input} mt-1`}
          />
        </label>
        <label className="text-xs text-muted">
          To
          <input
            type="date"
            value={filters.endDate}
            onChange={set("endDate")}
            className={`${input} mt-1`}
          />
        </label>
        <label className="text-xs text-muted sm:col-span-2">
          Minimum lead score
          <input
            type="number"
            min="0"
            value={filters.leadScoreMin}
            onChange={set("leadScoreMin")}
            placeholder="e.g. 60"
            className={`${input} mt-1`}
          />
        </label>
      </div>
      <button type="button" onClick={download} disabled={busy} className="btn btn-ink mt-4 w-full">
        <PiDownloadSimple className="h-4 w-4" /> {busy ? "Preparing…" : "Download CSV"}
      </button>
    </Panel>
  );
};

const CrmAnalytics = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState("30");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [breakdown, setBreakdown] = useState("byDestination");

  const load = useCallback(async (period) => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/crm/report?days=${period}`));
      const json = await safeJson(res);
      if (!res.ok || !json.success) throw new Error(json.message || "Couldn't load the report");
      setReport(json.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  const periodName = PERIODS.find((p) => p.value === days)?.label.toLowerCase();
  const comparison = days !== "0" ? "vs previous period" : undefined;

  if (!report) {
    return error ? (
      <div className="card p-8">
        <p className="font-display text-2xl text-fg">The report didn't load.</p>
        <p className="mt-1 text-sm text-muted">{error}</p>
        <button type="button" onClick={() => load(days)} className="btn btn-ink mt-5">
          Try again
        </button>
      </div>
    ) : (
      <div className="space-y-6" role="status" aria-label="Loading report">
        <div className="skeleton h-12 w-64 rounded-full" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-36 rounded-3xl" />
          ))}
        </div>
        <div className="skeleton h-80 rounded-3xl" />
      </div>
    );
  }

  const { kpis, previous, funnel, leadQuality, hotLeads, statusBreakdown } = report;
  const rows = toChartRows(report.series);
  const activeBreakdown = BREAKDOWNS.find((b) => b.key === breakdown);
  const funnelTop = funnel[0]?.count || 0;
  const qualityTotal = leadQuality.hot + leadQuality.warm + leadQuality.cold;

  return (
    // Keep the previous render visible (dimmed) while a new period loads — no layout jump
    <div
      className={`space-y-6 transition-opacity ${loading ? "opacity-60" : ""}`}
      aria-busy={loading}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Select
          aria-label="Report period"
          variant="pill"
          value={days}
          onChange={setDays}
          options={PERIODS}
          className="min-w-[11rem]"
        />
        {report.followUpsDue > 0 && (
          <button
            type="button"
            onClick={() => navigate("/admin/enquiries")}
            className="chip border-red-300 text-red-700 dark:border-red-900 dark:text-red-300"
          >
            {report.followUpsDue} follow-up{report.followUpsDue > 1 ? "s" : ""} due today
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile
          label="Enquiries"
          value={kpis.enquiries}
          delta={pctChange(kpis.enquiries, previous?.enquiries)}
          comparison={comparison}
        />
        <StatTile
          label="Conversion rate"
          value={`${kpis.conversionRate}%`}
          delta={previous ? kpis.conversionRate - previous.conversionRate : null}
          deltaSuffix=" pts"
          comparison={comparison}
          hint={`${kpis.confirmed} confirmed`}
        />
        <StatTile
          label="Confirmed value"
          value={inrCompact(kpis.wonValue)}
          delta={pctChange(kpis.wonValue, previous?.wonValue)}
          comparison={comparison}
          hint={`${inrCompact(kpis.pipelineValue)} still open`}
        />
        <StatTile
          label="Average first response"
          value={minutesLabel(kpis.avgResponseMinutes)}
          delta={
            previous && kpis.avgResponseMinutes !== null && previous.avgResponseMinutes
              ? pctChange(kpis.avgResponseMinutes, previous.avgResponseMinutes)
              : null
          }
          goodWhenUp={false}
          comparison={comparison}
          hint={`${kpis.slaBreachRate}% over 2h`}
          icon={PiTimer}
        />
      </div>

      <Panel title="Received vs confirmed" description={`${periodName} · by ${report.series.unit}`}>
        <ColumnChart
          title="Enquiries received and confirmed"
          data={rows}
          series={SERIES}
          height={240}
        />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Funnel" description="How far enquiries get">
          <BarList
            max={funnelTop || 1}
            rows={funnel.map((f) => ({
              key: f.stage,
              label: f.stage,
              value: f.count,
              hint: funnelTop ? `${Math.round((f.count / funnelTop) * 100)}%` : undefined,
            }))}
          />
          <p className="mt-5 border-t border-line pt-4 text-xs text-muted">
            {statusBreakdown.pending} still new · {statusBreakdown.cancelled} cancelled
          </p>
        </Panel>

        <Panel
          title="Lead quality"
          description="Based on budget, group size, dates and detail given"
        >
          <BarList
            max={qualityTotal || 1}
            rows={[
              { key: "hot", label: "Hot", value: leadQuality.hot },
              { key: "warm", label: "Warm", value: leadQuality.warm },
              { key: "cold", label: "Cold", value: leadQuality.cold },
            ]}
          />
        </Panel>

        <ExportPanel />
      </div>

      <Panel
        title="Breakdown"
        description="Where enquiries come from and which ones convert"
        action={
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Breakdown by">
            {BREAKDOWNS.map((b) => (
              <button
                key={b.key}
                type="button"
                role="tab"
                aria-selected={breakdown === b.key}
                onClick={() => setBreakdown(b.key)}
                className={`chip h-8 px-3 text-[13px] ${breakdown === b.key ? "chip-active" : ""}`}
              >
                {b.label}
              </button>
            ))}
          </div>
        }
      >
        <Breakdown rows={report[breakdown]} format={activeBreakdown.format} />
      </Panel>

      <Panel
        title="Hot leads to call"
        description="Open enquiries with the highest lead score"
        bodyClassName="p-0"
      >
        {hotLeads.length ? (
          <ul className="divide-y divide-line">
            {hotLeads.map((e) => (
              <li key={e._id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 md:px-6">
                <Avatar name={e.name} />
                <button
                  type="button"
                  onClick={() => navigate(`/admin/enquiries?id=${e._id}`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm font-medium text-fg hover:underline">
                    {e.name}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {destinationLabel(e.destination)} · {travellersLabel(e.travelers)} ·{" "}
                    {timeAgo(e.createdAt)}
                  </span>
                </button>
                <span
                  className="flex items-center gap-1 text-xs font-medium text-fg"
                  title="Lead score"
                >
                  <PiFire className="h-4 w-4 text-saffron-600" aria-hidden="true" /> {e.leadScore}
                </span>
                <span className="hidden text-sm text-muted sm:block">
                  {inrCompact(e.estimatedValue)}
                </span>
                <StatusPill status={e.status} label={stageLabel(e.status)} />
                <span className="flex gap-1.5">
                  <a
                    href={toTel(e.phone)}
                    className="icon-btn h-8 w-8"
                    aria-label={`Call ${e.name}`}
                  >
                    <PiPhone className="h-4 w-4" />
                  </a>
                  <a
                    href={toWhatsApp(
                      e.phone,
                      `Hi ${e.name}, this is Satyam Holidays about your trip enquiry.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="icon-btn h-8 w-8"
                    aria-label={`WhatsApp ${e.name}`}
                  >
                    <PiWhatsappLogo className="h-4 w-4" />
                  </a>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No open leads">New enquiries will show up here ranked by score.</Empty>
        )}
      </Panel>

      <p className="text-xs text-muted">
        Values are estimates: budget band midpoint × number of travellers. Response time counts from
        the enquiry to its first status change.
      </p>
    </div>
  );
};

export default CrmAnalytics;
