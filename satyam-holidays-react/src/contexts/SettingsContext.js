import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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
    line1: "10-A/28, Rupal Apartment, Radhaswami Road",
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

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/settings"));
      if (!res.ok) {
        throw new Error(`Failed to fetch settings: ${res.status}`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        setSettings((prev) => ({ ...prev, ...json.data }));
      }
    } catch (err) {
      setError(err.message || "Failed to load settings");
      // Keep using fallback values
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
  if (!ctx) return fallback ?? FALLBACK[key];
  return ctx.settings[key] ?? fallback ?? FALLBACK[key];
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

  return {
    company: {
      name: settings["company.name"] || FALLBACK["company.name"],
      tagline: settings["company.tagline"] || FALLBACK["company.tagline"],
      logo: settings["company.logo"] || FALLBACK["company.logo"],
      email: settings["company.email"] || FALLBACK["company.email"],
      phones: settings["company.phones"] || FALLBACK["company.phones"],
      emergencyPhone: settings["company.emergencyPhone"] || FALLBACK["company.emergencyPhone"],
      emergencyEmail: "emergency@satyamholidays.com",
      whatsapp: settings["company.whatsapp"] || FALLBACK["company.whatsapp"],
      address: settings["company.address"] || FALLBACK["company.address"],
      hours: settings["company.hours"] || FALLBACK["company.hours"],
    },
    social: {
      facebook: settings["social.facebook"] || FALLBACK["social.facebook"],
      instagram: settings["social.instagram"] || FALLBACK["social.instagram"],
      twitter: settings["social.twitter"] || FALLBACK["social.twitter"],
    },
    brand: {
      primaryColor: settings["brand.primaryColor"] || FALLBACK["brand.primaryColor"],
    },
    website: settings["company.website"] || FALLBACK["company.website"],
    // Expose loading/error states for components that need them
    _meta: { loading, error },
  };
}

export default SettingsContext;
