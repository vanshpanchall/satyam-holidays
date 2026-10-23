import { formatINR, parsePrice, parseNights, splitAccent, toWhatsApp, imageUrl } from "../format";

describe("format utils", () => {
  it("parses only the first number of a price range", () => {
    expect(parsePrice("₹25,999")).toBe(25999);
    expect(parsePrice("₹25,999 - 30,000 per person")).toBe(25999);
    expect(parsePrice("")).toBe(0);
  });

  it("formats rupees in Indian grouping", () => {
    expect(formatINR(125000)).toBe("₹1,25,000");
    expect(formatINR(-5)).toBe("₹0");
  });

  it("derives nights from duration strings", () => {
    expect(parseNights("6 Days / 5 Nights")).toBe(5);
    expect(parseNights("4 Days")).toBe(3);
    expect(parseNights("weekend")).toBe(0);
  });

  it("splits *accent* words for headline styling", () => {
    expect(splitAccent("Plan *like family.*")).toEqual([
      { text: "Plan ", accent: false },
      { text: "like family.", accent: true },
    ]);
  });

  it("builds a WhatsApp link with an encoded message", () => {
    expect(toWhatsApp("+91 98247 37137", "Hi there")).toBe(
      "https://wa.me/919824737137?text=Hi%20there"
    );
  });

  it("resizes Unsplash URLs", () => {
    expect(imageUrl("https://images.unsplash.com/photo-1?w=10", 800)).toContain("w=800");
  });
});
