const { createEmailTemplates, htmlToText, parseMessage } = require("../utils/emailTemplates");

const brand = {
  NAME: "Satyam Holidays",
  TAGLINE: "Journey With Joy!",
  LOGO_URL: "",
  PHONE: "+91 98247 37137",
  EMAIL: "team@example.com",
  SITE: "https://example.com",
  WHATSAPP: "919824737137",
  ADDRESS: "Ranip, Ahmedabad",
  HIGHLIGHTS: [{ title: "One planner", text: "Start to finish." }],
};
const templates = createEmailTemplates(brand);

const enquiry = {
  _id: "6719f1c2a4b5c6d7e8f90a1b",
  name: 'Ravi <script>alert("x")</script> & Sons',
  email: "ravi@example.com",
  phone: "+91 98765 43210",
  destination: "kashmir",
  travelers: "4",
  budget: "50k-1l",
  leadScore: 95,
  message:
    "Need veg food\n\n[Inquired via Package Page: Kashmir Paradise]\n- Estimated total: INR 131996",
  createdAt: new Date(),
};

describe("email templates", () => {
  test.each([
    ["enquiry-confirmation", { name: enquiry.name, enquiryId: enquiry._id, enquiry }],
    ["enquiry-notification", { enquiry }],
    ["mfa-otp", { code: "482913" }],
    ["enquiry-nudge", { name: "Ravi", destination: "kashmir" }],
    ["referral-code", { code: "RAVI5" }],
  ])("%s renders html, text and a plain subject", (name, data) => {
    const out = templates[name](data);
    expect(out.html).toContain("<!DOCTYPE html>");
    expect(out.html).toContain("Satyam Holidays");
    expect(out.text.length).toBeGreaterThan(50);
    // Our markup is stripped (user-typed text is kept verbatim; text/plain is never rendered)
    expect(out.text).not.toMatch(/<(table|tr|td|p|a|div|span|h1|img)\b/i);
    expect(out.subject).not.toMatch(/&amp;|&lt;|[\r\n]/);
    expect(out.html).not.toMatch(/linear-gradient|\.svg/); // unsupported in Gmail/Outlook
  });

  test("user input is escaped in HTML but subjects stay readable", () => {
    const out = templates["enquiry-notification"]({ enquiry });
    expect(out.html).not.toContain("<script>");
    expect(out.html).toContain("&lt;script&gt;");
    expect(out.subject).toContain("& Sons");
    expect(out.html).toContain("/admin/enquiries?id=6719f1c2a4b5c6d7e8f90a1b");
    expect(out.html).toContain("₹1,31,996");
  });

  test("confirmation shows a short reference and the package", () => {
    const out = templates["enquiry-confirmation"]({
      name: "Ravi",
      enquiryId: enquiry._id,
      enquiry,
    });
    expect(out.subject).toContain("#F90A1B");
    expect(out.html).toContain("Kashmir Paradise");
  });

  test("nudge copes with a missing destination", () => {
    const out = templates["enquiry-nudge"]({ name: "Ravi" });
    expect(out.subject).toBe("Still planning your trip?");
  });

  test("parseMessage splits the package-page metadata", () => {
    const p = parseMessage(enquiry.message);
    expect(p.comment).toBe("Need veg food");
    expect(p.packageName).toBe("Kashmir Paradise");
    expect(p.details[0][1]).toBe("₹1,31,996");
  });

  test("htmlToText keeps link targets", () => {
    expect(htmlToText('<p><a href="https://x.test">Open</a></p>')).toBe("Open (https://x.test)");
  });
});
