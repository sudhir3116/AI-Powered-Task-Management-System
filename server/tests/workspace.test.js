import request from "supertest";
import { app } from "./setup.js";

describe("Module 1 — Workspace & Multi-Tenant Foundation API", () => {
  let tokenUserA;
  let tokenUserB;
  let workspaceUserA;
  let workspaceUserB;
  let secondaryWorkspaceA;

  beforeAll(async () => {
    // Register User A
    const resA = await request(app).post("/api/auth/register").send({
      name: "User Alpha",
      email: "alpha@example.com",
      password: "password123",
    });
    tokenUserA = resA.body.data.token;

    // Register User B
    const resB = await request(app).post("/api/auth/register").send({
      name: "User Beta",
      email: "beta@example.com",
      password: "password123",
    });
    tokenUserB = resB.body.data.token;
  });

  test("Default Workspace Provisioning — auto-creates personal workspace upon access", async () => {
    const res = await request(app)
      .get("/api/workspaces")
      .set("Authorization", `Bearer ${tokenUserA}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].role).toEqual("OWNER");
    expect(res.body.data[0].isPersonal).toBe(true);

    workspaceUserA = res.body.data[0]._id;
  });

  test("POST /api/workspaces — User A creates a secondary custom workspace", async () => {
    const res = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${tokenUserA}`)
      .send({ name: "Engineering Team" });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toEqual("Engineering Team");
    expect(res.body.data.role).toEqual("OWNER");

    secondaryWorkspaceA = res.body.data._id;
  });

  test("GET /api/workspaces/:id — User A fetches details of their workspace", async () => {
    const res = await request(app)
      .get(`/api/workspaces/${secondaryWorkspaceA}`)
      .set("Authorization", `Bearer ${tokenUserA}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toEqual("Engineering Team");
    expect(res.body.data.role).toEqual("OWNER");
  });

  test("PATCH /api/workspaces/:id — User A renames their workspace", async () => {
    const res = await request(app)
      .patch(`/api/workspaces/${secondaryWorkspaceA}`)
      .set("Authorization", `Bearer ${tokenUserA}`)
      .send({ name: "Core Engineering" });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toEqual("Core Engineering");
  });

  test("Unauthorized Workspace Access — User B cannot fetch or update User A's workspace", async () => {
    const getRes = await request(app)
      .get(`/api/workspaces/${secondaryWorkspaceA}`)
      .set("Authorization", `Bearer ${tokenUserB}`);
    expect(getRes.statusCode).toEqual(403);

    const patchRes = await request(app)
      .patch(`/api/workspaces/${secondaryWorkspaceA}`)
      .set("Authorization", `Bearer ${tokenUserB}`)
      .send({ name: "Hacked Workspace" });
    expect(patchRes.statusCode).toEqual(403);
  });

  test("CRITICAL SECURITY TEST — Task Isolation between User A (Workspace A) and User B (Workspace B)", async () => {
    // User A creates Task A in Workspace A
    const taskARes = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${tokenUserA}`)
      .set("X-Workspace-Id", workspaceUserA)
      .send({
        title: "Task A - Confidential",
        description: "User A sensitive project data",
      });

    expect(taskARes.statusCode).toEqual(201);
    const taskAId = taskARes.body.data._id;

    // User B fetches default workspace
    const wsBRes = await request(app)
      .get("/api/workspaces")
      .set("Authorization", `Bearer ${tokenUserB}`);
    workspaceUserB = wsBRes.body.data[0]._id;

    // User B creates Task B in Workspace B
    const taskBRes = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${tokenUserB}`)
      .set("X-Workspace-Id", workspaceUserB)
      .send({
        title: "Task B - Private",
        description: "User B private project data",
      });

    expect(taskBRes.statusCode).toEqual(201);
    const taskBId = taskBRes.body.data._id;

    // User A lists tasks in Workspace A -> gets Task A, NOT Task B
    const listARes = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${tokenUserA}`)
      .set("X-Workspace-Id", workspaceUserA);

    expect(listARes.statusCode).toEqual(200);
    const taskIdsA = listARes.body.data.map((t) => t._id);
    expect(taskIdsA).toContain(taskAId);
    expect(taskIdsA).not.toContain(taskBId);

    // User B lists tasks in Workspace B -> gets Task B, NOT Task A
    const listBRes = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${tokenUserB}`)
      .set("X-Workspace-Id", workspaceUserB);

    expect(listBRes.statusCode).toEqual(200);
    const taskIdsB = listBRes.body.data.map((t) => t._id);
    expect(taskIdsB).toContain(taskBId);
    expect(taskIdsB).not.toContain(taskAId);

    // User B attempts to access Workspace A using X-Workspace-Id header -> 403 Forbidden
    const forbiddenRes = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${tokenUserB}`)
      .set("X-Workspace-Id", workspaceUserA);

    expect(forbiddenRes.statusCode).toEqual(403);

    // User B attempts to update Task A -> 404/403 (Task not found in User B's context)
    const updateRes = await request(app)
      .put(`/api/tasks/${taskAId}`)
      .set("Authorization", `Bearer ${tokenUserB}`)
      .set("X-Workspace-Id", workspaceUserB)
      .send({ title: "Overwritten Title" });

    expect(updateRes.statusCode).toEqual(404);

    // User B attempts to delete Task A -> 404
    const deleteRes = await request(app)
      .delete(`/api/tasks/${taskAId}`)
      .set("Authorization", `Bearer ${tokenUserB}`)
      .set("X-Workspace-Id", workspaceUserB);

    expect(deleteRes.statusCode).toEqual(404);
  });

  test("DELETE /api/workspaces/:id — User A deletes their secondary workspace", async () => {
    const delRes = await request(app)
      .delete(`/api/workspaces/${secondaryWorkspaceA}`)
      .set("Authorization", `Bearer ${tokenUserA}`);

    expect(delRes.statusCode).toEqual(200);
    expect(delRes.body.success).toBe(true);
  });
});
