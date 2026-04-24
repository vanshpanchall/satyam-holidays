const request = require("supertest");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-ci";
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@test.com";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "TestPass123";
jest.setTimeout(20000);
const app = require("../server");

describe("Packages API", () => {
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

  test("GET /api/packages returns a list of packages", async () => {
    const res = await request(app).get("/api/packages").send();
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test("GET /api/packages with category filter works", async () => {
    const res = await request(app).get("/api/packages?category=domestic").send();
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    if (res.body.data.length > 0) {
      expect(res.body.data[0].category).toBe("domestic");
    }
  });

  test("GET /api/packages with pagination works", async () => {
    const res = await request(app).get("/api/packages?page=1&limit=5").send();
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("pagination");
    expect(res.body.pagination).toHaveProperty("page");
    expect(res.body.pagination).toHaveProperty("totalPages");
  });

  test("GET /api/packages/stats/overview returns stats", async () => {
    const res = await request(app).get("/api/packages/stats/overview").send();
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("data");
  });

  test("GET /api/packages/:id with invalid id returns 400 or 404", async () => {
    const res = await request(app).get("/api/packages/invalid-id").send();
    expect([400, 404]).toContain(res.statusCode);
    expect(res.body.success).toBe(false);
  });

  test("POST /api/packages without CSRF returns 403", async () => {
    const res = await request(app).post("/api/packages").send({
      name: "Test Package",
      category: "domestic",
    });
    expect(res.statusCode).toBe(403);
  });

  test("POST /api/packages with CSRF but without auth returns 401", async () => {
    const res = await withCsrf(request(app).post("/api/packages")).send({
      name: "Test Package",
      category: "domestic",
    });
    expect(res.statusCode).toBe(401);
  });

  test("DELETE /api/packages/:id with CSRF but without auth returns 401", async () => {
    const res = await withCsrf(request(app).delete("/api/packages/some-id")).send();
    expect(res.statusCode).toBe(401);
  });

  test("POST /api/packages with auth creates, PUT updates, DELETE removes", async () => {
    if (!token) return;

    const payload = {
      name: `E2E Package ${Date.now()}`,
      category: "domestic",
      subcategory: "north",
      duration: "5D/4N",
      price: "₹15,000",
      location: "Test City",
      description: "Automated test package",
      image: "https://example.com/placeholder.jpg",
      rating: 4.5,
      reviews: 0,
    };

    const createRes = await withCsrf(request(app).post("/api/packages"))
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.success).toBe(true);
    const id = createRes.body.data?._id || createRes.body.data?.id;
    expect(id).toBeTruthy();

    const updateRes = await withCsrf(request(app).put(`/api/packages/${id}`))
      .set("Authorization", `Bearer ${token}`)
      .send({ ...payload, name: `${payload.name} Updated` });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data.name).toContain("Updated");

    const deleteRes = await withCsrf(request(app).delete(`/api/packages/${id}`)).set(
      "Authorization",
      `Bearer ${token}`
    );
    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });

  afterAll(async () => {
    const mongoose = require("mongoose");
    await mongoose.connection.close();
  });
});
