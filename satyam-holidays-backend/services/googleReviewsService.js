const logger = require("../utils/logger");
const cacheService = require("../utils/cache");
const settingService = require("./settingService");

// Google Places API (New) — Place Details. Returns up to 5 reviews Google considers most relevant.
// Requires GOOGLE_PLACES_API_KEY (backend env only — never sent to the browser) and a Place ID,
// set in Admin → Settings → Homepage → Google reviews (or GOOGLE_PLACE_ID env as a fallback).
const PLACES_URL = "https://places.googleapis.com/v1/places/";
const FIELD_MASK = "id,displayName,rating,userRatingCount,googleMapsUri,reviews";
const CACHE_TTL_SECONDS = 6 * 60 * 60;
const STALE_TTL_SECONDS = 7 * 24 * 60 * 60;
const TIMEOUT_MS = 8000;

const writeReviewUrl = (placeId) =>
  `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;

const mapPlace = (place, placeId) => ({
  configured: true,
  placeId,
  name: place.displayName?.text || "",
  rating: typeof place.rating === "number" ? place.rating : null,
  totalReviews: place.userRatingCount || 0,
  mapsUrl: place.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${placeId}`,
  writeReviewUrl: writeReviewUrl(placeId),
  reviews: (place.reviews || []).map((r) => ({
    id: r.name,
    rating: r.rating,
    text: r.text?.text || r.originalText?.text || "",
    relativeTime: r.relativePublishTimeDescription || "",
    publishTime: r.publishTime || null,
    author: {
      name: r.authorAttribution?.displayName || "Google user",
      url: r.authorAttribution?.uri || null,
      photo: r.authorAttribution?.photoUri || null,
    },
    googleMapsUri: r.googleMapsUri || null,
  })),
  fetchedAt: new Date().toISOString(),
});

class GoogleReviewsService {
  async getConfig() {
    const settings = await settingService.getAll();
    return {
      enabled: settings["google.showReviews"] !== false,
      placeId: String(settings["google.placeId"] || process.env.GOOGLE_PLACE_ID || "").trim(),
      apiKey: process.env.GOOGLE_PLACES_API_KEY || "",
    };
  }

  async getReviews({ force = false } = {}) {
    const { enabled, placeId, apiKey } = await this.getConfig();
    if (!enabled || !placeId) return { configured: false, reason: "not_configured" };
    if (!apiKey) {
      // Without a key we can still link people to the Google listing
      return {
        configured: false,
        reason: "missing_api_key",
        placeId,
        mapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
        writeReviewUrl: writeReviewUrl(placeId),
      };
    }

    const cacheKey = `google:reviews:${placeId}`;
    const staleKey = `google:reviews-stale:${placeId}`;
    if (!force) {
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${PLACES_URL}${encodeURIComponent(placeId)}?languageCode=en`, {
        headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": FIELD_MASK },
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Places API ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = mapPlace(await res.json(), placeId);
      await cacheService.set(cacheKey, data, CACHE_TTL_SECONDS);
      await cacheService.set(staleKey, data, STALE_TTL_SECONDS);
      return data;
    } catch (error) {
      logger.warn("[googleReviews] fetch failed", { error: error.message });
      // Serve the last good copy rather than blanking the section during a Google hiccup
      const stale = await cacheService.get(staleKey);
      if (stale) return { ...stale, stale: true };
      return { configured: true, error: true, placeId, writeReviewUrl: writeReviewUrl(placeId) };
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = new GoogleReviewsService();
