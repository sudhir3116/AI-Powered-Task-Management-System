import {
  createTaskService,
  getAllTasksService,
  getTaskStatisticsService,
  getTaskByIdService,
  updateTaskService,
  deleteTaskService,
} from "../services/task.service.js";
import {
  getTaskCommentsService,
  createCommentService,
  deleteCommentService,
  getTaskActivityService,
} from "../services/comment.service.js";

import { generatePriority } from "../services/ai.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import OrganizationMember from "../models/organizationMember.model.js";
import { createNotification } from "../services/notification.service.js";
import { createAuditLog } from "../services/auditLog.service.js";
import { emitToWorkspace } from "../socket.js";

const allowedSortFields = new Set(["createdAt", "updatedAt", "title", "status", "priority", "dueDate"]);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Create Task
export const createTask = asyncHandler(async (req, res) => {
  const { title, description, assignedTo } = req.body;

  // Use explicit user priority if provided, otherwise generate AI Priority
  const priority =
    req.body.priority && ["High", "Medium", "Low"].includes(req.body.priority)
      ? req.body.priority
      : await generatePriority(title, description);

  // Parse tags from comma-separated string if needed
  let tags = req.body.tags;
  if (typeof tags === "string") {
    tags = tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10);
  }

  let validAssignedTo = null;
  if (assignedTo && req.workspace?._id) {
    const isMember = await OrganizationMember.findOne({
      organization: req.workspace._id,
      user: assignedTo,
    });
    if (isMember) {
      validAssignedTo = assignedTo;
    } else {
      const error = new Error("Assigned user must be a member of the current workspace.");
      error.statusCode = 400;
      throw error;
    }
  }

  const taskData = {
    ...req.body,
    tags: tags || [],
    priority,
    user: req.user.id,
    createdBy: req.user.id,
    assignedTo: validAssignedTo,
    organization: req.workspace?._id || null,
  };

  const task = await createTaskService(taskData);

  if (req.workspace?._id) {
    void createAuditLog({
      organizationId: req.workspace._id,
      actorId: req.user.id,
      action: "task_created",
      entityType: "Task",
      entityId: task._id.toString(),
      metadata: { title: task.title },
    });

    if (validAssignedTo && validAssignedTo.toString() !== req.user.id.toString()) {
      void createNotification({
        userId: validAssignedTo,
        organizationId: req.workspace._id,
        type: "TASK_ASSIGNED",
        title: "New Task Assigned",
        message: `You were assigned task "${task.title}"`,
        metadata: { taskId: task._id },
      });

      void createAuditLog({
        organizationId: req.workspace._id,
        actorId: req.user.id,
        action: "task_assigned",
        entityType: "Task",
        entityId: task._id.toString(),
        metadata: { title: task.title, assignedTo: validAssignedTo },
      });
    }

    emitToWorkspace(req.workspace._id.toString(), "task.created", task);
  }

  res.status(201).json({
    success: true,
    message: "Task created successfully",
    data: task,
  });
});

// Get All Tasks
export const getAllTasks = asyncHandler(async (req, res) => {
  const filter = req.workspace?._id
    ? { organization: req.workspace._id }
    : { user: req.user.id };

  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.priority) {
    filter.priority = req.query.priority;
  }
  if (req.query.tag) {
    filter.tags = req.query.tag;
  }
  if (req.query.assignment === "assigned_to_me") {
    filter.assignedTo = req.user.id;
  } else if (req.query.assignment === "assigned_by_me") {
    filter.createdBy = req.user.id;
  } else if (req.query.assignment === "my_tasks") {
    filter.user = req.user.id;
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
    getTaskStatisticsService(req.user.id, req.workspace?._id),
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
  const statistics = await getTaskStatisticsService(req.user.id, req.workspace?._id);

  res.status(200).json({
    success: true,
    data: statistics,
  });
});

// Update Task
export const updateTask = asyncHandler(async (req, res) => {
  let body = { ...req.body };
  if (typeof body.tags === "string") {
    body.tags = body.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10);
  }

  const updatedTask = await updateTaskService(
    req.params.id,
    req.user.id,
    body,
    req.workspace?._id
  );

  if (!updatedTask) {
    return res.status(404).json({
      success: false,
      message: "Task not found",
    });
  }

  if (req.workspace?._id) {
    // Audit log for every update
    void createAuditLog({
      organizationId: req.workspace._id,
      actorId: req.user.id,
      action: "task_updated",
      entityType: "Task",
      entityId: updatedTask._id.toString(),
      metadata: { title: updatedTask.title, status: updatedTask.status },
    });

    // TASK_COMPLETED notification to assigned user (if different from actor)
    if (
      updatedTask.status === "Completed" &&
      updatedTask.assignedTo &&
      updatedTask.assignedTo.toString() !== req.user.id.toString()
    ) {
      void createNotification({
        userId: updatedTask.assignedTo,
        organizationId: req.workspace._id,
        type: "TASK_COMPLETED",
        title: "Task Completed",
        message: `Task "${updatedTask.title}" has been marked as completed`,
        metadata: { taskId: updatedTask._id },
      });

      void createAuditLog({
        organizationId: req.workspace._id,
        actorId: req.user.id,
        action: "task_completed",
        entityType: "Task",
        entityId: updatedTask._id.toString(),
        metadata: { title: updatedTask.title },
      });
    }

    // TASK_UPDATED notification to assigned user (if different from actor, any status)
    if (
      updatedTask.status !== "Completed" &&
      updatedTask.assignedTo &&
      updatedTask.assignedTo.toString() !== req.user.id.toString()
    ) {
      void createNotification({
        userId: updatedTask.assignedTo,
        organizationId: req.workspace._id,
        type: "TASK_UPDATED",
        title: "Task Updated",
        message: `Task "${updatedTask.title}" has been updated`,
        metadata: { taskId: updatedTask._id },
      });
    }

    emitToWorkspace(req.workspace._id.toString(), "task.updated", updatedTask);
  }

  res.status(200).json({
    success: true,
    message: "Task updated successfully",
    data: updatedTask,
  });
});

// Delete Task
export const deleteTask = asyncHandler(async (req, res) => {
  const deletedTask = await deleteTaskService(
    req.params.id,
    req.user.id,
    req.workspace?._id
  );

  if (!deletedTask) {
    return res.status(404).json({
      success: false,
      message: "Task not found",
    });
  }

  if (req.workspace?._id) {
    void createAuditLog({
      organizationId: req.workspace._id,
      actorId: req.user.id,
      action: "task_deleted",
      entityType: "Task",
      entityId: deletedTask._id.toString(),
      metadata: { title: deletedTask.title },
    });

    emitToWorkspace(req.workspace._id.toString(), "task.deleted", { taskId: deletedTask._id.toString() });
  }

  res.status(200).json({
    success: true,
    message: "Task deleted successfully",
  });
});

// Get Single Task by ID
export const getTaskById = asyncHandler(async (req, res) => {
  const task = await getTaskByIdService(req.params.id, req.user.id, req.workspace?._id);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found",
    });
  }

  res.status(200).json({
    success: true,
    data: task,
  });
});

// Get Task Comments
export const getTaskComments = asyncHandler(async (req, res) => {
  const workspaceId = req.workspace?._id;
  if (!workspaceId) {
    return res.status(400).json({ success: false, message: "Workspace context required" });
  }

  const comments = await getTaskCommentsService(req.params.id, workspaceId);
  res.status(200).json({
    success: true,
    data: comments,
  });
});

// Create Comment
export const createComment = asyncHandler(async (req, res) => {
  const workspaceId = req.workspace?._id;
  if (!workspaceId) {
    return res.status(400).json({ success: false, message: "Workspace context required" });
  }

  const comment = await createCommentService({
    taskId: req.params.id,
    organizationId: workspaceId,
    userId: req.user.id,
    content: req.body.content,
  });

  emitToWorkspace(workspaceId.toString(), "comment.created", comment);

  res.status(201).json({
    success: true,
    message: "Comment added successfully",
    data: comment,
  });
});

// Delete Comment
export const deleteComment = asyncHandler(async (req, res) => {
  const workspaceId = req.workspace?._id;
  if (!workspaceId) {
    return res.status(400).json({ success: false, message: "Workspace context required" });
  }

  await deleteCommentService({
    commentId: req.params.commentId,
    taskId: req.params.id,
    organizationId: workspaceId,
    userId: req.user.id,
    userRole: req.membership?.role || "MEMBER",
  });

  emitToWorkspace(workspaceId.toString(), "comment.deleted", {
    commentId: req.params.commentId,
    taskId: req.params.id,
  });

  res.status(200).json({
    success: true,
    message: "Comment deleted successfully",
  });
});

// Get Task Activity Timeline
export const getTaskActivity = asyncHandler(async (req, res) => {
  const workspaceId = req.workspace?._id;
  if (!workspaceId) {
    return res.status(400).json({ success: false, message: "Workspace context required" });
  }

  const activity = await getTaskActivityService(req.params.id, workspaceId);
  res.status(200).json({
    success: true,
    data: activity,
  });
});

