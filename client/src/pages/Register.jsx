import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
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
      toast.success("Account created! Please sign in.");
      navigate("/login", { replace: true });
    } catch (error) {
      const message = error.response?.data?.message || "Unable to create your account. Please try again.";
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
        <Typography variant="h5" className="auth-brand-name">TaskFlow AI</Typography>
      </div>
      <Paper className="auth-card" elevation={0}>
        <Typography component="h1" variant="h4" className="auth-title">Create your workspace</Typography>
        <Typography color="text.secondary" variant="body1" className="auth-subtitle">
          Plan smarter, execute faster, with AI by your side.
        </Typography>

        {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}

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
          />
          <TextField
            autoComplete="new-password"
            fullWidth
            helperText="Minimum 6 characters"
            id="password"
            label="Password"
            name="password"
            onChange={handleChange}
            required
            type="password"
            value={formData.password}
          />
          <Button
            disabled={submitting}
            fullWidth
            id="register-btn"
            size="large"
            type="submit"
            variant="contained"
          >
            {submitting ? <><CircularProgress size={18} sx={{ mr: 1, color: "white" }} /> Creating account...</> : "Create account"}
          </Button>
        </Box>

        <div className="auth-divider">
          <Divider><Typography color="text.secondary" variant="caption">OR CONTINUE WITH</Typography></Divider>
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
          <MuiLink component={Link} to="/login" underline="hover" fontWeight={600}>
            Sign in
          </MuiLink>
        </Typography>
      </Paper>
    </main>
  );
};

export default Register;
