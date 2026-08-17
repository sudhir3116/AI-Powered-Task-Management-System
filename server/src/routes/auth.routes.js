import express from "express";
import { check } from "express-validator";
import validateRequest from "../middleware/validation.middleware.js";
import authMiddleware from "../middleware/auth.middleware.js";
import {
    registerUser,
    loginUser,
    googleAuth,
    getProfile,
    updateProfile,
    updatePassword,
    forgotPassword,
    resetPassword,
} from "../controllers/auth.controller.js";

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 */
router.post(
    "/register",
    [
        check("name").notEmpty().withMessage("Name is required"),
        check("email").isEmail().withMessage("Valid email is required"),
        check("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    ],
    validateRequest,
    registerUser
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post(
    "/login",
    [
        check("email").isEmail().withMessage("Valid email is required"),
        check("password").notEmpty().withMessage("Password is required"),
    ],
    validateRequest,
    loginUser
);

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Authenticate with Google OAuth
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [credential]
 *             properties:
 *               credential:
 *                 type: string
 *                 description: Google ID token from Google Identity Services
 *     responses:
 *       200:
 *         description: Google login successful
 *       401:
 *         description: Invalid Google credential
 *       503:
 *         description: Google OAuth not configured on server
 */
router.post(
    "/google",
    [check("credential").notEmpty().withMessage("Google credential is required")],
    validateRequest,
    googleAuth
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 */
router.get("/me", authMiddleware, getProfile);

router.patch(
    "/profile",
    authMiddleware,
    [check("name").optional().trim().notEmpty().withMessage("Name cannot be empty")],
    validateRequest,
    updateProfile
);

router.patch(
    "/password",
    authMiddleware,
    [
        check("currentPassword").notEmpty().withMessage("Current password is required"),
        check("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
    ],
    validateRequest,
    updatePassword
);

router.post(
    "/forgot-password",
    [check("email").isEmail().withMessage("Valid email address is required")],
    validateRequest,
    forgotPassword
);

router.post(
    "/reset-password/:token",
    [check("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters")],
    validateRequest,
    resetPassword
);

export default router;