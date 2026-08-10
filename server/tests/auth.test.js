import request from "supertest";
import { app } from "./setup.js";

describe("Auth API", () => {
  it("registers a new user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test User", email: "test@example.com", password: "Password123" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe("test@example.com");
    expect(res.body.data.user.authProvider).toBe("local");
  });

  it("logs in an existing user", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ name: "Login User", email: "login@example.com", password: "Password123" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@example.com", password: "Password123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it("rejects registration with duplicate email", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ name: "Dup User", email: "dup@example.com", password: "Password123" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Dup User2", email: "dup@example.com", password: "Password123" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects login with wrong password", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ name: "WP User", email: "wp@example.com", password: "RightPass1" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "wp@example.com", password: "WrongPass" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects login with non-existent email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "Pass123" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects registration with invalid email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test", email: "not-an-email", password: "Password123" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects registration with short password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test", email: "shortpw@example.com", password: "abc" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns user profile from GET /api/auth/me", async () => {
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Profile User", email: "profile@example.com", password: "Password123" });

    const token = regRes.body.data.token;

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("profile@example.com");
  });

  it("rejects GET /api/auth/me without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
