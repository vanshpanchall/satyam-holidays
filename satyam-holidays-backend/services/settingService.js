const Setting = require("../models/Setting");
const logger = require("../utils/logger");

// Default settings — used as fallback when DB has no value
const DEFAULTS = {
  // Company
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
  "company.website": "https://satyamholidays.com",

  // Social
  "social.facebook": "https://facebook.com/satyamholidays",
  "social.instagram": "https://instagram.com/satyamholidays",
  "social.twitter": "https://twitter.com/satyamholidays",

  // Hero
  "hero.heading": "Discover Amazing Adventures With Us!",
  "hero.subheading":
    "Experience the world's most beautiful destinations with our carefully crafted travel packages. From spiritual journeys to exotic beaches, we make your dream vacation a reality.",
  "hero.stats": [
    { value: 500, suffix: "+", label: "Happy Travelers" },
    { value: 50, suffix: "+", label: "Destinations" },
    { value: 10, suffix: "+", label: "Years Experience" },
  ],

  // SEO
  "seo.title": "Satyam Holidays — Journey With Joy! | Best Travel Packages",
  "seo.description":
    "Book affordable domestic & international travel packages. Chardham, Kashmir, Dubai, Singapore & more. Trusted by 15000+ happy travelers.",

  // Notifications (WhatsApp default true when unset so WHATSAPP_ENABLE env-only deploys keep working)
  "notifications.emailEnabled": true,
  "notifications.whatsappEnabled": true,
  "notifications.adminWhatsapp": "",

  // Brand
  "brand.primaryColor": "#f59e0b",
};

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const sanitizeByShape = (value, fallbackValue) => {
  if (Array.isArray(fallbackValue)) {
    return Array.isArray(value) ? value : fallbackValue;
  }

  if (isPlainObject(fallbackValue)) {
    if (!isPlainObject(value)) return fallbackValue;

    const sanitized = {};
    for (const [key, nestedFallback] of Object.entries(fallbackValue)) {
      sanitized[key] = sanitizeByShape(value[key], nestedFallback);
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

const sanitizeSettingValue = (key, value) => {
  const fallbackValue = DEFAULTS[key];
  if (typeof fallbackValue === "undefined") {
    return value;
  }

  if (key === "hero.stats") {
    return sanitizeHeroStats(value, fallbackValue);
  }

  if (key === "company.phones") {
    return sanitizeStringArray(value, fallbackValue);
  }

  return sanitizeByShape(value, fallbackValue);
};

class SettingService {
  /**
   * Get all settings as a flat { key: value } object
   */
  async getAll() {
    logger.info("Service: getAll settings invoked");
    try {
      const docs = await Setting.find({}).lean();
      const settings = { ...DEFAULTS };
      for (const doc of docs) {
        settings[doc.key] = sanitizeSettingValue(doc.key, doc.value);
      }
      logger.info("Service: getAll settings successfully fetched and sanitized", {
        count: docs.length,
      });
      return settings;
    } catch (error) {
      logger.error("Failed to fetch settings:", error);
      return { ...DEFAULTS };
    }
  }

  /**
   * Get a single setting by key
   */
  async get(key) {
    logger.info("Service: get setting invoked", { key });
    const doc = await Setting.findOne({ key }).lean();
    if (!doc) {
      return DEFAULTS[key] ?? null;
    }
    return sanitizeSettingValue(key, doc.value);
  }

  /**
   * Upsert a single setting
   */
  async upsert(key, value) {
    logger.info("Service: upsert setting invoked", { key });
    const sanitizedValue = sanitizeSettingValue(key, value);
    const doc = await Setting.findOneAndUpdate(
      { key },
      { key, value: sanitizedValue },
      { upsert: true, new: true, runValidators: true }
    );
    logger.info("Service: upsert setting succeeded", { key });
    return doc;
  }

  /**
   * Bulk upsert settings — { key: value, ... }
   */
  async bulkUpsert(settings) {
    const keys = Object.keys(settings || {});
    logger.info("Service: bulkUpsert settings invoked", { keys });
    const ops = Object.entries(settings).map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { key, value: sanitizeSettingValue(key, value) },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      await Setting.bulkWrite(ops);
      logger.info("Service: bulkUpsert settings bulkWrite completed", { count: ops.length });
    }

    return this.getAll();
  }

  /**
   * Get defaults (for reference / seeding)
   */
  getDefaults() {
    return { ...DEFAULTS };
  }
}

module.exports = new SettingService();
