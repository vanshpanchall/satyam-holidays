import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { PiArrowsLeftRight, PiHeart, PiWhatsappLogo } from "react-icons/pi";
import SiteLayout from "../components/SiteLayout";
import Meta from "../components/Meta";
import PackageCard from "../components/PackageCard";
import { PackageGridSkeleton } from "../components/PackageCardSkeleton";
import usePackageCatalog from "../utils/usePackageCatalog";
import { useRecentlyViewed, useWishlist } from "../utils/savedTrips";
import { pkgHref, pkgId, toWhatsApp } from "../utils/format";
import { useSiteConfig } from "../contexts/SettingsContext";

const SITE_URL = process.env.REACT_APP_SITE_URL || "https://satyamholidays.vercel.app";

const WishlistPage = () => {
  const { packages, loading } = usePackageCatalog();
  const { ids } = useWishlist();
  const recentIds = useRecentlyViewed();
  const { company } = useSiteConfig();

  const byId = useMemo(() => new Map(packages.map((p) => [pkgId(p), p])), [packages]);
  const saved = ids.map((id) => byId.get(id)).filter(Boolean);
  const recent = recentIds
    .filter((id) => !ids.includes(id))
    .map((id) => byId.get(id))
    .filter(Boolean)
    .slice(0, 4);

  const shareMessage = `Hi ${company.name}, I'm interested in these trips:\n${saved
    .map((p) => `• ${p.name} — ${SITE_URL}${pkgHref(p)}`)
    .join("\n")}`;

  return (
    <SiteLayout>
      <Meta
        title={`Saved trips | ${company.name}`}
        description="Your shortlisted holiday packages."
      />

      <header className="border-b border-line">
        <div className="container-site flex flex-col gap-6 py-12 md:flex-row md:items-end md:justify-between md:py-16">
          <div>
            <p className="eyebrow mb-4">Your shortlist</p>
            <h1 className="font-display text-display-lg font-light text-fg">Saved trips</h1>
            <p className="mt-3 text-muted">
              {saved.length > 0
                ? `${saved.length} trip${saved.length > 1 ? "s" : ""} saved on this device.`
                : "Tap the heart on any trip to keep it here."}
            </p>
          </div>
          {saved.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {saved.length > 1 && (
                <Link to="/compare" className="btn btn-ghost">
                  <PiArrowsLeftRight className="h-4 w-4" /> Compare
                </Link>
              )}
              <a
                href={toWhatsApp(company.whatsapp, shareMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-accent"
              >
                <PiWhatsappLogo className="h-4 w-4" /> Send shortlist to a planner
              </a>
            </div>
          )}
        </div>
      </header>

      <div className="container-site py-12 md:py-16">
        {loading ? (
          <PackageGridSkeleton count={3} />
        ) : saved.length === 0 ? (
          <div className="flex flex-col items-center rounded-4xl border border-dashed border-line px-6 py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-raised">
              <PiHeart className="h-6 w-6 text-accent" />
            </span>
            <p className="mt-6 font-display text-3xl text-fg">Nothing saved yet</p>
            <p className="mt-3 max-w-sm text-muted">
              Browse trips and save the ones you like — you can compare them side by side later.
            </p>
            <Link to="/packages" className="btn btn-ink mt-8">
              Browse trips
            </Link>
          </div>
        ) : (
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((pkg) => (
              <PackageCard key={pkgId(pkg)} pkg={pkg} />
            ))}
          </div>
        )}

        {recent.length > 0 && (
          <section className="mt-24 border-t border-line pt-14">
            <h2 className="mb-10 font-display text-3xl text-fg">Recently viewed</h2>
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {recent.map((pkg) => (
                <PackageCard key={pkgId(pkg)} pkg={pkg} size="wide" />
              ))}
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
};

export default WishlistPage;
