import request from "supertest";
import { app } from "./setup.js";
import AuditLog from "../src/models/auditLog.model.js";
import OrganizationMember from "../src/models/organizationMember.model.js";

describe("Module 6 — Enterprise Audit Logging Security Test Suite", () => {
  let tokenOwner;
  let tokenAdmin;
  let tokenMember;
  let tokenForeign;

  let userIdOwner;
  let userIdAdmin;
  let userIdMember;

  let workspaceId;

  beforeAll(async () => {
    const resOwner = await request(app).post("/api/auth/register").send({
      name: "Audit Owner",
      email: "audit.owner@test.com",
      password: "password123",
    });
    tokenOwner = resOwner.body.data.token;
    userIdOwner = resOwner.body.data.user.id;

    const resAdmin = await request(app).post("/api/auth/register").send({
      name: "Audit Admin",
      email: "audit.admin@test.com",
      password: "password123",
    });
    tokenAdmin = resAdmin.body.data.token;
    userIdAdmin = resAdmin.body.data.user.id;

    const resMember = await request(app).post("/api/auth/register").send({
      name: "Audit Member",
      email: "audit.member@test.com",
      password: "password123",
    });
    tokenMember = resMember.body.data.token;
    userIdMember = resMember.body.data.user.id;

    const resForeign = await request(app).post("/api/auth/register").send({
      name: "Audit Foreign",
      email: "audit.foreign@test.com",
      password: "password123",
    });
    tokenForeign = resForeign.body.data.token;

    const wsRes = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${tokenOwner}`)
      .send({ name: "Audit Log Workspace" });
    workspaceId = wsRes.body.data._id;

    await OrganizationMember.create({
      organization: workspaceId,
      user: userIdAdmin,
      role: "ADMIN",
    });

    await OrganizationMember.create({
      organization: workspaceId,
      user: userIdMember,
      role: "MEMBER",
    });

    // Create test audit log
    await AuditLog.create({
      organization: workspaceId,
      actor: userIdOwner,
      action: "workspace_created",
      entityType: "Organization",
      entityId: workspaceId,
      metadata: { name: "Audit Log Workspace" },
    });
  });

  test("1. Unauthenticated audit log access rejected -> 401 Unauthorized", async () => {
    const res = await request(app).get(`/api/workspaces/${workspaceId}/audit-logs`);
    expect(res.statusCode).toEqual(401);
  });

  test("2. MEMBER cannot access audit logs -> 403 Forbidden", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/audit-logs`)
      .set("Authorization", `Bearer ${tokenMember}`)
      .set("X-Workspace-Id", workspaceId);

    expect(res.statusCode).toEqual(403);
  });

  test("3. Foreign non-member user cannot access audit logs -> 403 Forbidden", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/audit-logs`)
      .set("Authorization", `Bearer ${tokenForeign}`)
      .set("X-Workspace-Id", workspaceId);

    expect(res.statusCode).toEqual(403);
  });

  test("4. OWNER can view audit logs -> 200 OK", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/audit-logs`)
      .set("Authorization", `Bearer ${tokenOwner}`)
      .set("X-Workspace-Id", workspaceId);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].action).toEqual("workspace_created");
  });

  test("5. ADMIN can view audit logs -> 200 OK", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/audit-logs`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .set("X-Workspace-Id", workspaceId);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });
});
