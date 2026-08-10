import express from "express";
import { check, param } from "express-validator";
import validateRequest from "../middleware/validation.middleware.js";
import {
  createTask,
  getAllTasks,
  getStatistics,
  updateTask,
  deleteTask,
} from "../controllers/task.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a task (AI priority auto-assigned)
 *     tags: [Tasks]
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
 *               dueDate:
 *                 type: string
 *                 format: date
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               estimatedTime:
 *                 type: number
 *                 description: Estimated time in minutes
 *     responses:
 *       201:
 *         description: Task created successfully
 *   get:
 *     summary: Get all tasks with pagination, search, sort, and filters
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, title, status, priority, dueDate]
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, "In Progress", Completed]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [High, Medium, Low]
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *       - in: query
 *         name: overdue
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Tasks list with statistics and pagination
 */
router.post(
  "/",
  authMiddleware,
  [
    check("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 120 }).withMessage("Title must be at most 120 characters"),
    check("description").trim().notEmpty().withMessage("Description is required").isLength({ max: 2000 }).withMessage("Description must be at most 2000 characters"),
    check("dueDate").optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage("Due date must be a valid date").toDate(),
    check("estimatedTime").optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 10080 }).withMessage("Estimated time must be between 1 and 10080 minutes"),
  ],
  validateRequest,
  createTask
);

router.get("/", authMiddleware, getAllTasks);

/**
 * @swagger
 * /api/tasks/statistics:
 *   get:
 *     summary: Get task statistics and analytics for the dashboard
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Task statistics including overdue, priority distribution, completion rate
 */
router.get("/statistics", authMiddleware, getStatistics);

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Pending, "In Progress", Completed]
 *               priority:
 *                 type: string
 *                 enum: [High, Medium, Low]
 *               dueDate:
 *                 type: string
 *                 format: date
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               estimatedTime:
 *                 type: number
 *     responses:
 *       200:
 *         description: Task updated successfully
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted successfully
 */
router.put(
  "/:id",
  authMiddleware,
  [
    param("id").isMongoId().withMessage("Invalid task id"),
    check("title").optional().trim().notEmpty().withMessage("Title cannot be empty").isLength({ max: 120 }).withMessage("Title must be at most 120 characters"),
    check("description").optional().trim().notEmpty().withMessage("Description cannot be empty").isLength({ max: 2000 }).withMessage("Description must be at most 2000 characters"),
    check("status").optional().isIn(["Pending", "In Progress", "Completed"]).withMessage("Invalid status"),
    check("priority").optional().isIn(["High", "Medium", "Low"]).withMessage("Invalid priority"),
    check("dueDate").optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage("Due date must be a valid date").toDate(),
    check("estimatedTime").optional({ nullable: true, checkFalsy: true }).isInt({ min: 1, max: 10080 }).withMessage("Estimated time must be between 1 and 10080 minutes"),
  ],
  validateRequest,
  updateTask
);

router.delete(
  "/:id",
  authMiddleware,
  [param("id").isMongoId().withMessage("Invalid task id")],
  validateRequest,
  deleteTask
);

export default router;
