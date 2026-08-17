import request from "supertest";
import { app } from "./setup.js";
import Invitation from "../src/models/invitation.model.js";
import OrganizationMember from "../src/models/organizationMember.model.js";

describe("Module 3 — Team Members & Secure Email Invitations Security Test Suite", () => {
  let tokenOwner;
  let tokenAdmin;
  let tokenMember;
  let tokenRecipient;
  let tokenWrongUser;

  let userIdOwner;
  let userIdAdmin;
  let userIdMember;
  let userIdRecipient;

  let workspaceId;
  let rawTokenMember;
  let memberIdMember;
  let memberIdAdmin;

  beforeAll(async () => {
    // 1. Register Owner
    const resOwner = await request(app).post("/api/auth/register").send({
      name: "Owner Inviter",
      email: "owner.inviter@test.com",
      password: "password123",
    });
    tokenOwner = resOwner.body.data.token;
    userIdOwner = resOwner.body.data.user.id;

    // 2. Register Admin
    const resAdmin = await request(app).post("/api/auth/register").send({
      name: "Admin Inviter",
      email: "admin.inviter@test.com",
      password: "password123",
    });
    tokenAdmin = resAdmin.body.data.token;
    userIdAdmin = resAdmin.body.data.user.id;

    // 3. Register Member
    const resMember = await request(app).post("/api/auth/register").send({
      name: "Member User",
      email: "member.user@test.com",
      password: "password123",
    });
    tokenMember = resMember.body.data.token;
    userIdMember = resMember.body.data.user.id;

    // 4. Register Recipient
    const resRecipient = await request(app).post("/api/auth/register").send({
      name: "Recipient User",
      email: "invited.recipient@test.com",
      password: "password123",
    });
    tokenRecipient = resRecipient.body.data.token;
    userIdRecipient = resRecipient.body.data.user.id;

    // 5. Register Wrong User
    const resWrong = await request(app).post("/api/auth/register").send({
      name: "Wrong User",
      email: "wrong.user@test.com",
      password: "password123",
    });
    tokenWrongUser = resWrong.body.data.token;

    // Create Workspace as Owner
    const wsRes = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${tokenOwner}`)
      .send({ name: "Team Invites Workspace" });
    workspaceId = wsRes.body.data._id;

    // Setup Admin and Member in workspace
    const adminRec = await OrganizationMember.create({
      organization: workspaceId,
      user: userIdAdmin,
      role: "ADMIN",
    });
    memberIdAdmin = adminRec._id.toString();

    const memberRec = await OrganizationMember.create({
      organization: workspaceId,
      user: userIdMember,
      role: "MEMBER",
    });
    memberIdMember = memberRec._id.toString();
  });

  test("1. OWNER can invite MEMBER", async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/invitations`)
      .set("Authorization", `Bearer ${tokenOwner}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ email: "invited.recipient@test.com", role: "MEMBER" });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toEqual("invited.recipient@test.com");
  });

  test("7. Duplicate pending invitation rejected", async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/invitations`)
      .set("Authorization", `Bearer ${tokenOwner}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ email: "invited.recipient@test.com", role: "MEMBER" });

    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
  });

  test("2. OWNER can invite ADMIN", async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/invitations`)
      .set("Authorization", `Bearer ${tokenOwner}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ email: "newadmin@test.com", role: "ADMIN" });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toEqual("ADMIN");
  });

  test("3. ADMIN can invite MEMBER", async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/invitations`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ email: "admininvited@test.com", role: "MEMBER" });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
  });

  test("4. ADMIN cannot invite ADMIN -> 403 Forbidden", async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/invitations`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ email: "admininvited2@test.com", role: "ADMIN" });

    expect(res.statusCode).toEqual(403);
  });

  test("5. ADMIN cannot invite OWNER -> 400 Bad Request", async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/invitations`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ email: "attemptowner@test.com", role: "OWNER" });

    expect(res.statusCode).toEqual(400);
  });

  test("6. MEMBER cannot invite -> 403 Forbidden", async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/invitations`)
      .set("Authorization", `Bearer ${tokenMember}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ email: "memberinvited@test.com", role: "MEMBER" });

    expect(res.statusCode).toEqual(403);
  });

  test("8. Existing workspace member invitation rejected", async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/invitations`)
      .set("Authorization", `Bearer ${tokenOwner}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ email: "member.user@test.com", role: "MEMBER" });

    expect(res.statusCode).toEqual(400);
  });

  test("10. Invalid invitation token rejected -> 404", async () => {
    const res = await request(app).get("/api/invitations/invalid-token-123456789");
    expect(res.statusCode).toEqual(404);
  });

  test("11. Acceptance with wrong email rejected -> 403 Forbidden", async () => {
    // Retrieve invitation tokenHash from DB for tests
    const inv = await Invitation.findOne({ email: "invited.recipient@test.com" });
    // Simulate knowing rawToken or create one for test
    const rawTestToken = "testrawtoken1234567890123456789012";
    const crypto = await import("node:crypto");
    const testHash = crypto.createHash("sha256").update(rawTestToken).digest("hex");
    inv.tokenHash = testHash;
    await inv.save();

    // Wrong user tries to accept
    const acceptRes = await request(app)
      .post(`/api/invitations/${rawTestToken}/accept`)
      .set("Authorization", `Bearer ${tokenWrongUser}`);

    expect(acceptRes.statusCode).toEqual(403);
  });

  test("12. Successful invitation acceptance -> 200 OK & 14. Membership created & 15. Invitation marked accepted", async () => {
    const inv = await Invitation.findOne({ email: "invited.recipient@test.com" });
    const rawTestToken = "validtestrawtoken123456789012345";
    const crypto = await import("node:crypto");
    inv.tokenHash = crypto.createHash("sha256").update(rawTestToken).digest("hex");
    await inv.save();

    const acceptRes = await request(app)
      .post(`/api/invitations/${rawTestToken}/accept`)
      .set("Authorization", `Bearer ${tokenRecipient}`);

    expect(acceptRes.statusCode).toEqual(200);
    expect(acceptRes.body.success).toBe(true);

    // Verify membership created
    const memberDoc = await OrganizationMember.findOne({
      organization: workspaceId,
      user: userIdRecipient,
    });
    expect(memberDoc).not.toBeNull();
    expect(memberDoc.role).toEqual("MEMBER");

    // Verify invitation marked accepted
    const updatedInv = await Invitation.findById(inv._id);
    expect(updatedInv.acceptedAt).not.toBeNull();
  });

  test("13. Duplicate acceptance prevented", async () => {
    const inv = await Invitation.findOne({ email: "invited.recipient@test.com" });
    const rawTestToken = "duplicateaccepttoken1234567890";
    const crypto = await import("node:crypto");
    inv.tokenHash = crypto.createHash("sha256").update(rawTestToken).digest("hex");
    await inv.save();

    const res = await request(app)
      .post(`/api/invitations/${rawTestToken}/accept`)
      .set("Authorization", `Bearer ${tokenRecipient}`);

    expect(res.statusCode).toEqual(400);
  });

  test("9. Expired invitation rejected -> 400 Bad Request", async () => {
    const inv = await Invitation.findOne({ email: "admininvited@test.com" });
    inv.expiresAt = new Date(Date.now() - 1000); // Set past date
    const rawTestToken = "expiredtesttoken123456789012345";
    const crypto = await import("node:crypto");
    inv.tokenHash = crypto.createHash("sha256").update(rawTestToken).digest("hex");
    await inv.save();

    const res = await request(app)
      .post(`/api/invitations/${rawTestToken}/accept`)
      .set("Authorization", `Bearer ${tokenOwner}`);

    expect(res.statusCode).toEqual(400);
  });

  test("16. Unauthorized member removal rejected", async () => {
    const res = await request(app)
      .delete(`/api/workspaces/${workspaceId}/members/${memberIdAdmin}`)
      .set("Authorization", `Bearer ${tokenMember}`)
      .set("X-Workspace-Id", workspaceId);

    expect(res.statusCode).toEqual(403);
  });

  test("17. ADMIN cannot remove OWNER -> 403 Forbidden", async () => {
    const ownerMemberDoc = await OrganizationMember.findOne({
      organization: workspaceId,
      user: userIdOwner,
    });

    const res = await request(app)
      .delete(`/api/workspaces/${workspaceId}/members/${ownerMemberDoc._id}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .set("X-Workspace-Id", workspaceId);

    expect(res.statusCode).toEqual(403);
  });

  test("18. OWNER can remove MEMBER -> 200 OK", async () => {
    const res = await request(app)
      .delete(`/api/workspaces/${workspaceId}/members/${memberIdMember}`)
      .set("Authorization", `Bearer ${tokenOwner}`)
      .set("X-Workspace-Id", workspaceId);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  test("19. OWNER can change MEMBER role -> 200 OK", async () => {
    const res = await request(app)
      .patch(`/api/workspaces/${workspaceId}/members/${memberIdAdmin}`)
      .set("Authorization", `Bearer ${tokenOwner}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ role: "MEMBER" });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toEqual("MEMBER");
  });

  test("20. OWNER can resend invitation email -> 200 OK", async () => {
    const inv = await Invitation.findOne({ email: "admininvited@test.com" });
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/invitations/${inv._id}/resend`)
      .set("Authorization", `Bearer ${tokenOwner}`)
      .set("X-Workspace-Id", workspaceId);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toEqual("admininvited@test.com");
  });
});
