const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const SVGtoPDF = require("svg-to-pdfkit");
const fontkit = require("fontkit");
const logger = require("./logger");

/*
 * Branded A4 PDFs (package itinerary + customer quotation) drawn with PDFKit.
 * Noto fonts are embedded because the built-in PDF fonts have no ₹ glyph.
 */

const ASSETS = path.join(__dirname, "..", "assets");
const FONTS = {
  regular: path.join(ASSETS, "fonts", "NotoSans-Regular.ttf"),
  semibold: path.join(ASSETS, "fonts", "NotoSans-SemiBold.ttf"),
  serif: path.join(ASSETS, "fonts", "NotoSerif-Regular.ttf"),
};
const LOGO_SVG = fs.readFileSync(path.join(ASSETS, "satyam-logo.svg"), "utf8");

// Characters the fonts can't draw would print as empty boxes: map common ones, drop the rest
const GLYPHS = fontkit.openSync(FONTS.regular);
const SUBSTITUTES = {
  "→": "–",
  "←": "–",
  "⇒": "–",
  "➔": "–",
  "✓": "+",
  "✔": "+",
  "✅": "+",
  "✗": "×",
  "❌": "×",
  "★": "*",
  "⭐": "*",
  "•": "•",
};
const printable = (str) =>
  Array.from(String(str))
    .map((ch) => {
      if (SUBSTITUTES[ch]) return SUBSTITUTES[ch];
      const cp = ch.codePointAt(0);
      if (cp < 0x20 && ch !== "\n") return " ";
      return ch === "\n" || GLYPHS.hasGlyphForCodePoint(cp) ? ch : "";
    })
    .join("")
    .replace(/[ \t]{2,}/g, " ");

const C = {
  ink: "#0f1e2e",
  fg: "#17293d",
  muted: "#5b6f84",
  line: "#e2d9cb",
  sand: "#f6f1ea",
  accent: "#e06614",
  green: "#15803d",
  red: "#b91c1c",
};

const MARGIN = 48;
const PAGE = { width: 595.28, height: 841.89 };
const CONTENT_W = PAGE.width - MARGIN * 2;
const FOOTER_SPACE = 46;

const inr = (n) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.max(0, Number(n) || 0))}`;
const fmtDate = (d, opts = { day: "numeric", month: "short", year: "numeric" }) =>
  d ? new Date(d).toLocaleDateString("en-IN", opts) : "";

/** Fetch a JPEG/PNG for the PDF. Unsplash/Cloudinary are asked for a JPEG at print size. */
async function fetchImage(url) {
  if (!url || !/^https?:\/\//.test(url) || typeof fetch !== "function") return null;
  let target = url;
  if (url.includes("images.unsplash.com")) {
    target = `${url.split("?")[0]}?w=1400&q=75&fm=jpg&fit=crop`;
  } else if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    target = url.replace("/upload/", "/upload/w_1400,q_75,f_jpg/");
  }
  try {
    const res = await fetch(target, { signal: AbortSignal.timeout(7000) });
    const type = res.headers.get("content-type") || "";
    if (!res.ok || !/image\/(jpe?g|png)/.test(type)) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    logger.warn("[pdf] image fetch failed", { url: target, error: err.message });
    return null;
  }
}

function createDoc(title) {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    bufferPages: true,
    info: { Title: title, Author: "Satyam Holidays", Creator: "Satyam Holidays" },
  });
  doc.registerFont("regular", FONTS.regular);
  doc.registerFont("semibold", FONTS.semibold);
  doc.registerFont("serif", FONTS.serif);
  doc.font("regular").fillColor(C.fg);
  // Every string goes through printable() so admin-typed symbols/emoji can't break the layout
  const text = doc.text.bind(doc);
  const heightOfString = doc.heightOfString.bind(doc);
  doc.text = (str, ...args) => text(typeof str === "string" ? printable(str) : str, ...args);
  doc.heightOfString = (str, ...args) => heightOfString(printable(str), ...args);
  return doc;
}

const toBuffer = (doc) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });

/** Start a new page if fewer than `needed` points remain above the footer */
function ensureSpace(doc, needed) {
  if (doc.y + needed > PAGE.height - MARGIN - FOOTER_SPACE) doc.addPage();
}

function letterhead(doc, company, rightLabel) {
  const top = MARGIN - 8;
  SVGtoPDF(doc, LOGO_SVG, MARGIN, top, {
    width: 96,
    height: 72,
    preserveAspectRatio: "xMinYMid meet",
  });
  const contact = [
    (company.phones || []).slice(0, 2).join("  ·  "),
    company.email,
    [company.address?.line1, company.address?.line2].filter(Boolean).join(", "),
  ].filter(Boolean);
  doc.font("regular").fontSize(8.5).fillColor(C.muted);
  let y = top + 6;
  if (rightLabel) {
    doc
      .font("semibold")
      .fontSize(9)
      .fillColor(C.accent)
      .text(rightLabel.toUpperCase(), MARGIN, y, {
        width: CONTENT_W,
        align: "right",
        characterSpacing: 1.5,
      });
    y += 16;
    doc.font("regular").fontSize(8.5).fillColor(C.muted);
  }
  contact.forEach((line) => {
    doc.text(line, MARGIN + 120, y, { width: CONTENT_W - 120, align: "right" });
    y += 12;
  });
  const ruleY = top + 84;
  doc
    .moveTo(MARGIN, ruleY)
    .lineTo(PAGE.width - MARGIN, ruleY)
    .lineWidth(1.2)
    .strokeColor(C.accent)
    .stroke();
  doc.y = ruleY + 18;
  doc.x = MARGIN;
}

/** Footer + page numbers on every page (requires bufferPages) */
function footers(doc, company) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const y = PAGE.height - MARGIN - 14;
    // Writing below the bottom margin would otherwise trigger an automatic page break
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .moveTo(MARGIN, y - 8)
      .lineTo(PAGE.width - MARGIN, y - 8)
      .lineWidth(0.5)
      .strokeColor(C.line)
      .stroke();
    doc
      .font("regular")
      .fontSize(8)
      .fillColor(C.muted)
      .text(
        [company.name, company.whatsapp && `WhatsApp ${company.whatsapp}`, company.website]
          .filter(Boolean)
          .join("   ·   "),
        MARGIN,
        y,
        { width: CONTENT_W - 60, lineBreak: false }
      )
      .text(`${i + 1} / ${range.count}`, PAGE.width - MARGIN - 60, y, {
        width: 60,
        align: "right",
      });
    doc.page.margins.bottom = bottom;
  }
}

function sectionTitle(doc, text) {
  ensureSpace(doc, 60);
  doc.moveDown(0.8);
  doc.font("serif").fontSize(16).fillColor(C.ink).text(text, MARGIN, doc.y, { width: CONTENT_W });
  doc.moveDown(0.4);
}

function bulletList(doc, items, { color = C.accent, mark = "•", textColor = C.fg } = {}) {
  doc.font("regular").fontSize(10);
  items.forEach((item) => {
    ensureSpace(doc, 18);
    const y = doc.y;
    doc.fillColor(color).text(mark, MARGIN, y, { width: 12 });
    doc.fillColor(textColor).text(String(item), MARGIN + 14, y, { width: CONTENT_W - 14 });
    doc.moveDown(0.25);
  });
}

async function heroImage(doc, url, height = 210) {
  const img = await fetchImage(url);
  if (!img) return;
  try {
    const y = doc.y;
    doc.save();
    doc.roundedRect(MARGIN, y, CONTENT_W, height, 14).clip();
    doc.image(img, MARGIN, y, { cover: [CONTENT_W, height], align: "center", valign: "center" });
    doc.restore();
    doc.y = y + height + 18;
  } catch (err) {
    logger.warn("[pdf] could not embed image", { error: err.message });
  }
}

function dayList(doc, days) {
  [...days]
    .sort((a, b) => (a.day || 0) - (b.day || 0))
    .forEach((d) => {
      ensureSpace(doc, 70);
      const y = doc.y;
      doc
        .circle(MARGIN + 11, y + 10, 11)
        .fillColor(C.ink)
        .fill();
      doc
        .font("semibold")
        .fontSize(9)
        .fillColor("#ffffff")
        .text(String(d.day), MARGIN, y + 5, { width: 22, align: "center" });
      const x = MARGIN + 34;
      const w = CONTENT_W - 34;
      doc
        .font("regular")
        .fontSize(8)
        .fillColor(C.muted)
        .text(`DAY ${d.day}`, x, y, { width: w, characterSpacing: 1 });
      doc
        .font("semibold")
        .fontSize(11.5)
        .fillColor(C.ink)
        .text(d.title || "", x, doc.y + 1, { width: w });
      if (d.description) {
        doc
          .font("regular")
          .fontSize(9.5)
          .fillColor(C.fg)
          .text(d.description, x, doc.y + 2, { width: w, lineGap: 1.5 });
      }
      if (d.meals?.length) {
        doc
          .font("regular")
          .fontSize(8.5)
          .fillColor(C.accent)
          .text(`Meals: ${d.meals.join(" · ")}`, x, doc.y + 3, { width: w });
      }
      doc.moveDown(0.9);
    });
}

function callout(doc, title, lines) {
  const body = lines.filter(Boolean).join("\n");
  doc.font("regular").fontSize(9.5);
  const h = 34 + doc.heightOfString(body, { width: CONTENT_W - 32 });
  ensureSpace(doc, h + 10);
  const y = doc.y + 6;
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 12).fillColor(C.sand).fill();
  doc
    .font("semibold")
    .fontSize(11)
    .fillColor(C.ink)
    .text(title, MARGIN + 16, y + 12, { width: CONTENT_W - 32 });
  doc
    .font("regular")
    .fontSize(9.5)
    .fillColor(C.fg)
    .text(body, MARGIN + 16, doc.y + 3, { width: CONTENT_W - 32 });
  doc.y = y + h + 8;
  doc.x = MARGIN;
}

/* ── Package itinerary ─────────────────────────────────────── */

async function buildItineraryPdf(pkg, company, { pageUrl } = {}) {
  const doc = createDoc(`${pkg.name} — itinerary`);
  letterhead(doc, company, "Trip itinerary");

  await heroImage(doc, pkg.image);

  doc
    .font("regular")
    .fontSize(9)
    .fillColor(C.accent)
    .text(String(pkg.location || "").toUpperCase(), { characterSpacing: 1.2 });
  doc.font("serif").fontSize(24).fillColor(C.ink).text(pkg.name, { width: CONTENT_W });
  const price = pkg.numericPrice ? `From ${inr(pkg.numericPrice)} per person` : pkg.price;
  doc
    .moveDown(0.2)
    .font("regular")
    .fontSize(10)
    .fillColor(C.muted)
    .text([pkg.duration, price, pkg.visa && `Visa: ${pkg.visa}`].filter(Boolean).join("   ·   "));

  if (pkg.description) {
    doc
      .moveDown(0.8)
      .font("regular")
      .fontSize(10.5)
      .fillColor(C.fg)
      .text(pkg.description, { width: CONTENT_W, lineGap: 2 });
  }

  if (pkg.highlights?.length) {
    sectionTitle(doc, "Highlights");
    bulletList(doc, pkg.highlights);
  }

  if (pkg.itinerary?.length) {
    sectionTitle(doc, "Day by day");
    dayList(doc, pkg.itinerary);
  }

  if (pkg.inclusions?.length) {
    sectionTitle(doc, "What's included");
    bulletList(doc, pkg.inclusions, { color: C.green, mark: "+" });
  }
  if (pkg.exclusions?.length) {
    sectionTitle(doc, "Not included");
    bulletList(doc, pkg.exclusions, { color: C.red, mark: "–", textColor: C.muted });
  }

  const departures = (pkg.availableDates || [])
    .filter((d) => new Date(d.startDate) >= new Date() && d.status !== "sold_out")
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, 8);
  if (departures.length) {
    sectionTitle(doc, "Upcoming departures");
    departures.forEach((d) => {
      ensureSpace(doc, 20);
      const y = doc.y;
      doc
        .font("regular")
        .fontSize(10)
        .fillColor(C.fg)
        .text(
          `${fmtDate(d.startDate, { day: "numeric", month: "short" })} – ${fmtDate(d.endDate)}`,
          MARGIN,
          y,
          { width: 260 }
        )
        .fillColor(d.status === "filling_fast" ? C.accent : C.muted)
        .text(d.status === "filling_fast" ? "Filling fast" : "Available", MARGIN + 270, y, {
          width: 120,
        })
        .fillColor(C.ink)
        .text(inr(d.priceOverride || pkg.numericPrice), MARGIN + 390, y, {
          width: CONTENT_W - 390,
          align: "right",
        });
      doc.moveDown(0.5);
    });
  }

  doc.moveDown(0.6);
  callout(doc, "Book or customise this trip", [
    `Call or WhatsApp ${company.whatsapp || (company.phones || [])[0] || ""} — a planner will confirm dates, hotels and the final price.`,
    pageUrl && `Details online: ${pageUrl}`,
    "Prices are indicative and depend on dates, hotel availability and group size.",
  ]);

  footers(doc, company);
  return toBuffer(doc);
}

/* ── Quotation ─────────────────────────────────────────────── */

const CATEGORY_LABELS = {
  hotel: "Hotels",
  transport: "Transport",
  flight: "Flights & trains",
  activity: "Sightseeing & activities",
  meal: "Meals",
  visa: "Visa",
  insurance: "Insurance",
  guide: "Guide & assistance",
  other: "Other",
};

async function buildQuotePdf(quote, company, { publicUrl } = {}) {
  const doc = createDoc(`Quotation ${quote.number}`);
  letterhead(doc, company, `Quotation ${quote.number}`);

  // Meta row: prepared for / trip / dates
  const travellers = (quote.adults || 0) + (quote.children || 0);
  const colW = CONTENT_W / 3;
  const metaY = doc.y;
  const meta = [
    ["Prepared for", [quote.customer?.name, quote.customer?.phone, quote.customer?.email]],
    [
      "Trip",
      [
        quote.destination,
        quote.startDate && `From ${fmtDate(quote.startDate)}`,
        quote.nights ? `${quote.nights} nights / ${quote.nights + 1} days` : null,
      ],
    ],
    [
      "Quotation",
      [
        `Date: ${fmtDate(quote.sentAt || quote.createdAt || new Date())}`,
        quote.validUntil && `Valid until: ${fmtDate(quote.validUntil)}`,
        `${travellers} traveller${travellers === 1 ? "" : "s"}${quote.children ? ` (${quote.children} child${quote.children > 1 ? "ren" : ""})` : ""}`,
      ],
    ],
  ];
  let metaBottom = metaY;
  meta.forEach(([label, lines], i) => {
    const x = MARGIN + colW * i;
    doc
      .font("regular")
      .fontSize(8)
      .fillColor(C.muted)
      .text(label.toUpperCase(), x, metaY, { width: colW - 12, characterSpacing: 1 });
    doc
      .font("regular")
      .fontSize(10)
      .fillColor(C.fg)
      .text(lines.filter(Boolean).join("\n"), x, doc.y + 3, { width: colW - 12, lineGap: 1 });
    metaBottom = Math.max(metaBottom, doc.y);
  });
  doc.y = metaBottom + 16;
  doc.x = MARGIN;

  await heroImage(doc, quote.image, 170);

  doc
    .font("serif")
    .fontSize(22)
    .fillColor(C.ink)
    .text(quote.title, MARGIN, doc.y, { width: CONTENT_W });
  if (quote.intro) {
    doc
      .moveDown(0.5)
      .font("regular")
      .fontSize(10.5)
      .fillColor(C.fg)
      .text(quote.intro, { width: CONTENT_W, lineGap: 2 });
  }

  if (quote.itinerary?.length) {
    sectionTitle(doc, "Day by day");
    dayList(doc, quote.itinerary);
  }

  // Price
  sectionTitle(doc, quote.showItemPrices ? "Price breakdown" : "What this price covers");
  const t = quote.totals || {};
  const factor = 1 + (quote.markupPercent || 0) / 100;
  const amountX = MARGIN + CONTENT_W - 110;
  const groups = {};
  (quote.items || []).forEach((item) => {
    (groups[item.category] = groups[item.category] || []).push(item);
  });
  Object.entries(groups).forEach(([category, items]) => {
    ensureSpace(doc, 40);
    doc
      .font("semibold")
      .fontSize(9)
      .fillColor(C.accent)
      .text((CATEGORY_LABELS[category] || category).toUpperCase(), MARGIN, doc.y, {
        characterSpacing: 1,
      });
    doc.moveDown(0.2);
    items.forEach((item) => {
      ensureSpace(doc, 30);
      const y = doc.y;
      const descW = quote.showItemPrices ? CONTENT_W - 120 : CONTENT_W;
      doc
        .font("regular")
        .fontSize(10)
        .fillColor(C.fg)
        .text(item.title, MARGIN, y, { width: descW });
      const count =
        item.rooms && item.nights
          ? `${item.rooms} room${item.rooms > 1 ? "s" : ""} × ${item.nights} night${item.nights > 1 ? "s" : ""}`
          : item.quantity > 1 && `× ${item.quantity}`;
      const detail = [item.details, count].filter(Boolean).join("  ·  ");
      if (detail)
        doc.fontSize(8.5).fillColor(C.muted).text(detail, MARGIN, doc.y, { width: descW });
      const bottom = doc.y;
      if (quote.showItemPrices) {
        doc
          .font("regular")
          .fontSize(10)
          .fillColor(C.fg)
          .text(inr(item.quantity * item.unitPrice * factor), amountX, y, {
            width: 110,
            align: "right",
          });
      }
      doc.y = Math.max(bottom, doc.y) + 6;
      doc
        .moveTo(MARGIN, doc.y - 3)
        .lineTo(PAGE.width - MARGIN, doc.y - 3)
        .lineWidth(0.4)
        .strokeColor(C.line)
        .stroke();
    });
    doc.moveDown(0.4);
  });

  // Totals box
  const rows = [
    ["Package price", inr(t.subtotal)],
    t.discount > 0 && ["Discount", `− ${inr(t.discount)}`],
    t.tax > 0 && [`GST (${quote.taxPercent}%)`, inr(t.tax)],
  ].filter(Boolean);
  const boxH = 26 + rows.length * 17 + 52;
  ensureSpace(doc, boxH + 10);
  const boxW = 250;
  const boxX = PAGE.width - MARGIN - boxW;
  const boxY = doc.y + 6;
  doc.roundedRect(boxX, boxY, boxW, boxH, 12).fillColor(C.sand).fill();
  let ry = boxY + 14;
  rows.forEach(([label, value]) => {
    doc
      .font("regular")
      .fontSize(10)
      .fillColor(C.muted)
      .text(label, boxX + 16, ry, { width: 120 });
    doc.fillColor(C.fg).text(value, boxX + 130, ry, { width: boxW - 146, align: "right" });
    ry += 17;
  });
  doc
    .moveTo(boxX + 16, ry + 2)
    .lineTo(boxX + boxW - 16, ry + 2)
    .lineWidth(0.6)
    .strokeColor(C.line)
    .stroke();
  doc
    .font("semibold")
    .fontSize(11)
    .fillColor(C.ink)
    .text("Total", boxX + 16, ry + 12, { width: 100 });
  doc
    .font("serif")
    .fontSize(18)
    .fillColor(C.ink)
    .text(inr(t.total), boxX + 100, ry + 7, { width: boxW - 116, align: "right" });
  if (travellers > 1) {
    doc
      .font("regular")
      .fontSize(8.5)
      .fillColor(C.muted)
      .text(`${inr(t.perPerson)} per person`, boxX + 100, ry + 30, {
        width: boxW - 116,
        align: "right",
      });
  }
  doc.y = boxY + boxH + 12;
  doc.x = MARGIN;

  if (quote.inclusions?.length) {
    sectionTitle(doc, "Included");
    bulletList(doc, quote.inclusions, { color: C.green, mark: "+" });
  }
  if (quote.exclusions?.length) {
    sectionTitle(doc, "Not included");
    bulletList(doc, quote.exclusions, { color: C.red, mark: "–", textColor: C.muted });
  }
  if (quote.notes) {
    sectionTitle(doc, "Notes");
    doc
      .font("regular")
      .fontSize(10)
      .fillColor(C.fg)
      .text(quote.notes, { width: CONTENT_W, lineGap: 1.5 });
  }
  if (quote.terms) {
    sectionTitle(doc, "Terms & payment");
    doc
      .font("regular")
      .fontSize(9)
      .fillColor(C.muted)
      .text(quote.terms, { width: CONTENT_W, lineGap: 1.5 });
  }

  doc.moveDown(0.8);
  callout(doc, "Ready to go ahead?", [
    publicUrl && `Accept this quotation online: ${publicUrl}`,
    `Or call / WhatsApp ${company.whatsapp || (company.phones || [])[0] || ""}. Rates are subject to availability at the time of booking.`,
  ]);

  footers(doc, company);
  return toBuffer(doc);
}

module.exports = { buildItineraryPdf, buildQuotePdf, CATEGORY_LABELS };
