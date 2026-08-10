import express from "express";
import { check } from "express-validator";
import validateRequest from "../middleware/validation.middleware.js";
import {
    registerUser,
    loginUser
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
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
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
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
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

export default router;