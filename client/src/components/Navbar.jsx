import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Popover,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useSocket } from "../context/SocketContext";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  deleteNotification,
} from "../services/notificationService";

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getNotificationIcon = (type) => {
  switch (type?.toUpperCase()) {
    case "TASK_ASSIGNED":
    case "TASK_CREATED":
    case "TASK_UPDATED":
      return "📌";
    case "COMMENT":
    case "COMMENT_CREATED":
      return "💬";
    case "INVITATION":
    case "INVITATION_RECEIVED":
    case "INVITATION_ACCEPTED":
      return "✉️";
    case "WORKSPACE":
    case "MEMBER_ROLE":
      return "🏢";
    case "AI_PROCESSING":
      return "✨";
    default:
      return "🔔";
  }
};

const getRelativeTime = (dateString) => {
  if (!dateString) return "";
  const now = new Date();
  const past = new Date(dateString);
  const diffInSec = Math.floor((now - past) / 1000);
  if (diffInSec < 60) return "Just now";
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin}m ago`;
  const diffInHrs = Math.floor(diffInMin / 60);
  if (diffInHrs < 24) return `${diffInHrs}h ago`;
  const diffInDays = Math.floor(diffInHrs / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return past.toLocaleDateString();
};

const Navbar = ({ onCreateTask }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { workspaces, activeWorkspace, switchWorkspace, createNewWorkspace } = useWorkspace();
  const { socket, connectionStatus, onlineCount } = useSocket();

  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [workspaceMenuAnchor, setWorkspaceMenuAnchor] = useState(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifWrapperRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifTab, setNotifTab] = useState("all");

  // Close notification popover on outside click or Escape key press
  useEffect(() => {
    if (!isNotifOpen) return;

    const handleOutsideClick = (e) => {
      if (notifWrapperRef.current && !notifWrapperRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNotifOpen]);

  // Real-time socket notification listener
  useEffect(() => {
    if (!socket) return;
    const handleNotifCreated = (newNotif) => {
      if (newNotif) {
        setNotifications((prev) => [newNotif, ...prev.filter((n) => (n._id || n.id) !== (newNotif._id || newNotif.id))]);
        setUnreadCount((count) => count + 1);
        toast(`New alert: ${newNotif.title || "Task update"}`, { icon: getNotificationIcon(newNotif.type) });
      }
    };
    socket.on("notification.created", handleNotifCreated);
    return () => {
      socket.off("notification.created", handleNotifCreated);
    };
  }, [socket]);

  const userId = user?._id || user?.id;

  const fetchUserNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await getNotifications();
      setNotifications(res.data || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // Ignore notification fetch error gracefully
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      void fetchUserNotifications();
    }
  }, [userId, fetchUserNotifications]);

  // Poll for new notifications every 60 seconds
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      void fetchUserNotifications();
    }, 60_000);
    return () => clearInterval(interval);
  }, [userId, fetchUserNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => ((n._id || n.id) === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      // ignore
    }
  };

  const handleDismissNotification = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => (n._id || n.id) !== id));
      setUnreadCount((c) => {
        const dismissed = notifications.find((n) => (n._id || n.id) === id);
        return dismissed && !dismissed.read ? Math.max(0, c - 1) : c;
      });
    } catch {
      // ignore
    }
  };

  const handleNotifItemClick = async (n) => {
    const nId = n._id || n.id;
    if (!n.read) {
      void handleMarkRead(nId);
    }
    setIsNotifOpen(false);

    if (n.targetUrl) {
      navigate(n.targetUrl);
    } else if (n.task || (n.entityType === "task" && n.entityId)) {
      navigate(`/tasks/${n.task || n.entityId}`);
    } else if (n.type === "invitation" || n.entityType === "invitation") {
      navigate("/workspace/members");
    } else if (n.type === "workspace" || n.entityType === "workspace") {
      navigate("/dashboard");
    }
  };

  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [creatingWs, setCreatingWs] = useState(false);

  const handleUserMenuOpen = (event) => setUserMenuAnchor(event.currentTarget);
  const handleUserMenuClose = () => setUserMenuAnchor(null);

  const handleWsMenuOpen = (event) => setWorkspaceMenuAnchor(event.currentTarget);
  const handleWsMenuClose = () => setWorkspaceMenuAnchor(null);

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
  };

  const handleSelectWorkspace = (wsId) => {
    handleWsMenuClose();
    switchWorkspace(wsId);
    toast.success("Workspace switched");
  };

  const handleOpenCreateWs = () => {
    handleWsMenuClose();
    setNewWsName("");
    setIsCreateWsOpen(true);
  };

  const handleCreateWsSubmit = async (e) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    setCreatingWs(true);
    try {
      await createNewWorkspace(newWsName.trim());
      toast.success("Workspace created!");
      setIsCreateWsOpen(false);
      setNewWsName("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create workspace");
    } finally {
      setCreatingWs(false);
    }
  };

  const displayedNotifications = notifications.filter((n) =>
    notifTab === "unread" ? !n.read : true
  );

  return (
    <>
      <AppBar className="app-navbar" color="inherit" elevation={0} position="sticky">
        <Toolbar className="navbar-toolbar">
          {/* Brand & Workspace Selector */}
          <Box display="flex" alignItems="center" gap={2}>
            <div className="brand-block">
              <Link to="/dashboard" className="brand-logo">
                <span className="brand-icon">⚡</span>
                <Typography color="primary" component="span" variant="h6" fontWeight={800} letterSpacing="-0.5px">
                  TaskFlow AI
                </Typography>
              </Link>
            </div>

            {/* Workspace Switcher */}
            <Button
              id="workspace-selector-btn"
              onClick={handleWsMenuOpen}
              variant="outlined"
              size="small"
              sx={{
                borderRadius: 2,
                borderColor: "#cbd5e1",
                color: "#1e293b",
                fontWeight: 700,
                textTransform: "none",
                py: 0.5,
                px: 1.5,
                bgcolor: "#ffffff",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                "&:hover": { borderColor: "primary.main", bgcolor: "#f8fafc" },
              }}
            >
              🏢 {activeWorkspace?.name || "My Workspace"} ▼
            </Button>

            <Menu
              id="workspace-menu"
              anchorEl={workspaceMenuAnchor}
              open={Boolean(workspaceMenuAnchor)}
              onClose={handleWsMenuClose}
              slotProps={{
                paper: {
                  elevation: 0,
                  sx: { minWidth: 240, mt: 1, border: "1px solid #e2e8f0", borderRadius: 2.5, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" },
                },
              }}
            >
              <div style={{ padding: "10px 16px 6px" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={800} letterSpacing="0.5px">
                  SWITCH WORKSPACE
                </Typography>
              </div>
              <Divider />
              {workspaces.map((ws) => {
                const wsId = ws._id || ws.id;
                const isSelected = (activeWorkspace?._id || activeWorkspace?.id) === wsId;
                return (
                  <MenuItem
                    key={wsId}
                    onClick={() => handleSelectWorkspace(wsId)}
                    selected={isSelected}
                    sx={{ py: 1, px: 2, fontWeight: isSelected ? 800 : 500 }}
                  >
                    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                      <span>{ws.name}</span>
                      {ws.role && (
                        <Chip
                          label={ws.role}
                          size="small"
                          color={ws.role === "OWNER" ? "primary" : "default"}
                          sx={{ height: 18, fontSize: "0.65rem", ml: 1, fontWeight: 700 }}
                        />
                      )}
                    </Box>
                  </MenuItem>
                );
              })}
              <Divider />
              <MenuItem component={Link} to="/workspace/members" onClick={handleWsMenuClose} sx={{ py: 1 }}>
                <ListItemIcon>👥</ListItemIcon>
                <Typography variant="body2" fontWeight={600}>Manage Members</Typography>
              </MenuItem>
              <MenuItem component={Link} to="/settings" onClick={handleWsMenuClose} sx={{ py: 1 }}>
                <ListItemIcon>⚙️</ListItemIcon>
                <Typography variant="body2" fontWeight={600}>Workspace Settings</Typography>
              </MenuItem>
              <MenuItem onClick={handleOpenCreateWs} id="create-workspace-menu-item" sx={{ py: 1.2 }}>
                <ListItemIcon>➕</ListItemIcon>
                <Typography fontWeight={700} color="primary.main">
                  Create Workspace
                </Typography>
              </MenuItem>
            </Menu>

            {/* Online presence badge */}
            <Chip
              label={`🟢 ${onlineCount} online`}
              size="small"
              variant="outlined"
              sx={{ height: 26, fontSize: "0.7rem", fontWeight: 700, borderColor: "#cbd5e1", bgcolor: "#ffffff" }}
              title="Real-time workspace presence"
            />

            {/* Socket Connection Status Indicator */}
            {connectionStatus !== "Connected" && (
              <Chip
                label={connectionStatus === "Reconnecting" ? "🔄 Reconnecting..." : "⚠️ Offline"}
                size="small"
                color={connectionStatus === "Reconnecting" ? "warning" : "error"}
                sx={{ height: 26, fontSize: "0.7rem", fontWeight: 700 }}
              />
            )}
          </Box>

          {/* Nav Actions & Profile */}
          <div className="navbar-actions">
            <Button
              id="navbar-dashboard-btn"
              component={Link}
              to="/dashboard"
              variant={location.pathname === "/dashboard" ? "contained" : "text"}
              color={location.pathname === "/dashboard" ? "primary" : "inherit"}
              size="small"
              sx={{ fontWeight: location.pathname === "/dashboard" ? 700 : 600, textTransform: "none", borderRadius: 2, fontSize: "0.85rem", py: 0.6, px: 1.25 }}
            >
              📊 Dashboard
            </Button>

            <Button
              id="navbar-board-btn"
              component={Link}
              to="/board"
              variant={location.pathname === "/board" ? "contained" : "text"}
              color={location.pathname === "/board" ? "primary" : "inherit"}
              size="small"
              sx={{ fontWeight: location.pathname === "/board" ? 700 : 600, textTransform: "none", borderRadius: 2, fontSize: "0.85rem", py: 0.6, px: 1.25 }}
            >
              📋 Kanban
            </Button>

            <Button
              id="navbar-notes-btn"
              component={Link}
              to="/notes"
              variant={location.pathname === "/notes" ? "contained" : "text"}
              color={location.pathname === "/notes" ? "primary" : "inherit"}
              size="small"
              sx={{ fontWeight: location.pathname === "/notes" ? 700 : 600, textTransform: "none", borderRadius: 2, fontSize: "0.85rem", py: 0.6, px: 1.25 }}
            >
              📝 Notes
            </Button>

            <Button
              id="navbar-analytics-btn"
              component={Link}
              to="/analytics"
              variant={location.pathname === "/analytics" ? "contained" : "text"}
              color={location.pathname === "/analytics" ? "primary" : "inherit"}
              size="small"
              sx={{ fontWeight: location.pathname === "/analytics" ? 700 : 600, textTransform: "none", borderRadius: 2, fontSize: "0.85rem", py: 0.6, px: 1.25 }}
            >
              📈 Analytics
            </Button>

            <Button
              id="navbar-team-btn"
              component={Link}
              to="/workspace/members"
              variant={location.pathname === "/workspace/members" ? "contained" : "text"}
              color={location.pathname === "/workspace/members" ? "primary" : "inherit"}
              size="small"
              sx={{ fontWeight: location.pathname === "/workspace/members" ? 700 : 600, textTransform: "none", borderRadius: 2, fontSize: "0.85rem", py: 0.6, px: 1.25 }}
            >
              👥 Team
            </Button>

            {onCreateTask && (
              <Button
                id="navbar-create-btn"
                onClick={onCreateTask}
                variant="contained"
                size="small"
                sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none", fontSize: "0.85rem", py: 0.6, px: 1.5 }}
              >
                + New Task
              </Button>
            )}

            {/* Notification Bell Wrapper */}
            <div className="notification-wrapper" ref={notifWrapperRef} style={{ position: "relative", display: "inline-block" }}>
              <IconButton
                id="notification-bell-btn"
                aria-label="Notifications"
                aria-expanded={isNotifOpen}
                aria-controls={isNotifOpen ? "notification-popover" : undefined}
                onClick={() => setIsNotifOpen((prev) => !prev)}
                sx={{
                  color: "text.primary",
                  p: 1,
                  borderRadius: 2,
                  bgcolor: isNotifOpen ? "rgba(79, 70, 229, 0.08)" : "transparent",
                  "&:hover": { bgcolor: "#f1f5f9" },
                  transition: "background-color 0.15s",
                }}
              >
                <Badge
                  badgeContent={unreadCount > 0 ? unreadCount : null}
                  color="error"
                  max={99}
                  slotProps={{
                    badge: {
                      sx: {
                        fontWeight: 800,
                        fontSize: "0.65rem",
                        height: 18,
                        minWidth: 18,
                        padding: "0 4px",
                        boxShadow: "0 0 0 2px #fff",
                      },
                    },
                  }}
                >
                  <span style={{ fontSize: "1.15rem", lineHeight: 1 }}>🔔</span>
                </Badge>
              </IconButton>

              {isNotifOpen && (
                <Paper
                  id="notification-popover"
                  className="notification-popover"
                  elevation={0}
                  sx={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: { xs: "calc(100vw - 32px)", sm: 380 },
                    maxWidth: "calc(100vw - 24px)",
                    maxHeight: 520,
                    borderRadius: 3,
                    boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
                    border: "1px solid #e2e8f0",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    zIndex: 1300,
                    bgcolor: "#ffffff",
                    animation: "slideUp 0.15s cubic-bezier(0.16, 1, 0.3, 1) both",
                  }}
                >
                  {/* Header */}
                  <Box p={2} pb={1.25} display="flex" justifyContent="space-between" alignItems="center" borderBottom="1px solid #f1f5f9" bgcolor="#ffffff">
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1" fontWeight={800} fontSize="0.95rem">
                        Notifications
                      </Typography>
                      {unreadCount > 0 && (
                        <Chip label={`${unreadCount} unread`} size="small" color="primary" sx={{ height: 20, fontSize: "0.68rem", fontWeight: 800 }} />
                      )}
                    </Box>
                    {unreadCount > 0 ? (
                      <Button size="small" onClick={handleMarkAllRead} sx={{ fontSize: "0.725rem", p: 0.5, textTransform: "none", fontWeight: 700 }}>
                        Mark all read
                      </Button>
                    ) : (
                      <IconButton size="small" onClick={() => setIsNotifOpen(false)} sx={{ p: 0.25 }} title="Close">
                        ✕
                      </IconButton>
                    )}
                  </Box>

                  {/* Compact Tabs */}
                  <Tabs
                    value={notifTab}
                    onChange={(_, val) => setNotifTab(val)}
                    variant="fullWidth"
                    sx={{
                      minHeight: 36,
                      borderBottom: "1px solid #f1f5f9",
                      bgcolor: "#f8fafc",
                      "& .MuiTab-root": { minHeight: 36, fontSize: "0.75rem", fontWeight: 700, textTransform: "none", py: 0 },
                    }}
                  >
                    <Tab value="all" label="All" />
                    <Tab value="unread" label={`Unread (${unreadCount})`} />
                  </Tabs>

                  {/* Scrollable Notification List / Empty State */}
                  {displayedNotifications.length === 0 ? (
                    <Box py={4} px={3} textAlign="center" my={1}>
                      <Box
                        width={36}
                        height={36}
                        borderRadius="50%"
                        bgcolor="rgba(5, 150, 105, 0.08)"
                        color="success.main"
                        display="inline-flex"
                        alignItems="center"
                        justifyContent="center"
                        fontWeight={800}
                        fontSize="1.1rem"
                        mb={1}
                        border="1px solid rgba(5, 150, 105, 0.2)"
                      >
                        ✓
                      </Box>
                      <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                        You're all caught up
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {notifTab === "unread" ? "No unread notifications right now" : "No new notifications right now"}
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ overflowY: "auto", maxHeight: 360, flexGrow: 1 }}>
                      {displayedNotifications.map((n) => {
                        const nId = n._id || n.id;
                        const icon = getNotificationIcon(n.type);
                        const timeAgo = getRelativeTime(n.createdAt);

                        return (
                          <Box
                            key={nId}
                            p={1.5}
                            px={2}
                            borderBottom="1px solid #f1f5f9"
                            bgcolor={n.read ? "#ffffff" : "rgba(79, 70, 229, 0.04)"}
                            display="flex"
                            alignItems="flex-start"
                            gap={1.5}
                            onClick={() => handleNotifItemClick(n)}
                            sx={{
                              cursor: "pointer",
                              "&:hover": { bgcolor: "#f8fafc" },
                              transition: "background-color 0.15s",
                              position: "relative",
                            }}
                          >
                            {/* Notification Icon */}
                            <Box
                              width={30}
                              height={30}
                              borderRadius="50%"
                              bgcolor={n.read ? "#f1f5f9" : "rgba(79, 70, 229, 0.1)"}
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              fontSize="0.85rem"
                              flexShrink={0}
                              mt={0.25}
                            >
                              {icon}
                            </Box>

                            <Box flexGrow={1} minWidth={0}>
                              <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                                <Typography
                                  variant="caption"
                                  fontWeight={800}
                                  color={n.read ? "text.primary" : "primary.main"}
                                  sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                >
                                  {n.title}
                                </Typography>
                                <Typography variant="caption" color="text.disabled" fontSize="0.65rem" flexShrink={0}>
                                  {timeAgo}
                                </Typography>
                              </Box>

                              <Typography variant="body2" fontSize="0.775rem" color="text.secondary" sx={{ mt: 0.25, lineHeight: 1.35 }}>
                                {n.message}
                              </Typography>
                            </Box>

                            {/* Unread dot & Dismiss button */}
                            <Box display="flex" alignItems="center" gap={0.5} flexShrink={0}>
                              {!n.read && (
                                <Box width={7} height={7} borderRadius="50%" bgcolor="primary.main" title="Unread" />
                              )}
                              <IconButton
                                size="small"
                                onClick={(e) => handleDismissNotification(e, nId)}
                                sx={{ p: 0.25, color: "text.disabled", "&:hover": { color: "error.main" } }}
                                title="Dismiss"
                              >
                                ✕
                              </IconButton>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  )}

                  {/* Footer Action */}
                  {unreadCount > 0 && (
                    <Box p={1} px={2} bgcolor="#f8fafc" borderTop="1px solid #e2e8f0" textAlign="center">
                      <Button
                        size="small"
                        fullWidth
                        onClick={handleMarkAllRead}
                        sx={{ fontSize: "0.725rem", textTransform: "none", fontWeight: 700 }}
                      >
                        ✓ Mark all as read
                      </Button>
                    </Box>
                  )}
                </Paper>
              )}
            </div>

            {/* User Avatar Menu */}
            <Avatar
              alt={user?.name}
              src={user?.avatar || undefined}
              onClick={handleUserMenuOpen}
              sx={{
                cursor: "pointer",
                bgcolor: "primary.main",
                width: 38,
                height: 38,
                fontSize: "0.875rem",
                fontWeight: 700,
                border: "2px solid",
                borderColor: "primary.light",
                transition: "transform 0.2s",
                "&:hover": { transform: "scale(1.08)" },
              }}
              aria-controls={userMenuAnchor ? "user-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={userMenuAnchor ? "true" : undefined}
            >
              {!user?.avatar && getInitials(user?.name)}
            </Avatar>

            <Menu
              id="user-menu"
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={handleUserMenuClose}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              slotProps={{
                paper: {
                  elevation: 0,
                  sx: { minWidth: 220, mt: 1, border: "1px solid #e2e8f0", borderRadius: 2.5, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" },
                },
              }}
            >
              <div style={{ padding: "12px 16px" }}>
                <Typography variant="subtitle2" fontWeight={800}>{user?.name || "User"}</Typography>
                <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
              </div>
              <Divider />
              <MenuItem component={Link} to="/settings" onClick={handleUserMenuClose} id="settings-btn" sx={{ py: 1 }}>
                <ListItemIcon>⚙️</ListItemIcon>
                Settings & Profile
              </MenuItem>
              <MenuItem onClick={handleLogout} id="logout-btn" sx={{ py: 1 }}>
                <ListItemIcon>🚪</ListItemIcon>
                Sign out
              </MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>

      {/* Create Workspace Dialog */}
      <Dialog open={isCreateWsOpen} onClose={() => setIsCreateWsOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <form onSubmit={handleCreateWsSubmit}>
          <DialogTitle fontWeight={800}>Create New Workspace</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Workspaces allow you to separate tasks by team, project, or organization.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label="Workspace Name"
              placeholder="e.g. Engineering, Product, Marketing"
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              required
              slotProps={{ input: { sx: { borderRadius: 2 } } }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 1 }}>
            <Button onClick={() => setIsCreateWsOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={creatingWs || !newWsName.trim()} sx={{ borderRadius: 2, fontWeight: 700 }}>
              {creatingWs ? "Creating..." : "Create Workspace"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
};

export default Navbar;
