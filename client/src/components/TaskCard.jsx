import {
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";

const priorityColor = { High: "error", Medium: "warning", Low: "success" };
const statusColor = { Pending: "default", "In Progress": "primary", Completed: "success" };

const TaskCard = ({
  deadline,
  onDelete,
  onEdit,
  onStatusChange,
  onSummarize,
  summary,
  task,
  workingAction,
}) => {
  const isWorking = Boolean(workingAction);

  return (
    <Card className="task-card" elevation={0}>
      <CardContent className="task-card-content">
        <div className="task-card-header">
          <Typography className="task-title" component="h3" variant="h6">{task.title}</Typography>
          <Chip color={priorityColor[task.priority] || "default"} label={task.priority} size="small" />
        </div>
        <Typography className="task-description" color="text.secondary" variant="body2">{task.description}</Typography>
        <div className="task-meta">
          <Chip color={statusColor[task.status] || "default"} label={task.status} size="small" variant="outlined" />
          <Typography color="text.secondary" variant="caption">
            Created {new Date(task.createdAt).toLocaleDateString()}
          </Typography>
          {task.dueDate && (
            <Typography color="text.secondary" variant="caption">
              Due {new Date(task.dueDate).toLocaleDateString()}
            </Typography>
          )}
        </div>
        {(summary || deadline) && (
          <div className="ai-insight">
            {summary && <Typography variant="body2"><strong>AI summary:</strong> {summary}</Typography>}
            {deadline && <Typography variant="body2"><strong>Suggested deadline:</strong> {deadline}</Typography>}
          </div>
        )}
        <Divider />
        <TextField fullWidth label="Update status" onChange={(event) => onStatusChange(task, event.target.value)} select size="small" value={task.status}>
          <MenuItem value="Pending">Pending</MenuItem>
          <MenuItem value="In Progress">In Progress</MenuItem>
          <MenuItem value="Completed">Completed</MenuItem>
        </TextField>
      </CardContent>
      <CardActions className="task-card-actions">
        <Button disabled={isWorking} onClick={() => onEdit(task)} size="small">Edit</Button>
        <Button disabled={isWorking} onClick={() => onSummarize(task, "summary")} size="small">AI summary</Button>
        <Button disabled={isWorking} onClick={() => onSummarize(task, "deadline")} size="small">Suggest deadline</Button>
        <Button color="error" disabled={isWorking} onClick={() => onDelete(task)} size="small">Delete</Button>
      </CardActions>
    </Card>
  );
};

export default TaskCard;
