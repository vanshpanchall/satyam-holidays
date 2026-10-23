const request = require("supertest");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-ci";
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@test.com";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "TestPass123";
jest.setTimeout(20000);
const app = require("../server");

// Covers the package/enquiry/review features added alongside the site redesign.
describe("Redesign API additions", () => {
  let token;
  let packageId;
  const auth = (req) => req.set("Authorization", `Bearer ${token}`);

  beforeAll(async () => {
    const User = require("../models/User");
    const mongoose = require("mongoose");
    if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGODB_URI);

    const email = process.env.ADMIN_EMAIL.toLowerCase();
    if (!(await User.findOne({ email }))) {
      await User.create({
        name: "Test Admin",
        email,
        password: process.env.ADMIN_PASSWORD, // model hashes on save
        role: "admin",
        mfaEnabled: false,
      });
    }
    const login = await request(app).post("/api/auth/login").send({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    token = login.body.token;

    const created = await auth(request(app).post("/api/packages")).send({
      category: "domestic",
      subcategory: "kashmir",
      name: `Redesign Test ${Date.now()}`,
      duration: "6 Days / 5 Nights",
      price: "₹24,999 - 29,999",
      description: "Test package",
      location: "Srinagar",
      highlights: ["Shikara ride"],
      inclusions: ["Hotels"],
      itinerary: [{ day: 1, title: "Arrive", description: "Pickup", meals: ["Dinner"] }],
      availableDates: [{ startDate: "2030-05-01", endDate: "2030-05-06", capacity: 20 }],
      promotions: [{ code: "secret10", discountPercent: 10 }],
    });
    expect(created.statusCode).toBe(201);
    packageId = created.body.data._id || created.body.data.id;
  });

  afterAll(async () => {
    if (packageId) await auth(request(app).delete(`/api/packages/${packageId}`)).send();
  });

  test("stores new fields and parses the first price number only", async () => {
    const res = await auth(request(app).get(`/api/packages/${packageId}`)).send();
    expect(res.body.data.numericPrice).toBe(24999);
    expect(res.body.data.itinerary).toHaveLength(1);
    expect(res.body.data.inclusions).toEqual(["Hotels"]);
    expect(res.body.data.promotions[0].code).toBe("SECRET10");
  });

  test("public responses hide promo codes but flag live offers", async () => {
    const res = await request(app).get(`/api/packages/${packageId}`).send();
    expect(res.body.data.promotions).toBeUndefined();
    expect(res.body.data.hasOffers).toBe(true);

    const list = await request(app).get("/api/packages?limit=100").send();
    expect(list.body.data.every((p) => p.promotions === undefined)).toBe(true);
  });

  test("partial update does not reset fields it didn't send", async () => {
    const res = await auth(request(app).put(`/api/packages/${packageId}`)).send({
      isFeatured: true,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.isFeatured).toBe(true);
    expect(res.body.data.highlights).toEqual(["Shikara ride"]);
    expect(res.body.data.itinerary).toHaveLength(1);
  });

  test("drafts are hidden publicly but visible to admins", async () => {
    await auth(request(app).put(`/api/packages/${packageId}`)).send({ isActive: false });
    const pub = await request(app).get("/api/packages?limit=100").send();
    expect(pub.body.data.some((p) => String(p._id) === String(packageId))).toBe(false);
    const admin = await auth(request(app).get("/api/packages?limit=100")).send();
    expect(admin.body.data.some((p) => String(p._id) === String(packageId))).toBe(true);
  });

  test("admins can add notes and follow-up dates to an enquiry", async () => {
    const Enquiry = require("../models/Enquiry");
    const enquiry = await Enquiry.create({
      name: "CRM Test",
      email: "crm@example.com",
      phone: "9824737137",
    });

    const res = await auth(request(app).patch(`/api/enquiries/${enquiry._id}/crm`)).send({
      note: "Called back",
      followUpDate: "2030-01-01",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.adminNotes[0].text).toBe("Called back");
    expect(res.body.data.followUpDate).toContain("2030-01-01");

    const empty = await auth(request(app).patch(`/api/enquiries/${enquiry._id}/crm`)).send({});
    expect(empty.statusCode).toBe(400);
    const anon = await request(app).patch(`/api/enquiries/${enquiry._id}/crm`).send({ note: "x" });
    expect([401, 403]).toContain(anon.statusCode);
  });

  test("featured reviews never expose reviewer emails", async () => {
    const Review = require("../models/Review");
    await Review.create({
      packageId,
      name: "Happy Traveller",
      email: "private@example.com",
      rating: 5,
      comment: "Wonderful trip, very well organised.",
      status: "approved",
    });
    const res = await request(app).get("/api/reviews/featured").send();
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(JSON.stringify(res.body.data)).not.toContain("private@example.com");
  });
});
