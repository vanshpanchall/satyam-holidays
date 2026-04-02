import React, { useState, useEffect, useCallback } from "react";
import {
  FaSave,
  FaBuilding,
  FaPhone,
  FaShareAlt,
  FaChartBar,
  FaBell,
  FaPlus,
  FaTrash,
  FaSpinner,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { apiUrl, fetchWithAuth } from "../../config/siteConfig";

const TABS = [
  { id: "company", label: "Company", icon: <FaBuilding /> },
  { id: "contact", label: "Contact", icon: <FaPhone /> },
  { id: "social", label: "Social Links", icon: <FaShareAlt /> },
  { id: "hero", label: "Hero Section", icon: <FaChartBar /> },
  { id: "notifications", label: "Notifications", icon: <FaBell /> },
];

const AdminSettings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("company");
  const [dirty, setDirty] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/settings"));
      const json = await res.json();
      if (json.success && json.data) {
        setSettings(json.data);
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Settings saved successfully");
        setDirty(false);
        setSettings(json.data);
      } else {
        toast.error(json.message || "Failed to save settings");
      }
    } catch {
      toast.error("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-sm";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage your website content & configuration
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
        >
          {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Tabs + Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab Nav */}
        <div className="lg:w-56 flex lg:flex-col gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-amber-500 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          {activeTab === "company" && (
            <CompanyTab settings={settings} updateSetting={updateSetting} inputClass={inputClass} />
          )}
          {activeTab === "contact" && (
            <ContactTab settings={settings} updateSetting={updateSetting} inputClass={inputClass} />
          )}
          {activeTab === "social" && (
            <SocialTab settings={settings} updateSetting={updateSetting} inputClass={inputClass} />
          )}
          {activeTab === "hero" && (
            <HeroTab settings={settings} updateSetting={updateSetting} inputClass={inputClass} />
          )}
          {activeTab === "notifications" && (
            <NotificationsTab
              settings={settings}
              updateSetting={updateSetting}
              inputClass={inputClass}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Tab: Company ─── */
const CompanyTab = ({ settings, updateSetting, inputClass }) => (
  <div className="space-y-5">
    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Company Information</h2>
    <div className="grid sm:grid-cols-2 gap-4">
      <Field
        label="Company Name"
        value={settings["company.name"] || ""}
        onChange={(v) => updateSetting("company.name", v)}
        inputClass={inputClass}
      />
      <Field
        label="Tagline"
        value={settings["company.tagline"] || ""}
        onChange={(v) => updateSetting("company.tagline", v)}
        inputClass={inputClass}
      />
      <Field
        label="Logo URL"
        value={settings["company.logo"] || ""}
        onChange={(v) => updateSetting("company.logo", v)}
        inputClass={inputClass}
        placeholder="/satyam-logo.svg or https://..."
      />
      <Field
        label="Website URL"
        value={settings["company.website"] || ""}
        onChange={(v) => updateSetting("company.website", v)}
        inputClass={inputClass}
        placeholder="https://satyamholidays.com"
      />
      <Field
        label="Primary Brand Color"
        value={settings["brand.primaryColor"] || "#f59e0b"}
        onChange={(v) => updateSetting("brand.primaryColor", v)}
        inputClass={inputClass}
        type="color"
      />
    </div>
    <div className="grid sm:grid-cols-2 gap-4">
      <Field
        label="SEO Title"
        value={settings["seo.title"] || ""}
        onChange={(v) => updateSetting("seo.title", v)}
        inputClass={inputClass}
      />
      <Field
        label="SEO Description"
        value={settings["seo.description"] || ""}
        onChange={(v) => updateSetting("seo.description", v)}
        inputClass={inputClass}
      />
    </div>
  </div>
);

/* ─── Tab: Contact ─── */
const ContactTab = ({ settings, updateSetting, inputClass }) => {
  const address = settings["company.address"] || {};
  const hours = settings["company.hours"] || {};
  const phones = settings["company.phones"] || [];

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Contact Details</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          label="Email"
          value={settings["company.email"] || ""}
          onChange={(v) => updateSetting("company.email", v)}
          inputClass={inputClass}
          type="email"
        />
        <Field
          label="Emergency Phone"
          value={settings["company.emergencyPhone"] || ""}
          onChange={(v) => updateSetting("company.emergencyPhone", v)}
          inputClass={inputClass}
        />
        <Field
          label="WhatsApp Number"
          value={settings["company.whatsapp"] || ""}
          onChange={(v) => updateSetting("company.whatsapp", v)}
          inputClass={inputClass}
        />
      </div>

      {/* Phones */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Phone Numbers
        </label>
        {phones.map((p, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              value={p}
              onChange={(e) => {
                const updated = [...phones];
                updated[i] = e.target.value;
                updateSetting("company.phones", updated);
              }}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() =>
                updateSetting(
                  "company.phones",
                  phones.filter((_, idx) => idx !== i)
                )
              }
              className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
            >
              <FaTrash />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => updateSetting("company.phones", [...phones, ""])}
          className="inline-flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
        >
          <FaPlus /> Add Phone
        </button>
      </div>

      {/* Address */}
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 pt-2">Address</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          label="Line 1"
          value={address.line1 || ""}
          onChange={(v) => updateSetting("company.address", { ...address, line1: v })}
          inputClass={inputClass}
        />
        <Field
          label="Line 2"
          value={address.line2 || ""}
          onChange={(v) => updateSetting("company.address", { ...address, line2: v })}
          inputClass={inputClass}
        />
        <Field
          label="Country"
          value={address.country || ""}
          onChange={(v) => updateSetting("company.address", { ...address, country: v })}
          inputClass={inputClass}
        />
      </div>

      {/* Business Hours */}
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 pt-2">
        Business Hours
      </h3>
      <div className="grid sm:grid-cols-1 gap-4">
        <Field
          label="Weekdays"
          value={hours.weekdays || ""}
          onChange={(v) => updateSetting("company.hours", { ...hours, weekdays: v })}
          inputClass={inputClass}
        />
        <Field
          label="Saturday"
          value={hours.saturday || ""}
          onChange={(v) => updateSetting("company.hours", { ...hours, saturday: v })}
          inputClass={inputClass}
        />
        <Field
          label="Sunday"
          value={hours.sunday || ""}
          onChange={(v) => updateSetting("company.hours", { ...hours, sunday: v })}
          inputClass={inputClass}
        />
      </div>
    </div>
  );
};

/* ─── Tab: Social ─── */
const SocialTab = ({ settings, updateSetting, inputClass }) => (
  <div className="space-y-5">
    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Social Links</h2>
    <div className="grid sm:grid-cols-1 gap-4">
      <Field
        label="Facebook"
        value={settings["social.facebook"] || ""}
        onChange={(v) => updateSetting("social.facebook", v)}
        inputClass={inputClass}
        placeholder="https://facebook.com/..."
      />
      <Field
        label="Instagram"
        value={settings["social.instagram"] || ""}
        onChange={(v) => updateSetting("social.instagram", v)}
        inputClass={inputClass}
        placeholder="https://instagram.com/..."
      />
      <Field
        label="Twitter / X"
        value={settings["social.twitter"] || ""}
        onChange={(v) => updateSetting("social.twitter", v)}
        inputClass={inputClass}
        placeholder="https://twitter.com/..."
      />
    </div>
  </div>
);

/* ─── Tab: Hero ─── */
const HeroTab = ({ settings, updateSetting, inputClass }) => {
  const stats = settings["hero.stats"] || [];

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Hero Section</h2>
      <Field
        label="Heading"
        value={settings["hero.heading"] || ""}
        onChange={(v) => updateSetting("hero.heading", v)}
        inputClass={inputClass}
      />
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Subheading
        </label>
        <textarea
          value={settings["hero.subheading"] || ""}
          onChange={(e) => updateSetting("hero.subheading", e.target.value)}
          rows={3}
          className={inputClass}
        />
      </div>

      {/* Stats */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Stats Cards
        </label>
        {stats.map((stat, i) => (
          <div key={i} className="flex gap-2 mb-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Value</label>
              <input
                type="number"
                value={stat.value || 0}
                onChange={(e) => {
                  const updated = [...stats];
                  updated[i] = { ...stat, value: parseInt(e.target.value) || 0 };
                  updateSetting("hero.stats", updated);
                }}
                className={inputClass}
              />
            </div>
            <div className="w-20">
              <label className="text-xs text-slate-500 mb-1 block">Suffix</label>
              <input
                value={stat.suffix || ""}
                onChange={(e) => {
                  const updated = [...stats];
                  updated[i] = { ...stat, suffix: e.target.value };
                  updateSetting("hero.stats", updated);
                }}
                className={inputClass}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Label</label>
              <input
                value={stat.label || ""}
                onChange={(e) => {
                  const updated = [...stats];
                  updated[i] = { ...stat, label: e.target.value };
                  updateSetting("hero.stats", updated);
                }}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={() =>
                updateSetting(
                  "hero.stats",
                  stats.filter((_, idx) => idx !== i)
                )
              }
              className="px-3 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
            >
              <FaTrash />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            updateSetting("hero.stats", [...stats, { value: 0, suffix: "+", label: "" }])
          }
          className="inline-flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
        >
          <FaPlus /> Add Stat
        </button>
      </div>
    </div>
  );
};

/* ─── Tab: Notifications ─── */
const NotificationsTab = ({ settings, updateSetting, inputClass }) => (
  <div className="space-y-5">
    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Notification Settings</h2>
    <Toggle
      label="Email Notifications"
      description="Send email notifications for new enquiries"
      checked={settings["notifications.emailEnabled"] !== false}
      onChange={(v) => updateSetting("notifications.emailEnabled", v)}
    />
    <Toggle
      label="WhatsApp Notifications"
      description="Send WhatsApp messages for new enquiries (requires API and WHATSAPP_ENABLE=true)"
      checked={settings["notifications.whatsappEnabled"] !== false}
      onChange={(v) => updateSetting("notifications.whatsappEnabled", v)}
    />
    <Field
      label="Admin WhatsApp Number"
      value={settings["notifications.adminWhatsapp"] || ""}
      onChange={(v) => updateSetting("notifications.adminWhatsapp", v)}
      inputClass={inputClass}
      placeholder="+91 98247 37137"
    />
  </div>
);

/* ─── Reusable Field ─── */
const Field = ({ label, value, onChange, inputClass, type = "text", placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
      {label}
    </label>
    {type === "color" ? (
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder="#f59e0b"
        />
      </div>
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        placeholder={placeholder}
      />
    )}
  </div>
);

/* ─── Reusable Toggle ─── */
const Toggle = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
    <div>
      <p className="text-sm font-medium text-slate-800 dark:text-white">{label}</p>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
      )}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  </div>
);

export default AdminSettings;
