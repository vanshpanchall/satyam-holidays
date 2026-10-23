import React from "react";
import { PiArrowDownRight, PiArrowUpRight, PiMinus } from "react-icons/pi";
import { DESTINATIONS } from "../../config/enquiryOptions";
import { BUDGETS } from "../packagesFilters";

/* ── Labels ─────────────────────────────────────────────── */

const DESTINATION_LABELS = Object.fromEntries(DESTINATIONS.map((d) => [d.value, d.label]));
const BUDGET_LABELS = Object.fromEntries(BUDGETS.map((b) => [b.id, b.label]));

export const SOURCE_LABELS = {
  website: "Website",
  homepage: "Homepage form",
  "package-page": "Package page",
  "ai-planner": "Trip planner",
  phone: "Phone call",
  whatsapp: "WhatsApp",
  "walk-in": "Walk-in",
  referral: "Referral",
  social: "Social media",
  other: "Other",
};

export const destinationLabel = (v) =>
  DESTINATION_LABELS[v] || (v ? v[0].toUpperCase() + v.slice(1) : "Not specified");
export const budgetLabel = (v) => BUDGET_LABELS[v] || "Not specified";
export const travellersLabel = (v) =>
  v ? (v === "5+" ? "5 or more" : `${v} ${v === "1" ? "person" : "people"}`) : "Not specified";
export const sourceLabel = (v) => SOURCE_LABELS[v] || "Website";

/* ── Formatting ─────────────────────────────────────────── */

export const inrCompact = (n) =>
  `₹${new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0)}`;

const RELATIVE_UNITS = [
  ["year", 31557600],
  ["month", 2629800],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export const timeAgo = (date) => {
  if (!date) return "";
  const secs = (new Date(date).getTime() - Date.now()) / 1000;
  const [unit, size] = RELATIVE_UNITS.find(([, s]) => Math.abs(secs) >= s) || ["second", 1];
  return rtf.format(Math.round(secs / size), unit);
};

export const minutesLabel = (m) => {
  if (m === null || m === undefined) return "—";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60 ? `${m % 60}m` : ""}`.trim();
  return `${Math.round(h / 24)} days`;
};

/* ── Building blocks ────────────────────────────────────── */

export const PageIntro = ({ description, actions, children }) => (
  <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div className="min-w-0">
      {description && <p className="text-sm text-muted">{description}</p>}
      {children}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Panel = ({
  title,
  description,
  action,
  children,
  className = "",
  bodyClassName = "p-5 md:p-6",
}) => (
  <section className={`card overflow-hidden ${className}`}>
    {(title || action) && (
      <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 md:px-6">
        <div className="min-w-0">
          {title && <h2 className="font-display text-lg text-fg">{title}</h2>}
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
        {action}
      </header>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);

/**
 * KPI tile. `delta` is a signed number (e.g. % change); colour = direction × whether up is good,
 * always paired with an arrow icon + text so it never relies on colour alone.
 */
export const StatTile = ({
  label,
  value,
  delta,
  deltaSuffix = "%",
  comparison,
  goodWhenUp = true,
  hint,
  icon: Icon,
}) => {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const up = hasDelta && delta > 0;
  const flat = hasDelta && delta === 0;
  const good = flat ? null : up === goodWhenUp;
  const DeltaIcon = flat ? PiMinus : up ? PiArrowUpRight : PiArrowDownRight;

  return (
    <div className="card flex flex-col justify-between gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted">{label}</p>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-raised text-muted">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-semibold tracking-tight text-fg">{value}</p>
        {(hasDelta || hint) && (
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            {hasDelta && (
              <span
                className={`inline-flex items-center gap-0.5 font-medium ${
                  good === null
                    ? "text-muted"
                    : good
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                }`}
              >
                <DeltaIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {flat
                  ? "No change"
                  : `${up ? "+" : ""}${Math.round(delta * 10) / 10}${deltaSuffix}`}
              </span>
            )}
            {comparison && hasDelta && <span className="text-muted">{comparison}</span>}
            {hint && <span className="text-muted">{hint}</span>}
          </p>
        )}
      </div>
    </div>
  );
};

/** % change between two numbers; null when there's no baseline */
export const pctChange = (current, previous) => {
  if (previous === null || previous === undefined) return null;
  if (!previous) return current ? null : 0;
  return ((current - previous) / previous) * 100;
};

const STATUS_STYLES = {
  pending: "bg-saffron-500/10 text-saffron-800 dark:text-saffron-300",
  contacted: "bg-series-2/10 text-[rgb(var(--series-2))]",
  confirmed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-fg/5 text-muted",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-fg/5 text-muted",
  spam: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export const StatusPill = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status] || STATUS_STYLES.cancelled}`}
  >
    {status}
  </span>
);

export const Empty = ({ title, children }) => (
  <div className="px-2 py-10 text-center">
    <p className="font-display text-lg text-fg">{title}</p>
    {children && <p className="mt-1 text-sm text-muted">{children}</p>}
  </div>
);

export const Avatar = ({ name, className = "" }) => (
  <span
    aria-hidden="true"
    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-raised font-display text-sm text-fg ${className}`}
  >
    {String(name || "?")
      .trim()
      .charAt(0)
      .toUpperCase()}
  </span>
);

/** Turn an API time series into ColumnChart rows */
export const toChartRows = (series) => {
  const unit = series?.unit || "day";
  const fmt = {
    day: {
      label: { day: "numeric", month: "short" },
      full: { weekday: "short", day: "numeric", month: "short", year: "numeric" },
    },
    week: {
      label: { day: "numeric", month: "short" },
      full: { day: "numeric", month: "short", year: "numeric" },
    },
    month: { label: { month: "short" }, full: { month: "long", year: "numeric" } },
  }[unit];
  return (series?.points || []).map((p) => {
    const d = new Date(p.start);
    return {
      label: d.toLocaleDateString("en-IN", fmt.label),
      fullLabel: `${unit === "week" ? "Week of " : ""}${d.toLocaleDateString("en-IN", fmt.full)}`,
      values: { received: p.received, confirmed: p.confirmed },
    };
  });
};
