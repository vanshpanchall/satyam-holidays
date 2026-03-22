const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const logger = require("../utils/logger");

// Fail-fast: require critical env vars
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!JWT_SECRET) {
  logger.error("FATAL: JWT_SECRET environment variable is required");
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  logger.warn("ADMIN_EMAIL or ADMIN_PASSWORD not set — admin login will be disabled");
}

// Pre-hash the admin password SYNCHRONOUSLY at startup to avoid timing issues
// This ensures the hash is ready before any request can come in
const adminPasswordHash = ADMIN_PASSWORD ? bcrypt.hashSync(ADMIN_PASSWORD, 10) : null;

// POST /api/auth/login
router.post("/login", async (req, res) => {
  if (!JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: "Server configuration error: JWT secret is missing",
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

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
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

    jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" }, (err, token) => {
      if (err) {
        logger.error("JWT sign error:", err);
        return res.status(500).json({ success: false, message: "Authentication error" });
      }
      res.json({ success: true, token });
    });
  } else {
    res.status(401).json({ success: false, message: "Invalid email or password" });
  }
});

module.exports = router;
