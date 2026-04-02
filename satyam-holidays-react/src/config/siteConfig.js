// Central site configuration for easy customization
// Update values here and the UI will reflect across the site.

const siteConfig = {
  company: {
    name: "Satyam Holidays",
    tagline: "Journey With Joy!",
    logo: "/satyam-logo.svg", // placed under public/
    address: {
      line1: "10-A/28, Rupal Apartment, Radhaswami Road",
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
      process.env.REACT_APP_API_BASE || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000",
  },
};

// Helpers
export const toWhatsAppLink = (phone) => {
  const digits = String(phone).replace(/\D/g, "");
  return `https://wa.me/${digits}`;
};

export default siteConfig;

// Small helper to build API URLs consistently
export const apiUrl = (path = "") => {
  const base = siteConfig.api.baseUrl.replace(/\/$/, "");
  const p = String(path || "").startsWith("/") ? path : `/${path || ""}`;
  return `${base}${p}`;
};

export const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem("adminToken");
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    localStorage.removeItem("adminToken");
    // Return a fake response so components handle it gracefully instead of crashing
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

// Resolve image URL — handles both relative /uploads/ paths and absolute URLs
export const resolveImageUrl = (imageUrl) => {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("/uploads")) return apiUrl(imageUrl);
  return imageUrl;
};
