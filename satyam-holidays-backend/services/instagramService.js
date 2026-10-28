const Integration = require("../models/Integration");
const InstagramImport = require("../models/InstagramImport");
const Package = require("../models/Package");
const packageService = require("./packageService");
const { uploadImage } = require("../utils/cloudinary");
const logger = require("../utils/logger");

/*
 * Instagram → draft packages.
 *
 * 1. connect(token): works with either kind of token Meta issues for professional accounts —
 *    "Instagram API with Instagram Login" (graph.instagram.com) or
 *    "Instagram API with Facebook Login" (graph.facebook.com, via the linked Facebook Page).
 * 2. sync(): lists recent posts/reels and records any not seen before as pending imports.
 * 3. processImport(id): Gemini reads the flyer image(s) + caption (Gujarati or English), the images
 *    are copied to Cloudinary (Instagram CDN links expire), and an unpublished package is created.
 *
 * Processing is one post per request so it fits serverless time limits; the admin screen drives it.
 */

const KEY = "instagram";
const API_VERSION = "v21.0";
const IG_HOST = "https://graph.instagram.com";
const FB_HOST = "https://graph.facebook.com";
const MEDIA_FIELDS =
  "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}";
const REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // Instagram-login tokens last 60 days; refresh weekly
const MAX_IMAGES = 4;

class InstagramError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function graph(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const msg = json.error?.message || `Instagram API error (HTTP ${res.status})`;
    // Graph error code 190 = expired or revoked token
    throw new InstagramError(msg, json.error?.code === 190 ? 401 : 502);
  }
  return json;
}

const withToken = (url, token) =>
  `${url}${url.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`;

/* ── Connection ─────────────────────────────────────────── */

async function getConnection({ withToken: includeToken = false } = {}) {
  const query = Integration.findOne({ key: KEY });
  if (includeToken) query.select("+accessToken");
  const doc = await query.lean();
  if (doc?.accessToken || doc?.data?.username) return doc;
  // Environment fallback for deployments configured without the admin screen
  if (process.env.INSTAGRAM_ACCESS_TOKEN) {
    return {
      key: KEY,
      accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
      data: {
        host: process.env.INSTAGRAM_USER_ID ? "facebook" : "instagram",
        igUserId: process.env.INSTAGRAM_USER_ID,
        fromEnv: true,
      },
    };
  }
  return null;
}

/** Work out which API the token belongs to and which Instagram account it reaches */
async function identify(token) {
  try {
    const me = await graph(
      withToken(
        `${IG_HOST}/${API_VERSION}/me?fields=user_id,username,account_type,profile_picture_url`,
        token
      )
    );
    return {
      host: "instagram",
      igUserId: me.user_id || me.id,
      username: me.username,
      accountType: me.account_type,
      picture: me.profile_picture_url,
    };
  } catch (igErr) {
    // Facebook-login token: find the Instagram account linked to one of the user's Pages
    try {
      const pages = await graph(
        withToken(
          `${FB_HOST}/${API_VERSION}/me/accounts?fields=name,instagram_business_account{id,username,profile_picture_url}`,
          token
        )
      );
      const page = (pages.data || []).find((p) => p.instagram_business_account);
      if (!page)
        throw new InstagramError(
          "No Instagram professional account is linked to a Facebook Page for this token."
        );
      const ig = page.instagram_business_account;
      return {
        host: "facebook",
        igUserId: ig.id,
        username: ig.username,
        accountType: "BUSINESS",
        picture: ig.profile_picture_url,
        pageName: page.name,
      };
    } catch (fbErr) {
      throw new InstagramError(
        `That token didn't work with Instagram (${igErr.message}). Check it was generated for the business account with the instagram_business_basic (or instagram_basic) permission.`
      );
    }
  }
}

async function connect(token) {
  const clean = String(token || "").trim();
  if (clean.length < 20) throw new InstagramError("Paste the full access token.");
  const info = await identify(clean);
  await Integration.findOneAndUpdate(
    { key: KEY },
    {
      key: KEY,
      accessToken: clean,
      data: { ...info, connectedAt: new Date(), refreshedAt: new Date() },
    },
    { upsert: true, new: true }
  );
  logger.info("[instagram] connected", { username: info.username, host: info.host });
  return info;
}

async function disconnect() {
  await Integration.deleteOne({ key: KEY });
}

/** Instagram-login tokens can be extended (another 60 days) once they're a day old */
async function maybeRefresh(conn) {
  if (conn.data?.host !== "instagram" || conn.data?.fromEnv) return conn.accessToken;
  const last = new Date(conn.data?.refreshedAt || conn.data?.connectedAt || 0).getTime();
  if (Date.now() - last < REFRESH_AFTER_MS) return conn.accessToken;
  try {
    const json = await graph(
      withToken(`${IG_HOST}/refresh_access_token?grant_type=ig_refresh_token`, conn.accessToken)
    );
    await Integration.updateOne(
      { key: KEY },
      {
        accessToken: json.access_token,
        "data.refreshedAt": new Date(),
        "data.expiresAt": new Date(Date.now() + (json.expires_in || 0) * 1000),
      }
    );
    logger.info("[instagram] token refreshed");
    return json.access_token;
  } catch (err) {
    logger.warn("[instagram] token refresh failed", { error: err.message });
    return conn.accessToken;
  }
}

async function status() {
  const conn = await getConnection();
  const counts = await InstagramImport.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
  return {
    connected: !!conn,
    account: conn
      ? {
          username: conn.data?.username,
          accountType: conn.data?.accountType,
          picture: conn.data?.picture,
          via: conn.data?.host,
          pageName: conn.data?.pageName,
          connectedAt: conn.data?.connectedAt,
          lastSyncAt: conn.data?.lastSyncAt,
          fromEnv: !!conn.data?.fromEnv,
        }
      : null,
    ai: !!process.env.GEMINI_API_KEY,
    imageHosting: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
    counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
  };
}

/* ── Sync ───────────────────────────────────────────────── */

const mediaUrlsOf = (m) => {
  const items = m.media_type === "CAROUSEL_ALBUM" ? m.children?.data || [] : [m];
  // Reels/videos: the cover frame is what carries the flyer text
  return items
    .map((c) => (c.media_type === "VIDEO" ? c.thumbnail_url : c.media_url))
    .filter(Boolean)
    .slice(0, MAX_IMAGES);
};

/** Fetch recent posts and queue the new ones. `limit` = how many recent posts to look at. */
async function sync({ limit = 25 } = {}) {
  const conn = await getConnection({ withToken: true });
  if (!conn) throw new InstagramError("Connect your Instagram account first.");
  const token = await maybeRefresh(conn);
  const base =
    conn.data.host === "facebook"
      ? `${FB_HOST}/${API_VERSION}/${conn.data.igUserId}/media`
      : `${IG_HOST}/${API_VERSION}/me/media`;

  const media = [];
  let url = withToken(
    `${base}?fields=${encodeURIComponent(MEDIA_FIELDS)}&limit=${Math.min(limit, 50)}`,
    token
  );
  while (url && media.length < limit) {
    const page = await graph(url);
    media.push(...(page.data || []));
    url = page.paging?.next || null;
  }
  const recent = media.slice(0, limit);

  const existing = new Set(
    (
      await InstagramImport.find({ mediaId: { $in: recent.map((m) => m.id) } })
        .select("mediaId")
        .lean()
    ).map((d) => d.mediaId)
  );
  const fresh = recent.filter((m) => !existing.has(m.id));
  if (fresh.length) {
    await InstagramImport.insertMany(
      fresh.map((m) => ({
        mediaId: m.id,
        permalink: m.permalink,
        mediaType: m.media_type,
        caption: (m.caption || "").slice(0, 5000),
        postedAt: m.timestamp ? new Date(m.timestamp) : undefined,
        mediaUrls: mediaUrlsOf(m),
        thumbnailUrl: m.thumbnail_url || m.media_url,
      })),
      { ordered: false }
    ).catch((err) => {
      if (err.code !== 11000) throw err; // a parallel sync inserted the same post
    });
  } else {
    // Refresh expiring CDN links on posts that are still waiting
    await Promise.all(
      recent.map((m) =>
        InstagramImport.updateOne(
          { mediaId: m.id, status: { $in: ["pending", "failed"] } },
          { mediaUrls: mediaUrlsOf(m), thumbnailUrl: m.thumbnail_url || m.media_url }
        )
      )
    );
  }
  await Integration.updateOne({ key: KEY }, { "data.lastSyncAt": new Date() });

  return { checked: recent.length, added: fresh.length };
}

/* ── Extraction ─────────────────────────────────────────── */

async function download(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`image download failed (HTTP ${res.status})`);
  const mimeType = (res.headers.get("content-type") || "image/jpeg").split(";")[0];
  return { buffer: Buffer.from(await res.arrayBuffer()), mimeType };
}

const PROMPT = `You read social media posts from Satyam Holidays, a travel agency in Ahmedabad, India.
Each post has a flyer image (often in Gujarati, sometimes English or Hindi) and a caption.
Decide whether the post advertises a specific holiday / tour package, and if so extract it.

Rules:
- Write every output field in clear English (translate Gujarati/Hindi).
- Only use information that is actually in the images or caption. Never invent prices, dates, hotels or days. Leave a field empty ("" or []) when it isn't given.
- Festival greetings, quotes, customer photos, testimonials, office notices and generic ads are NOT packages.
- Prices are in INR. "pricePerPerson" is a number (the lowest per-person price if several are shown, e.g. quad/triple/twin sharing). Put the full pricing detail in "priceText", e.g. "₹15,999 per person (twin sharing)".
- "duration" format: "6 Days / 5 Nights". Convert "5N/6D" etc.
- "category": "domestic" for trips within India, "international" otherwise.
- "subcategory": a short theme such as Chardham, Pilgrimage, Hill station, Beach, Honeymoon, Wildlife, Adventure, Heritage, City break, Family.
- Dates as YYYY-MM-DD; assume the next upcoming year when the year is missing.
- "notes": anything that was unclear or that staff should double-check.

Return ONLY JSON in this shape:
{"isPackage": true, "confidence": 0.0, "name": "", "location": "", "category": "domestic", "subcategory": "",
 "duration": "", "priceText": "", "pricePerPerson": 0, "description": "", "highlights": [],
 "itinerary": [{"day": 1, "title": "", "description": "", "meals": []}],
 "inclusions": [], "exclusions": [], "departures": [{"startDate": "", "endDate": ""}], "visa": "", "notes": ""}`;

async function extractWithAI(caption, images) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
  });
  const result = await model.generateContent([
    `${PROMPT}\n\nToday's date is ${new Date().toISOString().slice(0, 10)}.`,
    `Caption:\n${caption || "(no caption)"}`,
    ...images.map((img) => ({
      inlineData: { data: img.buffer.toString("base64"), mimeType: img.mimeType },
    })),
  ]);
  const text = result.response
    .text()
    .replace(/^```(?:json)?|```$/g, "")
    .trim();
  return JSON.parse(text);
}

/** Without an AI key: pull the obvious bits from the caption so staff have a starting point */
function extractFromCaption(caption = "") {
  const lines = caption
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const price = caption.match(/(?:₹|rs\.?|inr)\s*([\d,]{3,})/i);
  const nd =
    caption.match(/(\d+)\s*N\s*[/&-]?\s*(\d+)\s*D/i) ||
    caption.match(/(\d+)\s*nights?.{0,6}?(\d+)\s*days?/i);
  const days = caption.match(/(\d+)\s*days?/i);
  return {
    isPackage: !!(price || nd || days),
    confidence: 0.2,
    name: (lines[0] || "Instagram package").replace(/[#@].*$/, "").slice(0, 120),
    location: "",
    category: "domestic",
    subcategory: "",
    duration: nd ? `${nd[2]} Days / ${nd[1]} Nights` : days ? `${days[1]} Days` : "",
    priceText: price ? `₹${price[1]} per person` : "",
    pricePerPerson: price ? parseInt(price[1].replace(/,/g, ""), 10) : 0,
    description: lines.slice(1, 4).join(" ").slice(0, 600),
    highlights: [],
    itinerary: [],
    inclusions: [],
    exclusions: [],
    departures: [],
    visa: "",
    notes:
      "Read from the caption only (no AI key configured) — check every field against the flyer.",
  };
}

/* ── Package creation ───────────────────────────────────── */

const slugify = (s) =>
  String(s || "package")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "package";

async function uniqueSlug(name) {
  const base = slugify(name);
  for (let i = 0; i < 50; i += 1) {
    const slug = i ? `${base}-${i + 1}` : base;
    if (!(await Package.exists({ slug }))) return slug;
  }
  return `${base}-${Date.now()}`;
}

const strList = (v, max) =>
  (Array.isArray(v) ? v : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, max);

const validDate = (s) => {
  const d = new Date(s);
  return s && !Number.isNaN(d.getTime()) ? d : null;
};

/**
 * Flyers say "12 May" without a year, so a departure up to two years in the past means the next
 * one; anything older (an old post) is returned as-is and dropped by the caller.
 */
const upcoming = (date, now = new Date()) => {
  const d = new Date(date);
  if (now - d > 2 * 366 * 86400000) return d;
  while (d < now) d.setFullYear(d.getFullYear() + 1);
  return d;
};

function toPackageFields(x, imp) {
  const nights = (String(x.duration || "").match(/(\d+)\s*Nights?/i) || [])[1];
  const departures = (Array.isArray(x.departures) ? x.departures : [])
    .map((d) => {
      const parsed = validDate(d.startDate);
      if (!parsed) return null;
      const start = upcoming(parsed);
      const givenEnd = validDate(d.endDate);
      const end =
        givenEnd && givenEnd >= parsed
          ? new Date(start.getTime() + (givenEnd - parsed))
          : new Date(start.getTime() + (Number(nights) || 0) * 86400000);
      return { startDate: start, endDate: end, capacity: 20, status: "available" };
    })
    .filter((d) => d && d.startDate >= new Date())
    .sort((a, b) => a.startDate - b.startDate)
    .slice(0, 20);

  const price = Number(x.pricePerPerson) > 0 ? Math.round(Number(x.pricePerPerson)) : 0;
  const priceText = String(x.priceText || "").trim();
  // Package.price holds 50 chars: keep a clean headline there and the full detail in the description
  const headline = price ? `₹${price.toLocaleString("en-IN")} per person` : "Price on request";
  const priceFits = priceText && priceText.length <= 50 && /\d/.test(priceText);
  const description = [
    String(x.description || imp.caption || "Details coming soon.").trim(),
    priceText && !priceFits ? `Prices: ${priceText}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return {
    category: x.category === "international" ? "international" : "domestic",
    subcategory: String(x.subcategory || "Holiday").slice(0, 100),
    name: String(x.name || "Instagram package").slice(0, 200),
    duration: String(x.duration || "On request").slice(0, 50),
    // packageService parses the first number of this string into numericPrice
    price: priceFits ? priceText : headline,
    description: description.slice(0, 2000),
    location: String(x.location || x.name || "India").slice(0, 200),
    visa: String(x.visa || (x.category === "international" ? "Ask us" : "Not Required")).slice(
      0,
      100
    ),
    highlights: strList(x.highlights, 20),
    inclusions: strList(x.inclusions, 30),
    exclusions: strList(x.exclusions, 30),
    itinerary: (Array.isArray(x.itinerary) ? x.itinerary : [])
      .filter((d) => d && (d.title || d.description))
      .slice(0, 60)
      .map((d, i) => ({
        day: Number(d.day) || i + 1,
        title: String(d.title || `Day ${i + 1}`).slice(0, 200),
        description: String(d.description || d.title).slice(0, 2000),
        meals: strList(d.meals, 4),
      })),
    availableDates: departures,
  };
}

async function processImport(id) {
  const imp = await InstagramImport.findOneAndUpdate(
    { _id: id, status: { $in: ["pending", "failed", "not_package", "skipped"] } },
    { status: "processing", $inc: { attempts: 1 }, error: "" },
    { new: true }
  );
  if (!imp) throw new InstagramError("This post is already being processed or was imported.", 409);

  try {
    // Download the flyer(s); links expire, so re-sync if this fails
    const images = [];
    for (const url of imp.mediaUrls) {
      try {
        images.push(await download(url));
      } catch (err) {
        logger.warn("[instagram] image download failed", {
          mediaId: imp.mediaId,
          error: err.message,
        });
      }
    }
    if (!images.length && !imp.caption)
      throw new Error("Couldn't download the post's images — run Sync again to refresh the links.");

    const extracted = process.env.GEMINI_API_KEY
      ? await extractWithAI(imp.caption, images)
      : extractFromCaption(imp.caption);

    if (!extracted?.isPackage) {
      imp.status = "not_package";
      imp.extracted = extracted;
      imp.notes =
        extracted?.notes || "Doesn't look like a holiday package (greeting, notice, photo…).";
      imp.processedAt = new Date();
      await imp.save();
      return imp.toObject();
    }

    // Copy images to our own hosting; fall back to none rather than links that will expire
    const hosted = [];
    for (const img of images) {
      try {
        hosted.push((await uploadImage(img.buffer, "satyam-holidays/instagram")).url);
      } catch (err) {
        logger.warn("[instagram] cloudinary upload failed", { error: err.message });
      }
    }

    const fields = toPackageFields(extracted, imp);
    const pkg = await packageService.createPackage({
      ...fields,
      slug: await uniqueSlug(fields.name),
      image: hosted[0] || "",
      gallery: hosted.slice(1),
      isActive: false, // always a draft: staff check prices/dates before publishing
      isFeatured: false,
      rating: 0, // no made-up star rating on imported trips
      reviews: 0,
      importSource: {
        platform: "instagram",
        mediaId: imp.mediaId,
        permalink: imp.permalink,
        importedAt: new Date(),
      },
    });

    imp.status = "imported";
    imp.package = pkg._id;
    imp.extracted = extracted;
    imp.notes = [
      extracted.notes,
      !hosted.length && images.length
        ? "Images couldn't be copied to Cloudinary — add photos manually."
        : "",
      extracted.confidence !== undefined && extracted.confidence < 0.6
        ? "Low confidence — check carefully."
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    imp.processedAt = new Date();
    await imp.save();
    logger.info("[instagram] draft package created", { mediaId: imp.mediaId, package: pkg._id });
    return imp.toObject();
  } catch (err) {
    logger.error("[instagram] import failed", { mediaId: imp.mediaId, error: err.message });
    imp.status = "failed";
    imp.error = err.message.slice(0, 1000);
    await imp.save();
    return imp.toObject();
  }
}

async function listImports({ status, limit = 60 } = {}) {
  const filter = status ? { status } : {};
  return InstagramImport.find(filter)
    .sort({ postedAt: -1, createdAt: -1 })
    .limit(limit)
    .select("-mediaUrls -extracted")
    .populate("package", "name slug isActive price duration image")
    .lean();
}

async function setStatus(id, status) {
  return InstagramImport.findOneAndUpdate(
    { _id: id, status: { $ne: "processing" } },
    { status },
    { new: true }
  ).lean();
}

module.exports = {
  InstagramError,
  connect,
  disconnect,
  status,
  sync,
  processImport,
  listImports,
  setStatus,
  // exported for tests
  extractWithAI,
  extractFromCaption,
  toPackageFields,
  mediaUrlsOf,
};
