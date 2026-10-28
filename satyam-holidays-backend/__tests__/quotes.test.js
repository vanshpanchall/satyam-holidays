const request = require("supertest");
const jwt = require("jsonwebtoken");
process.env.NODE_ENV = "test";
process.env.CAPTCHA_ENFORCE = "false";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-ci";
jest.setTimeout(30000);
const app = require("../server");
const Enquiry = require("../models/Enquiry");
const Package = require("../models/Package");

const adminToken = jwt.sign(
  { user: { id: "admin-id-1", role: "admin", email: "admin@test.com" } },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);
const asAdmin = (req) => req.set("Authorization", `Bearer ${adminToken}`);

async function csrf() {
  const res = await request(app).get("/api/csrf-token");
  const token = res.body?.csrfToken || "";
  return { token, cookie: `csrf_token=${token}` };
}

const baseQuote = (extra = {}) => ({
  customer: { name: "Priya Panchal", phone: "+91 98765 43210", email: "priya@example.com" },
  title: "Kedarnath yatra",
  destination: "Uttarakhand",
  nights: 5,
  adults: 4,
  children: 1,
  markupPercent: 10,
  discount: 1000,
  taxPercent: 5,
  items: [
    {
      category: "hotel",
      title: "Camp Guptkashi",
      rooms: 2,
      nights: 3,
      quantity: 99,
      unitPrice: 2500,
    },
    { category: "transport", title: "Innova", quantity: 1, unitPrice: 20000 },
  ],
  ...extra,
});

describe("Quotes API", () => {
  let enquiry;

  beforeAll(async () => {
    const mongoose = require("mongoose");
    if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGODB_URI);
    enquiry = await Enquiry.create({
      name: "Priya Panchal",
      email: "priya@example.com",
      phone: "+91 98765 43210",
      destination: "chardham",
      travelers: "4",
      budget: "20k-50k",
    });
  });

  test("admin routes require auth", async () => {
    const res = await request(app).get("/api/v1/quotes");
    expect(res.statusCode).toBe(401);
  });

  test("creates a quote with server-computed totals (rooms × nights wins over quantity)", async () => {
    const res = await asAdmin(request(app).post("/api/v1/quotes")).send(baseQuote());
    expect(res.statusCode).toBe(201);
    const q = res.body.data;
    expect(q.number).toMatch(/^SH-Q-\d{4}-\d{4}$/);
    expect(q.token).toHaveLength(32);
    // hotel: 2 rooms × 3 nights × 2500 = 15000; transport 20000 → cost 35000
    expect(q.items[0].quantity).toBe(6);
    expect(q.totals).toMatchObject({
      cost: 35000,
      markup: 3500,
      subtotal: 38500,
      discount: 1000,
      tax: 1875,
      total: 39375,
      perPerson: 7875,
      profit: 2500,
    });
    expect(q.status).toBe("draft");
  });

  test("drafts are not reachable through the public link", async () => {
    const created = await asAdmin(request(app).post("/api/v1/quotes")).send(baseQuote());
    const res = await request(app).get(`/api/v1/quotes/public/${created.body.data.token}`);
    expect(res.statusCode).toBe(404);
  });

  test("sending moves the linked enquiry to quoted and logs a note", async () => {
    const created = await asAdmin(request(app).post("/api/v1/quotes")).send(
      baseQuote({ enquiry: String(enquiry._id) })
    );
    const sent = await asAdmin(
      request(app).post(`/api/v1/quotes/${created.body.data._id}/send`)
    ).send();
    expect(sent.statusCode).toBe(200);
    expect(sent.body.data.status).toBe("sent");
    expect(sent.body.data.publicUrl).toContain(`/quote/${created.body.data.token}`);

    const updated = await Enquiry.findById(enquiry._id).lean();
    expect(updated.status).toBe("quoted");
    expect(updated.statusChangedAt).toBeTruthy();
    expect(updated.adminNotes.at(-1).text).toContain(created.body.data.number);
  });

  test("public view hides costs and margin, counts views, and accepts once", async () => {
    const created = await asAdmin(request(app).post("/api/v1/quotes")).send(
      baseQuote({ enquiry: String(enquiry._id) })
    );
    const { _id, token } = created.body.data;
    await asAdmin(request(app).post(`/api/v1/quotes/${_id}/send`)).send();

    const pub = await request(app).get(`/api/v1/quotes/public/${token}`);
    expect(pub.statusCode).toBe(200);
    const body = JSON.stringify(pub.body.data);
    expect(body).not.toMatch(/unitPrice|markup|profit|"cost"/);
    expect(pub.body.data.totals.total).toBe(39375);
    expect(pub.body.data.items[0]).not.toHaveProperty("amount"); // showItemPrices is off

    await request(app).get(`/api/v1/quotes/public/${token}?preview=1`); // admin preview: not counted
    const admin = await asAdmin(request(app).get(`/api/v1/quotes/${_id}`));
    expect(admin.body.data.viewCount).toBe(1);

    const { token: csrfToken, cookie } = await csrf();
    const accept = await request(app)
      .post(`/api/v1/quotes/public/${token}/respond`)
      .set("x-csrf-token", csrfToken)
      .set("Cookie", cookie)
      .send({ action: "accept", note: "Looks great" });
    expect(accept.statusCode).toBe(200);
    expect(accept.body.data.status).toBe("accepted");

    const again = await request(app)
      .post(`/api/v1/quotes/public/${token}/respond`)
      .set("x-csrf-token", csrfToken)
      .set("Cookie", cookie)
      .send({ action: "decline" });
    expect(again.statusCode).toBe(409);

    const lead = await Enquiry.findById(enquiry._id).lean();
    expect(lead.adminNotes.at(-1).author).toBe("customer");
  });

  test("item prices include the margin when shown to the customer", async () => {
    const created = await asAdmin(request(app).post("/api/v1/quotes")).send(
      baseQuote({ showItemPrices: true })
    );
    await asAdmin(request(app).post(`/api/v1/quotes/${created.body.data._id}/send`)).send();
    const pub = await request(app).get(`/api/v1/quotes/public/${created.body.data.token}`);
    expect(pub.body.data.items[1].amount).toBe(22000); // 20000 + 10%
  });

  test("quote PDF is a real PDF", async () => {
    const created = await asAdmin(request(app).post("/api/v1/quotes")).send(baseQuote());
    const res = await asAdmin(request(app).get(`/api/v1/quotes/${created.body.data._id}/pdf`))
      .buffer(true)
      .parse((r, cb) => {
        const chunks = [];
        r.on("data", (c) => chunks.push(c));
        r.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.body.slice(0, 5).toString()).toBe("%PDF-");
  });

  test("package itinerary PDF is public", async () => {
    await Package.create({
      category: "domestic",
      subcategory: "Chardham",
      name: "Kedarnath Test Trip",
      slug: "kedarnath-test-trip",
      duration: "6 Days / 5 Nights",
      price: "₹15,999",
      numericPrice: 15999,
      description: "Test",
      location: "Uttarakhand",
      itinerary: [{ day: 1, title: "Ahmedabad → Haridwar ✅", description: "Drive" }],
    });
    const res = await request(app)
      .get("/api/v1/packages/slug/kedarnath-test-trip/itinerary.pdf")
      .buffer(true)
      .parse((r, cb) => {
        const chunks = [];
        r.on("data", (c) => chunks.push(c));
        r.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-disposition"]).toContain("kedarnath-test-trip-itinerary.pdf");
    expect(res.body.slice(0, 5).toString()).toBe("%PDF-");
  });

  test("status endpoint accepts the new quoted stage and records respondedAt", async () => {
    const lead = await Enquiry.create({
      name: "Raj",
      phone: "9876543210",
      email: "raj@example.com",
    });
    const res = await asAdmin(request(app).patch(`/api/v1/enquiries/${lead._id}/status`)).send({
      status: "quoted",
    });
    expect(res.statusCode).toBe(200);
    const saved = await Enquiry.findById(lead._id).lean();
    expect(saved.status).toBe("quoted");
    expect(saved.respondedAt).toBeTruthy();
  });
});
