import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { PiArrowUpRight, PiSealCheck, PiStarFill } from "react-icons/pi";
import { useSetting } from "../../contexts/SettingsContext";
import { apiUrl } from "../../config/siteConfig";
import SectionHeader from "../ui/SectionHeader";
import { asArray } from "../../utils/format";
import useGoogleReviews from "../../utils/useGoogleReviews";

const Stars = ({ rating, size = "h-4 w-4" }) => (
  <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
    {Array.from({ length: 5 }, (_, i) => (
      <PiStarFill
        key={i}
        aria-hidden="true"
        className={`${size} ${i < Math.round(rating) ? "text-saffron-500" : "text-line"}`}
      />
    ))}
  </div>
);

/** Rating summary with the attribution Google requires (source named, links back to the listing). */
const GoogleSummary = ({ google }) => (
  <div className="flex flex-col items-start gap-3 md:items-end">
    {google.rating ? (
      <a
        href={google.mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-full border border-line bg-surface py-2 pl-3 pr-5 transition hover:border-fg/40"
      >
        <FcGoogle className="h-6 w-6" aria-hidden="true" />
        <span className="text-2xl font-semibold text-fg">{google.rating.toFixed(1)}</span>
        <span className="text-left">
          <Stars rating={google.rating} size="h-3.5 w-3.5" />
          <span className="block text-xs text-muted">
            {google.totalReviews.toLocaleString("en-IN")} reviews on Google
          </span>
        </span>
      </a>
    ) : (
      <a href={google.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
        <FcGoogle className="h-5 w-5" aria-hidden="true" /> Read our Google reviews
      </a>
    )}
    {google.writeReviewUrl && (
      <a
        href={google.writeReviewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
      >
        Travelled with us? Leave a Google review
      </a>
    )}
  </div>
);

const Card = ({ t }) => (
  <figure className="card flex w-[85vw] shrink-0 snap-start flex-col justify-between p-7 sm:w-[60vw] md:w-auto md:p-8">
    <div>
      <div className="flex items-center justify-between">
        <Stars rating={t.rating} />
        {t.source === "google" ? (
          <FcGoogle className="h-5 w-5" aria-label="Google review" />
        ) : (
          <span
            aria-hidden="true"
            className="font-display text-5xl leading-none text-saffron-500/40"
          >
            “
          </span>
        )}
      </div>
      {t.title && <p className="mt-5 font-medium text-fg">{t.title}</p>}
      <blockquote className="mt-3 text-pretty leading-relaxed text-muted">
        <p className="line-clamp-6 whitespace-pre-line">{t.comment}</p>
      </blockquote>
      {t.source === "google" && t.link && (
        <a
          href={t.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
        >
          Read on Google <PiArrowUpRight className="h-3 w-3" />
        </a>
      )}
    </div>
    <figcaption className="mt-8 flex items-center gap-3 border-t border-line pt-5">
      {t.photo ? (
        <img
          src={t.photo}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          className="h-10 w-10 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-saffron-100 font-display text-lg text-saffron-800 dark:bg-saffron-900/40 dark:text-saffron-200">
          {t.name.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-medium text-fg">
          {t.authorUrl ? (
            <a
              href={t.authorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate hover:underline"
            >
              {t.name}
            </a>
          ) : (
            <span className="truncate">{t.name}</span>
          )}
          {t.verified && (
            <PiSealCheck
              className="h-4 w-4 shrink-0 text-emerald-600"
              aria-label="Verified traveller"
            />
          )}
        </p>
        {t.meta &&
          (t.href ? (
            <Link to={t.href} className="block truncate text-sm text-muted hover:text-fg">
              {t.meta}
            </Link>
          ) : (
            <p className="truncate text-sm text-muted">{t.meta}</p>
          ))}
      </div>
    </figcaption>
  </figure>
);

/**
 * Real reviews only: Google reviews (when configured), approved 4–5★ package reviews from this
 * site, and testimonials the team added in Admin → Settings. Renders nothing when there are none.
 */
const Testimonials = () => {
  const manual = useSetting("home.testimonials");
  const google = useGoogleReviews();
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl("/api/reviews/featured?limit=6"), { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => json?.success && Array.isArray(json.data) && setReviews(json.data))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const showGoogle = google && (google.rating || google.mapsUrl);

  const items = useMemo(() => {
    const fromGoogle = asArray(google?.reviews)
      .filter((r) => r.text)
      .map((r) => ({
        id: r.id,
        source: "google",
        name: r.author.name,
        authorUrl: r.author.url,
        photo: r.author.photo,
        comment: r.text,
        rating: r.rating,
        meta: r.relativeTime ? `${r.relativeTime} on Google` : "Google review",
        link: r.googleMapsUri,
      }));
    const fromSettings = asArray(manual)
      .filter((t) => t && t.quote && t.name)
      .map((t, i) => ({
        id: `manual-${i}`,
        name: t.name,
        comment: t.quote,
        rating: Number(t.rating) || 5,
        meta: t.trip || t.source || "",
      }));
    const fromSite = reviews.map((r) => ({
      id: r.id,
      name: r.name,
      title: r.title,
      comment: r.comment,
      rating: r.rating,
      meta: r.package?.name || "",
      href: r.package?.slug ? `/packages/${r.package.slug}` : null,
      verified: r.verified,
    }));
    return [...fromGoogle, ...fromSettings, ...fromSite].slice(0, 6);
  }, [google, manual, reviews]);

  if (!items.length && !showGoogle) return null;

  return (
    <section className="section border-t border-line">
      <div className="container-site">
        <SectionHeader
          eyebrow="In their words"
          title="Notes from people *who've travelled with us.*"
          action={showGoogle ? <GoogleSummary google={google} /> : null}
        />

        {items.length > 0 && (
          <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-4 scrollbar-none md:mx-0 md:scroll-px-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
            {items.map((t) => (
              <Card key={t.id} t={t} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Testimonials;
