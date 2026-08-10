import request from "supertest";
import { app } from "./setup.js";

let token;

beforeAll(async () => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "AI Tester", email: "aitester@example.com", password: "Password123" });

  token = res.body.data.token;
});

describe("AI API", () => {
  it("returns AI priority", async () => {
    const res = await request(app)
      .post("/api/ai/prioritize")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Ship feature", description: "Release the dashboard to users" });

    expect(res.status).toBe(200);
    expect(res.body.priority).toBeDefined();
  });
});
