import {
  ensureDefaultWorkspace,
  getWorkspaceMember,
} from "../services/organization.service.js";
import Organization from "../models/organization.model.js";

const workspaceMiddleware = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const workspaceHeader = req.headers["x-workspace-id"];

    if (workspaceHeader) {
      const member = await getWorkspaceMember(workspaceHeader, req.user.id);

      if (!member) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not a member of this workspace.",
        });
      }

      const organization = await Organization.findById(workspaceHeader);
      if (!organization) {
        return res.status(404).json({ success: false, message: "Workspace not found" });
      }

      req.workspace = {
        _id: organization._id,
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        isPersonal: organization.isPersonal,
        owner: organization.owner,
        role: member.role,
      };
      req.membership = member;
      return next();
    }

    // Default workspace fallback
    const defaultOrg = await ensureDefaultWorkspace(req.user.id, req.user.name || "User");
    const member = await getWorkspaceMember(defaultOrg._id, req.user.id);

    req.workspace = {
      _id: defaultOrg._id,
      id: defaultOrg._id,
      name: defaultOrg.name,
      slug: defaultOrg.slug,
      isPersonal: defaultOrg.isPersonal,
      owner: defaultOrg.owner,
      role: member ? member.role : "OWNER",
    };
    req.membership = member;
    return next();
  } catch (error) {
    next(error);
  }
};

export default workspaceMiddleware;
