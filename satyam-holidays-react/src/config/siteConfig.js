import { toast } from "react-toastify";
import { getCsrfToken, refreshCsrfToken } from "../utils/csrf";

// Central site configuration for easy customization
// Update values here and the UI will reflect across the site.

const siteConfig = {
  company: {
    name: "Satyam Holidays",
    tagline: "Journey With Joy!",
    logo: "/satyam-logo.svg", // placed under public/
    address: {
      line1: "56, Uttar Gujarat Panchal Society",
      line2: "Ranip, Ahmedabad, Gujarat",
      country: "India",
    },
    email: "satyamholidays19@gmail.com",
    phones: ["+91 98247 37137", "+91 94265 86003"],
    emergencyPhone: "+91 98247 37137",
    emergencyEmail: "emergency@satyamholidays.com",
    whatsapp: "+91 98247 37137",
    hours: {
      weekdays: "Monday - Friday: 9:00 AM - 7:00 PM",
      saturday: "Saturday: 9:00 AM - 5:00 PM",
      sunday: "Sunday: 10:00 AM - 4:00 PM",
    },
  },
  social: {
    facebook: "https://facebook.com/satyamholidays",
    instagram: "https://instagram.com/satyamholidays",
    twitter: "https://twitter.com/satyamholidays",
    // Will build WhatsApp link from company.whatsapp
  },
  features: {
    whatsappEnabled:
      (process.env.REACT_APP_WHATSAPP_ENABLE ||
        process.env.NEXT_PUBLIC_WHATSAPP_ENABLE ||
        "false") === "true",
  },
  brand: {
    primaryColor: "#f59e0b",
  },
  api: {
    // Frontend will talk to this API base. In production, set REACT_APP_API_BASE.
    baseUrl:
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
        ? "" // Relative URL in production (proxied via Vercel rewrites)
        : process.env.REACT_APP_API_BASE ||
          process.env.NEXT_PUBLIC_API_BASE ||
          "http://localhost:5000",
  },
};

// Helpers
export const toWhatsAppLink = (phone) => {
  const digits = String(phone).replace(/\D/g, "");
  return `https://wa.me/${digits}`;
};

export default siteConfig;

// API version prefix
const API_VERSION = "/api/v1";

// Small helper to build API URLs consistently
export const apiUrl = (path = "") => {
  const base = siteConfig.api.baseUrl.replace(/\/$/, "");
  let p = String(path || "").startsWith("/") ? path : `/${path || ""}`;

  // Add version prefix if not already present and path starts with /api
  if (p.startsWith("/api/") && !p.startsWith("/api/v1/")) {
    p = p.replace("/api/", `${API_VERSION}/`);
  }

  return `${base}${p}`;
};

// Get admin token from localStorage (fallback for cross-domain cookie blocking in production)
const getAdminToken = () => {
  try {
    return localStorage.getItem("adminToken") || "";
  } catch (e) {
    return "";
  }
};

// Add CSRF token to headers for state-changing requests
const withCsrfHeaders = (headers = {}, method = "GET") => {
  const stateChangingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (stateChangingMethods.includes(method.toUpperCase())) {
    const token = getCsrfToken();
    if (token) {
      return { ...headers, "x-csrf-token": token };
    }
  }
  return headers;
};

const withAuthHeaders = (headers = {}) => {
  const token = getAdminToken();
  if (!token) return headers;
  if (headers.Authorization || headers.authorization) return headers;
  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
};

export const fetchWithAuth = async (url, options = {}) => {
  const method = options.method || "GET";

  // Ensure CSRF token is fetched/refreshed for state-changing requests if not present
  const stateChangingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (stateChangingMethods.includes(method.toUpperCase())) {
    const token = getCsrfToken();
    if (!token) {
      await refreshCsrfToken();
    }
  }

  const csrfHeaders = withCsrfHeaders(options.headers || {}, method);
  const headers = withAuthHeaders(csrfHeaders);

  // Include credentials for HTTPOnly cookie authentication
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Important: sends cookies with requests
  });

  if (response.status === 401) {
    // Redirect to login if on admin page
    if (
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/admin") &&
      !window.location.pathname.includes("/login")
    ) {
      window.location.href = "/admin/login";
    }
    return new Response(JSON.stringify({ success: false, message: "Session expired" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return response;
};

// Safe JSON parser — prevents crashes when API returns non-JSON (e.g., rate limit plain text)
export const safeJson = async (response) => {
  try {
    const text = await response.text();
    return JSON.parse(text);
  } catch {
    return { success: false, message: "Unexpected server response" };
  }
};

// Resolve image URL — handles relative /uploads/ paths, Cloudinary URLs, and external URLs.
// External URLs are proxied through Cloudinary's fetch delivery type for CDN caching,
// format/quality optimization, and to eliminate direct external image request failures.
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "dfoznqeww";

export const resolveImageUrl = (imageUrl) => {
  if (!imageUrl) return "";
  // Relative upload path → resolve against API base
  if (imageUrl.startsWith("/uploads")) return apiUrl(imageUrl);
  // Already a Cloudinary URL → return as-is
  if (imageUrl.includes("cloudinary.com")) return imageUrl;
  // Absolute external URL → proxy through Cloudinary fetch for CDN + optimization
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/w_800,q_auto,f_auto/${imageUrl}`;
  }
  return imageUrl;
};

// Unified professional toast error messaging helper
export const toastApiError = (errorObj, fallback = "An error occurred") => {
  let msg = fallback;
  if (errorObj) {
    if (typeof errorObj === "string") {
      msg = errorObj;
    } else if (errorObj.message) {
      msg = errorObj.message;
      if (errorObj.errors && Array.isArray(errorObj.errors)) {
        const details = errorObj.errors.map((e) => e.message || e).join(", ");
        if (details) msg = `${msg}: ${details}`;
      }
    } else if (errorObj.error) {
      msg = errorObj.error;
    } else if (errorObj.err) {
      msg = errorObj.err.message || errorObj.err;
    }
  }
  toast.error(msg, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};
