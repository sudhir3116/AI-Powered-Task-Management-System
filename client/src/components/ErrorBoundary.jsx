import { Component } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[React ErrorBoundary]", error, errorInfo);
  }

  handleReload = () => {
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <Box
          minHeight="100vh"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bgcolor="#f1f5f9"
          p={3}
        >
          <Paper
            sx={{
              p: 4,
              maxWidth: 480,
              width: "100%",
              borderRadius: 3,
              textAlign: "center",
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            }}
            elevation={0}
          >
            <Typography variant="h3" mb={1}>
              ⚠️
            </Typography>
            <Typography variant="h5" fontWeight={800} color="text.primary" gutterBottom>
              Something went wrong.
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              An unexpected application error occurred. You can reload the page or return to the main dashboard.
            </Typography>

            {isDev && this.state.error && (
              <Box
                p={2}
                mb={3}
                bgcolor="#f8fafc"
                borderRadius={2}
                border="1px solid #cbd5e1"
                textAlign="left"
                sx={{ overflowX: "auto" }}
              >
                <Typography variant="caption" color="error.main" fontWeight={700} display="block">
                  Development Diagnostic Error:
                </Typography>
                <Typography variant="caption" fontFamily="monospace" color="text.primary">
                  {this.state.error.toString()}
                </Typography>
              </Box>
            )}

            <Button
              variant="contained"
              color="primary"
              onClick={this.handleReload}
              sx={{ borderRadius: 2, px: 3, py: 1, fontWeight: 700, textTransform: "none" }}
            >
              Reload Application
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
