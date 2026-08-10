import express from "express";
import { check } from "express-validator";
import {
  prioritizeTask,
  summarizeTask,
  deadlineSuggestion,
  subtaskBreakdown,
  productivitySuggestions,
  naturalLanguageCreate,
} from "../controllers/ai.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import validateRequest from "../middleware/validation.middleware.js";

const router = express.Router();

const requireTitleAndDescription = [
  check("title").notEmpty().withMessage("Title is required"),
  check("description").notEmpty().withMessage("Description is required"),
  validateRequest,
];

/**
 * @swagger
 * /api/ai/prioritize:
 *   post:
 *     summary: Get AI-generated task priority
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns High, Medium, or Low priority
 */
router.post("/prioritize", authMiddleware, requireTitleAndDescription, prioritizeTask);

/**
 * @swagger
 * /api/ai/summarize:
 *   post:
 *     summary: Get AI-generated task summary
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI-generated 1-2 sentence summary
 */
router.post("/summarize", authMiddleware, requireTitleAndDescription, summarizeTask);

/**
 * @swagger
 * /api/ai/deadline:
 *   post:
 *     summary: Get AI-suggested deadline for a task
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Suggested deadline (Today, Tomorrow, Within 3 days, Within a week)
 */
router.post("/deadline", authMiddleware, requireTitleAndDescription, deadlineSuggestion);

/**
 * @swagger
 * /api/ai/subtasks:
 *   post:
 *     summary: AI-generated subtask breakdown for a task
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Array of 3-7 actionable subtask strings
 */
router.post("/subtasks", authMiddleware, requireTitleAndDescription, subtaskBreakdown);

/**
 * @swagger
 * /api/ai/productivity:
 *   post:
 *     summary: Get AI productivity suggestions based on task data
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Personalized productivity suggestions based on the user's task statistics
 */
router.post("/productivity", authMiddleware, productivitySuggestions);

/**
 * @swagger
 * /api/ai/natural-language:
 *   post:
 *     summary: Parse natural language text into a structured task
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *                 description: Natural language task description
 *     responses:
 *       200:
 *         description: Structured task with title, description, priority, dueDate
 *       422:
 *         description: Could not parse the provided text
 */
router.post(
  "/natural-language",
  authMiddleware,
  [check("text").notEmpty().withMessage("Text is required"), validateRequest],
  naturalLanguageCreate
);

export default router;