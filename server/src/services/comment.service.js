import Comment from "../models/comment.model.js";
import Task from "../models/task.model.js";
import AuditLog from "../models/auditLog.model.js";
import { createAuditLog } from "./auditLog.service.js";

export const getTaskCommentsService = async (taskId, organizationId) => {
  return await Comment.find({ task: taskId, organization: organizationId })
    .sort({ createdAt: 1 })
    .populate("user", "name email avatar");
};

export const createCommentService = async ({ taskId, organizationId, userId, content }) => {
  if (!content || typeof content !== "string" || !content.trim()) {
    const error = new Error("Comment content cannot be empty.");
    error.statusCode = 400;
    throw error;
  }

  const task = await Task.findOne({ _id: taskId, organization: organizationId });
  if (!task) {
    const error = new Error("Task not found in this workspace.");
    error.statusCode = 404;
    throw error;
  }

  const comment = await Comment.create({
    task: taskId,
    organization: organizationId,
    user: userId,
    content: content.trim().slice(0, 1000),
  });

  void createAuditLog({
    organizationId,
    actorId: userId,
    action: "comment_added",
    entityType: "Task",
    entityId: taskId,
    metadata: { commentId: comment._id.toString() },
  });

  return await Comment.findById(comment._id).populate("user", "name email avatar");
};

export const deleteCommentService = async ({ commentId, taskId, organizationId, userId, userRole }) => {
  const comment = await Comment.findOne({ _id: commentId, task: taskId, organization: organizationId });
  if (!comment) {
    const error = new Error("Comment not found.");
    error.statusCode = 404;
    throw error;
  }

  const isOwner = comment.user.toString() === userId.toString();
  const isAdminOrOwner = userRole === "OWNER" || userRole === "ADMIN";

  if (!isOwner && !isAdminOrOwner) {
    const error = new Error("Access denied. You can only delete your own comments.");
    error.statusCode = 403;
    throw error;
  }

  await Comment.findByIdAndDelete(commentId);
  return { success: true };
};

export const getTaskActivityService = async (taskId, organizationId) => {
  return await AuditLog.find({ organization: organizationId, entityId: taskId })
    .sort({ createdAt: -1 })
    .populate("actor", "name email avatar")
    .limit(50);
};
