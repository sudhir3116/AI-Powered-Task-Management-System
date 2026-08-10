import {
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

const priorityColor = { High: "error", Medium: "warning", Low: "success" };
const statusColor = { Pending: "default", "In Progress": "primary", Completed: "success" };

const isOverdue = (task) => {
  if (!task.dueDate || task.status === "Completed") return false;
  return new Date(task.dueDate) < new Date();
};

const formatDuration = (minutes) => {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const TaskCard = ({
  deadline,
  onDelete,
  onEdit,
  onStatusChange,
  onSummarize,
  onSubtasks,
  summary,
  task,
  workingAction,
}) => {
  const isWorking = Boolean(workingAction);
  const overdue = isOverdue(task);
  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  return (
    <Card className={`task-card ${overdue ? "task-card--overdue" : ""}`} elevation={0}>
      <CardContent className="task-card-content">
        <div className="task-card-header">
          <Typography className="task-title" component="h3" variant="h6" title={task.title}>
            {task.title}
          </Typography>
          <div className="task-header-chips">
            <Chip color={priorityColor[task.priority] || "default"} label={task.priority} size="small" />
            {overdue && (
              <Tooltip title="This task is overdue">
                <Chip color="error" label="Overdue" size="small" variant="outlined" />
              </Tooltip>
            )}
          </div>
        </div>

        <Typography className="task-description" color="text.secondary" variant="body2">
          {task.description}
        </Typography>

        {/* Tags */}
        {task.tags?.length > 0 && (
          <div className="task-tags">
            {task.tags.slice(0, 4).map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ fontSize: "0.7rem" }} />
            ))}
          </div>
        )}

        <div className="task-meta">
          <Chip color={statusColor[task.status] || "default"} label={task.status} size="small" variant="outlined" />
          <Typography color="text.secondary" variant="caption">
            {new Date(task.createdAt).toLocaleDateString()}
          </Typography>
          {task.dueDate && (
            <Typography color={overdue ? "error.main" : "text.secondary"} variant="caption" fontWeight={overdue ? 600 : 400}>
              Due {new Date(task.dueDate).toLocaleDateString()}
            </Typography>
          )}
          {task.estimatedTime && (
            <Typography color="text.secondary" variant="caption">
              ⏱ {formatDuration(task.estimatedTime)}
            </Typography>
          )}
          {task.status === "Completed" && task.completedAt && (
            <Typography color="success.main" variant="caption">
              ✓ {new Date(task.completedAt).toLocaleDateString()}
            </Typography>
          )}
        </div>

        {/* Subtasks progress */}
        {totalSubtasks > 0 && (
          <div className="subtask-progress">
            <Typography variant="caption" color="text.secondary">
              Subtasks: {completedSubtasks}/{totalSubtasks}
            </Typography>
            <div className="subtask-progress-bar">
              <div
                className="subtask-progress-fill"
                style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* AI insights */}
        {(summary || deadline) && (
          <div className="ai-insight">
            {summary && <Typography variant="body2"><strong>AI summary:</strong> {summary}</Typography>}
            {deadline && <Typography variant="body2"><strong>Suggested deadline:</strong> {deadline}</Typography>}
          </div>
        )}

        <Divider />

        <TextField
          fullWidth
          label="Update status"
          onChange={(event) => onStatusChange(task, event.target.value)}
          select
          size="small"
          value={task.status}
          disabled={isWorking && workingAction === "status"}
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
        {onSubtasks && (
          <Button
            disabled={isWorking}
            onClick={() => onSubtasks(task)}
            size="small"
            startIcon={workingAction === "subtasks" ? <CircularProgress size={12} /> : null}
          >
            Subtasks
          </Button>
        )}
        <Button color="error" disabled={isWorking} onClick={() => onDelete(task)} size="small">
          Delete
        </Button>
      </CardActions>
    </Card>
  );
};

export default TaskCard;
