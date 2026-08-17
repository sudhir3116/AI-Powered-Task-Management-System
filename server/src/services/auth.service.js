import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/user.model.js";
import { sendLoginNotificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from "./email.service.js";
import logger from "../utils/logger.js";

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
        welcomeEmailSent: true,
    });

    // Generate JWT
    const token = createAuthToken(user._id);

    // Send async welcome email (non-blocking)
    void sendWelcomeEmail({
        email: user.email,
        name: user.name,
    });

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

    logger.info(`Login successful for user: ${user.email}`);
    logger.info(`Login notification email requested for: ${user.email}`);

    // Asynchronous non-blocking email notification
    void sendLoginNotificationEmail({
      email: user.email,
      name: user.name,
      loginMethod: "Email & Password",
      loginTime: new Date(),
    });

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
    let isNewUser = false;

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
        isNewUser = true;
        user = await User.create({
            name,
            email: normalizedEmail,
            googleId,
            avatar: avatar || null,
            authProvider: "google",
            password: null,
            welcomeEmailSent: true,
        });
    }

    // If new Google user, send welcome email
    if (isNewUser || !user.welcomeEmailSent) {
        user.welcomeEmailSent = true;
        await user.save();
        void sendWelcomeEmail({ email: user.email, name: user.name });
    }

    const token = createAuthToken(user._id);

    logger.info(`Login successful for user: ${user.email}`);
    logger.info(`Login notification email requested for: ${user.email}`);

    // Asynchronous non-blocking email notification
    void sendLoginNotificationEmail({
      email: user.email,
      name: user.name,
      loginMethod: "Google OAuth",
      loginTime: new Date(),
    });

    return {
        user: formatUserResponse(user),
        token,
    };
};

export const getProfileService = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    return formatUserResponse(user);
};

export const updateProfileService = async (userId, { name }) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  if (name && typeof name === "string") {
    user.name = name.trim();
  }
  await user.save();
  return formatUserResponse(user);
};

export const updatePasswordService = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select("+password");
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  if (!user.password) {
    const error = new Error("Accounts authenticated via Google OAuth do not set a password.");
    error.statusCode = 400;
    throw error;
  }
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 400;
    throw error;
  }
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();
  return { success: true };
};

export const forgotPasswordService = async ({ email }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    const error = new Error("Valid email address is required.");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ email: normalizedEmail });

  // Uniform security message to prevent user enumeration
  const genericResponse = {
    success: true,
    message: "If an account with that email exists, password reset instructions have been sent.",
  };

  if (!user || user.authProvider === "google") {
    return genericResponse;
  }

  // Generate 32-byte crypto token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  user.resetPasswordTokenHash = tokenHash;
  user.resetPasswordExpiresAt = expiresAt;
  await user.save();

  const baseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || "http://localhost:5173";
  const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password/${rawToken}`;

  void sendPasswordResetEmail({ email: user.email, resetUrl });

  return genericResponse;
};

export const resetPasswordService = async ({ token, newPassword }) => {
  if (!token || typeof token !== "string") {
    const error = new Error("Password reset token is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    const error = new Error("New password must be at least 6 characters.");
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    const error = new Error("Invalid or expired password reset token.");
    error.statusCode = 400;
    throw error;
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.resetPasswordTokenHash = null;
  user.resetPasswordExpiresAt = null;
  await user.save();

  return {
    success: true,
    message: "Password has been successfully reset. You can now log in with your new password.",
  };
};