import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  PiCheck,
  PiDownloadSimple,
  PiForkKnife,
  PiMapPin,
  PiMoon,
  PiSparkle,
  PiSun,
  PiSunHorizon,
  PiWhatsappLogo,
} from "react-icons/pi";
import SiteLayout from "../components/SiteLayout";
import Meta from "../components/Meta";
import Select from "../components/ui/Select";
import { apiUrl, fetchWithAuth, toastApiError } from "../config/siteConfig";
import { useSiteConfig } from "../contexts/SettingsContext";
import { toWhatsApp } from "../utils/format";

const INTERESTS = [
  "Temples & spiritual",
  "Mountains",
  "Beaches",
  "Heritage",
  "Adventure",
  "Food",
  "Shopping",
  "Slow & relaxed",
];
const SUGGESTIONS = ["Kashmir", "Kerala", "Chardham", "Rajasthan", "Dubai", "Bali"];

const Block = ({ icon: Icon, label, text }) =>
  text ? (
    <div className="grid grid-cols-[2rem_1fr] gap-3">
      <Icon className="mt-0.5 h-5 w-5 text-accent" aria-hidden="true" />
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
        <p className="mt-1 leading-relaxed text-fg">{text}</p>
      </div>
    </div>
  ) : null;

const AiPlannerPage = () => {
  const { company } = useSiteConfig();
  const [destination, setDestination] = useState("");
  const [duration, setDuration] = useState("5");
  const [travelers, setTravelers] = useState("2");
  const [interests, setInterests] = useState([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState(null);
  const [error, setError] = useState(null);

  const toggleInterest = (tag) =>
    setInterests((prev) => (prev.includes(tag) ? prev.filter((i) => i !== tag) : [...prev, tag]));

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!destination.trim()) return;
    setLoading(true);
    setError(null);
    setItinerary(null);

    const mergedInterests =
      [...interests, notes.trim()].filter(Boolean).join(", ") || "General sightseeing";

    try {
      const res = await fetchWithAuth(apiUrl("/api/v1/ai/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, duration, travelers, interests: mergedInterests }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && json.data) {
        setItinerary(json.data);
        window.requestAnimationFrame(() =>
          document
            .getElementById("plan-result")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        );
      } else {
        throw new Error(
          json.error?.message || json.message || "Couldn't create a plan. Please try again."
        );
      }
    } catch (err) {
      setError(err.message);
      toastApiError(err, "Couldn't create a plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    const element = document.getElementById("itinerary-print-area");
    if (!element) return;
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: getComputedStyle(document.body).backgroundColor,
    });
    const link = document.createElement("a");
    link.download = `${destination.trim().replace(/\s+/g, "-").toLowerCase()}-itinerary.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const whatsappMessage = itinerary
    ? `Hi ${company.name}, I made a draft plan on your site — ${itinerary.title} (${itinerary.duration}, ${travelers} travellers). Could you turn it into a quote?`
    : "";

  return (
    <SiteLayout>
      <Meta
        title={`Trip planner | ${company.name}`}
        description="Sketch a day-by-day itinerary for your next holiday in seconds, then have a Satyam Holidays planner turn it into a bookable trip."
      />

      <header className="border-b border-line">
        <div className="container-site py-12 md:py-16">
          <p className="eyebrow mb-4">Trip planner</p>
          <h1 className="max-w-3xl text-balance font-display text-display-lg font-light text-fg">
            Sketch your trip. <em className="accent-italic">We'll make it real.</em>
          </h1>
          <p className="mt-4 max-w-xl text-muted">
            Get a draft day-by-day plan in seconds. It's a starting point — a planner will check
            timings, hotels and prices before anything is booked.
          </p>
        </div>
      </header>

      <div className="container-site grid gap-10 py-12 lg:grid-cols-12">
        <form onSubmit={handleGenerate} className="space-y-6 lg:col-span-4">
          <div className="lg:sticky" style={{ top: "calc(var(--header-h) + 1.5rem)" }}>
            <div className="card space-y-6 p-6">
              <div>
                <label htmlFor="ai-destination" className="label">
                  Where to?
                </label>
                <div className="relative">
                  <PiMapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="ai-destination"
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Kashmir"
                    className="field pl-10"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDestination(s)}
                      className="text-xs text-muted underline-offset-4 hover:text-fg hover:underline"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ai-days" className="label">
                    Days
                  </label>
                  <Select
                    id="ai-days"
                    value={duration}
                    onChange={setDuration}
                    options={[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14].map((d) => ({
                      value: String(d),
                      label: `${d} days`,
                    }))}
                  />
                </div>
                <div>
                  <label htmlFor="ai-travellers" className="label">
                    Travellers
                  </label>
                  <Select
                    id="ai-travellers"
                    value={travelers}
                    onChange={setTravelers}
                    options={["1", "2", "3", "4", "5+"].map((t) => ({
                      value: t,
                      label: t === "5+" ? "5 or more" : t,
                    }))}
                  />
                </div>
              </div>

              <fieldset>
                <legend className="label">What do you enjoy?</legend>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleInterest(tag)}
                      aria-pressed={interests.includes(tag)}
                      className={`chip h-8 px-3 text-[13px] ${interests.includes(tag) ? "chip-active" : ""}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="ai-notes" className="label">
                  Anything else?
                </label>
                <textarea
                  id="ai-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Pure-veg food, travelling with parents, budget hotels…"
                  className="field resize-none text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !destination.trim()}
                className="btn btn-accent btn-lg w-full"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Drafting your plan…
                  </>
                ) : (
                  <>
                    <PiSparkle className="h-4 w-4" /> Create my plan
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <section id="plan-result" className="anchor lg:col-span-8" aria-live="polite">
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
            >
              {error}
            </div>
          )}

          {!itinerary && !loading && (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-4xl border border-dashed border-line p-10 text-center">
              <PiSparkle className="h-8 w-8 text-accent" />
              <p className="mt-5 font-display text-3xl text-fg">Your plan will appear here</p>
              <p className="mt-3 max-w-sm text-muted">
                Pick a destination and a few interests, then hit “Create my plan”.
              </p>
            </div>
          )}

          {loading && (
            <div className="space-y-4" role="status" aria-label="Creating plan">
              <div className="skeleton h-32 rounded-3xl" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-40 rounded-3xl" />
              ))}
            </div>
          )}

          {itinerary && (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  Draft plan · review with a planner before booking
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={handleDownload} className="btn btn-ghost h-10">
                    <PiDownloadSimple className="h-4 w-4" /> Save image
                  </button>
                  <a
                    href={toWhatsApp(company.whatsapp, whatsappMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-accent h-10"
                  >
                    <PiWhatsappLogo className="h-4 w-4" /> Get a quote
                  </a>
                </div>
              </div>

              <article
                id="itinerary-print-area"
                className="rounded-4xl border border-line bg-surface p-6 md:p-10"
              >
                <header className="border-b border-line pb-8">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
                    {itinerary.destination} · {itinerary.duration} · {travelers} traveller
                    {travelers === "1" ? "" : "s"}
                  </p>
                  <h2 className="mt-3 font-display text-4xl font-light text-fg">
                    {itinerary.title}
                  </h2>
                  {itinerary.summary && (
                    <p className="mt-4 max-w-2xl leading-relaxed text-muted">{itinerary.summary}</p>
                  )}
                </header>

                <ol className="divide-y divide-line">
                  {itinerary.itinerary?.map((day) => (
                    <li key={day.day} className="grid gap-6 py-8 md:grid-cols-[6rem_1fr]">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Day</p>
                        <p className="font-display text-5xl font-light text-accent">
                          {String(day.day).padStart(2, "0")}
                        </p>
                      </div>
                      <div className="space-y-5">
                        <div>
                          <h3 className="font-display text-2xl text-fg">{day.title}</h3>
                          {day.description && (
                            <p className="mt-2 leading-relaxed text-muted">{day.description}</p>
                          )}
                        </div>
                        <div className="space-y-4">
                          <Block icon={PiSunHorizon} label="Morning" text={day.morning} />
                          <Block icon={PiSun} label="Afternoon" text={day.afternoon} />
                          <Block icon={PiMoon} label="Evening" text={day.evening} />
                        </div>
                        {(day.activity || day.meals?.length > 0) && (
                          <div className="flex flex-wrap gap-2 pt-1 text-sm">
                            {day.activity && (
                              <span className="rounded-full bg-saffron-500/10 px-3 py-1 text-saffron-800 dark:text-saffron-300">
                                {day.activity}
                              </span>
                            )}
                            {day.meals?.length > 0 && (
                              <span className="flex items-center gap-1.5 rounded-full bg-raised px-3 py-1 text-muted">
                                <PiForkKnife className="h-3.5 w-3.5" /> {day.meals.join(", ")}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>

                <footer className="grid gap-8 border-t border-line pt-8 md:grid-cols-2">
                  {itinerary.travelTips?.length > 0 && (
                    <div>
                      <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-muted">
                        Good to know
                      </p>
                      <ul className="space-y-2">
                        {itinerary.travelTips.map((tip) => (
                          <li key={tip} className="flex gap-2 text-sm text-fg">
                            <PiCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {itinerary.estimatedCostInfo && (
                    <div className="rounded-3xl bg-raised p-6">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
                        Rough estimate
                      </p>
                      <p className="mt-2 font-display text-2xl text-fg">
                        {itinerary.estimatedCostInfo}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-muted">
                        Indicative only. Actual prices depend on dates, hotels, flights and
                        availability.
                      </p>
                    </div>
                  )}
                </footer>
              </article>

              <div className="mt-8 flex flex-col items-start gap-4 rounded-3xl bg-ink-900 p-8 text-white md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-display text-2xl">Like the look of it?</p>
                  <p className="mt-1 text-white/70">
                    A planner can price it and hold hotels for your dates.
                  </p>
                </div>
                <Link to="/#enquiry" className="btn btn-light">
                  Send an enquiry
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </SiteLayout>
  );
};

export default AiPlannerPage;
