import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import { getSubtaskBreakdown } from "../services/taskService";
import { getWorkspaceMembers } from "../services/workspaceService";
import { useWorkspace } from "../context/WorkspaceContext";

const getInitialFormData = (task) => ({
  title: task?.title || "",
  description: task?.description || "",
  status: task?.status || "Pending",
  priority: task?.priority || "Medium",
  assignedTo: task?.assignedTo?._id || task?.assignedTo || "",
  dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
  estimatedTime: task?.estimatedTime || "",
  tagsInput: Array.isArray(task?.tags) ? task.tags.join(", ") : "",
  subtasks: Array.isArray(task?.subtasks)
    ? task.subtasks.map((s) => ({ title: s.title, completed: Boolean(s.completed) }))
    : [],
});

const TaskForm = ({ task, open, onClose, onSubmit, submitting }) => {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?._id || activeWorkspace?.id;
  const [formData, setFormData] = useState(() => getInitialFormData(task));
  const [newSubtask, setNewSubtask] = useState("");
  const [generatingAiSubtasks, setGeneratingAiSubtasks] = useState(false);
  const [members, setMembers] = useState([]);
  const isEditing = Boolean(task?._id);

  useEffect(() => {
    if (workspaceId) {
      void getWorkspaceMembers(workspaceId)
        .then((res) => setMembers(res.data || []))
        .catch(() => setMembers([]));
    }
  }, [workspaceId]);

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
      toast.error("Please enter a task title and description first.");
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
          toast.success(`${newItems.length} AI subtasks generated! ✨`);
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
      assignedTo: formData.assignedTo || null,
      subtasks: formData.subtasks,
    });
  };

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      onClose={submitting ? undefined : onClose}
      open={open}
      slotProps={{
        paper: {
          sx: { borderRadius: 3.5, p: 1 },
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Typography variant="h6" fontWeight={800}>
            {isEditing ? "✏️ Edit Task" : "✨ Create New Task"}
          </Typography>
          {task?.aiParsed && (
            <Chip label="AI Parsed" size="small" color="primary" sx={{ fontSize: "0.65rem", fontWeight: 700 }} />
          )}
        </DialogTitle>

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
            slotProps={{ input: { sx: { borderRadius: 2 } } }}
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
            slotProps={{ input: { sx: { borderRadius: 2 } } }}
          />

          {members.length > 0 && (
            <TextField
              select
              fullWidth
              id="task-assignedTo"
              label="Assign to Workspace Member"
              name="assignedTo"
              onChange={handleChange}
              value={formData.assignedTo}
              slotProps={{ input: { sx: { borderRadius: 2 } } }}
            >
              <MenuItem value="">Unassigned</MenuItem>
              {members.map((m) => {
                const u = m.user || {};
                return (
                  <MenuItem key={u._id || u.id} value={u._id || u.id}>
                    👤 {u.name || u.email} ({m.role})
                  </MenuItem>
                );
              })}
            </TextField>
          )}

          <div className="task-form-row">
            <TextField
              fullWidth
              id="task-dueDate"
              label="Due date"
              name="dueDate"
              onChange={handleChange}
              slotProps={{ inputLabel: { shrink: true }, input: { sx: { borderRadius: 2 } } }}
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
              slotProps={{ input: { sx: { borderRadius: 2 } } }}
            />
          </div>

          <TextField
            fullWidth
            helperText="Comma-separated tags (e.g. feature, design, urgent)"
            id="task-tags"
            label="Tags"
            name="tagsInput"
            onChange={handleChange}
            value={formData.tagsInput}
            slotProps={{ input: { sx: { borderRadius: 2 } } }}
          />

          {isEditing && (
            <div className="task-form-row">
              <TextField fullWidth id="task-status" label="Status" name="status" onChange={handleChange} select value={formData.status} slotProps={{ input: { sx: { borderRadius: 2 } } }}>
                <MenuItem value="Pending">⏹ Pending</MenuItem>
                <MenuItem value="In Progress">⏳ In Progress</MenuItem>
                <MenuItem value="Completed">✓ Completed</MenuItem>
              </TextField>
              <TextField fullWidth id="task-priority" label="Priority" name="priority" onChange={handleChange} select value={formData.priority} slotProps={{ input: { sx: { borderRadius: 2 } } }}>
                <MenuItem value="High">🔥 High</MenuItem>
                <MenuItem value="Medium">⚡ Medium</MenuItem>
                <MenuItem value="Low">🟢 Low</MenuItem>
              </TextField>
            </div>
          )}

          <Divider sx={{ my: 1 }} />

          {/* Subtasks Section */}
          <div>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
              <Typography variant="subtitle2" fontWeight={700}>
                Subtasks {formData.subtasks.length > 0 && `(${formData.subtasks.length})`}
              </Typography>
              <Button
                disabled={generatingAiSubtasks || submitting}
                id="generate-ai-subtasks-btn"
                onClick={handleGenerateAiSubtasks}
                size="small"
                startIcon={generatingAiSubtasks ? <CircularProgress size={12} /> : null}
                variant="outlined"
                sx={{ fontSize: "0.75rem", borderRadius: 2, textTransform: "none", fontWeight: 700 }}
              >
                {generatingAiSubtasks ? "Analyzing task..." : "✨ AI Subtask Breakdown"}
              </Button>
            </Box>

            {formData.subtasks.map((subtask, index) => (
              <Box
                key={index}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                p={1}
                px={1.5}
                mb={0.8}
                bgcolor="#f8fafc"
                border="1px solid #f1f5f9"
                borderRadius={1.5}
              >
                <Typography variant="body2" fontWeight={500} color="text.primary" sx={{ flex: 1 }}>
                  • {subtask.title}
                </Typography>
                <IconButton
                  aria-label="Remove subtask"
                  onClick={() => handleRemoveSubtask(index)}
                  size="small"
                  sx={{ ml: 1, color: "error.main", p: 0.25 }}
                >
                  ✕
                </IconButton>
              </Box>
            ))}

            <div className="subtask-add-row" style={{ marginTop: 8 }}>
              <TextField
                fullWidth
                id="new-subtask"
                label="Add subtask title..."
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={handleSubtaskKeyDown}
                size="small"
                value={newSubtask}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
              <Button
                onClick={handleAddSubtask}
                size="small"
                variant="outlined"
                sx={{ ml: 1, whiteSpace: "nowrap", borderRadius: 2, height: 40, fontWeight: 700 }}
              >
                + Add
              </Button>
            </div>
          </div>
        </DialogContent>

        <DialogActions className="dialog-actions" sx={{ pt: 2, px: 3, pb: 2 }}>
          <Button disabled={submitting} onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            disabled={submitting}
            id="task-submit-btn"
            type="submit"
            variant="contained"
            sx={{ borderRadius: 2, px: 3, fontWeight: 700, textTransform: "none" }}
          >
            {submitting ? (
              <><CircularProgress size={16} sx={{ mr: 1, color: "white" }} /> Saving...</>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Create Task"
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TaskForm;
