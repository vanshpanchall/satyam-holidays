import React, { useEffect, useId, useMemo, useRef, useState } from "react";

/*
 * Column chart for 1–3 series over time (e.g. enquiries received vs confirmed per day).
 * Specs: columns <= 24px with 4px rounded tops anchored to the baseline, 2px gap between
 * grouped columns, hairline gridlines, legend for >= 2 series, tooltip on hover AND keyboard
 * focus (←/→), and a table view so no value is gated behind hovering.
 *
 * data:   [{ label: "12 Oct", fullLabel: "Sat 12 Oct 2026", values: { received: 3, confirmed: 1 } }]
 * series: [{ key: "received", label: "Received", color: "series-1" }]
 */

const COLOR = {
  "series-1": "bg-series-1",
  "series-2": "bg-series-2",
  "series-3": "bg-series-3",
};

const niceMax = (value) => {
  if (value <= 4) return 4;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return step * exp;
};

export const compact = (n) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);

const Legend = ({ series }) =>
  series.length > 1 ? (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-[3px] ${COLOR[s.color]}`} aria-hidden="true" />
          {s.label}
        </li>
      ))}
    </ul>
  ) : null;

const ColumnChart = ({
  data,
  series,
  height = 220,
  formatValue = (v) => v.toLocaleString("en-IN"),
  title,
  className = "",
}) => {
  const id = useId();
  const plotRef = useRef(null);
  const [active, setActive] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [plotWidth, setPlotWidth] = useState(0);

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return undefined;
    setPlotWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => setPlotWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [showTable]);

  const max = useMemo(
    () => niceMax(Math.max(0, ...data.flatMap((d) => series.map((s) => d.values[s.key] || 0)))),
    [data, series]
  );
  const ticks = [max, max / 2, 0];
  // Roughly one x-axis label per 72px of plot (labels like "29 Sept" are ~45px), at most 7
  const maxLabels = plotWidth ? Math.max(2, Math.min(7, Math.floor(plotWidth / 72))) : 7;
  const labelEvery = Math.max(1, Math.ceil(data.length / maxLabels));
  const total = (key) => data.reduce((sum, d) => sum + (d.values[key] || 0), 0);

  const indexFromPointer = (clientX) => {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect || !data.length) return null;
    const i = Math.floor(((clientX - rect.left) / rect.width) * data.length);
    return Math.min(data.length - 1, Math.max(0, i));
  };

  const onKeyDown = (e) => {
    if (!data.length) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setActive((i) => (i === null ? 0 : Math.min(data.length - 1, i + 1)));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActive((i) => (i === null ? data.length - 1 : Math.max(0, i - 1)));
    } else if (e.key === "Escape") {
      setActive(null);
    }
  };

  const point = active !== null ? data[active] : null;
  const tooltipLeft = active !== null ? ((active + 0.5) / data.length) * 100 : 0;

  return (
    <figure className={className} aria-labelledby={title ? `${id}-title` : undefined}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Legend series={series} />
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="ml-auto text-xs text-muted underline-offset-4 hover:text-fg hover:underline"
        >
          {showTable ? "Show chart" : "View as table"}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-[260px] overflow-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-raised text-left text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Period</th>
                {series.map((s) => (
                  <th key={s.key} className="px-3 py-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {data.map((d) => (
                <tr key={d.fullLabel || d.label}>
                  <td className="px-3 py-1.5 text-fg">{d.fullLabel || d.label}</td>
                  {series.map((s) => (
                    <td key={s.key} className="px-3 py-1.5 text-right text-fg">
                      {formatValue(d.values[s.key] || 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-[2.25rem_1fr] gap-2">
          {/* Y axis */}
          <div
            className="relative text-right text-[11px] tabular-nums text-muted"
            style={{ height }}
            aria-hidden="true"
          >
            {ticks.map((t, i) => (
              <span
                key={t}
                className="absolute right-0 -translate-y-1/2"
                style={{ top: `${(i / 2) * 100}%` }}
              >
                {compact(t)}
              </span>
            ))}
          </div>

          <div>
            <div
              ref={plotRef}
              role="img"
              tabIndex={0}
              aria-label={`${title || "Chart"}: ${series.map((s) => `${s.label} total ${formatValue(total(s.key))}`).join(", ")}. Use left and right arrow keys to read each period.`}
              onPointerMove={(e) => setActive(indexFromPointer(e.clientX))}
              onPointerLeave={() => setActive(null)}
              onKeyDown={onKeyDown}
              onBlur={() => setActive(null)}
              className="relative cursor-crosshair rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500/40"
              style={{ height }}
            >
              {/* Gridlines */}
              {ticks.map((t, i) => (
                <div
                  key={t}
                  aria-hidden="true"
                  className={`absolute inset-x-0 h-px ${i === 2 ? "bg-fg/25" : "bg-line"}`}
                  style={{ top: `${(i / 2) * 100}%` }}
                />
              ))}

              {/* Columns */}
              <div className="absolute inset-0 flex items-end" aria-hidden="true">
                {data.map((d, i) => (
                  <div
                    key={d.fullLabel || `${d.label}-${i}`}
                    className={`flex h-full min-w-0 flex-1 items-end justify-center transition-colors ${
                      active === i ? "bg-fg/[0.04]" : ""
                    }`}
                  >
                    {/* Inner wrapper sized against the column itself (percentage padding would use the chart width) */}
                    <div className="flex h-full w-[76%] items-end justify-center gap-[2px]">
                      {series.map((s) => {
                        const v = d.values[s.key] || 0;
                        return (
                          <div
                            key={s.key}
                            className={`min-w-0 max-w-[24px] flex-1 rounded-t-[4px] ${COLOR[s.color]} ${
                              active !== null && active !== i ? "opacity-60" : ""
                            }`}
                            style={{ height: v ? `max(2px, ${(v / max) * 100}%)` : 0 }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tooltip */}
              {point && (
                <div
                  role="status"
                  className="pointer-events-none absolute top-0 z-10 min-w-[9rem] rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lg"
                  style={{
                    left: `${tooltipLeft}%`,
                    transform: `translate(${tooltipLeft > 70 ? "-100%" : tooltipLeft < 30 ? "0" : "-50%"}, -8px)`,
                  }}
                >
                  <p className="mb-1.5 text-muted">{point.fullLabel || point.label}</p>
                  <ul className="space-y-1">
                    {series.map((s) => (
                      <li key={s.key} className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-2 text-muted">
                          <span
                            className={`h-[2px] w-3 rounded ${COLOR[s.color]}`}
                            aria-hidden="true"
                          />
                          {s.label}
                        </span>
                        <span className="font-semibold tabular-nums text-fg">
                          {formatValue(point.values[s.key] || 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* X axis: labels centred on their column and never clipped; the ends are pinned inside the plot */}
            <div className="relative mt-2 h-4 text-[11px] text-muted" aria-hidden="true">
              {data.map((d, i) => {
                const last = i === data.length - 1;
                if (!(i % labelEvery === 0 || last)) return null;
                // The last label is right-aligned, so it needs more room than a centred one
                if (!last && data.length - 1 - i < labelEvery * 0.75) return null;
                const left = i === 0 ? "0%" : last ? "100%" : `${((i + 0.5) / data.length) * 100}%`;
                const shift = i === 0 ? "0" : last ? "-100%" : "-50%";
                return (
                  <span
                    key={d.fullLabel || `${d.label}-${i}`}
                    className="absolute top-0 whitespace-nowrap"
                    style={{ left, transform: `translateX(${shift})` }}
                  >
                    {d.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </figure>
  );
};

export default ColumnChart;
