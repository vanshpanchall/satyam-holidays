import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  PiEnvelopeSimple,
  PiEye,
  PiFileText,
  PiNotePencil,
  PiPhone,
  PiPlus,
  PiWhatsappLogo,
  PiX,
} from "react-icons/pi";
import { apiUrl, fetchWithAuth, safeJson } from "../../config/siteConfig";
import { ScrollArea } from "../../components/ui/Scrollbar";
import { toTel, toWhatsApp } from "../../utils/format";
import {
  Avatar,
  PIPELINE,
  StatusPill,
  budgetLabel,
  destinationLabel,
  estimatedValue,
  inrCompact,
  isFollowUpDue,
  leadTier,
  minutesLabel,
  sourceLabel,
  timeAgo,
  travellersLabel,
} from "./adminUi";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Package-page enquiries append "[Inquired via Package Page: …]" + "- key: value" lines */
export const parseMessage = (msg = "") => {
  const metaIndex = msg.indexOf("[Inquired via");
  if (metaIndex === -1) return { comment: msg.trim(), metadata: null };
  const metadata = {};
  msg
    .slice(metaIndex)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      if (line.startsWith("[Inquired via")) {
        metadata.Package = line.replace(/^\[Inquired via Package Page:\s*/, "").replace(/\]$/, "");
      } else if (line.startsWith("- ")) {
        const [key, ...rest] = line.slice(2).split(":");
        if (rest.length) metadata[key.trim()] = rest.join(":").trim();
      }
    });
  return { comment: msg.slice(0, metaIndex).trim(), metadata };
};

const isoDay = (offsetDays) => {
  const d = new Date(Date.now() + offsetDays * DAY_MS);
  return d.toISOString().slice(0, 10);
};

const Fact = ({ label, children }) => (
  <div className="rounded-2xl bg-raised px-3.5 py-3">
    <dt className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</dt>
    <dd className="mt-1 text-sm text-fg">{children}</dd>
  </div>
);

const Section = ({ title, action, children }) => (
  <section className="border-t border-line px-5 py-5 sm:px-6">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

const EnquiryDrawer = ({ enquiry, onClose, onStatus, onCrm, saving }) => {
  const [noteDraft, setNoteDraft] = useState("");
  const [quotes, setQuotes] = useState(null);
  const id = enquiry._id || enquiry.id;

  useEffect(() => {
    document.body.classList.add("modal-open");
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    setNoteDraft("");
    setQuotes(null);
    let cancelled = false;
    fetchWithAuth(apiUrl(`/api/v1/quotes?enquiry=${id}`))
      .then(safeJson)
      .then((json) => !cancelled && setQuotes(json.success ? json.data.quotes : []))
      .catch(() => !cancelled && setQuotes([]));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const { comment, metadata } = parseMessage(enquiry.message);
  const tier = leadTier(enquiry.leadScore);
  const firstReply =
    enquiry.respondedAt && enquiry.createdAt
      ? Math.round((new Date(enquiry.respondedAt) - new Date(enquiry.createdAt)) / 60000)
      : null;
  const waitingMins =
    enquiry.status === "pending" && enquiry.createdAt
      ? Math.round((Date.now() - new Date(enquiry.createdAt)) / 60000)
      : null;
  const notes = [...(enquiry.adminNotes || [])].reverse();
  // onCrm resolves true on success; keep the draft if saving failed
  const addNote = () =>
    noteDraft.trim() && onCrm({ note: noteDraft.trim() }).then((ok) => ok && setNoteDraft(""));

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={`Enquiry from ${enquiry.name}`}
    >
      <div
        className="absolute inset-0 animate-[fade-in_0.15s_ease-out] bg-ink-950/50"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-page shadow-2xl animate-[fade-in_0.2s_ease-out]">
        {/* Header */}
        <header className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
          <Avatar name={enquiry.name} className="h-11 w-11 text-base" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-xl text-fg">{enquiry.name}</h2>
            <p className="mt-0.5 text-xs text-muted">
              {sourceLabel(enquiry.source)} · {timeAgo(enquiry.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn h-9 w-9 shrink-0"
            aria-label="Close"
          >
            <PiX className="h-4 w-4" />
          </button>
        </header>

        <ScrollArea className="flex-1">
          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-2 px-5 pt-5 sm:px-6">
            <a href={toTel(enquiry.phone)} className="btn btn-ghost h-10 px-3">
              <PiPhone className="h-4 w-4" /> Call
            </a>
            <a
              href={toWhatsApp(
                enquiry.phone,
                `Hi ${enquiry.name}, this is Satyam Holidays about your travel enquiry.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="btn h-10 bg-[#1f9d55] px-3 text-white hover:bg-[#1a8a4a]"
            >
              <PiWhatsappLogo className="h-4 w-4" /> WhatsApp
            </a>
            <a
              href={enquiry.email ? `mailto:${enquiry.email}` : undefined}
              aria-disabled={!enquiry.email}
              className={`btn btn-ghost h-10 px-3 ${enquiry.email ? "" : "pointer-events-none opacity-40"}`}
            >
              <PiEnvelopeSimple className="h-4 w-4" /> Email
            </a>
          </div>
          <p className="truncate px-5 pt-2 text-center text-xs text-muted sm:px-6">
            {[enquiry.phone, enquiry.email].filter(Boolean).join(" · ")}
          </p>

          {/* Stage */}
          <section className="px-5 py-5 sm:px-6">
            <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              Stage
            </h3>
            <div
              className="grid grid-cols-5 gap-1 rounded-2xl bg-raised p-1"
              role="radiogroup"
              aria-label="Enquiry stage"
            >
              {PIPELINE.map((s) => {
                const active = enquiry.status === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => !active && onStatus(id, s.id)}
                    className={`rounded-xl px-1 py-2 text-xs font-medium transition sm:text-[13px] ${
                      active
                        ? "bg-fg text-page shadow"
                        : "text-muted hover:bg-surface hover:text-fg"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
            {(waitingMins !== null && waitingMins > 120) || isFollowUpDue(enquiry) ? (
              <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {waitingMins > 120
                  ? `Waiting ${minutesLabel(waitingMins)} for a first reply.`
                  : "A follow-up is due today."}
              </p>
            ) : null}
          </section>

          {/* Facts */}
          <Section title="Trip">
            <dl className="grid grid-cols-2 gap-2">
              <Fact label="Destination">{destinationLabel(enquiry.destination)}</Fact>
              <Fact label="Travel date">
                {enquiry.travelDate
                  ? new Date(enquiry.travelDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Flexible"}
              </Fact>
              <Fact label="Travellers">{travellersLabel(enquiry.travelers)}</Fact>
              <Fact label="Budget / person">{budgetLabel(enquiry.budget)}</Fact>
              <Fact label="Lead">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tier.className}`}>
                  {tier.label}
                </span>{" "}
                <span className="text-muted">score {enquiry.leadScore ?? 0}</span>
              </Fact>
              <Fact label="Est. value">~{inrCompact(estimatedValue(enquiry))}</Fact>
              <Fact label="First reply">
                {firstReply !== null ? minutesLabel(firstReply) : "Not yet"}
              </Fact>
              <Fact label="Extras">
                {[enquiry.visaRequired && "Visa help", enquiry.travelInsurance && "Insurance"]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </Fact>
            </dl>
            {metadata && (
              <dl className="mt-3 space-y-1.5 rounded-2xl border border-line p-3.5 text-sm">
                {Object.entries(metadata).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right text-fg">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {comment && (
              <blockquote className="mt-3 whitespace-pre-line rounded-2xl border-l-2 border-saffron-500 bg-saffron-500/5 px-4 py-3 text-sm leading-relaxed text-fg">
                {comment}
              </blockquote>
            )}
          </Section>

          {/* Quotes */}
          <Section
            title="Quotes"
            action={
              <Link to={`/admin/quotes/new?enquiry=${id}`} className="btn btn-ink h-8 px-3 text-xs">
                <PiPlus className="h-3.5 w-3.5" /> New quote
              </Link>
            }
          >
            {quotes === null ? (
              <div className="skeleton h-14 rounded-2xl" />
            ) : quotes.length ? (
              <ul className="space-y-2">
                {quotes.map((q) => (
                  <li key={q._id}>
                    <Link
                      to={`/admin/quotes/${q._id}`}
                      className="flex items-center gap-3 rounded-2xl border border-line px-3.5 py-3 transition hover:border-fg/30"
                    >
                      <PiFileText className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">
                          {q.title}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-muted">
                          {q.number}
                          {q.viewCount > 0 && (
                            <>
                              · <PiEye className="h-3.5 w-3.5" aria-hidden="true" /> viewed{" "}
                              {timeAgo(q.lastViewedAt)}
                            </>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-medium tabular-nums text-fg">
                          {inrCompact(q.totals?.total)}
                        </span>
                        <StatusPill status={q.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                No quote yet. Build one from hotels, transport and activities.
              </p>
            )}
          </Section>

          {/* Follow-up */}
          <Section title="Follow-up reminder">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                aria-label="Follow-up date"
                value={enquiry.followUpDate ? String(enquiry.followUpDate).slice(0, 10) : ""}
                onChange={(e) => onCrm({ followUpDate: e.target.value || null })}
                disabled={saving}
                className="field h-10 w-auto"
              />
              {[
                ["Tomorrow", 1],
                ["In 3 days", 3],
                ["Next week", 7],
              ].map(([label, days]) => (
                <button
                  key={label}
                  type="button"
                  disabled={saving}
                  onClick={() => onCrm({ followUpDate: isoDay(days) })}
                  className="chip h-8 px-3 text-xs"
                >
                  {label}
                </button>
              ))}
              {enquiry.followUpDate && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onCrm({ followUpDate: null })}
                  className="text-xs text-muted underline underline-offset-4 hover:text-fg"
                >
                  Clear
                </button>
              )}
            </div>
          </Section>

          {/* Notes */}
          <Section title={`Notes${notes.length ? ` · ${notes.length}` : ""}`}>
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote();
                }}
                maxLength={1000}
                placeholder="e.g. Called — wants Kedarnath in May, prefers helicopter"
                aria-label="New note"
                className="field resize-none text-sm"
              />
              <button
                type="button"
                disabled={saving || !noteDraft.trim()}
                onClick={addNote}
                className="btn btn-ink h-auto self-stretch px-4"
              >
                <PiNotePencil className="h-4 w-4" />
                <span className="hidden sm:inline">Add</span>
              </button>
            </div>
            {notes.length > 0 && (
              <ol className="relative mt-5 space-y-4 border-l border-line pl-5">
                {notes.map((n, i) => (
                  <li key={n._id || i} className="relative">
                    <span
                      className={`absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-page ${
                        n.author === "customer" ? "bg-emerald-500" : "bg-saffron-500"
                      }`}
                      aria-hidden="true"
                    />
                    <p className="whitespace-pre-line text-sm leading-relaxed text-fg">{n.text}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {n.author === "customer" ? "Customer" : n.author || "admin"} ·{" "}
                      {timeAgo(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </ScrollArea>
      </div>
    </div>,
    document.body
  );
};

export default EnquiryDrawer;
