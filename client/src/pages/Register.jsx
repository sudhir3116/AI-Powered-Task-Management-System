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

const Register = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading, register } = useAuth();
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
      const response = await register(formData);
      toast.success(response.message || "Registration successful");
      navigate("/login", { replace: true });
    } catch (error) {
      const message = error.response?.data?.message || "Unable to create your account. Please try again.";
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
        <Typography component="h1" variant="h4">Create your workspace</Typography>
        <Typography color="text.secondary" variant="body1">Plan better, execute faster, and use AI to stay focused.</Typography>
        <Box className="auth-form" component="form" onSubmit={handleSubmit}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField autoComplete="name" autoFocus fullWidth label="Full name" name="name" onChange={handleChange} required value={formData.name} />
          <TextField autoComplete="email" fullWidth label="Email address" name="email" onChange={handleChange} required type="email" value={formData.email} />
          <TextField autoComplete="new-password" fullWidth helperText="Use at least 8 characters." label="Password" name="password" onChange={handleChange} required type="password" value={formData.password} />
          <Button disabled={submitting} fullWidth type="submit" variant="contained">{submitting ? "Creating account..." : "Create account"}</Button>
        </Box>
        <Typography className="auth-footer" variant="body2">
          Already have an account? <MuiLink component={Link} to="/login" underline="hover">Sign in</MuiLink>
        </Typography>
      </Paper>
    </main>
  );
};

export default Register;
