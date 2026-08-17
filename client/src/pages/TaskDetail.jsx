import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import TaskForm from "../components/TaskForm";
import Breadcrumbs from "../components/Breadcrumbs";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useSocket } from "../context/SocketContext";
import {
  getTaskById,
  updateTask,
  deleteTask,
  getTaskComments,
  createComment,
  deleteComment,
  getTaskActivity,
  getTaskSummary,
  getDeadlineSuggestion,
  getSubtaskBreakdown,
} from "../services/taskService";

const TaskDetail = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { socket } = useSocket();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Comments State
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // Activity State
  const [activity, setActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // AI Insights State
  const [aiSummary, setAiSummary] = useState(null);
  const [aiDeadline, setAiDeadline] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const fetchTaskDetails = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getTaskById(taskId);
      setTask(res.data);
      if (res.data.aiSummary) setAiSummary(res.data.aiSummary);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load task details.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await getTaskComments(taskId);
      setComments(res.data || []);
    } catch {
      // Ignore comment fetch errors gracefully
    }
  }, [taskId]);

  const fetchActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const res = await getTaskActivity(taskId);
      setActivity(res.data || []);
    } catch {
      // Ignore activity fetch errors gracefully
    } finally {
      setLoadingActivity(false);
    }
  }, [taskId]);

  useEffect(() => {
    void fetchTaskDetails();
    void fetchComments();
    void fetchActivity();
  }, [fetchTaskDetails, fetchComments, fetchActivity]);

  // Real-time socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleTaskUpdated = (updatedTask) => {
      if (updatedTask && updatedTask._id === taskId) {
        setTask(updatedTask);
        void fetchActivity();
      }
    };

    const handleCommentCreated = (newComment) => {
      if (newComment && (newComment.task === taskId || newComment.task?._id === taskId)) {
        setComments((prev) => [...prev.filter((c) => (c._id || c.id) !== (newComment._id || newComment.id)), newComment]);
        void fetchActivity();
      }
    };

    const handleCommentDeleted = ({ commentId, taskId: eventTaskId }) => {
      if (eventTaskId === taskId && commentId) {
        setComments((prev) => prev.filter((c) => (c._id || c.id) !== commentId));
      }
    };

    socket.on("task.updated", handleTaskUpdated);
    socket.on("comment.created", handleCommentCreated);
    socket.on("comment.deleted", handleCommentDeleted);

    return () => {
      socket.off("task.updated", handleTaskUpdated);
      socket.off("comment.created", handleCommentCreated);
      socket.off("comment.deleted", handleCommentDeleted);
    };
  }, [socket, taskId, fetchActivity]);

  const handleUpdateTask = async (updatedData) => {
    setSubmitting(true);
    try {
      const res = await updateTask(taskId, updatedData);
      setTask(res.data);
      toast.success("Task updated successfully");
      setIsEditOpen(false);
      void fetchActivity();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update task.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSubtask = async (index) => {
    if (!task) return;
    const updatedSubtasks = [...(task.subtasks || [])];
    updatedSubtasks[index] = {
      ...updatedSubtasks[index],
      completed: !updatedSubtasks[index].completed,
    };
    try {
      const res = await updateTask(taskId, { subtasks: updatedSubtasks });
      setTask(res.data);
      toast.success("Subtask updated");
    } catch {
      toast.error("Failed to update subtask");
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm(`Are you sure you want to delete "${task.title}"?`)) return;
    try {
      await deleteTask(taskId);
      toast.success("Task deleted");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete task");
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const res = await createComment(taskId, newComment.trim());
      setComments((prev) => [...prev, res.data]);
      setNewComment("");
      toast.success("Comment added");
      void fetchActivity();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(taskId, commentId);
      setComments((prev) => prev.filter((c) => (c._id || c.id) !== commentId));
      toast.success("Comment deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete comment");
    }
  };

  const handleGenerateSummary = async () => {
    setLoadingAi(true);
    try {
      const res = await getTaskSummary({ title: task.title, description: task.description });
      setAiSummary(res.summary);
      toast.success("AI Summary generated! ✨");
    } catch {
      toast.error("Failed to generate AI summary");
    } finally {
      setLoadingAi(false);
    }
  };

  const handleGenerateDeadline = async () => {
    setLoadingAi(true);
    try {
      const res = await getDeadlineSuggestion({ title: task.title, description: task.description });
      setAiDeadline(res.estimatedDeadline);
      toast.success("AI Deadline suggested! ✨");
    } catch {
      toast.error("Failed to suggest AI deadline");
    } finally {
      setLoadingAi(false);
    }
  };

  const handleGenerateSubtasks = async () => {
    setLoadingAi(true);
    try {
      const res = await getSubtaskBreakdown({ title: task.title, description: task.description });
      const newSubtaskTitles = res.subtasks || [];
      if (newSubtaskTitles.length > 0) {
        const formattedNew = newSubtaskTitles.map((t) => ({ title: t, completed: false }));
        const combined = [...(task.subtasks || []), ...formattedNew].slice(0, 20);
        const updateRes = await updateTask(taskId, { subtasks: combined });
        setTask(updateRes.data);
        toast.success(`Generated ${newSubtaskTitles.length} subtasks! ✨`);
      }
    } catch {
      toast.error("Failed to generate subtasks");
    } finally {
      setLoadingAi(false);
    }
  };

  if (loading) {
    return (
      <Box minHeight="100vh" bgcolor="background.default">
        <Navbar />
        <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading task workspace...
          </Typography>
        </Container>
      </Box>
    );
  }

  if (error || !task) {
    return (
      <Box minHeight="100vh" bgcolor="background.default">
        <Navbar />
        <Container maxWidth="md" sx={{ py: 6 }}>
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error || "Task not found or access denied."}
          </Alert>
          <Button component={Link} to="/dashboard" variant="contained" sx={{ borderRadius: 2 }}>
            Back to Dashboard
          </Button>
        </Container>
      </Box>
    );
  }

  const completedSubtasks = (task.subtasks || []).filter((s) => s.completed).length;
  const totalSubtasks = (task.subtasks || []).length;
  const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
  const userRole = activeWorkspace?.role || "MEMBER";
  const canEdit = userRole === "OWNER" || userRole === "ADMIN" || task.user?._id === user?.id || task.user === user?.id;
  const isTaskOverdue = task.dueDate && task.status !== "Completed" && new Date(task.dueDate) < new Date();

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <Navbar />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Breadcrumbs
          items={[
            { label: "Home", to: "/dashboard" },
            { label: activeWorkspace?.name || "Workspace", to: "/dashboard" },
            { label: "Tasks", to: "/dashboard" },
            { label: task.title },
          ]}
        />

        <Grid container spacing={3}>
          {/* MAIN LEFT COLUMN: Task Content & Comments */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 4, borderRadius: 3.5, mb: 3, border: "1px solid #e2e8f0" }} elevation={0}>
              {/* Header Info */}
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} mb={2}>
                <div>
                  <Typography variant="h4" fontWeight={800} gutterBottom sx={{ letterSpacing: "-0.5px" }}>
                    {task.title}
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                    {isTaskOverdue && (
                      <Chip label="⚠️ OVERDUE" color="error" size="small" sx={{ fontWeight: 800, fontSize: "0.68rem" }} />
                    )}
                    <Chip
                      label={task.status === "Completed" ? "✓ Completed" : task.status === "In Progress" ? "⏳ In Progress" : "⏹ Pending"}
                      color={task.status === "Completed" ? "success" : task.status === "In Progress" ? "info" : "warning"}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                    <Chip
                      label={`${task.priority === "High" ? "🔥 High" : task.priority === "Medium" ? "⚡ Medium" : "🟢 Low"} Priority`}
                      color={task.priority === "High" ? "error" : task.priority === "Medium" ? "warning" : "success"}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                    {task.dueDate && (
                      <Chip
                        label={`📅 Due ${new Date(task.dueDate).toLocaleDateString()}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  </Box>
                </div>
                {canEdit && (
                  <Box display="flex" gap={1}>
                    <Button variant="outlined" size="small" onClick={() => setIsEditOpen(true)} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}>
                      ✏️ Edit
                    </Button>
                    <Button variant="outlined" color="error" size="small" onClick={handleDeleteTask} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}>
                      🗑️ Delete
                    </Button>
                  </Box>
                )}
              </Box>

              <Divider sx={{ my: 2.5 }} />

              {/* Description */}
              <Typography variant="subtitle2" fontWeight={800} color="text.secondary" gutterBottom letterSpacing="0.5px">
                DESCRIPTION
              </Typography>
              <Typography variant="body1" color="text.primary" sx={{ whiteSpace: "pre-wrap", mb: 3.5, lineHeight: 1.6 }}>
                {task.description}
              </Typography>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <Box mb={3.5}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" display="block" mb={1} letterSpacing="0.5px">
                    TAGS
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {task.tags.map((tag) => (
                      <Chip key={tag} label={`#${tag}`} size="small" variant="filled" sx={{ bgcolor: "#f1f5f9", fontWeight: 600 }} />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Subtasks Section */}
              <Box mb={3.5}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Typography variant="subtitle2" fontWeight={800}>
                    Subtasks ({completedSubtasks}/{totalSubtasks}) — {subtaskProgress}%
                  </Typography>
                  <Button
                    size="small"
                    onClick={handleGenerateSubtasks}
                    disabled={loadingAi}
                    startIcon={loadingAi ? <CircularProgress size={12} /> : null}
                    variant="outlined"
                    sx={{ borderRadius: 2, fontSize: "0.75rem", textTransform: "none", fontWeight: 700 }}
                  >
                    ✨ Generate AI Subtasks
                  </Button>
                </Box>
                {totalSubtasks > 0 && (
                  <Box height={7} borderRadius={3.5} bgcolor="#e2e8f0" overflow="hidden" mb={2}>
                    <Box width={`${subtaskProgress}%`} height="100%" bgcolor="primary.main" sx={{ transition: "width 0.4s ease" }} />
                  </Box>
                )}
                {task.subtasks?.map((subtask, index) => (
                  <Box
                    key={index}
                    display="flex"
                    alignItems="center"
                    gap={1.5}
                    p={1.2}
                    px={2}
                    mb={0.8}
                    borderRadius={2}
                    bgcolor="#f8fafc"
                    border="1px solid #f1f5f9"
                    sx={{ "&:hover": { bgcolor: "#f1f5f9" }, cursor: "pointer", transition: "background-color 0.15s" }}
                    onClick={() => handleToggleSubtask(index)}
                  >
                    <input type="checkbox" checked={subtask.completed} onChange={() => {}} />
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      sx={{ textDecoration: subtask.completed ? "line-through" : "none", color: subtask.completed ? "text.secondary" : "text.primary" }}
                    >
                      {subtask.title}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* AI Summary Box */}
              {aiSummary && (
                <Paper sx={{ p: 2.5, bgcolor: "rgba(79, 70, 229, 0.04)", border: "1px solid rgba(79, 70, 229, 0.25)", borderRadius: 2.5, mb: 3 }}>
                  <Typography variant="caption" fontWeight={800} color="primary">
                    ✨ AI SUMMARY
                  </Typography>
                  <Typography variant="body2" color="text.primary" mt={0.5} lineHeight={1.5}>
                    {aiSummary}
                  </Typography>
                </Paper>
              )}

              {aiDeadline && (
                <Paper sx={{ p: 2.5, bgcolor: "rgba(14, 165, 233, 0.04)", border: "1px solid rgba(14, 165, 233, 0.25)", borderRadius: 2.5, mb: 3 }}>
                  <Typography variant="caption" fontWeight={800} color="#0ea5e9">
                    ✨ AI SUGGESTED DEADLINE
                  </Typography>
                  <Typography variant="body2" color="text.primary" mt={0.5}>
                    Recommended Completion Date: <strong>{aiDeadline}</strong>
                  </Typography>
                </Paper>
              )}
            </Paper>

            {/* Comments Section */}
            <Paper sx={{ p: 4, borderRadius: 3.5, border: "1px solid #e2e8f0" }} elevation={0}>
              <Typography variant="h6" fontWeight={800} gutterBottom>
                💬 Collaboration & Comments ({comments.length})
              </Typography>

              <Box component="form" onSubmit={handlePostComment} mb={4}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Leave a comment or note for your team..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  sx={{ mb: 1.5 }}
                  slotProps={{ input: { sx: { borderRadius: 2 } } }}
                />
                <Button type="submit" variant="contained" disabled={postingComment || !newComment.trim()} sx={{ borderRadius: 2, px: 3, fontWeight: 700, textTransform: "none" }}>
                  {postingComment ? "Posting..." : "Post Comment"}
                </Button>
              </Box>

              {comments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No comments yet. Start the conversation with your team!
                </Typography>
              ) : (
                comments.map((comment) => {
                  const cId = comment._id || comment.id;
                  const isCommentOwner = comment.user?._id === user?.id || comment.user?.id === user?.id;
                  return (
                    <Box key={cId} display="flex" gap={2} mb={2.5} pb={2.5} borderBottom="1px solid #f1f5f9">
                      <Avatar src={comment.user?.avatar || undefined} sx={{ width: 38, height: 38, bgcolor: "primary.main", fontWeight: 700 }}>
                        {comment.user?.name ? comment.user.name[0].toUpperCase() : "U"}
                      </Avatar>
                      <Box flexGrow={1}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2" fontWeight={700}>
                            {comment.user?.name || "Team Member"}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(comment.createdAt).toLocaleString()}
                            </Typography>
                            {(isCommentOwner || userRole === "OWNER" || userRole === "ADMIN") && (
                              <IconButton size="small" onClick={() => handleDeleteComment(cId)} color="error" sx={{ p: 0.25 }}>
                                🗑️
                              </IconButton>
                            )}
                          </Box>
                        </Box>
                        <Typography variant="body2" color="text.primary" mt={0.5} lineHeight={1.5}>
                          {comment.content}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Paper>
          </Grid>

          {/* RIGHT SIDEBAR: Metadata, AI Actions & Activity Timeline */}
          <Grid item xs={12} md={4}>
            {/* Metadata Card */}
            <Paper sx={{ p: 3, borderRadius: 3.5, mb: 3, border: "1px solid #e2e8f0" }} elevation={0}>
              <Typography variant="subtitle2" fontWeight={800} gutterBottom letterSpacing="0.5px">
                PROPERTIES & METADATA
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box display="flex" flexDirection="column" gap={2}>
                <div>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Assigned To</Typography>
                  <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                    <Avatar src={task.assignedTo?.avatar || undefined} sx={{ width: 28, height: 28, fontSize: "0.75rem", bgcolor: "primary.main", fontWeight: 700 }}>
                      {task.assignedTo?.name ? task.assignedTo.name[0].toUpperCase() : "?"}
                    </Avatar>
                    <Typography variant="body2" fontWeight={700}>
                      {task.assignedTo?.name || "Unassigned"}
                    </Typography>
                  </Box>
                </div>

                <div>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Created By</Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {task.createdBy?.name || task.user?.name || "User"}
                  </Typography>
                </div>

                {task.estimatedTime && (
                  <div>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Estimated Duration</Typography>
                    <Typography variant="body2" fontWeight={700}>
                      ⏱️ {task.estimatedTime} minutes
                    </Typography>
                  </div>
                )}

                <div>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Created At</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(task.createdAt).toLocaleString()}
                  </Typography>
                </div>
              </Box>
            </Paper>

            {/* AI Assistant Quick Actions */}
            <Paper sx={{ p: 3, borderRadius: 3.5, mb: 3, border: "1px solid rgba(79, 70, 229, 0.25)", bgcolor: "rgba(79, 70, 229, 0.02)" }} elevation={0}>
              <Typography variant="subtitle2" fontWeight={800} gutterBottom letterSpacing="0.5px">
                ✨ AI ASSISTANT TOOLS
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" flexDirection="column" gap={1.2}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleGenerateSummary}
                  disabled={loadingAi}
                  startIcon={loadingAi ? <CircularProgress size={12} /> : null}
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                >
                  ✨ Summarize Task
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleGenerateDeadline}
                  disabled={loadingAi}
                  startIcon={loadingAi ? <CircularProgress size={12} /> : null}
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                >
                  ✨ Recommend Deadline
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleGenerateSubtasks}
                  disabled={loadingAi}
                  startIcon={loadingAi ? <CircularProgress size={12} /> : null}
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                >
                  ✨ Auto-Generate Subtasks
                </Button>
              </Box>
            </Paper>

            {/* Activity History Timeline */}
            <Paper sx={{ p: 3, borderRadius: 3.5, border: "1px solid #e2e8f0" }} elevation={0}>
              <Typography variant="subtitle2" fontWeight={800} gutterBottom letterSpacing="0.5px">
                📜 ACTIVITY HISTORY
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {loadingActivity ? (
                <CircularProgress size={20} />
              ) : activity.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                  No activity history recorded yet.
                </Typography>
              ) : (
                activity.map((act) => (
                  <Box key={act._id} mb={1.5} pb={1.5} borderBottom="1px dashed #e2e8f0">
                    <Typography variant="caption" fontWeight={700} color="primary.main" display="block">
                      {act.action.replace("_", " ").toUpperCase()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      By {act.actor?.name || "System"} • {new Date(act.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                ))
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Task Form Modal for Edits */}
        {isEditOpen && (
          <TaskForm
            open={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            onSubmit={handleUpdateTask}
            task={task}
            submitting={submitting}
          />
        )}
      </Container>
    </Box>
  );
};

export default TaskDetail;
