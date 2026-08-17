import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import app from "../src/app.js";
import groq from "../src/ai/groq.js";
import { jest } from "@jest/globals";

process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || "mock-key";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

beforeEach(() => {
  if (groq.chat && groq.chat.completions) {
    if (!jest.isMockFunction(groq.chat.completions.create)) {
      jest.spyOn(groq.chat.completions, "create");
    }
    groq.chat.completions.create.mockImplementation(async ({ messages }) => {
      const prompt = messages?.[0]?.content || "";

      if (prompt.includes("prioritization assistant")) {
        return { choices: [{ message: { content: "High" } }] };
      }
      if (prompt.includes("concise task summaries")) {
        return { choices: [{ message: { content: "Summary of task" } }] };
      }
      if (prompt.includes("suggests an appropriate deadline")) {
        return { choices: [{ message: { content: "Tomorrow" } }] };
      }
      if (prompt.includes("actionable subtasks")) {
        return { choices: [{ message: { content: '["Subtask 1", "Subtask 2"]' } }] };
      }
      if (prompt.includes("productivity coach")) {
        return { choices: [{ message: { content: '["Tip 1", "Tip 2"]' } }] };
      }
      if (prompt.includes("converts natural language task")) {
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "Parsed Task",
                  description: "Parsed Description",
                  priority: "High",
                  dueDate: "2026-08-20",
                  subtasks: ["Step 1", "Step 2"],
                }),
              },
            },
          ],
        };
      }

      return { choices: [{ message: { content: "Mock response" } }] };
    });
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

export { app };
