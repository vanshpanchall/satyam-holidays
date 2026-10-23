import React from "react";
import { Link } from "react-router-dom";

const FALLBACK = [
  "Kedarnath",
  "Srinagar",
  "Gulmarg",
  "Munnar",
  "Udaipur",
  "Andaman",
  "Dubai",
  "Singapore",
  "Phuket",
  "Bali",
  "Kathmandu",
  "Hanoi",
];

/** Slow-scrolling strip of destination names, drawn from the live catalogue when available. */
const DestinationStrip = ({ locations = [] }) => {
  const names = (locations.length >= 6 ? locations : FALLBACK).slice(0, 16);
  const row = [...names, ...names];

  return (
    <section aria-label="Destinations we cover" className="border-b border-line bg-surface py-6">
      <div className="mask-fade-x overflow-hidden">
        <ul className="pause-on-hover flex w-max animate-marquee items-center">
          {row.map((name, i) => (
            <li key={`${name}-${i}`} aria-hidden={i >= names.length} className="flex items-center">
              <Link
                to={`/packages?q=${encodeURIComponent(name)}`}
                tabIndex={i >= names.length ? -1 : 0}
                className="px-6 font-display text-2xl font-light text-fg/80 transition-colors hover:text-accent md:px-10 md:text-[2rem]"
              >
                {name}
              </Link>
              <span className="h-1.5 w-1.5 rounded-full bg-saffron-500/70" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default DestinationStrip;
