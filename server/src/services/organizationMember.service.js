import OrganizationMember from "../models/organizationMember.model.js";
import Organization from "../models/organization.model.js";

const VALID_ROLES = ["OWNER", "ADMIN", "MEMBER"];

export const getWorkspaceMembersService = async (workspaceId) => {
  const members = await OrganizationMember.find({ organization: workspaceId })
    .populate("user", "name email avatar")
    .sort({ createdAt: 1 });

  return members.map((m) => ({
    id: m._id,
    _id: m._id,
    user: m.user
      ? {
          id: m.user._id,
          _id: m.user._id,
          name: m.user.name,
          email: m.user.email,
          avatar: m.user.avatar || null,
        }
      : null,
    role: m.role,
    joinedAt: m.joinedAt || m.createdAt,
  }));
};

export const updateMemberRoleService = async (workspaceId, actorUserId, actorRole, targetMemberId, newRole) => {
  if (!VALID_ROLES.includes(newRole)) {
    const error = new Error(`Invalid role. Allowed roles: ${VALID_ROLES.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  // Only OWNER can change roles
  if (actorRole !== "OWNER") {
    const error = new Error("Access denied. Only workspace owners can change member roles.");
    error.statusCode = 403;
    throw error;
  }

  const targetMember = await OrganizationMember.findOne({
    _id: targetMemberId,
    organization: workspaceId,
  });

  if (!targetMember) {
    const error = new Error("Workspace member not found.");
    error.statusCode = 404;
    throw error;
  }

  // Safeguard: Cannot demote sole owner
  if (targetMember.role === "OWNER" && newRole !== "OWNER") {
    const ownerCount = await OrganizationMember.countDocuments({
      organization: workspaceId,
      role: "OWNER",
    });

    if (ownerCount <= 1) {
      const error = new Error("Workspace must have at least one owner.");
      error.statusCode = 400;
      throw error;
    }
  }

  targetMember.role = newRole;
  await targetMember.save();

  // If transferring ownership, optionally update Organization owner field
  if (newRole === "OWNER") {
    await Organization.findByIdAndUpdate(workspaceId, { owner: targetMember.user });
  }

  const updated = await OrganizationMember.findById(targetMember._id).populate("user", "name email avatar");

  return {
    id: updated._id,
    _id: updated._id,
    user: updated.user,
    role: updated.role,
    joinedAt: updated.joinedAt,
  };
};

export const removeWorkspaceMemberService = async (workspaceId, actorUserId, actorRole, targetMemberId) => {
  const targetMember = await OrganizationMember.findOne({
    _id: targetMemberId,
    organization: workspaceId,
  });

  if (!targetMember) {
    const error = new Error("Workspace member not found.");
    error.statusCode = 404;
    throw error;
  }

  const isSelf = targetMember.user.toString() === actorUserId.toString();

  // Safeguard: Target is OWNER
  if (targetMember.role === "OWNER") {
    if (actorRole !== "OWNER") {
      const error = new Error("Access denied. Cannot remove workspace owner.");
      error.statusCode = 403;
      throw error;
    }

    if (isSelf) {
      const ownerCount = await OrganizationMember.countDocuments({
        organization: workspaceId,
        role: "OWNER",
      });

      if (ownerCount <= 1) {
        const error = new Error("Workspace owner cannot leave without transferring ownership.");
        error.statusCode = 400;
        throw error;
      }
    }
  }

  // Safeguard: Target is ADMIN (only OWNER or self can remove an ADMIN)
  if (targetMember.role === "ADMIN" && actorRole !== "OWNER" && !isSelf) {
    const error = new Error("Access denied. Only workspace owner can remove admins.");
    error.statusCode = 403;
    throw error;
  }

  // Safeguard: Actor is MEMBER (MEMBER cannot remove others)
  if (actorRole === "MEMBER" && !isSelf) {
    const error = new Error("Access denied. Members cannot remove other members.");
    error.statusCode = 403;
    throw error;
  }

  await OrganizationMember.findByIdAndDelete(targetMember._id);

  return { success: true };
};
