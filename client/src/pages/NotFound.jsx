import { Button, Paper, Typography } from "@mui/material";
import { Link } from "react-router-dom";

const NotFound = () => (
  <main className="not-found-page">
    <Paper className="auth-card not-found-content" elevation={0}>
      <Typography color="primary" variant="overline">Error 404</Typography>
      <Typography component="h1" variant="h4">Page not found</Typography>
      <Typography color="text.secondary" paragraph variant="body1">The page you requested does not exist or may have been moved.</Typography>
      <Button component={Link} to="/dashboard" variant="contained">Go to dashboard</Button>
    </Paper>
  </main>
);

export default NotFound;
