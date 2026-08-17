import { getWorkspaceAnalyticsService } from "../services/analytics.service.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getWorkspaceAnalytics = asyncHandler(async (req, res) => {
  const analytics = await getWorkspaceAnalyticsService(
    req.workspace._id,
    req.user.id,
    req.membership.role
  );

  res.status(200).json({
    success: true,
    data: analytics,
  });
});
