const Quote = require("../models/Quote");
const Enquiry = require("../models/Enquiry");
const Package = require("../models/Package");
const settingService = require("./settingService");
const cacheService = require("../utils/cache");
const socketManager = require("../utils/socketManager");
const logger = require("../utils/logger");

const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_TERMS = [
  "25% advance confirms the booking; the balance is due 15 days before departure.",
  "Hotel and transport rates are subject to availability at the time of booking.",
  "Cancellation charges follow our cancellation & refund policy.",
].join("\n");

/** Public site origin for customer links (same precedence as utils/email.js) */
const siteUrl = (settings = {}) =>
  (
    process.env.PUBLIC_SITE_URL ||
    process.env.FRONTEND_ORIGIN ||
    settings["company.website"] ||
    "https://satyamholidays.vercel.app"
  ).replace(/\/$/, "");

const companyFromSettings = (s) => ({
  name: s["company.name"] || "Satyam Holidays",
  phones: Array.isArray(s["company.phones"]) ? s["company.phones"] : [],
  email: s["company.email"],
  whatsapp: s["company.whatsapp"],
  address: s["company.address"] || {},
  website: (s["company.website"] || "").replace(/^https?:\/\//, ""),
});

/** "6 Days / 5 Nights" → 5 */
const nightsFrom = (duration) => {
  const text = String(duration || "");
  const n = text.match(/(\d+)\s*N/i);
  if (n) return parseInt(n[1], 10);
  const d = text.match(/(\d+)\s*D/i);
  return d ? Math.max(0, parseInt(d[1], 10) - 1) : 0;
};

const TRAVELLER_COUNT = { 1: 1, 2: 2, 3: 3, 4: 4, "5+": 5 };

class QuoteService {
  async getCompany() {
    const settings = await settingService.getAll();
    return { settings, company: companyFromSettings(settings), site: siteUrl(settings) };
  }

  publicUrl(quote, site) {
    return `${site}/quote/${quote.token}`;
  }

  /** Pre-filled starting point for a new quote, from an enquiry and/or a package */
  async draftFrom({ enquiryId, packageId }) {
    const [enquiry, pkg] = await Promise.all([
      enquiryId ? Enquiry.findById(enquiryId).lean() : null,
      packageId ? Package.findById(packageId).lean() : null,
    ]);
    const nights = pkg ? nightsFrom(pkg.duration) : 0;
    const adults = enquiry ? TRAVELLER_COUNT[enquiry.travelers] || 2 : 2;
    return {
      enquiry: enquiry?._id,
      package: pkg?._id,
      customer: enquiry
        ? { name: enquiry.name, phone: enquiry.phone, email: enquiry.email }
        : { name: "", phone: "", email: "" },
      title: pkg ? pkg.name : "",
      destination: pkg?.location || "",
      image: pkg?.image || "",
      intro: pkg?.description || "",
      startDate: enquiry?.travelDate || null,
      nights,
      adults,
      children: 0,
      items: pkg?.numericPrice
        ? [
            {
              category: "other",
              title: `${pkg.name} — land package`,
              details: pkg.duration,
              quantity: adults,
              unitPrice: pkg.numericPrice,
            },
          ]
        : [],
      itinerary: (pkg?.itinerary || []).map(({ day, title, description, meals }) => ({
        day,
        title,
        description,
        meals,
      })),
      inclusions: pkg?.inclusions || [],
      exclusions: pkg?.exclusions || [],
      markupPercent: 0,
      discount: 0,
      taxPercent: 5,
      showItemPrices: false,
      terms: DEFAULT_TERMS,
      validUntil: new Date(Date.now() + 7 * DAY_MS),
    };
  }

  async list({ enquiry, status, limit = 100 } = {}) {
    const filter = {};
    if (enquiry) filter.enquiry = enquiry;
    if (status) filter.status = status;
    const quotes = await Quote.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("-itinerary -terms -intro -notes")
      .lean();

    // Quick insight numbers for the quotes screen
    const sent = quotes.filter((q) => q.status !== "draft");
    const accepted = quotes.filter((q) => q.status === "accepted");
    const decided = quotes.filter((q) => ["accepted", "declined"].includes(q.status));
    const stats = {
      total: quotes.length,
      drafts: quotes.length - sent.length,
      awaiting: quotes.filter((q) => q.status === "sent").length,
      sentValue: sent.reduce((s, q) => s + (q.totals?.total || 0), 0),
      acceptedValue: accepted.reduce((s, q) => s + (q.totals?.total || 0), 0),
      acceptedProfit: accepted.reduce((s, q) => s + (q.totals?.profit || 0), 0),
      acceptanceRate: decided.length ? Math.round((accepted.length / decided.length) * 100) : null,
      viewedNotAnswered: quotes.filter((q) => q.status === "sent" && q.viewCount > 0).length,
    };
    return { quotes, stats };
  }

  async get(id) {
    return Quote.findById(id).lean();
  }

  async create(data, author) {
    // The yearly number is derived from the last one; retry once if two quotes race for it
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const quote = new Quote({ ...data, createdBy: author });
        await quote.save();
        return quote.toObject();
      } catch (err) {
        if (err.code === 11000 && attempt < 2) continue;
        throw err;
      }
    }
    return null;
  }

  async update(id, data) {
    const quote = await Quote.findById(id);
    if (!quote) return null;
    const locked = ["accepted", "declined"].includes(quote.status);
    // Customer has answered: only internal notes may change
    const patch = locked ? { notes: data.notes } : data;
    Object.entries(patch).forEach(([k, v]) => {
      if (v !== undefined) quote.set(k, v);
    });
    await quote.save();
    return quote.toObject();
  }

  async duplicate(id, author) {
    const source = await Quote.findById(id).lean();
    if (!source) return null;
    const {
      _id,
      number,
      token,
      status,
      sentAt,
      firstViewedAt,
      lastViewedAt,
      viewCount,
      respondedAt,
      responseNote,
      createdAt,
      updatedAt,
      totals,
      ...rest
    } = source; // eslint-disable-line no-unused-vars
    return this.create(
      { ...rest, title: `${source.title} (copy)`, validUntil: new Date(Date.now() + 7 * DAY_MS) },
      author
    );
  }

  async remove(id) {
    const quote = await Quote.findByIdAndDelete(id);
    return Boolean(quote);
  }

  /** Mark as sent, move the linked enquiry to "quoted" and log it on the enquiry */
  async markSent(id, author) {
    const quote = await Quote.findById(id);
    if (!quote) return null;
    if (quote.status === "draft") quote.status = "sent";
    if (!quote.sentAt) quote.sentAt = new Date();
    await quote.save();

    if (quote.enquiry) {
      const enquiry = await Enquiry.findById(quote.enquiry);
      if (enquiry) {
        if (["pending", "contacted"].includes(enquiry.status)) enquiry.status = "quoted";
        enquiry.adminNotes.push({
          text: `Quote ${quote.number} sent — ₹${quote.totals.total.toLocaleString("en-IN")}`,
          author,
          createdAt: new Date(),
        });
        await enquiry.save({ validateModifiedOnly: true });
        await cacheService.invalidateEnquiries();
        socketManager.emitEnquiryUpdate(enquiry);
      }
    }
    return quote.toObject();
  }

  /** What the customer sees: no costs, margin or internal notes */
  toPublic(quote) {
    const factor = 1 + (quote.markupPercent || 0) / 100;
    const t = quote.totals || {};
    const expired =
      quote.status === "sent" && quote.validUntil && new Date(quote.validUntil) < new Date();
    return {
      number: quote.number,
      status: expired ? "expired" : quote.status,
      customer: { name: quote.customer?.name },
      title: quote.title,
      destination: quote.destination,
      image: quote.image,
      intro: quote.intro,
      startDate: quote.startDate,
      nights: quote.nights,
      adults: quote.adults,
      children: quote.children,
      items: (quote.items || []).map((i) => ({
        category: i.category,
        title: i.title,
        details: i.details,
        rooms: i.rooms,
        nights: i.nights,
        quantity: i.quantity,
        ...(quote.showItemPrices ? { amount: Math.round(i.quantity * i.unitPrice * factor) } : {}),
      })),
      itinerary: quote.itinerary,
      inclusions: quote.inclusions,
      exclusions: quote.exclusions,
      showItemPrices: quote.showItemPrices,
      taxPercent: quote.taxPercent,
      totals: {
        subtotal: t.subtotal,
        discount: t.discount,
        tax: t.tax,
        total: t.total,
        perPerson: t.perPerson,
      },
      terms: quote.terms,
      validUntil: quote.validUntil,
      sentAt: quote.sentAt,
      respondedAt: quote.respondedAt,
    };
  }

  async getByToken(token, { track = false } = {}) {
    const quote = await Quote.findOne({ token });
    if (!quote || quote.status === "draft") return null;
    if (track) {
      const now = new Date();
      // Count visits, not reloads: views within 30 minutes of the last one are the same visit
      const lastSeen = quote.lastViewedAt ? now - new Date(quote.lastViewedAt) : Infinity;
      if (lastSeen > 30 * 60 * 1000) quote.viewCount += 1;
      quote.lastViewedAt = now;
      if (!quote.firstViewedAt) quote.firstViewedAt = now;
      await quote.save();
    }
    return quote.toObject();
  }

  async respond(token, { action, note }) {
    const quote = await Quote.findOne({ token });
    if (!quote || quote.status === "draft") return { error: "not_found" };
    if (quote.status !== "sent") return { error: "already_answered", quote: quote.toObject() };
    if (quote.validUntil && new Date(quote.validUntil) < new Date() && action === "accept") {
      return { error: "expired", quote: quote.toObject() };
    }

    quote.status = action === "accept" ? "accepted" : "declined";
    quote.respondedAt = new Date();
    if (note) quote.responseNote = note;
    await quote.save();

    if (quote.enquiry) {
      const enquiry = await Enquiry.findById(quote.enquiry);
      if (enquiry) {
        enquiry.adminNotes.push({
          text: `Customer ${quote.status} quote ${quote.number}${note ? `: “${note}”` : ""}`,
          author: "customer",
          createdAt: new Date(),
        });
        // Bring the lead back to the top of the planner's list; staff confirm after taking payment
        enquiry.followUpDate = new Date();
        await enquiry.save({ validateModifiedOnly: true });
        await cacheService.invalidateEnquiries();
        socketManager.emitEnquiryUpdate(enquiry);
      }
    }
    logger.info("[quotes] customer response", { number: quote.number, status: quote.status });
    return { quote: quote.toObject() };
  }
}

module.exports = new QuoteService();
module.exports.nightsFrom = nightsFrom;
module.exports.companyFromSettings = companyFromSettings;
module.exports.siteUrl = siteUrl;
