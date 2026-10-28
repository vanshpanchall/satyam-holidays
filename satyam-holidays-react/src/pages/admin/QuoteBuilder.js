import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  PiArrowDown,
  PiArrowLeft,
  PiArrowSquareOut,
  PiArrowUp,
  PiCopy,
  PiDownloadSimple,
  PiEnvelopeSimple,
  PiFilePdf,
  PiLink,
  PiLockSimple,
  PiPaperPlaneTilt,
  PiPlus,
  PiTrash,
  PiWhatsappLogo,
  PiX,
} from "react-icons/pi";
import { apiUrl, fetchWithAuth, safeJson, toastApiError } from "../../config/siteConfig";
import Select from "../../components/ui/Select";
import usePackageCatalog from "../../utils/usePackageCatalog";
import { formatINR, pkgId } from "../../utils/format";
import { Panel, StatusPill, timeAgo } from "./adminUi";
import {
  ITEM_CATEGORIES,
  QUOTE_STATUS_LABELS,
  categoryOf,
  computeTotals,
  itemQuantity,
  quoteStatus,
} from "./quoteUtils";

const day10 = (d) => (d ? String(d).slice(0, 10) : "");
const lines = (arr) => (arr || []).join("\n");
const unlines = (text) =>
  String(text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
const waDigits = (phone) => {
  const d = String(phone || "").replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
};

const Field = ({ label, hint, className = "", children }) => (
  <label className={`block min-w-0 ${className}`}>
    <span className="label">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
  </label>
);

const NumInput = ({ value, onChange, min = 0, step = 1, className = "", ...rest }) => (
  <input
    type="number"
    inputMode="decimal"
    min={min}
    step={step}
    value={value === null || value === undefined || Number.isNaN(value) ? "" : value}
    onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
    className={`field tabular-nums ${className}`}
    {...rest}
  />
);

/* ── Line items ───────────────────────────────────────────── */

const ItemRow = ({ item, index, update, remove, defaultNights }) => {
  const cat = categoryOf(item.category);
  const hotel = item.category === "hotel";
  const qty = itemQuantity(item);
  const set = (patch) => update(index, { ...item, ...patch });

  return (
    <li className="rounded-2xl border border-line p-3 sm:p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Field label={cat.label}>
          <input
            value={item.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder={cat.placeholder}
            className="field h-11"
            maxLength={200}
          />
        </Field>
        <Field label="Details">
          <input
            value={item.details || ""}
            onChange={(e) => set({ details: e.target.value })}
            placeholder={hotel ? "Deluxe room · CP (breakfast)" : "Optional"}
            className="field h-11"
            maxLength={300}
          />
        </Field>
      </div>
      <div className="mt-3 grid grid-cols-2 items-end gap-3 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        {hotel ? (
          <>
            <Field label="Rooms">
              <NumInput
                value={item.rooms ?? 1}
                onChange={(v) => set({ rooms: v })}
                className="h-11"
              />
            </Field>
            <Field label="Nights">
              <NumInput
                value={item.nights ?? defaultNights ?? 1}
                onChange={(v) => set({ nights: v })}
                className="h-11"
              />
            </Field>
          </>
        ) : (
          <Field label={`Qty (${cat.unit})`} className="col-span-2 sm:col-span-2">
            <NumInput
              value={item.quantity}
              onChange={(v) => set({ quantity: v })}
              className="h-11"
            />
          </Field>
        )}
        <Field label={`Cost / ${cat.unit}`}>
          <NumInput
            value={item.unitPrice}
            onChange={(v) => set({ unitPrice: v })}
            className="h-11"
          />
        </Field>
        <div className="min-w-0">
          <span className="label">Line cost</span>
          <p className="flex h-11 items-center truncate text-sm font-medium tabular-nums text-fg">
            {formatINR(qty * (item.unitPrice || 0))}
            {hotel && <span className="ml-1.5 text-xs font-normal text-muted">({qty} r-n)</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => remove(index)}
          className="icon-btn h-11 w-11 justify-self-end text-red-600"
          aria-label={`Remove ${item.title || cat.label}`}
        >
          <PiTrash className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
};

/* ── Share panel ──────────────────────────────────────────── */

const SharePanel = ({ quote, publicUrl, totals, onClose, onDownload }) => {
  const message = `Hi ${quote.customer?.name || ""}, here is your quotation for ${quote.title} (${quote.number}).\n\nTotal: ${formatINR(totals.total)}${
    (quote.adults || 0) + (quote.children || 0) > 1
      ? ` (${formatINR(totals.perPerson)} per person)`
      : ""
  }${quote.validUntil ? `\nValid until ${new Date(quote.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}\n\nView, download or accept it here: ${publicUrl}\n\n— Satyam Holidays`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually");
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-fg">Ready to share</p>
          <p className="mt-0.5 text-xs text-muted">
            The customer can open, download and accept it from this link.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted hover:text-fg"
          aria-label="Close share options"
        >
          <PiX className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-3 truncate rounded-xl bg-surface px-3 py-2 text-xs text-muted">
        {publicUrl}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a
          href={`https://wa.me/${waDigits(quote.customer?.phone)}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn h-10 bg-[#1f9d55] px-3 text-white hover:bg-[#1a8a4a]"
        >
          <PiWhatsappLogo className="h-4 w-4" /> WhatsApp
        </a>
        <a
          href={`mailto:${quote.customer?.email || ""}?subject=${encodeURIComponent(`Your quotation ${quote.number} — ${quote.title}`)}&body=${encodeURIComponent(message)}`}
          className="btn btn-ghost h-10 px-3"
        >
          <PiEnvelopeSimple className="h-4 w-4" /> Email
        </a>
        <button type="button" onClick={copy} className="btn btn-ghost h-10 px-3">
          <PiCopy className="h-4 w-4" /> Copy link
        </button>
        <button type="button" onClick={onDownload} className="btn btn-ghost h-10 px-3">
          <PiDownloadSimple className="h-4 w-4" /> PDF
        </button>
      </div>
    </div>
  );
};

/* ── Builder ──────────────────────────────────────────────── */

const QuoteBuilder = () => {
  const { id } = useParams();
  const isNew = id === "new";
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { packages } = usePackageCatalog();

  const [q, setQ] = useState(null);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [enquiries, setEnquiries] = useState([]);

  const load = useCallback(async () => {
    try {
      const url = isNew
        ? `/api/v1/quotes/draft?${new URLSearchParams({
            enquiry: searchParams.get("enquiry") || "",
            package: searchParams.get("package") || "",
          })}`
        : `/api/v1/quotes/${id}`;
      const json = await safeJson(await fetchWithAuth(apiUrl(url)));
      if (!json.success)
        throw new Error(json.error?.message || json.message || "Couldn't load the quote");
      setQ(json.data);
      setSaved(isNew ? null : json.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [id, isNew, searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  // Open leads to link this quote to
  useEffect(() => {
    fetchWithAuth(apiUrl("/api/enquiries?limit=100"))
      .then(safeJson)
      .then((json) => json.success && setEnquiries(json.data || []))
      .catch(() => {});
  }, []);

  const totals = useMemo(() => (q ? computeTotals(q) : null), [q]);
  const editable = (x) => {
    if (!x) return "";
    const { totals: _t, updatedAt, viewCount, lastViewedAt, firstViewedAt, publicUrl, ...rest } = x; // eslint-disable-line no-unused-vars
    return JSON.stringify(rest);
  };
  const dirty = q && (!saved || editable(q) !== editable(saved));
  const status = quoteStatus(q);
  const locked = ["accepted", "declined"].includes(q?.status);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="font-display text-xl text-fg">{error}</p>
        <Link to="/admin/quotes" className="btn btn-ghost mt-5">
          Back to quotes
        </Link>
      </div>
    );
  }
  if (!q) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading quote">
        <div className="skeleton h-12 w-64 rounded-full" />
        <div className="skeleton h-96 rounded-3xl" />
      </div>
    );
  }

  const set = (patch) => setQ((prev) => ({ ...prev, ...patch }));
  const setCustomer = (patch) => set({ customer: { ...q.customer, ...patch } });
  const updateItem = (i, item) => set({ items: q.items.map((x, n) => (n === i ? item : x)) });
  const removeItem = (i) => set({ items: q.items.filter((_, n) => n !== i) });
  const addItem = (category) => {
    const travellers = (q.adults || 0) + (q.children || 0) || 1;
    const base = { category, title: "", details: "", unitPrice: 0 };
    const item =
      category === "hotel"
        ? {
            ...base,
            rooms: Math.max(1, Math.ceil((q.adults || 2) / 2)),
            nights: q.nights || 1,
            quantity: 1,
          }
        : {
            ...base,
            quantity: ["activity", "meal", "visa", "insurance", "flight"].includes(category)
              ? travellers
              : 1,
          };
    set({ items: [...q.items, item] });
  };

  const setDay = (i, patch) =>
    set({ itinerary: q.itinerary.map((d, n) => (n === i ? { ...d, ...patch } : d)) });
  const renumber = (days) => days.map((d, n) => ({ ...d, day: n + 1 }));
  const moveDay = (i, dir) => {
    const days = [...q.itinerary];
    const j = i + dir;
    if (j < 0 || j >= days.length) return;
    [days[i], days[j]] = [days[j], days[i]];
    set({ itinerary: renumber(days) });
  };

  const applyPackage = async (packageId) => {
    if (!packageId) return;
    const json = await safeJson(
      await fetchWithAuth(apiUrl(`/api/v1/quotes/draft?package=${packageId}`))
    );
    if (!json.success) return toastApiError(json, "Couldn't load that package");
    const d = json.data;
    set({
      package: d.package,
      title: q.title || d.title,
      destination: d.destination,
      image: d.image,
      intro: q.intro || d.intro,
      nights: d.nights || q.nights,
      itinerary: d.itinerary,
      inclusions: d.inclusions,
      exclusions: d.exclusions,
      // Keep the planner's own items; only seed one when the list is empty
      items: q.items.length
        ? q.items
        : d.items.map((it) => ({ ...it, quantity: q.adults || it.quantity })),
    });
    toast.success("Itinerary and inclusions loaded from the package");
  };

  const linkEnquiry = (enquiryId) => {
    const e = enquiries.find((x) => (x._id || x.id) === enquiryId);
    if (!e) return set({ enquiry: null });
    const people = { 1: 1, 2: 2, 3: 3, 4: 4, "5+": 5 }[e.travelers] || q.adults;
    set({
      enquiry: enquiryId,
      customer: { name: e.name, phone: e.phone, email: e.email || "" },
      adults: people,
      startDate: q.startDate || e.travelDate || null,
    });
  };

  const save = async () => {
    if (!q.customer?.name?.trim() || !q.title?.trim()) {
      toast.error("Add the customer's name and a trip title first");
      return null;
    }
    if (q.items.some((i) => !i.title.trim())) {
      toast.error("Every price line needs a name");
      return null;
    }
    setSaving(true);
    try {
      const res = await fetchWithAuth(apiUrl(isNew ? "/api/v1/quotes" : `/api/v1/quotes/${id}`), {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...q,
          items: q.items.map((i) => ({ ...i, quantity: itemQuantity(i) })),
        }),
      });
      const json = await safeJson(res);
      if (!res.ok || !json.success) throw json;
      toast.success(isNew ? `Quote ${json.data.number} created` : "Quote saved");
      const next = { ...json.data, publicUrl: q.publicUrl };
      setQ(next);
      setSaved(next);
      if (isNew) navigate(`/admin/quotes/${json.data._id}`, { replace: true });
      return next;
    } catch (err) {
      toastApiError(err, "Couldn't save the quote");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const send = async () => {
    const current = dirty || isNew ? await save() : q;
    if (!current) return;
    try {
      const res = await fetchWithAuth(apiUrl(`/api/v1/quotes/${current._id}/send`), {
        method: "POST",
      });
      const json = await safeJson(res);
      if (!res.ok || !json.success) throw json;
      setQ(json.data);
      setSaved(json.data);
      setSharing(true);
      if (current.status === "draft") {
        toast.success(
          json.data.enquiry ? "Marked as sent — enquiry moved to Quoted" : "Marked as sent"
        );
      }
    } catch (err) {
      toastApiError(err, "Couldn't mark the quote as sent");
    }
  };

  const openPdf = async (download) => {
    if (!q._id) return toast.info("Save the quote first");
    try {
      // Fetched with auth headers (a plain link wouldn't carry the admin token)
      const res = await fetchWithAuth(
        apiUrl(`/api/v1/quotes/${q._id}/pdf${download ? "" : "?inline=1"}`)
      );
      if (!res.ok) throw new Error("Couldn't create the PDF");
      const url = URL.createObjectURL(await res.blob());
      if (download) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${q.number}.pdf`;
        a.click();
      } else {
        window.open(url, "_blank", "noopener");
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      toastApiError(err, "Couldn't create the PDF");
    }
  };

  const duplicate = async () => {
    const json = await safeJson(
      await fetchWithAuth(apiUrl(`/api/v1/quotes/${q._id}/duplicate`), { method: "POST" })
    );
    if (!json.success) return toastApiError(json, "Couldn't duplicate");
    toast.success(`Copy saved as ${json.data.number}`);
    navigate(`/admin/quotes/${json.data._id}`);
  };

  const remove = async () => {
    if (!window.confirm(`Delete quote ${q.number}? The customer link will stop working.`)) return;
    const json = await safeJson(
      await fetchWithAuth(apiUrl(`/api/v1/quotes/${q._id}`), { method: "DELETE" })
    );
    if (!json.success) return toastApiError(json, "Couldn't delete");
    toast.success("Quote deleted");
    navigate("/admin/quotes", { replace: true });
  };

  const grouped = ITEM_CATEGORIES.map((c) => ({
    ...c,
    rows: q.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.category === c.id),
  })).filter((g) => g.rows.length);
  const linked = enquiries.find((e) => (e._id || e.id) === q.enquiry);
  const travellers = (q.adults || 0) + (q.children || 0);

  const summary = (
    <div className="space-y-4">
      <Panel
        title={q.number || "New quote"}
        description={
          !q._id
            ? "Not saved yet"
            : q.viewCount
              ? `Customer opened it ${q.viewCount}× · last ${timeAgo(q.lastViewedAt)}`
              : q.status === "draft"
                ? "Draft — not sent yet"
                : "Not opened by the customer yet"
        }
        action={q._id ? <StatusPill status={status} label={QUOTE_STATUS_LABELS[status]} /> : null}
      >
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between text-muted">
            <dt>Cost</dt>
            <dd className="tabular-nums text-fg">{formatINR(totals.cost)}</dd>
          </div>
          <div className="flex justify-between text-muted">
            <dt>Margin ({q.markupPercent || 0}%)</dt>
            <dd className="tabular-nums text-fg">+{formatINR(totals.markup)}</dd>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-muted">
              <dt>Discount</dt>
              <dd className="tabular-nums text-fg">−{formatINR(totals.discount)}</dd>
            </div>
          )}
          {totals.tax > 0 && (
            <div className="flex justify-between text-muted">
              <dt>GST ({q.taxPercent}%)</dt>
              <dd className="tabular-nums text-fg">+{formatINR(totals.tax)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <dt className="font-medium text-fg">Customer pays</dt>
            <dd className="font-display text-2xl tabular-nums text-fg">
              {formatINR(totals.total)}
            </dd>
          </div>
          {travellers > 1 && (
            <p className="text-right text-xs text-muted">
              {formatINR(totals.perPerson)} per person
            </p>
          )}
        </dl>
        <div
          className={`mt-4 rounded-2xl px-3.5 py-3 text-sm ${
            totals.profit > 0
              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "bg-saffron-500/10 text-saffron-900 dark:text-saffron-200"
          }`}
        >
          <p className="font-medium">
            {totals.profit > 0
              ? `Your margin: ${formatINR(totals.profit)}`
              : "No margin on this quote"}
          </p>
          <p className="mt-0.5 text-xs opacity-80">
            {totals.profit > 0
              ? `${totals.marginPercent}% of what the customer pays. Hidden from the customer.`
              : "Add a margin % under Pricing, or check your costs."}
          </p>
        </div>
      </Panel>

      {sharing && q.publicUrl && (
        <SharePanel
          quote={q}
          publicUrl={q.publicUrl}
          totals={totals}
          onClose={() => setSharing(false)}
          onDownload={() => openPdf(true)}
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="btn btn-ink col-span-2 h-11"
        >
          {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </button>
        {!locked && (
          <button
            type="button"
            onClick={send}
            disabled={saving}
            className="btn btn-accent col-span-2 h-11"
          >
            <PiPaperPlaneTilt className="h-4 w-4" />
            {q.status === "draft" || isNew ? "Send to customer" : "Share again"}
          </button>
        )}
        <button
          type="button"
          onClick={() => openPdf(false)}
          disabled={!q._id}
          className="btn btn-ghost h-10 px-3"
        >
          <PiFilePdf className="h-4 w-4" /> Preview PDF
        </button>
        <a
          href={
            q.publicUrl && q.status !== "draft"
              ? `${q.publicUrl.replace(/^https?:\/\/[^/]+/, "")}?preview=1`
              : undefined
          }
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!q.publicUrl || q.status === "draft"}
          title={
            q.status === "draft"
              ? "Available once sent"
              : "Opens the customer page without counting a view"
          }
          className={`btn btn-ghost h-10 px-3 ${!q.publicUrl || q.status === "draft" ? "pointer-events-none opacity-40" : ""}`}
        >
          <PiArrowSquareOut className="h-4 w-4" /> Customer view
        </a>
        {q._id && (
          <>
            <button type="button" onClick={duplicate} className="btn btn-ghost h-10 px-3">
              <PiCopy className="h-4 w-4" /> Duplicate
            </button>
            <button type="button" onClick={remove} className="btn btn-ghost h-10 px-3 text-red-600">
              <PiTrash className="h-4 w-4" /> Delete
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="pb-24 lg:pb-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/quotes"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg"
        >
          <PiArrowLeft className="h-4 w-4" /> All quotes
        </Link>
        {q.enquiry && (
          <Link
            to={`/admin/enquiries?id=${q.enquiry}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
          >
            <PiLink className="h-4 w-4" /> Enquiry{linked ? `: ${linked.name}` : ""}
          </Link>
        )}
      </div>

      {locked && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-line bg-raised p-4 text-sm">
          <PiLockSimple className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
          <div>
            <p className="font-medium text-fg">
              The customer {q.status} this quote {timeAgo(q.respondedAt)}.
            </p>
            {q.responseNote && <p className="mt-1 text-muted">“{q.responseNote}”</p>}
            <p className="mt-1 text-muted">
              It can't be edited any more — duplicate it to make a revised version.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <fieldset disabled={locked} className="min-w-0 space-y-6 lg:col-span-8">
          <Panel title="Customer & trip">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Linked enquiry"
                hint="Sending moves the enquiry to Quoted and logs it there."
              >
                <Select
                  value={q.enquiry || ""}
                  onChange={linkEnquiry}
                  options={[
                    { value: "", label: "Not linked" },
                    ...enquiries.map((e) => ({
                      value: e._id || e.id,
                      label: e.name,
                      hint: [e.phone, e.destination].filter(Boolean).join(" · "),
                    })),
                  ]}
                />
              </Field>
              <Field label="Start from a package" hint="Loads its itinerary, inclusions and photo.">
                <Select
                  value={q.package || ""}
                  onChange={applyPackage}
                  placeholder="Choose a package"
                  options={packages.map((p) => ({
                    value: pkgId(p),
                    label: p.name,
                    hint: p.duration,
                  }))}
                />
              </Field>
              <Field label="Customer name *">
                <input
                  value={q.customer?.name || ""}
                  onChange={(e) => setCustomer({ name: e.target.value })}
                  className="field h-11"
                  maxLength={100}
                />
              </Field>
              <Field label="Phone / WhatsApp">
                <input
                  type="tel"
                  value={q.customer?.phone || ""}
                  onChange={(e) => setCustomer({ phone: e.target.value })}
                  className="field h-11"
                />
              </Field>
              <Field label="Email" className="sm:col-span-2">
                <input
                  type="email"
                  value={q.customer?.email || ""}
                  onChange={(e) => setCustomer({ email: e.target.value })}
                  className="field h-11"
                />
              </Field>
              <Field label="Trip title *" className="sm:col-span-2">
                <input
                  value={q.title}
                  onChange={(e) => set({ title: e.target.value })}
                  placeholder="Kedarnath yatra for the Panchal family"
                  className="field h-11"
                  maxLength={200}
                />
              </Field>
              <Field label="Destination">
                <input
                  value={q.destination || ""}
                  onChange={(e) => set({ destination: e.target.value })}
                  className="field h-11"
                />
              </Field>
              <Field label="Start date">
                <input
                  type="date"
                  value={day10(q.startDate)}
                  onChange={(e) => set({ startDate: e.target.value || null })}
                  className="field h-11"
                />
              </Field>
              <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                <Field label="Nights">
                  <NumInput
                    value={q.nights}
                    onChange={(v) => set({ nights: v })}
                    className="h-11"
                  />
                </Field>
                <Field label="Adults">
                  <NumInput
                    value={q.adults}
                    onChange={(v) => set({ adults: v })}
                    className="h-11"
                  />
                </Field>
                <Field label="Children">
                  <NumInput
                    value={q.children}
                    onChange={(v) => set({ children: v })}
                    className="h-11"
                  />
                </Field>
              </div>
              <Field
                label="Cover photo URL"
                className="sm:col-span-2"
                hint="Shown on the PDF and the customer page."
              >
                <input
                  value={q.image || ""}
                  onChange={(e) => set({ image: e.target.value })}
                  placeholder="https://…"
                  className="field h-11"
                />
              </Field>
            </div>
          </Panel>

          <Panel
            title="Prices"
            description="Enter your cost for each line. The margin is added on top and never shown to the customer."
          >
            {grouped.length ? (
              <div className="space-y-5">
                {grouped.map((g) => (
                  <div key={g.id}>
                    <p className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted">
                      <g.icon className="h-4 w-4" aria-hidden="true" /> {g.plural}
                    </p>
                    <ul className="space-y-2">
                      {g.rows.map(({ item, index }) => (
                        <ItemRow
                          key={index}
                          item={item}
                          index={index}
                          update={updateItem}
                          remove={removeItem}
                          defaultNights={q.nights}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
                Add hotels, transport and anything else that goes into the price.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {ITEM_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => addItem(c.id)}
                  className="chip h-9 gap-1.5 px-3 text-[13px]"
                >
                  <PiPlus className="h-3.5 w-3.5" aria-hidden="true" /> {c.label}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Pricing">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Margin %" hint="Added to your cost">
                <NumInput
                  value={q.markupPercent}
                  onChange={(v) => set({ markupPercent: v })}
                  step={0.5}
                  className="h-11"
                />
              </Field>
              <Field label="Discount (₹)" hint="Shown to the customer">
                <NumInput
                  value={q.discount}
                  onChange={(v) => set({ discount: v })}
                  className="h-11"
                />
              </Field>
              <Field label="GST">
                <Select
                  value={String(q.taxPercent ?? 5)}
                  onChange={(v) => set({ taxPercent: Number(v) })}
                  options={[
                    { value: "0", label: "No GST" },
                    { value: "5", label: "5% (tour package)" },
                    { value: "18", label: "18% (service fee basis)" },
                  ]}
                />
              </Field>
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-raised p-3.5 text-sm">
              <input
                type="checkbox"
                checked={!!q.showItemPrices}
                onChange={(e) => set({ showItemPrices: e.target.checked })}
                className="mt-0.5 h-4 w-4 accent-saffron-500"
              />
              <span>
                <span className="font-medium text-fg">Show a price for each line</span>
                <span className="mt-0.5 block text-muted">
                  Off: the customer sees what's included and one total. On: each line shows its
                  price (with your margin built in).
                </span>
              </span>
            </label>
          </Panel>

          <Panel
            title="Day by day"
            description={
              q.itinerary.length
                ? `${q.itinerary.length} days`
                : "Optional — load from a package or add days"
            }
          >
            <ol className="space-y-3">
              {q.itinerary.map((d, i) => (
                <li key={i} className="rounded-2xl border border-line p-3 sm:p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fg font-display text-sm text-page">
                      {i + 1}
                    </span>
                    <input
                      value={d.title || ""}
                      onChange={(e) => setDay(i, { title: e.target.value })}
                      placeholder="Ahmedabad to Haridwar"
                      aria-label={`Day ${i + 1} title`}
                      className="field h-10 min-w-0 flex-1"
                    />
                    <div className="flex shrink-0">
                      <button
                        type="button"
                        onClick={() => moveDay(i, -1)}
                        disabled={i === 0}
                        className="icon-btn h-9 w-9 border-0"
                        aria-label="Move day up"
                      >
                        <PiArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDay(i, 1)}
                        disabled={i === q.itinerary.length - 1}
                        className="icon-btn h-9 w-9 border-0"
                        aria-label="Move day down"
                      >
                        <PiArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          set({ itinerary: renumber(q.itinerary.filter((_, n) => n !== i)) })
                        }
                        className="icon-btn h-9 w-9 border-0 text-red-600"
                        aria-label={`Remove day ${i + 1}`}
                      >
                        <PiTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={d.description || ""}
                    onChange={(e) => setDay(i, { description: e.target.value })}
                    placeholder="What happens this day"
                    aria-label={`Day ${i + 1} description`}
                    className="field mt-2 resize-y text-sm"
                  />
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() =>
                set({
                  itinerary: [
                    ...q.itinerary,
                    { day: q.itinerary.length + 1, title: "", description: "", meals: [] },
                  ],
                })
              }
              className="chip mt-3 h-9 gap-1.5 px-3 text-[13px]"
            >
              <PiPlus className="h-3.5 w-3.5" /> Add day
            </button>
          </Panel>

          <Panel title="What's included">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Included" hint="One per line">
                <textarea
                  rows={6}
                  value={lines(q.inclusions)}
                  onChange={(e) => set({ inclusions: e.target.value.split("\n") })}
                  onBlur={(e) => set({ inclusions: unlines(e.target.value) })}
                  className="field resize-y text-sm"
                />
              </Field>
              <Field label="Not included" hint="One per line">
                <textarea
                  rows={6}
                  value={lines(q.exclusions)}
                  onChange={(e) => set({ exclusions: e.target.value.split("\n") })}
                  onBlur={(e) => set({ exclusions: unlines(e.target.value) })}
                  className="field resize-y text-sm"
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Message & terms">
            <div className="grid gap-4">
              <Field label="Intro for the customer">
                <textarea
                  rows={3}
                  value={q.intro || ""}
                  onChange={(e) => set({ intro: e.target.value })}
                  placeholder="A short note about the trip you've planned for them"
                  className="field resize-y text-sm"
                />
              </Field>
              <Field label="Notes (shown on the quote)">
                <textarea
                  rows={2}
                  value={q.notes || ""}
                  onChange={(e) => set({ notes: e.target.value })}
                  placeholder="Helicopter tickets are booked on the yatra portal once dates are fixed…"
                  className="field resize-y text-sm"
                />
              </Field>
              <Field label="Terms & payment">
                <textarea
                  rows={4}
                  value={q.terms || ""}
                  onChange={(e) => set({ terms: e.target.value })}
                  className="field resize-y text-sm"
                />
              </Field>
              <Field label="Valid until" className="sm:max-w-xs">
                <input
                  type="date"
                  value={day10(q.validUntil)}
                  onChange={(e) => set({ validUntil: e.target.value || null })}
                  className="field h-11"
                />
              </Field>
            </div>
          </Panel>
        </fieldset>

        <aside className="min-w-0 lg:col-span-4">
          <div className="lg:sticky lg:top-[5.5rem]">{summary}</div>
        </aside>
      </div>

      {/* Phones/tablets: total + save always in reach */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-line bg-page/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="min-w-0">
          <p className="text-xs text-muted">Customer pays</p>
          <p className="font-display text-xl tabular-nums text-fg">{formatINR(totals.total)}</p>
        </div>
        <button
          type="button"
          onClick={dirty ? save : send}
          disabled={saving || (locked && !dirty)}
          className="btn btn-accent h-11"
        >
          {saving
            ? "Saving…"
            : dirty
              ? "Save"
              : locked
                ? "Locked"
                : q.status === "draft"
                  ? "Send"
                  : "Share"}
        </button>
      </div>
    </div>
  );
};

export default QuoteBuilder;
