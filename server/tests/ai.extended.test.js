import request from "supertest";
import { app } from "./setup.js";

// NOTE: This test file uses a real Groq API call for the priority test (inherited from ai.test.js)
// New tests that do NOT require Groq (validation/auth layer tests) are added here.

let token;

beforeAll(async () => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "AI Extended Tester", email: "aiext@example.com", password: "Password123" });

  token = res.body.data.token;
});

describe("AI API — validation errors", () => {
  it("rejects prioritize with missing title", async () => {
    const res = await request(app)
      .post("/api/ai/prioritize")
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "Only description, no title" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects prioritize with missing description", async () => {
    const res = await request(app)
      .post("/api/ai/prioritize")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Only title, no description" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects summarize with missing fields", async () => {
    const res = await request(app)
      .post("/api/ai/summarize")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Only title" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects deadline with missing fields", async () => {
    const res = await request(app)
      .post("/api/ai/deadline")
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "Only description" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects subtasks with missing fields", async () => {
    const res = await request(app)
      .post("/api/ai/subtasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Only title" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects natural language with empty text", async () => {
    const res = await request(app)
      .post("/api/ai/natural-language")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects natural language with missing text field", async () => {
    const res = await request(app)
      .post("/api/ai/natural-language")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("AI API — auth protection", () => {
  it("rejects prioritize without token", async () => {
    const res = await request(app)
      .post("/api/ai/prioritize")
      .send({ title: "Test", description: "Test description" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects summarize without token", async () => {
    const res = await request(app)
      .post("/api/ai/summarize")
      .send({ title: "Test", description: "Test description" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects subtasks without token", async () => {
    const res = await request(app)
      .post("/api/ai/subtasks")
      .send({ title: "Test", description: "Test description" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects productivity without token", async () => {
    const res = await request(app)
      .post("/api/ai/productivity");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects natural-language without token", async () => {
    const res = await request(app)
      .post("/api/ai/natural-language")
      .send({ text: "Create a task about something" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe("AI API — invalid token", () => {
  it("rejects requests with a garbage token", async () => {
    const res = await request(app)
      .post("/api/ai/prioritize")
      .set("Authorization", "Bearer garbage.token.value")
      .send({ title: "Test", description: "Test description" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
