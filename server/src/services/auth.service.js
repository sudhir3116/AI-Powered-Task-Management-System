import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/user.model.js";

const normalizeEmail = (email) => {
  if (!email || typeof email !== "string") return "";
  return email.trim().toLowerCase();
};

const createAuthToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    const err = new Error("JWT secret is not configured");
    err.statusCode = 500;
    throw err;
  }

  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const formatUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || null,
  authProvider: user.authProvider || "local",
});

export const registerUserService = async (userData) => {
    const { name, email, password } = userData;
    const normalizedEmail = normalizeEmail(email);

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
        const error = new Error("User already exists");
        error.statusCode = 400;
        throw error;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        authProvider: "local",
    });

    // Generate JWT
    const token = createAuthToken(user._id);

    return {
        user: formatUserResponse(user),
        token,
    };
};

export const loginUserService = async ({ email, password }) => {
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    if (user.authProvider === "google" && !user.password) {
        const error = new Error("This account uses Google sign-in. Please sign in with Google.");
        error.statusCode = 401;
        throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const token = createAuthToken(user._id);

    return {
        user: formatUserResponse(user),
        token,
    };
};

export const googleAuthService = async (idToken) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
        const error = new Error("Google OAuth is not configured on this server");
        error.statusCode = 503;
        throw error;
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    let payload;
    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
    } catch {
        const error = new Error("Invalid Google credential");
        error.statusCode = 401;
        throw error;
    }

    const { sub: googleId, email, name, picture: avatar } = payload;
    const normalizedEmail = normalizeEmail(email);

    // Find existing user by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email: normalizedEmail }] });

    if (user) {
        // Link Google account if email matched but no googleId yet
        if (!user.googleId) {
            user.googleId = googleId;
            user.avatar = avatar || user.avatar;
            user.authProvider = "google";
            await user.save();
        }
    } else {
        // Create new Google user
        user = await User.create({
            name,
            email: normalizedEmail,
            googleId,
            avatar: avatar || null,
            authProvider: "google",
            password: null,
        });
    }

    const token = createAuthToken(user._id);

    return {
        user: formatUserResponse(user),
        token,
    };
};

export const getProfileService = async (userId) => {
    const user = await User.findById(userId).select("-password -googleId");

    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    return formatUserResponse(user);
};