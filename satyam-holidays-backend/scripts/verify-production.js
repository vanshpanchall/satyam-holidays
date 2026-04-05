/* eslint-disable no-console */
require("dotenv").config();

const Sentry = require("@sentry/node");
const nodemailer = require("nodemailer");
const { cloudinary } = require("../utils/cloudinary");

const API_BASE_URL = (process.env.API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
const VERIFY_EMAIL_TO = process.env.VERIFY_EMAIL_TO || "";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

function nowIso() {
  return new Date().toISOString();
}

function createResult(name, ok, detail, required = true) {
  return { name, ok, detail, required };
}

async function getFetch() {
  if (typeof fetch === "function") return fetch;
  throw new Error("Global fetch is unavailable. Use Node.js 18+ to run production verification.");
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function checkHealth(fetchImpl) {
  const res = await fetchImpl(`${API_BASE_URL}/api/v1/health`);
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    return createResult("Health endpoint", false, `HTTP ${res.status}`);
  }
  if (!body || !body.status) {
    return createResult("Health endpoint", false, "Missing health payload");
  }
  return createResult("Health endpoint", true, `status=${body.status}`);
}

async function checkAdminLogin(fetchImpl) {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return createResult("Admin login", false, "ADMIN_EMAIL/ADMIN_PASSWORD missing");
  }

  const loginRes = await fetchImpl(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  const loginBody = await parseJsonSafe(loginRes);
  const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];

  if (!loginRes.ok || !loginBody?.success || !cookie.startsWith("adminToken=")) {
    return createResult("Admin login", false, `Login failed: HTTP ${loginRes.status}`);
  }

  const verifyRes = await fetchImpl(`${API_BASE_URL}/api/v1/auth/verify`, {
    headers: { Cookie: cookie },
  });
  const verifyBody = await parseJsonSafe(verifyRes);

  if (!verifyRes.ok || !verifyBody?.success) {
    return createResult("Admin login", false, "Token verify endpoint failed after login");
  }

  return createResult("Admin login", true, "Login + token verification successful");
}

async function checkHttpsRedirect(fetchImpl) {
  const url = new URL(API_BASE_URL);
  const httpUrl = `${url.protocol === "https:" ? "http:" : url.protocol}//${url.host}`;

  const res = await fetchImpl(`${httpUrl}/api/v1/health`, {
    redirect: "manual",
  });

  const status = res.status;
  const location = res.headers.get("location") || "";
  const redirectedToHttps = /^https:\/\//i.test(location);

  if (status >= 300 && status < 400 && redirectedToHttps) {
    return createResult("HTTPS redirect", true, `${status} -> ${location}`);
  }

  return createResult(
    "HTTPS redirect",
    false,
    `Expected 30x redirect to https, got status=${status}, location=${location || "none"}`
  );
}

async function checkSentry() {
  if (!process.env.SENTRY_DSN) {
    return createResult("Sentry event", false, "SENTRY_DSN missing");
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "production",
    tracesSampleRate: 0,
  });

  const eventId = Sentry.captureMessage(`Production verification event at ${nowIso()}`);
  await Sentry.flush(5000);

  return createResult("Sentry event", true, `Test event queued with id=${eventId}`);
}

async function checkCloudinary() {
  const hasCloudinary =
    !!process.env.CLOUDINARY_CLOUD_NAME &&
    !!process.env.CLOUDINARY_API_KEY &&
    !!process.env.CLOUDINARY_API_SECRET;

  if (!hasCloudinary) {
    return createResult("Cloudinary", false, "Cloudinary credentials missing");
  }

  await cloudinary.api.ping();
  return createResult("Cloudinary", true, "Cloudinary API ping successful");
}

function createTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function checkEmail() {
  if (!VERIFY_EMAIL_TO) {
    return createResult("Email delivery", false, "VERIFY_EMAIL_TO is not set");
  }

  const transport = createTransport();
  await transport.verify();

  const fromAddress = process.env.SMTP_USER || process.env.EMAIL_USER;
  if (!fromAddress) {
    return createResult("Email delivery", false, "No sender email configured");
  }

  await transport.sendMail({
    from: fromAddress,
    to: VERIFY_EMAIL_TO,
    subject: "Satyam Holidays - Production verification email",
    text: `Verification email sent at ${nowIso()}`,
  });

  return createResult("Email delivery", true, `Test email sent to ${VERIFY_EMAIL_TO}`);
}

async function run() {
  const fetchImpl = await getFetch();
  const checks = [
    checkHealth(fetchImpl),
    checkAdminLogin(fetchImpl),
    checkHttpsRedirect(fetchImpl),
    checkSentry(),
    checkCloudinary(),
    checkEmail(),
  ];

  const results = [];
  for (const check of checks) {
    try {
      const result = await check;
      results.push(result);
    } catch (error) {
      results.push(createResult("Unhandled check", false, error.message || "Unknown error"));
    }
  }

  console.log("\nProduction Verification Summary\n");
  for (const r of results) {
    const mark = r.ok ? "PASS" : "FAIL";
    console.log(`${mark}  ${r.name}: ${r.detail}`);
  }

  const requiredFailures = results.filter((r) => r.required && !r.ok);
  if (requiredFailures.length > 0) {
    console.error(`\nVerification failed with ${requiredFailures.length} required check(s).`);
    process.exit(1);
  }

  console.log("\nAll required checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
