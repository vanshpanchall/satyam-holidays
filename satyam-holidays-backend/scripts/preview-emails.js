#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Renders every email template with sample data so you can check them in a browser.
 *   node scripts/preview-emails.js [outputDir]     (default: ./email-previews)
 * Uses the default site settings — no database or SMTP needed.
 */
const fs = require("fs");
const path = require("path");
const { createEmailTemplates } = require("../utils/emailTemplates");
const DEFAULTS = require("../services/contentDefaults");

const outDir = path.resolve(process.argv[2] || "email-previews");
fs.mkdirSync(outDir, { recursive: true });

const brand = {
  NAME: "Satyam Holidays",
  TAGLINE: "Journey With Joy!",
  LOGO_URL: "",
  PHONE: "+91 98247 37137",
  EMAIL: "satyamholidays19@gmail.com",
  SITE: process.env.PUBLIC_SITE_URL || "https://satyamholidays.vercel.app",
  WHATSAPP: "919824737137",
  ADDRESS: "56, Uttar Gujarat Panchal Society, Ranip, Ahmedabad, Gujarat, India",
  HIGHLIGHTS: DEFAULTS["home.highlights"],
};

const enquiry = {
  _id: "6719f1c2a4b5c6d7e8f90a1b",
  name: "Meera Shah",
  email: "meera@example.com",
  phone: "+91 98765 43210",
  destination: "chardham",
  travelDate: new Date(Date.now() + 40 * 86400000),
  travelers: "4",
  budget: "20k-50k",
  source: "package-page",
  leadScore: 95,
  visaRequired: false,
  travelInsurance: true,
  ipAddress: "203.0.113.7",
  createdAt: new Date(),
  message:
    "My parents are 68 and 71, so we need pony bookings at Kedarnath and ground-floor rooms.\n\n[Inquired via Package Page: Chardham Yatra by Road]\n- Estimated total: INR 171996\n- Insurance requested: Yes\n- Visa help requested: No",
};

const samples = {
  "enquiry-confirmation": { name: enquiry.name, enquiryId: enquiry._id, enquiry },
  "enquiry-notification": { enquiry },
  "mfa-otp": { code: "482913" },
  "enquiry-nudge": { name: enquiry.name, destination: "kashmir" },
  "referral-code": { code: "MEERA-5OFF" },
};

const templates = createEmailTemplates(brand);
for (const [name, data] of Object.entries(samples)) {
  const { subject, html, text } = templates[name](data);
  fs.writeFileSync(path.join(outDir, `${name}.html`), html);
  fs.writeFileSync(path.join(outDir, `${name}.txt`), `Subject: ${subject}\n\n${text}\n`);
  console.log(`${name.padEnd(22)} ${subject}`);
}
console.log(`\nWritten to ${outDir}`);
