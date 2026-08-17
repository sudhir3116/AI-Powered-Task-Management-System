import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";

const getPriorityChipProps = (priority) => {
  switch (priority) {
    case "High":
      return { label: "🔥 High", color: "error" };
    case "Medium":
      return { label: "⚡ Medium", color: "warning" };
    case "Low":
      return { label: "🟢 Low", color: "success" };
    default:
      return { label: priority || "Medium", color: "default" };
  }
};

const getStatusChipProps = (status) => {
  switch (status) {
    case "Completed":
      return { label: "✓ Completed", color: "success" };
    case "In Progress":
      return { label: "⏳ In Progress", color: "info" };
    case "Pending":
      return { label: "⏹ Pending", color: "warning" };
    default:
      return { label: status || "Pending", color: "default" };
  }
};

const isOverdue = (task) => {
  if (!task.dueDate || task.status === "Completed") return false;
  return new Date(task.dueDate) < new Date();
};

const TaskCard = ({ task, onEdit, onDelete, onStatusChange, onSummarize, summary, deadline, workingAction }) => {
  const isWorking = Boolean(workingAction);
  const overdue = isOverdue(task);

  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);

  // Subtask completion calculation
  const completedSubtasks = Array.isArray(task.subtasks)
    ? task.subtasks.filter((s) => s.completed).length
    : 0;
  const totalSubtasks = Array.isArray(task.subtasks) ? task.subtasks.length : 0;
  const subtaskPct = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const priorityProps = getPriorityChipProps(task.priority);
  const statusProps = getStatusChipProps(task.status);

  const handleStatusMenuClick = (e) => {
    e.stopPropagation();
    setStatusMenuAnchor(e.currentTarget);
  };

  const handleStatusSelect = (newStatus) => {
    setStatusMenuAnchor(null);
    if (newStatus && newStatus !== task.status) {
      onStatusChange(task, newStatus);
    }
  };

  return (
    <Card className={`task-card ${overdue ? "task-card--overdue" : ""}`} elevation={0}>
      <CardContent className="task-card-content">
        {/* Header: Title & Badges */}
        <div className="task-card-header">
          <Typography
            component={Link}
            to={`/tasks/${task._id}`}
            variant="h6"
            className="task-title"
            sx={{
              textDecoration: "none",
              color: "text.primary",
              fontWeight: 700,
              fontSize: "0.975rem",
              lineHeight: 1.3,
              "&:hover": { color: "primary.main" },
            }}
          >
            {task.title}
          </Typography>
          <div className="task-header-chips">
            {overdue && (
              <Chip label="⚠️ OVERDUE" size="small" color="error" sx={{ fontWeight: 800, fontSize: "0.625rem", height: 20 }} />
            )}
            <Chip
              label={priorityProps.label}
              size="small"
              color={priorityProps.color}
              sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
            />
            <Chip
              label={statusProps.label}
              size="small"
              color={statusProps.color}
              variant="outlined"
              onClick={handleStatusMenuClick}
              sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700, cursor: "pointer" }}
            />
          </div>
        </div>

        {/* Description */}
        <Typography className="task-description" color="text.secondary" variant="body2">
          {task.description}
        </Typography>

        {/* Tags */}
        {Array.isArray(task.tags) && task.tags.length > 0 && (
          <div className="task-tags">
            {task.tags.map((tag, i) => (
              <Chip
                key={i}
                label={`#${tag}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: "0.68rem", height: 20, bgcolor: "rgba(241, 245, 249, 0.8)", borderColor: "#e2e8f0" }}
              />
            ))}
          </div>
        )}

        {/* Subtask Progress */}
        {totalSubtasks > 0 && (
          <div className="subtask-progress">
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary" fontWeight={600} fontSize="0.725rem">
                Subtasks: {completedSubtasks}/{totalSubtasks}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={700} fontSize="0.725rem">
                {subtaskPct}%
              </Typography>
            </Box>
            <div className="subtask-progress-bar">
              <div className="subtask-progress-fill" style={{ width: `${subtaskPct}%` }} />
            </div>
          </div>
        )}

        {/* Meta Bar */}
        <div className="task-meta" style={{ marginTop: 2 }}>
          {task.dueDate && (
            <Typography color={overdue ? "error.main" : "text.secondary"} variant="caption" fontWeight={overdue ? 700 : 500}>
              📅 {new Date(task.dueDate).toLocaleDateString()}
            </Typography>
          )}
          {task.estimatedTime && (
            <Typography color="text.secondary" variant="caption" sx={{ ml: 1 }}>
              ⏱️ {task.estimatedTime}m
            </Typography>
          )}
          <Box display="flex" alignItems="center" gap={0.5} ml="auto">
            <Avatar
              src={task.assignedTo?.avatar || undefined}
              sx={{ width: 22, height: 22, fontSize: "0.65rem", bgcolor: "primary.main", fontWeight: 700 }}
              title={task.assignedTo?.name ? `Assigned to ${task.assignedTo.name}` : "Unassigned"}
            >
              {task.assignedTo?.name ? task.assignedTo.name[0].toUpperCase() : "?"}
            </Avatar>
          </Box>
        </div>

        {/* AI Insight Box */}
        {(summary || deadline) && (
          <Box className="ai-insight" sx={{ mt: 0.5 }}>
            {summary && (
              <div>
                <Typography variant="caption" fontWeight={700} color="primary">✨ AI Summary:</Typography>
                <Typography variant="caption" display="block" color="text.primary">{summary}</Typography>
              </div>
            )}
            {deadline && (
              <div>
                <Typography variant="caption" fontWeight={700} color="secondary">✨ AI Deadline:</Typography>
                <Typography variant="caption" display="block" color="text.primary">{deadline}</Typography>
              </div>
            )}
          </Box>
        )}
      </CardContent>

      <CardActions className="task-card-actions">
        <Button disabled={isWorking} onClick={() => onEdit(task)} size="small" sx={{ fontSize: "0.75rem", textTransform: "none", fontWeight: 600 }}>
          ✏️ Edit
        </Button>
        <Button
          disabled={isWorking}
          onClick={() => onSummarize(task, "summary")}
          size="small"
          startIcon={workingAction === "summary" ? <CircularProgress size={12} /> : null}
          sx={{ fontSize: "0.75rem", textTransform: "none", fontWeight: 600 }}
        >
          ✨ Summary
        </Button>
        <Button
          disabled={isWorking}
          onClick={() => onSummarize(task, "deadline")}
          size="small"
          startIcon={workingAction === "deadline" ? <CircularProgress size={12} /> : null}
          sx={{ fontSize: "0.75rem", textTransform: "none", fontWeight: 600 }}
        >
          ✨ Deadline
        </Button>
        <IconButton
          color="error"
          disabled={isWorking}
          onClick={() => onDelete(task)}
          size="small"
          sx={{ ml: "auto", p: 0.5 }}
          title="Delete task"
        >
          🗑️
        </IconButton>
      </CardActions>

      {/* Quick Status Select Menu */}
      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={() => setStatusMenuAnchor(null)}
        slotProps={{
          paper: { sx: { minWidth: 150, borderRadius: 2, border: "1px solid #e2e8f0", elevation: 3 } },
        }}
      >
        <MenuItem onClick={() => handleStatusSelect("Pending")} selected={task.status === "Pending"}>
          ⏹ Pending
        </MenuItem>
        <MenuItem onClick={() => handleStatusSelect("In Progress")} selected={task.status === "In Progress"}>
          ⏳ In Progress
        </MenuItem>
        <MenuItem onClick={() => handleStatusSelect("Completed")} selected={task.status === "Completed"}>
          ✓ Completed
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default TaskCard;
