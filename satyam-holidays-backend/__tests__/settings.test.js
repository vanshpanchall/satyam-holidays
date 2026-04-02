const request = require("supertest");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-ci";
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@test.com";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "TestPass123";
jest.setTimeout(20000);
const app = require("../server");

describe("Settings API", () => {
  let token;

  beforeAll(async () => {
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

  test("PUT /api/settings without auth returns 401", async () => {
    const res = await request(app).put("/api/settings").send({ "company.name": "Test Name" });
    expect(res.statusCode).toBe(401);
  });

  test("PUT /api/settings with auth updates settings", async () => {
    if (!token) return; // skip if login failed (CI without DB)

    const res = await request(app)
      .put("/api/settings")
      .set("Authorization", `Bearer ${token}`)
      .send({ "company.name": "Test Travel Co" });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data["company.name"]).toBe("Test Travel Co");
  });

  test("PUT /api/settings rejects invalid payload", async () => {
    if (!token) return;

    // Send an array instead of object (invalid)
    const res = await request(app)
      .put("/api/settings")
      .set("Authorization", `Bearer ${token}`)
      .set("Content-Type", "application/json")
      .send([1, 2, 3]);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
