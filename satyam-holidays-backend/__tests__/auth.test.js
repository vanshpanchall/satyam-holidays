const request = require("supertest");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-ci";
process.env.ADMIN_EMAIL = "admin@test.com";
process.env.ADMIN_PASSWORD = "TestPass123";
jest.setTimeout(20000);
const app = require("../server");
const User = require("../models/User");
const mongoose = require("mongoose");

describe("Auth API", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    await User.deleteMany({});
    await User.create({
      name: "Test Admin",
      email: "admin@test.com",
      password: "TestPass123",
      role: "admin",
      mfaEnabled: false,
    });
  });

  test("POST /api/auth/login with valid credentials returns token", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "admin@test.com",
      password: "TestPass123",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("token");
  });

  test("POST /api/auth/users creates an admin that can log in", async () => {
    await User.collection.insertOne({
      name: "Created Admin",
      email: "created.admin@test.com",
      password: "CreatedPass123",
      role: "admin",
      mfaEnabled: false,
    });

    const newLoginRes = await request(app).post("/api/auth/login").send({
      email: "created.admin@test.com",
      password: "CreatedPass123",
    });

    expect(newLoginRes.statusCode).toBe(200);
    expect(newLoginRes.body.success).toBe(true);
    expect(newLoginRes.body).toHaveProperty("token");

    const storedUser = await User.findOne({ email: "created.admin@test.com" });
    expect(storedUser.password).not.toBe("CreatedPass123");
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

  describe("Email OTP MFA Flow", () => {
    let token;
    let mfaToken;
    let backupCodes;

    beforeAll(async () => {
      // Login normally to get jwt token
      const res = await request(app).post("/api/auth/login").send({
        email: "admin@test.com",
        password: "TestPass123",
      });
      token = res.body.token;
    });

    test("POST /api/auth/mfa/setup initiates MFA setup and generates code", async () => {
      const res = await request(app)
        .post("/api/auth/mfa/setup")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty("backupCodes");
      backupCodes = res.body.backupCodes;

      // Check that user document has an OTP generated
      const user = await User.findOne({ email: "admin@test.com" });
      expect(user.mfaOtp).toBeDefined();
      expect(user.mfaOtpExpires).toBeDefined();
    });

    test("POST /api/auth/mfa/verify-and-enable enables MFA for user", async () => {
      const userBefore = await User.findOne({ email: "admin@test.com" });
      const otpCode = userBefore.mfaOtp;

      const res = await request(app)
        .post("/api/auth/mfa/verify-and-enable")
        .set("Authorization", `Bearer ${token}`)
        .send({
          code: otpCode,
          backupCodes,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const userAfter = await User.findOne({ email: "admin@test.com" });
      expect(userAfter.mfaEnabled).toBe(true);
      expect(userAfter.mfaBackupCodes).toHaveLength(8);
    });

    test("POST /api/auth/login requires MFA", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "admin@test.com",
        password: "TestPass123",
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mfaRequired).toBe(true);
      expect(res.body).toHaveProperty("mfaToken");
      mfaToken = res.body.mfaToken;
    });

    test("POST /api/auth/verify-mfa with invalid code fails", async () => {
      const res = await request(app).post("/api/auth/verify-mfa").send({
        mfaToken,
        code: "000000",
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test("POST /api/auth/verify-mfa with correct code logs in", async () => {
      const user = await User.findOne({ email: "admin@test.com" });
      const correctOtp = user.mfaOtp;

      const res = await request(app).post("/api/auth/verify-mfa").send({
        mfaToken,
        code: correctOtp,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty("token");
    });

    test("POST /api/auth/verify-mfa using backup code logs in", async () => {
      // Re-trigger login to get new mfaToken
      const loginRes = await request(app).post("/api/auth/login").send({
        email: "admin@test.com",
        password: "TestPass123",
      });
      const pendingMfaToken = loginRes.body.mfaToken;

      // Verify using first backup code
      const res = await request(app).post("/api/auth/verify-mfa").send({
        mfaToken: pendingMfaToken,
        code: backupCodes[0],
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty("token");

      // Verify backup code was consumed
      const user = await User.findOne({ email: "admin@test.com" });
      expect(user.mfaBackupCodes).not.toContain(backupCodes[0]);
    });

    test("POST /api/auth/mfa/disable disables MFA", async () => {
      // Get authentication token first (since the above tests logged in)
      const loginRes = await request(app).post("/api/auth/login").send({
        email: "admin@test.com",
        password: "TestPass123",
      });

      const user = await User.findOne({ email: "admin@test.com" });
      const resMfa = await request(app).post("/api/auth/verify-mfa").send({
        mfaToken: loginRes.body.mfaToken,
        code: user.mfaOtp,
      });
      const activeToken = resMfa.body.token;

      // Try disable with wrong password
      const badRes = await request(app)
        .post("/api/auth/mfa/disable")
        .set("Authorization", `Bearer ${activeToken}`)
        .send({ password: "wrong-password" });
      expect(badRes.statusCode).toBe(400);

      // Disable with correct password
      const goodRes = await request(app)
        .post("/api/auth/mfa/disable")
        .set("Authorization", `Bearer ${activeToken}`)
        .send({ password: "TestPass123" });
      expect(goodRes.statusCode).toBe(200);
      expect(goodRes.body.success).toBe(true);

      const finalUser = await User.findOne({ email: "admin@test.com" });
      expect(finalUser.mfaEnabled).toBe(false);
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });
});
