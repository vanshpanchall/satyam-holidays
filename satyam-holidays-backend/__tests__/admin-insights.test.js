const request = require("supertest");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-ci";
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@test.com";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "TestPass123";
jest.setTimeout(30000);
const app = require("../server");

// Dashboard / CRM report / review moderation / Google reviews endpoints added with the admin rebuild.
describe("Admin insights API", () => {
  let token;
  let packageId;
  const auth = (req) => req.set("Authorization", `Bearer ${token}`);

  beforeAll(async () => {
    const mongoose = require("mongoose");
    const User = require("../models/User");
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
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
    token = login.body.token;
    expect(token).toBeTruthy();

    const pkg = await auth(request(app).post("/api/packages")).send({
      category: "domestic",
      subcategory: "kerala",
      name: `Insights Test ${Date.now()}`,
      duration: "5 Days / 4 Nights",
      price: "₹19,999",
      description: "Test package",
      location: "Munnar",
      rating: 3,
      reviews: 99,
    });
    packageId = pkg.body.data._id || pkg.body.data.id;
  });

  afterAll(async () => {
    if (packageId) await auth(request(app).delete(`/api/packages/${packageId}`)).send();
  });

  test("admin can log a phone lead without email and it shows in the CRM report", async () => {
    const res = await auth(request(app).post("/api/enquiries/manual")).send({
      name: "Walk In Guest",
      phone: "9824737137",
      destination: "kashmir",
      budget: "50k-1l",
      travelers: "4",
      source: "walk-in",
      note: "Came to the office",
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.source).toBe("walk-in");
    expect(res.body.data.adminNotes[0].text).toBe("Came to the office");

    const report = await auth(request(app).get("/api/crm/report?days=30")).send();
    expect(report.statusCode).toBe(200);
    const d = report.body.data;
    expect(d.kpis.enquiries).toBeGreaterThan(0);
    expect(d.previous).toBeTruthy();
    expect(d.series.unit).toBe("day");
    expect(d.series.points.length).toBeGreaterThanOrEqual(30);
    expect(d.bySource.some((s) => s.key === "walk-in")).toBe(true);
    expect(d.funnel[0].stage).toBe("Enquiries");
  });

  test("manual leads require auth; public form rejects staff-only sources", async () => {
    const anon = await request(app)
      .post("/api/enquiries/manual")
      .send({ name: "X", phone: "9999999999" });
    expect([401, 403]).toContain(anon.statusCode);
  });

  test("dashboard summary returns KPIs, series and attention lists", async () => {
    const res = await auth(request(app).get("/api/crm/dashboard")).send();
    expect(res.statusCode).toBe(200);
    const d = res.body.data;
    expect(d.kpis).toHaveProperty("newThisWeek");
    expect(d.series.points).toHaveLength(31);
    expect(Array.isArray(d.attention.followUps)).toBe(true);
    expect(d.packages.total).toBeGreaterThan(0);
  });

  test("review moderation: stats, bulk approve syncs package rating, reply shows publicly", async () => {
    const Review = require("../models/Review");
    const [a, b] = await Review.create([
      {
        packageId,
        name: "Asha",
        email: "a@example.com",
        rating: 5,
        comment: "Lovely houseboat stay.",
        status: "pending",
      },
      {
        packageId,
        name: "Ravi",
        email: "r@example.com",
        rating: 4,
        comment: "Good driver and hotels.",
        status: "pending",
      },
    ]);

    const stats = await auth(request(app).get("/api/reviews/admin/stats")).send();
    expect(stats.body.data.counts.pending).toBeGreaterThanOrEqual(2);

    const bulk = await auth(request(app).put("/api/reviews/bulk/status")).send({
      ids: [a._id, b._id],
      status: "approved",
    });
    expect(bulk.statusCode).toBe(200);
    expect(bulk.body.data.updated).toBe(2);

    const pkg = await auth(request(app).get(`/api/packages/${packageId}`)).send();
    expect(pkg.body.data.rating).toBe(4.5);
    expect(pkg.body.data.reviews).toBe(2);

    const reply = await auth(request(app).patch(`/api/reviews/${a._id}/reply`)).send({
      text: "Thank you, Asha!",
    });
    expect(reply.statusCode).toBe(200);

    const pub = await request(app).get(`/api/reviews/package/${packageId}`).send();
    const reviews = pub.body.data.reviews;
    const replied = reviews.find((r) => String(r.id) === String(a._id));
    expect(replied.adminReply.text).toBe("Thank you, Asha!");

    const search = await auth(request(app).get("/api/reviews?q=houseboat")).send();
    expect(search.body.data.some((r) => String(r._id) === String(a._id))).toBe(true);
  });

  test("Google reviews report not configured without a Place ID / API key", async () => {
    const res = await request(app).get("/api/reviews/google").send();
    expect(res.statusCode).toBe(200);
    expect(res.body.data.configured).toBe(false);
  });

  test("Google reviews are mapped and cached when configured", async () => {
    const settingService = require("../services/settingService");
    const service = require("../services/googleReviewsService");
    await settingService.upsert("google.placeId", "ChIJtest123");
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
    const realFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        displayName: { text: "Satyam Holidays" },
        rating: 4.8,
        userRatingCount: 120,
        googleMapsUri: "https://maps.google.com/?cid=1",
        reviews: [
          {
            name: "places/x/reviews/1",
            rating: 5,
            text: { text: "Great service" },
            relativePublishTimeDescription: "a month ago",
            authorAttribution: {
              displayName: "Meera",
              uri: "https://maps.google.com/u/1",
              photoUri: "https://lh3.googleusercontent.com/a",
            },
          },
        ],
      }),
    });
    try {
      const data = await service.getReviews({ force: true });
      expect(data.configured).toBe(true);
      expect(data.rating).toBe(4.8);
      expect(data.reviews[0].author.name).toBe("Meera");
      expect(data.writeReviewUrl).toContain("ChIJtest123");
      expect(global.fetch.mock.calls[0][1].headers["X-Goog-Api-Key"]).toBe("test-key");

      await service.getReviews(); // served from cache
      expect(global.fetch).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = realFetch;
      delete process.env.GOOGLE_PLACES_API_KEY;
      await settingService.upsert("google.placeId", "");
    }
  });
});
