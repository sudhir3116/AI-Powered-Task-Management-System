import http from "node:http";
import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initSocket } from "./socket.js";

// Connect Database
connectDB();

const PORT = process.env.PORT || 8000;
const httpServer = http.createServer(app);

// Initialize Socket.IO
initSocket(httpServer);

const server = httpServer.listen(PORT, () => {
  console.log(`🚀 TaskFlow AI Server running on http://localhost:${PORT}`);
});

const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log("HTTP server closed.");
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
    process.exit(0);
  });
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));