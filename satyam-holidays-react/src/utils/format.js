import { resolveImageUrl } from "../config/siteConfig";

const inrFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export const formatINR = (value) => `₹${inrFormatter.format(Math.max(0, Number(value) || 0))}`;

/** "₹25,999 - 30,000" → 25999 (first number only) */
export const parsePrice = (price) => {
  const match = String(price || "").match(/\d[\d,]*/);
  return match ? parseInt(match[0].replace(/,/g, ""), 10) : 0;
};

export const startingPrice = (pkg) => pkg?.numericPrice || parsePrice(pkg?.price);

/** "6 Days / 5 Nights" → 5, "4 Days" → 3 */
export const parseNights = (duration) => {
  const text = String(duration || "");
  const nights = text.match(/(\d+)\s*N/i);
  if (nights) return parseInt(nights[1], 10);
  const days = text.match(/(\d+)\s*D/i);
  return days ? Math.max(1, parseInt(days[1], 10) - 1) : 0;
};

export const pkgId = (pkg) => String(pkg?._id || pkg?.id || "");
export const pkgHref = (pkg) => `/packages/${pkg?.slug || pkgId(pkg)}`;

/**
 * Size-aware image URL. Unsplash and Cloudinary get resized server-side;
 * anything else goes through the existing resolver.
 */
export const imageUrl = (url, width = 1200) => {
  if (!url) return "";
  if (url.includes("images.unsplash.com")) {
    const base = url.split("?")[0];
    return `${base}?w=${width}&q=72&auto=format&fit=crop`;
  }
  if (
    url.includes("res.cloudinary.com") &&
    url.includes("/upload/") &&
    !url.includes("/upload/w_")
  ) {
    return url.replace("/upload/", `/upload/w_${width},q_auto,f_auto/`);
  }
  return resolveImageUrl(url);
};

/** Splits "Planned like *family.*" into [{text, accent}] segments for headline styling */
export const splitAccent = (text) =>
  String(text || "")
    .split(/(\*[^*]+\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("*") && part.endsWith("*")
        ? { text: part.slice(1, -1), accent: true }
        : { text: part, accent: false }
    );

export const toTel = (phone) => `tel:${String(phone || "").replace(/[^\d+]/g, "")}`;

export const toWhatsApp = (phone, message) => {
  const digits = String(phone || "").replace(/\D/g, "");
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
};

export const asArray = (value) => (Array.isArray(value) ? value : []);
