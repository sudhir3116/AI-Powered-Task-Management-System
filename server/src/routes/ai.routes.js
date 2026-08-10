import express from "express";
import { prioritizeTask, summarizeTask, deadlineSuggestion } from "../controllers/ai.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

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
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI priority response
 */
router.post("/prioritize", authMiddleware, prioritizeTask);

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
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI summary response
 */
router.post("/summarize", authMiddleware, summarizeTask);

/**
 * @swagger
 * /api/ai/deadline:
 *   post:
 *     summary: Get AI-generated deadline suggestion
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI deadline response
 */
router.post("/deadline", authMiddleware, deadlineSuggestion);

export default router;