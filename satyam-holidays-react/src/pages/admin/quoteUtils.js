import {
  PiAirplaneTilt,
  PiBed,
  PiCar,
  PiCompass,
  PiForkKnife,
  PiIdentificationCard,
  PiDotsThreeCircle,
  PiShieldCheck,
  PiUserCircle,
} from "react-icons/pi";

/** Line-item categories (must match models/Quote.js ITEM_CATEGORIES) */
export const ITEM_CATEGORIES = [
  {
    id: "hotel",
    label: "Hotel",
    plural: "Hotels",
    icon: PiBed,
    unit: "room-night",
    placeholder: "Hotel name, city",
  },
  {
    id: "transport",
    label: "Transport",
    plural: "Transport",
    icon: PiCar,
    unit: "vehicle / day",
    placeholder: "Innova Crysta, 6 days",
  },
  {
    id: "flight",
    label: "Flight / train",
    plural: "Flights & trains",
    icon: PiAirplaneTilt,
    unit: "ticket",
    placeholder: "AMD → DXB return, economy",
  },
  {
    id: "activity",
    label: "Activity",
    plural: "Sightseeing & activities",
    icon: PiCompass,
    unit: "person",
    placeholder: "Desert safari with dinner",
  },
  {
    id: "meal",
    label: "Meals",
    plural: "Meals",
    icon: PiForkKnife,
    unit: "person",
    placeholder: "Gala dinner",
  },
  {
    id: "visa",
    label: "Visa",
    plural: "Visa",
    icon: PiIdentificationCard,
    unit: "person",
    placeholder: "UAE 30-day tourist visa",
  },
  {
    id: "insurance",
    label: "Insurance",
    plural: "Insurance",
    icon: PiShieldCheck,
    unit: "person",
    placeholder: "Travel insurance",
  },
  {
    id: "guide",
    label: "Guide",
    plural: "Guide & assistance",
    icon: PiUserCircle,
    unit: "day",
    placeholder: "Local guide",
  },
  {
    id: "other",
    label: "Other",
    plural: "Other",
    icon: PiDotsThreeCircle,
    unit: "unit",
    placeholder: "Land package / misc.",
  },
];
export const categoryOf = (id) =>
  ITEM_CATEGORIES.find((c) => c.id === id) || ITEM_CATEGORIES.at(-1);

export const QUOTE_STATUS_LABELS = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
};

export const itemQuantity = (item) =>
  item.category === "hotel" && item.rooms > 0 && item.nights > 0
    ? item.rooms * item.nights
    : Number(item.quantity) || 0;

/** Same maths as Quote.computeTotals on the server: cost → + markup → − discount → + GST */
export const computeTotals = (q) => {
  const cost = (q.items || []).reduce(
    (s, i) => s + itemQuantity(i) * (Number(i.unitPrice) || 0),
    0
  );
  const markup = (cost * (Number(q.markupPercent) || 0)) / 100;
  const subtotal = cost + markup;
  const discount = Math.min(Number(q.discount) || 0, subtotal);
  const taxable = subtotal - discount;
  const tax = (taxable * (Number(q.taxPercent) || 0)) / 100;
  const total = taxable + tax;
  const travellers = Math.max(1, (Number(q.adults) || 0) + (Number(q.children) || 0));
  return {
    cost: Math.round(cost),
    markup: Math.round(markup),
    subtotal: Math.round(subtotal),
    discount: Math.round(discount),
    tax: Math.round(tax),
    total: Math.round(total),
    perPerson: Math.round(total / travellers),
    profit: Math.round(markup - discount),
    marginPercent: total ? Math.round(((markup - discount) / total) * 1000) / 10 : 0,
  };
};

export const isQuoteExpired = (q) =>
  q?.status === "sent" && q.validUntil && new Date(q.validUntil) < new Date();

export const quoteStatus = (q) => (isQuoteExpired(q) ? "expired" : q?.status);
