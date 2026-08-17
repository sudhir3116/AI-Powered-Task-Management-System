import express from "express";
import { check } from "express-validator";
import validateRequest from "../middleware/validation.middleware.js";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  getInvitationDetails,
  acceptWorkspaceInvitation,
} from "../controllers/invitation.controller.js";

const router = express.Router();

/**
 * @swagger
 * /api/invitations/{token}:
 *   get:
 *     summary: Get public safe invitation details
 *     tags: [Invitations]
 */
router.get("/:token", getInvitationDetails);

/**
 * @swagger
 * /api/invitations/{token}/accept:
 *   post:
 *     summary: Accept workspace invitation (Authenticated)
 *     tags: [Invitations]
 *     security:
 *       - bearerAuth: []
 */
router.post("/:token/accept", authMiddleware, acceptWorkspaceInvitation);

export default router;
