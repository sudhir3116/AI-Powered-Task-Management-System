import { getWorkspaceAuditLogsService } from "../services/auditLog.service.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getWorkspaceAuditLogs = asyncHandler(async (req, res) => {
  const result = await getWorkspaceAuditLogsService(req.workspace._id, req.query);
  res.status(200).json({
    success: true,
    data: result.logs,
    pagination: {
      page: result.page,
      totalPages: result.totalPages,
      total: result.total,
    },
  });
});
