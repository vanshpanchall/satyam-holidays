import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PiCheck, PiMagnifyingGlass, PiPlus, PiStarFill, PiX } from "react-icons/pi";
import SiteLayout from "../components/SiteLayout";
import Meta from "../components/Meta";
import Img from "../components/ui/Img";
import { ScrollArea } from "../components/ui/Scrollbar";
import usePackageCatalog from "../utils/usePackageCatalog";
import { useWishlist } from "../utils/savedTrips";
import { formatINR, parseNights, pkgHref, pkgId, startingPrice } from "../utils/format";

const MAX = 3;

const ROWS = [
  {
    label: "Starting price",
    render: (p) => (
      <span className="font-display text-xl text-fg">{formatINR(startingPrice(p))}</span>
    ),
  },
  {
    label: "Duration",
    render: (p) => {
      const n = parseNights(p.duration);
      return n > 0 ? `${n} nights / ${n + 1} days` : p.duration;
    },
  },
  { label: "Where", render: (p) => p.location },
  {
    label: "Rating",
    render: (p) =>
      p.rating ? (
        <span className="flex items-center gap-1">
          <PiStarFill className="h-4 w-4 text-saffron-500" /> {Number(p.rating).toFixed(1)}
          {p.reviews > 0 && <span className="text-muted">({p.reviews})</span>}
        </span>
      ) : (
        "—"
      ),
  },
  { label: "Visa", render: (p) => p.visa || "Not required" },
  {
    label: "Next departure",
    render: (p) => {
      const next = (p.availableDates || [])
        .filter((d) => new Date(d.startDate) > new Date() && d.status !== "sold_out")
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
      return next
        ? new Date(next.startDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "Flexible dates";
    },
  },
  {
    label: "Highlights",
    render: (p) =>
      p.highlights?.length ? (
        <ul className="space-y-1.5">
          {p.highlights.slice(0, 5).map((h) => (
            <li key={h} className="flex gap-2">
              <PiCheck className="mt-1 h-3.5 w-3.5 shrink-0 text-accent" /> {h}
            </li>
          ))}
        </ul>
      ) : (
        "—"
      ),
  },
  {
    label: "Included",
    render: (p) =>
      p.inclusions?.length ? p.inclusions.slice(0, 5).join(" · ") : "Ask your planner",
  },
];

const Picker = ({ options, onPick, onClose }) => {
  const [term, setTerm] = useState("");
  const inputRef = useRef(null);
  useEffect(() => inputRef.current?.focus(), []);
  const list = options.filter((p) =>
    `${p.name} ${p.location}`.toLowerCase().includes(term.toLowerCase())
  );

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-3xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <PiMagnifyingGlass className="h-4 w-4 text-muted" />
        <input
          ref={inputRef}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search trips"
          aria-label="Search trips to compare"
          className="w-full bg-transparent text-sm focus:outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-muted hover:text-fg"
        >
          <PiX className="h-4 w-4" />
        </button>
      </div>
      <ScrollArea className="mt-2 max-h-64 flex-1">
        <ul>
          {list.length === 0 && (
            <li className="py-6 text-center text-sm text-muted">No trips found</li>
          )}
          {list.map((p) => (
            <li key={pkgId(p)}>
              <button
                type="button"
                onClick={() => onPick(p)}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2.5 text-left text-sm hover:bg-raised"
              >
                <span className="truncate text-fg">{p.name}</span>
                <span className="shrink-0 text-muted">{formatINR(startingPrice(p))}</span>
              </button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
};

const ComparePage = () => {
  const { packages, loading } = usePackageCatalog();
  const { ids: wishlist } = useWishlist();
  const [selectedIds, setSelectedIds] = useState(null);
  const [pickerSlot, setPickerSlot] = useState(null);

  // Start from the wishlist (or nothing) once the catalogue has loaded
  useEffect(() => {
    if (selectedIds !== null || loading) return;
    const available = new Set(packages.map(pkgId));
    setSelectedIds(wishlist.filter((id) => available.has(id)).slice(0, MAX));
  }, [loading, packages, wishlist, selectedIds]);

  const byId = useMemo(() => new Map(packages.map((p) => [pkgId(p), p])), [packages]);
  const selected = (selectedIds || []).map((id) => byId.get(id)).filter(Boolean);
  const options = packages.filter((p) => !(selectedIds || []).includes(pkgId(p)));

  const add = (pkg) => {
    setSelectedIds((prev) => [...(prev || []), pkgId(pkg)].slice(0, MAX));
    setPickerSlot(null);
  };
  const remove = (id) => setSelectedIds((prev) => (prev || []).filter((x) => x !== id));

  const slots = Array.from({ length: MAX }, (_, i) => selected[i] || null);

  return (
    <SiteLayout>
      <Meta
        title="Compare trips | Satyam Holidays"
        description="Compare holiday packages side by side."
      />

      <header className="border-b border-line">
        <div className="container-site py-12 md:py-16">
          <p className="eyebrow mb-4">Side by side</p>
          <h1 className="font-display text-display-lg font-light text-fg">Compare trips</h1>
          <p className="mt-3 max-w-xl text-muted">
            Pick up to three trips to see price, length, dates and what's included next to each
            other.
          </p>
        </div>
      </header>

      <div className="container-site py-12">
        <div className="-mx-4 overflow-x-auto px-4 pb-4">
          <div className="grid min-w-[760px] grid-cols-[10rem_repeat(3,minmax(0,1fr))] gap-x-4">
            {/* Header row */}
            <div />
            {slots.map((pkg, i) =>
              pkg ? (
                <div key={pkgId(pkg)} className="relative">
                  <Link to={pkgHref(pkg)} className="group block">
                    <div className="aspect-[4/3] overflow-hidden rounded-3xl">
                      <Img
                        src={pkg.image}
                        alt={pkg.name}
                        width={600}
                        className="transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                    <p className="mt-3 font-display text-lg leading-snug text-fg">{pkg.name}</p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(pkgId(pkg))}
                    aria-label={`Remove ${pkg.name}`}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink-900 hover:bg-white"
                  >
                    <PiX className="h-4 w-4" />
                  </button>
                </div>
              ) : pickerSlot === i ? (
                <Picker
                  key={`picker-${i}`}
                  options={options}
                  onPick={add}
                  onClose={() => setPickerSlot(null)}
                />
              ) : (
                <button
                  key={`empty-${i}`}
                  type="button"
                  disabled={loading || options.length === 0}
                  onClick={() => setPickerSlot(i)}
                  className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-line text-muted transition hover:border-fg/40 hover:text-fg disabled:opacity-50"
                >
                  <PiPlus className="h-6 w-6" />
                  <span className="text-sm">{loading ? "Loading…" : "Add a trip"}</span>
                </button>
              )
            )}

            {/* Data rows */}
            {selected.length > 0 &&
              ROWS.map((row) => (
                <React.Fragment key={row.label}>
                  <div className="border-t border-line py-5 text-[11px] uppercase tracking-[0.16em] text-muted">
                    {row.label}
                  </div>
                  {slots.map((pkg, i) => (
                    <div
                      key={i}
                      className="border-t border-line py-5 text-sm leading-relaxed text-fg"
                    >
                      {pkg ? row.render(pkg) : ""}
                    </div>
                  ))}
                </React.Fragment>
              ))}

            {selected.length > 0 && (
              <>
                <div className="border-t border-line" />
                {slots.map((pkg, i) => (
                  <div key={i} className="border-t border-line pt-6">
                    {pkg && (
                      <Link to={pkgHref(pkg)} className="btn btn-ink w-full">
                        View trip
                      </Link>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {!loading && selected.length === 0 && (
          <p className="mt-10 text-center text-muted">
            Add trips above, or{" "}
            <Link to="/packages" className="text-fg underline underline-offset-4">
              save a few from the packages page
            </Link>{" "}
            and they'll show up here automatically.
          </p>
        )}
      </div>
    </SiteLayout>
  );
};

export default ComparePage;
