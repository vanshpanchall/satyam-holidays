const request = require("supertest");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-ci";
const app = require("../server");

describe("Reviews API", () => {
  const packageId = "507f1f77bcf86cd799439011";

  test("GET /api/reviews/package/:packageId returns stable response shape", async () => {
    const res = await request(app).get(`/api/reviews/package/${packageId}`).send();

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.reviews)).toBe(true);
    expect(res.body.data).toHaveProperty("pagination");
    expect(res.body).toHaveProperty("pagination");
  });

  test("GET /api/reviews/package/:packageId/summary returns summary payload", async () => {
    const res = await request(app).get(`/api/reviews/package/${packageId}/summary`).send();

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toHaveProperty("averageRating");
    expect(res.body.data).toHaveProperty("ratingDistribution");
  });
});
