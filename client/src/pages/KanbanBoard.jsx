import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import TaskForm from "../components/TaskForm";
import Breadcrumbs from "../components/Breadcrumbs";
import EmptyState from "../components/EmptyState";
import { useWorkspace } from "../context/WorkspaceContext";
import { useSocket } from "../context/SocketContext";
import { getTasks, updateTask, createTask } from "../services/taskService";

const COLUMNS = [
  { key: "Pending", label: "Pending", color: "#d97706", bg: "#fef3c7" },
  { key: "In Progress", label: "In Progress", color: "#0ea5e9", bg: "#e0f2fe" },
  { key: "Completed", label: "Completed", color: "#059669", bg: "#d1fae5" },
];

const KanbanBoard = () => {
  const { activeWorkspace } = useWorkspace();
  const { socket } = useSocket();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  // Task Creation Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const workspaceId = activeWorkspace?._id || activeWorkspace?.id;

  const fetchBoardTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTasks({ limit: 100 });
      setTasks(res.data || []);
    } catch {
      toast.error("Failed to load tasks for board");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchBoardTasks();
  }, [fetchBoardTasks]);

  // Real-time socket listeners for Kanban Board
  useEffect(() => {
    if (!socket) return;

    const handleTaskCreated = (newTask) => {
      if (newTask) {
        setTasks((prev) => [newTask, ...prev.filter((t) => t._id !== newTask._id)]);
      }
    };

    const handleTaskUpdated = (updatedTask) => {
      if (updatedTask) {
        setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
      }
    };

    const handleTaskDeleted = ({ taskId }) => {
      if (taskId) {
        setTasks((prev) => prev.filter((t) => t._id !== taskId));
      }
    };

    socket.on("task.created", handleTaskCreated);
    socket.on("task.updated", handleTaskUpdated);
    socket.on("task.deleted", handleTaskDeleted);

    return () => {
      socket.off("task.created", handleTaskCreated);
      socket.off("task.updated", handleTaskUpdated);
      socket.off("task.deleted", handleTaskDeleted);
    };
  }, [socket]);

  const handleStatusChange = async (taskId, newStatus) => {
    setUpdatingId(taskId);
    try {
      await updateTask(taskId, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
      toast.success(`Moved to ${newStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update task status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateTask = async (taskData) => {
    setSubmitting(true);
    try {
      await createTask(taskData);
      toast.success("Task created!");
      setIsFormOpen(false);
      void fetchBoardTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const [dragOverCol, setDragOverCol] = useState(null);

  // Drag and Drop event handlers
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    if (dragOverCol !== colKey) {
      setDragOverCol(colKey);
    }
  };

  const handleDragLeave = (e, colKey) => {
    if (dragOverCol === colKey) {
      setDragOverCol(null);
    }
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      void handleStatusChange(taskId, targetStatus);
    }
  };

  // Filtering
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = !priorityFilter || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <Navbar onCreateTask={() => setIsFormOpen(true)} />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Breadcrumbs
          items={[
            { label: "Home", to: "/dashboard" },
            { label: activeWorkspace?.name || "Workspace", to: "/dashboard" },
            { label: "Kanban Board" },
          ]}
        />

        {/* Header & Controls */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
          <div>
            <Typography variant="h4" fontWeight={800}>
              📋 Kanban Workspace
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Workspace: <strong>{activeWorkspace?.name || "Personal Workspace"}</strong> — Drag and drop tasks between columns to update status.
            </Typography>
          </div>
          <Box display="flex" gap={1.5} alignItems="center">
            <TextField
              placeholder="Quick filter board..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{ input: { sx: { borderRadius: 2, bgcolor: "#fff", width: 200 } } }}
            />
            <TextField
              select
              size="small"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              slotProps={{ input: { sx: { borderRadius: 2, bgcolor: "#fff", width: 130 } } }}
            >
              <MenuItem value="">All Priorities</MenuItem>
              <MenuItem value="High">🔥 High</MenuItem>
              <MenuItem value="Medium">⚡ Medium</MenuItem>
              <MenuItem value="Low">🟢 Low</MenuItem>
            </TextField>
            <Button variant="contained" onClick={() => setIsFormOpen(true)} sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}>
              + New Task
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box py={8} textAlign="center">
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" mt={2}>
              Loading Kanban board...
            </Typography>
          </Box>
        ) : (
          <Box
            className="kanban-board-container"
            display="flex"
            gap={3}
            sx={{
              overflowX: "auto",
              pb: 3,
              minHeight: "calc(100vh - 240px)",
              alignItems: "stretch",
            }}
          >
            {COLUMNS.map((col) => {
              const columnTasks = filteredTasks.filter((t) => t.status === col.key);
              const isOver = dragOverCol === col.key;

              return (
                <Paper
                  key={col.key}
                  className="kanban-column"
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  onDragLeave={(e) => handleDragLeave(e, col.key)}
                  onDrop={(e) => handleDrop(e, col.key)}
                  sx={{
                    flex: { xs: "0 0 85vw", sm: "0 0 350px", md: "1 1 350px" },
                    minWidth: { xs: 280, sm: 330 },
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: isOver ? "rgba(79, 70, 229, 0.05)" : "#f8fafc",
                    border: isOver ? "2px dashed #4f46e5" : "1px solid #e2e8f0",
                    transition: "background-color 0.2s, border-color 0.2s",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Column Sticky Header */}
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} pb={1} borderBottom="2px solid" borderColor={col.color}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box width={12} height={12} borderRadius="50%" bgcolor={col.color} />
                      <Typography variant="subtitle1" fontWeight={800}>
                        {col.label}
                      </Typography>
                    </Box>
                    <Chip
                      label={columnTasks.length}
                      size="small"
                      sx={{ bgcolor: col.bg, color: col.color, fontWeight: 800, fontSize: "0.75rem" }}
                    />
                  </Box>

                  {/* Cards Container */}
                  <Box display="flex" flexDirection="column" gap={2} flexGrow={1}>
                    {columnTasks.length === 0 ? (
                      <Box
                        p={3}
                        textAlign="center"
                        border="2px dashed #cbd5e1"
                        borderRadius={2.5}
                        bgcolor="#ffffff"
                        my="auto"
                      >
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          No tasks in {col.label}
                        </Typography>
                      </Box>
                    ) : (
                      columnTasks.map((task) => {
                        const totalSub = task.subtasks?.length || 0;
                        const doneSub = task.subtasks?.filter((s) => s.completed).length || 0;
                        const isTaskOverdue = task.dueDate && task.status !== "Completed" && new Date(task.dueDate) < new Date();

                        return (
                          <Paper
                            key={task._id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task._id)}
                            elevation={1}
                            sx={{
                              p: 2,
                              borderRadius: 2.5,
                              cursor: "grab",
                              border: isTaskOverdue ? "1px solid rgba(220, 38, 38, 0.4)" : "1px solid #e2e8f0",
                              bgcolor: isTaskOverdue ? "rgba(254, 242, 242, 0.4)" : "#ffffff",
                              transition: "transform 0.15s, box-shadow 0.15s",
                              "&:hover": {
                                transform: "translateY(-3px)",
                                boxShadow: "0 6px 16px rgba(0,0,0,0.09)",
                              },
                              opacity: updatingId === task._id ? 0.5 : 1,
                            }}
                          >
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1} gap={1}>
                              <Typography
                                component={Link}
                                to={`/tasks/${task._id}`}
                                variant="subtitle2"
                                fontWeight={700}
                                color="text.primary"
                                sx={{ textDecoration: "none", "&:hover": { color: "primary.main" } }}
                              >
                                {task.title}
                              </Typography>
                              <Chip
                                label={task.priority === "High" ? "🔥 High" : task.priority === "Medium" ? "⚡ Medium" : "🟢 Low"}
                                size="small"
                                color={
                                  task.priority === "High"
                                    ? "error"
                                    : task.priority === "Medium"
                                    ? "warning"
                                    : "success"
                                }
                                sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
                              />
                            </Box>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                mb: 1.5,
                                fontSize: "0.8rem",
                              }}
                            >
                              {task.description}
                            </Typography>

                            {/* Tags */}
                            {task.tags && task.tags.length > 0 && (
                              <Box display="flex" gap={0.5} flexWrap="wrap" mb={1.5}>
                                {task.tags.map((tag) => (
                                  <Chip
                                    key={tag}
                                    label={`#${tag}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 18, fontSize: "0.6rem" }}
                                  />
                                ))}
                              </Box>
                            )}

                            {/* Footer: Due Date, Subtasks & Assignee */}
                            <Box display="flex" justifyContent="space-between" alignItems="center" pt={1} borderTop="1px solid #f1f5f9">
                              <Box display="flex" alignItems="center" gap={1}>
                                {task.dueDate && (
                                  <Typography variant="caption" color={isTaskOverdue ? "error.main" : "text.secondary"} fontSize="0.7rem" fontWeight={isTaskOverdue ? 700 : 500}>
                                    📅 {new Date(task.dueDate).toLocaleDateString()}
                                  </Typography>
                                )}
                                {totalSub > 0 && (
                                  <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                                    ☑️ {doneSub}/{totalSub}
                                  </Typography>
                                )}
                              </Box>

                              <Avatar
                                src={task.assignedTo?.avatar || undefined}
                                sx={{ width: 24, height: 24, fontSize: "0.65rem", bgcolor: "primary.main", fontWeight: 700 }}
                                title={task.assignedTo?.name || "Unassigned"}
                              >
                                {task.assignedTo?.name ? task.assignedTo.name[0].toUpperCase() : "?"}
                              </Avatar>
                            </Box>

                            {/* Touch / Quick Move Buttons */}
                            <Box display="flex" gap={0.5} mt={1.5} pt={1} borderTop="1px dashed #f1f5f9">
                              {COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                                <Button
                                  key={c.key}
                                  size="small"
                                  onClick={() => handleStatusChange(task._id, c.key)}
                                  sx={{ fontSize: "0.65rem", py: 0.25, px: 0.75, textTransform: "none", fontWeight: 600 }}
                                >
                                  → {c.label}
                                </Button>
                              ))}
                            </Box>
                          </Paper>
                        );
                      })
                    )}
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}
      </Container>

      {/* Task Form Modal */}
      {isFormOpen && (
        <TaskForm
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleCreateTask}
          submitting={submitting}
        />
      )}
    </Box>
  );
};

export default KanbanBoard;
