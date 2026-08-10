import {
  generateDeadline,
  generatePriority,
  generateSummary,
  generateSubtasks,
  generateProductivitySuggestions,
  parseNaturalLanguageTask,
} from "../services/ai.service.js";
import { getTaskStatisticsService } from "../services/task.service.js";
import asyncHandler from "../utils/asyncHandler.js";

export const prioritizeTask = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      success: false,
      message: "Title and description are required",
    });
  }

  const priority = await generatePriority(title, description);

  return res.status(200).json({
    success: true,
    priority,
  });
});

export const summarizeTask = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      success: false,
      message: "Title and description are required",
    });
  }

  const summary = await generateSummary(title, description);

  return res.status(200).json({ success: true, summary });
});

export const deadlineSuggestion = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      success: false,
      message: "Title and description are required",
    });
  }

  const estimatedDeadline = await generateDeadline(title, description);

  return res.status(200).json({ success: true, estimatedDeadline });
});

export const subtaskBreakdown = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      success: false,
      message: "Title and description are required",
    });
  }

  const subtasks = await generateSubtasks(title, description);

  return res.status(200).json({
    success: true,
    subtasks,
    count: subtasks.length,
  });
});

export const productivitySuggestions = asyncHandler(async (req, res) => {
  // Get real task stats for this user
  const stats = await getTaskStatisticsService(req.user.id);
  const suggestions = await generateProductivitySuggestions(stats);

  return res.status(200).json({
    success: true,
    suggestions,
    basedOn: {
      total: stats.total,
      overdue: stats.overdue,
      completionRate: stats.completionRate,
    },
  });
});

export const naturalLanguageCreate = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== "string" || text.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: "A task description text is required (min 3 characters)",
    });
  }

  const parsed = await parseNaturalLanguageTask(text.trim().slice(0, 1000));

  if (!parsed) {
    return res.status(422).json({
      success: false,
      message: "Could not parse task from the provided text. Please be more specific.",
    });
  }

  return res.status(200).json({
    success: true,
    data: parsed,
  });
});
