import React from "react";

/*
 * Ranked horizontal bars (top destinations, funnel stages, budget bands).
 * One series, so no legend; the value sits at the bar's tip in text colour.
 * The track is a lighter step of the same hue so the fill reads against it.
 *
 * rows: [{ key, label, value, hint? }]
 */
const BarList = ({
  rows,
  formatValue = (v) => v.toLocaleString("en-IN"),
  max,
  emptyText = "No data yet",
}) => {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value || 0));
  if (!rows.length) return <p className="py-6 text-sm text-muted">{emptyText}</p>;

  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const pct = top ? Math.max(r.value ? 2 : 0, (r.value / top) * 100) : 0;
        return (
          <li
            key={r.key}
            title={`${r.label}: ${formatValue(r.value)}${r.hint ? ` · ${r.hint}` : ""}`}
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-fg">{r.label}</span>
              <span className="shrink-0 tabular-nums text-fg">
                {formatValue(r.value)}
                {r.hint && <span className="ml-1.5 text-xs text-muted">{r.hint}</span>}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-series-1/15">
              <div className="h-full rounded-full bg-series-1" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default BarList;
