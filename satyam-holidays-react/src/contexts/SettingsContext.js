import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { apiUrl } from "../config/siteConfig";

const SettingsContext = createContext(null);

// Default fallback values (match backend defaults)
const FALLBACK = {
  "company.name": "Satyam Holidays",
  "company.tagline": "Journey With Joy!",
  "company.logo": "/satyam-logo.svg",
  "company.email": "satyamholidays19@gmail.com",
  "company.phones": ["+91 98247 37137", "+91 94265 86003"],
  "company.emergencyPhone": "+91 98247 37137",
  "company.whatsapp": "+91 98247 37137",
  "company.address": {
    line1: "56, Uttar Gujarat Panchal Society",
    line2: "Ranip, Ahmedabad, Gujarat",
    country: "India",
  },
  "company.hours": {
    weekdays: "Monday - Friday: 9:00 AM - 7:00 PM",
    saturday: "Saturday: 9:00 AM - 5:00 PM",
    sunday: "Sunday: 10:00 AM - 4:00 PM",
  },
  "social.facebook": "https://facebook.com/satyamholidays",
  "social.instagram": "https://instagram.com/satyamholidays",
  "social.twitter": "https://twitter.com/satyamholidays",
  "hero.heading": "Discover Amazing Adventures With Us!",
  "hero.subheading":
    "Experience the world's most beautiful destinations with our carefully crafted travel packages. From spiritual journeys to exotic beaches, we make your dream vacation a reality.",
  "hero.stats": [
    { value: 500, suffix: "+", label: "Happy Travelers" },
    { value: 50, suffix: "+", label: "Destinations" },
    { value: 10, suffix: "+", label: "Years Experience" },
  ],
  "brand.primaryColor": "#f59e0b",
  "company.website": "https://satyamholidays.com",
};

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const sanitizeToFallbackShape = (value, fallbackValue) => {
  if (Array.isArray(fallbackValue)) {
    return Array.isArray(value) ? value : fallbackValue;
  }

  if (isPlainObject(fallbackValue)) {
    if (!isPlainObject(value)) return fallbackValue;

    const sanitized = {};
    for (const [key, nestedFallback] of Object.entries(fallbackValue)) {
      sanitized[key] = sanitizeToFallbackShape(value[key], nestedFallback);
    }
    return sanitized;
  }

  if (typeof fallbackValue === "string") {
    return typeof value === "string" ? value : fallbackValue;
  }

  if (typeof fallbackValue === "number") {
    return Number.isFinite(value) ? value : fallbackValue;
  }

  if (typeof fallbackValue === "boolean") {
    return typeof value === "boolean" ? value : fallbackValue;
  }

  return value ?? fallbackValue;
};

const sanitizeHeroStats = (value, fallbackValue) => {
  if (!Array.isArray(value)) return fallbackValue;

  return value
    .filter((stat) => isPlainObject(stat))
    .map((stat) => {
      const numericValue = Number(stat.value);
      return {
        value: Number.isFinite(numericValue) ? numericValue : 0,
        suffix: typeof stat.suffix === "string" ? stat.suffix : "+",
        label: typeof stat.label === "string" ? stat.label : "",
      };
    });
};

const sanitizeStringArray = (value, fallbackValue) => {
  if (!Array.isArray(value)) return fallbackValue;
  return value.filter((item) => typeof item === "string");
};

const sanitizeSettingValue = (key, value, fallbackValue) => {
  if (typeof fallbackValue === "undefined") {
    return value;
  }

  if (key === "hero.stats") {
    return sanitizeHeroStats(value, fallbackValue);
  }

  if (key === "company.phones") {
    return sanitizeStringArray(value, fallbackValue);
  }

  return sanitizeToFallbackShape(value, fallbackValue);
};

const sanitizeSettingsPayload = (rawSettings = {}) => {
  const incoming = isPlainObject(rawSettings) ? rawSettings : {};
  const sanitized = {};

  for (const [key, fallbackValue] of Object.entries(FALLBACK)) {
    sanitized[key] = sanitizeSettingValue(key, incoming[key], fallbackValue);
  }

  for (const [key, value] of Object.entries(incoming)) {
    if (!(key in sanitized)) {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

// Shared promise to deduplicate concurrent setting requests across provider mounts
let inFlightSettingsPromise = null;

export function resetInFlightSettingsPromise() {
  inFlightSettingsPromise = null;
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    // If a request is already in-flight, await it instead of firing a new one
    if (inFlightSettingsPromise) {
      try {
        const data = await inFlightSettingsPromise;
        setSettings(data);
        setLoading(false);
        return;
      } catch (err) {
        // In-flight request failed, fall through to retry
      }
    }

    setLoading(true);
    setError(null);

    inFlightSettingsPromise = (async () => {
      const res = await fetch(apiUrl("/api/settings"));
      if (!res.ok) {
        throw new Error(`Failed to fetch settings: ${res.status}`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        return sanitizeSettingsPayload(json.data);
      }
      throw new Error("Invalid settings response");
    })();

    try {
      const data = await inFlightSettingsPromise;
      setSettings(data);
    } catch (err) {
      setError(err.message || "Failed to load settings");
      inFlightSettingsPromise = null; // Clear promise on error so next call can retry
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const isAdminPath =
      typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
    const shouldDeferPublicFetch = process.env.NODE_ENV === "production" && !isAdminPath;

    if (!shouldDeferPublicFetch) {
      fetchSettings();
      return;
    }

    const timer = window.setTimeout(() => {
      fetchSettings();
    }, 3500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchSettings]);

  const refetch = useCallback(() => {
    inFlightSettingsPromise = null; // Reset promise to force a fresh reload
    fetchSettings();
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, error, setSettings, refetch }}>
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Hook to read a setting by key with fallback
 * @param {string} key - Dot-notation key like "company.name"
 * @param {*} fallback - Fallback value if key not found
 */
export function useSetting(key, fallback) {
  const ctx = useContext(SettingsContext);
  const fallbackValue = fallback ?? FALLBACK[key];
  if (!ctx) return fallbackValue;
  return sanitizeSettingValue(key, ctx.settings[key], fallbackValue);
}

/**
 * Hook to get the full settings object + loading/error states
 */
export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) return { settings: FALLBACK, loading: false, error: null, refetch: () => {} };
  return {
    settings: ctx.settings,
    loading: ctx.loading,
    error: ctx.error,
    setSettings: ctx.setSettings,
    refetch: ctx.refetch,
  };
}

/**
 * Hook that returns a siteConfig-shaped object backed by SettingsContext.
 * Drop-in replacement for `import siteConfig from "../config/siteConfig"`
 */
export function useSiteConfig() {
  const { settings, loading, error } = useSettings();

  return useMemo(() => {
    const getSetting = (key) => sanitizeSettingValue(key, settings[key], FALLBACK[key]);

    return {
      company: {
        name: getSetting("company.name"),
        tagline: getSetting("company.tagline"),
        logo: getSetting("company.logo"),
        email: getSetting("company.email"),
        phones: getSetting("company.phones"),
        emergencyPhone: getSetting("company.emergencyPhone"),
        emergencyEmail: "emergency@satyamholidays.com",
        whatsapp: getSetting("company.whatsapp"),
        address: getSetting("company.address"),
        hours: getSetting("company.hours"),
      },
      social: {
        facebook: getSetting("social.facebook"),
        instagram: getSetting("social.instagram"),
        twitter: getSetting("social.twitter"),
      },
      brand: {
        primaryColor: getSetting("brand.primaryColor"),
      },
      website: getSetting("company.website"),
      // Expose loading/error states for components that need them
      _meta: { loading, error },
    };
  }, [settings, loading, error]);
}

export default SettingsContext;
