import express from "express";
import mongoose from "mongoose";
import authMiddleware from "../middleware/auth.middleware.js";
import systemAdminMiddleware from "../middleware/systemAdmin.middleware.js";
import User from "../models/user.model.js";
import Organization from "../models/organization.model.js";
import Task from "../models/task.model.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.use(authMiddleware);
router.use(systemAdminMiddleware);

router.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const [totalUsers, totalOrganizations, totalTasks] = await Promise.all([
      User.countDocuments(),
      Organization.countDocuments(),
      Task.countDocuments(),
    ]);

    const dbStateMap = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalOrganizations,
        totalTasks,
        systemHealth: {
          status: "healthy",
          uptime: process.uptime(),
          database: dbStateMap[mongoose.connection.readyState] || "unknown",
        },
      },
    });
  })
);

router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const users = await User.find().select("-password").sort({ createdAt: -1 }).limit(100);
    res.status(200).json({
      success: true,
      data: users,
    });
  })
);

router.get(
  "/organizations",
  asyncHandler(async (req, res) => {
    const orgs = await Organization.find()
      .populate("owner", "name email")
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      data: orgs,
    });
  })
);

export default router;
