import {
  createTaskService,
  getAllTasksService,
  getTaskStatisticsService,
  updateTaskService,
  deleteTaskService,
} from "../services/task.service.js";

import { generatePriority } from "../services/ai.service.js";
import asyncHandler from "../utils/asyncHandler.js";

const allowedSortFields = new Set(["createdAt", "updatedAt", "title", "status", "priority", "dueDate"]);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Create Task
export const createTask = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  // Generate AI Priority
  const priority = await generatePriority(title, description);

  // Parse tags from comma-separated string if needed
  let tags = req.body.tags;
  if (typeof tags === "string") {
    tags = tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10);
  }

  const taskData = {
    ...req.body,
    tags: tags || [],
    priority,
    user: req.user.id,
  };

  const task = await createTaskService(taskData);

  res.status(201).json({
    success: true,
    message: "Task created successfully",
    data: task,
  });
});

// Get All Tasks
export const getAllTasks = asyncHandler(async (req, res) => {
  const filter = { user: req.user.id };

  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.priority) {
    filter.priority = req.query.priority;
  }
  if (req.query.tag) {
    filter.tags = req.query.tag;
  }
  // Overdue filter
  if (req.query.overdue === "true") {
    filter.status = { $in: ["Pending", "In Progress"] };
    filter.dueDate = { $lt: new Date(), $ne: null };
  }
  // Search by title or description (case-insensitive)
  if (req.query.search) {
    const q = req.query.search.trim().slice(0, 100);
    if (q.length) {
      const searchTerm = escapeRegex(q);
      filter.$or = [
        { title: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
      ];
    }
  }

  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const sort = allowedSortFields.has(req.query.sort) ? req.query.sort : "createdAt";
  const order = req.query.order === "asc" ? "asc" : "desc";

  const [{ tasks, totalTasks, totalPages }, statistics] = await Promise.all([
    getAllTasksService(filter, page, limit, sort, order),
    getTaskStatisticsService(req.user.id),
  ]);

  res.status(200).json({
    success: true,
    page,
    limit,
    totalPages,
    totalTasks,
    statistics,
    data: tasks,
  });
});

// Get Task Statistics (dedicated endpoint for dashboard)
export const getStatistics = asyncHandler(async (req, res) => {
  const statistics = await getTaskStatisticsService(req.user.id);

  res.status(200).json({
    success: true,
    data: statistics,
  });
});

// Update Task
export const updateTask = asyncHandler(async (req, res) => {
  // Parse tags from comma-separated string if needed
  let body = { ...req.body };
  if (typeof body.tags === "string") {
    body.tags = body.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10);
  }

  const updatedTask = await updateTaskService(
    req.params.id,
    req.user.id,
    body
  );

  if (!updatedTask) {
    return res.status(404).json({
      success: false,
      message: "Task not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Task updated successfully",
    data: updatedTask,
  });
});

// Delete Task
export const deleteTask = asyncHandler(async (req, res) => {
  const deletedTask = await deleteTaskService(req.params.id, req.user.id);

  if (!deletedTask) {
    return res.status(404).json({
      success: false,
      message: "Task not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Task deleted successfully",
  });
});
