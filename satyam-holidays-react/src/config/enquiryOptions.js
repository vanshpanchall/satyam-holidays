// Values must match the enquiry API's `destination` enum
export const DESTINATIONS = [
  { value: "chardham", label: "Chardham Yatra" },
  { value: "kashmir", label: "Jammu & Kashmir" },
  { value: "andaman", label: "Andaman & Nicobar" },
  { value: "domestic", label: "Elsewhere in India" },
  { value: "dubai", label: "Dubai" },
  { value: "singapore", label: "Singapore" },
  { value: "thailand", label: "Thailand" },
  { value: "vietnam", label: "Vietnam" },
  { value: "nepal", label: "Nepal" },
  { value: "international", label: "Elsewhere abroad" },
  { value: "custom", label: "Not sure yet" },
];

// Lead channels (must match WEB_SOURCES / MANUAL_SOURCES in the enquiries route)
export const MANUAL_SOURCES = [
  { value: "phone", label: "Phone call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "walk-in", label: "Walk-in" },
  { value: "referral", label: "Referral" },
  { value: "social", label: "Social media" },
  { value: "other", label: "Other" },
];
