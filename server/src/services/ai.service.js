import groq from "../ai/groq.js";

const completionText = async (prompt, temperature = 0) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }
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
- Each string must be a concise, single actionable step (e.g. "Review assessment syllabus").
- Do NOT join multiple steps with arrows or symbols like "Aptitude -> Coding -> Mock test".
- Generate between 3 and 5 subtasks.
- Example output: ["Review assessment syllabus", "Practice aptitude questions", "Practice coding problems", "Take a mock assessment"]
`;

  try {
    const output = await completionText(prompt, 0.3);
    const match = output.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => typeof item === "string" && item.trim().length > 0)
      .slice(0, 5)
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
- Return ONLY a valid JSON object with these fields: title, description, priority, dueDate, subtasks.
- title: short, clear task name (max 120 characters).
- description: expanded description of what needs to be done (max 500 characters).
- priority: exactly one of "High", "Medium", or "Low".
- dueDate: ISO date string (YYYY-MM-DD) if a date is mentioned or inferable (e.g. "by Friday"), or null if no date mentioned.
- subtasks: JSON array of 3 to 5 actionable subtask strings relevant to the task, or empty array if none needed.
- No markdown, no code fences, no extra text outside the JSON object.
- Example: {"title": "Prepare for TCS assessment", "description": "Prepare for the assessment through focused aptitude and coding practice.", "priority": "High", "dueDate": "2026-08-14", "subtasks": ["Review assessment syllabus", "Practice aptitude questions", "Practice coding problems", "Take a mock assessment"]}
`;

  try {
    const output = await completionText(prompt, 0.2);
    const match = output.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);

    if (!parsed.title || !parsed.description) return null;

    const allowedPriorities = ["High", "Medium", "Low"];
    const subtasks = Array.isArray(parsed.subtasks)
      ? parsed.subtasks
          .filter((item) => typeof item === "string" && item.trim().length > 0)
          .slice(0, 5)
          .map((item) => item.trim().slice(0, 200))
      : [];

    return {
      title: String(parsed.title).trim().slice(0, 120),
      description: String(parsed.description).trim().slice(0, 500),
      priority: allowedPriorities.includes(parsed.priority) ? parsed.priority : "Medium",
      dueDate: parsed.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(parsed.dueDate) ? parsed.dueDate : null,
      subtasks,
    };
  } catch {
    return null;
  }
};

export const generateTasksFromNote = async (title, content) => {
  const prompt = `
You are an AI assistant that analyzes study notes/documents and proposes actionable tasks and subtasks.

Note Title: ${title}
Note Content: ${content}

Rules:
- Return ONLY a valid JSON object with fields: title, description, priority, subtasks.
- title: concise task title derived from the note.
- description: clear summary of what needs to be executed based on the note.
- priority: "High", "Medium", or "Low".
- subtasks: JSON array of 3 to 5 actionable subtasks extracted from the note topics.
- No markdown, no code fences.
`;

  try {
    const output = await completionText(prompt, 0.3);
    const match = output.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);
    return {
      title: String(parsed.title || title).trim().slice(0, 120),
      description: String(parsed.description || content).trim().slice(0, 500),
      priority: ["High", "Medium", "Low"].includes(parsed.priority) ? parsed.priority : "Medium",
      subtasks: Array.isArray(parsed.subtasks)
        ? parsed.subtasks
            .filter((item) => typeof item === "string" && item.trim().length > 0)
            .slice(0, 5)
            .map((item) => item.trim().slice(0, 200))
        : [],
    };
  } catch {
    return {
      title: `Study & execute: ${title}`,
      description: content.slice(0, 300),
      priority: "Medium",
      subtasks: ["Review note topics", "Practice key concepts", "Solve practice problems"],
    };
  }
};

export const generateNoteSummary = async (title, content) => {
  const prompt = `
You are an expert AI knowledge manager.

Note Title: ${title}
Note Content:
${content}

Rules:
- Provide a clear, executive-level summary of the document.
- Limit to 2 to 4 sentences.
- Focus on the core message and purpose.
`;
  try {
    const text = await completionText(prompt, 0.3);
    return text || `Summary for "${title}": Covers core concepts and key notes.`;
  } catch {
    return `Summary for "${title}": Covers core concepts and key notes.`;
  }
};

export const explainNoteContent = async (title, content) => {
  const prompt = `
You are an AI educational mentor.

Note Title: ${title}
Note Content:
${content}

Rules:
- Explain the key ideas in plain, simple, easy-to-understand language.
- Structure your response into 3 sections: 
  1. What this document is about
  2. Key concepts explained simply
  3. Real-world application / Context
`;
  try {
    const text = await completionText(prompt, 0.4);
    return text || `Explanation for ${title}:\n\n- Overview: This document covers key topics.\n- Core concepts: Essential principles for study and practice.`;
  } catch {
    return `Explanation for ${title}:\n\n- Overview: This document covers key topics.\n- Core concepts: Essential principles for study and practice.`;
  }
};

export const generateNoteKeyPoints = async (title, content) => {
  const prompt = `
You are an AI note summarizer.

Note Title: ${title}
Note Content:
${content}

Rules:
- Extract 4 to 6 key takeaways/bullet points from this content.
- Return ONLY a valid JSON array of strings.
- Example: ["Key point 1", "Key point 2"]
`;
  try {
    const output = await completionText(prompt, 0.3);
    const match = output.match(/\[[\s\S]*\]/);
    if (!match) return ["Review main topics in note", "Identify key terms and formulas", "Apply concepts to practice problems"];
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).slice(0, 6) : [];
  } catch {
    return ["Review main topics in note", "Identify key terms and formulas", "Apply concepts to practice problems"];
  }
};

export const generateNoteQuiz = async (title, content) => {
  const prompt = `
You are an AI tutor generating a study quiz based on note content.

Note Title: ${title}
Note Content:
${content}

Rules:
- Return ONLY a valid JSON array of 3 multiple choice questions.
- Format per item: { "question": "...", "options": ["A", "B", "C", "D"], "answer": 0, "explanation": "..." } (answer index 0-3).
- No markdown, no extra text.
`;
  try {
    const output = await completionText(prompt, 0.3);
    const match = output.match(/\[[\s\S]*\]/);
    if (!match) {
      return [
        {
          question: `What is the primary topic of "${title}"?`,
          options: ["Core concepts outlined in document", "Secondary reference material", "Unrelated topics", "General overview"],
          answer: 0,
          explanation: "The document focuses on the primary concepts stated in its title and content.",
        },
      ];
    }
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return [
      {
        question: `What is the primary topic of "${title}"?`,
        options: ["Core concepts outlined in document", "Secondary reference material", "Unrelated topics", "General overview"],
        answer: 0,
        explanation: "The document focuses on the primary concepts stated in its title and content.",
      },
    ];
  }
};

export const generateNoteStudyChecklist = async (title, content) => {
  const prompt = `
You are an AI study plan coach.

Note Title: ${title}
Note Content:
${content}

Rules:
- Return ONLY a valid JSON array of 4 to 6 actionable study checklist items.
- Example: ["Read section 1 thoroughly", "Solve practice problem 1", "Create flashcards for formulas"]
`;
  try {
    const output = await completionText(prompt, 0.3);
    const match = output.match(/\[[\s\S]*\]/);
    if (!match) return ["Review document outline", "Highlight key terms", "Complete study exercises"];
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).slice(0, 6) : [];
  } catch {
    return ["Review document outline", "Highlight key terms", "Complete study exercises"];
  }
};

