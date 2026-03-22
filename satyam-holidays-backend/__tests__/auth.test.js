const request = require("supertest");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-ci";
process.env.ADMIN_EMAIL = "admin@test.com";
process.env.ADMIN_PASSWORD = "TestPass123";
jest.setTimeout(20000);
const app = require("../server");

describe("Auth API", () => {
  test("POST /api/auth/login with valid credentials returns token", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "admin@test.com",
      password: "TestPass123",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("token");
  });

  test("POST /api/auth/login with invalid credentials returns 401", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "admin@test.com",
      password: "WrongPassword",
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("POST /api/auth/login with missing fields returns 400", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "admin@test.com",
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("POST /api/auth/login with invalid email format returns 400", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "not-an-email",
      password: "SomePassword",
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("POST /api/auth/login with wrong email returns 401", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "wrong@email.com",
      password: "TestPass123",
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
