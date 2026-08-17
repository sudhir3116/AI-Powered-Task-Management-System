import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import Breadcrumbs from "../components/Breadcrumbs";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useSocket } from "../context/SocketContext";
import {
  getWorkspaceMembers,
  getPendingInvitations,
  inviteWorkspaceMember,
  resendWorkspaceInvitation,
  cancelWorkspaceInvitation,
  removeWorkspaceMember,
  updateMemberRole,
} from "../services/workspaceService";

const WorkspaceMembers = () => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { socket } = useSocket();

  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [inviteErrorData, setInviteErrorData] = useState(null); // { message, existingInvitationId }

  // Resend / Cancel confirmation modal state
  const [actionInvitation, setActionInvitation] = useState(null); // invitation object
  const [actionType, setActionType] = useState(""); // "resend" | "cancel"
  const [processingAction, setProcessingAction] = useState(false);

  // Remove member state
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const workspaceId = activeWorkspace?._id || activeWorkspace?.id;
  const userRole = activeWorkspace?.role || "MEMBER";
  const canInvite = userRole === "OWNER" || userRole === "ADMIN";
  const canChangeRole = userRole === "OWNER";

  const fetchMembersAndInvitations = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [membersRes, notifRes] = await Promise.all([
        getWorkspaceMembers(workspaceId),
        canInvite ? getPendingInvitations(workspaceId).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);
      setMembers(membersRes.data || []);
      setInvitations(notifRes.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load workspace team data.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, canInvite]);

  useEffect(() => {
    void fetchMembersAndInvitations();
  }, [fetchMembersAndInvitations]);

  // Socket.IO Real-time Synchronization for Workspace Invitations & Members
  useEffect(() => {
    if (!socket) return;

    const handleRefresh = () => {
      void fetchMembersAndInvitations();
    };

    socket.on("invitation.created", handleRefresh);
    socket.on("invitation.resent", handleRefresh);
    socket.on("invitation.cancelled", handleRefresh);
    socket.on("invitation.accepted", handleRefresh);

    return () => {
      socket.off("invitation.created", handleRefresh);
      socket.off("invitation.resent", handleRefresh);
      socket.off("invitation.cancelled", handleRefresh);
      socket.off("invitation.accepted", handleRefresh);
    };
  }, [socket, fetchMembersAndInvitations]);

  const handleOpenInvite = () => {
    setInviteEmail("");
    setInviteRole("MEMBER");
    setInviteErrorData(null);
    setIsInviteOpen(true);
  };

  const handleSendInvite = async (e) => {
    if (e) e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setInviteErrorData(null);

    try {
      const res = await inviteWorkspaceMember(workspaceId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      if (res.emailSent) {
        toast.success("Invitation sent successfully.");
      } else {
        toast.error("Invitation created. Email delivery unavailable. Copy invitation link from server console.", { duration: 8000 });
      }

      setIsInviteOpen(false);
      setInviteEmail("");
      await fetchMembersAndInvitations();
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to send invitation.";
      const existingId = err.response?.data?.existingInvitationId;

      if (existingId || errMsg.includes("already exists")) {
        setInviteErrorData({
          message: errMsg,
          existingInvitationId: existingId || invitations.find((i) => i.email.toLowerCase() === inviteEmail.trim().toLowerCase())?._id,
        });
      } else {
        toast.error(errMsg);
      }
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvitationAction = async (invId) => {
    setProcessingAction(true);
    try {
      const res = await resendWorkspaceInvitation(workspaceId, invId);
      if (res.emailSent) {
        toast.success("Invitation resent successfully.");
      } else {
        toast.error("Invitation created. Email delivery unavailable. Copy invitation link from server console.", { duration: 8000 });
      }
      setActionInvitation(null);
      setIsInviteOpen(false);
      await fetchMembersAndInvitations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend invitation.");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCancelInvitationAction = async (invId) => {
    setProcessingAction(true);
    try {
      await cancelWorkspaceInvitation(workspaceId, invId);
      toast.success("Invitation cancelled successfully.");
      setActionInvitation(null);
      setInviteErrorData(null);
      await fetchMembersAndInvitations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel invitation.");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCancelAndInviteFresh = async (existingInvId) => {
    setInviting(true);
    try {
      await cancelWorkspaceInvitation(workspaceId, existingInvId);
      toast.success("Previous invitation cancelled. Sending new invitation...");
      setInviteErrorData(null);
      await handleSendInvite();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel previous invitation.");
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await updateMemberRole(workspaceId, memberId, newRole);
      toast.success("Member role updated");
      setMembers((prev) =>
        prev.map((m) => ((m._id || m.id) === memberId ? { ...m, role: newRole } : m))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update role.");
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setRemoving(true);
    try {
      await removeWorkspaceMember(workspaceId, memberToRemove._id || memberToRemove.id);
      toast.success("Member removed from workspace");
      setMembers((prev) =>
        prev.filter((m) => (m._id || m.id) !== (memberToRemove._id || memberToRemove.id))
      );
      setMemberToRemove(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove member.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <Navbar />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Breadcrumbs
          items={[
            { label: "Home", to: "/dashboard" },
            { label: activeWorkspace?.name || "Workspace", to: "/dashboard" },
            { label: "Team Members" },
          ]}
        />

        {/* Header Banner */}
        <Paper sx={{ p: 3.5, mb: 4, borderRadius: 3, border: "1px solid #e2e8f0" }} elevation={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <div>
              <Typography variant="h5" fontWeight={800} color="text.primary">
                👥 Team Management — {activeWorkspace?.name || "Workspace"}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Manage workspace members, role permissions, and track active team invitations in real time.
              </Typography>
            </div>

            {canInvite && (
              <Button
                id="invite-member-btn"
                variant="contained"
                onClick={handleOpenInvite}
                sx={{ borderRadius: 2, fontWeight: 700, px: 3, textTransform: "none" }}
              >
                + Invite Team Member
              </Button>
            )}
          </Box>
        </Paper>

        {/* Active Members Table */}
        <Typography variant="h6" fontWeight={800} mb={2} color="text.primary">
          Active Workspace Members ({members.length})
        </Typography>

        <Paper sx={{ borderRadius: 3, overflow: "hidden", border: "1px solid #e2e8f0", mb: 4 }} elevation={0}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          ) : members.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No Team Members Found"
              description="Invite colleagues to collaborate on tasks in this workspace."
              actionLabel="+ Invite Member"
              onAction={handleOpenInvite}
            />
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell fontWeight={700}>Member</TableCell>
                    <TableCell fontWeight={700}>Email Address</TableCell>
                    <TableCell fontWeight={700}>Role</TableCell>
                    <TableCell fontWeight={700}>Joined Date</TableCell>
                    <TableCell fontWeight={700} align="right">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((m) => {
                    const mId = m._id || m.id;
                    const isSelf = (m.user?._id || m.user?.id) === (user?.id || user?._id);
                    const isOwnerRole = m.role === "OWNER";

                    return (
                      <TableRow key={mId} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Avatar
                              src={m.user?.avatar || undefined}
                              sx={{ width: 36, height: 36, bgcolor: "primary.main", fontWeight: 700, fontSize: "0.9rem" }}
                            >
                              {m.user?.name ? m.user.name[0].toUpperCase() : "U"}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight={700}>
                                {m.user?.name || "Workspace Member"} {isSelf && "(You)"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ID: {mId?.substring(0, 8)}...
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2">{m.user?.email || "—"}</Typography>
                        </TableCell>

                        <TableCell>
                          {canChangeRole && !isOwnerRole && !isSelf ? (
                            <Select
                              size="small"
                              value={m.role}
                              onChange={(e) => handleRoleChange(mId, e.target.value)}
                              sx={{ borderRadius: 2, height: 32, fontSize: "0.825rem", fontWeight: 700 }}
                            >
                              <MenuItem value="ADMIN">ADMIN</MenuItem>
                              <MenuItem value="MEMBER">MEMBER</MenuItem>
                            </Select>
                          ) : (
                            <Chip
                              label={m.role}
                              size="small"
                              color={isOwnerRole ? "primary" : m.role === "ADMIN" ? "info" : "default"}
                              sx={{ fontWeight: 800, fontSize: "0.7rem", height: 22 }}
                            />
                          )}
                        </TableCell>

                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(m.createdAt || Date.now()).toLocaleDateString()}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          {!isOwnerRole && !isSelf && (userRole === "OWNER" || (userRole === "ADMIN" && m.role === "MEMBER")) && (
                            <Button
                              size="small"
                              color="error"
                              onClick={() => setMemberToRemove(m)}
                              sx={{ fontWeight: 700, textTransform: "none" }}
                            >
                              Remove
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Pending Workspace Invitations Section (Owner & Admin only) */}
        {canInvite && (
          <Box mb={4}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <div>
                <Typography variant="h6" fontWeight={800} color="text.primary">
                  📩 Pending Workspace Invitations ({invitations.length})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Active pending invitations. Resend a fresh token or cancel existing invitations.
                </Typography>
              </div>
            </Box>

            <Paper sx={{ borderRadius: 3, overflow: "hidden", border: "1px solid #e2e8f0" }} elevation={0}>
              {invitations.length === 0 ? (
                <Box p={4} textAlign="center">
                  <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
                    No pending invitations
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    All invited team members have joined or no active invitations exist.
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead sx={{ bgcolor: "#f8fafc" }}>
                      <TableRow>
                        <TableCell fontWeight={700}>Recipient Email</TableCell>
                        <TableCell fontWeight={700}>Invited Role</TableCell>
                        <TableCell fontWeight={700}>Invited By</TableCell>
                        <TableCell fontWeight={700}>Status & Expiry</TableCell>
                        <TableCell fontWeight={700} align="right">
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invitations.map((inv) => {
                        const invId = inv._id || inv.id;
                        const daysLeft = Math.ceil((new Date(inv.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));

                        return (
                          <TableRow key={invId} hover>
                            <TableCell>
                              <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                                ✉️ {inv.email}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Sent: {new Date(inv.createdAt).toLocaleDateString()}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Chip label={inv.role} size="small" variant="outlined" sx={{ fontWeight: 800, fontSize: "0.7rem" }} />
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2">{inv.invitedBy?.name || "Inviter"}</Typography>
                              <Typography variant="caption" color="text.secondary">{inv.invitedBy?.email}</Typography>
                            </TableCell>

                            <TableCell>
                              {inv.isExpired ? (
                                <Chip label="⏰ Expired" color="error" size="small" sx={{ fontWeight: 800 }} />
                              ) : (
                                <Chip
                                  label={`Active • Expires in ${Math.max(1, daysLeft)} day${daysLeft === 1 ? "" : "s"}`}
                                  color="success"
                                  variant="outlined"
                                  size="small"
                                  sx={{ fontWeight: 800 }}
                                />
                              )}
                            </TableCell>

                            <TableCell align="right">
                              <Box display="flex" gap={1} justifyContent="flex-end">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  onClick={() => {
                                    setActionInvitation(inv);
                                    setActionType("resend");
                                  }}
                                  sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                                >
                                  Resend
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() => {
                                    setActionInvitation(inv);
                                    setActionType("cancel");
                                  }}
                                  sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                                >
                                  Cancel
                                </Button>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Box>
        )}
      </Container>

      {/* Invite Member Modal */}
      <Dialog
        open={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle fontWeight={800}>
          ✉️ Invite Team Member to "{activeWorkspace?.name}"
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2.5}>
            Enter the colleague's email address and assign their workspace role permissions.
          </Typography>

          {inviteErrorData ? (
            <Box my={2}>
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                <strong>Invitation Conflict:</strong> {inviteErrorData.message}
              </Alert>
              <Box display="flex" gap={1.5} flexWrap="wrap">
                {inviteErrorData.existingInvitationId && (
                  <>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleResendInvitationAction(inviteErrorData.existingInvitationId)}
                      disabled={processingAction}
                      sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                    >
                      {processingAction ? "Resending..." : "Resend Existing Invitation"}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleCancelAndInviteFresh(inviteErrorData.existingInvitationId)}
                      disabled={inviting}
                      sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                    >
                      {inviting ? "Processing..." : "Cancel & Send Fresh Invitation"}
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSendInvite}>
              <TextField
                autoFocus
                fullWidth
                label="Recipient Email Address"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                sx={{ mb: 2.5 }}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />

              <TextField
                select
                fullWidth
                label="Workspace Role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                sx={{ mb: 1 }}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              >
                <MenuItem value="MEMBER">MEMBER — Can view, create, and manage tasks</MenuItem>
                <MenuItem value="ADMIN">ADMIN — Can invite members and manage workspace settings</MenuItem>
              </TextField>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setIsInviteOpen(false)} color="inherit">
            Cancel
          </Button>
          {!inviteErrorData && (
            <Button
              onClick={handleSendInvite}
              variant="contained"
              disabled={inviting || !inviteEmail.trim()}
              sx={{ borderRadius: 2, px: 3, fontWeight: 700, textTransform: "none" }}
            >
              {inviting ? "Sending Invitation..." : "Send Invitation"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Resend / Cancel Confirmation Dialog */}
      <Dialog open={Boolean(actionInvitation)} onClose={() => setActionInvitation(null)} slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle fontWeight={800}>
          {actionType === "resend" ? `Resend Invitation to ${actionInvitation?.email}?` : `Cancel Invitation for ${actionInvitation?.email}?`}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {actionType === "resend"
              ? `This will generate a fresh secure invitation token, extend expiration by 7 days, and invalidate the previous link.`
              : `This will permanently deactivate the invitation link. The recipient will not be able to join using the old link.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setActionInvitation(null)} color="inherit">
            Close
          </Button>
          {actionType === "resend" ? (
            <Button
              onClick={() => handleResendInvitationAction(actionInvitation._id || actionInvitation.id)}
              variant="contained"
              color="primary"
              disabled={processingAction}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              {processingAction ? "Resending..." : "Resend Invitation"}
            </Button>
          ) : (
            <Button
              onClick={() => handleCancelInvitationAction(actionInvitation._id || actionInvitation.id)}
              variant="contained"
              color="error"
              disabled={processingAction}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              {processingAction ? "Cancelling..." : "Cancel Invitation"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={Boolean(memberToRemove)} onClose={() => setMemberToRemove(null)} slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle fontWeight={800}>
          Remove Member from Workspace
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to remove <strong>{memberToRemove?.user?.name} ({memberToRemove?.user?.email})</strong> from "{activeWorkspace?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setMemberToRemove(null)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleRemoveMember} variant="contained" color="error" disabled={removing} sx={{ borderRadius: 2, fontWeight: 700 }}>
            {removing ? "Removing..." : "Remove Member"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkspaceMembers;
