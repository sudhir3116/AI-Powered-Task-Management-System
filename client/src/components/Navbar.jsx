import { AppBar, Button, Toolbar, Typography } from "@mui/material";
import { useAuth } from "../context/AuthContext";

const Navbar = ({ onCreateTask }) => {
  const { logout, user } = useAuth();

  return (
    <AppBar className="app-navbar" color="inherit" elevation={0} position="sticky">
      <Toolbar className="navbar-toolbar">
        <div className="brand-block">
          <Typography color="primary" component="span" variant="h6">TaskFlow AI</Typography>
          <Typography className="welcome-text" color="text.secondary" variant="body2">
            Welcome, {user?.name || "there"}
          </Typography>
        </div>
        <div className="navbar-actions">
          <Button onClick={onCreateTask} variant="contained">New task</Button>
          <Button color="inherit" onClick={logout}>Log out</Button>
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
