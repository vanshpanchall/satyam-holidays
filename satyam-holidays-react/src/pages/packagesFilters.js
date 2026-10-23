import { parseNights, startingPrice } from "../utils/format";

// Budget ids match the enquiry API's `budget` enum so a search can prefill an enquiry.
export const BUDGETS = [
  { id: "under-20k", label: "Under ₹20,000", min: 0, max: 19999 },
  { id: "20k-50k", label: "₹20,000 – ₹50,000", min: 20000, max: 50000 },
  { id: "50k-1l", label: "₹50,000 – ₹1 lakh", min: 50001, max: 100000 },
  { id: "above-1l", label: "Above ₹1 lakh", min: 100001, max: Infinity },
];

export const DURATIONS = [
  { id: "short", label: "Up to 3 nights", min: 0, max: 3 },
  { id: "medium", label: "4 – 7 nights", min: 4, max: 7 },
  { id: "long", label: "8+ nights", min: 8, max: Infinity },
];

export const SORTS = [
  { id: "recommended", label: "Recommended" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "rating", label: "Top rated" },
  { id: "duration", label: "Shortest first" },
];

const haystack = (pkg) =>
  [pkg.name, pkg.location, pkg.subcategory, pkg.description, ...(pkg.highlights || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export function filterPackages(packages, { q, category, region, budget, duration, sort }) {
  const terms = String(q || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const budgetRange = BUDGETS.find((b) => b.id === budget);
  const durationRange = DURATIONS.find((d) => d.id === duration);

  const result = packages.filter((pkg) => {
    if (category && pkg.category !== category) return false;
    if (region && String(pkg.subcategory).toLowerCase() !== region.toLowerCase()) return false;
    if (terms.length) {
      const text = haystack(pkg);
      if (!terms.every((t) => text.includes(t))) return false;
    }
    if (budgetRange) {
      const price = startingPrice(pkg);
      if (price < budgetRange.min || price > budgetRange.max) return false;
    }
    if (durationRange) {
      const nights = parseNights(pkg.duration);
      if (nights < durationRange.min || nights > durationRange.max) return false;
    }
    return true;
  });

  const byPrice = (a, b) => startingPrice(a) - startingPrice(b);
  switch (sort) {
    case "price-asc":
      return result.sort(byPrice);
    case "price-desc":
      return result.sort((a, b) => byPrice(b, a));
    case "rating":
      return result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case "duration":
      return result.sort((a, b) => parseNights(a.duration) - parseNights(b.duration));
    default:
      // Featured first, then best rated
      return result.sort(
        (a, b) =>
          Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) ||
          (b.rating || 0) - (a.rating || 0)
      );
  }
}

/** Unique subcategories ("regions") present in a list, for filter chips */
export const regionsOf = (packages) =>
  Array.from(new Set(packages.map((p) => p.subcategory).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
