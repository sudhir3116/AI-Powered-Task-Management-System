import AuditLog from "../models/auditLog.model.js";

const SENSITIVE_FIELDS = ["password", "token", "jwt", "secret", "apiKey", "creditCard"];

const sanitizeMetadata = (obj) => {
  if (!obj || typeof obj !== "object") return {};
  const clean = { ...obj };
  for (const key of Object.keys(clean)) {
    if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field))) {
      delete clean[key];
    }
  }
  return clean;
};

export const createAuditLog = async ({
  organizationId,
  actorId,
  action,
  entityType,
  entityId = null,
  metadata = {},
}) => {
  if (!organizationId || !actorId || !action || !entityType) {
    return null;
  }
  try {
    return await AuditLog.create({
      organization: organizationId,
      actor: actorId,
      action,
      entityType,
      entityId,
      metadata: sanitizeMetadata(metadata),
    });
  } catch (error) {
    // Non-blocking audit log creation
    return null;
  }
};

export const getWorkspaceAuditLogsService = async (workspaceId, { page = 1, limit = 50 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    AuditLog.find({ organization: workspaceId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("actor", "name email avatar"),
    AuditLog.countDocuments({ organization: workspaceId }),
  ]);

  return {
    logs,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
};
