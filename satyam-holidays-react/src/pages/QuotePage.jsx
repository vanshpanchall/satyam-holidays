import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  PiCalendarBlank,
  PiCheck,
  PiCheckCircle,
  PiDownloadSimple,
  PiForkKnife,
  PiHourglassMedium,
  PiMoon,
  PiUsers,
  PiWhatsappLogo,
  PiX,
  PiXCircle,
} from "react-icons/pi";
import SiteLayout from "../components/SiteLayout";
import Meta from "../components/Meta";
import Img from "../components/ui/Img";
import { apiUrl, fetchWithAuth, safeJson } from "../config/siteConfig";
import { refreshCsrfToken } from "../utils/csrf";
import { useSiteConfig } from "../contexts/SettingsContext";
import { formatINR, toWhatsApp } from "../utils/format";

const CATEGORY_LABELS = {
  hotel: "Stays",
  transport: "Transport",
  flight: "Flights & trains",
  activity: "Sightseeing & activities",
  meal: "Meals",
  visa: "Visa",
  insurance: "Insurance",
  guide: "Guide & assistance",
  other: "Also included",
};

const fmtDate = (d, opts = { day: "numeric", month: "short", year: "numeric" }) =>
  d ? new Date(d).toLocaleDateString("en-IN", opts) : "";

const StatusBanner = ({ quote, whatsappHref }) => {
  const banners = {
    accepted: {
      icon: PiCheckCircle,
      tone: "border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300",
      title: "You've accepted this quote — thank you!",
      text: "Your planner will call you to confirm dates, collect the advance and send your vouchers.",
    },
    declined: {
      icon: PiXCircle,
      tone: "border-line bg-raised text-fg",
      title: "You've declined this quote.",
      text: "Changed your mind or want something different? Message us and we'll rework it.",
    },
    expired: {
      icon: PiHourglassMedium,
      tone: "border-saffron-500/30 bg-saffron-500/5 text-saffron-900 dark:text-saffron-200",
      title: "This quote has expired.",
      text: "Hotel and transport prices change often — ask us for an updated quote.",
    },
  };
  const b = banners[quote.status];
  if (!b) return null;
  return (
    <div
      role="status"
      className={`flex flex-col gap-4 rounded-3xl border p-5 sm:flex-row sm:items-center sm:justify-between ${b.tone}`}
    >
      <div className="flex items-start gap-3">
        <b.icon className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-medium">{b.title}</p>
          <p className="mt-0.5 text-sm opacity-80">{b.text}</p>
        </div>
      </div>
      {quote.status !== "accepted" && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ink shrink-0"
        >
          <PiWhatsappLogo className="h-4 w-4" /> Message us
        </a>
      )}
    </div>
  );
};

const QuotePage = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const siteConfig = useSiteConfig();
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(null); // "accept" | "decline"
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [respondError, setRespondError] = useState("");

  useEffect(() => {
    const preview = searchParams.get("preview") === "1" ? "?preview=1" : "";
    fetch(apiUrl(`/api/v1/quotes/public/${token}${preview}`))
      .then(safeJson)
      .then((json) => {
        if (!json.success) throw new Error("not_found");
        setQuote(json.data);
      })
      .catch(() => setError("This quote link isn't valid any more."));
  }, [token, searchParams]);

  const respond = async (action) => {
    setBusy(true);
    setRespondError("");
    const send = () =>
      fetchWithAuth(apiUrl(`/api/v1/quotes/public/${token}/respond`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() }),
      });
    try {
      let res = await send();
      let json = await safeJson(res);
      // A missing/expired CSRF cookie is refreshed once and the request retried
      if (res.status === 403 && /CSRF/.test(json.code || "")) {
        await refreshCsrfToken();
        res = await send();
        json = await safeJson(res);
      }
      if (!res.ok || !json.success)
        throw new Error(json.error?.message || json.message || "Something went wrong");
      setQuote((q) => ({ ...q, ...json.data }));
      setConfirming(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setRespondError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <SiteLayout>
        <Meta title={`Quotation | ${siteConfig.company.name}`} noindex />
        <div className="container-site flex min-h-[60vh] flex-col items-start justify-center py-20">
          <p className="eyebrow mb-4">Quotation</p>
          <h1 className="font-display text-display-md">{error}</h1>
          <p className="mt-4 max-w-md text-muted">
            It may have been replaced by a newer version. Message us and we'll send you the latest
            one.
          </p>
          <a
            href={toWhatsApp(siteConfig.company.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ink mt-8"
          >
            <PiWhatsappLogo className="h-4 w-4" /> WhatsApp us
          </a>
        </div>
      </SiteLayout>
    );
  }

  if (!quote) {
    return (
      <SiteLayout>
        <Meta title={`Quotation | ${siteConfig.company.name}`} noindex />
        <div className="container-site space-y-4 py-10" role="status" aria-label="Loading quote">
          <div className="skeleton h-72 rounded-4xl" />
          <div className="skeleton h-40 rounded-3xl" />
        </div>
      </SiteLayout>
    );
  }

  const travellers = (quote.adults || 0) + (quote.children || 0);
  const t = quote.totals || {};
  const open = quote.status === "sent";
  const pdfUrl = apiUrl(`/api/v1/quotes/public/${token}/pdf`);
  const whatsappHref = toWhatsApp(
    siteConfig.company.whatsapp,
    `Hi ${siteConfig.company.name}, I have a question about quotation ${quote.number} (${quote.title}).`
  );
  const groups = quote.items.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  const facts = [
    quote.startDate && { icon: PiCalendarBlank, label: `From ${fmtDate(quote.startDate)}` },
    quote.nights > 0 && {
      icon: PiMoon,
      label: `${quote.nights} nights · ${quote.nights + 1} days`,
    },
    travellers > 0 && {
      icon: PiUsers,
      label: `${quote.adults} adult${quote.adults === 1 ? "" : "s"}${quote.children ? ` + ${quote.children} child${quote.children > 1 ? "ren" : ""}` : ""}`,
    },
  ].filter(Boolean);

  const priceCard = (
    <div className="card overflow-hidden">
      <div className="border-b border-line p-5 sm:p-6">
        <p className="text-sm text-muted">
          Total for {travellers > 1 ? `${travellers} travellers` : "your trip"}
        </p>
        <p className="mt-1 font-display text-4xl text-fg">{formatINR(t.total)}</p>
        {travellers > 1 && (
          <p className="mt-1 text-sm text-muted">{formatINR(t.perPerson)} per person</p>
        )}
      </div>
      <dl className="space-y-2 p-5 text-sm sm:p-6">
        <div className="flex justify-between text-muted">
          <dt>Package price</dt>
          <dd className="text-fg">{formatINR(t.subtotal)}</dd>
        </div>
        {t.discount > 0 && (
          <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
            <dt>Discount</dt>
            <dd>−{formatINR(t.discount)}</dd>
          </div>
        )}
        {t.tax > 0 && (
          <div className="flex justify-between text-muted">
            <dt>GST ({quote.taxPercent}%)</dt>
            <dd className="text-fg">{formatINR(t.tax)}</dd>
          </div>
        )}
        {quote.validUntil && (
          <p
            className={`pt-2 text-xs ${quote.status === "expired" ? "text-red-600" : "text-muted"}`}
          >
            {quote.status === "expired" ? "Expired on" : "Valid until"} {fmtDate(quote.validUntil)}
          </p>
        )}
      </dl>
      <div className="space-y-2 border-t border-line bg-raised p-5 sm:p-6">
        {open && !confirming && (
          <button
            type="button"
            onClick={() => setConfirming("accept")}
            className="btn btn-accent btn-lg w-full"
          >
            <PiCheck className="h-4 w-4" /> Accept this quote
          </button>
        )}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost w-full"
        >
          <PiWhatsappLogo className="h-4 w-4" /> Ask a question
        </a>
        <a href={pdfUrl} className="btn btn-ghost w-full">
          <PiDownloadSimple className="h-4 w-4" /> Download PDF
        </a>
        {open && !confirming && (
          <button
            type="button"
            onClick={() => setConfirming("decline")}
            className="w-full pt-1 text-center text-sm text-muted underline underline-offset-4 hover:text-fg"
          >
            Not going ahead? Let us know
          </button>
        )}
      </div>
    </div>
  );

  return (
    <SiteLayout floatingRaised={open}>
      <Meta
        title={`${quote.title} — Quotation ${quote.number} | ${siteConfig.company.name}`}
        noindex
      />

      <div className="container-site pb-16 pt-6 md:pt-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span className="eyebrow">Quotation {quote.number}</span>
          {quote.sentAt && <span>Prepared {fmtDate(quote.sentAt)}</span>}
        </div>

        <header className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            {quote.customer?.name && (
              <p className="text-muted">Prepared for {quote.customer.name}</p>
            )}
            <h1 className="mt-2 text-balance font-display text-display-lg font-light text-fg">
              {quote.title}
            </h1>
            {quote.destination && <p className="mt-3 text-muted">{quote.destination}</p>}
          </div>
          {facts.length > 0 && (
            <ul className="flex flex-wrap gap-2 md:col-span-4 md:justify-end">
              {facts.map(({ icon: Icon, label }) => (
                <li key={label} className="chip pointer-events-none h-9 gap-2">
                  <Icon className="h-4 w-4 text-accent" aria-hidden="true" /> {label}
                </li>
              ))}
            </ul>
          )}
        </header>

        {quote.image && (
          <div className="mt-8 h-[38vh] min-h-[220px] overflow-hidden rounded-4xl md:h-[48vh]">
            <Img src={quote.image} alt="" width={1600} priority />
          </div>
        )}

        <div className="mt-8">
          <StatusBanner quote={quote} whatsappHref={whatsappHref} />
        </div>

        <div className="mt-8 grid gap-10 lg:mt-12 lg:grid-cols-12">
          <div className="min-w-0 space-y-12 lg:col-span-7 xl:col-span-8">
            {quote.intro && (
              <p className="whitespace-pre-line text-pretty text-lg leading-relaxed text-muted">
                {quote.intro}
              </p>
            )}

            {quote.itinerary?.length > 0 && (
              <section>
                <h2 className="mb-6 font-display text-2xl text-fg sm:text-3xl">Day by day</h2>
                <ol className="relative ml-4 border-l border-line pl-8">
                  {quote.itinerary.map((d) => (
                    <li key={d.day} className="relative pb-7 last:pb-0">
                      <span className="absolute -left-[3rem] top-0 flex h-8 w-8 items-center justify-center rounded-full bg-fg font-display text-sm text-page">
                        {d.day}
                      </span>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
                        Day {d.day}
                      </p>
                      <h3 className="mt-1 font-display text-xl text-fg">{d.title}</h3>
                      {d.description && (
                        <p className="mt-2 leading-relaxed text-muted">{d.description}</p>
                      )}
                      {d.meals?.length > 0 && (
                        <p className="mt-2 flex items-center gap-2 text-sm text-fg">
                          <PiForkKnife className="h-4 w-4 text-accent" aria-hidden="true" />{" "}
                          {d.meals.join(" · ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {quote.items.length > 0 && (
              <section>
                <h2 className="mb-6 font-display text-2xl text-fg sm:text-3xl">
                  {quote.showItemPrices ? "Price breakdown" : "What your price covers"}
                </h2>
                <div className="space-y-6">
                  {Object.entries(groups).map(([category, items]) => (
                    <div key={category}>
                      <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-accent">
                        {CATEGORY_LABELS[category] || category}
                      </p>
                      <ul className="divide-y divide-line rounded-3xl border border-line bg-surface">
                        {items.map((item, i) => (
                          <li key={i} className="flex items-start justify-between gap-4 px-5 py-4">
                            <div className="min-w-0">
                              <p className="text-fg">{item.title}</p>
                              <p className="mt-0.5 text-sm text-muted">
                                {[
                                  item.details,
                                  item.rooms && item.nights
                                    ? `${item.rooms} room${item.rooms > 1 ? "s" : ""} × ${item.nights} night${item.nights > 1 ? "s" : ""}`
                                    : item.quantity > 1 && `× ${item.quantity}`,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                            {quote.showItemPrices && (
                              <p className="shrink-0 tabular-nums text-fg">
                                {formatINR(item.amount)}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(quote.inclusions?.length > 0 || quote.exclusions?.length > 0) && (
              <section className="grid gap-8 sm:grid-cols-2">
                {quote.inclusions?.length > 0 && (
                  <div>
                    <h2 className="mb-4 text-[11px] uppercase tracking-[0.16em] text-muted">
                      Included
                    </h2>
                    <ul className="space-y-3">
                      {quote.inclusions.map((x) => (
                        <li key={x} className="flex items-start gap-3 text-fg">
                          <PiCheck
                            className="mt-1 h-4 w-4 shrink-0 text-emerald-600"
                            aria-hidden="true"
                          />{" "}
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {quote.exclusions?.length > 0 && (
                  <div>
                    <h2 className="mb-4 text-[11px] uppercase tracking-[0.16em] text-muted">
                      Not included
                    </h2>
                    <ul className="space-y-3">
                      {quote.exclusions.map((x) => (
                        <li key={x} className="flex items-start gap-3 text-muted">
                          <PiX className="mt-1 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />{" "}
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {quote.terms && (
              <section className="rounded-3xl bg-raised p-6">
                <h2 className="mb-3 font-display text-xl text-fg">Terms & payment</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
                  {quote.terms}
                </p>
              </section>
            )}
          </div>

          <aside className="min-w-0 lg:col-span-5 xl:col-span-4" id="quote-price">
            <div className="space-y-4 lg:sticky" style={{ top: "calc(var(--header-h) + 1.5rem)" }}>
              {priceCard}
              {confirming && (
                <div
                  className="card space-y-3 p-5 sm:p-6"
                  role="dialog"
                  aria-label={confirming === "accept" ? "Accept quote" : "Decline quote"}
                >
                  <p className="font-display text-xl text-fg">
                    {confirming === "accept"
                      ? "Accept this quote?"
                      : "Let us know you're not going ahead"}
                  </p>
                  <p className="text-sm text-muted">
                    {confirming === "accept"
                      ? "No payment is taken here. Your planner will call to confirm availability and the advance."
                      : "A quick reason helps us — maybe we can rework it."}
                  </p>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={1000}
                    placeholder={
                      confirming === "accept"
                        ? "Anything to add? (optional)"
                        : "Price, dates, found another option… (optional)"
                    }
                    aria-label="Note"
                    className="field resize-none"
                  />
                  {respondError && <p className="text-sm text-red-600">{respondError}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="btn btn-ghost"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => respond(confirming)}
                      className={`btn ${confirming === "accept" ? "btn-accent" : "btn-ink"}`}
                    >
                      {busy ? "Sending…" : confirming === "accept" ? "Yes, accept" : "Send"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Phones: total + accept always reachable */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-line bg-page/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="min-w-0">
            <p className="text-xs text-muted">Total</p>
            <p className="font-display text-xl text-fg">{formatINR(t.total)}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirming("accept");
              document
                .getElementById("quote-price")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="btn btn-accent"
          >
            Accept quote
          </button>
        </div>
      )}
    </SiteLayout>
  );
};

export default QuotePage;
