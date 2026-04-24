const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: IS_PRODUCTION ? "none" : "lax",
  maxAge: 60 * 60 * 1000, // 1 hour
  path: "/",
};

const auth = (req, res, next) => {
  try {
    // Check HTTPOnly cookie first, then fall back to Authorization header
    const cookieToken = req.cookies?.adminToken;
    const headerToken = req.header("Authorization")?.replace("Bearer ", "");
    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({ success: false, message: "No token, authorization denied" });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error("JWT_SECRET is not configured");
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }

    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;

    // Token rotation for cookie auth (automatically rotates the user session cookie)
    if (cookieToken && decoded.user) {
      const payload = {
        user: {
          id: decoded.user.id,
          role: decoded.user.role,
          email: decoded.user.email,
        },
      };
      const newToken = jwt.sign(payload, jwtSecret, { expiresIn: "1h" });
      res.cookie("adminToken", newToken, COOKIE_OPTIONS);
    }

    next();
  } catch (err) {
    // Clear invalid cookie if present
    if (req.cookies?.adminToken) {
      res.clearCookie("adminToken", {
        path: "/",
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: IS_PRODUCTION ? "none" : "lax",
      });
    }
    logger.warn("Auth token rejected", { ip: req.ip, path: req.path });
    res.status(401).json({ success: false, message: "Token is not valid" });
  }
};

module.exports = auth;
