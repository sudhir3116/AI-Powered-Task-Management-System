import { generateDeadline, generatePriority, generateSummary } from "../services/ai.service.js";
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

  return res.status(200).json({ summary });
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

  return res.status(200).json({ estimatedDeadline });
});
