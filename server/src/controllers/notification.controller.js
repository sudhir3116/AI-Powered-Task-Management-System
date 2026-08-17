import {
  getUserNotificationsService,
  markNotificationReadService,
  markAllNotificationsReadService,
  deleteNotificationService,
} from "../services/notification.service.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getUserNotifications = asyncHandler(async (req, res) => {
  const result = await getUserNotificationsService(req.user.id);
  res.status(200).json({
    success: true,
    data: result.notifications,
    unreadCount: result.unreadCount,
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await markNotificationReadService(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    data: notification,
  });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await markAllNotificationsReadService(req.user.id);
  res.status(200).json({
    success: true,
    message: "All notifications marked as read",
  });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  await deleteNotificationService(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message: "Notification deleted",
  });
});

