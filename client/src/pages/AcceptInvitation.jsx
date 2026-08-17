import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import Breadcrumbs from "../components/Breadcrumbs";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { acceptInvitation, getInvitationDetails } from "../services/workspaceService";

const AcceptInvitation = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { refreshWorkspaces, switchWorkspace } = useWorkspace();

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [acceptedWorkspaceId, setAcceptedWorkspaceId] = useState(null);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getInvitationDetails(token);
      setDetails(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired invitation token.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDetails();
  }, [fetchDetails]);

  const handleAccept = async () => {
    setAccepting(true);
    setError("");
    try {
      const res = await acceptInvitation(token);
      toast.success(res.message || "Invitation accepted!");
      setAcceptedWorkspaceId(res.data?.workspaceId);
      await refreshWorkspaces();
      if (res.data?.workspaceId) {
        switchWorkspace(res.data.workspaceId);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to accept invitation.";
      setError(msg);
      toast.error(msg);
    } finally {
      setAccepting(false);
    }
  };

  const isEmailMismatch =
    isAuthenticated &&
    user?.email &&
    details?.email &&
    user.email.trim().toLowerCase() !== details.email.trim().toLowerCase();

  return (
    <Box minHeight="100vh" display="flex" flexDirection="column" alignItems="center" justifyContent="center" bgcolor="background.default" p={2}>
      <Container maxWidth="sm">
        <Breadcrumbs
          items={[
            { label: "Home", to: "/dashboard" },
            { label: "Invitations" },
            { label: "Accept Invitation" },
          ]}
        />
        <Card sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <CardContent sx={{ p: 4, textAlign: "center" }}>
            <Box mb={3}>
              <Typography color="primary" variant="h5" fontWeight={800} letterSpacing="-0.5px">
                ⚡ TaskFlow AI
              </Typography>
            </Box>

            {loading ? (
              <Box py={4}>
                <CircularProgress size={40} />
                <Typography variant="body2" color="text.secondary" mt={2}>
                  Validating invitation...
                </Typography>
              </Box>
            ) : error ? (
              <Box py={2}>
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {error}
                </Alert>
                <Button variant="outlined" component={Link} to="/dashboard">
                  Return to Dashboard
                </Button>
              </Box>
            ) : acceptedWorkspaceId ? (
              <Box py={2}>
                <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                  🎉 Invitation accepted successfully! You are now a member of {details?.workspaceName}.
                </Alert>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate("/dashboard")}
                  sx={{ borderRadius: 2, px: 4 }}
                >
                  Go to Workspace
                </Button>
              </Box>
            ) : details?.isAccepted ? (
              <Box py={2}>
                <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                  This invitation has already been accepted.
                </Alert>
                <Button variant="contained" component={Link} to="/dashboard">
                  Go to Dashboard
                </Button>
              </Box>
            ) : details?.isExpired ? (
              <Box py={2}>
                <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                  This invitation link has expired.
                </Alert>
                <Button variant="outlined" component={Link} to="/dashboard">
                  Return to Dashboard
                </Button>
              </Box>
            ) : (
              <Box py={1}>
                <Typography variant="h6" fontWeight={700} mb={1}>
                  You've been invited to join
                </Typography>
                <Typography variant="h4" fontWeight={800} color="primary.main" mb={2}>
                  {details?.workspaceName}
                </Typography>

                <Box bgcolor="#f8fafc" border="1px solid #e2e8f0" borderRadius={2} p={2.5} mb={3} textAlign="left">
                  <Typography variant="body2" color="text.secondary" mb={0.5}>
                    <strong>Invited by:</strong> {details?.inviterName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={0.5}>
                    <strong>Role:</strong> {details?.role}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Invited Email:</strong> {details?.email}
                  </Typography>
                </Box>

                {!isAuthenticated ? (
                  <Box py={1}>
                    <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                      Please log in with <strong>{details?.email}</strong> to accept this invitation.
                    </Alert>
                    <Box display="flex" gap={2} justifyContent="center">
                      <Button
                        variant="contained"
                        component={Link}
                        to={`/login?redirect=/invitations/${token}`}
                      >
                        Log In
                      </Button>
                      <Button
                        variant="outlined"
                        component={Link}
                        to={`/register?email=${encodeURIComponent(details?.email || "")}`}
                      >
                        Register
                      </Button>
                    </Box>
                  </Box>
                ) : isEmailMismatch ? (
                  <Box py={1}>
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                      This invitation was sent to <strong>{details?.email}</strong>. You are currently logged in as <strong>{user?.email}</strong>.
                    </Alert>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      Please log out and log in with the invited email address.
                    </Typography>
                  </Box>
                ) : (
                  <Box py={1}>
                    <Button
                      id="accept-invitation-btn"
                      variant="contained"
                      size="large"
                      onClick={handleAccept}
                      disabled={accepting}
                      sx={{ borderRadius: 2, px: 5, py: 1.2, fontWeight: 700 }}
                    >
                      {accepting ? "Accepting..." : "Accept Invitation"}
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            <Divider sx={{ my: 3 }} />
            <Typography variant="caption" color="text.secondary">
              TaskFlow AI — Smart Multi-Tenant Workspace Management
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default AcceptInvitation;
