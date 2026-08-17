import request from "supertest";
import { app } from "./setup.js";
import Task from "../src/models/task.model.js";
import OrganizationMember from "../src/models/organizationMember.model.js";

describe("Module 4 — Organization Analytics & Team Dashboard Security Test Suite", () => {
  let tokenOwner;
  let tokenAdmin;
  let tokenMember;
  let tokenForeignUser;

  let userIdOwner;
  let userIdAdmin;
  let userIdMember;

  let workspaceIdA;
  let workspaceIdB;

  beforeAll(async () => {
    // 1. Register Owner
    const resOwner = await request(app).post("/api/auth/register").send({
      name: "Analytics Owner",
      email: "analytics.owner@test.com",
      password: "password123",
    });
    tokenOwner = resOwner.body.data.token;
    userIdOwner = resOwner.body.data.user.id;

    // 2. Register Admin
    const resAdmin = await request(app).post("/api/auth/register").send({
      name: "Analytics Admin",
      email: "analytics.admin@test.com",
      password: "password123",
    });
    tokenAdmin = resAdmin.body.data.token;
    userIdAdmin = resAdmin.body.data.user.id;

    // 3. Register Member
    const resMember = await request(app).post("/api/auth/register").send({
      name: "Analytics Member",
      email: "analytics.member@test.com",
      password: "password123",
    });
    tokenMember = resMember.body.data.token;
    userIdMember = resMember.body.data.user.id;

    // 4. Register Foreign User (Workspace B)
    const resForeign = await request(app).post("/api/auth/register").send({
      name: "Foreign User",
      email: "foreign.user@test.com",
      password: "password123",
    });
    tokenForeignUser = resForeign.body.data.token;

    // Create Workspace A as Owner
    const wsResA = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${tokenOwner}`)
      .send({ name: "Analytics Workspace A" });
    workspaceIdA = wsResA.body.data._id;

    // Create Workspace B as Foreign User
    const wsResB = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${tokenForeignUser}`)
      .send({ name: "Analytics Workspace B" });
    workspaceIdB = wsResB.body.data._id;

    // Add Admin & Member to Workspace A
    await OrganizationMember.create({
      organization: workspaceIdA,
      user: userIdAdmin,
      role: "ADMIN",
    });

    await OrganizationMember.create({
      organization: workspaceIdA,
      user: userIdMember,
      role: "MEMBER",
    });

    // Populate Tasks in Workspace A
    const now = new Date();
    const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const futureDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days in future

    await Task.create([
      {
        title: "Task 1 Completed High",
        description: "Task description 1",
        status: "Completed",
        priority: "High",
        organization: workspaceIdA,
        user: userIdOwner,
        createdBy: userIdOwner,
      },
      {
        title: "Task 2 In Progress Medium Overdue",
        description: "Task description 2",
        status: "In Progress",
        priority: "Medium",
        dueDate: pastDate,
        organization: workspaceIdA,
        user: userIdAdmin,
        createdBy: userIdAdmin,
      },
      {
        title: "Task 3 Pending Low Upcoming",
        description: "Task description 3",
        status: "Pending",
        priority: "Low",
        dueDate: futureDate,
        organization: workspaceIdA,
        user: userIdMember,
        createdBy: userIdMember,
      },
      {
        title: "Task 4 Completed Overdue Date (Should not count as overdue)",
        description: "Task description 4",
        status: "Completed",
        priority: "High",
        dueDate: pastDate,
        organization: workspaceIdA,
        user: userIdMember,
        createdBy: userIdMember,
      },
    ]);
  });

  test("1. Analytics endpoint authentication required -> 401 Unauthorized", async () => {
    const res = await request(app).get(`/api/workspaces/${workspaceIdA}/analytics`);
    expect(res.statusCode).toEqual(401);
  });

  test("6. Cross-workspace analytics access rejected -> 403 Forbidden", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceIdA}/analytics`)
      .set("Authorization", `Bearer ${tokenForeignUser}`)
      .set("X-Workspace-Id", workspaceIdA);

    expect(res.statusCode).toEqual(403);
  });

  test("3. OWNER can retrieve workspace analytics -> 200 OK", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceIdA}/analytics`)
      .set("Authorization", `Bearer ${tokenOwner}`)
      .set("X-Workspace-Id", workspaceIdA);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  test("4. ADMIN can retrieve workspace analytics -> 200 OK", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceIdA}/analytics`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .set("X-Workspace-Id", workspaceIdA);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  test("5. MEMBER can retrieve workspace analytics -> 200 OK", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceIdA}/analytics`)
      .set("Authorization", `Bearer ${tokenMember}`)
      .set("X-Workspace-Id", workspaceIdA);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  test("7. Total task count & 8-10. Status counts verified", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceIdA}/analytics`)
      .set("Authorization", `Bearer ${tokenOwner}`)
      .set("X-Workspace-Id", workspaceIdA);

    const { totalTasks, completedTasks, inProgressTasks, pendingTasks } = res.body.data;
    expect(totalTasks).toEqual(4);
    expect(completedTasks).toEqual(2);
    expect(inProgressTasks).toEqual(1);
    expect(pendingTasks).toEqual(1);
  });

  test("11. Overdue count excludes completed tasks", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceIdA}/analytics`)
      .set("Authorization", `Bearer ${tokenOwner}`)
      .set("X-Workspace-Id", workspaceIdA);

    expect(res.body.data.overdueTasks).toEqual(1); // Task 2 only
  });

  test("12. Completion rate % calculated accurately", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceIdA}/analytics`)
      .set("Authorization", `Bearer ${tokenOwner}`)
      .set("X-Workspace-Id", workspaceIdA);

    // 2 completed out of 4 tasks = 50%
    expect(res.body.data.completionRate).toEqual(50);
  });

  test("13. Priority distribution verified", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceIdA}/analytics`)
      .set("Authorization", `Bearer ${tokenOwner}`)
      .set("X-Workspace-Id", workspaceIdA);

    const { highPriorityTasks, mediumPriorityTasks, lowPriorityTasks } = res.body.data;
    expect(highPriorityTasks).toEqual(2);
    expect(mediumPriorityTasks).toEqual(1);
    expect(lowPriorityTasks).toEqual(1);
  });

  test("14. Upcoming deadlines include non-completed tasks within 7 days", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceIdA}/analytics`)
      .set("Authorization", `Bearer ${tokenOwner}`)
      .set("X-Workspace-Id", workspaceIdA);

    expect(res.body.data.upcomingTasks.length).toEqual(1);
    expect(res.body.data.upcomingTasks[0].title).toEqual("Task 3 Pending Low Upcoming");
  });

  test("15. Team statistics member breakdown returned correctly", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceIdA}/analytics`)
      .set("Authorization", `Bearer ${tokenOwner}`)
      .set("X-Workspace-Id", workspaceIdA);

    const { memberStats } = res.body.data;
    expect(memberStats.length).toBeGreaterThanOrEqual(3);
  });

  test("16. Zero-task workspace returns safe empty analytics (no NaN)", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${workspaceIdB}/analytics`)
      .set("Authorization", `Bearer ${tokenForeignUser}`)
      .set("X-Workspace-Id", workspaceIdB);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.totalTasks).toEqual(0);
    expect(res.body.data.completionRate).toEqual(0);
    expect(res.body.data.memberStats.length).toEqual(1);
  });
});
