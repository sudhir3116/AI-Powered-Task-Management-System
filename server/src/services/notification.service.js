import Notification from "../models/notification.model.js";
import { emitToUser } from "../socket.js";

export const createNotification = async ({
  userId,
  organizationId = null,
  type,
  title,
  message,
  metadata = {},
}) => {
  if (!userId || !type || !title || !message) {
    return null;
  }
  try {
    const notification = await Notification.create({
      user: userId,
      organization: organizationId,
      type,
      title,
      message,
      metadata,
    });

    emitToUser(userId.toString(), "notification.created", notification);
    return notification;
  } catch (error) {
    // Non-blocking notification creation
    return null;
  }
};

export const getUserNotificationsService = async (userId, limit = 20) => {
  const notifications = await Notification.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit);

  const unreadCount = await Notification.countDocuments({ user: userId, read: false });

  return {
    notifications,
    unreadCount,
  };
};

export const markNotificationReadService = async (notificationId, userId) => {
  const notification = await Notification.findOne({ _id: notificationId, user: userId });
  if (!notification) {
    const error = new Error("Notification not found");
    error.statusCode = 404;
    throw error;
  }

  notification.read = true;
  await notification.save();
  return notification;
};

export const markAllNotificationsReadService = async (userId) => {
  await Notification.updateMany({ user: userId, read: false }, { $set: { read: true } });
  return { success: true };
};

export const deleteNotificationService = async (notificationId, userId) => {
  const notification = await Notification.findOneAndDelete({ _id: notificationId, user: userId });
  if (!notification) {
    const error = new Error("Notification not found");
    error.statusCode = 404;
    throw error;
  }
  return { success: true };
};
