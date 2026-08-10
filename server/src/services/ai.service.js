import groq from "../ai/groq.js";

const completionText = async (prompt, temperature = 0) => {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature,
  });

  return completion.choices?.[0]?.message?.content?.trim() || "";
};

const fallbackSummary = (title, description) =>
  `${title}: ${description}`.replace(/\s+/g, " ").trim().slice(0, 240);

export const generatePriority = async (title, description) => {
  const prompt = `
You are an AI task prioritization assistant.

Task Title:
${title}

Task Description:
${description}

Rules:
- Respond with ONLY one word.
- Choose exactly one of: High, Medium, Low.
`;

  try {
    const output = await completionText(prompt);
    const match = output.match(/\b(high|medium|low)\b/i);
    return match ? `${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()}` : "Medium";
  } catch {
    return "Medium";
  }
};

export const generateSummary = async (title, description) => {
  const prompt = `
You are an AI assistant that creates concise task summaries.

Task Title:
${title}

Task Description:
${description}

Rules:
- Provide a single concise summary of the task.
- Keep it short: one or two sentences maximum.
- Do not add any extra commentary or notes.
`;

  try {
    const output = await completionText(prompt, 0.2);
    return output.length > 0 && output.length <= 500 ? output : fallbackSummary(title, description);
  } catch {
    return fallbackSummary(title, description);
  }
};

export const generateDeadline = async (title, description) => {
  const prompt = `
You are an AI assistant that suggests an appropriate deadline for a task.

Task Title:
${title}

Task Description:
${description}

Rules:
- Respond with ONLY one of these exact phrases: Today, Tomorrow, Within 3 days, Within a week.
- Choose the most appropriate single option based on urgency and effort.
`;

  try {
    const output = await completionText(prompt);
    const allowedDeadlines = ["Today", "Tomorrow", "Within 3 days", "Within a week"];
    return allowedDeadlines.find((deadline) => deadline.toLowerCase() === output.toLowerCase()) || "Within a week";
  } catch {
    return "Within a week";
  }
};

export const generateSubtasks = async (title, description) => {
  const prompt = `
You are an AI assistant that breaks down tasks into actionable subtasks.

Task Title:
${title}

Task Description:
${description}

Rules:
- Return ONLY a valid JSON array of strings (no markdown, no code fences, no extra text).
- Each string is a concise, actionable subtask.
- Generate between 3 and 7 subtasks.
- Example output: ["Research the topic", "Create an outline", "Write the first draft"]
`;

  try {
    const output = await completionText(prompt, 0.3);
    // Extract JSON array from output (handle potential surrounding text)
    const match = output.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => typeof item === "string" && item.trim().length > 0)
      .slice(0, 7)
      .map((item) => item.trim().slice(0, 200));
  } catch {
    return [];
  }
};

export const generateProductivitySuggestions = async (taskStats) => {
  const { total, pending, inProgress, completed, overdue, completionRate } = taskStats;

  const prompt = `
You are an AI productivity coach analyzing a user's task management data.

Current Task Statistics:
- Total tasks: ${total}
- Pending: ${pending}
- In Progress: ${inProgress}
- Completed: ${completed}
- Overdue: ${overdue}
- Completion rate: ${completionRate}%

Rules:
- Return ONLY a valid JSON array of 3 to 5 short, actionable productivity tip strings.
- Each tip should be specific to the data above. Do not give generic advice.
- No markdown, no code fences, no extra text outside the JSON array.
- Example: ["Focus on the ${overdue} overdue tasks first today", "Your completion rate is strong at ${completionRate}%, keep it up!"]
`;

  try {
    const output = await completionText(prompt, 0.5);
    const match = output.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => typeof item === "string" && item.trim().length > 0)
      .slice(0, 5)
      .map((item) => item.trim());
  } catch {
    return [];
  }
};

export const parseNaturalLanguageTask = async (text) => {
  const today = new Date().toISOString().slice(0, 10);

  const prompt = `
You are an AI assistant that converts natural language task descriptions into structured task data.

Today's date: ${today}

User input:
"${text}"

Rules:
- Return ONLY a valid JSON object with these fields: title, description, priority, dueDate.
- title: short, clear task name (max 120 characters).
- description: expanded description of what needs to be done (max 500 characters).
- priority: exactly one of "High", "Medium", or "Low".
- dueDate: ISO date string (YYYY-MM-DD) if a date is mentioned, or null if no date mentioned.
- No markdown, no code fences, no extra text.
- Example: {"title": "Write project report", "description": "Complete the Q3 project report covering all milestones and deliverables", "priority": "High", "dueDate": "2024-12-31"}
`;

  try {
    const output = await completionText(prompt, 0.2);
    const match = output.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);

    // Validate required fields
    if (!parsed.title || !parsed.description) return null;

    // Sanitize and validate
    const allowedPriorities = ["High", "Medium", "Low"];
    return {
      title: String(parsed.title).trim().slice(0, 120),
      description: String(parsed.description).trim().slice(0, 500),
      priority: allowedPriorities.includes(parsed.priority) ? parsed.priority : "Medium",
      dueDate: parsed.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(parsed.dueDate) ? parsed.dueDate : null,
    };
  } catch {
    return null;
  }
};
