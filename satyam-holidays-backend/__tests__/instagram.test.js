const request = require("supertest");
const jwt = require("jsonwebtoken");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-ci";
// Empty (not deleted): server.js loads .env, and dotenv never overrides a variable that is defined
process.env.GEMINI_API_KEY = ""; // exercise the caption-only fallback, no AI calls
process.env.INSTAGRAM_ACCESS_TOKEN = "";
jest.setTimeout(30000);

jest.mock("../utils/cloudinary", () => ({
  uploadImage: jest.fn(async () => ({
    url: "https://res.cloudinary.com/demo/image/upload/ig.jpg",
    publicId: "ig",
  })),
  deleteImage: jest.fn(),
}));

const app = require("../server");
const Package = require("../models/Package");
const InstagramImport = require("../models/InstagramImport");

const token = jwt.sign(
  { user: { id: "a1", role: "admin", email: "admin@test.com" } },
  process.env.JWT_SECRET,
  {
    expiresIn: "1h",
  }
);
const admin = (r) => r.set("Authorization", `Bearer ${token}`);

const POSTS = [
  {
    id: "m1",
    media_type: "IMAGE",
    media_url: "https://cdn.example/m1.jpg",
    permalink: "https://instagram.com/p/m1",
    timestamp: "2026-10-20T10:00:00+0000",
    caption:
      "Kedarnath Yatra Special\nDirect from Ahmedabad, comfortable stays.\n5N/6D only ₹15,999 per person",
  },
  {
    id: "m2",
    media_type: "CAROUSEL_ALBUM",
    permalink: "https://instagram.com/p/m2",
    timestamp: "2026-10-18T10:00:00+0000",
    caption: "Happy Diwali to all our travellers! 🪔",
    children: { data: [{ media_type: "IMAGE", media_url: "https://cdn.example/m2a.jpg" }] },
  },
  {
    id: "m3",
    media_type: "VIDEO",
    media_url: "https://cdn.example/m3.mp4",
    thumbnail_url: "https://cdn.example/m3.jpg",
    permalink: "https://instagram.com/reel/m3",
    timestamp: "2026-10-15T10:00:00+0000",
    caption: "Kedarnath Yatra Special\n6 days trip ₹17,500",
  },
];

const realFetch = global.fetch;
beforeAll(async () => {
  const mongoose = require("mongoose");
  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGODB_URI);
  global.fetch = jest.fn(async (url) => {
    const u = String(url);
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    if (u.startsWith("https://graph.instagram.com/v21.0/me?")) {
      return u.includes("access_token=good-token-1234567890")
        ? json({ user_id: "ig-1", username: "satyamholidays", account_type: "BUSINESS" })
        : json({ error: { message: "Invalid OAuth access token", code: 190 } }, 400);
    }
    if (u.startsWith("https://graph.facebook.com/"))
      return json({ error: { message: "bad", code: 190 } }, 400);
    if (u.startsWith("https://graph.instagram.com/v21.0/me/media")) return json({ data: POSTS });
    if (u.startsWith("https://cdn.example/")) {
      return new Response(Buffer.from([0xff, 0xd8, 0xff]), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
    }
    // Anything else would be a real network call; tests must stay offline
    return json({ error: { message: `unexpected request: ${u}` } }, 404);
  });
});
afterAll(() => {
  global.fetch = realFetch;
});

describe("Instagram import", () => {
  test("requires admin auth", async () => {
    expect((await request(app).get("/api/v1/instagram/status")).statusCode).toBe(401);
  });

  test("rejects a bad token with a helpful message", async () => {
    const res = await admin(request(app).post("/api/v1/instagram/connect")).send({
      accessToken: "bad-token-123456789012",
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toMatch(/didn't work with Instagram/);
  });

  test("connects, and never exposes the token", async () => {
    const res = await admin(request(app).post("/api/v1/instagram/connect")).send({
      accessToken: "good-token-1234567890",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.username).toBe("satyamholidays");

    const status = await admin(request(app).get("/api/v1/instagram/status"));
    expect(status.body.data.connected).toBe(true);
    expect(JSON.stringify(status.body)).not.toContain("good-token");
    const settings = await request(app).get("/api/v1/settings");
    expect(JSON.stringify(settings.body)).not.toContain("good-token");
  });

  test("sync queues new posts once (no duplicates on re-sync)", async () => {
    const first = await admin(request(app).post("/api/v1/instagram/sync")).send({ limit: 25 });
    expect(first.body.data).toEqual({ checked: 3, added: 3 });
    const again = await admin(request(app).post("/api/v1/instagram/sync")).send({});
    expect(again.body.data.added).toBe(0);

    const reel = await InstagramImport.findOne({ mediaId: "m3" }).lean();
    expect(reel.mediaUrls).toEqual(["https://cdn.example/m3.jpg"]); // reels use the cover frame
  });

  test("a package post becomes an unpublished draft with hosted images and no fake rating", async () => {
    const imp = await InstagramImport.findOne({ mediaId: "m1" }).lean();
    const res = await admin(
      request(app).post(`/api/v1/instagram/imports/${imp._id}/process`)
    ).send();
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe("imported");

    const pkg = await Package.findById(res.body.data.package).lean();
    expect(pkg).toMatchObject({
      name: "Kedarnath Yatra Special",
      duration: "6 Days / 5 Nights",
      numericPrice: 15999,
      isActive: false,
      rating: 0,
      image: "https://res.cloudinary.com/demo/image/upload/ig.jpg",
    });
    expect(pkg.importSource).toMatchObject({ platform: "instagram", mediaId: "m1" });

    // Public catalogue doesn't show drafts
    const pub = await request(app).get("/api/v1/packages/slug/" + pkg.slug);
    expect(pub.statusCode).toBe(404);

    // Can't be imported twice
    const twice = await admin(
      request(app).post(`/api/v1/instagram/imports/${imp._id}/process`)
    ).send();
    expect(twice.statusCode).toBe(409);
  });

  test("a second post with the same name gets its own slug", async () => {
    const imp = await InstagramImport.findOne({ mediaId: "m3" }).lean();
    const res = await admin(
      request(app).post(`/api/v1/instagram/imports/${imp._id}/process`)
    ).send();
    const pkg = await Package.findById(res.body.data.package).lean();
    expect(pkg.slug).toBe("kedarnath-yatra-special-2");
  });

  test("greetings are marked as not a package, and posts can be skipped", async () => {
    const imp = await InstagramImport.findOne({ mediaId: "m2" }).lean();
    const res = await admin(
      request(app).post(`/api/v1/instagram/imports/${imp._id}/process`)
    ).send();
    expect(res.body.data.status).toBe("not_package");
    expect(res.body.data.package).toBeFalsy();

    const skip = await admin(request(app).patch(`/api/v1/instagram/imports/${imp._id}`)).send({
      status: "skipped",
    });
    expect(skip.body.data.status).toBe("skipped");

    const list = await admin(request(app).get("/api/v1/instagram/imports"));
    expect(list.body.data.map((i) => i.status).sort()).toEqual(["imported", "imported", "skipped"]);
  });
});
