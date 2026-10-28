import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  PiArrowLeft,
  PiCalendarBlank,
  PiCaretDown,
  PiCheck,
  PiClock,
  PiDownloadSimple,
  PiFilePdf,
  PiForkKnife,
  PiHeart,
  PiHeartFill,
  PiMapPin,
  PiMinus,
  PiIdentificationCard,
  PiPlus,
  PiShareNetwork,
  PiShieldCheck,
  PiStarFill,
  PiTag,
  PiWhatsappLogo,
  PiX,
} from "react-icons/pi";
import SiteLayout from "../components/SiteLayout";
import Meta from "../components/Meta";
import Img from "../components/ui/Img";
import Select from "../components/ui/Select";
import CaptchaFit from "../components/ui/CaptchaFit";
import PackageCard from "../components/PackageCard";
import ReviewList from "../components/ReviewList";
import ReviewForm from "../components/ReviewForm";
import { PackageDetailSkeleton } from "../components/SkeletonLoaders";
import { apiUrl, fetchWithAuth, safeJson, toastApiError } from "../config/siteConfig";
import { useSiteConfig } from "../contexts/SettingsContext";
import { lazyWithRecovery } from "../utils/lazyWithRecovery";
import usePackageCatalog from "../utils/usePackageCatalog";
import { trackRecentlyViewed, useWishlist } from "../utils/savedTrips";
import {
  formatINR,
  imageUrl,
  parseNights,
  pkgId,
  startingPrice,
  toWhatsApp,
} from "../utils/format";

const ReCAPTCHA = lazyWithRecovery(() => import("react-google-recaptcha"), "enquiry-recaptcha");
const HCaptcha = lazyWithRecovery(() => import("@hcaptcha/react-hcaptcha"), "enquiry-hcaptcha");

const SITE_URL = process.env.REACT_APP_SITE_URL || "https://satyamholidays.vercel.app";

const fmtDate = (d, opts = { day: "numeric", month: "short", year: "numeric" }) =>
  new Date(d).toLocaleDateString("en-IN", opts);

const DEPARTURE_STATUS = {
  available: { label: "Available", className: "text-emerald-700 dark:text-emerald-400" },
  filling_fast: { label: "Filling fast", className: "text-saffron-600 dark:text-saffron-400" },
  sold_out: { label: "Sold out", className: "text-muted line-through" },
};

/* ── Gallery with lightbox ─────────────────────────────── */
const Gallery = ({ images, name }) => {
  const [open, setOpen] = useState(null);
  const touchX = useRef(0);

  useEffect(() => {
    if (open === null) return undefined;
    document.body.classList.add("modal-open");
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setOpen((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [open, images.length]);

  const tiles = images.slice(0, 5);
  const layouts = {
    1: ["col-span-4 row-span-2"],
    2: ["col-span-4 md:col-span-2 row-span-2", "hidden md:block md:col-span-2 row-span-2"],
    3: [
      "col-span-4 md:col-span-2 row-span-2",
      "hidden md:block md:col-span-2",
      "hidden md:block md:col-span-2",
    ],
    4: [
      "col-span-4 md:col-span-2 row-span-2",
      "hidden md:block md:col-span-2",
      "hidden md:block",
      "hidden md:block",
    ],
    5: [
      "col-span-4 md:col-span-2 row-span-2",
      "hidden md:block",
      "hidden md:block",
      "hidden md:block",
      "hidden md:block",
    ],
  }[tiles.length];

  return (
    <>
      <div className="grid h-[52vh] min-h-[320px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-4xl md:h-[64vh]">
        {tiles.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setOpen(i)}
            className={`group relative overflow-hidden ${layouts[i]}`}
            aria-label={`Open photo ${i + 1} of ${images.length}`}
          >
            <Img
              src={src}
              alt={i === 0 ? name : ""}
              width={i === 0 ? 1600 : 800}
              priority={i === 0}
              sizes={i === 0 ? "(max-width: 768px) 100vw, 50vw" : "25vw"}
              className="transition-transform duration-700 group-hover:scale-[1.04]"
            />
            {/* Phones only show the first tile, so the count badge moves onto it there */}
            {images.length > 1 && (i === 0 || i === tiles.length - 1) && (
              <span
                className={`absolute bottom-4 right-4 rounded-full bg-white/95 px-4 py-2 text-sm text-ink-900 shadow ${
                  i === 0 ? "md:hidden" : "hidden md:inline"
                }`}
              >
                View {images.length} photos
              </span>
            )}
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-[70] flex flex-col bg-ink-950/95"
        >
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm tabular-nums">
              {open + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="icon-btn border-white/30 text-white"
              aria-label="Close"
            >
              <PiX className="h-5 w-5" />
            </button>
          </div>
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6"
            onTouchStart={(e) => {
              touchX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (images.length < 2 || Math.abs(dx) < 50) return;
              setOpen((i) => (i + (dx < 0 ? 1 : -1) + images.length) % images.length);
            }}
          >
            <img
              src={imageUrl(images[open], 1920)}
              alt=""
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setOpen((i) => (i - 1 + images.length) % images.length)}
                  className="icon-btn absolute left-4 border-white/30 bg-ink-950/40 text-white"
                  aria-label="Previous photo"
                >
                  <PiArrowLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen((i) => (i + 1) % images.length)}
                  className="icon-btn absolute right-4 rotate-180 border-white/30 bg-ink-950/40 text-white"
                  aria-label="Next photo"
                >
                  <PiArrowLeft className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

/* ── Itinerary accordion ───────────────────────────────── */
const Itinerary = ({ days, pdfUrl }) => {
  const [openDays, setOpenDays] = useState(() => new Set([days[0]?.day]));
  const allOpen = openDays.size === days.length;
  const toggle = (day) =>
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <a
          href={pdfUrl}
          className="inline-flex items-center gap-1.5 text-sm text-accent underline-offset-4 hover:underline"
        >
          <PiDownloadSimple className="h-4 w-4" /> Download as PDF
        </a>
        <button
          type="button"
          onClick={() => setOpenDays(allOpen ? new Set() : new Set(days.map((d) => d.day)))}
          className="text-sm text-muted underline underline-offset-4 hover:text-fg"
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>
      <ol className="relative ml-4 border-l border-line pl-8">
        {days.map((day) => {
          const open = openDays.has(day.day);
          return (
            <li key={day.day} className="relative pb-6 last:pb-0">
              <span
                className={`absolute -left-[3rem] top-1 flex h-8 w-8 items-center justify-center rounded-full border font-display text-sm transition ${
                  open ? "border-fg bg-fg text-page" : "border-line bg-page text-muted"
                }`}
              >
                {day.day}
              </span>
              <button
                type="button"
                onClick={() => toggle(day.day)}
                aria-expanded={open}
                className="flex w-full items-start justify-between gap-4 text-left"
              >
                <span>
                  <span className="text-[11px] uppercase tracking-[0.16em] text-muted">
                    Day {day.day}
                  </span>
                  <span className="mt-1 block font-display text-xl text-fg">{day.title}</span>
                </span>
                <PiCaretDown
                  className={`mt-6 h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-500 ease-out-expo ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
              >
                <div className="overflow-hidden">
                  <p className="pt-3 leading-relaxed text-muted">{day.description}</p>
                  {day.meals?.length > 0 && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-fg">
                      <PiForkKnife className="h-4 w-4 text-accent" /> {day.meals.join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

const Section = ({ id, title, children }) => (
  <section
    id={id}
    className="anchor border-t border-line py-10 first-of-type:border-t-0 first-of-type:pt-0 sm:py-12"
  >
    <h2 className="mb-6 font-display text-2xl text-fg sm:text-3xl">{title}</h2>
    {children}
  </section>
);

/* ── Page ─────────────────────────────────────────────── */
const PackageLandingPage = () => {
  const { slug } = useParams();
  const siteConfig = useSiteConfig();
  const { has, toggle } = useWishlist();
  const { packages: catalog } = usePackageCatalog();
  const bookingRef = useRef(null);
  const [bookingInView, setBookingInView] = useState(false);

  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pricing calculator state
  const [selectedDate, setSelectedDate] = useState("");
  const [travelersCount, setTravelersCount] = useState(2);
  const [promoCode, setPromoCode] = useState("");
  const [priceData, setPriceData] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [insuranceEnabled, setInsuranceEnabled] = useState(false);
  const [visaRequested, setVisaRequested] = useState(false);

  // Booking enquiry state
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const recaptchaRef = useRef(null);

  const PROVIDER = (process.env.REACT_APP_CAPTCHA_PROVIDER || "recaptcha_v2").toLowerCase();
  const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || "";
  const HCAPTCHA_SITE_KEY = process.env.REACT_APP_HCAPTCHA_SITE_KEY || "";
  const useCaptcha =
    (PROVIDER.startsWith("hcaptcha") && HCAPTCHA_SITE_KEY) ||
    (PROVIDER.startsWith("recaptcha") && RECAPTCHA_SITE_KEY);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setPriceData(null);
    setSelectedDate("");
    setEnquirySuccess(false);

    fetch(apiUrl(`/api/v1/packages/slug/${slug}`), { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success || !json.data) throw new Error("Package not found");
        setPkg(json.data);
        trackRecentlyViewed(pkgId(json.data));
      })
      .catch((err) => err.name !== "AbortError" && setError(err.message))
      .finally(() => !controller.signal.aborted && setLoading(false));

    return () => controller.abort();
  }, [slug]);

  // Structured data (JSON-LD) for search engines
  useEffect(() => {
    if (!pkg) return undefined;
    // Replace the copy written by the build-time pre-renderer (scripts/prerender.js)
    document.getElementById("structured-package-schema")?.remove();
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "structured-package-schema";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "TouristTrip",
      name: pkg.name,
      description: pkg.description,
      touristType: pkg.subcategory,
      itinerary: pkg.itinerary?.map((day) => ({
        "@type": "TouristAttraction",
        name: day.title,
        description: day.description,
      })),
      ...(pkg.rating && pkg.reviews
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: pkg.rating,
              reviewCount: pkg.reviews,
            },
          }
        : {}),
      offers: {
        "@type": "Offer",
        price: startingPrice(pkg),
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/packages/${pkg.slug || pkgId(pkg)}`,
        seller: { "@type": "TravelAgency", name: siteConfig.company.name, url: SITE_URL },
      },
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, [pkg, siteConfig.company.name]);

  // Recalculate price when inputs change (debounced)
  useEffect(() => {
    if (!pkg) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCalcLoading(true);
      try {
        const res = await fetchWithAuth(apiUrl(`/api/v1/packages/${pkgId(pkg)}/calculate-price`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: selectedDate, travelersCount, promoCode }),
          signal: controller.signal,
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) setPriceData(json.data);
        }
      } catch (err) {
        // Keep the client-side estimate if the calculator is unreachable
      } finally {
        if (!controller.signal.aborted) setCalcLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pkg, selectedDate, travelersCount, promoCode]);

  // The mobile booking bar would cover the booking form itself, so it steps aside while that's on screen
  useEffect(() => {
    const el = bookingRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => setBookingInView(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, [pkg, loading]);

  const departures = useMemo(
    () =>
      (pkg?.availableDates || [])
        .filter((d) => new Date(d.startDate) >= new Date(new Date().toDateString()))
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate)),
    [pkg]
  );

  const related = useMemo(() => {
    if (!pkg) return [];
    const id = pkgId(pkg);
    return catalog
      .filter((p) => pkgId(p) !== id && p.category === pkg.category)
      .sort(
        (a, b) =>
          Number(b.subcategory === pkg.subcategory) - Number(a.subcategory === pkg.subcategory)
      )
      .slice(0, 3);
  }, [catalog, pkg]);

  if (loading) return <PackageDetailSkeleton />;

  if (error || !pkg) {
    return (
      <SiteLayout>
        <div className="container-site flex min-h-[60vh] flex-col items-start justify-center py-20">
          <p className="eyebrow mb-4">Not found</p>
          <h1 className="font-display text-display-md">This trip isn't available any more.</h1>
          <p className="mt-4 max-w-md text-muted">
            It may have been retired or renamed. Have a look at what's running now.
          </p>
          <Link to="/packages" className="btn btn-ink mt-8">
            Browse all trips
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const id = pkgId(pkg);
  const saved = has(id);
  const nights = parseNights(pkg.duration);
  const unit = startingPrice(pkg);
  const images = [pkg.image, ...(pkg.gallery || [])].filter(Boolean);
  const isInternational = pkg.category === "international";
  const insuranceRate = isInternational ? 1999 : 499;
  const insuranceCost = insuranceEnabled ? insuranceRate * travelersCount : 0;
  const baseCost = priceData ? priceData.finalTotalPrice : unit * travelersCount;
  const finalDisplayPrice = baseCost + insuranceCost;
  const pageUrl = `${SITE_URL}/packages/${pkg.slug || id}`;
  const whatsappMsg = `Hi ${siteConfig.company.name}, I'm interested in "${pkg.name}"${
    selectedDate ? ` departing ${fmtDate(selectedDate)}` : ""
  } for ${travelersCount} traveller${travelersCount > 1 ? "s" : ""}. ${pageUrl}`;

  const navItems = [
    { id: "overview", label: "Overview" },
    pkg.itinerary?.length && { id: "itinerary", label: "Itinerary" },
    (pkg.inclusions?.length || pkg.exclusions?.length) && {
      id: "inclusions",
      label: "What's included",
    },
    departures.length && { id: "dates", label: "Dates" },
    { id: "reviews", label: "Reviews" },
  ].filter(Boolean);

  // Printable itinerary generated by the API (also shareable as a plain link)
  const pdfUrl = apiUrl(`/api/v1/packages/slug/${pkg.slug || id}/itinerary.pdf`);
  const absolutePdfUrl = /^https?:/.test(pdfUrl) ? pdfUrl : `${window.location.origin}${pdfUrl}`;

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: pkg.name,
          text: pkg.description?.slice(0, 120),
          url: pageUrl,
        });
      } else {
        await navigator.clipboard.writeText(pageUrl);
        toast.success("Link copied");
      }
    } catch {
      // user cancelled share sheet
    }
  };

  const scrollToBooking = () =>
    bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.email) {
      toast.error("Please add your name, phone and email.");
      return;
    }
    setEnquirySubmitting(true);

    try {
      let currentToken = captchaToken;
      if (PROVIDER === "recaptcha_v3" && RECAPTCHA_SITE_KEY && recaptchaRef.current) {
        try {
          currentToken = (await recaptchaRef.current.executeAsync()) || "";
          setCaptchaToken(currentToken);
        } catch (_) {
          // backend rejects if a token is required
        }
      }
      if (useCaptcha && !currentToken) {
        throw new Error("Please complete the verification first.");
      }

      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        destination: isInternational ? "international" : "domestic",
        travelDate: selectedDate || undefined,
        travelers: travelersCount >= 5 ? "5+" : String(travelersCount),
        budget: isInternational ? "50k-1l" : "20k-50k",
        message:
          `${form.message}\n\n[Inquired via Package Page: ${pkg.name}]\n- Estimated total: INR ${finalDisplayPrice}\n- Insurance requested: ${
            insuranceEnabled ? "Yes" : "No"
          }\n- Visa help requested: ${visaRequested ? "Yes" : "No"}${
            priceData?.promoApplied ? `\n- Promo: ${promoCode}` : ""
          }`.slice(0, 1000),
        visaRequired: visaRequested,
        travelInsurance: insuranceEnabled,
        referralCodeUsed: promoCode || undefined,
        source: "package-page",
        captchaToken: currentToken || undefined,
      };

      const res = await fetchWithAuth(apiUrl("/api/v1/enquiries"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await safeJson(res);
      if (res.ok && json.success) {
        setEnquirySuccess(true);
        setForm({ name: "", email: "", phone: "", message: "" });
        setCaptchaToken("");
        toast.success("Request sent — we'll call you shortly.");
      } else {
        toastApiError(json, "Couldn't send your request");
      }
    } catch (err) {
      toastApiError(err, "Couldn't send your request");
    } finally {
      setEnquirySubmitting(false);
    }
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <SiteLayout floatingRaised>
      <Meta
        title={`${pkg.name} — ${pkg.duration} | ${siteConfig.company.name}`}
        description={`${pkg.name}: ${pkg.duration} in ${pkg.location}. ${String(pkg.description || "").slice(0, 140)}`}
        image={imageUrl(pkg.image, 1200)}
        url={pageUrl}
      />

      <div className="container-site pb-16 pt-6 md:pt-10">
        {/* Breadcrumb + title */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link to="/" className="hover:text-fg">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to={`/packages?category=${pkg.category}`} className="hover:text-fg">
                {isInternational ? "International" : "India"}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="min-w-0 max-w-full truncate text-fg" aria-current="page">
              {pkg.name}
            </li>
          </ol>
        </nav>

        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-sm text-muted">
              <PiMapPin className="h-4 w-4 text-accent" /> {pkg.location}
            </p>
            <h1 className="mt-3 text-balance font-display text-display-lg font-light text-fg">
              {pkg.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <PiClock className="h-4 w-4" />{" "}
                {nights > 0 ? `${nights} nights · ${nights + 1} days` : pkg.duration}
              </span>
              {pkg.rating > 0 && (
                <a href="#reviews" className="flex items-center gap-1.5 hover:text-fg">
                  <PiStarFill className="h-4 w-4 text-saffron-500" />
                  <span className="text-fg">{Number(pkg.rating).toFixed(1)}</span>
                  {pkg.reviews > 0 && `(${pkg.reviews} reviews)`}
                </a>
              )}
              {pkg.visa && (
                <span className="flex items-center gap-1.5">
                  <PiIdentificationCard className="h-4 w-4" /> {pkg.visa}
                </span>
              )}
              {pkg.hasOffers && (
                <span className="flex items-center gap-1.5 text-accent">
                  <PiTag className="h-4 w-4" /> Offers available
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={pdfUrl} className="btn btn-ghost" aria-label="Download itinerary as PDF">
              <PiFilePdf className="h-4 w-4" /> <span>Itinerary PDF</span>
            </a>
            <button
              type="button"
              onClick={() => toggle(id)}
              aria-pressed={saved}
              className={`btn ${saved ? "btn-accent" : "btn-ghost"}`}
            >
              {saved ? <PiHeartFill className="h-4 w-4" /> : <PiHeart className="h-4 w-4" />}
              {saved ? "Saved" : "Save"}
            </button>
            <button
              type="button"
              onClick={share}
              className="btn btn-ghost"
              aria-label="Share this trip"
            >
              <PiShareNetwork className="h-4 w-4" /> <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>

        <Gallery images={images} name={pkg.name} />

        <div className="mt-10 grid gap-12 md:mt-12 lg:grid-cols-12">
          {/* Content — min-w-0 so the horizontally scrolling section nav can't widen the column */}
          <div className="min-w-0 lg:col-span-7 xl:col-span-8">
            <nav
              aria-label="On this page"
              className="sticky z-20 -mx-4 mb-10 overflow-x-auto border-b border-line bg-page px-4 scrollbar-none sm:mx-0 sm:px-0"
              style={{ top: "var(--header-h)" }}
            >
              <ul className="flex gap-6">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="block whitespace-nowrap border-b-2 border-transparent py-4 text-sm text-muted hover:border-fg hover:text-fg"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <Section id="overview" title="Overview">
              <p className="whitespace-pre-line text-pretty text-lg leading-relaxed text-muted">
                {pkg.description}
              </p>
              {pkg.highlights?.length > 0 && (
                <ul className="mt-8 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {pkg.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-3 text-fg">
                      <PiCheck className="mt-1 h-4 w-4 shrink-0 text-accent" /> {h}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {pkg.itinerary?.length > 0 && (
              <Section id="itinerary" title="Day by day">
                <Itinerary
                  days={[...pkg.itinerary].sort((a, b) => a.day - b.day)}
                  pdfUrl={pdfUrl}
                />
              </Section>
            )}

            {(pkg.inclusions?.length > 0 || pkg.exclusions?.length > 0) && (
              <Section id="inclusions" title="What's included">
                <div className="grid gap-8 sm:grid-cols-2">
                  {pkg.inclusions?.length > 0 && (
                    <div>
                      <p className="mb-4 text-[11px] uppercase tracking-[0.16em] text-muted">
                        Included
                      </p>
                      <ul className="space-y-3">
                        {pkg.inclusions.map((item) => (
                          <li key={item} className="flex items-start gap-3 text-fg">
                            <PiCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-600" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {pkg.exclusions?.length > 0 && (
                    <div>
                      <p className="mb-4 text-[11px] uppercase tracking-[0.16em] text-muted">
                        Not included
                      </p>
                      <ul className="space-y-3">
                        {pkg.exclusions.map((item) => (
                          <li key={item} className="flex items-start gap-3 text-muted">
                            <PiX className="mt-1 h-4 w-4 shrink-0 text-red-500" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {departures.length > 0 && (
              <Section id="dates" title="Upcoming departures">
                <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line">
                  {departures.map((d) => {
                    const status = DEPARTURE_STATUS[d.status] || DEPARTURE_STATUS.available;
                    const seatsLeft = Math.max(0, (d.capacity || 0) - (d.booked || 0));
                    const soldOut = d.status === "sold_out";
                    return (
                      <li
                        key={d.startDate}
                        className="flex flex-wrap items-center justify-between gap-4 bg-surface p-5"
                      >
                        <div>
                          <p className="font-medium text-fg">
                            {fmtDate(d.startDate, { day: "numeric", month: "short" })} –{" "}
                            {fmtDate(d.endDate)}
                          </p>
                          <p className={`mt-0.5 text-sm ${status.className}`}>
                            {status.label}
                            {!soldOut &&
                              seatsLeft > 0 &&
                              seatsLeft <= 10 &&
                              ` · ${seatsLeft} seats left`}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-fg">{formatINR(d.priceOverride || unit)}</p>
                          <button
                            type="button"
                            disabled={soldOut}
                            onClick={() => {
                              setSelectedDate(d.startDate);
                              scrollToBooking();
                            }}
                            className="btn btn-ghost h-9"
                          >
                            {selectedDate === d.startDate ? "Selected" : "Select"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Section>
            )}

            <Section id="reviews" title="Reviews">
              <ReviewList packageId={id} />
              <div className="mt-10">
                <ReviewForm packageId={id} packageTitle={pkg.name} />
              </div>
            </Section>
          </div>

          {/* Booking card */}
          <aside className="min-w-0 lg:col-span-5 xl:col-span-4" aria-label="Book this trip">
            <div
              ref={bookingRef}
              className="anchor lg:sticky"
              style={{ top: "calc(var(--header-h) + 1.5rem)" }}
            >
              <div className="card overflow-hidden">
                <div className="border-b border-line p-5 sm:p-6">
                  <p className="text-sm text-muted">Starting from</p>
                  <p className="mt-1 font-display text-4xl text-fg">
                    {formatINR(priceData?.unitPrice || unit)}
                    <span className="font-sans text-sm text-muted"> / person</span>
                  </p>
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  <div>
                    <label htmlFor="bk-date" className="label">
                      Departure
                    </label>
                    {departures.some((d) => d.status !== "sold_out") ? (
                      <Select
                        id="bk-date"
                        value={selectedDate}
                        onChange={setSelectedDate}
                        options={[
                          { value: "", label: "Flexible / choose later" },
                          ...departures
                            .filter((d) => d.status !== "sold_out")
                            .map((d) => ({
                              value: d.startDate,
                              label: `${fmtDate(d.startDate)}${d.priceOverride ? ` · ${formatINR(d.priceOverride)}` : ""}`,
                              hint: d.status === "filling_fast" ? "Filling fast" : undefined,
                            })),
                        ]}
                      />
                    ) : (
                      <p className="flex items-center gap-2 rounded-xl bg-raised px-4 py-3 text-sm text-muted">
                        <PiCalendarBlank className="h-4 w-4" /> Flexible dates — tell us when suits
                        you.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="label">Travellers</span>
                      <div className="flex h-12 items-center justify-between rounded-xl border border-line px-2">
                        <button
                          type="button"
                          onClick={() => setTravelersCount((n) => Math.max(1, n - 1))}
                          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-raised"
                          aria-label="Fewer travellers"
                        >
                          <PiMinus className="h-4 w-4" />
                        </button>
                        <span className="font-medium tabular-nums" aria-live="polite">
                          {travelersCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => setTravelersCount((n) => Math.min(30, n + 1))}
                          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-raised"
                          aria-label="More travellers"
                        >
                          <PiPlus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="bk-promo" className="label">
                        Promo code
                      </label>
                      <input
                        id="bk-promo"
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase().trim())}
                        placeholder="Optional"
                        className={`field uppercase ${promoCode && priceData && !priceData.promoApplied && !calcLoading ? "field-error" : ""}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {pkg.visa && !/not required|no visa/i.test(pkg.visa) && (
                      <label className="flex cursor-pointer items-center gap-3 text-sm text-fg">
                        <input
                          type="checkbox"
                          checked={visaRequested}
                          onChange={(e) => setVisaRequested(e.target.checked)}
                          className="h-4 w-4 accent-saffron-500"
                        />
                        <PiIdentificationCard className="h-4 w-4 text-muted" /> Help me with the
                        visa
                      </label>
                    )}
                    <label className="flex cursor-pointer items-center gap-3 text-sm text-fg">
                      <input
                        type="checkbox"
                        checked={insuranceEnabled}
                        onChange={(e) => setInsuranceEnabled(e.target.checked)}
                        className="h-4 w-4 accent-saffron-500"
                      />
                      <PiShieldCheck className="h-4 w-4 text-muted" /> Travel insurance (+
                      {formatINR(insuranceRate)}/person)
                    </label>
                  </div>

                  <dl
                    className={`space-y-2 border-t border-dashed border-line pt-5 text-sm transition-opacity ${calcLoading ? "opacity-60" : ""}`}
                  >
                    <div className="flex justify-between text-muted">
                      <dt>
                        {formatINR(priceData?.unitPrice || unit)} × {travelersCount}
                      </dt>
                      <dd className="text-fg">
                        {formatINR(priceData?.originalTotalPrice ?? unit * travelersCount)}
                      </dd>
                    </div>
                    {priceData?.promoApplied && (
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                        <dt>Promo ({priceData.discountPercent}% off)</dt>
                        <dd>−{formatINR(priceData.discountAmount)}</dd>
                      </div>
                    )}
                    {insuranceEnabled && (
                      <div className="flex justify-between text-muted">
                        <dt>Insurance</dt>
                        <dd className="text-fg">+{formatINR(insuranceCost)}</dd>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between pt-2">
                      <dt className="font-medium text-fg">Estimated total</dt>
                      <dd className="font-display text-2xl text-fg">
                        {formatINR(finalDisplayPrice)}
                      </dd>
                    </div>
                    <p className="text-xs text-muted">
                      Final price is confirmed by your planner based on hotel availability.
                    </p>
                  </dl>
                </div>

                <div className="border-t border-line bg-raised p-5 sm:p-6">
                  {enquirySuccess ? (
                    <div role="status" className="space-y-2">
                      <p className="font-display text-2xl text-fg">Request sent.</p>
                      <p className="text-sm text-muted">
                        A planner will call you to confirm availability and the final price.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleEnquirySubmit} className="space-y-3">
                      <p className="font-medium text-fg">Check availability</p>
                      <input
                        type="text"
                        required
                        autoComplete="name"
                        placeholder="Your name"
                        aria-label="Your name"
                        value={form.name}
                        onChange={setField("name")}
                        className="field"
                      />
                      <input
                        type="tel"
                        required
                        autoComplete="tel"
                        placeholder="Phone / WhatsApp"
                        aria-label="Phone"
                        value={form.phone}
                        onChange={setField("phone")}
                        className="field"
                      />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="Email"
                        aria-label="Email"
                        value={form.email}
                        onChange={setField("email")}
                        className="field"
                      />
                      <textarea
                        rows={2}
                        placeholder="Anything we should know? (optional)"
                        aria-label="Message"
                        value={form.message}
                        onChange={setField("message")}
                        className="field resize-none"
                      />

                      {useCaptcha ? (
                        <Suspense
                          fallback={<p className="text-xs text-muted">Loading verification…</p>}
                        >
                          {PROVIDER === "hcaptcha" ? (
                            <CaptchaFit>
                              <HCaptcha
                                sitekey={HCAPTCHA_SITE_KEY}
                                onVerify={(v) => setCaptchaToken(v || "")}
                                onExpire={() => setCaptchaToken("")}
                              />
                            </CaptchaFit>
                          ) : PROVIDER === "recaptcha_v3" ? (
                            <ReCAPTCHA
                              ref={recaptchaRef}
                              sitekey={RECAPTCHA_SITE_KEY}
                              size="invisible"
                              onChange={(v) => setCaptchaToken(v || "")}
                            />
                          ) : (
                            <CaptchaFit>
                              <ReCAPTCHA
                                sitekey={RECAPTCHA_SITE_KEY}
                                onChange={(v) => setCaptchaToken(v || "")}
                                onExpired={() => setCaptchaToken("")}
                              />
                            </CaptchaFit>
                          )}
                        </Suspense>
                      ) : null}

                      <button
                        type="submit"
                        disabled={
                          enquirySubmitting ||
                          (PROVIDER !== "recaptcha_v3" && !!useCaptcha && !captchaToken)
                        }
                        className="btn btn-accent btn-lg w-full"
                      >
                        {enquirySubmitting ? "Sending…" : "Request a callback"}
                      </button>
                      <a
                        href={toWhatsApp(siteConfig.company.whatsapp, whatsappMsg)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost w-full"
                      >
                        <PiWhatsappLogo className="h-4 w-4" /> Ask on WhatsApp
                      </a>
                    </form>
                  )}
                </div>
                <div className="border-t border-line px-5 py-4 text-center text-sm sm:px-6">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `${pkg.name} (${pkg.duration}) — day-by-day itinerary: ${absolutePdfUrl}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-muted hover:text-fg"
                  >
                    <PiShareNetwork className="h-4 w-4" /> Send the itinerary to family on WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-24 border-t border-line pt-16">
            <div className="mb-10 flex items-end justify-between gap-4">
              <h2 className="font-display text-display-md font-light text-fg">
                You might also <em className="accent-italic">like</em>
              </h2>
              <Link
                to={`/packages?category=${pkg.category}`}
                className="btn btn-ghost hidden sm:inline-flex"
              >
                See all
              </Link>
            </div>
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <PackageCard key={pkgId(p)} pkg={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile booking bar */}
      <div
        className={`fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-line bg-page/95 px-4 py-3 backdrop-blur transition-transform duration-300 ease-out-expo lg:hidden ${
          bookingInView ? "translate-y-full" : ""
        }`}
        aria-hidden={bookingInView || undefined}
      >
        <div className="min-w-0">
          <p className="text-xs text-muted">Est. total · {travelersCount} pax</p>
          <p className="font-display text-xl text-fg">{formatINR(finalDisplayPrice)}</p>
        </div>
        <button
          type="button"
          onClick={scrollToBooking}
          tabIndex={bookingInView ? -1 : undefined}
          className="btn btn-accent"
        >
          Check availability
        </button>
      </div>
    </SiteLayout>
  );
};

export default PackageLandingPage;
