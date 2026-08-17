import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import mongoose from "mongoose";

import taskRoutes from "./routes/task.routes.js";
import authRoutes from "./routes/auth.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import organizationRoutes from "./routes/organization.routes.js";
import invitationRoutes from "./routes/invitation.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import noteRoutes from "./routes/note.routes.js";
import errorMiddleware from "./middleware/error.middleware.js";
import { swaggerDocs } from "./config/swagger.js";

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Rate limiters
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication attempts. Please try again later." },
});

const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "AI request limit reached. Please try again later." },
});

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      const error = new Error("Origin is not allowed by CORS policy");
      error.statusCode = 403;
      return callback(error);
    },
  })
);

// Logging (dev only)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use("/api", apiRateLimiter);

// Health check endpoints
const healthCheckHandler = (req, res) => {
  const dbStateMap = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  res.json({
    success: true,
    status: "ok",
    message: "AI-Powered Task Management API is running",
    version: "2.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbStateMap[mongoose.connection.readyState] || "unknown",
    docs: "/api/docs",
  });
};

app.get("/", healthCheckHandler);
app.get("/health", healthCheckHandler);
app.get("/api/health", healthCheckHandler);

// Routes
app.use("/api/auth", authRateLimiter, authRoutes);
app.use("/api/workspaces", organizationRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/ai", aiRateLimiter, aiRoutes);

// Swagger docs
swaggerDocs(app);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// Global error middleware
app.use(errorMiddleware);

export default app;
