import React, { useRef, useState } from "react";
import { toast } from "react-toastify";
import { PiArrowDown, PiArrowUp, PiPlus, PiTrash, PiUploadSimple } from "react-icons/pi";
import { apiUrl, fetchWithAuth, safeJson, toastApiError } from "../../config/siteConfig";

const input =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-4 focus:ring-saffron-500/15";

const Label = ({ children, hint }) => (
  <>
    <span className="mb-1.5 block text-xs font-medium text-muted">{children}</span>
    {hint && <span className="mb-1.5 -mt-1 block text-xs text-muted/80">{hint}</span>}
  </>
);

const Section = ({ title, description, children }) => (
  <section className="space-y-5 border-t border-line pt-8 first:border-t-0 first:pt-0">
    <div>
      <h3 className="font-display text-xl text-fg">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </div>
    {children}
  </section>
);

/** URL field with an upload button that reuses the package image endpoint (Cloudinary). */
const ImageInput = ({ value, onChange, label = "Image" }) => {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be smaller than 5MB");
    setBusy(true);
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetchWithAuth(apiUrl("/api/packages/upload-image"), {
        method: "POST",
        body,
      });
      const json = await safeJson(res);
      if (res.ok && json.success) onChange(json.imageUrl);
      else toastApiError(json, "Upload failed");
    } catch (err) {
      toastApiError(err, "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2">
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or upload"
          className={input}
        />
        <input
          ref={ref}
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => upload(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={busy}
          className="btn btn-ghost h-auto shrink-0 rounded-xl px-3"
          aria-label="Upload image"
        >
          <PiUploadSimple className="h-4 w-4" /> {busy ? "…" : "Upload"}
        </button>
      </div>
      {value && (
        <img
          src={value}
          alt=""
          className="mt-2 h-20 w-32 rounded-lg object-cover"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      )}
    </div>
  );
};

/**
 * Generic editor for an array of flat objects.
 * fields: [{ key, label, type: "text" | "textarea" | "image" | "number", wide, hint }]
 */
const ListEditor = ({
  items,
  onChange,
  fields,
  blank,
  itemTitle,
  max = 12,
  addLabel = "Add item",
}) => {
  const list = Array.isArray(items) ? items : [];
  const update = (i, patch) =>
    onChange(list.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {list.map((item, i) => (
        <div key={i} className="rounded-2xl border border-line p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-fg">{itemTitle(item, i)}</p>
            <div className="flex items-center gap-1 text-muted">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
                className="rounded p-1.5 hover:bg-raised disabled:opacity-30"
              >
                <PiArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === list.length - 1}
                aria-label="Move down"
                className="rounded p-1.5 hover:bg-raised disabled:opacity-30"
              >
                <PiArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onChange(list.filter((_, idx) => idx !== i))}
                aria-label="Remove"
                className="rounded p-1.5 hover:bg-raised hover:text-red-600"
              >
                <PiTrash className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div
                key={f.key}
                className={
                  f.wide || f.type === "textarea" || f.type === "image" ? "sm:col-span-2" : ""
                }
              >
                {f.type === "image" ? (
                  <ImageInput
                    label={f.label}
                    value={item[f.key]}
                    onChange={(v) => update(i, { [f.key]: v })}
                  />
                ) : (
                  <label className="block">
                    <Label hint={f.hint}>{f.label}</Label>
                    {f.type === "textarea" ? (
                      <textarea
                        rows={3}
                        value={item[f.key] || ""}
                        onChange={(e) => update(i, { [f.key]: e.target.value })}
                        className={input}
                      />
                    ) : (
                      <input
                        type={f.type === "number" ? "number" : "text"}
                        min={f.type === "number" ? 1 : undefined}
                        max={f.type === "number" ? 5 : undefined}
                        value={item[f.key] ?? ""}
                        onChange={(e) =>
                          update(i, {
                            [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value,
                          })
                        }
                        className={input}
                      />
                    )}
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {list.length < max && (
        <button
          type="button"
          onClick={() => onChange([...list, { ...blank }])}
          className="btn btn-ghost w-full"
        >
          <PiPlus className="h-4 w-4" /> {addLabel}
        </button>
      )}
    </div>
  );
};

const TextField = ({ label, value, onChange, hint, textarea, rows = 3, placeholder }) => (
  <label className="block">
    <Label hint={hint}>{label}</Label>
    {textarea ? (
      <textarea
        rows={rows}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={input}
        placeholder={placeholder}
      />
    ) : (
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={input}
        placeholder={placeholder}
      />
    )}
  </label>
);

const GoogleReviewsSection = ({ settings, updateSetting }) => {
  const [status, setStatus] = useState(null);
  const [testing, setTesting] = useState(false);

  const test = async () => {
    setTesting(true);
    try {
      const res = await fetchWithAuth(apiUrl("/api/reviews/google/refresh"), { method: "POST" });
      const json = await safeJson(res);
      setStatus(json.success ? json.data : { error: true });
    } catch {
      setStatus({ error: true });
    } finally {
      setTesting(false);
    }
  };

  const message = (() => {
    if (!status) return null;
    if (status.rating)
      return `Connected — ${status.name || "listing"}: ${status.rating}★ from ${status.totalReviews} reviews.`;
    if (status.reason === "missing_api_key")
      return "Place ID saved, but GOOGLE_PLACES_API_KEY isn't set on the backend. The site will link to your Google listing without showing reviews.";
    if (status.reason === "not_configured") return "Add a Place ID, save, then test again.";
    return "Google didn't return data. Check the Place ID and that the API key has the Places API (New) enabled.";
  })();

  return (
    <Section
      title="Google reviews"
      description="Show your Google rating and latest Google reviews on the homepage. Reviews are fetched by the server and refreshed every few hours."
    >
      <label className="flex cursor-pointer items-center gap-3 text-sm text-fg">
        <input
          type="checkbox"
          checked={settings["google.showReviews"] !== false}
          onChange={(e) => updateSetting("google.showReviews", e.target.checked)}
          className="h-5 w-5 accent-saffron-500"
        />
        Show Google reviews on the website
      </label>
      <TextField
        label="Google Place ID"
        value={settings["google.placeId"]}
        onChange={(v) => updateSetting("google.placeId", v.trim())}
        placeholder="ChIJ…"
        hint="Find it with Google's Place ID finder (search your business name)."
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={test} disabled={testing} className="btn btn-ghost h-10">
          {testing ? "Checking…" : "Test connection"}
        </button>
        <a
          href="https://developers.google.com/maps/documentation/places/web-service/place-id#find-id"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-accent underline underline-offset-4"
        >
          Place ID finder
        </a>
      </div>
      {message && (
        <p
          role="status"
          className={`rounded-2xl p-3 text-sm ${status?.rating ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300" : "bg-raised text-muted"}`}
        >
          {message}
        </p>
      )}
      <p className="text-xs text-muted">
        Save your changes before testing — the test uses the saved Place ID.
      </p>
    </Section>
  );
};

export const HomepageTab = ({ settings, updateSetting }) => {
  const s = (key) => settings[key];
  const set = (key) => (value) => updateSetting(key, value);

  return (
    <div className="space-y-10">
      <Section
        title="Announcement bar"
        description="A slim banner above the header. Visitors can dismiss it for their session."
      >
        <label className="flex cursor-pointer items-center gap-3 text-sm text-fg">
          <input
            type="checkbox"
            checked={s("announcement.enabled") !== false}
            onChange={(e) => set("announcement.enabled")(e.target.checked)}
            className="h-5 w-5 accent-saffron-500"
          />
          Show the announcement bar
        </label>
        <TextField
          label="Message"
          value={s("announcement.text")}
          onChange={set("announcement.text")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Link text"
            value={s("announcement.linkLabel")}
            onChange={set("announcement.linkLabel")}
          />
          <TextField
            label="Link to"
            value={s("announcement.link")}
            onChange={set("announcement.link")}
            hint="A page on this site, e.g. /packages?q=kashmir"
          />
        </div>
      </Section>

      <Section
        title="Hero"
        description="Headline and stats are under the Hero Section tab. Wrap words in *asterisks* to make them italic orange."
      >
        <TextField
          label="Small line above the headline"
          value={s("hero.eyebrow")}
          onChange={set("hero.eyebrow")}
        />
        <div>
          <Label>Background photos (rotate every few seconds)</Label>
          <ListEditor
            items={s("hero.images")}
            onChange={set("hero.images")}
            blank={{ url: "", caption: "" }}
            itemTitle={(item, i) => item.caption || `Photo ${i + 1}`}
            max={6}
            addLabel="Add photo"
            fields={[
              { key: "url", label: "Photo", type: "image" },
              { key: "caption", label: "Caption", wide: true },
            ]}
          />
        </div>
      </Section>

      <Section
        title="Trip collections"
        description="The photo tiles under the hero. The first tile is shown large. Each links to the packages page, pre-filtered."
      >
        <ListEditor
          items={s("home.collections")}
          onChange={set("home.collections")}
          blank={{ title: "", subtitle: "", image: "", query: "" }}
          itemTitle={(item, i) => item.title || `Collection ${i + 1}`}
          max={6}
          addLabel="Add collection"
          fields={[
            { key: "title", label: "Title" },
            { key: "subtitle", label: "Subtitle" },
            { key: "image", label: "Photo", type: "image" },
            {
              key: "query",
              label: "Search keyword",
              hint: "e.g. kashmir — leave empty to use trip type",
            },
          ]}
        />
      </Section>

      <Section
        title="Why travel with us"
        description="Four short points shown beside the Kashmir photo."
      >
        <ListEditor
          items={s("home.highlights")}
          onChange={set("home.highlights")}
          blank={{ title: "", text: "" }}
          itemTitle={(item, i) => item.title || `Point ${i + 1}`}
          max={6}
          addLabel="Add point"
          fields={[
            { key: "title", label: "Title", wide: true },
            { key: "text", label: "Text", type: "textarea" },
          ]}
        />
      </Section>

      <Section
        title="About"
        description="The dark story section on the homepage. Use *asterisks* for italic orange words."
      >
        <TextField label="Heading" value={s("about.heading")} onChange={set("about.heading")} />
        <TextField
          label="Paragraph"
          value={s("about.body")}
          onChange={set("about.body")}
          textarea
          rows={4}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageInput label="Photo" value={s("about.image")} onChange={set("about.image")} />
          <TextField
            label="Photo caption"
            value={s("about.imageCaption")}
            onChange={set("about.imageCaption")}
          />
        </div>
      </Section>

      <Section
        title="Extra testimonials"
        description="Approved 4–5 star package reviews appear automatically. Add testimonials you've collected elsewhere (WhatsApp, Google) only with the traveller's permission."
      >
        <ListEditor
          items={s("home.testimonials")}
          onChange={set("home.testimonials")}
          blank={{ name: "", quote: "", trip: "", rating: 5 }}
          itemTitle={(item, i) => item.name || `Testimonial ${i + 1}`}
          max={6}
          addLabel="Add testimonial"
          fields={[
            { key: "name", label: "Traveller name" },
            { key: "trip", label: "Trip" },
            { key: "quote", label: "What they said", type: "textarea" },
            { key: "rating", label: "Stars (1–5)", type: "number" },
          ]}
        />
      </Section>

      <GoogleReviewsSection settings={settings} updateSetting={updateSetting} />

      <Section title="FAQs" description="Shown near the bottom of the homepage.">
        <ListEditor
          items={s("home.faqs")}
          onChange={set("home.faqs")}
          blank={{ q: "", a: "" }}
          itemTitle={(item, i) => item.q || `Question ${i + 1}`}
          max={12}
          addLabel="Add question"
          fields={[
            { key: "q", label: "Question", wide: true },
            { key: "a", label: "Answer", type: "textarea" },
          ]}
        />
      </Section>
    </div>
  );
};

export const LegalTab = ({ settings, updateSetting }) => (
  <div className="space-y-8">
    <p className="rounded-2xl bg-raised p-4 text-sm leading-relaxed text-muted">
      These pages are linked from the footer. Start a heading with{" "}
      <code className="text-fg">## </code> and separate paragraphs with a blank line. The text below
      is a starting template — have it reviewed against how you actually operate (payment schedule,
      cancellation charges) before relying on it.
    </p>
    {[
      { key: "legal.privacy", label: "Privacy policy", path: "/privacy-policy" },
      { key: "legal.terms", label: "Terms & conditions", path: "/terms" },
      { key: "legal.refund", label: "Cancellation & refunds", path: "/refund-policy" },
    ].map((page) => (
      <div key={page.key}>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-fg">{page.label}</span>
          <a
            href={page.path}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent underline underline-offset-4"
          >
            Preview
          </a>
        </div>
        <textarea
          rows={12}
          value={settings[page.key] || ""}
          onChange={(e) => updateSetting(page.key, e.target.value)}
          className={`${input} font-mono text-[13px] leading-relaxed`}
        />
      </div>
    ))}
  </div>
);
