import request from "supertest";
import { app } from "./setup.js";

let token;
let otherUserToken;

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
  });

  it("gets tasks", async () => {
    const res = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("updates a task", async () => {
    const createRes = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Update test", description: "Will modify later" });

    const taskId = createRes.body.data._id;

    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "Completed" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("Completed");
  });

  it("deletes a task", async () => {
    const createRes = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Delete test", description: "Will be removed" });

    const taskId = createRes.body.data._id;

    const res = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("deleted");
  });

  it("does not expose another user's tasks", async () => {
    const createRes = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Private task", description: "Only its owner can access this" });

    const taskId = createRes.body.data._id;
    const listRes = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${otherUserToken}`);
    const updateRes = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${otherUserToken}`)
      .send({ status: "Completed" });
    const deleteRes = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${otherUserToken}`);

    expect(listRes.body.data.some((task) => task._id === taskId)).toBe(false);
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
});
