import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
} from "@mui/material";
import Breadcrumbs from "../components/Breadcrumbs";
import { resetPassword } from "../services/authService";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const res = await resetPassword(token, newPassword);
      setSuccessMessage(res.message);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password. The link may be invalid or expired.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box minHeight="100vh" display="flex" flexDirection="column" alignItems="center" justifyContent="center" bgcolor="#f8fafc" p={2}>
      <Container maxWidth="xs">
        <Breadcrumbs
          items={[
            { label: "Home", to: "/login" },
            { label: "Reset Password" },
          ]}
        />
        <Card elevation={3} sx={{ borderRadius: 3, p: 2 }}>
          <CardContent>
            <Box textAlign="center" mb={3}>
              <Typography variant="h5" fontWeight={800} color="primary" gutterBottom>
                ⚡ TaskFlow AI
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                Set New Password
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Please choose a strong password for your account.
              </Typography>
            </Box>

            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {successMessage} Redirection to login in 3 seconds...
              </Alert>
            )}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {!successMessage && (
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  sx={{ mb: 3 }}
                />

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={submitting || !newPassword || !confirmPassword}
                  sx={{ mb: 2, fontWeight: 700 }}
                >
                  {submitting ? "Resetting..." : "Reset Password"}
                </Button>
              </Box>
            )}

            <Box textAlign="center" mt={2}>
              <Typography variant="body2">
                <Link to="/login" style={{ color: "#4f46e5", fontWeight: 700, textDecoration: "none" }}>
                  Back to Sign In
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default ResetPassword;
