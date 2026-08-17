import request from "supertest";
import { app } from "./setup.js";
import User from "../src/models/user.model.js";
import crypto from "node:crypto";

describe("Module 4 — Password Reset Security Test Suite", () => {
  let userEmail = "passwordreset.user@test.com";
  let userPassword = "OriginalPassword123";
  let userId;

  beforeAll(async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Reset User",
      email: userEmail,
      password: userPassword,
    });
    userId = res.body.data.user.id;
  });

  test("1. Forgot password returns uniform success for non-existent email (enumeration prevention)", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nonexistent@test.com" });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain("If an account with that email exists");
  });

  test("2. Forgot password generates reset token hash & expiry for valid local user", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: userEmail });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);

    const userDoc = await User.findById(userId);
    expect(userDoc.resetPasswordTokenHash).not.toBeNull();
    expect(userDoc.resetPasswordExpiresAt).not.toBeNull();
    expect(new Date(userDoc.resetPasswordExpiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  test("3. Reset password fails with invalid token -> 400 Bad Request", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password/invalid-random-token-12345")
      .send({ newPassword: "NewSecretPassword123" });

    expect(res.statusCode).toEqual(400);
    expect(res.body.message).toContain("Invalid or expired");
  });

  test("4. Reset password fails with short password -> 400 Bad Request", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password/sometoken")
      .send({ newPassword: "123" });

    expect(res.statusCode).toEqual(400);
  });

  test("5. Reset password succeeds with valid token & updates credentials", async () => {
    const rawToken = "validresettoken12345678901234567890";
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const userDoc = await User.findById(userId);
    userDoc.resetPasswordTokenHash = tokenHash;
    userDoc.resetPasswordExpiresAt = new Date(Date.now() + 3600000);
    await userDoc.save();

    const resetRes = await request(app)
      .post(`/api/auth/reset-password/${rawToken}`)
      .send({ newPassword: "BrandNewPassword123" });

    expect(resetRes.statusCode).toEqual(200);
    expect(resetRes.body.success).toBe(true);

    // Verify token cleared
    const updatedUser = await User.findById(userId);
    expect(updatedUser.resetPasswordTokenHash).toBeNull();
    expect(updatedUser.resetPasswordExpiresAt).toBeNull();

    // Verify login with new password
    const loginRes = await request(app).post("/api/auth/login").send({
      email: userEmail,
      password: "BrandNewPassword123",
    });

    expect(loginRes.statusCode).toEqual(200);
    expect(loginRes.body.success).toBe(true);
  });

  test("6. Expired token rejected -> 400 Bad Request", async () => {
    const rawToken = "expiredresettoken123456789012345";
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const userDoc = await User.findById(userId);
    userDoc.resetPasswordTokenHash = tokenHash;
    userDoc.resetPasswordExpiresAt = new Date(Date.now() - 5000); // 5 seconds ago
    await userDoc.save();

    const res = await request(app)
      .post(`/api/auth/reset-password/${rawToken}`)
      .send({ newPassword: "AnotherNewPassword123" });

    expect(res.statusCode).toEqual(400);
  });
});
