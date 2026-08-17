import request from "supertest";
import { app } from "./setup.js";
import Task from "../src/models/task.model.js";
import OrganizationMember from "../src/models/organizationMember.model.js";

describe("Module 8 — Task Assignment Security Test Suite", () => {
  let tokenOwner;
  let tokenMember;
  let tokenForeign;

  let userIdOwner;
  let userIdMember;
  let userIdForeign;

  let workspaceId;

  beforeAll(async () => {
    const resOwner = await request(app).post("/api/auth/register").send({
      name: "Assign Owner",
      email: "assign.owner@test.com",
      password: "password123",
    });
    tokenOwner = resOwner.body.data.token;
    userIdOwner = resOwner.body.data.user.id;

    const resMember = await request(app).post("/api/auth/register").send({
      name: "Assign Member",
      email: "assign.member@test.com",
      password: "password123",
    });
    tokenMember = resMember.body.data.token;
    userIdMember = resMember.body.data.user.id;

    const resForeign = await request(app).post("/api/auth/register").send({
      name: "Assign Foreign",
      email: "assign.foreign@test.com",
      password: "password123",
    });
    tokenForeign = resForeign.body.data.token;
    userIdForeign = resForeign.body.data.user.id;

    const wsRes = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${tokenOwner}`)
      .send({ name: "Task Assignment Workspace" });
    workspaceId = wsRes.body.data._id;

    await OrganizationMember.create({
      organization: workspaceId,
      user: userIdMember,
      role: "MEMBER",
    });
  });

  test("1. OWNER can assign task to a workspace member", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${tokenOwner}`)
      .set("X-Workspace-Id", workspaceId)
      .send({
        title: "Assigned Task 1",
        description: "Task description",
        assignedTo: userIdMember,
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.assignedTo.toString()).toEqual(userIdMember);
  });

  test("2. Cross-workspace assignment rejected -> 400 Bad Request", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${tokenOwner}`)
      .set("X-Workspace-Id", workspaceId)
      .send({
        title: "Cross Workspace Task",
        description: "Task description",
        assignedTo: userIdForeign,
      });

    expect(res.statusCode).toEqual(400);
  });

  test("3. Filter assigned_to_me returns assigned tasks", async () => {
    const res = await request(app)
      .get("/api/tasks?assignment=assigned_to_me")
      .set("Authorization", `Bearer ${tokenMember}`)
      .set("X-Workspace-Id", workspaceId);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].title).toEqual("Assigned Task 1");
  });
});
