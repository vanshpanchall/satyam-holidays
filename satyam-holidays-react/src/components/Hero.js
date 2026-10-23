import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PiMagnifyingGlass, PiMapPin } from "react-icons/pi";
import { useSetting } from "../contexts/SettingsContext";
import Accent from "./ui/Accent";
import Img from "./ui/Img";
import { asArray } from "../utils/format";
import { BUDGETS } from "../pages/packagesFilters";
import Select from "./ui/Select";
import { FcGoogle } from "react-icons/fc";
import useGoogleReviews from "../utils/useGoogleReviews";

const TRIP_TYPES = [
  { value: "", label: "Anywhere" },
  { value: "domestic", label: "Within India" },
  { value: "international", label: "International" },
];
const BUDGET_OPTIONS = [
  { value: "", label: "Any budget" },
  ...BUDGETS.map((b) => ({ value: b.id, label: b.label })),
];

const SLIDE_MS = 7000;

const HeroSearch = ({ suggestions }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    if (budget) params.set("budget", budget);
    navigate(`/packages${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Find a holiday"
      className="grid gap-px overflow-hidden rounded-3xl bg-line text-fg shadow-2xl shadow-ink-950/30 sm:grid-cols-[1.4fr_1fr_1fr_auto]"
    >
      <label className="flex flex-col gap-1 bg-surface px-5 py-3.5">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted">Where to</span>
        <span className="flex items-center gap-2">
          <PiMapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            list="hero-destinations"
            placeholder="Kashmir, Kedarnath, Dubai…"
            className="w-full bg-transparent text-[15px] placeholder:text-muted/70 focus:outline-none"
          />
          <datalist id="hero-destinations">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </span>
      </label>
      <div className="flex flex-col gap-1 bg-surface px-5 py-3.5">
        <span id="hero-type-label" className="text-[11px] uppercase tracking-[0.16em] text-muted">
          Trip type
        </span>
        <Select
          variant="bare"
          value={category}
          onChange={setCategory}
          options={TRIP_TYPES}
          aria-labelledby="hero-type-label"
        />
      </div>
      <div className="flex flex-col gap-1 bg-surface px-5 py-3.5">
        <span id="hero-budget-label" className="text-[11px] uppercase tracking-[0.16em] text-muted">
          Budget / person
        </span>
        <Select
          variant="bare"
          value={budget}
          onChange={setBudget}
          options={BUDGET_OPTIONS}
          aria-labelledby="hero-budget-label"
        />
      </div>
      <div className="bg-surface p-2">
        <button
          type="submit"
          className="btn btn-accent h-full min-h-[3.25rem] w-full rounded-2xl px-6"
        >
          <PiMagnifyingGlass className="h-5 w-5" />
          <span>Search trips</span>
        </button>
      </div>
    </form>
  );
};

const Hero = ({ locations = [] }) => {
  const eyebrow = useSetting("hero.eyebrow");
  const heading = useSetting("hero.heading");
  const subheading = useSetting("hero.subheading");
  const stats = asArray(useSetting("hero.stats")).filter((s) => s && s.label);
  const google = useGoogleReviews();
  const rawImages = useSetting("hero.images");
  const images = useMemo(() => asArray(rawImages).filter((s) => s && s.url), [rawImages]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (active >= images.length) setActive(0);
  }, [active, images.length]);

  useEffect(() => {
    if (images.length < 2) return undefined;
    const timer = setInterval(() => setActive((i) => (i + 1) % images.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, [images.length]);

  const current = images[active % Math.max(images.length, 1)];

  return (
    <section
      id="home"
      className="grain relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink-950 text-white"
    >
      {/* Slides */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        {images.map((img, i) => (
          <div
            key={img.url}
            className={`absolute inset-0 transition-opacity duration-[1.4s] ease-out ${
              i === active ? "opacity-100" : "opacity-0"
            }`}
          >
            {(i === active || i === (active + 1) % images.length) && (
              <Img
                src={img.url}
                alt=""
                width={1920}
                priority={i === 0}
                className={i === active ? "animate-ken-burns" : ""}
              />
            )}
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/60 via-ink-950/20 to-ink-950/85" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/50 to-transparent" />
      </div>

      <div
        className="container-site flex flex-1 flex-col justify-end pb-8 md:pb-12"
        style={{ paddingTop: "calc(var(--header-h, 4.5rem) + 3rem)" }}
      >
        <div className="max-w-4xl animate-fade-up">
          {eyebrow && (
            <p className="mb-6 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-white/75">
              <span className="h-px w-8 bg-saffron-400" />
              {eyebrow}
            </p>
          )}
          <h1 className="text-balance font-display text-display-xl font-light">
            <Accent text={heading} />
          </h1>
          {subheading && (
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-white/80 md:text-lg">
              {subheading}
            </p>
          )}
        </div>

        <div className="mt-10 md:mt-14">
          <HeroSearch suggestions={locations} />
        </div>

        <div className="mt-8 flex flex-col-reverse gap-6 md:flex-row md:items-end md:justify-between md:pr-44">
          {stats.length > 0 && (
            <dl className="flex flex-wrap gap-x-10 gap-y-4">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="font-display text-3xl font-light md:text-4xl">
                    {Number(stat.value).toLocaleString("en-IN")}
                    <span className="text-saffron-400">{stat.suffix}</span>
                  </dd>
                  <p
                    className="mt-1 text-xs uppercase tracking-[0.16em] text-white/60"
                    aria-hidden="true"
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
              {google?.rating > 0 && (
                <div>
                  <dt className="sr-only">Google rating</dt>
                  <dd>
                    <a
                      href={google.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-display text-3xl font-light md:text-4xl"
                    >
                      <FcGoogle
                        className="h-7 w-7 rounded-full bg-white p-0.5"
                        aria-hidden="true"
                      />
                      {google.rating.toFixed(1)}
                      <span className="text-saffron-400">★</span>
                    </a>
                  </dd>
                  <p
                    className="mt-1 text-xs uppercase tracking-[0.16em] text-white/60"
                    aria-hidden="true"
                  >
                    {google.totalReviews.toLocaleString("en-IN")} Google reviews
                  </p>
                </div>
              )}
            </dl>
          )}

          {images.length > 1 && (
            <div className="flex items-center gap-4 text-sm text-white/75">
              <span className="tabular-nums">
                {String(active + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
              </span>
              <div className="flex gap-1.5" role="tablist" aria-label="Hero photos">
                {images.map((img, i) => (
                  <button
                    key={img.url}
                    type="button"
                    role="tab"
                    aria-selected={i === active}
                    aria-label={img.caption || `Photo ${i + 1}`}
                    onClick={() => setActive(i)}
                    className="relative h-1 w-8 overflow-hidden rounded-full bg-white/25"
                  >
                    {i === active && (
                      <span
                        key={active}
                        className="absolute inset-y-0 left-0 bg-white"
                        style={{ animation: `hero-progress ${SLIDE_MS}ms linear forwards` }}
                      />
                    )}
                  </button>
                ))}
              </div>
              {current?.caption && <span className="hidden sm:inline">{current.caption}</span>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Hero;
