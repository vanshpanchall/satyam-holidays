import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PiArrowRight } from "react-icons/pi";
import SectionHeader from "../ui/SectionHeader";
import PackageCard from "../PackageCard";
import PackageCardSkeleton from "../PackageCardSkeleton";
import { filterPackages } from "../../pages/packagesFilters";

const TABS = [
  { id: "domestic", label: "Within India" },
  { id: "international", label: "International" },
];

const FeaturedTrips = ({ packages, loading, error, onRetry }) => {
  const [tab, setTab] = useState("domestic");

  const counts = useMemo(
    () => ({
      domestic: packages.filter((p) => p.category === "domestic").length,
      international: packages.filter((p) => p.category === "international").length,
    }),
    [packages]
  );

  const visible = useMemo(
    () => filterPackages(packages, { category: tab, sort: "recommended" }).slice(0, 8),
    [packages, tab]
  );

  return (
    <section id="packages" className="section anchor border-t border-line bg-surface">
      <div className="container-site">
        <SectionHeader
          eyebrow="Popular right now"
          title="Trips our travellers *keep coming back for.*"
          action={
            <Link to={`/packages?category=${tab}`} className="btn btn-ghost w-fit">
              View all {counts[tab] > 0 ? counts[tab] : ""} trips{" "}
              <PiArrowRight className="h-4 w-4" />
            </Link>
          }
        />

        <div className="mb-8 flex gap-2" role="tablist" aria-label="Trip type">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`chip ${tab === t.id ? "chip-active" : ""}`}
            >
              {t.label}
              {counts[t.id] > 0 && <span className="text-xs opacity-60">{counts[t.id]}</span>}
            </button>
          ))}
        </div>

        {error ? (
          <div className="card flex flex-col items-start gap-4 p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-display text-2xl">We couldn't load trips just now.</p>
              <p className="mt-1 text-sm text-muted">Check your connection and try again.</p>
            </div>
            <button type="button" onClick={onRetry} className="btn btn-ink">
              Try again
            </button>
          </div>
        ) : (
          <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-4 scrollbar-none sm:mx-0 sm:scroll-px-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-12 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="w-[78vw] shrink-0 snap-start sm:w-auto">
                    <PackageCardSkeleton />
                  </div>
                ))
              : visible.map((pkg) => (
                  <div key={pkg._id || pkg.id} className="w-[78vw] shrink-0 snap-start sm:w-auto">
                    <PackageCard pkg={pkg} />
                  </div>
                ))}
            {!loading && visible.length === 0 && (
              <p className="py-10 text-muted">New trips are being added — check back soon.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedTrips;
