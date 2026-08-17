import {
  getWorkspaceMembersService,
  updateMemberRoleService,
  removeWorkspaceMemberService,
} from "../services/organizationMember.service.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getMembers = asyncHandler(async (req, res) => {
  const members = await getWorkspaceMembersService(req.workspace._id);
  res.status(200).json({
    success: true,
    data: members,
  });
});

export const updateMemberRole = asyncHandler(async (req, res) => {
  const updatedMember = await updateMemberRoleService(
    req.workspace._id,
    req.user.id,
    req.membership.role,
    req.params.memberId,
    req.body.role
  );

  res.status(200).json({
    success: true,
    message: "Member role updated successfully",
    data: updatedMember,
  });
});

export const removeMember = asyncHandler(async (req, res) => {
  await removeWorkspaceMemberService(
    req.workspace._id,
    req.user.id,
    req.membership.role,
    req.params.memberId
  );

  res.status(200).json({
    success: true,
    message: "Workspace member removed successfully",
  });
});
