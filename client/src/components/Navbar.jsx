import { useState } from "react";
import {
  AppBar,
  Avatar,
  Button,
  Divider,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const Navbar = ({ onCreateTask }) => {
  const { logout, user } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  return (
    <AppBar className="app-navbar" color="inherit" elevation={0} position="sticky">
      <Toolbar className="navbar-toolbar">
        {/* Brand */}
        <div className="brand-block">
          <div className="brand-logo">
            <span className="brand-icon">⚡</span>
            <Typography color="primary" component="span" variant="h6" fontWeight={800} letterSpacing="-0.5px">
              TaskFlow AI
            </Typography>
          </div>
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          <Button
            id="navbar-create-btn"
            onClick={onCreateTask}
            variant="contained"
            size="medium"
          >
            + New Task
          </Button>

          {/* User Avatar Menu */}
          <Avatar
            alt={user?.name}
            src={user?.avatar || undefined}
            onClick={handleMenuOpen}
            sx={{
              cursor: "pointer",
              bgcolor: "primary.main",
              width: 38,
              height: 38,
              fontSize: "0.875rem",
              fontWeight: 700,
              border: "2px solid",
              borderColor: "primary.light",
              transition: "transform 0.2s",
              "&:hover": { transform: "scale(1.08)" },
            }}
            aria-controls={anchorEl ? "user-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={anchorEl ? "true" : undefined}
          >
            {!user?.avatar && getInitials(user?.name)}
          </Avatar>

          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            slotProps={{
              paper: {
                elevation: 0,
                sx: { minWidth: 200, mt: 1, border: "1px solid #e2e8f0", borderRadius: 2 },
              },
            }}
          >
            <div style={{ padding: "12px 16px" }}>
              <Typography variant="subtitle2" fontWeight={700}>{user?.name || "User"}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
            </div>
            <Divider />
            <MenuItem onClick={handleLogout} id="logout-btn">
              <ListItemIcon>🚪</ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
