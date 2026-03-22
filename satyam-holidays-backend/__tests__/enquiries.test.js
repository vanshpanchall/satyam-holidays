const request = require("supertest");
const jwt = require("jsonwebtoken");
process.env.NODE_ENV = "test";
process.env.CAPTCHA_ENFORCE = "false";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-ci";
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@test.com";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "TestPass123";
jest.setTimeout(20000);
const app = require("../server");

// Generate a valid admin token for auth-protected routes
const adminToken = jwt.sign(
  { user: { id: "admin-id-1", role: "admin", email: "admin@test.com" } },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);

describe("Enquiries API", () => {
  test("POST /api/enquiries creates an enquiry", async () => {
    const res = await request(app).post("/api/enquiries").send({
      name: "Test User",
      email: "test@example.com",
      phone: "+1 555-555-5555",
      destination: "custom",
      travelers: "2",
      budget: "20k-50k",
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("id");
  });

  test("GET /api/enquiries returns a paginated list", async () => {
    const res = await request(app)
      .get("/api/enquiries?limit=5&page=1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send();
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("pagination");
  });

  test("POST /api/enquiries invalid payload returns 400", async () => {
    const res = await request(app).post("/api/enquiries").send({ email: "bad", phone: "x" });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("GET /api/enquiries/export/excel with no data returns 404", async () => {
    const today = new Date().toISOString().split("T")[0];
    const res = await request(app)
      .get(`/api/enquiries/export/excel?startDate=${today}&endDate=${today}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send();
    expect([404, 200]).toContain(res.statusCode);
    if (res.statusCode === 404) {
      expect(res.body.success).toBe(false);
    } else {
      // if data happened to exist, content-type should be excel
      expect(res.headers["content-type"]).toContain(
        "application/vnd.openxmlformats-officedocument"
      );
    }
  });

  test("GET /api/enquiries without auth returns 401", async () => {
    const res = await request(app).get("/api/enquiries").send();
    expect(res.statusCode).toBe(401);
  });
});
