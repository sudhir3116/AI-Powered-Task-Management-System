import request from "supertest";
import { app } from "./setup.js";
import groq from "../src/ai/groq.js";
import { generateSubtasks, parseNaturalLanguageTask } from "../src/services/ai.service.js";

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

  it("handles malformed (non-JSON) Groq response gracefully for generateSubtasks", async () => {
    groq.chat.completions.create.mockResolvedValueOnce({
      choices: [{ message: { content: "This is invalid non-JSON output from AI" } }],
    });

    const result = await generateSubtasks("Fix bug", "Fix the critical bug in production");
    expect(result).toEqual([]);
  });

  it("handles malformed (non-JSON) Groq response gracefully for parseNaturalLanguageTask", async () => {
    groq.chat.completions.create.mockResolvedValueOnce({
      choices: [{ message: { content: "This is invalid non-JSON output from AI" } }],
    });

    const result = await parseNaturalLanguageTask("Do taxes by tomorrow");
    expect(result).toBeNull();
  });
});
