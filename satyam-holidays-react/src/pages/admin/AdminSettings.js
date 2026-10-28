import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  PiArrowSquareOut,
  PiBell,
  PiBuildings,
  PiCheck,
  PiCheckCircle,
  PiCircle,
  PiCopy,
  PiEye,
  PiEyeSlash,
  PiFileText,
  PiFloppyDisk,
  PiHouseLine,
  PiImage,
  PiPhone,
  PiPlus,
  PiShareNetwork,
  PiShieldCheck,
  PiTrash,
  PiUserPlus,
  PiUsers,
  PiWarningCircle,
} from "react-icons/pi";
import { apiUrl, fetchWithAuth, safeJson, toastApiError } from "../../config/siteConfig";
import CONTENT_DEFAULTS from "../../config/contentDefaults";
import { HomepageTab, LegalTab } from "./AdminContentTabs";
import { Avatar, Panel, timeAgo } from "./adminUi";

const TABS = [
  { id: "company", label: "Company & SEO", icon: PiBuildings, group: "Business" },
  { id: "contact", label: "Contact", icon: PiPhone, group: "Business" },
  { id: "social", label: "Social links", icon: PiShareNetwork, group: "Business" },
  { id: "homepage", label: "Homepage", icon: PiHouseLine, group: "Website" },
  { id: "hero", label: "Hero", icon: PiImage, group: "Website" },
  { id: "legal", label: "Legal pages", icon: PiFileText, group: "Website" },
  { id: "notifications", label: "Notifications", icon: PiBell, group: "System" },
  { id: "admins", label: "Admin accounts", icon: PiUsers, group: "System" },
  { id: "mfa", label: "Sign-in security", icon: PiShieldCheck, group: "System" },
];
const SAVABLE = ["company", "contact", "social", "hero", "homepage", "legal", "notifications"];
const asList = (v) => (Array.isArray(v) ? v : []);
const filled = (v) => typeof v === "string" && v.trim().length > 0;

/** Things that make the public site complete and trustworthy; each points at the tab that fixes it */
const buildChecklist = (s, { mfaEnabled }) => [
  { id: "logo", tab: "company", label: "Logo set", done: filled(s["company.logo"]) },
  {
    id: "seo",
    tab: "company",
    label: "Search title and description are a good length",
    done:
      (s["seo.title"] || "").length >= 30 &&
      (s["seo.title"] || "").length <= 65 &&
      (s["seo.description"] || "").length >= 70 &&
      (s["seo.description"] || "").length <= 165,
  },
  {
    id: "phone",
    tab: "contact",
    label: "At least one phone number",
    done: asList(s["company.phones"]).some(filled),
  },
  {
    id: "whatsapp",
    tab: "contact",
    label: "WhatsApp number for the chat button",
    done: filled(s["company.whatsapp"]),
  },
  {
    id: "address",
    tab: "contact",
    label: "Office address",
    done: filled(s["company.address"]?.line1),
  },
  {
    id: "map",
    tab: "contact",
    label: "Google Maps embed on the contact section",
    done: /google\.[^/]+\/maps\/embed/.test(s["company.mapEmbed"] || ""),
  },
  {
    id: "social",
    tab: "social",
    label: "Instagram or Facebook linked",
    done: filled(s["social.instagram"]) || filled(s["social.facebook"]),
  },
  {
    id: "heroImages",
    tab: "hero",
    label: "At least 3 hero photos",
    done: asList(s["hero.images"]).filter((i) => i?.url).length >= 3,
  },
  {
    id: "collections",
    tab: "homepage",
    label: "Homepage collections filled in",
    done: asList(s["home.collections"]).filter((c) => c?.title && c?.image).length >= 4,
  },
  {
    id: "google",
    tab: "homepage",
    label: "Google Place ID for live reviews",
    done: filled(s["google.placeId"]),
  },
  {
    id: "legal",
    tab: "legal",
    label: "Legal pages reviewed (not the starter template)",
    done: ["legal.privacy", "legal.terms", "legal.refund"].every(
      (k) => filled(s[k]) && s[k] !== CONTENT_DEFAULTS[k]
    ),
  },
  {
    id: "alerts",
    tab: "notifications",
    label: "WhatsApp number for new-enquiry alerts",
    done: filled(s["notifications.adminWhatsapp"]),
  },
  { id: "mfa", tab: "mfa", label: "Two-step sign-in turned on for you", done: mfaEnabled === true },
];

/* ── Small building blocks ─────────────────────────────── */

const Field = ({
  label,
  hint,
  value,
  onChange,
  type = "text",
  placeholder,
  className = "",
  counter,
}) => (
  <label className={`block min-w-0 ${className}`}>
    <span className="label flex items-center justify-between gap-2">
      {label}
      {counter}
    </span>
    {type === "textarea" ? (
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="field resize-y"
      />
    ) : type === "color" ? (
      <span className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-12 shrink-0 cursor-pointer rounded-xl border border-line bg-surface p-1"
          aria-label={`${label} picker`}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field"
          placeholder="#f57c20"
        />
      </span>
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="field"
      />
    )}
    {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
  </label>
);

const Counter = ({ length, min, max }) => {
  const ok = length >= min && length <= max;
  return (
    <span
      className={`text-[11px] tabular-nums ${ok ? "text-emerald-700 dark:text-emerald-400" : "text-saffron-700 dark:text-saffron-300"}`}
    >
      {length} / {min}–{max}
    </span>
  );
};

const Toggle = ({ label, description, checked, onChange }) => (
  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-raised p-4">
    <span>
      <span className="block text-sm font-medium text-fg">{label}</span>
      {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-saffron-500" : "bg-fg/20"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  </label>
);

const PasswordInput = ({ value, onChange, placeholder, label }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      <input
        type={show ? "text" : "password"}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="field pr-11"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-fg"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <PiEyeSlash className="h-4 w-4" /> : <PiEye className="h-4 w-4" />}
      </button>
    </span>
  );
};

/* ── Tabs ─────────────────────────────────────────────── */

const CompanyTab = ({ settings, set }) => {
  const title = settings["seo.title"] || "";
  const description = settings["seo.description"] || "";
  const site = (settings["company.website"] || "satyamholidays.com")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Company name"
          value={settings["company.name"] || ""}
          onChange={(v) => set("company.name", v)}
        />
        <Field
          label="Tagline"
          value={settings["company.tagline"] || ""}
          onChange={(v) => set("company.tagline", v)}
        />
        <Field
          label="Logo URL"
          value={settings["company.logo"] || ""}
          onChange={(v) => set("company.logo", v)}
          placeholder="/satyam-logo.svg or https://…"
        />
        <Field
          label="Website"
          value={settings["company.website"] || ""}
          onChange={(v) => set("company.website", v)}
          placeholder="https://satyamholidays.com"
        />
        <Field
          label="Brand colour"
          type="color"
          value={settings["brand.primaryColor"] || "#f57c20"}
          onChange={(v) => set("brand.primaryColor", v)}
        />
      </div>

      <div className="space-y-4 border-t border-line pt-6">
        <div>
          <h3 className="font-display text-lg text-fg">Search appearance</h3>
          <p className="mt-0.5 text-sm text-muted">What Google shows for the homepage.</p>
        </div>
        <Field
          label="Search title"
          value={title}
          onChange={(v) => set("seo.title", v)}
          counter={<Counter length={title.length} min={30} max={65} />}
          hint="Lead with what people search for, e.g. “Tour packages from Ahmedabad”."
        />
        <Field
          label="Search description"
          type="textarea"
          value={description}
          onChange={(v) => set("seo.description", v)}
          counter={<Counter length={description.length} min={70} max={165} />}
        />
        <div className="rounded-2xl border border-line bg-surface p-4" aria-label="Google preview">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Google preview</p>
          <p className="mt-2 truncate text-xs text-muted">{site}</p>
          <p className="mt-0.5 line-clamp-1 text-lg text-[#1a0dab] dark:text-[#8ab4f8]">
            {title || "Add a search title"}
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted">
            {description || "Add a search description."}
          </p>
        </div>
      </div>
    </div>
  );
};

const ContactTab = ({ settings, set }) => {
  const address = settings["company.address"] || {};
  const hours = settings["company.hours"] || {};
  const phones = asList(settings["company.phones"]);
  const map = settings["company.mapEmbed"] || "";
  const mapLooksWrong = map && !/google\.[^/]+\/maps\/embed/.test(map);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Email"
          type="email"
          value={settings["company.email"] || ""}
          onChange={(v) => set("company.email", v)}
        />
        <Field
          label="WhatsApp number"
          value={settings["company.whatsapp"] || ""}
          onChange={(v) => set("company.whatsapp", v)}
          hint="Used by every WhatsApp button on the site."
        />
        <Field
          label="Emergency phone"
          value={settings["company.emergencyPhone"] || ""}
          onChange={(v) => set("company.emergencyPhone", v)}
          hint="Shown to guests already on a trip."
        />
        <Field
          label="Emergency email"
          type="email"
          value={settings["company.emergencyEmail"] || ""}
          onChange={(v) => set("company.emergencyEmail", v)}
        />
      </div>

      <div>
        <span className="label">Phone numbers</span>
        <div className="space-y-2">
          {phones.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={p}
                onChange={(e) =>
                  set(
                    "company.phones",
                    phones.map((x, n) => (n === i ? e.target.value : x))
                  )
                }
                aria-label={`Phone ${i + 1}`}
                className="field"
              />
              <button
                type="button"
                onClick={() =>
                  set(
                    "company.phones",
                    phones.filter((_, n) => n !== i)
                  )
                }
                className="icon-btn h-12 w-12 shrink-0 text-red-600"
                aria-label={`Remove phone ${i + 1}`}
              >
                <PiTrash className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => set("company.phones", [...phones, ""])}
          className="chip mt-2 h-9 gap-1.5 px-3 text-[13px]"
        >
          <PiPlus className="h-3.5 w-3.5" /> Add phone
        </button>
      </div>

      <div className="space-y-4 border-t border-line pt-6">
        <h3 className="font-display text-lg text-fg">Office</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Address line 1"
            value={address.line1 || ""}
            onChange={(v) => set("company.address", { ...address, line1: v })}
          />
          <Field
            label="Address line 2"
            value={address.line2 || ""}
            onChange={(v) => set("company.address", { ...address, line2: v })}
          />
          <Field
            label="Country"
            value={address.country || ""}
            onChange={(v) => set("company.address", { ...address, country: v })}
          />
        </div>
        <Field
          label="Google Maps embed URL"
          value={map}
          onChange={(v) => set("company.mapEmbed", v.trim())}
          placeholder="https://www.google.com/maps/embed?pb=…"
          hint="Google Maps → Share → Embed a map → copy only the src=“…” link."
        />
        {mapLooksWrong && (
          <p className="flex items-start gap-2 rounded-xl bg-saffron-500/10 px-3 py-2 text-sm text-saffron-900 dark:text-saffron-200">
            <PiWarningCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            This doesn't look like an embed link, so the map may not show. It should contain
            “google.com/maps/embed”.
          </p>
        )}
        {map && !mapLooksWrong && (
          <iframe
            src={map}
            title="Map preview"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-48 w-full rounded-2xl border border-line"
          />
        )}
      </div>

      <div className="space-y-4 border-t border-line pt-6">
        <h3 className="font-display text-lg text-fg">Opening hours</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["weekdays", "Weekdays"],
            ["saturday", "Saturday"],
            ["sunday", "Sunday"],
          ].map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={hours[key] || ""}
              onChange={(v) => set("company.hours", { ...hours, [key]: v })}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const SOCIALS = [
  ["social.instagram", "Instagram", "https://instagram.com/…"],
  ["social.facebook", "Facebook", "https://facebook.com/…"],
  ["social.youtube", "YouTube", "https://youtube.com/@…"],
  ["social.twitter", "X (Twitter)", "https://x.com/…"],
];

const SocialTab = ({ settings, set }) => (
  <div className="space-y-4">
    {SOCIALS.map(([key, label, placeholder]) => {
      const value = settings[key] || "";
      const valid = /^https?:\/\/\S+\.\S+/.test(value);
      return (
        <div key={key} className="flex items-end gap-2">
          <Field
            label={label}
            value={value}
            onChange={(v) => set(key, v.trim())}
            placeholder={placeholder}
            className="flex-1"
          />
          <a
            href={valid ? value : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!valid}
            className={`icon-btn h-12 w-12 shrink-0 ${valid ? "" : "pointer-events-none opacity-30"}`}
            aria-label={`Open ${label}`}
            title="Open to check the link"
          >
            <PiArrowSquareOut className="h-4 w-4" />
          </a>
        </div>
      );
    })}
    <p className="text-xs text-muted">Leave a field empty to hide that icon in the footer.</p>
  </div>
);

const HeroTab = ({ settings, set }) => {
  const stats = asList(settings["hero.stats"]);
  const update = (i, patch) =>
    set(
      "hero.stats",
      stats.map((s, n) => (n === i ? { ...s, ...patch } : s))
    );
  return (
    <div className="space-y-6">
      <Field
        label="Heading"
        value={settings["hero.heading"] || ""}
        onChange={(v) => set("hero.heading", v)}
        hint="Wrap words in *asterisks* to show them in the italic accent style."
      />
      <Field
        label="Subheading"
        type="textarea"
        value={settings["hero.subheading"] || ""}
        onChange={(v) => set("hero.subheading", v)}
      />
      <p className="rounded-2xl bg-raised p-4 text-sm text-muted">
        Hero photos, the eyebrow line and the announcement bar are under{" "}
        <strong className="text-fg">Homepage</strong>.
      </p>

      <div className="space-y-3 border-t border-line pt-6">
        <div>
          <h3 className="font-display text-lg text-fg">Numbers under the search bar</h3>
          <p className="mt-0.5 text-sm text-muted">
            Keep them true — visitors notice when figures don't add up.
          </p>
        </div>
        {stats.map((stat, i) => (
          <div
            key={i}
            className="grid grid-cols-[minmax(0,1fr)_4.5rem_auto] items-end gap-2 sm:grid-cols-[8rem_4.5rem_minmax(0,1fr)_auto]"
          >
            <Field
              label="Value"
              type="number"
              value={stat.value ?? 0}
              onChange={(v) => update(i, { value: parseInt(v, 10) || 0 })}
            />
            <Field
              label="Suffix"
              value={stat.suffix || ""}
              onChange={(v) => update(i, { suffix: v })}
            />
            <Field
              label="Label"
              value={stat.label || ""}
              onChange={(v) => update(i, { label: v })}
              className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto"
            />
            <button
              type="button"
              onClick={() =>
                set(
                  "hero.stats",
                  stats.filter((_, n) => n !== i)
                )
              }
              className="icon-btn h-12 w-12 text-red-600"
              aria-label={`Remove stat ${i + 1}`}
            >
              <PiTrash className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => set("hero.stats", [...stats, { value: 0, suffix: "+", label: "" }])}
          className="chip h-9 gap-1.5 px-3 text-[13px]"
        >
          <PiPlus className="h-3.5 w-3.5" /> Add number
        </button>
      </div>
    </div>
  );
};

const NotificationsTab = ({ settings, set }) => (
  <div className="space-y-3">
    <Toggle
      label="Email alerts"
      description="Email the office for every new enquiry and send the customer a thank-you email."
      checked={settings["notifications.emailEnabled"] !== false}
      onChange={(v) => set("notifications.emailEnabled", v)}
    />
    <Toggle
      label="WhatsApp alerts"
      description="Needs the WhatsApp Business API keys on the server (WHATSAPP_ENABLE=true)."
      checked={settings["notifications.whatsappEnabled"] !== false}
      onChange={(v) => set("notifications.whatsappEnabled", v)}
    />
    <Field
      label="Send new-enquiry alerts to"
      value={settings["notifications.adminWhatsapp"] || ""}
      onChange={(v) => set("notifications.adminWhatsapp", v)}
      placeholder="+91 98247 37137"
      hint="The planner's WhatsApp number, with country code."
      className="pt-2"
    />
  </div>
);

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast.success("Copied");
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("Couldn't copy");
        }
      }}
      className="btn btn-ghost h-9 px-3 text-xs"
    >
      {copied ? <PiCheck className="h-4 w-4 text-emerald-600" /> : <PiCopy className="h-4 w-4" />}
      {copied ? "Copied" : "Copy codes"}
    </button>
  );
};

const AdminsTab = ({ me }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [creating, setCreating] = useState(false);
  const [resetId, setResetId] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetchWithAuth(apiUrl("/api/auth/users"));
      const json = await safeJson(res);
      if (json.success) setUsers(json.data);
    } catch (err) {
      toastApiError(err, "Failed to load administrators");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const isSelf = (u) => me && (me.id === u._id || me.email === u.email);

  const create = async (e) => {
    e.preventDefault();
    if (form.password.length < 8)
      return toastApiError("Password must be at least 8 characters long");
    setCreating(true);
    try {
      const res = await fetchWithAuth(apiUrl("/api/auth/users"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await safeJson(res);
      if (!res.ok || !json.success) throw json;
      toast.success("Administrator added");
      setForm({ name: "", email: "", password: "" });
      setShowCreate(false);
      fetchUsers();
    } catch (err) {
      toastApiError(err, "Failed to create administrator");
    } finally {
      setCreating(false);
    }
  };

  const remove = async (u) => {
    if (isSelf(u)) return toastApiError("You cannot delete your own account");
    if (!window.confirm(`Remove administrator ${u.email}? They will no longer be able to sign in.`))
      return;
    try {
      const res = await fetchWithAuth(apiUrl(`/api/auth/users/${u._id}`), { method: "DELETE" });
      const json = await safeJson(res);
      if (!res.ok || !json.success) throw json;
      toast.success("Administrator removed");
      fetchUsers();
    } catch (err) {
      toastApiError(err, "Failed to delete administrator");
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) return toastApiError("Password must be at least 8 characters long");
    setResetting(true);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/auth/users/${resetId}/password`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const json = await safeJson(res);
      if (!res.ok || !json.success) throw json;
      toast.success("Password updated");
      setResetId(null);
      setNewPassword("");
    } catch (err) {
      toastApiError(err, "Failed to update password");
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div className="skeleton h-40 rounded-2xl" />;

  const withoutMfa = users.filter((u) => !u.mfaEnabled).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {users.length} administrator{users.length === 1 ? "" : "s"}
          {withoutMfa > 0 && (
            <span className="text-saffron-700 dark:text-saffron-300">
              {" "}
              · {withoutMfa} without two-step sign-in
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="btn btn-ink h-10 w-fit"
        >
          <PiUserPlus className="h-4 w-4" /> {showCreate ? "Cancel" : "Add administrator"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="space-y-4 rounded-2xl border border-line bg-raised p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name"
              aria-label="Full name"
              className="field"
            />
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              aria-label="Email"
              className="field"
            />
            <PasswordInput
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              placeholder="Password (min 8)"
              label="Password"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={creating} className="btn btn-accent h-10">
              {creating ? "Adding…" : "Add administrator"}
            </button>
          </div>
        </form>
      )}

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {users.map((u) => (
          <li key={u._id} className="space-y-3 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={u.name} />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-fg">
                    <span className="truncate">{u.name}</span>
                    {isSelf(u) && (
                      <span className="rounded-full bg-raised px-2 py-0.5 text-[10px] font-medium text-muted">
                        You
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {u.email}
                    {u.lastLogin ? ` · last sign-in ${timeAgo(u.lastLogin)}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    u.mfaEnabled
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-saffron-500/10 text-saffron-800 dark:text-saffron-300"
                  }`}
                >
                  <PiShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {u.mfaEnabled ? "Two-step on" : "Two-step off"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setResetId(resetId === u._id ? null : u._id);
                    setNewPassword("");
                  }}
                  className="btn btn-ghost h-9 px-3 text-xs"
                >
                  Reset password
                </button>
                {!isSelf(u) && (
                  <button
                    type="button"
                    onClick={() => remove(u)}
                    className="icon-btn h-9 w-9 text-red-600"
                    aria-label={`Remove ${u.email}`}
                  >
                    <PiTrash className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {resetId === u._id && (
              <form onSubmit={resetPassword} className="flex flex-col gap-2 sm:flex-row">
                <div className="flex-1">
                  <PasswordInput
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="New password (min 8)"
                    label="New password"
                  />
                </div>
                <button type="submit" disabled={resetting} className="btn btn-accent h-12">
                  {resetting ? "Saving…" : "Save password"}
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

const MfaTab = ({ me, onChanged }) => {
  const [step, setStep] = useState("status");
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const enabled = !!me?.mfaEnabled;

  const startSetup = async () => {
    setBusy(true);
    try {
      const res = await fetchWithAuth(apiUrl("/api/auth/mfa/setup"), { method: "POST" });
      const json = await safeJson(res);
      if (!res.ok || !json.success) throw json;
      setSetupData(json);
      setStep("setup");
    } catch (err) {
      toastApiError(err, "Failed to start setup");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    if (code.length < 6) return toastApiError("Enter the 6-digit code");
    setBusy(true);
    try {
      const res = await fetchWithAuth(apiUrl("/api/auth/mfa/verify-and-enable"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, backupCodes: setupData.backupCodes }),
      });
      const json = await safeJson(res);
      if (!res.ok || !json.success) throw json;
      toast.success("Two-step sign-in is on");
      setStep("status");
      setSetupData(null);
      setCode("");
      onChanged();
    } catch (err) {
      toastApiError(err, "That code didn't work — try again");
    } finally {
      setBusy(false);
    }
  };

  const disable = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetchWithAuth(apiUrl("/api/auth/mfa/disable"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await safeJson(res);
      if (!res.ok || !json.success) throw json;
      toast.success("Two-step sign-in is off");
      setStep("status");
      setPassword("");
      onChanged();
    } catch (err) {
      toastApiError(err, "Incorrect password");
    } finally {
      setBusy(false);
    }
  };

  if (step === "setup" && setupData) {
    return (
      <form onSubmit={verify} className="space-y-6">
        <ol className="space-y-5">
          <li className="grid grid-cols-[2rem_1fr] gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-saffron-500/10 text-xs font-medium text-accent">
              1
            </span>
            <div>
              <p className="font-medium text-fg">Check your email</p>
              <p className="mt-0.5 text-sm text-muted">
                We've sent a 6-digit code to your admin email (look in spam too).
              </p>
            </div>
          </li>
          <li className="grid grid-cols-[2rem_1fr] gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-saffron-500/10 text-xs font-medium text-accent">
              2
            </span>
            <div className="min-w-0">
              <p className="font-medium text-fg">Save your backup codes</p>
              <p className="mt-0.5 text-sm text-muted">
                Each works once if you can't get to your email. Keep them somewhere safe.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-raised p-3 font-mono text-sm text-fg">
                {setupData.backupCodes.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
              <div className="mt-2">
                <CopyButton text={setupData.backupCodes.join("\n")} />
              </div>
            </div>
          </li>
          <li className="grid grid-cols-[2rem_1fr] gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-saffron-500/10 text-xs font-medium text-accent">
              3
            </span>
            <div className="max-w-xs">
              <p className="font-medium text-fg">Enter the code</p>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                aria-label="Verification code"
                className="field mt-2 h-14 text-center font-display text-2xl tracking-[0.5em]"
              />
            </div>
          </li>
        </ol>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy} className="btn btn-accent">
            {busy ? "Checking…" : "Turn on"}
          </button>
          <button type="button" onClick={() => setStep("status")} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  if (step === "disable") {
    return (
      <form onSubmit={disable} className="max-w-md space-y-4">
        <p className="flex items-start gap-2 rounded-2xl bg-red-500/10 p-4 text-sm text-red-800 dark:text-red-200">
          <PiWarningCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Without two-step sign-in, anyone with your password can open the admin. Confirm your
          password to turn it off.
        </p>
        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder="Your password"
          label="Your password"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="btn h-11 bg-red-600 text-white hover:bg-red-700"
          >
            {busy ? "Turning off…" : "Turn off"}
          </button>
          <button type="button" onClick={() => setStep("status")} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
            enabled ? "bg-emerald-500/10 text-emerald-600" : "bg-saffron-500/10 text-accent"
          }`}
        >
          <PiShieldCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <p className="font-medium text-fg">Two-step sign-in is {enabled ? "on" : "off"}</p>
          <p className="mt-0.5 max-w-md text-sm text-muted">
            {enabled
              ? "You'll be asked for a code from your email each time you sign in."
              : "Recommended: a code from your email is needed on top of your password."}
          </p>
        </div>
      </div>
      {enabled ? (
        <button
          type="button"
          onClick={() => setStep("disable")}
          className="btn btn-ghost text-red-600"
        >
          Turn off
        </button>
      ) : (
        <button type="button" onClick={startSetup} disabled={busy} className="btn btn-accent">
          {busy ? "Starting…" : "Turn on"}
        </button>
      )}
    </div>
  );
};

/* ── Page ─────────────────────────────────────────────── */

const TAB_COPY = {
  company: ["Company & SEO", "Your name, logo and how the homepage appears on Google."],
  contact: ["Contact", "Used in the header, footer, contact section, emails and PDFs."],
  social: ["Social links", "Footer icons and share links."],
  homepage: ["Homepage", "Hero photos, collections, FAQs, reviews and the announcement bar."],
  hero: ["Hero", "The first thing visitors read."],
  legal: ["Legal pages", "Privacy, terms and refunds. Have the owner review the wording."],
  notifications: ["Notifications", "Who hears about new enquiries, and how."],
  admins: ["Admin accounts", "People who can sign in to this admin."],
  mfa: ["Sign-in security", "Protect your own account with a one-time code."],
};

const AdminSettings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [activeTab, setActiveTab] = useState("company");
  const [me, setMe] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      const json = await safeJson(await fetch(apiUrl("/api/settings")));
      if (json.success && json.data) setSettings(json.data);
    } catch (err) {
      toastApiError(err, "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  // Current admin incl. MFA status (the checklist and the security tab both need it)
  const fetchMe = useCallback(async () => {
    try {
      const [verify, users] = await Promise.all([
        fetchWithAuth(apiUrl("/api/auth/verify")).then(safeJson),
        fetchWithAuth(apiUrl("/api/auth/users")).then(safeJson),
      ]);
      const user = verify?.user;
      if (!user) return;
      const full = users?.success
        ? users.data.find((u) => u.email === user.email || u._id === user.id)
        : null;
      setMe({ ...user, ...(full || {}) });
    } catch {
      // checklist just shows MFA as unknown
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchMe();
  }, [fetchSettings, fetchMe]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetchWithAuth(apiUrl("/api/settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await safeJson(res);
      if (!res.ok || !json.success) throw json;
      toast.success("Settings saved — the website updates within a few minutes");
      setDirty(false);
      setSavedAt(new Date());
      setSettings(json.data);
    } catch (err) {
      toastApiError(err, "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const checklist = useMemo(
    () => buildChecklist(settings, { mfaEnabled: me ? !!me.mfaEnabled : undefined }),
    [settings, me]
  );
  const done = checklist.filter((c) => c.done).length;
  const todoByTab = checklist.reduce((acc, c) => {
    if (!c.done) acc[c.tab] = (acc[c.tab] || 0) + 1;
    return acc;
  }, {});
  const score = Math.round((done / checklist.length) * 100);

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading settings">
        <div className="skeleton h-40 rounded-3xl" />
        <div className="skeleton h-96 rounded-3xl" />
      </div>
    );
  }

  const savable = SAVABLE.includes(activeTab);
  const [title, description] = TAB_COPY[activeTab];
  const groups = [...new Set(TABS.map((t) => t.group))];
  const tabProps = { settings, set: updateSetting };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <p className="text-sm text-muted">
          Everything visitors see that isn't a package — contact details, homepage, legal pages —
          plus who can sign in.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted" aria-live="polite">
            {dirty ? "Unsaved changes" : savedAt ? `Saved ${timeAgo(savedAt)}` : ""}
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="btn btn-accent h-10"
          >
            <PiFloppyDisk className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* Setup checklist */}
      <Panel
        title={`Site setup · ${done} of ${checklist.length} done`}
        description="Each item makes the site more complete or more trustworthy. Tap one to jump to it."
        action={
          <span
            className="font-display text-2xl tabular-nums text-fg"
            aria-label={`${score}% complete`}
          >
            {score}%
          </span>
        }
      >
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div
            className="h-full rounded-full bg-saffron-500 transition-all"
            style={{ width: `${score}%` }}
          />
        </div>
        <ul className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
          {[...checklist]
            .sort((a, b) => Number(a.done) - Number(b.done))
            .map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(c.tab)}
                  className="flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-left text-sm transition hover:bg-raised"
                >
                  {c.done ? (
                    <PiCheckCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                      aria-label="Done"
                    />
                  ) : (
                    <PiCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-saffron-500"
                      aria-label="To do"
                    />
                  )}
                  <span className={c.done ? "text-muted" : "text-fg"}>{c.label}</span>
                </button>
              </li>
            ))}
        </ul>
      </Panel>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Tab navigation: horizontal scroller on small screens, grouped sidebar on large */}
        <nav aria-label="Settings sections" className="lg:w-60 lg:shrink-0">
          <div className="-mx-4 flex gap-1 overflow-x-auto px-4 scrollbar-none lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:gap-5 lg:px-0">
            {groups.map((group) => (
              <div key={group} className="contents lg:block">
                <p className="hidden px-3 pb-1.5 text-[10px] uppercase tracking-[0.2em] text-muted lg:block">
                  {group}
                </p>
                {TABS.filter((t) => t.group === group).map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      aria-current={active ? "page" : undefined}
                      className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm transition lg:w-full ${
                        active ? "bg-fg text-page" : "text-muted hover:bg-raised hover:text-fg"
                      }`}
                    >
                      <tab.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      <span className="flex-1 text-left">{tab.label}</span>
                      {todoByTab[tab.id] > 0 && (
                        <span
                          className={`h-2 w-2 rounded-full ${active ? "bg-saffron-400" : "bg-saffron-500"}`}
                          aria-label={`${todoByTab[tab.id]} to do`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </nav>

        <Panel className="min-w-0 flex-1" title={title} description={description}>
          {activeTab === "company" && <CompanyTab {...tabProps} />}
          {activeTab === "contact" && <ContactTab {...tabProps} />}
          {activeTab === "social" && <SocialTab {...tabProps} />}
          {activeTab === "homepage" && (
            <HomepageTab settings={settings} updateSetting={updateSetting} />
          )}
          {activeTab === "hero" && <HeroTab {...tabProps} />}
          {activeTab === "legal" && <LegalTab settings={settings} updateSetting={updateSetting} />}
          {activeTab === "notifications" && <NotificationsTab {...tabProps} />}
          {activeTab === "admins" && <AdminsTab me={me} />}
          {activeTab === "mfa" && <MfaTab me={me} onChanged={fetchMe} />}
        </Panel>
      </div>

      {/* Small screens: the header button scrolls away on long tabs */}
      {savable && dirty && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-line bg-page/95 px-4 py-3 backdrop-blur lg:hidden">
          <p className="text-sm text-muted">Unsaved changes</p>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn btn-accent h-10"
          >
            <PiFloppyDisk className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
