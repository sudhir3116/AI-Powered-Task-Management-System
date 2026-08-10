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
});
