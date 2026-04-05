/**
 * Shared validation utilities
 */

// RFC 5322 compliant email regex
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Phone validation patterns for different formats
const PHONE_PATTERNS = {
  // International format with country code
  international: /^\+[1-9]\d{6,14}$/,
  // Indian mobile numbers (10 digits starting with 6-9)
  indian: /^[6-9]\d{9}$/,
  // Generic format: 10-15 digits with optional + prefix
  generic: /^\+?\d{10,15}$/,
};

// Combined phone regex for basic validation
const PHONE_REGEX = /^\+?[6-9]?\d{9,14}$/;

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validate phone number with stricter rules
 * @param {string} phone
 * @param {string} format - 'international', 'indian', or 'generic'
 * @returns {boolean}
 */
function isValidPhone(phone, format = "generic") {
  if (!phone || typeof phone !== "string") return false;
  const cleaned = sanitizePhone(phone);

  switch (format) {
    case "international":
      return PHONE_PATTERNS.international.test(cleaned);
    case "indian": {
      // Strip country code for Indian validation
      const indianNumber = cleaned.replace(/^\+91/, "");
      return PHONE_PATTERNS.indian.test(indianNumber);
    }
    case "generic":
    default:
      return PHONE_PATTERNS.generic.test(cleaned);
  }
}

/**
 * Sanitize phone number - keep only digits and leading +
 * @param {string} phone
 * @returns {string}
 */
function sanitizePhone(phone) {
  if (!phone) return "";
  const cleaned = String(phone).replace(/[^\d+]/g, "");
  // Ensure + is only at the start
  if (cleaned.includes("+")) {
    return "+" + cleaned.replace(/\+/g, "");
  }
  return cleaned;
}

/**
 * Format phone number for display
 * @param {string} phone
 * @returns {string}
 */
function formatPhone(phone) {
  const cleaned = sanitizePhone(phone);
  if (!cleaned) return "";

  // Indian format: +91 98247 37137
  if (cleaned.startsWith("+91") && cleaned.length === 13) {
    return `+91 ${cleaned.slice(3, 8)} ${cleaned.slice(8)}`;
  }
  // Indian without country code
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return cleaned;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitize user input for safe display (trim and limit length)
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
function sanitizeInput(str, maxLength = 1000) {
  if (!str || typeof str !== "string") return "";
  return str.trim().slice(0, maxLength);
}

module.exports = {
  EMAIL_REGEX,
  PHONE_REGEX,
  PHONE_PATTERNS,
  isValidEmail,
  isValidPhone,
  sanitizePhone,
  formatPhone,
  escapeHtml,
  sanitizeInput,
};
