import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";

const getPriorityColor = (priority) => {
  switch (priority) {
    case "High":
      return "error";
    case "Medium":
      return "warning";
    case "Low":
      return "success";
    default:
      return "default";
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "Completed":
      return "success";
    case "In Progress":
      return "info";
    case "Pending":
      return "warning";
    default:
      return "default";
  }
};

const isOverdue = (task) => {
  if (!task.dueDate || task.status === "Completed") return false;
  return new Date(task.dueDate) < new Date();
};

const TaskCard = ({ task, onEdit, onDelete, onStatusChange, onSummarize, summary, deadline, workingAction }) => {
  const isWorking = Boolean(workingAction);
  const overdue = isOverdue(task);

  // Subtask completion calculation
  const completedSubtasks = Array.isArray(task.subtasks)
    ? task.subtasks.filter((s) => s.completed).length
    : 0;
  const totalSubtasks = Array.isArray(task.subtasks) ? task.subtasks.length : 0;
  const subtaskPct = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <Card className={`task-card ${overdue ? "task-card--overdue" : ""}`} elevation={0}>
      <CardContent className="task-card-content">
        <div className="task-card-header">
          <Typography component="h3" variant="h6" className="task-title">
            {task.title}
          </Typography>
          <div className="task-header-chips">
            {overdue && <Chip label="OVERDUE" size="small" color="error" sx={{ fontWeight: 700, fontSize: "0.65rem" }} />}
            <Chip label={task.priority} size="small" color={getPriorityColor(task.priority)} />
            <Chip label={task.status} size="small" color={getStatusColor(task.status)} variant="outlined" />
          </div>
        </div>

        <Typography className="task-description" color="text.secondary" variant="body2">
          {task.description}
        </Typography>

        {/* Tags */}
        {Array.isArray(task.tags) && task.tags.length > 0 && (
          <div className="task-tags">
            {task.tags.map((tag, i) => (
              <Chip key={i} label={`#${tag}`} size="small" variant="outlined" sx={{ fontSize: "0.7rem", height: 20 }} />
            ))}
          </div>
        )}

        {/* Subtask Progress */}
        {totalSubtasks > 0 && (
          <div className="subtask-progress">
            <Typography variant="caption" color="text.secondary">
              Subtasks: {completedSubtasks}/{totalSubtasks} ({subtaskPct}%)
            </Typography>
            <div className="subtask-progress-bar">
              <div className="subtask-progress-fill" style={{ width: `${subtaskPct}%` }} />
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="task-meta">
          {task.dueDate && (
            <Typography color={overdue ? "error.main" : "text.secondary"} variant="caption">
              📅 {new Date(task.dueDate).toLocaleDateString()}
            </Typography>
          )}
          {task.estimatedTime && (
            <Typography color="text.secondary" variant="caption" sx={{ ml: 1 }}>
              ⏱️ {task.estimatedTime}m
            </Typography>
          )}
        </div>

        {/* AI Insight Boxes */}
        {(summary || deadline) && (
          <Box className="ai-insight">
            {summary && (
              <div>
                <Typography variant="caption" fontWeight={700} color="primary">AI Summary:</Typography>
                <Typography variant="caption" display="block">{summary}</Typography>
              </div>
            )}
            {deadline && (
              <div>
                <Typography variant="caption" fontWeight={700} color="secondary">Suggested Deadline:</Typography>
                <Typography variant="caption" display="block">{deadline}</Typography>
              </div>
            )}
          </Box>
        )}

        {/* Status Dropdown */}
        <TextField
          disabled={isWorking}
          fullWidth
          label="Change Status"
          onChange={(event) => onStatusChange(task, event.target.value)}
          select
          size="small"
          sx={{ mt: 1 }}
          value={task.status}
        >
          <MenuItem value="Pending">Pending</MenuItem>
          <MenuItem value="In Progress">In Progress</MenuItem>
          <MenuItem value="Completed">Completed</MenuItem>
        </TextField>
      </CardContent>

      <CardActions className="task-card-actions">
        <Button disabled={isWorking} onClick={() => onEdit(task)} size="small">
          Edit
        </Button>
        <Button
          disabled={isWorking}
          onClick={() => onSummarize(task, "summary")}
          size="small"
          startIcon={workingAction === "summary" ? <CircularProgress size={12} /> : null}
        >
          Summary
        </Button>
        <Button
          disabled={isWorking}
          onClick={() => onSummarize(task, "deadline")}
          size="small"
          startIcon={workingAction === "deadline" ? <CircularProgress size={12} /> : null}
        >
          Deadline
        </Button>
        <Button color="error" disabled={isWorking} onClick={() => onDelete(task)} size="small">
          Delete
        </Button>
      </CardActions>
    </Card>
  );
};

export default TaskCard;
