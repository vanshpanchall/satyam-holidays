const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const emailUtils = require("../utils/email");

const User = require("../models/User");
const auth = require("../middleware/auth");
const logger = require("../utils/logger");
const rateLimiterStore = require("../middleware/rateLimiterStore");
const { logAudit } = require("../utils/auditLogger");

const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: IS_PRODUCTION ? "none" : "lax",
  maxAge: 60 * 60 * 1000, // 1 hour
  path: "/",
};

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: IS_PRODUCTION ? "none" : "lax",
  path: "/",
};

// Rate limiter for login endpoint
const loginLimiter = rateLimit({
  store: new rateLimiterStore.DistributedRateLimitStore("rl:auth:login:"),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});

// Rate limiter for MFA verification — prevents OTP brute-forcing
const verifyMfaLimiter = rateLimit({
  store: new rateLimiterStore.DistributedRateLimitStore("rl:auth:verifymfa:"),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 attempts per 5 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many verification attempts. Please try again in 5 minutes.",
  },
});

// RFC 5322 compliant email regex
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// POST /api/auth/login
router.post("/login", loginLimiter, async (req, res) => {
  if (!JWT_SECRET) {
    return res.status(500).json({ success: false, message: "Server configuration error" });
  }

  const { email, password } = req.body;

  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide a valid email address" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (user.mfaEnabled) {
      // Generate email OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.mfaOtp = otpCode;
      user.mfaOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
      await user.save();

      try {
        await emailUtils.sendMfaOtp(user.email, otpCode);
      } catch (err) {
        logger.error("Failed to send MFA OTP email:", err);
      }

      // MFA required - generate pending token
      const mfaToken = jwt.sign({ userId: user._id, type: "mfa_pending" }, JWT_SECRET, {
        expiresIn: "5m",
      });
      return res.json({
        success: true,
        mfaRequired: true,
        mfaToken,
      });
    }

    // Set full auth token
    const payload = {
      user: {
        id: user._id,
        role: user.role,
        email: user.email,
      },
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
    res.cookie("adminToken", token, COOKIE_OPTIONS);
    res.json({ success: true, token, user: payload.user });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST /api/auth/verify-mfa
router.post("/verify-mfa", verifyMfaLimiter, async (req, res) => {
  if (!JWT_SECRET) {
    return res.status(500).json({ success: false, message: "Server configuration error" });
  }

  const { mfaToken, code } = req.body;

  if (!mfaToken || !code) {
    return res.status(400).json({ success: false, message: "Token and code are required" });
  }

  try {
    const decoded = jwt.verify(mfaToken, JWT_SECRET);
    if (decoded.type !== "mfa_pending") {
      return res.status(400).json({ success: false, message: "Invalid token type" });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.mfaEnabled) {
      return res.status(400).json({ success: false, message: "MFA not enabled for user" });
    }

    let isVerified = false;

    // Check backup codes first
    if (code.length > 6) {
      const codeIndex = user.mfaBackupCodes.indexOf(code);
      if (codeIndex !== -1) {
        isVerified = true;
        // Consume backup code
        user.mfaBackupCodes.splice(codeIndex, 1);
        await user.save();
      }
    } else {
      // Check Email OTP
      if (
        user.mfaOtp &&
        user.mfaOtpExpires &&
        user.mfaOtp === code &&
        new Date() < user.mfaOtpExpires
      ) {
        isVerified = true;
        // Clear OTP code once verified
        user.mfaOtp = undefined;
        user.mfaOtpExpires = undefined;
        await user.save();
      }
    }

    if (!isVerified) {
      return res.status(401).json({ success: false, message: "Invalid verification code" });
    }

    // Set full auth token
    const payload = {
      user: {
        id: user._id,
        role: user.role,
        email: user.email,
      },
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
    res.cookie("adminToken", token, COOKIE_OPTIONS);
    res.json({ success: true, token, user: payload.user });
  } catch (error) {
    logger.error("MFA verification error:", error);
    res.status(401).json({ success: false, message: "MFA verification failed or token expired" });
  }
});

// POST /api/auth/logout
router.post("/logout", (_req, res) => {
  res.clearCookie("adminToken", CLEAR_COOKIE_OPTIONS);
  res.json({ success: true, message: "Logged out successfully" });
});

// GET /api/auth/verify - Verify token validity
router.get("/verify", (req, res) => {
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
    res.clearCookie("adminToken", CLEAR_COOKIE_OPTIONS);
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
});

/* ─── MFA Security Setup Endpoints (Protected) ─── */

router.post("/mfa/setup", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Generate email OTP for setup verification
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.mfaOtp = otpCode;
    user.mfaOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    try {
      await emailUtils.sendMfaOtp(user.email, otpCode);
    } catch (err) {
      logger.error("Failed to send MFA OTP email for setup:", err);
    }

    // Generate 8 backup codes of length 8
    const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString("hex"));

    res.json({
      success: true,
      backupCodes,
    });
  } catch (error) {
    logger.error("MFA setup error:", error);
    res.status(500).json({ success: false, message: "Failed to generate MFA setup" });
  }
});

router.post("/mfa/verify-and-enable", auth, async (req, res) => {
  const { code, backupCodes } = req.body;

  if (!code || !backupCodes || !Array.isArray(backupCodes)) {
    return res.status(400).json({ success: false, message: "Invalid verification payload" });
  }

  try {
    const user = await User.findById(req.user.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Verify Email OTP
    const isVerified =
      user.mfaOtp && user.mfaOtpExpires && user.mfaOtp === code && new Date() < user.mfaOtpExpires;
    if (!isVerified) {
      return res.status(400).json({ success: false, message: "Invalid verification code" });
    }

    user.mfaSecret = undefined; // clear old authenticator secrets if any
    user.mfaBackupCodes = backupCodes;
    user.mfaEnabled = true;
    user.mfaOtp = undefined;
    user.mfaOtpExpires = undefined;
    await user.save();

    logAudit(req, "MFA_ENABLE", "user", user._id);
    res.json({ success: true, message: "MFA enabled successfully" });
  } catch (error) {
    logger.error("MFA enable error:", error);
    res.status(500).json({ success: false, message: "Failed to enable MFA" });
  }
});

router.post("/mfa/disable", auth, async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, message: "Password is required to disable MFA" });
  }

  try {
    const user = await User.findById(req.user.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      return res.status(400).json({ success: false, message: "Incorrect password" });
    }

    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    user.mfaBackupCodes = [];
    user.mfaOtp = undefined;
    user.mfaOtpExpires = undefined;
    await user.save();

    logAudit(req, "MFA_DISABLE", "user", user._id);
    res.json({ success: true, message: "MFA disabled successfully" });
  } catch (error) {
    logger.error("MFA disable error:", error);
    res.status(500).json({ success: false, message: "Failed to disable MFA" });
  }
});

/* ─── Per-User Admin Management Endpoints (Protected) ─── */

router.get("/users", auth, async (req, res) => {
  try {
    const users = await User.find({}, "-password -mfaSecret");
    res.json({ success: true, data: users });
  } catch (error) {
    logger.error("Get users error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

router.post("/users", auth, async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide a valid email address" });
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists with this email" });
    }

    const newUser = await User.create({
      email: email.toLowerCase(),
      password, // pre-save hashes it
      name,
      role: "admin",
    });

    res.status(201).json({
      success: true,
      message: "Admin user created successfully",
      data: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
    logAudit(req, "CREATE", "user", newUser._id, { email: newUser.email, name: newUser.name });
  } catch (error) {
    logger.error("Create user error:", error);
    res.status(500).json({ success: false, message: "Failed to create user" });
  }
});

router.delete("/users/:id", auth, async (req, res) => {
  const userId = req.params.id;

  if (req.user.user.id === userId) {
    return res.status(400).json({ success: false, message: "You cannot delete your own account" });
  }

  try {
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User deleted successfully" });
    logAudit(req, "DELETE", "user", userId, { email: deletedUser.email });
  } catch (error) {
    logger.error("Delete user error:", error);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
});

router.put("/users/:id/password", auth, async (req, res) => {
  const userId = req.params.id;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res
      .status(400)
      .json({ success: false, message: "Password must be at least 8 characters long" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
    logAudit(req, "PASSWORD_CHANGE", "user", userId);
  } catch (error) {
    logger.error("Reset password error:", error);
    res.status(500).json({ success: false, message: "Failed to update password" });
  }
});

module.exports = router;
