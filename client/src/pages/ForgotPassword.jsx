import { useState } from "react";
import { Link } from "react-router-dom";
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
import { forgotPassword } from "../services/authService";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const res = await forgotPassword(email.trim());
      setMessage(res.message);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset email");
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
            { label: "Forgot Password" },
          ]}
        />
        <Card elevation={3} sx={{ borderRadius: 3, p: 2 }}>
          <CardContent>
            <Box textAlign="center" mb={3}>
              <Typography variant="h5" fontWeight={800} color="primary" gutterBottom>
                ⚡ TaskFlow AI
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                Reset Your Password
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Enter your email address and we'll send you instructions to reset your password.
              </Typography>
            </Box>

            {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                sx={{ mb: 3 }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting || !email.trim()}
                sx={{ mb: 2, fontWeight: 700 }}
              >
                {submitting ? "Sending..." : "Send Reset Link"}
              </Button>
            </Box>

            <Box textAlign="center" mt={2}>
              <Typography variant="body2">
                Remember your password?{" "}
                <Link to="/login" style={{ color: "#4f46e5", fontWeight: 700, textDecoration: "none" }}>
                  Sign In
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default ForgotPassword;
