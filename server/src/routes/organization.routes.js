import express from "express";
import { check, param } from "express-validator";
import validateRequest from "../middleware/validation.middleware.js";
import authMiddleware from "../middleware/auth.middleware.js";
import workspaceMiddleware from "../middleware/workspace.middleware.js";
import { requireWorkspaceRole } from "../middleware/rbac.middleware.js";
import {
  getWorkspaces,
  createWorkspace,
  getCurrentWorkspace,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
} from "../controllers/organization.controller.js";
import {
  getMembers,
  updateMemberRole,
  removeMember,
} from "../controllers/organizationMember.controller.js";
import {
  createWorkspaceInvitation,
  resendWorkspaceInvitation,
  cancelWorkspaceInvitation,
  getWorkspacePendingInvitations,
} from "../controllers/invitation.controller.js";
import { getWorkspaceAnalytics } from "../controllers/analytics.controller.js";
import { getWorkspaceAuditLogs } from "../controllers/auditLog.controller.js";

const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/workspaces:
 *   get:
 *     summary: Get all workspaces of the authenticated user
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user workspaces
 */
router.get("/", getWorkspaces);

/**
 * @swagger
 * /api/workspaces:
 *   post:
 *     summary: Create a new workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Workspace created successfully
 */
router.post(
  "/",
  [check("name").trim().notEmpty().withMessage("Workspace name is required").isLength({ max: 100 }).withMessage("Max length is 100 characters")],
  validateRequest,
  createWorkspace
);

/**
 * @swagger
 * /api/workspaces/current:
 *   get:
 *     summary: Get details of current active workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active workspace details
 */
router.get("/current", workspaceMiddleware, getCurrentWorkspace);

/**
 * @swagger
 * /api/workspaces/{id}:
 *   get:
 *     summary: Get workspace by ID
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace details
 */
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid workspace id")],
  validateRequest,
  getWorkspaceById
);

/**
 * @swagger
 * /api/workspaces/{id}:
 *   patch:
 *     summary: Update workspace details (Owner & Admin only)
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Workspace updated successfully
 */
router.patch(
  "/:id",
  [
    param("id").isMongoId().withMessage("Invalid workspace id"),
    check("name").trim().notEmpty().withMessage("Workspace name is required").isLength({ max: 100 }).withMessage("Max length is 100 characters"),
  ],
  validateRequest,
  workspaceMiddleware,
  requireWorkspaceRole("OWNER", "ADMIN"),
  updateWorkspace
);

/**
 * @swagger
 * /api/workspaces/{id}:
 *   delete:
 *     summary: Delete a workspace (Owner only)
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace deleted successfully
 */
router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid workspace id")],
  validateRequest,
  workspaceMiddleware,
  requireWorkspaceRole("OWNER"),
  deleteWorkspace
);

/** Member Management Routes **/

/**
 * @swagger
 * /api/workspaces/{id}/members:
 *   get:
 *     summary: Get all workspace members
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id/members",
  [param("id").isMongoId().withMessage("Invalid workspace id")],
  validateRequest,
  workspaceMiddleware,
  getMembers
);

/**
 * @swagger
 * /api/workspaces/{id}/members/{memberId}:
 *   patch:
 *     summary: Update member role (Owner only)
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  "/:id/members/:memberId",
  [
    param("id").isMongoId().withMessage("Invalid workspace id"),
    param("memberId").isMongoId().withMessage("Invalid member id"),
    check("role").isIn(["OWNER", "ADMIN", "MEMBER"]).withMessage("Invalid role"),
  ],
  validateRequest,
  workspaceMiddleware,
  requireWorkspaceRole("OWNER"),
  updateMemberRole
);

/**
 * @swagger
 * /api/workspaces/{id}/members/{memberId}:
 *   delete:
 *     summary: Remove member from workspace (Owner & Admin)
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/:id/members/:memberId",
  [
    param("id").isMongoId().withMessage("Invalid workspace id"),
    param("memberId").isMongoId().withMessage("Invalid member id"),
  ],
  validateRequest,
  workspaceMiddleware,
  requireWorkspaceRole("OWNER", "ADMIN"),
  removeMember
);

router.get(
  "/:id/invitations",
  [param("id").isMongoId().withMessage("Invalid workspace id")],
  validateRequest,
  workspaceMiddleware,
  requireWorkspaceRole("OWNER", "ADMIN"),
  getWorkspacePendingInvitations
);

router.post(
  "/:id/invitations",
  [
    param("id").isMongoId().withMessage("Invalid workspace id"),
    check("email").isEmail().withMessage("Valid recipient email is required"),
    check("role").optional().isIn(["ADMIN", "MEMBER"]).withMessage("Invalid role specified"),
  ],
  validateRequest,
  workspaceMiddleware,
  requireWorkspaceRole("OWNER", "ADMIN"),
  createWorkspaceInvitation
);

router.post(
  "/:id/invitations/:invitationId/resend",
  [
    param("id").isMongoId().withMessage("Invalid workspace id"),
    param("invitationId").isMongoId().withMessage("Invalid invitation id"),
  ],
  validateRequest,
  workspaceMiddleware,
  requireWorkspaceRole("OWNER", "ADMIN"),
  resendWorkspaceInvitation
);

router.delete(
  "/:id/invitations/:invitationId",
  [
    param("id").isMongoId().withMessage("Invalid workspace id"),
    param("invitationId").isMongoId().withMessage("Invalid invitation id"),
  ],
  validateRequest,
  workspaceMiddleware,
  requireWorkspaceRole("OWNER", "ADMIN"),
  cancelWorkspaceInvitation
);

/**
 * @swagger
 * /api/workspaces/{id}/analytics:
 *   get:
 *     summary: Get workspace analytics and statistics (Workspace Members)
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id/analytics",
  [param("id").isMongoId().withMessage("Invalid workspace id")],
  validateRequest,
  workspaceMiddleware,
  getWorkspaceAnalytics
);

/**
 * @swagger
 * /api/workspaces/{id}/audit-logs:
 *   get:
 *     summary: Get workspace audit logs (Owner & Admin)
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id/audit-logs",
  [param("id").isMongoId().withMessage("Invalid workspace id")],
  validateRequest,
  workspaceMiddleware,
  requireWorkspaceRole("OWNER", "ADMIN"),
  getWorkspaceAuditLogs
);

export default router;
