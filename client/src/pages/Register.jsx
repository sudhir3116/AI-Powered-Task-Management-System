import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { GoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading, register, googleLogin } = useAuth();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  if (loading) return <div className="full-page-loader"><CircularProgress aria-label="Loading application" /></div>;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentData) => ({ ...currentData, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      await register(formData);
      toast.success("Account created! Welcome to TaskFlow AI. Please sign in.");
      navigate("/login", { replace: true });
    } catch (error) {
      const message = error.response?.data?.message || "Unable to create your account. Please check your inputs.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await googleLogin(credentialResponse.credential);
      toast.success("Account created with Google!");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Google sign-up failed. Please try again.";
      setFormError(message);
      toast.error(message);
    }
  };

  const handleGoogleError = () => {
    toast.error("Google sign-up was cancelled or failed.");
  };

  return (
    <main className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-icon">⚡</div>
        <Typography variant="h4" className="auth-brand-name">TaskFlow AI</Typography>
      </div>

      <Chip
        label="🚀 Free Plan Included • No Credit Card Required"
        size="small"
        sx={{
          bgcolor: "rgba(5, 150, 105, 0.08)",
          color: "success.main",
          fontWeight: 700,
          border: "1px solid rgba(5, 150, 105, 0.2)",
          py: 0.5,
          px: 1,
        }}
      />

      <Paper className="auth-card" elevation={0}>
        <Typography component="h1" variant="h4" className="auth-title">Create your workspace</Typography>
        <Typography color="text.secondary" variant="body1" className="auth-subtitle">
          Join thousands of high-performing teams planning smarter with AI.
        </Typography>

        {formError && (
          <Alert severity="error" sx={{ mt: 2.5, borderRadius: 2 }} onClose={() => setFormError("")}>
            {formError}
          </Alert>
        )}

        <Box className="auth-form" component="form" onSubmit={handleSubmit}>
          <TextField
            autoComplete="name"
            autoFocus
            fullWidth
            id="name"
            label="Full name"
            name="name"
            onChange={handleChange}
            required
            value={formData.name}
            slotProps={{ input: { sx: { borderRadius: 2 } } }}
          />
          <TextField
            autoComplete="email"
            fullWidth
            id="email"
            label="Email address"
            name="email"
            onChange={handleChange}
            required
            type="email"
            value={formData.email}
            slotProps={{ input: { sx: { borderRadius: 2 } } }}
          />
          <TextField
            autoComplete="new-password"
            fullWidth
            helperText="Minimum 6 characters with letters & numbers"
            id="password"
            label="Password"
            name="password"
            onChange={handleChange}
            required
            type={showPassword ? "text" : "password"}
            value={formData.password}
            slotProps={{
              input: {
                sx: { borderRadius: 2 },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            disabled={submitting}
            fullWidth
            id="register-btn"
            size="large"
            type="submit"
            variant="contained"
            sx={{
              borderRadius: 2.5,
              py: 1.4,
              fontWeight: 700,
              fontSize: "0.95rem",
              textTransform: "none",
              boxShadow: "0 4px 14px rgba(79, 70, 229, 0.35)",
              mt: 1,
            }}
          >
            {submitting ? <><CircularProgress size={18} sx={{ mr: 1, color: "white" }} /> Creating account...</> : "Get Started Free"}
          </Button>
        </Box>

        <div className="auth-divider">
          <Divider><Typography color="text.secondary" variant="caption" fontWeight={700}>OR CONTINUE WITH</Typography></Divider>
        </div>

        <div className="google-btn-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            width="100%"
            text="signup_with"
            shape="rectangular"
            theme="outline"
            size="large"
          />
        </div>

        <Typography className="auth-footer" variant="body2">
          Already have an account?{" "}
          <MuiLink component={Link} to="/login" underline="hover" fontWeight={700} color="primary.main">
            Sign in
          </MuiLink>
        </Typography>
      </Paper>
    </main>
  );
};

export default Register;
