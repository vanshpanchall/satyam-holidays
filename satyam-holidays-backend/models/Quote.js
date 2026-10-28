const crypto = require("crypto");
const mongoose = require("mongoose");

const ITEM_CATEGORIES = [
  "hotel",
  "transport",
  "flight",
  "activity",
  "meal",
  "visa",
  "insurance",
  "guide",
  "other",
];
const QUOTE_STATUSES = ["draft", "sent", "accepted", "declined"];

const itemSchema = new mongoose.Schema(
  {
    category: { type: String, enum: ITEM_CATEGORIES, default: "other" },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    // e.g. "Deluxe room · CP · 2 rooms × 3 nights" or "Innova Crysta, Haridwar–Kedarnath"
    details: { type: String, trim: true, maxlength: 300 },
    // Hotels are priced per room-night: quantity = rooms × nights when both are set
    rooms: { type: Number, min: 0 },
    nights: { type: Number, min: 0 },
    quantity: { type: Number, default: 1, min: 0 },
    // Cost to us; the customer price is this plus the quote's markup
    unitPrice: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const quoteSchema = new mongoose.Schema(
  {
    number: { type: String, unique: true },
    // Unguessable id for the customer-facing link (/quote/:token)
    token: { type: String, unique: true, index: true },
    enquiry: { type: mongoose.Schema.Types.ObjectId, ref: "Enquiry", index: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },

    customer: {
      name: { type: String, required: true, trim: true, maxlength: 100 },
      phone: { type: String, trim: true, maxlength: 30 },
      email: { type: String, trim: true, lowercase: true, maxlength: 120 },
    },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    destination: { type: String, trim: true, maxlength: 200 },
    image: { type: String, trim: true, maxlength: 500 },
    intro: { type: String, trim: true, maxlength: 2000 },
    startDate: Date,
    nights: { type: Number, min: 0, max: 60, default: 0 },
    adults: { type: Number, min: 0, max: 100, default: 2 },
    children: { type: Number, min: 0, max: 100, default: 0 },

    items: { type: [itemSchema], default: [] },
    itinerary: [
      {
        _id: false,
        day: Number,
        title: { type: String, trim: true, maxlength: 200 },
        description: { type: String, trim: true, maxlength: 2000 },
        meals: { type: [String], default: [] },
      },
    ],
    inclusions: { type: [String], default: [] },
    exclusions: { type: [String], default: [] },

    markupPercent: { type: Number, min: 0, max: 200, default: 0 },
    discount: { type: Number, min: 0, default: 0 },
    taxPercent: { type: Number, min: 0, max: 28, default: 5 },
    showItemPrices: { type: Boolean, default: false },

    notes: { type: String, trim: true, maxlength: 3000 },
    terms: { type: String, trim: true, maxlength: 5000 },
    validUntil: Date,

    status: { type: String, enum: QUOTE_STATUSES, default: "draft", index: true },
    sentAt: Date,
    firstViewedAt: Date,
    lastViewedAt: Date,
    viewCount: { type: Number, default: 0 },
    respondedAt: Date,
    responseNote: { type: String, trim: true, maxlength: 1000 },
    createdBy: String,

    totals: {
      cost: { type: Number, default: 0 },
      markup: { type: Number, default: 0 },
      subtotal: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      perPerson: { type: Number, default: 0 },
      profit: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

quoteSchema.index({ createdAt: -1 });

const round = (n) => Math.round(n);

/** Pricing: items are costs → + markup → − discount → + GST */
quoteSchema.methods.computeTotals = function computeTotals() {
  (this.items || []).forEach((i) => {
    if (i.rooms > 0 && i.nights > 0) i.quantity = i.rooms * i.nights;
  });
  const cost = (this.items || []).reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    0
  );
  const markup = (cost * (this.markupPercent || 0)) / 100;
  const subtotal = cost + markup;
  const discount = Math.min(this.discount || 0, subtotal);
  const taxable = subtotal - discount;
  const tax = (taxable * (this.taxPercent || 0)) / 100;
  const total = taxable + tax;
  const travellers = Math.max(1, (this.adults || 0) + (this.children || 0));
  this.totals = {
    cost: round(cost),
    markup: round(markup),
    subtotal: round(subtotal),
    discount: round(discount),
    tax: round(tax),
    total: round(total),
    perPerson: round(total / travellers),
    profit: round(markup - discount),
  };
  return this.totals;
};

quoteSchema.pre("validate", async function assignIds(next) {
  if (!this.token) this.token = crypto.randomBytes(16).toString("hex");
  if (!this.number) {
    // SH-Q-2026-0007: yearly sequence based on the latest quote number this year
    const year = new Date().getFullYear();
    const prefix = `SH-Q-${year}-`;
    const last = await this.constructor
      .findOne({ number: new RegExp(`^${prefix}`) })
      .sort({ number: -1 })
      .select("number")
      .lean();
    const seq = last ? parseInt(last.number.slice(prefix.length), 10) + 1 : 1;
    this.number = `${prefix}${String(seq).padStart(4, "0")}`;
  }
  this.computeTotals();
  next();
});

const Quote = mongoose.model("Quote", quoteSchema);
Quote.ITEM_CATEGORIES = ITEM_CATEGORIES;
Quote.QUOTE_STATUSES = QUOTE_STATUSES;

module.exports = Quote;
