import React, { memo } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { PiArrowUpRight, PiHeart, PiHeartFill, PiStarFill } from "react-icons/pi";
import Img from "./ui/Img";
import { formatINR, parseNights, pkgHref, pkgId, startingPrice } from "../utils/format";
import { useWishlist } from "../utils/savedTrips";

const departureBadge = (pkg) => {
  const upcoming = (pkg.availableDates || []).filter(
    (d) => new Date(d.startDate) > new Date() && d.status !== "sold_out"
  );
  if (upcoming.some((d) => d.status === "filling_fast")) return "Filling fast";
  if (upcoming.length) return `${upcoming.length} departure${upcoming.length > 1 ? "s" : ""}`;
  return null;
};

const PackageCard = memo(function PackageCard({ pkg, size = "default", priority = false }) {
  const { has, toggle } = useWishlist();
  const id = pkgId(pkg);
  const saved = has(id);
  const nights = parseNights(pkg.duration);
  const price = startingPrice(pkg);
  const badge = departureBadge(pkg);

  return (
    <article className="group relative">
      <Link
        to={pkgHref(pkg)}
        className="block focus:outline-none"
        aria-label={`${pkg.name}, ${pkg.location}`}
      >
        <div
          className={`relative overflow-hidden rounded-3xl ${
            size === "wide" ? "aspect-[4/3]" : "aspect-[4/5]"
          }`}
        >
          <Img
            src={pkg.image}
            alt={pkg.name}
            width={720}
            priority={priority}
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
            className="transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.06]"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-950/70 to-transparent" />

          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium capitalize text-ink-900 backdrop-blur">
              {pkg.subcategory || pkg.category}
            </span>
            {badge && (
              <span className="rounded-full bg-saffron-500 px-3 py-1 text-[11px] font-medium text-white">
                {badge}
              </span>
            )}
          </div>

          <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-white">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/75">
                {nights > 0 ? `${nights}N / ${nights + 1}D` : pkg.duration}
              </p>
              <p className="mt-1 truncate text-sm text-white/90">{pkg.location}</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink-900 transition-transform duration-500 ease-out-expo group-hover:rotate-45">
              <PiArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </div>

        <div className="px-1 pt-4">
          <h3 className="font-display text-xl leading-snug text-fg [font-variation-settings:'opsz'_48]">
            {pkg.name}
          </h3>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm">
            <p className="text-muted">
              {price > 0 ? (
                <>
                  from <span className="font-medium text-fg">{formatINR(price)}</span>
                  <span className="text-xs"> / person</span>
                </>
              ) : (
                <span className="font-medium text-fg">{pkg.price}</span>
              )}
            </p>
            {pkg.rating > 0 && (
              <p className="flex items-center gap-1 text-muted">
                <PiStarFill className="h-3.5 w-3.5 text-saffron-500" aria-hidden="true" />
                <span className="font-medium text-fg">{Number(pkg.rating).toFixed(1)}</span>
                {pkg.reviews > 0 && <span className="text-xs">({pkg.reviews})</span>}
              </p>
            )}
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={() => toggle(id)}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${pkg.name} from wishlist` : `Save ${pkg.name} to wishlist`}
        className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition ${
          saved ? "bg-saffron-500 text-white" : "bg-white/90 text-ink-900 hover:bg-white"
        }`}
      >
        {saved ? <PiHeartFill className="h-4 w-4" /> : <PiHeart className="h-4 w-4" />}
      </button>
    </article>
  );
});

PackageCard.propTypes = {
  pkg: PropTypes.shape({
    name: PropTypes.string.isRequired,
    location: PropTypes.string,
    price: PropTypes.string,
    numericPrice: PropTypes.number,
    rating: PropTypes.number,
    reviews: PropTypes.number,
    duration: PropTypes.string,
    image: PropTypes.string,
    category: PropTypes.string,
    subcategory: PropTypes.string,
  }).isRequired,
  size: PropTypes.oneOf(["default", "wide"]),
  priority: PropTypes.bool,
};

export default PackageCard;
