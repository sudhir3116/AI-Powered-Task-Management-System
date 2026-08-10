import logger from "../utils/logger.js";

const errorMiddleware = (err, req, res, next) => {
  // Log structured error info
  logger.error(`${req.method} ${req.path} — ${err.message}`, {
    statusCode: err.statusCode,
    name: err.name,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
  });

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError") {
    statusCode = 404;
    message = "Resource not found";
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `A record with this ${field} already exists`;
  }

  // Mongoose ValidationError
  if (err.name === "ValidationError") {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(statusCode).json({ success: false, message: "Validation failed", errors });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired. Please sign in again.";
  }

  // Never leak internal details in production
  if (statusCode === 500 && process.env.NODE_ENV === "production") {
    message = "Internal Server Error";
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export default errorMiddleware;
