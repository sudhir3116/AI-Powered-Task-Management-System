import { Box, Button, Paper, Typography } from "@mui/material";

const EmptyState = ({
  icon = "📋",
  title = "No items found",
  description = "Get started by creating your first item or adjusting your filters.",
  actionLabel,
  onAction,
}) => {
  return (
    <Paper className="empty-state" elevation={0}>
      <div className="empty-state-icon">{icon}</div>
      <Typography component="h3" variant="h6" fontWeight={700}>
        {title}
      </Typography>
      <Typography color="text.secondary" variant="body2" sx={{ maxWidth: 400 }}>
        {description}
      </Typography>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="contained" size="small" sx={{ mt: 1, borderRadius: 2 }}>
          {actionLabel}
        </Button>
      )}
    </Paper>
  );
};

export default EmptyState;
