import Organization from "../models/organization.model.js";
import OrganizationMember from "../models/organizationMember.model.js";
import Task from "../models/task.model.js";

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "") || "workspace";

export const ensureDefaultWorkspace = async (userId, userName = "User") => {
  let memberRecord = await OrganizationMember.findOne({ user: userId }).populate("organization");

  if (!memberRecord || !memberRecord.organization) {
    // Create default personal workspace
    const baseSlug = slugify(`${userName}-personal`);
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

    const organization = await Organization.create({
      name: `${userName}'s Workspace`,
      slug: uniqueSlug,
      owner: userId,
      isPersonal: true,
    });

    memberRecord = await OrganizationMember.create({
      organization: organization._id,
      user: userId,
      role: "OWNER",
    });

    memberRecord.organization = organization;
  }

  // Auto-associate any unassigned legacy tasks of this user
  await Task.updateMany(
    { user: userId, organization: { $in: [null, undefined] } },
    { $set: { organization: memberRecord.organization._id } }
  );

  return memberRecord.organization;
};

export const getUserWorkspaces = async (userId) => {
  await ensureDefaultWorkspace(userId);

  const memberships = await OrganizationMember.find({ user: userId })
    .populate("organization")
    .sort({ createdAt: 1 });

  return memberships
    .filter((m) => m.organization)
    .map((m) => ({
      id: m.organization._id,
      _id: m.organization._id,
      name: m.organization.name,
      slug: m.organization.slug,
      isPersonal: m.organization.isPersonal,
      role: m.role,
      createdAt: m.organization.createdAt,
    }));
};

export const createWorkspace = async (userId, { name }) => {
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    const error = new Error("Workspace name is required");
    error.statusCode = 400;
    throw error;
  }

  const trimmedName = name.trim().slice(0, 100);
  const baseSlug = slugify(trimmedName);
  const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

  const organization = await Organization.create({
    name: trimmedName,
    slug: uniqueSlug,
    owner: userId,
    isPersonal: false,
  });

  const member = await OrganizationMember.create({
    organization: organization._id,
    user: userId,
    role: "OWNER",
  });

  return {
    id: organization._id,
    _id: organization._id,
    name: organization.name,
    slug: organization.slug,
    isPersonal: organization.isPersonal,
    role: member.role,
    createdAt: organization.createdAt,
  };
};

export const getWorkspaceByIdService = async (workspaceId, userId) => {
  const member = await OrganizationMember.findOne({ organization: workspaceId, user: userId });
  if (!member) {
    const error = new Error("Access denied. You are not a member of this workspace.");
    error.statusCode = 403;
    throw error;
  }

  const organization = await Organization.findById(workspaceId);
  if (!organization) {
    const error = new Error("Workspace not found");
    error.statusCode = 404;
    throw error;
  }

  const memberCount = await OrganizationMember.countDocuments({ organization: workspaceId });

  return {
    id: organization._id,
    _id: organization._id,
    name: organization.name,
    slug: organization.slug,
    owner: organization.owner,
    isPersonal: organization.isPersonal,
    role: member.role,
    memberCount,
    createdAt: organization.createdAt,
  };
};

export const updateWorkspaceService = async (workspaceId, userId, { name }) => {
  const member = await OrganizationMember.findOne({ organization: workspaceId, user: userId });
  if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
    const error = new Error("Access denied. Only workspace owners and admins can update settings.");
    error.statusCode = 403;
    throw error;
  }

  const trimmedName = name.trim().slice(0, 100);
  const updatedOrg = await Organization.findByIdAndUpdate(
    workspaceId,
    { name: trimmedName },
    { returnDocument: "after", runValidators: true }
  );

  return {
    id: updatedOrg._id,
    _id: updatedOrg._id,
    name: updatedOrg.name,
    slug: updatedOrg.slug,
    role: member.role,
  };
};

export const deleteWorkspaceService = async (workspaceId, userId) => {
  const organization = await Organization.findById(workspaceId);
  if (!organization) {
    const error = new Error("Workspace not found");
    error.statusCode = 404;
    throw error;
  }

  if (organization.isPersonal) {
    const error = new Error("Cannot delete your personal default workspace");
    error.statusCode = 400;
    throw error;
  }

  if (organization.owner.toString() !== userId.toString()) {
    const error = new Error("Access denied. Only workspace owner can delete workspace.");
    error.statusCode = 403;
    throw error;
  }

  await Task.deleteMany({ organization: workspaceId });
  await OrganizationMember.deleteMany({ organization: workspaceId });
  await Organization.findByIdAndDelete(workspaceId);

  return { success: true };
};

export const getWorkspaceMember = async (workspaceId, userId) => {
  return await OrganizationMember.findOne({ organization: workspaceId, user: userId });
};
