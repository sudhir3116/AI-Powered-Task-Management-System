import request from "supertest";
import { app } from "./setup.js";
import OrganizationMember from "../src/models/organizationMember.model.js";

describe("Module 2 — RBAC and Authorization Security Test Suite", () => {
  let tokenOwner;
  let tokenAdmin;
  let tokenMember;
  let tokenExternal;

  let userIdOwner;
  let userIdAdmin;
  let userIdMember;

  let workspaceId;
  let memberIdAdmin;
  let memberIdMember;

  beforeAll(async () => {
    // 1. Register Owner User
    const resOwner = await request(app).post("/api/auth/register").send({
      name: "Owner User",
      email: "owner@rbac.test",
      password: "password123",
    });
    tokenOwner = resOwner.body.data.token;
    userIdOwner = resOwner.body.data.user.id;

    // 2. Register Admin User
    const resAdmin = await request(app).post("/api/auth/register").send({
      name: "Admin User",
      email: "admin@rbac.test",
      password: "password123",
    });
    tokenAdmin = resAdmin.body.data.token;
    userIdAdmin = resAdmin.body.data.user.id;

    // 3. Register Member User
    const resMember = await request(app).post("/api/auth/register").send({
      name: "Member User",
      email: "member@rbac.test",
      password: "password123",
    });
    tokenMember = resMember.body.data.token;
    userIdMember = resMember.body.data.user.id;

    // 4. Register External User (Not in workspace)
    const resExternal = await request(app).post("/api/auth/register").send({
      name: "External User",
      email: "external@rbac.test",
      password: "password123",
    });
    tokenExternal = resExternal.body.data.token;

    // 5. Create Workspace as Owner
    const wsRes = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${tokenOwner}`)
      .send({ name: "RBAC Test Workspace" });

    workspaceId = wsRes.body.data._id;

    // 6. Add Admin and Member directly to DB for test setup
    const adminRecord = await OrganizationMember.create({
      organization: workspaceId,
      user: userIdAdmin,
      role: "ADMIN",
    });
    memberIdAdmin = adminRecord._id.toString();

    const memberRecord = await OrganizationMember.create({
      organization: workspaceId,
      user: userIdMember,
      role: "MEMBER",
    });
    memberIdMember = memberRecord._id.toString();
  });

  test("Scenario 1: OWNER attempts OWNER operation (change member role) -> SUCCESS", async () => {
    const res = await request(app)
      .patch(`/api/workspaces/${workspaceId}/members/${memberIdMember}`)
      .set("Authorization", `Bearer ${tokenOwner}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ role: "ADMIN" });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toEqual("ADMIN");

    // Reset back to MEMBER
    await OrganizationMember.findByIdAndUpdate(memberIdMember, { role: "MEMBER" });
  });

  test("Scenario 2: ADMIN attempts ADMIN operation (update workspace name) -> SUCCESS", async () => {
    const res = await request(app)
      .patch(`/api/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ name: "Updated Workspace Name by Admin" });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toEqual("Updated Workspace Name by Admin");
  });

  test("Scenario 3: ADMIN attempts OWNER-only operation (delete workspace) -> 403 Forbidden", async () => {
    const res = await request(app)
      .delete(`/api/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .set("X-Workspace-Id", workspaceId);

    expect(res.statusCode).toEqual(403);
    expect(res.body.success).toBe(false);
  });

  test("Scenario 4: MEMBER attempts ADMIN operation (update workspace name) -> 403 Forbidden", async () => {
    const res = await request(app)
      .patch(`/api/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${tokenMember}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ name: "Member Name Attempt" });

    expect(res.statusCode).toEqual(403);
    expect(res.body.success).toBe(false);
  });

  test("Scenario 5: MEMBER attempts OWNER operation (delete workspace) -> 403 Forbidden", async () => {
    const res = await request(app)
      .delete(`/api/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${tokenMember}`)
      .set("X-Workspace-Id", workspaceId);

    expect(res.statusCode).toEqual(403);
    expect(res.body.success).toBe(false);
  });

  test("Scenario 6: User outside workspace attempts workspace access -> 403 Forbidden", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${tokenExternal}`)
      .set("X-Workspace-Id", workspaceId);

    expect(res.statusCode).toEqual(403);
    expect(res.body.success).toBe(false);
  });

  test("Scenario 7: ADMIN attempts to modify OWNER role -> 403 Forbidden", async () => {
    const ownerMemberRecord = await OrganizationMember.findOne({
      organization: workspaceId,
      user: userIdOwner,
    });

    const res = await request(app)
      .patch(`/api/workspaces/${workspaceId}/members/${ownerMemberRecord._id}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ role: "MEMBER" });

    expect(res.statusCode).toEqual(403);
    expect(res.body.success).toBe(false);
  });

  test("Scenario 8: ADMIN attempts to promote MEMBER to OWNER -> 403 Forbidden", async () => {
    const res = await request(app)
      .patch(`/api/workspaces/${workspaceId}/members/${memberIdMember}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ role: "OWNER" });

    expect(res.statusCode).toEqual(403);
    expect(res.body.success).toBe(false);
  });

  test("Scenario 9: MEMBER attempts to change member role -> 403 Forbidden", async () => {
    const res = await request(app)
      .patch(`/api/workspaces/${workspaceId}/members/${memberIdAdmin}`)
      .set("Authorization", `Bearer ${tokenMember}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ role: "MEMBER" });

    expect(res.statusCode).toEqual(403);
    expect(res.body.success).toBe(false);
  });

  test("Scenario 10: Frontend role manipulation in request body is ignored by backend", async () => {
    // MEMBER passes { role: "OWNER" } in body while requesting ADMIN/OWNER endpoint
    const res = await request(app)
      .patch(`/api/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${tokenMember}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ name: "Hacked Name", role: "OWNER" });

    expect(res.statusCode).toEqual(403);
    expect(res.body.success).toBe(false);
  });
});
