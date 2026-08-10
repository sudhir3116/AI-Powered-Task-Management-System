import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link as MuiLink,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login, loading } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
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
      toast.success(response.message || "Login successful");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Unable to sign in. Please try again.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <Paper className="auth-card" elevation={0}>
        <Typography color="primary" variant="overline">AI-Powered Task Management</Typography>
        <Typography component="h1" variant="h4">Welcome back</Typography>
        <Typography color="text.secondary" variant="body1">Sign in to organize your work and let AI help prioritize it.</Typography>
        <Box className="auth-form" component="form" onSubmit={handleSubmit}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField autoComplete="email" autoFocus fullWidth label="Email address" name="email" onChange={handleChange} required type="email" value={formData.email} />
          <TextField autoComplete="current-password" fullWidth label="Password" name="password" onChange={handleChange} required type="password" value={formData.password} />
          <Button disabled={submitting} fullWidth type="submit" variant="contained">{submitting ? "Signing in..." : "Sign in"}</Button>
        </Box>
        <Typography className="auth-footer" variant="body2">
          New here? <MuiLink component={Link} to="/register" underline="hover">Create an account</MuiLink>
        </Typography>
      </Paper>
    </main>
  );
};

export default Login;
