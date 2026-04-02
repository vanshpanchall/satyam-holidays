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
    line1: "10-A/28, Rupal Apartment, Radhaswami Road",
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

class SettingService {
  /**
   * Get all settings as a flat { key: value } object
   */
  async getAll() {
    try {
      const docs = await Setting.find({}).lean();
      const settings = { ...DEFAULTS };
      for (const doc of docs) {
        settings[doc.key] = doc.value;
      }
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
    const doc = await Setting.findOne({ key }).lean();
    return doc ? doc.value : (DEFAULTS[key] ?? null);
  }

  /**
   * Upsert a single setting
   */
  async upsert(key, value) {
    return Setting.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true, runValidators: true }
    );
  }

  /**
   * Bulk upsert settings — { key: value, ... }
   */
  async bulkUpsert(settings) {
    const ops = Object.entries(settings).map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { key, value },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      await Setting.bulkWrite(ops);
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
