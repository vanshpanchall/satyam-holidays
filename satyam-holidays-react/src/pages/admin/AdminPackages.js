import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  PiCopy,
  PiEyeSlash,
  PiFileImage,
  PiImageSquare,
  PiMagnifyingGlass,
  PiPencilSimple,
  PiPlus,
  PiStar,
  PiStarFill,
  PiTrash,
  PiX,
} from "react-icons/pi";
import {
  apiUrl,
  fetchWithAuth,
  resolveImageUrl,
  safeJson,
  toastApiError,
} from "../../config/siteConfig";
import PackageFlyer from "../../components/PackageFlyer";
import Select from "../../components/ui/Select";
import { ScrollArea } from "../../components/ui/Scrollbar";
import { formatINR, startingPrice } from "../../utils/format";

const EMPTY_PACKAGE = {
  name: "",
  category: "domestic",
  subcategory: "",
  duration: "",
  price: "",
  location: "",
  description: "",
  visa: "Not Required",
  image: "",
  rating: 4.5,
  reviews: 0,
  highlights: [],
  isActive: true,
  isFeatured: false,
  gallery: [],
  inclusions: [],
  exclusions: [],
  itinerary: [],
  availableDates: [],
  promotions: [],
};

const CATEGORY_OPTIONS = [
  { value: "domestic", label: "Domestic (India)" },
  { value: "international", label: "International" },
];
const STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "filling_fast", label: "Filling fast" },
  { value: "sold_out", label: "Sold out" },
];
// Match the admin inputs' height and type size
const compactSelect = "!h-[2.75rem] !text-sm !px-3.5";

const toDateInput = (d) => (d ? String(d).slice(0, 10) : "");

// Strip Mongo/meta fields and normalise before sending
const buildPayload = (data) => {
  const clean = (list, pick) => (list || []).map(pick);
  return {
    name: data.name,
    category: data.category,
    subcategory: data.subcategory,
    duration: data.duration,
    price: data.price,
    location: data.location,
    description: data.description,
    visa: data.visa || "Not Required",
    image: data.image || "",
    rating: Number(data.rating) || 0,
    reviews: Number(data.reviews) || 0,
    highlights: data.highlights || [],
    isActive: data.isActive !== false,
    isFeatured: !!data.isFeatured,
    gallery: data.gallery || [],
    inclusions: data.inclusions || [],
    exclusions: data.exclusions || [],
    itinerary: clean(data.itinerary, (d, i) => ({
      day: i + 1,
      title: d.title,
      description: d.description,
      meals: d.meals || [],
    })),
    availableDates: clean(data.availableDates, (d) => ({
      startDate: d.startDate,
      endDate: d.endDate,
      capacity: Number(d.capacity) || 20,
      booked: Number(d.booked) || 0,
      status: d.status || "available",
      ...(d.priceOverride ? { priceOverride: Number(d.priceOverride) } : {}),
    })),
    promotions: clean(data.promotions, (p) => ({
      code: String(p.code || "").toUpperCase(),
      discountPercent: Number(p.discountPercent) || 0,
      ...(p.validFrom ? { validFrom: p.validFrom } : {}),
      ...(p.validUntil ? { validUntil: p.validUntil } : {}),
      ...(p.description ? { description: p.description } : {}),
    })),
  };
};

const input =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-4 focus:ring-saffron-500/15";

const Field = ({ label, children, hint, className = "" }) => (
  <label className={`block ${className}`}>
    <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
  </label>
);

/** Editable list of short strings (highlights, inclusions…) */
const TagList = ({ label, items, onChange, placeholder }) => {
  const [draft, setDraft] = useState("");
  const add = () => {
    const value = draft.trim();
    if (!value) return;
    onChange([...(items || []), value]);
    setDraft("");
  };
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className={input}
        />
        <button type="button" onClick={add} className="btn btn-ink h-auto shrink-0 rounded-xl px-4">
          Add
        </button>
      </div>
      {(items || []).length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((item, i) => (
            <li
              key={`${item}-${i}`}
              className="flex items-center gap-1.5 rounded-full bg-raised py-1 pl-3 pr-1.5 text-sm text-fg"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${item}`}
                className="flex h-5 w-5 items-center justify-center rounded-full text-muted hover:bg-line hover:text-fg"
              >
                <PiX className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const Toggle = ({ checked, onChange, label, hint }) => (
  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-line p-4">
    <span>
      <span className="block text-sm font-medium text-fg">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
    </span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 h-5 w-5 accent-saffron-500"
    />
  </label>
);

const RowCard = ({ title, onRemove, children }) => (
  <div className="rounded-2xl border border-line p-4">
    <div className="mb-3 flex items-center justify-between">
      <p className="text-sm font-medium text-fg">{title}</p>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted hover:text-red-600"
        aria-label={`Remove ${title}`}
      >
        <PiTrash className="h-4 w-4" />
      </button>
    </div>
    {children}
  </div>
);

const TABS = [
  { id: "basics", label: "Basics" },
  { id: "media", label: "Photos" },
  { id: "itinerary", label: "Itinerary" },
  { id: "inclusions", label: "Included" },
  { id: "dates", label: "Dates & offers" },
];

const PackageModal = ({ pkg, initial, onClose, onSaved }) => {
  const [form, setForm] = useState(() => ({ ...EMPTY_PACKAGE, ...(pkg || initial || {}) }));
  const [tab, setTab] = useState("basics");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null); // "cover" | "gallery" | null
  const coverInput = useRef(null);
  const galleryInput = useRef(null);

  useEffect(() => {
    document.body.classList.add("modal-open");
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const onChange = (e) => set(e.target.name, e.target.value);
  const updateRow = (key, index, patch) =>
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  const removeRow = (key, index) =>
    setForm((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
  const addRow = (key, row) => setForm((prev) => ({ ...prev, [key]: [...(prev[key] || []), row] }));

  const upload = async (file, target) => {
    if (!file) return null;
    if (!/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.type)) {
      toast.error("Only JPEG, PNG, WebP or GIF images are allowed");
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return null;
    }
    setUploading(target);
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetchWithAuth(apiUrl("/api/packages/upload-image"), {
        method: "POST",
        body,
      });
      const json = await safeJson(res);
      if (res.ok && json.success) return json.imageUrl;
      toastApiError(json, "Image upload failed");
    } catch (err) {
      toastApiError(err, "Image upload failed");
    } finally {
      setUploading(null);
    }
    return null;
  };

  const uploadCover = async (file) => {
    const url = await upload(file, "cover");
    if (url) set("image", url);
  };

  const uploadGallery = async (files) => {
    for (const file of Array.from(files || []).slice(0, 12 - (form.gallery || []).length)) {
      const url = await upload(file, "gallery");
      if (url) setForm((prev) => ({ ...prev, gallery: [...(prev.gallery || []), url] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.name ||
      !form.subcategory ||
      !form.duration ||
      !form.price ||
      !form.location ||
      !form.description
    ) {
      setTab("basics");
      toast.error("Please fill in all required fields on the Basics tab");
      return;
    }
    setSaving(true);
    try {
      const id = pkg?._id || pkg?.id;
      const res = await fetchWithAuth(apiUrl(id ? `/api/packages/${id}` : "/api/packages"), {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      });
      const json = await safeJson(res);
      if (res.ok && json.success) {
        toast.success(id ? "Package updated" : "Package created");
        onSaved();
      } else {
        toastApiError(json, "Failed to save package");
      }
    } catch (err) {
      toastApiError(err, "Failed to save package");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={pkg ? "Edit package" : "New package"}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] supports-[height:100dvh]:max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-page shadow-2xl sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-display text-xl text-fg">{pkg ? "Edit package" : "New package"}</h2>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
            <PiX className="h-4 w-4" />
          </button>
        </div>

        <div
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-4 scrollbar-none"
          role="tablist"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm ${
                tab === t.id ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <ScrollArea className="flex-1" viewportClassName="p-6">
          <form id="package-form" onSubmit={handleSubmit} className="space-y-5">
            {tab === "basics" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Toggle
                    checked={form.isActive !== false}
                    onChange={(v) => set("isActive", v)}
                    label="Published"
                    hint="Unpublished packages are hidden from the website."
                  />
                  <Toggle
                    checked={!!form.isFeatured}
                    onChange={(v) => set("isFeatured", v)}
                    label="Featured"
                    hint="Shown first on the homepage and listings."
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name *" className="sm:col-span-2">
                    <input
                      required
                      name="name"
                      value={form.name}
                      onChange={onChange}
                      className={input}
                      placeholder="Chardham Yatra by Road"
                    />
                  </Field>
                  <Field label="Type *">
                    <Select
                      name="category"
                      value={form.category}
                      onChange={(v) => set("category", v)}
                      options={CATEGORY_OPTIONS}
                      className={compactSelect}
                    />
                  </Field>
                  <Field
                    label="Region / subcategory *"
                    hint="e.g. chardham, kashmir, dubai — used for filters"
                  >
                    <input
                      required
                      name="subcategory"
                      value={form.subcategory}
                      onChange={onChange}
                      className={input}
                      placeholder="chardham"
                    />
                  </Field>
                  <Field label="Duration *">
                    <input
                      required
                      name="duration"
                      value={form.duration}
                      onChange={onChange}
                      className={input}
                      placeholder="6 Days / 5 Nights"
                    />
                  </Field>
                  <Field
                    label="Price per person *"
                    hint="The first number is used for sorting and the price calculator"
                  >
                    <input
                      required
                      name="price"
                      value={form.price}
                      onChange={onChange}
                      className={input}
                      placeholder="₹24,999"
                    />
                  </Field>
                  <Field label="Location *">
                    <input
                      required
                      name="location"
                      value={form.location}
                      onChange={onChange}
                      className={input}
                      placeholder="Srinagar, Gulmarg"
                    />
                  </Field>
                  <Field label="Visa">
                    <input
                      name="visa"
                      value={form.visa}
                      onChange={onChange}
                      className={input}
                      placeholder="Not Required"
                    />
                  </Field>
                  <Field label="Rating (0–5)">
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      name="rating"
                      value={form.rating}
                      onChange={onChange}
                      className={input}
                    />
                  </Field>
                  <Field label="Review count">
                    <input
                      type="number"
                      min="0"
                      name="reviews"
                      value={form.reviews}
                      onChange={onChange}
                      className={input}
                    />
                  </Field>
                  <Field label="Description *" className="sm:col-span-2">
                    <textarea
                      required
                      rows={4}
                      maxLength={2000}
                      name="description"
                      value={form.description}
                      onChange={onChange}
                      className={input}
                    />
                  </Field>
                </div>
                <TagList
                  label="Highlights"
                  items={form.highlights}
                  onChange={(v) => set("highlights", v)}
                  placeholder="Add a highlight and press Enter"
                />
              </>
            )}

            {tab === "media" && (
              <>
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-muted">Cover photo</span>
                  <input
                    ref={coverInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    hidden
                    onChange={(e) => uploadCover(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    onClick={() => coverInput.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      uploadCover(e.dataTransfer.files?.[0]);
                    }}
                    className="relative block aspect-[16/9] w-full overflow-hidden rounded-2xl border border-dashed border-line bg-raised text-muted hover:border-fg/40"
                  >
                    {form.image ? (
                      <img
                        src={resolveImageUrl(form.image)}
                        alt="Cover preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full flex-col items-center justify-center gap-2">
                        <PiImageSquare className="h-8 w-8" />
                        <span className="text-sm">Click or drop an image (max 5MB)</span>
                      </span>
                    )}
                    {uploading === "cover" && (
                      <span className="absolute inset-0 flex items-center justify-center bg-ink-950/60 text-sm text-white">
                        Uploading…
                      </span>
                    )}
                  </button>
                  <Field label="…or paste an image URL" className="mt-3">
                    <input
                      value={form.image || ""}
                      onChange={(e) => set("image", e.target.value)}
                      className={input}
                      placeholder="https://"
                    />
                  </Field>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted">
                      Gallery ({(form.gallery || []).length}/12)
                    </span>
                    <button
                      type="button"
                      disabled={(form.gallery || []).length >= 12 || uploading === "gallery"}
                      onClick={() => galleryInput.current?.click()}
                      className="btn btn-ghost h-8 px-3 text-xs"
                    >
                      <PiPlus className="h-3.5 w-3.5" />{" "}
                      {uploading === "gallery" ? "Uploading…" : "Add photos"}
                    </button>
                  </div>
                  <input
                    ref={galleryInput}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    hidden
                    onChange={(e) => uploadGallery(e.target.files)}
                  />
                  {(form.gallery || []).length > 0 ? (
                    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {form.gallery.map((url, i) => (
                        <li
                          key={url + i}
                          className="group relative aspect-square overflow-hidden rounded-xl"
                        >
                          <img
                            src={resolveImageUrl(url)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeRow("gallery", i)}
                            aria-label="Remove photo"
                            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink-950/70 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                          >
                            <PiX className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
                      Extra photos appear in the gallery on the trip page.
                    </p>
                  )}
                </div>
              </>
            )}

            {tab === "itinerary" && (
              <div className="space-y-4">
                {(form.itinerary || []).map((day, i) => (
                  <RowCard
                    key={i}
                    title={`Day ${i + 1}`}
                    onRemove={() => removeRow("itinerary", i)}
                  >
                    <div className="grid gap-3">
                      <input
                        value={day.title}
                        onChange={(e) => updateRow("itinerary", i, { title: e.target.value })}
                        className={input}
                        placeholder="Title, e.g. Arrive Srinagar"
                        required
                      />
                      <textarea
                        value={day.description}
                        onChange={(e) => updateRow("itinerary", i, { description: e.target.value })}
                        rows={3}
                        className={input}
                        placeholder="What happens on this day"
                        required
                      />
                      <div className="flex flex-wrap gap-4 text-sm text-fg">
                        {["Breakfast", "Lunch", "Dinner"].map((meal) => (
                          <label key={meal} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="accent-saffron-500"
                              checked={(day.meals || []).includes(meal)}
                              onChange={(e) =>
                                updateRow("itinerary", i, {
                                  meals: e.target.checked
                                    ? [...(day.meals || []), meal]
                                    : (day.meals || []).filter((m) => m !== meal),
                                })
                              }
                            />
                            {meal}
                          </label>
                        ))}
                      </div>
                    </div>
                  </RowCard>
                ))}
                <button
                  type="button"
                  onClick={() => addRow("itinerary", { title: "", description: "", meals: [] })}
                  className="btn btn-ghost w-full"
                >
                  <PiPlus className="h-4 w-4" /> Add day
                </button>
              </div>
            )}

            {tab === "inclusions" && (
              <div className="space-y-6">
                <TagList
                  label="What's included"
                  items={form.inclusions}
                  onChange={(v) => set("inclusions", v)}
                  placeholder="e.g. Airport transfers"
                />
                <TagList
                  label="Not included"
                  items={form.exclusions}
                  onChange={(v) => set("exclusions", v)}
                  placeholder="e.g. Airfare, personal expenses"
                />
              </div>
            )}

            {tab === "dates" && (
              <div className="space-y-8">
                <section className="space-y-4">
                  <h3 className="font-display text-lg text-fg">Departures</h3>
                  {(form.availableDates || []).map((d, i) => (
                    <RowCard
                      key={i}
                      title={`Departure ${i + 1}`}
                      onRemove={() => removeRow("availableDates", i)}
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Starts">
                          <input
                            type="date"
                            required
                            value={toDateInput(d.startDate)}
                            onChange={(e) =>
                              updateRow("availableDates", i, { startDate: e.target.value })
                            }
                            className={input}
                          />
                        </Field>
                        <Field label="Ends">
                          <input
                            type="date"
                            required
                            min={toDateInput(d.startDate)}
                            value={toDateInput(d.endDate)}
                            onChange={(e) =>
                              updateRow("availableDates", i, { endDate: e.target.value })
                            }
                            className={input}
                          />
                        </Field>
                        <Field label="Seats">
                          <input
                            type="number"
                            min="1"
                            value={d.capacity ?? 20}
                            onChange={(e) =>
                              updateRow("availableDates", i, { capacity: e.target.value })
                            }
                            className={input}
                          />
                        </Field>
                        <Field label="Booked">
                          <input
                            type="number"
                            min="0"
                            value={d.booked ?? 0}
                            onChange={(e) =>
                              updateRow("availableDates", i, { booked: e.target.value })
                            }
                            className={input}
                          />
                        </Field>
                        <Field label="Status">
                          <Select
                            value={d.status || "available"}
                            onChange={(v) => updateRow("availableDates", i, { status: v })}
                            options={STATUS_OPTIONS}
                            className={compactSelect}
                          />
                        </Field>
                        <Field label="Price override (₹)" hint="Leave empty to use the base price">
                          <input
                            type="number"
                            min="0"
                            value={d.priceOverride ?? ""}
                            onChange={(e) =>
                              updateRow("availableDates", i, { priceOverride: e.target.value })
                            }
                            className={input}
                          />
                        </Field>
                      </div>
                    </RowCard>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      addRow("availableDates", {
                        startDate: "",
                        endDate: "",
                        capacity: 20,
                        booked: 0,
                        status: "available",
                      })
                    }
                    className="btn btn-ghost w-full"
                  >
                    <PiPlus className="h-4 w-4" /> Add departure
                  </button>
                </section>

                <section className="space-y-4">
                  <h3 className="font-display text-lg text-fg">Promo codes</h3>
                  {(form.promotions || []).map((p, i) => (
                    <RowCard
                      key={i}
                      title={p.code || `Code ${i + 1}`}
                      onRemove={() => removeRow("promotions", i)}
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Code">
                          <input
                            required
                            value={p.code || ""}
                            onChange={(e) =>
                              updateRow("promotions", i, {
                                code: e.target.value.toUpperCase().trim(),
                              })
                            }
                            className={`${input} uppercase`}
                            placeholder="SUMMER10"
                          />
                        </Field>
                        <Field label="Discount %">
                          <input
                            type="number"
                            required
                            min="1"
                            max="100"
                            value={p.discountPercent ?? ""}
                            onChange={(e) =>
                              updateRow("promotions", i, { discountPercent: e.target.value })
                            }
                            className={input}
                          />
                        </Field>
                        <Field label="Valid from">
                          <input
                            type="date"
                            value={toDateInput(p.validFrom)}
                            onChange={(e) =>
                              updateRow("promotions", i, { validFrom: e.target.value })
                            }
                            className={input}
                          />
                        </Field>
                        <Field label="Valid until">
                          <input
                            type="date"
                            value={toDateInput(p.validUntil)}
                            onChange={(e) =>
                              updateRow("promotions", i, { validUntil: e.target.value })
                            }
                            className={input}
                          />
                        </Field>
                      </div>
                    </RowCard>
                  ))}
                  <button
                    type="button"
                    onClick={() => addRow("promotions", { code: "", discountPercent: 10 })}
                    className="btn btn-ghost w-full"
                  >
                    <PiPlus className="h-4 w-4" /> Add promo code
                  </button>
                </section>
              </div>
            )}
          </form>
        </ScrollArea>

        <div className="flex shrink-0 gap-3 border-t border-line p-4">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
            Cancel
          </button>
          <button
            type="submit"
            form="package-form"
            disabled={saving || !!uploading}
            className="btn btn-accent flex-1"
          >
            {saving ? "Saving…" : pkg ? "Save changes" : "Create package"}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminPackages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
  const [searchTerm, setSearchTerm] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState(() =>
    searchParams.get("filter") === "draft" ? "draft" : "all"
  );
  const [flyerPackage, setFlyerPackage] = useState(null);

  // ?edit=<id> (e.g. "Review draft" from the Instagram import) opens that package once loaded
  const editId = searchParams.get("edit");
  useEffect(() => {
    if (!editId || loading) return;
    const target = packages.find((p) => (p._id || p.id) === editId);
    if (target) setEditing(target);
    searchParams.delete("edit");
    setSearchParams(searchParams, { replace: true });
  }, [editId, loading, packages, searchParams, setSearchParams]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(apiUrl("/api/packages?limit=100"));
      const json = await safeJson(res);
      if (json.success) setPackages(json.data || []);
    } catch (err) {
      toastApiError(err, "Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const patch = async (pkg, body, message) => {
    const id = pkg._id || pkg.id;
    try {
      const res = await fetchWithAuth(apiUrl(`/api/packages/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await safeJson(res);
      if (res.ok && json.success) {
        toast.success(message);
        setPackages((prev) => prev.map((p) => ((p._id || p.id) === id ? { ...p, ...body } : p)));
      } else {
        toastApiError(json, "Update failed");
      }
    } catch (err) {
      toastApiError(err, "Update failed");
    }
  };

  const handleDelete = async (pkg) => {
    if (
      !window.confirm(`Delete "${pkg.name}"? This can't be undone. Consider unpublishing instead.`)
    )
      return;
    try {
      const res = await fetchWithAuth(apiUrl(`/api/packages/${pkg._id || pkg.id}`), {
        method: "DELETE",
      });
      const json = await safeJson(res);
      if (res.ok && json.success) {
        toast.success("Package deleted");
        fetchPackages();
      } else {
        toastApiError(json, "Delete failed");
      }
    } catch (err) {
      toastApiError(err, "Delete failed");
    }
  };

  const duplicate = (pkg) => {
    const { _id, id, slug, createdAt, updatedAt, __v, ...rest } = pkg;
    setEditing({
      ...rest,
      name: `${pkg.name} (copy)`,
      isActive: false,
      isFeatured: false,
      _isCopy: true,
    });
  };

  const counts = useMemo(
    () => ({
      all: packages.length,
      domestic: packages.filter((p) => p.category === "domestic").length,
      international: packages.filter((p) => p.category === "international").length,
      draft: packages.filter((p) => p.isActive === false).length,
    }),
    [packages]
  );

  const visible = packages
    .filter((p) => {
      if (filter === "draft") return p.isActive === false;
      return filter === "all" || p.category === filter;
    })
    .filter((p) => {
      const q = searchTerm.toLowerCase();
      return !q || p.name?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q);
    });

  const FILTERS = [
    { id: "all", label: "All" },
    { id: "domestic", label: "India" },
    { id: "international", label: "International" },
    { id: "draft", label: "Drafts" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Create, publish and manage the trips shown on the website.
        </p>
        <button type="button" onClick={() => setEditing(null)} className="btn btn-accent">
          <PiPlus className="h-4 w-4" /> New package
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <PiMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or location"
            className={`${input} pl-10`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`chip ${filter === f.id ? "chip-active" : ""}`}
            >
              {f.label} <span className="text-xs opacity-60">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-72 rounded-3xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line p-14 text-center">
          <p className="font-display text-2xl text-fg">No packages here</p>
          <button type="button" onClick={() => setEditing(null)} className="btn btn-ink mt-6">
            Create a package
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((pkg) => {
            const draft = pkg.isActive === false;
            return (
              <article key={pkg._id || pkg.id} className="card flex flex-col overflow-hidden">
                <div className="relative aspect-[16/10] bg-raised">
                  {pkg.image ? (
                    <img
                      src={resolveImageUrl(pkg.image)}
                      alt=""
                      loading="lazy"
                      className={`h-full w-full object-cover ${draft ? "opacity-50 grayscale" : ""}`}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted">
                      <PiImageSquare className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute left-3 top-3 flex gap-2">
                    <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium capitalize text-ink-900">
                      {pkg.category}
                    </span>
                    {draft && (
                      <span className="rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-medium text-white">
                        Draft
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      patch(
                        pkg,
                        { isFeatured: !pkg.isFeatured },
                        pkg.isFeatured ? "Removed from featured" : "Marked as featured"
                      )
                    }
                    aria-pressed={!!pkg.isFeatured}
                    aria-label={pkg.isFeatured ? "Remove from featured" : "Feature this package"}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-saffron-600 hover:bg-white"
                  >
                    {pkg.isFeatured ? (
                      <PiStarFill className="h-4 w-4" />
                    ) : (
                      <PiStar className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg leading-snug text-fg">{pkg.name}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {pkg.location} · {pkg.duration}
                  </p>
                  {pkg.importSource?.permalink && (
                    <a
                      href={pkg.importSource.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex w-fit items-center gap-1 text-xs text-accent hover:underline"
                      title="Compare with the original post"
                    >
                      From Instagram ↗
                    </a>
                  )}
                  <p className="mt-3 text-sm text-fg">
                    From {formatINR(startingPrice(pkg))}
                    <span className="text-muted">
                      {" "}
                      · {(pkg.availableDates || []).length} departures ·{" "}
                      {(pkg.itinerary || []).length} days planned
                    </span>
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    <button
                      type="button"
                      onClick={() => setEditing(pkg)}
                      className="btn btn-ink h-9 flex-1 px-3 text-[13px]"
                    >
                      <PiPencilSimple className="h-4 w-4" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        patch(pkg, { isActive: draft }, draft ? "Published" : "Unpublished")
                      }
                      className="icon-btn h-9 w-9"
                      title={draft ? "Publish" : "Unpublish"}
                      aria-label={draft ? "Publish" : "Unpublish"}
                    >
                      <PiEyeSlash className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicate(pkg)}
                      className="icon-btn h-9 w-9"
                      title="Duplicate"
                      aria-label="Duplicate"
                    >
                      <PiCopy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlyerPackage(pkg)}
                      className="icon-btn h-9 w-9"
                      title="Make flyer"
                      aria-label="Make flyer"
                    >
                      <PiFileImage className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(pkg)}
                      className="icon-btn h-9 w-9 text-red-600"
                      title="Delete"
                      aria-label="Delete"
                    >
                      <PiTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing !== undefined && (
        <PackageModal
          pkg={editing && !editing._isCopy ? editing : null}
          initial={editing?._isCopy ? editing : null}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            fetchPackages();
          }}
        />
      )}
      {flyerPackage && <PackageFlyer pkg={flyerPackage} onClose={() => setFlyerPackage(null)} />}
    </div>
  );
};

export default AdminPackages;
