const request = require("supertest");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-ci";
jest.setTimeout(20000);
const app = require("../server");

describe("Health & Root API", () => {
  test("GET /api/health returns health status", async () => {
    const res = await request(app).get("/api/health").send();
    expect(res.statusCode).toBeGreaterThanOrEqual(200);
    expect(res.statusCode).toBeLessThan(600);
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body).toHaveProperty("uptime");
  });

  test("GET / returns welcome message", async () => {
    const res = await request(app).get("/").send();
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toContain("Satyam Holidays");
    expect(res.body).toHaveProperty("endpoints");
  });

  test("GET /invalid-route returns 404", async () => {
    const res = await request(app).get("/this-route-does-not-exist").send();
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body).toHaveProperty("message");
  });
});
