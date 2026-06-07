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
  FaUsers,
  FaShieldAlt,
  FaCopy,
  FaCheck,
  FaUserPlus,
  FaLock,
  FaKey,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { apiUrl, fetchWithAuth, safeJson, toastApiError } from "../../config/siteConfig";

const TABS = [
  { id: "company", label: "Company", icon: <FaBuilding /> },
  { id: "contact", label: "Contact", icon: <FaPhone /> },
  { id: "social", label: "Social Links", icon: <FaShareAlt /> },
  { id: "hero", label: "Hero Section", icon: <FaChartBar /> },
  { id: "notifications", label: "Notifications", icon: <FaBell /> },
  { id: "admins", label: "Admin Accounts", icon: <FaUsers /> },
  { id: "mfa", label: "MFA Security", icon: <FaShieldAlt /> },
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
      const json = await safeJson(res);
      if (json.success && json.data) {
        setSettings(json.data);
      }
    } catch (err) {
      toastApiError(err, "Failed to load settings");
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
      const json = await safeJson(res);
      if (res.ok && json.success) {
        toast.success("Settings saved successfully");
        setDirty(false);
        setSettings(json.data);
      } else {
        toastApiError(json, "Failed to save settings");
      }
    } catch (err) {
      toastApiError(err, "An error occurred while saving");
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
        {["company", "contact", "social", "hero", "notifications"].includes(activeTab) && (
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        )}
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
          {activeTab === "admins" && <AdminsTab inputClass={inputClass} />}
          {activeTab === "mfa" && <MfaTab inputClass={inputClass} />}
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

/* ─── Copy Button Helper ─── */
const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 font-medium transition-colors border border-slate-200 dark:border-slate-700"
    >
      {copied ? <FaCheck className="text-emerald-500" /> : <FaCopy />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

/* ─── Tab: Admin Accounts ─── */
const AdminsTab = ({ inputClass }) => {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // New User Form State
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // Reset Password State
  const [resetId, setResetId] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, verifyRes] = await Promise.all([
        fetchWithAuth(apiUrl("/api/auth/users")),
        fetchWithAuth(apiUrl("/api/auth/verify")),
      ]);

      if (usersRes.ok) {
        const usersJson = await safeJson(usersRes);
        if (usersJson.success) setUsers(usersJson.data);
      }

      if (verifyRes.ok) {
        const verifyJson = await safeJson(verifyRes);
        if (verifyJson.success) setCurrentUser(verifyJson.user);
      }
    } catch (err) {
      toastApiError(err, "Failed to load administrators");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toastApiError("All fields are required");
      return;
    }
    if (password.length < 8) {
      toastApiError("Password must be at least 8 characters long");
      return;
    }
    setCreating(true);
    try {
      const res = await fetchWithAuth(apiUrl("/api/auth/users"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const json = await safeJson(res);
      if (res.ok && json.success) {
        toast.success("Administrator account created");
        setName("");
        setEmail("");
        setPassword("");
        setShowCreate(false);
        fetchData();
      } else {
        toastApiError(json, "Failed to create administrator");
      }
    } catch (err) {
      toastApiError(err, "An error occurred");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, userEmail) => {
    if (currentUser && (currentUser.id === id || currentUser.email === userEmail)) {
      toastApiError("You cannot delete your own account");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete administrator "${userEmail}"?`)) {
      return;
    }
    try {
      const res = await fetchWithAuth(apiUrl(`/api/auth/users/${id}`), {
        method: "DELETE",
      });
      const json = await safeJson(res);
      if (res.ok && json.success) {
        toast.success("Administrator deleted successfully");
        fetchData();
      } else {
        toastApiError(json, "Failed to delete administrator");
      }
    } catch (err) {
      toastApiError(err, "An error occurred");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toastApiError("Password must be at least 8 characters long");
      return;
    }
    setResetting(true);
    try {
      const res = await fetchWithAuth(apiUrl(`/api/auth/users/${resetId}/password`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const json = await safeJson(res);
      if (res.ok && json.success) {
        toast.success("Password updated successfully");
        setResetId(null);
        setNewPassword("");
      } else {
        toastApiError(json, "Failed to update password");
      }
    } catch (err) {
      toastApiError(err, "An error occurred");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <FaSpinner className="animate-spin text-amber-500 text-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Admin Accounts</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage administrative login accounts for the portal
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <FaUserPlus /> {showCreate ? "Cancel" : "Add Admin"}
        </button>
      </div>

      {/* Create New Admin Form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="p-5 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl space-y-4"
        >
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
            Create New Administrator
          </h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="Min 8 characters"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              {creating ? "Creating..." : "Save Admin User"}
            </button>
          </div>
        </form>
      )}

      {/* List of Admins */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {users.map((u) => {
            const isSelf =
              currentUser && (currentUser.id === u._id || currentUser.email === u.email);
            return (
              <div
                key={u._id}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-sm font-semibold">
                    {u.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-white text-sm">
                        {u.name}
                      </span>
                      {isSelf && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-bold rounded">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">
                      {u.email}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* MFA Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      u.mfaEnabled
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${u.mfaEnabled ? "bg-emerald-500" : "bg-amber-500"}`}
                    />
                    {u.mfaEnabled ? "MFA Enabled" : "MFA Disabled"}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setResetId(resetId === u._id ? null : u._id)}
                      className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-lg transition-colors"
                    >
                      Reset Password
                    </button>
                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => handleDelete(u._id, u.email)}
                        className="px-2.5 py-1.5 text-xs text-red-500 hover:text-red-600 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                </div>

                {/* Password Reset Form Drawer */}
                {resetId === u._id && (
                  <div className="w-full md:w-auto mt-3 md:mt-0 flex-basis-full md:flex-basis-0 border-t border-slate-100 dark:border-slate-700 pt-3 md:pt-0 md:border-t-0">
                    <form onSubmit={handleResetPassword} className="flex gap-2 items-center">
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New Password (min 8 chars)"
                        className={`${inputClass} !py-1.5 !px-3 max-w-[200px]`}
                      />
                      <button
                        type="submit"
                        disabled={resetting}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        {resetting ? "Saving..." : "Save"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ─── Tab: MFA Security ─── */
const MfaTab = ({ inputClass }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState("status"); // "status" | "setup" | "disable"

  // Setup data
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Disable data
  const [password, setPassword] = useState("");
  const [disabling, setDisabling] = useState(false);

  const fetchUserStatus = useCallback(async () => {
    try {
      const res = await fetchWithAuth(apiUrl("/api/auth/verify"));
      if (res.ok) {
        const json = await safeJson(res);
        if (json.success && json.user) {
          // Fetch current user from /users to see full MFA status
          const usersRes = await fetchWithAuth(apiUrl("/api/auth/users"));
          if (usersRes.ok) {
            const usersJson = await safeJson(usersRes);
            if (usersJson.success) {
              const fullUser = usersJson.data.find(
                (u) => u.email === json.user.email || u._id === json.user.id
              );
              if (fullUser) {
                setCurrentUser(fullUser);
              } else {
                setCurrentUser(json.user);
              }
            }
          } else {
            setCurrentUser(json.user);
          }
        }
      }
    } catch (err) {
      toastApiError(err, "Failed to load profile security details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserStatus();
  }, [fetchUserStatus]);

  const initiateSetup = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(apiUrl("/api/auth/mfa/setup"), { method: "POST" });
      const json = await safeJson(res);
      if (res.ok && json.success) {
        setSetupData(json);
        setStep("setup");
      } else {
        toastApiError(json, "Failed to start MFA setup");
      }
    } catch (err) {
      toastApiError(err, "MFA initialization error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length < 6) {
      toastApiError("Please enter a valid 6-digit code");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetchWithAuth(apiUrl("/api/auth/mfa/verify-and-enable"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          backupCodes: setupData.backupCodes,
        }),
      });
      const json = await safeJson(res);
      if (res.ok && json.success) {
        toast.success("MFA enabled successfully!");
        setStep("status");
        setSetupData(null);
        setCode("");
        fetchUserStatus();
      } else {
        toastApiError(json, "Incorrect verification code. Please try again.");
      }
    } catch (err) {
      toastApiError(err, "Failed to verify code");
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    if (!password) {
      toastApiError("Password is required");
      return;
    }
    setDisabling(true);
    try {
      const res = await fetchWithAuth(apiUrl("/api/auth/mfa/disable"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await safeJson(res);
      if (res.ok && json.success) {
        toast.success("MFA disabled successfully");
        setStep("status");
        setPassword("");
        fetchUserStatus();
      } else {
        toastApiError(json, "Incorrect password");
      }
    } catch (err) {
      toastApiError(err, "Failed to disable MFA");
    } finally {
      setDisabling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <FaSpinner className="animate-spin text-amber-500 text-2xl" />
      </div>
    );
  }

  const isEnabled = currentUser && currentUser.mfaEnabled;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
          Multi-Factor Authentication (MFA)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Secure your administrator profile with an extra layer of protection using authenticator
          apps.
        </p>
      </div>

      {step === "status" && (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 bg-slate-50/20 dark:bg-slate-900/10 space-y-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${
                isEnabled
                  ? "bg-emerald-500 shadow-lg shadow-emerald-500/20"
                  : "bg-amber-500 shadow-lg shadow-amber-500/20"
              }`}
            >
              <FaShieldAlt className="text-2xl" />
            </div>
            <div>
              <div className="font-semibold text-slate-800 dark:text-white text-base">
                MFA Status: {isEnabled ? "Active" : "Inactive"}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isEnabled
                  ? "Your account is secure. You will be prompted for an OTP code when logging in."
                  : "MFA is highly recommended to protect your administrative console from unauthorized access."}
              </p>
            </div>
          </div>

          <div className="pt-2">
            {isEnabled ? (
              <button
                type="button"
                onClick={() => setStep("disable")}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-900 transition-colors"
              >
                Disable MFA
              </button>
            ) : (
              <button
                type="button"
                onClick={initiateSetup}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                Enable MFA Security
              </button>
            )}
          </div>
        </div>
      )}

      {step === "setup" && setupData && (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 bg-white dark:bg-slate-850 space-y-6">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
            Configure Email Multi-Factor Authentication
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  1
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-1">
                    Check your Email
                  </h4>
                  <p className="text-xs text-slate-500">
                    A 6-digit verification code has been sent to your administrator email address.
                    Please check your inbox (and spam folder if not found).
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 pt-6 md:pt-0 md:pl-6">
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  2
                </span>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-1">
                    Save your Emergency Backup Codes
                  </h4>
                  <p className="text-xs text-slate-500 mb-2">
                    Keep these codes in a password manager or print them. Each code can be used once
                    to bypass login MFA if you lose access to your email.
                  </p>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 mb-2">
                    {setupData.backupCodes.map((code, idx) => (
                      <span key={idx} className="block">
                        {code}
                      </span>
                    ))}
                  </div>
                  <CopyButton text={setupData.backupCodes.join("\n")} />
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  3
                </span>
                <form onSubmit={handleVerify} className="flex-1 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-1">
                    Verify Verification Code
                  </h4>
                  <p className="text-xs text-slate-500">
                    Enter the 6-digit code currently showing in your email to enable MFA.
                  </p>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 123456"
                    className={`${inputClass} text-center tracking-[0.5em] text-lg font-bold`}
                  />
                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={() => setStep("status")}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Cancel Setup
                    </button>
                    <button
                      type="submit"
                      disabled={verifying}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                    >
                      {verifying ? "Verifying..." : "Verify & Enable"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "disable" && (
        <div className="border border-red-200 dark:border-red-900 rounded-xl p-6 bg-red-50/10 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
              <FaLock /> Disable MFA Security
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Warning: Disabling MFA reduces account security. To disable, please confirm your
              current account password.
            </p>
          </div>

          <form onSubmit={handleDisable} className="max-w-md space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className={inputClass}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={disabling}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {disabling ? "Disabling..." : "Confirm & Disable"}
              </button>
              <button
                type="button"
                onClick={() => setStep("status")}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
