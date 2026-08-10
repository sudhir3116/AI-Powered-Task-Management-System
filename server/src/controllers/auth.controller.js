import {
    registerUserService,
    loginUserService,
    googleAuthService,
    getProfileService,
} from "../services/auth.service.js";
import asyncHandler from "../utils/asyncHandler.js";

// Register User
export const registerUser = asyncHandler(async (req, res) => {
    const result = await registerUserService(req.body);

    res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: result
    });
});

// Login User
export const loginUser = asyncHandler(async (req, res) => {
    const result = await loginUserService(req.body);

    res.status(200).json({
        success: true,
        message: "Login successful",
        data: result
    });
});

// Google OAuth
export const googleAuth = asyncHandler(async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({
            success: false,
            message: "Google credential is required",
        });
    }

    const result = await googleAuthService(credential);

    res.status(200).json({
        success: true,
        message: "Google login successful",
        data: result,
    });
});

// Get Current User Profile
export const getProfile = asyncHandler(async (req, res) => {
    const user = await getProfileService(req.user.id);

    res.status(200).json({
        success: true,
        data: { user },
    });
});