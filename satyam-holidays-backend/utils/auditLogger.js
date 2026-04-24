const AuditLog = require("../models/AuditLog");
const logger = require("./logger");

/**
 * Log an admin audit action. Fire-and-forget — never blocks the request.
 *
 * @param {import('express').Request} req  - Express request object
 * @param {string}  action      - Action performed (e.g. "CREATE", "UPDATE", "DELETE")
 * @param {string}  resource    - Resource type (e.g. "package", "review", "enquiry", "user")
 * @param {string|null} resourceId - ID of the affected resource
 * @param {object|null} changes - Details of what changed
 */
function logAudit(req, action, resource, resourceId = null, changes = null) {
  const entry = {
    action,
    resource,
    resourceId,
    userId: req.user?._id || req.user?.id || null,
    changes,
    ipAddress: req.ip || req.connection?.remoteAddress || null,
    userAgent: req.headers?.["user-agent"] || null,
  };

  // Fire-and-forget: don't await, just log errors
  AuditLog.create(entry).catch((err) => {
    logger.error("Failed to write audit log", {
      error: err.message,
      action,
      resource,
      resourceId,
    });
  });
}

module.exports = { logAudit };
