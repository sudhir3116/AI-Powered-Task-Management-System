import crypto from "node:crypto";
import Invitation from "../models/invitation.model.js";
import OrganizationMember from "../models/organizationMember.model.js";
import Organization from "../models/organization.model.js";
import User from "../models/user.model.js";
import { sendWorkspaceInvitationEmail } from "./email.service.js";
import logger from "../utils/logger.js";
import { createAuditLog } from "./auditLog.service.js";
import { createNotification } from "./notification.service.js";
import { PLAN_LIMITS } from "./subscription.service.js";
import { emitToWorkspace } from "../socket.js";

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const createInvitationService = async (workspaceId, actorUserId, actorRole, { email, role = "MEMBER" }) => {
  if (!email || typeof email !== "string") {
    const error = new Error("A valid recipient email is required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Role safeguards
  if (actorRole === "MEMBER") {
    const error = new Error("Access denied. Members cannot send workspace invitations.");
    error.statusCode = 403;
    throw error;
  }

  if (role === "OWNER") {
    const error = new Error("Cannot invite someone with OWNER role.");
    error.statusCode = 400;
    throw error;
  }

  if (actorRole === "ADMIN" && role !== "MEMBER") {
    const error = new Error("Access denied. Admins can only invite Members.");
    error.statusCode = 403;
    throw error;
  }

  if (!["ADMIN", "MEMBER"].includes(role)) {
    const error = new Error("Invalid role specified for invitation.");
    error.statusCode = 400;
    throw error;
  }

  const organization = await Organization.findById(workspaceId);
  if (!organization) {
    const error = new Error("Workspace not found.");
    error.statusCode = 404;
    throw error;
  }

  // Subscription plan limit check
  const now = new Date();
  const currentMemberCount = await OrganizationMember.countDocuments({ organization: workspaceId });
  const pendingInvitationCount = await Invitation.countDocuments({
    organization: workspaceId,
    acceptedAt: null,
    expiresAt: { $gt: now },
  });
  const plan = organization.subscription?.plan || "FREE";
  const maxMembers = PLAN_LIMITS[plan]?.maxMembers || PLAN_LIMITS.FREE.maxMembers;

  if (currentMemberCount + pendingInvitationCount >= maxMembers) {
    const error = new Error(`Workspace member limit reached (${maxMembers} members max on ${plan} plan).`);
    error.statusCode = 400;
    throw error;
  }

  // Check if invited user is already a workspace member
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const existingMember = await OrganizationMember.findOne({
      organization: workspaceId,
      user: existingUser._id,
    });

    if (existingMember) {
      const error = new Error("This user is already a member of this workspace.");
      error.statusCode = 400;
      throw error;
    }
  }

  // Check for duplicate pending active invitation
  const existingPending = await Invitation.findOne({
    organization: workspaceId,
    email: normalizedEmail,
    acceptedAt: null,
    expiresAt: { $gt: now },
  });

  if (existingPending) {
    const error = new Error("A pending active invitation already exists for this email.");
    error.statusCode = 400;
    error.existingInvitationId = existingPending._id;
    throw error;
  }

  // Generate cryptographically secure token & SHA-256 hash
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await Invitation.create({
    organization: workspaceId,
    email: normalizedEmail,
    invitedBy: actorUserId,
    role,
    tokenHash,
    expiresAt,
  });

  logger.info(`[INVITATION_CREATED] Created invitation for ${normalizedEmail} in workspace ${organization.name} (ID: ${invitation._id})`);

  void createAuditLog({
    organizationId: workspaceId,
    actorId: actorUserId,
    action: "member_invited",
    entityType: "Invitation",
    entityId: invitation._id.toString(),
    metadata: { email: normalizedEmail, role },
  });

  // Get inviter details for email
  const inviter = await User.findById(actorUserId);
  const inviterName = inviter ? inviter.name : "A team member";

  const baseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || "http://localhost:5173";
  const invitationUrl = `${baseUrl.replace(/\/$/, "")}/accept-invitation/${rawToken}`;

  // Await email delivery to capture real Resend result
  const emailResult = await sendWorkspaceInvitationEmail({
    email: normalizedEmail,
    inviterName,
    workspaceName: organization.name,
    role,
    invitationUrl,
    expiresAt,
  });

  // If existing recipient user, send in-app notification as well
  if (existingUser) {
    void createNotification({
      userId: existingUser._id,
      organizationId: workspaceId,
      type: "WORKSPACE_INVITATION",
      title: "Workspace Invitation",
      message: `${inviterName} invited you to join "${organization.name}" as ${role}`,
      metadata: { invitationId: invitation._id },
    });
  }

  emitToWorkspace(workspaceId, "invitation.created", { invitationId: invitation._id, email: normalizedEmail });

  return {
    id: invitation._id,
    _id: invitation._id,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    emailSent: Boolean(emailResult.success),
    devMode: Boolean(emailResult.devMode),
    skipped: Boolean(emailResult.skipped),
    messageId: emailResult.messageId || null,
    emailError: emailResult.error || null,
  };
};

export const resendInvitationService = async (workspaceId, invitationId, actorUserId, actorRole) => {
  if (actorRole === "MEMBER") {
    const error = new Error("Access denied. Members cannot resend invitations.");
    error.statusCode = 403;
    throw error;
  }

  const invitation = await Invitation.findOne({
    _id: invitationId,
    organization: workspaceId,
  });

  if (!invitation) {
    const error = new Error("Invitation not found for this workspace.");
    error.statusCode = 404;
    throw error;
  }

  if (invitation.acceptedAt) {
    const error = new Error("This invitation has already been accepted.");
    error.statusCode = 400;
    throw error;
  }

  const organization = await Organization.findById(workspaceId);
  if (!organization) {
    const error = new Error("Workspace not found.");
    error.statusCode = 404;
    throw error;
  }

  // Generate new raw token & extend expiry, which invalidates previous token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  invitation.tokenHash = tokenHash;
  invitation.expiresAt = expiresAt;
  await invitation.save();

  void createAuditLog({
    organizationId: workspaceId,
    actorId: actorUserId,
    action: "member_invitation_resent",
    entityType: "Invitation",
    entityId: invitation._id.toString(),
    metadata: { email: invitation.email },
  });

  const inviter = await User.findById(actorUserId);
  const inviterName = inviter ? inviter.name : "A team member";

  const baseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || "http://localhost:5173";
  const invitationUrl = `${baseUrl.replace(/\/$/, "")}/accept-invitation/${rawToken}`;

  const emailResult = await sendWorkspaceInvitationEmail({
    email: invitation.email,
    inviterName,
    workspaceName: organization.name,
    role: invitation.role,
    invitationUrl,
    expiresAt,
  });

  emitToWorkspace(workspaceId, "invitation.resent", { invitationId: invitation._id, email: invitation.email });

  return {
    id: invitation._id,
    _id: invitation._id,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    emailSent: Boolean(emailResult.success),
    devMode: Boolean(emailResult.devMode),
    skipped: Boolean(emailResult.skipped),
    messageId: emailResult.messageId || null,
    emailError: emailResult.error || null,
  };
};

export const cancelInvitationService = async (workspaceId, invitationId, actorUserId, actorRole) => {
  if (actorRole === "MEMBER") {
    const error = new Error("Access denied. Members cannot cancel invitations.");
    error.statusCode = 403;
    throw error;
  }

  const invitation = await Invitation.findOne({
    _id: invitationId,
    organization: workspaceId,
  });

  if (!invitation) {
    const error = new Error("Invitation not found for this workspace.");
    error.statusCode = 404;
    throw error;
  }

  await Invitation.deleteOne({ _id: invitation._id });

  logger.info(`[INVITATION_CANCELLED] Invitation for ${invitation.email} in workspace ${workspaceId} was cancelled by user ${actorUserId}`);

  void createAuditLog({
    organizationId: workspaceId,
    actorId: actorUserId,
    action: "member_invitation_cancelled",
    entityType: "Invitation",
    entityId: invitationId.toString(),
    metadata: { email: invitation.email },
  });

  emitToWorkspace(workspaceId, "invitation.cancelled", { invitationId: invitation._id, email: invitation.email });

  return {
    success: true,
    email: invitation.email,
    message: `Invitation to ${invitation.email} cancelled successfully.`,
  };
};

export const getWorkspacePendingInvitationsService = async (workspaceId, actorRole) => {
  if (actorRole === "MEMBER") {
    const error = new Error("Access denied. Members cannot view workspace invitations.");
    error.statusCode = 403;
    throw error;
  }

  const invitations = await Invitation.find({
    organization: workspaceId,
    acceptedAt: null,
  })
    .sort({ createdAt: -1 })
    .populate("invitedBy", "name email");

  const now = new Date();
  return invitations.map((inv) => ({
    id: inv._id,
    _id: inv._id,
    email: inv.email,
    role: inv.role,
    invitedBy: inv.invitedBy ? { name: inv.invitedBy.name, email: inv.invitedBy.email } : null,
    createdAt: inv.createdAt,
    expiresAt: inv.expiresAt,
    isExpired: inv.expiresAt < now,
  }));
};

export const getInvitationByTokenService = async (rawToken) => {
  if (!rawToken || typeof rawToken !== "string") {
    const error = new Error("Invitation token is required");
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = hashToken(rawToken);
  const invitation = await Invitation.findOne({ tokenHash })
    .populate("organization", "name")
    .populate("invitedBy", "name email");

  if (!invitation || !invitation.organization) {
    const error = new Error("Invitation not found or invalid.");
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();
  const isExpired = invitation.expiresAt < now;
  if (isExpired) {
    logger.info(`[INVITATION_EXPIRED] Expired invitation token presented for ${invitation.email}`);
  }

  const isAccepted = Boolean(invitation.acceptedAt);

  return {
    id: invitation._id,
    workspaceName: invitation.organization.name,
    inviterName: invitation.invitedBy ? invitation.invitedBy.name : "A team member",
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    isExpired,
    isAccepted,
  };
};

export const acceptInvitationService = async (rawToken, authenticatedUserId, authenticatedUserEmail) => {
  if (!rawToken || typeof rawToken !== "string") {
    const error = new Error("Invitation token is required");
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = hashToken(rawToken);
  const invitation = await Invitation.findOne({ tokenHash });

  if (!invitation) {
    const error = new Error("Invitation not found or invalid.");
    error.statusCode = 404;
    throw error;
  }

  if (invitation.acceptedAt) {
    const error = new Error("Invitation has already been accepted.");
    error.statusCode = 400;
    throw error;
  }

  if (invitation.expiresAt < new Date()) {
    logger.info(`[INVITATION_EXPIRED] Attempted acceptance of expired invitation for ${invitation.email}`);
    const error = new Error("Invitation has expired.");
    error.statusCode = 400;
    throw error;
  }

  // Strict email match validation
  const normalizedAuthEmail = (authenticatedUserEmail || "").trim().toLowerCase();
  if (normalizedAuthEmail !== invitation.email.trim().toLowerCase()) {
    const error = new Error(`This invitation was sent to ${invitation.email}. Please sign in with that email address.`);
    error.statusCode = 403;
    throw error;
  }

  // Check if user is already a member of this workspace
  const existingMembership = await OrganizationMember.findOne({
    organization: invitation.organization,
    user: authenticatedUserId,
  });

  if (existingMembership) {
    invitation.acceptedAt = new Date();
    await invitation.save();
    return {
      success: true,
      alreadyMember: true,
      workspaceId: invitation.organization,
      message: "You are already a member of this workspace.",
    };
  }

  // Create membership
  await OrganizationMember.create({
    organization: invitation.organization,
    user: authenticatedUserId,
    role: invitation.role,
  });

  invitation.acceptedAt = new Date();
  await invitation.save();

  logger.info(`[INVITATION_ACCEPTED] User ${authenticatedUserEmail} accepted invitation for workspace ${invitation.organization}`);

  emitToWorkspace(invitation.organization, "invitation.accepted", { invitationId: invitation._id, email: authenticatedUserEmail });

  return {
    success: true,
    alreadyMember: false,
    workspaceId: invitation.organization,
    role: invitation.role,
    message: "Invitation accepted successfully.",
  };
};
