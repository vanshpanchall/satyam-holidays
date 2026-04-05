const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const logger = require("../utils/logger");

// Fail-fast: require critical env vars
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const NODE_ENV = process.env.NODE_ENV || "development";

// Cookie settings for HTTPOnly JWT
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: NODE_ENV === "production",
  sameSite: NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 60 * 60 * 1000, // 1 hour (reduced from 8h for security)
  path: "/",
};

if (!JWT_SECRET) {
  logger.error("FATAL: JWT_SECRET environment variable is required");
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  logger.warn("ADMIN_EMAIL or ADMIN_PASSWORD not set — admin login will be disabled");
}

// Pre-hash the admin password SYNCHRONOUSLY at startup to avoid timing issues
const adminPasswordHash = ADMIN_PASSWORD ? bcrypt.hashSync(ADMIN_PASSWORD, 10) : null;

// Aggressive rate limiting for login endpoint (5 attempts per 15 minutes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
  keyGenerator: (req) => req.ip || req.headers["x-forwarded-for"] || "unknown",
});

// RFC 5322 compliant email regex (more strict)
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// POST /api/auth/login
router.post("/login", loginLimiter, async (req, res) => {
  if (!JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: "Server configuration error",
    });
  }

  const { email, password } = req.body;

  // Validate inputs
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid input format",
    });
  }

  // Strict email format check
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
  }

  if (!ADMIN_EMAIL || !adminPasswordHash) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  const emailMatch = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const passwordMatch = await bcrypt.compare(password, adminPasswordHash);

  if (emailMatch && passwordMatch) {
    const payload = {
      user: {
        id: "admin-id-1",
        role: "admin",
        email: ADMIN_EMAIL,
      },
    };

    jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" }, (err, token) => {
      if (err) {
        logger.error("JWT sign error:", err);
        return res.status(500).json({ success: false, message: "Authentication error" });
      }

      // Set HTTPOnly cookie
      res.cookie("adminToken", token, COOKIE_OPTIONS);

      // Also return token for backward compatibility during transition
      res.json({ success: true, token });
    });
  } else {
    logger.warn("Failed login attempt", { email: email.substring(0, 3) + "***", ip: req.ip });
    res.status(401).json({ success: false, message: "Invalid email or password" });
  }
});

// POST /api/auth/logout
router.post("/logout", (_req, res) => {
  res.clearCookie("adminToken", { path: "/" });
  res.json({ success: true, message: "Logged out successfully" });
});

// GET /api/auth/verify - Verify token validity
router.get("/verify", (req, res) => {
  // Check cookie first, then header
  const cookieToken = req.cookies?.adminToken;
  const headerToken = req.header("Authorization")?.replace("Bearer ", "");
  const token = cookieToken || headerToken;

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ success: true, user: decoded.user });
  } catch {
    res.clearCookie("adminToken", { path: "/" });
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
});

module.exports = router;
