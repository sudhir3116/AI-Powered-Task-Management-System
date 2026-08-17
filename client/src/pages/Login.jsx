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

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login, googleLogin, loading } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  if (loading) {
    return <div className="full-page-loader"><CircularProgress aria-label="Loading application" /></div>;
  }

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
      const response = await login(formData);
      toast.success(response.message || "Welcome back to TaskFlow AI!");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Unable to sign in. Please check your credentials.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await googleLogin(credentialResponse.credential);
      toast.success("Signed in with Google!");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Google sign-in failed. Please try again.";
      setFormError(message);
      toast.error(message);
    }
  };

  const handleGoogleError = () => {
    const message = "Google sign-in was cancelled or failed.";
    setFormError(message);
    toast.error(message);
  };

  return (
    <main className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-icon">⚡</div>
        <Typography variant="h4" className="auth-brand-name">TaskFlow AI</Typography>
      </div>

      <Chip
        label="✨ Next-Gen AI Task Intelligence SaaS"
        size="small"
        sx={{
          bgcolor: "rgba(79, 70, 229, 0.08)",
          color: "primary.main",
          fontWeight: 700,
          border: "1px solid rgba(79, 70, 229, 0.2)",
          py: 0.5,
          px: 1,
        }}
      />

      <Paper className="auth-card" elevation={0}>
        <Typography component="h1" variant="h4" className="auth-title">Welcome back</Typography>
        <Typography color="text.secondary" variant="body1" className="auth-subtitle">
          Sign in to access your intelligent workspace and AI productivity coach.
        </Typography>

        {formError && (
          <Alert severity="error" sx={{ mt: 2.5, borderRadius: 2 }} onClose={() => setFormError("")}>
            {formError}
          </Alert>
        )}

        <Box className="auth-form" component="form" onSubmit={handleSubmit}>
          <TextField
            autoComplete="email"
            autoFocus
            fullWidth
            id="email"
            label="Email address"
            name="email"
            onChange={handleChange}
            required
            type="email"
            value={formData.email}
            slotProps={{
              input: { sx: { borderRadius: 2 } },
            }}
          />
          <TextField
            autoComplete="current-password"
            fullWidth
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
          <Box textAlign="right" mt={-1} mb={0.5}>
            <MuiLink component={Link} to="/forgot-password" variant="caption" underline="hover" color="primary.main" fontWeight={700}>
              Forgot password?
            </MuiLink>
          </Box>
          <Button
            disabled={submitting}
            fullWidth
            id="signin-btn"
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
            }}
          >
            {submitting ? <><CircularProgress size={18} sx={{ mr: 1, color: "white" }} /> Signing in...</> : "Sign in to TaskFlow"}
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
            text="signin_with"
            shape="rectangular"
            theme="outline"
            size="large"
          />
        </div>

        <Typography className="auth-footer" variant="body2">
          Don't have an account?{" "}
          <MuiLink component={Link} to="/register" underline="hover" fontWeight={700} color="primary.main">
            Create a workspace
          </MuiLink>
        </Typography>
      </Paper>
    </main>
  );
};

export default Login;
