import {
    registerUserService,
    loginUserService
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