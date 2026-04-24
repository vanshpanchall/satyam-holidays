/**
 * Package image upload — Cloudinary is mocked so tests do not need real credentials.
 */
jest.mock("../utils/cloudinary", () => ({
  uploadImage: jest.fn().mockResolvedValue({
    url: "https://res.cloudinary.com/mock-cloud/image/upload/v1/folder/test.jpg",
    publicId: "satyam-holidays/packages/test",
  }),
  deleteImage: jest.fn().mockResolvedValue({ result: "ok" }),
  cloudinary: {},
}));

const request = require("supertest");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-ci";
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@test.com";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "TestPass123";
jest.setTimeout(20000);

const app = require("../server");

// Minimal valid JPEG (1×1 pixel)
const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=",
  "base64"
);

describe("POST /api/packages/upload-image", () => {
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

  test("returns 403 without CSRF", async () => {
    const res = await request(app)
      .post("/api/packages/upload-image")
      .attach("image", TINY_JPEG, "photo.jpg");
    expect(res.statusCode).toBe(403);
  });

  test("returns 401 with CSRF but without auth", async () => {
    const res = await withCsrf(request(app).post("/api/packages/upload-image")).attach(
      "image",
      TINY_JPEG,
      "photo.jpg"
    );
    expect(res.statusCode).toBe(401);
  });

  test("returns 400 without file when authenticated", async () => {
    if (!token) return;
    const res = await withCsrf(request(app).post("/api/packages/upload-image")).set(
      "Authorization",
      `Bearer ${token}`
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("returns 400 for non-image file when authenticated", async () => {
    if (!token) return;
    const res = await withCsrf(request(app).post("/api/packages/upload-image"))
      .set("Authorization", `Bearer ${token}`)
      .attach("image", Buffer.from("hello"), "notes.txt");
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("returns 200 and imageUrl for valid image when authenticated", async () => {
    if (!token) return;
    const res = await withCsrf(request(app).post("/api/packages/upload-image"))
      .set("Authorization", `Bearer ${token}`)
      .attach("image", TINY_JPEG, "photo.jpg");
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.imageUrl).toMatch(/^https:\/\//);
  });

  afterAll(async () => {
    const mongoose = require("mongoose");
    await mongoose.connection.close();
  });
});
