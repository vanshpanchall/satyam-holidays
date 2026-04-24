const request = require("supertest");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-ci";
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@test.com";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "TestPass123";
jest.setTimeout(20000);
const app = require("../server");

describe("Settings API", () => {
  let token;
  let csrfToken;
  let csrfCookie;

  const withCsrf = (req) => req.set("Cookie", csrfCookie).set("x-csrf-token", csrfToken);

  beforeAll(async () => {
    const User = require("../models/User");
    const bcrypt = require("bcryptjs");
    const mongoose = require("mongoose");

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    const email = process.env.ADMIN_EMAIL.toLowerCase();
    let user = await User.findOne({ email });
    if (!user) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      await User.create({
        name: "Test Admin",
        email,
        password: hashedPassword,
        role: "admin",
        mfaEnabled: false,
      });
    }

    const csrfRes = await request(app).get("/api/csrf-token").send();
    csrfToken = csrfRes.body?.csrfToken;
    csrfCookie = `csrf_token=${csrfToken}`;

    const loginRes = await request(app).post("/api/auth/login").send({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    token = loginRes.body.token;
  });

  test("GET /api/settings returns settings object", async () => {
    const res = await request(app).get("/api/settings");
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("data");
    expect(typeof res.body.data).toBe("object");
    // Should have default keys (dot-notation keys are literal, not nested paths)
    expect(res.body.data["company.name"]).toBeDefined();
    expect(res.body.data["hero.stats"]).toBeDefined();
  });

  test("PUT /api/settings without CSRF returns 403", async () => {
    const res = await request(app).put("/api/settings").send({ "company.name": "Test Name" });
    expect(res.statusCode).toBe(403);
  });

  test("PUT /api/settings with CSRF but without auth returns 401", async () => {
    const res = await withCsrf(request(app).put("/api/settings")).send({
      "company.name": "Test Name",
    });
    expect(res.statusCode).toBe(401);
  });

  test("PUT /api/settings with auth updates settings", async () => {
    if (!token) return; // skip if login failed (CI without DB)

    const res = await withCsrf(request(app).put("/api/settings"))
      .set("Authorization", `Bearer ${token}`)
      .send({ "company.name": "Test Travel Co" });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data["company.name"]).toBe("Test Travel Co");
  });

  test("PUT /api/settings rejects invalid payload", async () => {
    if (!token) return;

    // Send an array instead of object (invalid)
    const res = await withCsrf(request(app).put("/api/settings"))
      .set("Authorization", `Bearer ${token}`)
      .set("Content-Type", "application/json")
      .send([1, 2, 3]);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("PUT /api/settings sanitizes malformed setting value types", async () => {
    if (!token) return;

    const res = await withCsrf(request(app).put("/api/settings"))
      .set("Authorization", `Bearer ${token}`)
      .send({
        "company.name": { bad: true },
        "hero.stats": "not-an-array",
        "company.phones": "not-an-array",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data["company.name"]).toBe("string");
    expect(Array.isArray(res.body.data["hero.stats"])).toBe(true);
    expect(Array.isArray(res.body.data["company.phones"])).toBe(true);
  });

  afterAll(async () => {
    const mongoose = require("mongoose");
    await mongoose.connection.close();
  });
});
