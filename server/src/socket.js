import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import OrganizationMember from "./models/organizationMember.model.js";
import logger from "./utils/logger.js";

let io = null;
const workspacePresence = new Map(); // workspaceId -> Map(socketId -> userId)

export const initSocket = (httpServer) => {
  const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, true); // Allow connection in dev/test
      },
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // JWT Middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/, "");

      if (!token) {
        return next(new Error("Authentication error: Token required"));
      }

      if (!process.env.JWT_SECRET) {
        return next(new Error("Server error: JWT secret not configured"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id };
      next();
    } catch (err) {
      logger.warn(`[Socket.IO] Auth failure: ${err.message}`);
      next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;
    logger.info(`[Socket.IO] User connected: ${userId} (Socket ID: ${socket.id})`);

    // Join personal user room for direct notifications
    socket.join(`user:${userId}`);

    // Join workspace event (with server-side membership check)
    socket.on("join_workspace", async (workspaceId) => {
      if (!workspaceId) return;

      try {
        const membership = await OrganizationMember.findOne({
          organization: workspaceId,
          user: userId,
        });

        if (!membership) {
          logger.warn(`[Socket.IO] Access denied for user ${userId} to workspace ${workspaceId}`);
          socket.emit("error", { message: "Access denied to requested workspace room" });
          return;
        }

        // Leave previous workspace rooms
        for (const room of socket.rooms) {
          if (room.startsWith("workspace:")) {
            socket.leave(room);
            const prevWsId = room.replace("workspace:", "");
            updateWorkspacePresence(prevWsId, socket.id, null);
          }
        }

        // Join new workspace room
        const roomName = `workspace:${workspaceId}`;
        socket.join(roomName);
        logger.info(`[Socket.IO] User ${userId} joined room ${roomName}`);

        // Update presence
        updateWorkspacePresence(workspaceId, socket.id, userId);
      } catch (err) {
        logger.error(`[Socket.IO] Error joining workspace room: ${err.message}`);
      }
    });

    // Leave workspace event
    socket.on("leave_workspace", (workspaceId) => {
      if (!workspaceId) return;
      const roomName = `workspace:${workspaceId}`;
      socket.leave(roomName);
      updateWorkspacePresence(workspaceId, socket.id, null);
    });

    // Disconnect cleanup
    socket.on("disconnect", () => {
      logger.info(`[Socket.IO] User disconnected: ${userId} (Socket ID: ${socket.id})`);
      for (const [wsId, socketMap] of workspacePresence.entries()) {
        if (socketMap.has(socket.id)) {
          updateWorkspacePresence(wsId, socket.id, null);
        }
      }
    });
  });

  return io;
};

const updateWorkspacePresence = (workspaceId, socketId, userId) => {
  if (!workspaceId) return;

  if (!workspacePresence.has(workspaceId)) {
    workspacePresence.set(workspaceId, new Map());
  }

  const socketMap = workspacePresence.get(workspaceId);

  if (userId) {
    socketMap.set(socketId, userId);
  } else {
    socketMap.delete(socketId);
  }

  const uniqueUsers = new Set(socketMap.values());
  const onlineCount = uniqueUsers.size;
  const onlineUserIds = Array.from(uniqueUsers);

  if (io) {
    io.to(`workspace:${workspaceId}`).emit("presence.update", {
      workspaceId,
      onlineCount,
      onlineUserIds,
    });
  }
};

export const getIO = () => io;

export const emitToWorkspace = (workspaceId, event, data) => {
  if (io && workspaceId) {
    io.to(`workspace:${workspaceId}`).emit(event, data);
  }
};

export const emitToUser = (userId, event, data) => {
  if (io && userId) {
    io.to(`user:${userId}`).emit(event, data);
  }
};
