import { useState } from "react";
import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";

const getInitialFormData = (task) => ({
  title: task?.title || "",
  description: task?.description || "",
  status: task?.status || "Pending",
  priority: task?.priority || "Medium",
  dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
  estimatedTime: task?.estimatedTime || "",
  tagsInput: Array.isArray(task?.tags) ? task.tags.join(", ") : "",
  subtasks: Array.isArray(task?.subtasks)
    ? task.subtasks.map((s) => ({ title: s.title, completed: s.completed }))
    : [],
});

const TaskForm = ({ task, open, onClose, onSubmit, submitting, aiSubtasks }) => {
  const [formData, setFormData] = useState(() => getInitialFormData(task));
  const [newSubtask, setNewSubtask] = useState("");
  const isEditing = Boolean(task?._id);

  // Merge AI-suggested subtasks if provided
  const subtasksWithAi = aiSubtasks?.length
    ? [...formData.subtasks, ...aiSubtasks.map((t) => ({ title: t, completed: false }))]
    : formData.subtasks;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentData) => ({ ...currentData, [name]: value }));
  };

  const handleAddSubtask = () => {
    const trimmed = newSubtask.trim();
    if (!trimmed) return;
    setFormData((d) => ({ ...d, subtasks: [...d.subtasks, { title: trimmed, completed: false }] }));
    setNewSubtask("");
  };

  const handleRemoveSubtask = (index) => {
    setFormData((d) => ({ ...d, subtasks: d.subtasks.filter((_, i) => i !== index) }));
  };

  const handleSubtaskKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSubtask();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const tags = formData.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);

    await onSubmit({
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      dueDate: formData.dueDate || null,
      estimatedTime: formData.estimatedTime ? Number(formData.estimatedTime) : null,
      tags,
      subtasks: subtasksWithAi,
    });
  };

  return (
    <Dialog fullWidth maxWidth="sm" onClose={submitting ? undefined : onClose} open={open}>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{isEditing ? "Edit task" : "Create a task"}</DialogTitle>
        <DialogContent className="task-form-content">
          <TextField
            autoFocus
            fullWidth
            id="task-title"
            label="Task title"
            name="title"
            onChange={handleChange}
            required
            value={formData.title}
          />
          <TextField
            fullWidth
            id="task-description"
            label="Description"
            minRows={3}
            multiline
            name="description"
            onChange={handleChange}
            required
            value={formData.description}
          />

          <div className="task-form-row">
            <TextField
              fullWidth
              id="task-dueDate"
              label="Due date"
              name="dueDate"
              onChange={handleChange}
              slotProps={{ inputLabel: { shrink: true } }}
              type="date"
              value={formData.dueDate}
            />
            <TextField
              fullWidth
              id="task-estimatedTime"
              inputProps={{ min: 1, max: 10080 }}
              label="Est. time (min)"
              name="estimatedTime"
              onChange={handleChange}
              type="number"
              value={formData.estimatedTime}
            />
          </div>

          <TextField
            fullWidth
            helperText="Comma-separated (e.g. work, urgent, design)"
            id="task-tags"
            label="Tags"
            name="tagsInput"
            onChange={handleChange}
            value={formData.tagsInput}
          />

          {isEditing && (
            <div className="task-form-row">
              <TextField fullWidth id="task-status" label="Status" name="status" onChange={handleChange} select value={formData.status}>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
              </TextField>
              <TextField fullWidth id="task-priority" label="Priority" name="priority" onChange={handleChange} select value={formData.priority}>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
              </TextField>
            </div>
          )}

          {/* Subtasks section */}
          <div>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Subtasks {subtasksWithAi.length > 0 && `(${subtasksWithAi.length})`}
            </Typography>
            {subtasksWithAi.map((subtask, index) => (
              <div key={index} className="subtask-item">
                <Typography variant="body2" sx={{ flex: 1 }}>• {subtask.title}</Typography>
                <IconButton
                  aria-label="Remove subtask"
                  onClick={() => handleRemoveSubtask(index)}
                  size="small"
                  sx={{ ml: 1, color: "error.main" }}
                >
                  ✕
                </IconButton>
              </div>
            ))}
            <div className="subtask-add-row">
              <TextField
                fullWidth
                id="new-subtask"
                label="Add subtask"
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={handleSubtaskKeyDown}
                size="small"
                value={newSubtask}
              />
              <Button onClick={handleAddSubtask} size="small" variant="outlined" sx={{ ml: 1, whiteSpace: "nowrap" }}>
                Add
              </Button>
            </div>
          </div>
        </DialogContent>

        <DialogActions className="dialog-actions">
          <Button disabled={submitting} onClick={onClose}>Cancel</Button>
          <Button disabled={submitting} id="task-submit-btn" type="submit" variant="contained">
            {submitting
              ? <><CircularProgress size={16} sx={{ mr: 1, color: "white" }} />Saving...</>
              : isEditing ? "Save changes" : "Create task"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TaskForm;
