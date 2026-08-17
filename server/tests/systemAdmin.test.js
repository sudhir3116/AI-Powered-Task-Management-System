import request from "supertest";
import { app } from "./setup.js";
import User from "../src/models/user.model.js";

describe("Module 10 — System Admin Foundation Security Test Suite", () => {
  let tokenNormalUser;
  let tokenSysAdmin;

  beforeAll(async () => {
    // Normal User
    const resUser = await request(app).post("/api/auth/register").send({
      name: "Normal User",
      email: "normal.user@test.com",
      password: "password123",
    });
    tokenNormalUser = resUser.body.data.token;

    // SysAdmin User
    const resAdmin = await request(app).post("/api/auth/register").send({
      name: "System Admin User",
      email: "sysadmin.user@test.com",
      password: "password123",
    });
    tokenSysAdmin = resAdmin.body.data.token;

    // Grant SYSTEM_ADMIN role in database
    await User.findByIdAndUpdate(resAdmin.body.data.user.id, {
      systemRole: "SYSTEM_ADMIN",
    });
  });

  test("1. Unauthenticated admin overview rejected -> 401 Unauthorized", async () => {
    const res = await request(app).get("/api/admin/overview");
    expect(res.statusCode).toEqual(401);
  });

  test("2. Normal user (even workspace OWNER) rejected from /admin -> 403 Forbidden", async () => {
    const res = await request(app)
      .get("/api/admin/overview")
      .set("Authorization", `Bearer ${tokenNormalUser}`);

    expect(res.statusCode).toEqual(403);
    expect(res.body.success).toBe(false);
  });

  test("3. SYSTEM_ADMIN can view platform overview -> 200 OK", async () => {
    const res = await request(app)
      .get("/api/admin/overview")
      .set("Authorization", `Bearer ${tokenSysAdmin}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalUsers).toBeGreaterThanOrEqual(2);
    expect(res.body.data.systemHealth.status).toEqual("healthy");
  });

  test("4. SYSTEM_ADMIN can list platform users -> 200 OK", async () => {
    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${tokenSysAdmin}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  test("5. SYSTEM_ADMIN can list platform organizations -> 200 OK", async () => {
    const res = await request(app)
      .get("/api/admin/organizations")
      .set("Authorization", `Bearer ${tokenSysAdmin}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });
});
