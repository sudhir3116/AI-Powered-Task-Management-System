import { useState } from "react";
import {
  Button,
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
import toast from "react-hot-toast";
import { getSubtaskBreakdown } from "../services/taskService";

const getInitialFormData = (task) => ({
  title: task?.title || "",
  description: task?.description || "",
  status: task?.status || "Pending",
  priority: task?.priority || "Medium",
  dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
  estimatedTime: task?.estimatedTime || "",
  tagsInput: Array.isArray(task?.tags) ? task.tags.join(", ") : "",
  subtasks: Array.isArray(task?.subtasks)
    ? task.subtasks.map((s) => ({ title: s.title, completed: Boolean(s.completed) }))
    : [],
});

const TaskForm = ({ task, open, onClose, onSubmit, submitting }) => {
  const [formData, setFormData] = useState(() => getInitialFormData(task));
  const [newSubtask, setNewSubtask] = useState("");
  const [generatingAiSubtasks, setGeneratingAiSubtasks] = useState(false);
  const isEditing = Boolean(task?._id);

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

  const handleGenerateAiSubtasks = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error("Please enter a title and description first to generate AI subtasks.");
      return;
    }

    setGeneratingAiSubtasks(true);
    try {
      const response = await getSubtaskBreakdown({
        title: formData.title,
        description: formData.description,
      });

      if (response.subtasks?.length > 0) {
        const existingTitles = new Set(formData.subtasks.map((s) => s.title.toLowerCase().trim()));
        const newItems = response.subtasks
          .filter((t) => !existingTitles.has(t.toLowerCase().trim()))
          .map((t) => ({ title: t, completed: false }));

        if (newItems.length > 0) {
          setFormData((d) => ({ ...d, subtasks: [...d.subtasks, ...newItems] }));
          toast.success(`${newItems.length} AI subtasks generated!`);
        } else {
          toast.info("AI generated subtasks that already exist in your list.");
        }
      } else {
        toast.error("Could not generate subtasks for this task.");
      }
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "AI subtask generation failed.");
    } finally {
      setGeneratingAiSubtasks(false);
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
      subtasks: formData.subtasks,
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Typography variant="body2" fontWeight={600}>
                Subtasks {formData.subtasks.length > 0 && `(${formData.subtasks.length})`}
              </Typography>
              <Button
                disabled={generatingAiSubtasks || submitting}
                id="generate-ai-subtasks-btn"
                onClick={handleGenerateAiSubtasks}
                size="small"
                startIcon={generatingAiSubtasks ? <CircularProgress size={12} /> : null}
                variant="outlined"
                sx={{ fontSize: "0.75rem" }}
              >
                {generatingAiSubtasks ? "Generating..." : "✨ Generate AI Subtasks"}
              </Button>
            </div>

            {formData.subtasks.map((subtask, index) => (
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
