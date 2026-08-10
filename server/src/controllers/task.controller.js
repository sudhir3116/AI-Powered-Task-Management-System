import {
  createTaskService,
  getAllTasksService,
  getTaskStatisticsService,
  updateTaskService,
  deleteTaskService,
} from "../services/task.service.js";

import { generatePriority } from "../services/ai.service.js";
import asyncHandler from "../utils/asyncHandler.js";

const allowedSortFields = new Set(["createdAt", "updatedAt", "title", "status", "priority"]);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Create Task
export const createTask = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  // Generate AI Priority
  const priority = await generatePriority(title, description);

  // Attach priority to request body
  const taskData = {
    ...req.body,
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
    getAllTasksService(
    filter,
    page,
    limit,
    sort,
    order
    ),
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

// Update Task
export const updateTask = asyncHandler(async (req, res) => {
  const updatedTask = await updateTaskService(
    req.params.id,
    req.user.id,
    req.body
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
