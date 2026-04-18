const crypto = require("crypto");

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_LENGTH = 32;

function getCookieSameSite() {
  const configured = String(process.env.CSRF_COOKIE_SAMESITE || "")
    .trim()
    .toLowerCase();
  if (["strict", "lax", "none"].includes(configured)) {
    return configured;
  }
  // Default to cross-site compatible policy in production where frontend/backend are often split.
  return process.env.NODE_ENV === "production" ? "none" : "lax";
}

function buildCsrfCookieOptions() {
  const sameSite = getCookieSameSite();
  // Browsers require Secure=true when SameSite=None.
  const secure = sameSite === "none" || process.env.NODE_ENV === "production";

  return {
    httpOnly: false, // Client needs to read it
    secure,
    sameSite,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: "/",
  };
}

/**
 * Generate a cryptographically secure CSRF token
 */
function generateToken() {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

/**
 * Middleware to set CSRF token in cookie
 * Use on routes that render forms or on initial page load
 */
function setCsrfToken(req, res, next) {
  if (!req.cookies[CSRF_COOKIE_NAME]) {
    const token = generateToken();
    res.cookie(CSRF_COOKIE_NAME, token, buildCsrfCookieOptions());
    req.csrfToken = token;
  } else {
    req.csrfToken = req.cookies[CSRF_COOKIE_NAME];
  }
  next();
}

/**
 * Middleware to validate CSRF token on state-changing requests
 * Checks that the token in the header matches the token in the cookie
 */
function validateCsrf(req, res, next) {
  // Skip CSRF check for safe methods
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      success: false,
      error: "CSRF token missing",
      code: "CSRF_MISSING",
    });
  }

  // Constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    return res.status(403).json({
      success: false,
      error: "CSRF token mismatch",
      code: "CSRF_INVALID",
    });
  }

  next();
}

/**
 * Route handler to get a fresh CSRF token
 * GET /api/csrf-token
 */
function getCsrfToken(req, res) {
  const token = generateToken();
  res.cookie(CSRF_COOKIE_NAME, token, buildCsrfCookieOptions());
  res.json({ success: true, csrfToken: token });
}

module.exports = {
  setCsrfToken,
  validateCsrf,
  getCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
};
