import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PiMagnifyingGlass, PiSlidersHorizontal, PiX } from "react-icons/pi";
import SiteLayout from "../components/SiteLayout";
import Meta from "../components/Meta";
import PackageCard from "../components/PackageCard";
import Select from "../components/ui/Select";
import { ScrollArea } from "../components/ui/Scrollbar";
import { PackageGridSkeleton } from "../components/PackageCardSkeleton";
import usePackageCatalog from "../utils/usePackageCatalog";
import { BUDGETS, DURATIONS, SORTS, filterPackages, regionsOf } from "./packagesFilters";

const PAGE = 12;
const FILTER_KEYS = ["q", "category", "region", "budget", "duration", "sort"];

const TITLES = {
  domestic: { title: "Holidays in India", intro: "Yatras, hill stations, backwaters and beaches." },
  international: {
    title: "Holidays abroad",
    intro: "Short-haul favourites and longer trips, with visas handled.",
  },
  "": { title: "All holidays", intro: "Every trip we run, in one place." },
};

const Option = ({ name, value, current, label, onChange, count }) => (
  <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5 text-[15px] text-fg">
    <span className="flex items-center gap-3">
      <input
        type="radio"
        name={name}
        checked={current === value}
        onChange={() => onChange(value)}
        className="h-4 w-4 accent-saffron-500"
      />
      {label}
    </span>
    {typeof count === "number" && <span className="text-xs text-muted">{count}</span>}
  </label>
);

const Filters = ({ params, setParam, regions, counts }) => (
  <div className="space-y-8">
    <fieldset>
      <legend className="mb-3 text-[11px] uppercase tracking-[0.16em] text-muted">Trip type</legend>
      <Option
        name="category"
        value=""
        current={params.category}
        label="Anywhere"
        onChange={(v) => setParam("category", v)}
        count={counts.all}
      />
      <Option
        name="category"
        value="domestic"
        current={params.category}
        label="Within India"
        onChange={(v) => setParam("category", v)}
        count={counts.domestic}
      />
      <Option
        name="category"
        value="international"
        current={params.category}
        label="International"
        onChange={(v) => setParam("category", v)}
        count={counts.international}
      />
    </fieldset>

    {regions.length > 1 && (
      <fieldset>
        <legend className="mb-3 text-[11px] uppercase tracking-[0.16em] text-muted">Region</legend>
        <div className="flex flex-wrap gap-2">
          {regions.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setParam("region", params.region === r ? "" : r)}
              aria-pressed={params.region === r}
              className={`chip h-8 px-3 text-[13px] capitalize ${params.region === r ? "chip-active" : ""}`}
            >
              {r}
            </button>
          ))}
        </div>
      </fieldset>
    )}

    <fieldset>
      <legend className="mb-3 text-[11px] uppercase tracking-[0.16em] text-muted">
        Budget per person
      </legend>
      <Option
        name="budget"
        value=""
        current={params.budget}
        label="Any budget"
        onChange={(v) => setParam("budget", v)}
      />
      {BUDGETS.map((b) => (
        <Option
          key={b.id}
          name="budget"
          value={b.id}
          current={params.budget}
          label={b.label}
          onChange={(v) => setParam("budget", v)}
        />
      ))}
    </fieldset>

    <fieldset>
      <legend className="mb-3 text-[11px] uppercase tracking-[0.16em] text-muted">
        Trip length
      </legend>
      <Option
        name="duration"
        value=""
        current={params.duration}
        label="Any length"
        onChange={(v) => setParam("duration", v)}
      />
      {DURATIONS.map((d) => (
        <Option
          key={d.id}
          name="duration"
          value={d.id}
          current={params.duration}
          label={d.label}
          onChange={(v) => setParam("duration", v)}
        />
      ))}
    </fieldset>
  </div>
);

const PackagesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { packages, loading, error, retry } = usePackageCatalog();
  const [limit, setLimit] = useState(PAGE);
  const [sheetOpen, setSheetOpen] = useState(false);

  const params = useMemo(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) || ""])),
    [searchParams]
  );
  const [query, setQuery] = useState(params.q);
  useEffect(() => setQuery(params.q), [params.q]);
  useEffect(() => setLimit(PAGE), [searchParams]);

  useEffect(() => {
    if (!sheetOpen) return undefined;
    document.body.classList.add("modal-open");
    const onKey = (e) => e.key === "Escape" && setSheetOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    // A region only makes sense within the chosen trip type
    if (key === "category") next.delete("region");
    setSearchParams(next, { replace: true });
  };

  const clearAll = () => setSearchParams({}, { replace: true });

  const results = useMemo(() => filterPackages(packages, params), [packages, params]);
  const regions = useMemo(
    () =>
      regionsOf(
        params.category ? packages.filter((p) => p.category === params.category) : packages
      ),
    [packages, params.category]
  );
  const counts = useMemo(
    () => ({
      all: packages.length,
      domestic: packages.filter((p) => p.category === "domestic").length,
      international: packages.filter((p) => p.category === "international").length,
    }),
    [packages]
  );

  const heading = TITLES[params.category] || TITLES[""];
  const activeFilters = [
    params.q && { key: "q", label: `“${params.q}”` },
    params.region && { key: "region", label: params.region },
    params.budget && { key: "budget", label: BUDGETS.find((b) => b.id === params.budget)?.label },
    params.duration && {
      key: "duration",
      label: DURATIONS.find((d) => d.id === params.duration)?.label,
    },
  ].filter((f) => f && f.label);

  return (
    <SiteLayout>
      <Meta
        title={`${heading.title} — Tour Packages | Satyam Holidays`}
        description="Browse Satyam Holidays tour packages — Chardham Yatra, Kashmir, Kerala, Rajasthan, Dubai, Singapore, Thailand and more. Filter by budget, trip length and region."
        url="https://satyamholidays.vercel.app/packages"
      />

      <header className="border-b border-line">
        <div className="container-site py-12 md:py-16">
          <p className="eyebrow mb-4">Tour packages</p>
          <div className="grid gap-8 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <h1 className="font-display text-display-lg font-light text-fg">{heading.title}</h1>
              <p className="mt-3 text-muted">{heading.intro}</p>
            </div>
            <form
              className="md:col-span-5"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                setParam("q", query.trim());
              }}
            >
              <label htmlFor="pkg-search" className="sr-only">
                Search packages
              </label>
              <div className="relative">
                <PiMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                <input
                  id="pkg-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a place or temple…"
                  className="field h-14 rounded-full pl-12 pr-28"
                />
                <button
                  type="submit"
                  className="btn btn-ink absolute right-1.5 top-1/2 h-11 -translate-y-1/2"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </header>

      <div className="container-site grid gap-10 py-10 lg:grid-cols-12 lg:py-14">
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-[calc(var(--header-h)+1.5rem)]">
            <Filters params={params} setParam={setParam} regions={regions} counts={counts} />
          </div>
        </aside>

        <section className="lg:col-span-9" aria-live="polite">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted">
              {loading
                ? "Loading trips…"
                : `${results.length} trip${results.length === 1 ? "" : "s"}`}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="btn btn-ghost h-10 lg:hidden"
              >
                <PiSlidersHorizontal className="h-4 w-4" /> Filters
                {activeFilters.length > 0 && (
                  <span className="rounded-full bg-saffron-500 px-1.5 text-xs text-white">
                    {activeFilters.length}
                  </span>
                )}
              </button>
              <label htmlFor="pkg-sort" className="sr-only">
                Sort by
              </label>
              <Select
                id="pkg-sort"
                variant="pill"
                value={params.sort || "recommended"}
                onChange={(v) => setParam("sort", v === "recommended" ? "" : v)}
                options={SORTS.map((s) => ({ value: s.id, label: s.label }))}
                className="min-w-[11rem]"
              />
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="mb-8 flex flex-wrap items-center gap-2">
              {activeFilters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setParam(f.key, "")}
                  className="chip h-8 gap-1.5 px-3 text-[13px] capitalize"
                >
                  {f.label} <PiX className="h-3 w-3" aria-label="remove" />
                </button>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="ml-1 text-sm text-muted underline underline-offset-4 hover:text-fg"
              >
                Clear all
              </button>
            </div>
          )}

          {error ? (
            <div className="card p-10 text-center">
              <p className="font-display text-2xl">We couldn't load trips.</p>
              <p className="mt-2 text-muted">{error}</p>
              <button type="button" onClick={retry} className="btn btn-ink mt-6">
                Try again
              </button>
            </div>
          ) : loading ? (
            <PackageGridSkeleton count={6} />
          ) : results.length === 0 ? (
            <div className="card flex flex-col items-center px-6 py-16 text-center">
              <p className="font-display text-3xl text-fg">Nothing matches — yet.</p>
              <p className="mt-3 max-w-md text-muted">
                We build plenty of trips that aren't listed here. Tell us where you'd like to go and
                we'll put one together.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/#enquiry" className="btn btn-accent">
                  Ask for a custom trip
                </Link>
                <button type="button" onClick={clearAll} className="btn btn-ghost">
                  Clear filters
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
                {results.slice(0, limit).map((pkg, i) => (
                  <PackageCard key={pkg._id || pkg.id} pkg={pkg} priority={i < 3} />
                ))}
              </div>
              {results.length > limit && (
                <div className="mt-14 flex flex-col items-center gap-3">
                  <p className="text-sm text-muted">
                    Showing {limit} of {results.length}
                  </p>
                  <button
                    type="button"
                    onClick={() => setLimit((l) => l + PAGE)}
                    className="btn btn-ghost"
                  >
                    Show more trips
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Mobile filter sheet */}
      <div
        className={`fixed inset-0 z-[55] lg:hidden ${sheetOpen ? "visible" : "invisible"}`}
        aria-hidden={!sheetOpen}
      >
        <div
          className={`absolute inset-0 bg-ink-950/50 transition-opacity ${sheetOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setSheetOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          className={`absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-4xl supports-[height:100dvh]:max-h-[85dvh] bg-page transition-transform duration-500 ease-out-expo ${
            sheetOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-4">
            <p className="font-display text-xl">Filters</p>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="icon-btn"
              aria-label="Close filters"
            >
              <PiX className="h-4 w-4" />
            </button>
          </div>
          <ScrollArea className="flex-1" viewportClassName="px-6 py-6">
            <Filters params={params} setParam={setParam} regions={regions} counts={counts} />
          </ScrollArea>
          <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-line p-4">
            <button type="button" onClick={clearAll} className="btn btn-ghost">
              Clear
            </button>
            <button type="button" onClick={() => setSheetOpen(false)} className="btn btn-ink">
              Show {results.length} trips
            </button>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
};

export default PackagesPage;
