const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

const auth = (req, res, next) => {
  try {
    // Check HTTPOnly cookie first, then fall back to Authorization header
    const cookieToken = req.cookies?.adminToken;
    const headerToken = req.header("Authorization")?.replace("Bearer ", "");
    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({ success: false, message: "No token, authorization denied" });
    }

    if (!process.env.JWT_SECRET) {
      logger.error("JWT_SECRET is not configured");
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // Clear invalid cookie if present
    if (req.cookies?.adminToken) {
      res.clearCookie("adminToken", { path: "/" });
    }
    logger.warn("Auth token rejected", { ip: req.ip, path: req.path });
    res.status(401).json({ success: false, message: "Token is not valid" });
  }
};

module.exports = auth;
