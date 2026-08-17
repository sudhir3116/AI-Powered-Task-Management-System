import {
  createInvitationService,
  resendInvitationService,
  cancelInvitationService,
  getWorkspacePendingInvitationsService,
  getInvitationByTokenService,
  acceptInvitationService,
} from "../services/invitation.service.js";
import User from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";

export const createWorkspaceInvitation = asyncHandler(async (req, res) => {
  try {
    const result = await createInvitationService(
      req.workspace._id,
      req.user.id,
      req.membership.role,
      req.body
    );

    // Email delivered successfully via Resend
    if (result.emailSent && !result.devMode) {
      return res.status(201).json({
        success: true,
        emailSent: true,
        message: `Invitation sent successfully to ${result.email}`,
        data: result,
      });
    }

    // Email delivery failed or dev fallback
    return res.status(201).json({
      success: true,
      invitationCreated: true,
      emailSent: false,
      message: `Invitation created. Email delivery unavailable. Copy invitation link from server console.`,
      data: result,
    });
  } catch (err) {
    if (err.existingInvitationId) {
      return res.status(400).json({
        success: false,
        message: err.message,
        existingInvitationId: err.existingInvitationId,
      });
    }
    throw err;
  }
});


export const resendWorkspaceInvitation = asyncHandler(async (req, res) => {
  const result = await resendInvitationService(
    req.workspace._id,
    req.params.invitationId,
    req.user.id,
    req.membership.role
  );

  if (result.emailSent && !result.devMode) {
    return res.status(200).json({
      success: true,
      emailSent: true,
      message: `Fresh token generated and invitation email delivered to ${result.email}`,
      data: result,
    });
  }

  return res.status(200).json({
    success: true,
    invitationCreated: true,
    emailSent: false,
    message: `Invitation created. Email delivery unavailable. Copy invitation link from server console.`,
    data: result,
  });
});


export const cancelWorkspaceInvitation = asyncHandler(async (req, res) => {
  const result = await cancelInvitationService(
    req.workspace._id,
    req.params.invitationId,
    req.user.id,
    req.membership.role
  );

  res.status(200).json({
    success: true,
    message: result.message,
    data: result,
  });
});

export const getWorkspacePendingInvitations = asyncHandler(async (req, res) => {
  const invitations = await getWorkspacePendingInvitationsService(
    req.workspace._id,
    req.membership.role
  );

  res.status(200).json({
    success: true,
    data: invitations,
  });
});

export const getInvitationDetails = asyncHandler(async (req, res) => {
  const details = await getInvitationByTokenService(req.params.token);

  res.status(200).json({
    success: true,
    data: details,
  });
});

export const acceptWorkspaceInvitation = asyncHandler(async (req, res) => {
  let userEmail = req.user.email;

  if (!userEmail) {
    const userDoc = await User.findById(req.user.id);
    userEmail = userDoc?.email || "";
  }

  const result = await acceptInvitationService(
    req.params.token,
    req.user.id,
    userEmail
  );

  res.status(200).json({
    success: true,
    message: result.message,
    data: result,
  });
});
