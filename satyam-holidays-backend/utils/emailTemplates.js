/**
 * Transactional email templates, styled to match the website (ink navy + saffron, serif headlines).
 *
 * Email-client rules followed here: table layout, inline styles only, no gradients, no SVG
 * images (Gmail/Outlook block them), solid "bulletproof" buttons, a hidden preheader, and a
 * plain-text alternative for every message. All user data goes through `safe()`; subjects are
 * plain text (never HTML-escaped).
 */
const { escapeHtml } = require("./validators");

const C = {
  page: "#f6f1ea",
  card: "#fffdf9",
  raised: "#fbf8f3",
  ink: "#0f1e2e",
  text: "#22384f",
  muted: "#5b6f84",
  line: "#e6ddcf",
  accent: "#e06614",
  accentText: "#b94e10", // saffron dark enough for text on light backgrounds
  accentSoft: "#fff1e4",
  green: "#1f7a4d",
};
const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace";

const DESTINATIONS = {
  chardham: "Chardham Yatra",
  kashmir: "Jammu & Kashmir",
  andaman: "Andaman & Nicobar",
  domestic: "Somewhere in India",
  dubai: "Dubai",
  singapore: "Singapore",
  thailand: "Thailand",
  vietnam: "Vietnam",
  nepal: "Nepal",
  international: "Somewhere abroad",
  custom: "Not decided yet",
};
const BUDGETS = {
  "under-20k": "Under ₹20,000 per person",
  "20k-50k": "₹20,000 – ₹50,000 per person",
  "50k-1l": "₹50,000 – ₹1 lakh per person",
  "above-1l": "Above ₹1 lakh per person",
};
const SOURCES = {
  website: "Website",
  homepage: "Homepage form",
  "package-page": "Package page",
  "ai-planner": "Trip planner",
};

const safe = (v) => escapeHtml(String(v ?? ""));
const plainSubject = (s) =>
  String(s || "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 140);
const firstName = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)[0] || "there";
const destinationLabel = (v) =>
  DESTINATIONS[v] || (v ? v[0].toUpperCase() + v.slice(1) : "Not decided yet");
const budgetLabel = (v) => BUDGETS[v] || "Not shared";
const travellersLabel = (v) =>
  !v ? "Not shared" : v === "5+" ? "5 or more" : `${v} ${v === "1" ? "traveller" : "travellers"}`;
const dateLabel = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Flexible";
const shortRef = (id) =>
  String(id || "")
    .slice(-6)
    .toUpperCase();
const digits = (v) => String(v || "").replace(/\D/g, "");
const waLink = (phone, text) =>
  `https://wa.me/${digits(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

/** Splits the "[Inquired via Package Page: …]" block the package page appends to messages */
function parseMessage(message = "") {
  const idx = message.indexOf("[Inquired via");
  if (idx === -1) return { comment: message.trim(), packageName: null, details: [] };
  const comment = message.slice(0, idx).trim();
  const lines = message
    .slice(idx)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const packageName = (lines[0].match(/Page:\s*(.+?)\]?$/) || [])[1] || null;
  const details = lines
    .slice(1)
    .filter((l) => l.startsWith("- "))
    .map((l) => {
      const [k, ...rest] = l.slice(2).split(":");
      const value = rest.join(":").trim();
      // "INR 171996" (written by the package page) → "₹1,71,996"
      const inr = value.match(/^INR\s*(\d+)$/i);
      return [k.trim(), inr ? `₹${Number(inr[1]).toLocaleString("en-IN")}` : value];
    });
  return { comment, packageName, details };
}

/* ── building blocks ─────────────────────────────────── */

const preheader = (text) =>
  `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${C.page};">${safe(text)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>`;

const eyebrow = (text) =>
  `<p style="margin:0 0 14px;font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};"><span style="color:${C.accent};">&mdash;&mdash;</span>&nbsp;&nbsp;${safe(text)}</p>`;

/** Serif headline; `accent` is rendered in italic saffron, like the site's *starred* words */
const headline = (main, accent) =>
  `<h1 style="margin:0 0 18px;font-family:${SERIF};font-size:30px;line-height:1.2;font-weight:normal;color:${C.ink};">${safe(main)}${
    accent ? ` <em style="font-style:italic;color:${C.accentText};">${safe(accent)}</em>` : ""
  }</h1>`;

const para = (html, extra = "") =>
  `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.65;color:${C.text};${extra}">${html}</p>`;

const sectionTitle = (text) =>
  `<p style="margin:28px 0 10px;font-family:${SANS};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${C.muted};">${safe(text)}</p>`;

/** Label/value rows with hairline dividers. Values are trusted HTML (escape before passing). */
const detailsTable = (rows) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid ${C.line};border-radius:12px;background:${C.raised};">
  ${rows
    .filter(Boolean)
    .map(
      ([label, value], i) => `<tr>
    <td style="padding:12px 16px;${i ? `border-top:1px solid ${C.line};` : ""}font-family:${SANS};font-size:13px;color:${C.muted};width:38%;vertical-align:top;">${safe(label)}</td>
    <td style="padding:12px 16px;${i ? `border-top:1px solid ${C.line};` : ""}font-family:${SANS};font-size:14px;color:${C.ink};font-weight:600;vertical-align:top;">${value}</td>
  </tr>`
    )
    .join("")}
</table>`;

/** Solid pill button that survives Outlook (background on the cell, padding on the link) */
const button = (href, label, variant = "ink") => {
  const styles = {
    ink: { bg: C.ink, fg: "#ffffff", border: C.ink },
    accent: { bg: C.accent, fg: "#ffffff", border: C.accent },
    ghost: { bg: C.card, fg: C.ink, border: "#cbbfae" },
  }[variant];
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;margin:0 8px 10px 0;">
  <tr><td align="center" bgcolor="${styles.bg}" style="border-radius:999px;border:1px solid ${styles.border};">
    <a href="${safe(href)}" target="_blank" style="display:inline-block;padding:13px 24px;font-family:${SANS};font-size:14px;font-weight:600;color:${styles.fg};text-decoration:none;border-radius:999px;">${safe(label)}</a>
  </td></tr>
</table>`;
};

const quote = (text) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:3px solid ${C.accent};background:${C.accentSoft};border-radius:0 12px 12px 0;">
  <tr><td style="padding:14px 18px;font-family:${SANS};font-size:14px;line-height:1.6;color:${C.text};white-space:pre-line;">${safe(text)}</td></tr>
</table>`;

const steps = (items) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  ${items
    .map(
      ([title, text], i) => `<tr>
    <td width="40" valign="top" style="padding:10px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="28" height="28" align="center" style="border:1px solid ${C.line};border-radius:999px;font-family:${SERIF};font-size:14px;color:${C.accentText};">${i + 1}</td>
      </tr></table>
    </td>
    <td valign="top" style="padding:10px 0 10px 4px;">
      <p style="margin:0 0 2px;font-family:${SANS};font-size:14px;font-weight:600;color:${C.ink};">${safe(title)}</p>
      <p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.55;color:${C.muted};">${safe(text)}</p>
    </td>
  </tr>`
    )
    .join("")}
</table>`;

const chip = (text, tone = "neutral") => {
  const t = {
    neutral: { bg: C.raised, fg: C.text, border: C.line },
    accent: { bg: C.accentSoft, fg: C.accentText, border: "#f6d2b3" },
    green: { bg: "#e8f5ee", fg: C.green, border: "#c5e6d3" },
  }[tone];
  return `<span style="display:inline-block;margin:0 6px 6px 0;padding:5px 11px;border:1px solid ${t.border};border-radius:999px;background:${t.bg};font-family:${SANS};font-size:12px;font-weight:600;color:${t.fg};">${safe(text)}</span>`;
};

/* ── page shell ──────────────────────────────────────── */

function layout(brand, { title, preview, body, footerNote }) {
  const logo = brand.LOGO_URL
    ? `<img src="${safe(brand.LOGO_URL)}" width="40" height="40" alt="" style="display:block;width:40px;height:40px;border-radius:999px;background:#ffffff;border:0;" />`
    : "";
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
  <title>${safe(title)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body { margin:0 !important; padding:0 !important; width:100% !important; }
    a { color:${C.accentText}; }
    @media only screen and (max-width:620px) {
      .shell { width:100% !important; }
      .pad { padding-left:22px !important; padding-right:22px !important; }
      .h1 { font-size:26px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-font-smoothing:antialiased;">
  ${preheader(preview)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
    <tr><td align="center" style="padding:32px 12px 40px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="shell" style="width:600px;max-width:600px;">

        <!-- Wordmark -->
        <tr><td class="pad" style="padding:0 8px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            ${logo ? `<td style="padding-right:12px;vertical-align:middle;">${logo}</td>` : ""}
            <td style="vertical-align:middle;">
              <a href="${safe(brand.SITE)}" target="_blank" style="text-decoration:none;">
                <span style="display:block;font-family:${SERIF};font-size:22px;line-height:1.1;color:${C.ink};">${safe(brand.NAME)}</span>
                ${brand.TAGLINE ? `<span style="display:block;margin-top:4px;font-family:${SANS};font-size:10px;letter-spacing:2.4px;text-transform:uppercase;color:${C.muted};">${safe(brand.TAGLINE)}</span>` : ""}
              </a>
            </td>
          </tr></table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:20px;overflow:hidden;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td height="4" style="height:4px;line-height:4px;font-size:0;background:${C.accent};border-radius:20px 20px 0 0;">&nbsp;</td></tr>
            <tr><td class="pad" style="padding:36px 40px 40px;">
              ${body}
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td class="pad" style="padding:28px 8px 0;font-family:${SANS};font-size:12px;line-height:1.7;color:${C.muted};">
          <p style="margin:0 0 6px;font-family:${SERIF};font-size:15px;color:${C.ink};">${safe(brand.NAME)}</p>
          ${brand.ADDRESS ? `<p style="margin:0;">${safe(brand.ADDRESS)}</p>` : ""}
          <p style="margin:0;">
            <a href="tel:${safe(digits(brand.PHONE) ? `+${digits(brand.PHONE)}` : "")}" style="color:${C.muted};text-decoration:none;">${safe(brand.PHONE)}</a>
            &nbsp;&middot;&nbsp;
            <a href="mailto:${safe(brand.EMAIL)}" style="color:${C.muted};text-decoration:none;">${safe(brand.EMAIL)}</a>
            &nbsp;&middot;&nbsp;
            <a href="${safe(brand.SITE)}" target="_blank" style="color:${C.muted};text-decoration:none;">${safe(brand.SITE.replace(/^https?:\/\//, ""))}</a>
          </p>
          <p style="margin:14px 0 0;font-size:11px;color:#8a99a8;">${footerNote ? safe(footerNote) : ""}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Readable plain-text alternative from the HTML (good enough for text-only clients and spam filters) */
function htmlToText(html) {
  return html
    .replace(/<head[\s\S]*?<\/head>/i, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<div style="display:none[\s\S]*?<\/div>/i, "")
    .replace(/\s+/g, " ") // source formatting is not content; structure comes from the tags below
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, label) => {
      const text = label.replace(/<[^>]+>/g, "").trim();
      return href.startsWith("mailto:") || href.startsWith("tel:") || text === href
        ? text
        : `${text} (${href})`;
    })
    .replace(/<(br|\/p|\/h1|\/tr|\/li)[^>]*>/gi, "\n")
    .replace(/<\/td>/gi, "  ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&#8203;/g, " ")
    .replace(/&middot;/g, "·")
    .replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const finish = (brand, { subject, title, preview, body, footerNote }) => {
  const html = layout(brand, { title: title || subject, preview, body, footerNote });
  return { subject: plainSubject(subject), html, text: htmlToText(html) };
};

/* ── templates ───────────────────────────────────────── */

function createEmailTemplates(brand) {
  const NEXT_STEPS = [
    [
      "We call you back",
      "A planner gets in touch to understand dates, budget and who's travelling.",
    ],
    ["You get a draft", "A day-by-day itinerary with hotels and a clear, itemised quote."],
    [
      "Tweak, then book",
      "Change anything you like. Confirm with an advance and we handle the rest.",
    ],
  ];

  return {
    /* Customer: "we received your enquiry" */
    "enquiry-confirmation": (data) => {
      const e = data.enquiry || {};
      const ref = shortRef(data.enquiryId || e._id);
      const { packageName } = parseMessage(e.message);
      const body = `
        ${eyebrow("Enquiry received")}
        ${headline(`Thank you, ${firstName(data.name || e.name)}.`, "We're on it.")}
        ${para(`We've received your enquiry and a planner from <strong style="color:${C.ink};">${safe(brand.NAME)}</strong> will get in touch shortly by phone or WhatsApp. There's nothing you need to pay or prepare yet.`)}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;background:${C.ink};border-radius:14px;">
          <tr><td style="padding:18px 22px;">
            <p style="margin:0 0 4px;font-family:${SANS};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#b3c0cc;">Your reference</p>
            <p style="margin:0;font-family:${MONO};font-size:24px;letter-spacing:4px;color:#ffffff;">#${safe(ref)}</p>
            <p style="margin:6px 0 0;font-family:${SANS};font-size:12px;color:#b3c0cc;">Mention this if you call or message us.</p>
          </td></tr>
        </table>

        ${sectionTitle("What you told us")}
        ${detailsTable([
          packageName && ["Trip", safe(packageName)],
          ["Destination", safe(destinationLabel(e.destination))],
          ["Travel date", safe(dateLabel(e.travelDate))],
          ["Travellers", safe(travellersLabel(e.travelers))],
          ["Budget", safe(budgetLabel(e.budget))],
        ])}

        ${sectionTitle("What happens next")}
        ${steps(NEXT_STEPS)}

        <div style="height:24px;line-height:24px;font-size:0;">&nbsp;</div>
        ${button(waLink(brand.WHATSAPP, `Hi ${brand.NAME}, my enquiry reference is #${ref}.`), "Message us on WhatsApp", "ink")}
        ${button(`tel:+${digits(brand.PHONE)}`, `Call ${brand.PHONE}`, "ghost")}

        ${para(`Warm regards,<br/><span style="font-family:${SERIF};font-size:17px;color:${C.ink};">Team ${safe(brand.NAME)}</span>`, "margin:24px 0 0;")}
      `;
      return finish(brand, {
        subject: `We've received your enquiry — ref #${ref}`,
        preview: `Thanks ${firstName(data.name || e.name)} — a planner will be in touch shortly. Your reference is #${ref}.`,
        body,
        footerNote: `You're receiving this because you sent an enquiry on ${brand.SITE.replace(/^https?:\/\//, "")}.`,
      });
    },

    /* Admin: new website enquiry */
    "enquiry-notification": (data) => {
      const e = data.enquiry || {};
      const { comment, packageName, details } = parseMessage(e.message);
      const ref = shortRef(e._id);
      const adminUrl = `${brand.SITE}/admin/enquiries?id=${encodeURIComponent(String(e._id || ""))}`;
      const score = Number(e.leadScore) || 0;
      const scoreTone = score >= 90 ? "accent" : "neutral";
      const scoreLabel = score >= 90 ? "Hot lead" : score >= 60 ? "Warm lead" : "Cold lead";
      const received = e.createdAt ? new Date(e.createdAt) : new Date();

      const body = `
        ${eyebrow(`New enquiry · #${ref}`)}
        ${headline(e.name || "New enquiry", packageName ? `· ${packageName}` : `· ${destinationLabel(e.destination)}`)}
        <p style="margin:0 0 18px;">
          ${chip(`${scoreLabel} · ${score}`, scoreTone)}
          ${chip(SOURCES[e.source] || "Website")}
          ${e.visaRequired ? chip("Needs visa help", "accent") : ""}
          ${e.travelInsurance ? chip("Wants insurance", "green") : ""}
        </p>

        ${sectionTitle("Contact")}
        ${detailsTable([
          e.phone && [
            "Phone",
            `<a href="tel:${safe(e.phone)}" style="color:${C.ink};text-decoration:none;">${safe(e.phone)}</a>`,
          ],
          e.email && [
            "Email",
            `<a href="mailto:${safe(e.email)}" style="color:${C.ink};text-decoration:none;">${safe(e.email)}</a>`,
          ],
        ])}

        ${sectionTitle("Trip")}
        ${detailsTable([
          packageName && ["Package", safe(packageName)],
          ["Destination", safe(destinationLabel(e.destination))],
          ["Travel date", safe(dateLabel(e.travelDate))],
          ["Travellers", safe(travellersLabel(e.travelers))],
          ["Budget", safe(budgetLabel(e.budget))],
          ...details.map(([k, v]) => [k, safe(v)]),
        ])}

        ${comment ? `${sectionTitle("Their message")}${quote(comment)}` : ""}

        <div style="height:26px;line-height:26px;font-size:0;">&nbsp;</div>
        ${button(adminUrl, "Open in admin", "ink")}
        ${e.phone ? button(waLink(e.phone, `Hi ${firstName(e.name)}, this is ${brand.NAME} about your trip enquiry.`), "WhatsApp", "ghost") : ""}
        ${e.phone ? button(`tel:${digits(e.phone)}`, "Call", "ghost") : ""}

        <p style="margin:22px 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.muted};">
          Received ${safe(received.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }))} IST.
          Reply within 2 hours to stay inside the response target.
        </p>
      `;
      return finish(brand, {
        subject: `New enquiry: ${e.name || "Website visitor"} — ${packageName || destinationLabel(e.destination)}`,
        preview: `${travellersLabel(e.travelers)} · ${dateLabel(e.travelDate)} · ${budgetLabel(e.budget)}`,
        body,
        footerNote: `Enquiry ${String(e._id || "")}${e.ipAddress ? ` · IP ${e.ipAddress}` : ""}. Sent to the ${brand.NAME} team.`,
      });
    },

    /* Admin: sign-in verification code */
    "mfa-otp": (data) => {
      const code = String(data.code || "");
      const spaced = code.replace(/(\d{3})(?=\d)/g, "$1 ");
      const body = `
        ${eyebrow("Sign-in verification")}
        ${headline("Your sign-in code")}
        ${para(`Someone is signing in to the <strong style="color:${C.ink};">${safe(brand.NAME)}</strong> admin panel with your account. Enter this code to finish signing in:`)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 10px;">
          <tr><td align="center" style="padding:24px;border:1px solid ${C.line};border-radius:16px;background:${C.raised};">
            <p style="margin:0;font-family:${MONO};font-size:38px;letter-spacing:10px;color:${C.ink};">${safe(spaced)}</p>
            <p style="margin:10px 0 0;font-family:${SANS};font-size:12px;color:${C.muted};">Expires in 5 minutes · can be used once</p>
          </td></tr>
        </table>
        ${sectionTitle("Didn't try to sign in?")}
        ${para(`Don't share this code with anyone — our team will never ask for it. If this wasn't you, someone may know your password: change it from <em>Admin → Site settings → Admin accounts</em> straight away.`, `font-size:14px;color:${C.muted};`)}
      `;
      return finish(brand, {
        subject: `${code} is your ${brand.NAME} admin sign-in code`,
        preview: `Your code is ${code}. It expires in 5 minutes.`,
        body,
        footerNote: `Security email for ${brand.NAME} admin access. Sent ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })} IST.`,
      });
    },

    /* Customer: one-off follow-up 24h after an enquiry that's still pending */
    "enquiry-nudge": (data) => {
      const dest = destinationLabel(data.destination);
      const known =
        data.destination && !["custom", "domestic", "international"].includes(data.destination);
      const highlights = (Array.isArray(brand.HIGHLIGHTS) ? brand.HIGHLIGHTS : [])
        .filter((h) => h && h.title && h.text)
        .slice(0, 3)
        .map((h) => [h.title, h.text]);
      const body = `
        ${eyebrow("Following up")}
        ${headline(`Still thinking about ${known ? dest : "your trip"},`, `${firstName(data.name)}?`)}
        ${para(`You sent us an enquiry yesterday and we'd love to help you finish planning it. If it's easier, just reply to this email with your dates and who's travelling — a planner will put together a draft itinerary and quote for you.`)}
        ${highlights.length ? `${sectionTitle(`Why people plan with ${brand.NAME}`)}${steps(highlights)}` : ""}
        <div style="height:24px;line-height:24px;font-size:0;">&nbsp;</div>
        ${button(waLink(brand.WHATSAPP, `Hi ${brand.NAME}, I'd like to continue planning my trip${known ? ` to ${dest}` : ""}.`), "Continue on WhatsApp", "ink")}
        ${button(`${brand.SITE}/packages`, "Browse trips", "ghost")}
        ${para(`Already sorted? No problem — this is the only reminder we'll send.`, `margin:22px 0 0;font-size:13px;color:${C.muted};`)}
      `;
      return finish(brand, {
        subject: known ? `Still planning your ${dest} trip?` : "Still planning your trip?",
        preview: "Reply with your dates and we'll send a draft itinerary and quote.",
        body,
        footerNote: `You're receiving this one-time follow-up because you enquired on ${brand.SITE.replace(/^https?:\/\//, "")}.`,
      });
    },

    /* Customer: referral reward code */
    "referral-code": (data) => {
      const body = `
        ${eyebrow("Referral reward")}
        ${headline("Thank you for spreading the word.", "Here's your code.")}
        ${para(`Someone you referred has booked a trip with <strong style="color:${C.ink};">${safe(brand.NAME)}</strong>. As a thank-you, here's a discount code for your next holiday with us.`)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 10px;">
          <tr><td align="center" style="padding:24px;border:1px dashed ${C.accent};border-radius:16px;background:${C.accentSoft};">
            <p style="margin:0 0 6px;font-family:${SANS};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${C.accentText};">Your code</p>
            <p style="margin:0;font-family:${MONO};font-size:30px;letter-spacing:4px;color:${C.ink};">${safe(data.code)}</p>
          </td></tr>
        </table>
        ${para(`Enter it in the promo code box on any trip page, or quote it to your planner. Terms such as validity and eligible trips are confirmed by our team when you book.`, `font-size:14px;color:${C.muted};`)}
        <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
        ${button(`${brand.SITE}/packages`, "Find your next trip", "ink")}
      `;
      return finish(brand, {
        subject: `Your ${brand.NAME} referral code: ${data.code || ""}`.trim(),
        preview: "Thanks for referring a friend — here's a discount code for your next trip.",
        body,
        footerNote: `Sent because a booking was made using your referral.`,
      });
    },
  };
}

module.exports = { createEmailTemplates, htmlToText, parseMessage };
