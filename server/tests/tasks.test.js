import request from "supertest";
import { app } from "./setup.js";

let token;
let otherUserToken;
let taskId;

beforeAll(async () => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Task Tester", email: "tasktester@example.com", password: "Password123" });

  token = res.body.data.token;

  const otherUserRes = await request(app)
    .post("/api/auth/register")
    .send({ name: "Other Task Tester", email: "othertasktester@example.com", password: "Password123" });

  otherUserToken = otherUserRes.body.data.token;
});

describe("Task API", () => {
  it("creates a task", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Write tests", description: "Add Jest tests", dueDate: "2026-08-15" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Write tests");
    expect(res.body.data.dueDate).toContain("2026-08-15");
    taskId = res.body.data._id;
  });

  it("creates a task with tags and estimatedTime", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Tagged Task",
        description: "Task with tags",
        tags: ["work", "urgent"],
        estimatedTime: 90,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.tags).toEqual(expect.arrayContaining(["work", "urgent"]));
    expect(res.body.data.estimatedTime).toBe(90);
  });

  it("gets tasks", async () => {
    const res = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.statistics).toBeDefined();
    expect(typeof res.body.statistics.total).toBe("number");
    expect(typeof res.body.statistics.overdue).toBe("number");
    expect(typeof res.body.statistics.completionRate).toBe("number");
  });

  it("filters tasks by status", async () => {
    const res = await request(app)
      .get("/api/tasks?status=Pending")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((t) => t.status === "Pending")).toBe(true);
  });

  it("searches tasks by title", async () => {
    const res = await request(app)
      .get("/api/tasks?search=Write tests")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some((t) => t.title === "Write tests")).toBe(true);
  });

  it("paginates tasks correctly", async () => {
    const res = await request(app)
      .get("/api/tasks?page=1&limit=2")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.page).toBe(1);
    expect(res.body.totalPages).toBeGreaterThanOrEqual(1);
  });

  it("updates a task", async () => {
    const createRes = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Update test", description: "Will modify later" });

    const createdTaskId = createRes.body.data._id;

    const res = await request(app)
      .put(`/api/tasks/${createdTaskId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "Completed" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("Completed");
  });

  it("auto-stamps completedAt when marking Completed", async () => {
    const createRes = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Stamp test", description: "Will be completed" });

    const createdTaskId = createRes.body.data._id;

    const res = await request(app)
      .put(`/api/tasks/${createdTaskId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "Completed" });

    expect(res.status).toBe(200);
    expect(res.body.data.completedAt).toBeDefined();
    expect(res.body.data.completedAt).not.toBeNull();
  });

  it("returns task statistics via dedicated endpoint", async () => {
    const res = await request(app)
      .get("/api/tasks/statistics")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("total");
    expect(res.body.data).toHaveProperty("overdue");
    expect(res.body.data).toHaveProperty("completionRate");
    expect(res.body.data).toHaveProperty("priorityDistribution");
    expect(res.body.data).toHaveProperty("upcomingDeadlines");
  });

  it("deletes a task", async () => {
    const createRes = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Delete test", description: "Will be removed" });

    const deleteTaskId = createRes.body.data._id;

    const res = await request(app)
      .delete(`/api/tasks/${deleteTaskId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("deleted");
  });

  it("does not expose another user's tasks", async () => {
    const createRes = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Private task", description: "Only its owner can access this" });

    const privateTaskId = createRes.body.data._id;
    const listRes = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${otherUserToken}`);
    const updateRes = await request(app)
      .put(`/api/tasks/${privateTaskId}`)
      .set("Authorization", `Bearer ${otherUserToken}`)
      .send({ status: "Completed" });
    const deleteRes = await request(app)
      .delete(`/api/tasks/${privateTaskId}`)
      .set("Authorization", `Bearer ${otherUserToken}`);

    expect(listRes.body.data.some((task) => task._id === privateTaskId)).toBe(false);
    expect(updateRes.status).toBe(404);
    expect(deleteRes.status).toBe(404);
  });

  it("rejects malformed task ids", async () => {
    const res = await request(app)
      .put("/api/tasks/not-a-valid-id")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "Completed" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/tasks");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects task creation without required fields", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
