import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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
    });

    // Generate JWT
    const token = createAuthToken(user._id);

    return {
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
        },
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

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const token = createAuthToken(user._id);

    return {
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
        },
        token,
    };
};