import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@mui/material";

const getInitialFormData = (task) => ({
  title: task?.title || "",
  description: task?.description || "",
  status: task?.status || "Pending",
  priority: task?.priority || "Medium",
  dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
});

const TaskForm = ({ task, open, onClose, onSubmit, submitting }) => {
  const [formData, setFormData] = useState(() => getInitialFormData(task));
  const isEditing = Boolean(task?._id);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentData) => ({ ...currentData, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit({ ...formData, dueDate: formData.dueDate || null });
  };

  return (
    <Dialog fullWidth maxWidth="sm" onClose={submitting ? undefined : onClose} open={open}>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{isEditing ? "Edit task" : "Create a task"}</DialogTitle>
        <DialogContent className="task-form-content">
          <TextField autoFocus fullWidth label="Task title" name="title" onChange={handleChange} required value={formData.title} />
          <TextField fullWidth label="Description" minRows={4} multiline name="description" onChange={handleChange} required value={formData.description} />
          <TextField
            fullWidth
            label="Due date"
            name="dueDate"
            onChange={handleChange}
            slotProps={{ inputLabel: { shrink: true } }}
            type="date"
            value={formData.dueDate}
          />
          {isEditing && (
            <div className="task-form-row">
              <TextField fullWidth label="Status" name="status" onChange={handleChange} select value={formData.status}>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
              </TextField>
              <TextField fullWidth label="Priority" name="priority" onChange={handleChange} select value={formData.priority}>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
              </TextField>
            </div>
          )}
        </DialogContent>
        <DialogActions className="dialog-actions">
          <Button disabled={submitting} onClick={onClose}>Cancel</Button>
          <Button disabled={submitting} type="submit" variant="contained">
            {submitting ? "Saving..." : isEditing ? "Save changes" : "Create task"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TaskForm;
