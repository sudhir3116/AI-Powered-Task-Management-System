import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import api from "../api/axios";
import { updateWorkspace, deleteWorkspace, removeWorkspaceMember, getWorkspaceMembers } from "../services/workspaceService";

const Settings = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { activeWorkspace, refreshWorkspaces } = useWorkspace();
  const [tabIndex, setTabIndex] = useState(0);

  // Profile Form
  const [name, setName] = useState(user?.name || "");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSaveStatus, setProfileSaveStatus] = useState("");

  // Security Form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Notification Preferences
  const [notifPreferences, setNotifPreferences] = useState({
    taskAssignments: true,
    taskUpdates: true,
    comments: true,
    workspaceActivity: true,
    systemNotifs: true,
  });

  // Workspace Settings
  const [wsNameInput, setWsNameInput] = useState(activeWorkspace?.name || "");
  const [renamingWs, setRenamingWs] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingWs, setDeletingWs] = useState(false);

  // Leave Workspace
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leavingWs, setLeavingWs] = useState(false);

  const workspaceId = activeWorkspace?._id || activeWorkspace?.id;
  const userRole = activeWorkspace?.role || "MEMBER";
  const isOwner = userRole === "OWNER";
  const isAdminOrOwner = userRole === "OWNER" || userRole === "ADMIN";

  const handleToggleNotif = (key) => {
    setNotifPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setUpdatingProfile(true);
    setProfileSaveStatus("saving");
    try {
      const res = await api.patch("/auth/profile", { name: name.trim() });
      setProfileSaveStatus("saved");
      toast.success("Profile updated successfully");
      if (updateUser && res.data?.data?.user) {
        updateUser(res.data.data.user);
      }
      setTimeout(() => setProfileSaveStatus(""), 3000);
    } catch (err) {
      setProfileSaveStatus("error");
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    setUpdatingPassword(true);
    try {
      await api.patch("/auth/password", { currentPassword, newPassword });
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleRenameWorkspace = async (e) => {
    e.preventDefault();
    if (!wsNameInput.trim() || !workspaceId) return;
    setRenamingWs(true);
    try {
      await updateWorkspace(workspaceId, { name: wsNameInput.trim() });
      toast.success("Workspace renamed successfully!");
      await refreshWorkspaces();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to rename workspace");
    } finally {
      setRenamingWs(false);
    }
  };

  const handleDeleteWorkspaceConfirm = async () => {
    if (deleteConfirmText.trim() !== activeWorkspace?.name) return;
    setDeletingWs(true);
    try {
      await deleteWorkspace(workspaceId);
      toast.success("Workspace deleted successfully");
      setIsDeleteModalOpen(false);
      await refreshWorkspaces();
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete workspace");
    } finally {
      setDeletingWs(false);
    }
  };

  const handleLeaveWorkspaceConfirm = async () => {
    setLeavingWs(true);
    try {
      const res = await getWorkspaceMembers(workspaceId);
      const members = res.data || [];
      const currentMember = members.find((m) => m.user?._id === user?.id || m.user?.id === user?.id);
      if (currentMember) {
        await removeWorkspaceMember(workspaceId, currentMember._id || currentMember.id);
        toast.success("You have left the workspace");
        setIsLeaveModalOpen(false);
        await refreshWorkspaces();
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to leave workspace");
    } finally {
      setLeavingWs(false);
    }
  };

  const navItems = [
    { label: "Profile", icon: "👤" },
    { label: "Security", icon: "🔒" },
    { label: "Notifications", icon: "🔔" },
    { label: "Workspace & Plan", icon: "🏢" },
  ];

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <Navbar />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Breadcrumbs
          items={[
            { label: "Home", to: "/dashboard" },
            { label: activeWorkspace?.name || "Workspace", to: "/dashboard" },
            { label: "Settings" },
          ]}
        />

        {/* Page Header */}
        <Box mb={3.5}>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: "-0.5px" }}>
            ⚙️ Settings & Preferences
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Manage your account identity, authentication security, notifications, and workspace settings.
          </Typography>
        </Box>

        {/* 2-Column SaaS Layout */}
        <Grid container spacing={3.5}>
          {/* Left Navigation Sidebar */}
          <Grid item xs={12} md={3.5}>
            <Paper sx={{ borderRadius: 3, border: "1px solid #e2e8f0", overflow: "hidden" }} elevation={0}>
              <List disablePadding sx={{ p: 1 }}>
                {navItems.map((item, idx) => {
                  const isSelected = tabIndex === idx;
                  return (
                    <ListItemButton
                      key={item.label}
                      selected={isSelected}
                      onClick={() => setTabIndex(idx)}
                      sx={{
                        borderRadius: 2,
                        mb: 0.5,
                        py: 1.25,
                        px: 2,
                        fontWeight: isSelected ? 800 : 600,
                        bgcolor: isSelected ? "rgba(79, 70, 229, 0.08)" : "transparent",
                        color: isSelected ? "primary.main" : "text.primary",
                        "&:hover": { bgcolor: "#f8fafc" },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, fontSize: "1.1rem" }}>{item.icon}</ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        slotProps={{ primary: { fontSize: "0.9rem", fontWeight: isSelected ? 800 : 600 } }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Paper>
          </Grid>

          {/* Right Content Panel */}
          <Grid item xs={12} md={8.5}>
            <Paper sx={{ p: 4, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
              {/* Tab 0: Profile */}
              {tabIndex === 0 && (
                <Box maxWidth={580}>
                  <Typography variant="h6" fontWeight={800} gutterBottom>
                    Account Profile
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Your profile information is visible to team members in your workspaces.
                  </Typography>

                  {/* Compact Identity Header Card */}
                  <Card variant="outlined" sx={{ p: 2.5, mb: 3.5, borderRadius: 2.5, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <Box display="flex" alignItems="center" gap={2.5}>
                      <Avatar
                        src={user?.avatar || undefined}
                        sx={{ width: 64, height: 64, bgcolor: "primary.main", fontSize: "1.5rem", fontWeight: 800, border: "2px solid", borderColor: "primary.light" }}
                      >
                        {user?.name ? user.name[0].toUpperCase() : "U"}
                      </Avatar>
                      <Box flexGrow={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="h6" fontWeight={800}>{user?.name}</Typography>
                          <Chip label={userRole} size="small" color="primary" sx={{ fontWeight: 800, fontSize: "0.68rem", height: 20 }} />
                        </Box>
                        <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
                        <Typography variant="caption" color="text.disabled">Account Identity • {user?.authProvider === "google" ? "Google OAuth 2.0" : "Password Auth"}</Typography>
                      </Box>
                    </Box>
                  </Card>

                  <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                    Profile Information
                  </Typography>

                  <Box component="form" onSubmit={handleUpdateProfile}>
                    <TextField
                      fullWidth
                      label="Full Display Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      sx={{ mb: 2.5 }}
                      slotProps={{ input: { sx: { borderRadius: 2 } } }}
                    />

                    <TextField
                      fullWidth
                      label="Email Address"
                      value={user?.email || ""}
                      disabled
                      helperText="Email address is read-only for account identity security."
                      sx={{ mb: 3 }}
                      slotProps={{ input: { sx: { borderRadius: 2 } } }}
                    />

                    <Box display="flex" alignItems="center" gap={2}>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={updatingProfile || !name.trim()}
                        sx={{ borderRadius: 2, px: 4, py: 1.2, fontWeight: 700, textTransform: "none" }}
                      >
                        {updatingProfile ? "Saving..." : "Save Changes"}
                      </Button>
                      {profileSaveStatus === "saved" && (
                        <Typography variant="caption" color="success.main" fontWeight={700}>
                          ✓ Saved
                        </Typography>
                      )}
                      {profileSaveStatus === "error" && (
                        <Typography variant="caption" color="error.main" fontWeight={700}>
                          ⚠️ Unable to save
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Tab 1: Security */}
              {tabIndex === 1 && (
                <Box maxWidth={540}>
                  <Typography variant="h6" fontWeight={800} gutterBottom>
                    Authentication & Security
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Manage your sign-in methods and password credentials.
                  </Typography>

                  <Card variant="outlined" sx={{ p: 2.5, mb: 3.5, borderRadius: 2.5, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <Typography variant="body2" color="text.secondary">
                      Connected Authentication Method: <strong>{user?.authProvider === "google" ? "🌐 Google OAuth 2.0" : "🔑 Email & Password"}</strong>
                    </Typography>
                    <Typography variant="caption" color="text.disabled" display="block" mt={0.5}>
                      JWT session management enabled with secure browser storage.
                    </Typography>
                  </Card>

                  <Divider sx={{ my: 3 }} />

                  <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                    Password Management
                  </Typography>
                  {user?.authProvider === "google" ? (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      Your account is authenticated via Google OAuth 2.0. Password updates are managed directly through your Google Account settings.
                    </Alert>
                  ) : (
                    <Box component="form" onSubmit={handleUpdatePassword}>
                      <TextField
                        fullWidth
                        type="password"
                        label="Current Password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        sx={{ mb: 2 }}
                        slotProps={{ input: { sx: { borderRadius: 2 } } }}
                      />
                      <TextField
                        fullWidth
                        type="password"
                        label="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        sx={{ mb: 3 }}
                        slotProps={{ input: { sx: { borderRadius: 2 } } }}
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={updatingPassword || !currentPassword || !newPassword}
                        sx={{ borderRadius: 2, px: 4, py: 1.2, fontWeight: 700, textTransform: "none" }}
                      >
                        {updatingPassword ? "Updating..." : "Update Password"}
                      </Button>
                    </Box>
                  )}
                </Box>
              )}

              {/* Tab 2: Notifications */}
              {tabIndex === 2 && (
                <Box maxWidth={560}>
                  <Typography variant="h6" fontWeight={800} gutterBottom>
                    Notification Preferences
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Choose which activity triggers real-time in-app alerts and notifications.
                  </Typography>

                  <Box display="flex" flexDirection="column" gap={2.5} mb={3.5}>
                    <FormControlLabel
                      control={<Switch checked={notifPreferences.taskAssignments} onChange={() => handleToggleNotif("taskAssignments")} color="primary" />}
                      label={
                        <div>
                          <Typography variant="subtitle2" fontWeight={700}>Task Assignments</Typography>
                          <Typography variant="caption" color="text.secondary">Notify when a team member assigns a task to you.</Typography>
                        </div>
                      }
                    />

                    <FormControlLabel
                      control={<Switch checked={notifPreferences.taskUpdates} onChange={() => handleToggleNotif("taskUpdates")} color="primary" />}
                      label={
                        <div>
                          <Typography variant="subtitle2" fontWeight={700}>Task Status Updates</Typography>
                          <Typography variant="caption" color="text.secondary">Notify when status or priority changes on your tasks.</Typography>
                        </div>
                      }
                    />

                    <FormControlLabel
                      control={<Switch checked={notifPreferences.comments} onChange={() => handleToggleNotif("comments")} color="primary" />}
                      label={
                        <div>
                          <Typography variant="subtitle2" fontWeight={700}>Task Comments</Typography>
                          <Typography variant="caption" color="text.secondary">Notify when a team member posts a comment on your task.</Typography>
                        </div>
                      }
                    />

                    <FormControlLabel
                      control={<Switch checked={notifPreferences.workspaceActivity} onChange={() => handleToggleNotif("workspaceActivity")} color="primary" />}
                      label={
                        <div>
                          <Typography variant="subtitle2" fontWeight={700}>Workspace Member Events</Typography>
                          <Typography variant="caption" color="text.secondary">Notify when members join or leave the workspace.</Typography>
                        </div>
                      }
                    />

                    <FormControlLabel
                      control={<Switch checked={notifPreferences.systemNotifs} onChange={() => handleToggleNotif("systemNotifs")} color="primary" />}
                      label={
                        <div>
                          <Typography variant="subtitle2" fontWeight={700}>System & AI Alerts</Typography>
                          <Typography variant="caption" color="text.secondary">Receive AI task parsing summaries and system updates.</Typography>
                        </div>
                      }
                    />
                  </Box>

                  <Button
                    variant="contained"
                    onClick={() => toast.success("Notification preferences saved!")}
                    sx={{ borderRadius: 2, px: 4, py: 1.2, fontWeight: 700, textTransform: "none" }}
                  >
                    Save Preferences
                  </Button>
                </Box>
              )}

              {/* Tab 3: Workspace & Plan */}
              {tabIndex === 3 && (
                <Box maxWidth={600}>
                  <Typography variant="h6" fontWeight={800} gutterBottom>
                    Workspace & Plan Settings
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Configure active workspace details, commercial plan tier, and danger zone actions.
                  </Typography>

                  <Card variant="outlined" sx={{ borderRadius: 2.5, mb: 3, p: 2.5, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <div>
                        <Typography variant="h6" fontWeight={800}>{activeWorkspace?.name || "My Workspace"}</Typography>
                        <Typography variant="caption" color="text.secondary">Workspace Slug: {activeWorkspace?.slug || "workspace"}</Typography>
                      </div>
                      <Chip label={`Role: ${userRole}`} color={isOwner ? "primary" : "default"} sx={{ fontWeight: 800 }} />
                    </Box>
                  </Card>

                  {/* Workspace Rename Form for Owner/Admin */}
                  {isAdminOrOwner && (
                    <Box component="form" onSubmit={handleRenameWorkspace} mb={4}>
                      <Typography variant="subtitle2" fontWeight={800} gutterBottom>
                        Rename Workspace
                      </Typography>
                      <Box display="flex" gap={1.5} alignItems="center">
                        <TextField
                          size="small"
                          fullWidth
                          label="Workspace Name"
                          value={wsNameInput}
                          onChange={(e) => setWsNameInput(e.target.value)}
                          required
                          slotProps={{ input: { sx: { borderRadius: 2 } } }}
                        />
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={renamingWs || !wsNameInput.trim()}
                          sx={{ borderRadius: 2, px: 3, py: 1, fontWeight: 700, whiteSpace: "nowrap", textTransform: "none" }}
                        >
                          {renamingWs ? "Renaming..." : "Save Name"}
                        </Button>
                      </Box>
                    </Box>
                  )}

                  <Divider sx={{ my: 3 }} />

                  <Typography variant="subtitle1" fontWeight={800} gutterBottom>
                    Subscription Plan Details
                  </Typography>

                  <Card variant="outlined" sx={{ borderRadius: 2.5, mb: 3, p: 2.5, border: "2px solid #4f46e5", bgcolor: "rgba(79, 70, 229, 0.02)" }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="h6" fontWeight={800} color="primary.main">
                        ⚡ PRO PLAN (COMMERCIAL SAAS)
                      </Typography>
                      <Chip label="ACTIVE" color="success" size="small" sx={{ fontWeight: 800 }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      Full multi-tenant team workspace with real-time Socket.io sync, Groq AI Task Parsing, and analytics reporting.
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      ✓ Unlimited Workspace Tasks & Subtasks
                      <br />
                      ✓ Real-Time Socket Notifications & Online Presence
                      <br />
                      ✓ AI Productivity Coach & Groq LLM Assistant Integration
                      <br />
                      ✓ Multi-Tenant Team Members & Email Invitations via Resend
                    </Typography>
                  </Card>

                  <Divider sx={{ my: 3 }} />

                  {/* Danger Zone */}
                  <Typography variant="subtitle1" fontWeight={800} color="error.main" gutterBottom>
                    Danger Zone
                  </Typography>

                  {isOwner ? (
                    <Paper sx={{ p: 2.5, borderRadius: 2.5, border: "1px solid rgba(220, 38, 38, 0.3)", bgcolor: "rgba(254, 242, 242, 0.4)" }} elevation={0}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                        <div>
                          <Typography variant="subtitle2" fontWeight={800} color="error.main">
                            Delete Workspace
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Permanently delete this workspace and remove all associated tasks, notes, and member assignments.
                          </Typography>
                        </div>
                        <Button
                          variant="contained"
                          color="error"
                          onClick={() => {
                            setDeleteConfirmText("");
                            setIsDeleteModalOpen(true);
                          }}
                          sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                        >
                          Delete Workspace
                        </Button>
                      </Box>
                    </Paper>
                  ) : (
                    <Paper sx={{ p: 2.5, borderRadius: 2.5, border: "1px solid rgba(220, 38, 38, 0.3)", bgcolor: "rgba(254, 242, 242, 0.4)" }} elevation={0}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                        <div>
                          <Typography variant="subtitle2" fontWeight={800} color="error.main">
                            Leave Workspace
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Leave this workspace. You will lose access to all tasks and project boards in this workspace.
                          </Typography>
                        </div>
                        <Button
                          variant="contained"
                          color="error"
                          onClick={() => setIsLeaveModalOpen(true)}
                          sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                        >
                          Leave Workspace
                        </Button>
                      </Box>
                    </Paper>
                  )}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Delete Workspace Dialog for Owner */}
      <Dialog open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle fontWeight={800} color="error.main">
          Delete Workspace "{activeWorkspace?.name}"
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            This action is <strong>irreversible</strong>. To confirm deletion, please type <strong>"{activeWorkspace?.name}"</strong> below:
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder={activeWorkspace?.name}
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            slotProps={{ input: { sx: { borderRadius: 2 } } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setIsDeleteModalOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteWorkspaceConfirm}
            variant="contained"
            color="error"
            disabled={deletingWs || deleteConfirmText.trim() !== activeWorkspace?.name}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            {deletingWs ? "Deleting..." : "Permanently Delete Workspace"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Leave Workspace Dialog for Non-Owner */}
      <Dialog open={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle fontWeight={800}>
          Leave Workspace "{activeWorkspace?.name}"
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to leave <strong>"{activeWorkspace?.name}"</strong>? You will lose access to all workspace tasks and activity.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setIsLeaveModalOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleLeaveWorkspaceConfirm} variant="contained" color="error" disabled={leavingWs} sx={{ borderRadius: 2, fontWeight: 700 }}>
            {leavingWs ? "Leaving..." : "Leave Workspace"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
