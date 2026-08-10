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
