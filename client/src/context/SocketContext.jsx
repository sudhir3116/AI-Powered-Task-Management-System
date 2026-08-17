import { createContext, useContext, useEffect, useState, useMemo, useRef } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";
import { useWorkspace } from "./WorkspaceContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?._id || activeWorkspace?.id;

  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [onlineCount, setOnlineCount] = useState(1);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  // Multi-tab BroadcastChannel
  const broadcastChannelRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      broadcastChannelRef.current = new BroadcastChannel("taskflow_tab_sync");
    }
    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, []);

  const emitTabSync = (type, payload) => {
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({ type, payload });
      } catch {
        // ignore tab sync errors
      }
    }
  };

  const userId = user?._id || user?.id;

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnectionStatus("Disconnected");
      }
      return;
    }

    const token = sessionStorage.getItem("token");
    if (!token) return;

    setConnectionStatus("Connecting");

    const newSocket = io(import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace(/\/api$/, "") : "http://localhost:8000", {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    newSocket.on("connect", () => {
      setConnectionStatus("Connected");
      if (workspaceId) {
        newSocket.emit("join_workspace", workspaceId);
      }
    });

    newSocket.on("reconnect_attempt", () => {
      setConnectionStatus("Reconnecting");
    });

    newSocket.on("disconnect", () => {
      setConnectionStatus("Disconnected");
    });

    newSocket.on("presence.update", (data) => {
      if (data && data.workspaceId === workspaceId) {
        setOnlineCount(data.onlineCount || 1);
        setOnlineUserIds(data.onlineUserIds || []);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, userId]);

  // Handle Workspace Switch Room Joining
  useEffect(() => {
    if (socket && socket.connected && workspaceId) {
      socket.emit("join_workspace", workspaceId);
    }
  }, [socket, workspaceId]);

  const value = useMemo(
    () => ({
      socket,
      connectionStatus,
      onlineCount,
      onlineUserIds,
      emitTabSync,
    }),
    [socket, connectionStatus, onlineCount, onlineUserIds]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
