import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Pagination,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";

import Navbar from "../components/Navbar";
import TaskCard from "../components/TaskCard";
import TaskForm from "../components/TaskForm";
import Breadcrumbs from "../components/Breadcrumbs";
import EmptyState from "../components/EmptyState";
import { TaskCardSkeleton } from "../components/SkeletonLoader";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useSocket } from "../context/SocketContext";
import {
  createTask,
  deleteTask,
  getDeadlineSuggestion,
  getProductivitySuggestions,
  getTaskSummary,
  getTasks,
  parseNaturalLanguage,
  updateTask,
} from "../services/taskService";
import { getWorkspaceAnalytics } from "../services/workspaceService";

const initialFilters = {
  page: 1,
  limit: 6,
  search: "",
  status: "",
  priority: "",
  assignment: "",
  sort: "createdAt",
  order: "desc",
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const Dashboard = () => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { socket } = useSocket();
  const workspaceId = activeWorkspace?._id || activeWorkspace?.id;
  const userRole = activeWorkspace?.role || "MEMBER";

  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [searchInput, setSearchInput] = useState("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalTasks: 0 });
  const [analytics, setAnalytics] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    highPriorityTasks: 0,
    mediumPriorityTasks: 0,
    lowPriorityTasks: 0,
    upcomingTasks: [],
    memberStats: [],
  });

  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [error, setError] = useState("");
  const [formTask, setFormTask] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [insights, setInsights] = useState({});
  const [workingAction, setWorkingAction] = useState({});
  const [productivitySuggestions, setProductivitySuggestions] = useState([]);
  const [loadingProductivity, setLoadingProductivity] = useState(false);
  const [nlText, setNlText] = useState("");
  const [parsingNl, setParsingNl] = useState(false);

  const lastWorkspaceIdRef = useRef(workspaceId);
  if (lastWorkspaceIdRef.current !== workspaceId) {
    lastWorkspaceIdRef.current = workspaceId;
    setFilters(initialFilters);
  }

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getTasks(filters);
      setTasks(response.data || []);
      setPagination({
        page: response.page || 1,
        totalPages: response.totalPages || 1,
        totalTasks: response.totalTasks || 0,
      });
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to load tasks.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filters, workspaceId]);

  const fetchAnalytics = useCallback(async () => {
    if (!workspaceId) return;
    setLoadingAnalytics(true);
    try {
      const response = await getWorkspaceAnalytics(workspaceId);
      setAnalytics(response.data || {});
    } catch {
      // Ignore analytics fetch error gracefully
    } finally {
      setLoadingAnalytics(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAnalytics();
  }, [fetchAnalytics]);

  // Real-time socket task listeners
  useEffect(() => {
    if (!socket) return;

    const handleTaskCreated = (newTask) => {
      if (newTask) {
        setTasks((prev) => [newTask, ...prev.filter((t) => t._id !== newTask._id)]);
        void fetchAnalytics();
      }
    };

    const handleTaskUpdated = (updatedTask) => {
      if (updatedTask) {
        setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
        void fetchAnalytics();
      }
    };

    const handleTaskDeleted = ({ taskId }) => {
      if (taskId) {
        setTasks((prev) => prev.filter((t) => t._id !== taskId));
        void fetchAnalytics();
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
  }, [socket, fetchAnalytics]);

  const updateFilters = (nextValues) => {
    setFilters((currentFilters) => ({ ...currentFilters, ...nextValues }));
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    updateFilters({ search: searchInput.trim(), page: 1 });
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setFilters(initialFilters);
  };

  const handleOpenCreate = () => {
    setFormTask(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    if (!submitting) {
      setIsFormOpen(false);
      setFormTask(null);
    }
  };

  const handleSubmitTask = async (taskData) => {
    setSubmitting(true);
    try {
      if (formTask?._id) {
        await updateTask(formTask._id, taskData);
        toast.success("Task updated successfully");
      } else {
        await createTask(taskData);
        toast.success("Task created with AI priority! ✨");
      }
      setIsFormOpen(false);
      setFormTask(null);
      updateFilters({ page: 1 });
      void fetchAnalytics();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to save task.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (task, status) => {
    if (task.status === status) return;
    setWorkingAction((current) => ({ ...current, [task._id]: "status" }));
    try {
      await updateTask(task._id, { status });
      setTasks((currentTasks) =>
        currentTasks.map((t) => (t._id === task._id ? { ...t, status } : t))
      );
      toast.success("Status updated");
      void fetchAnalytics();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update status.");
    } finally {
      setWorkingAction((current) => ({ ...current, [task._id]: null }));
    }
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;
    const deletingTask = taskToDelete;
    setWorkingAction((current) => ({ ...current, [deletingTask._id]: "delete" }));
    try {
      await deleteTask(deletingTask._id);
      toast.success("Task deleted");
      setTaskToDelete(null);
      if (tasks.length === 1 && filters.page > 1) {
        updateFilters({ page: filters.page - 1 });
      } else {
        fetchTasks();
      }
      void fetchAnalytics();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to delete task.");
    } finally {
      setWorkingAction((current) => ({ ...current, [deletingTask._id]: null }));
    }
  };

  const handleAiInsight = async (task, type) => {
    setWorkingAction((current) => ({ ...current, [task._id]: type }));
    try {
      const response =
        type === "summary"
          ? await getTaskSummary(task)
          : await getDeadlineSuggestion(task);
      const value = type === "summary" ? response.summary : response.estimatedDeadline;
      setInsights((current) => ({
        ...current,
        [task._id]: { ...current[task._id], [type]: value },
      }));
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "AI request failed.");
    } finally {
      setWorkingAction((current) => ({ ...current, [task._id]: null }));
    }
  };

  const handleLoadProductivity = async () => {
    setLoadingProductivity(true);
    try {
      const response = await getProductivitySuggestions();
      setProductivitySuggestions(response.suggestions || []);
    } catch {
      toast.error("Could not load productivity suggestions.");
    } finally {
      setLoadingProductivity(false);
    }
  };

  const handleNaturalLanguageCreate = async (e) => {
    e.preventDefault();
    if (!nlText.trim()) return;
    setParsingNl(true);
    try {
      const response = await parseNaturalLanguage(nlText.trim());
      if (response.data) {
        setFormTask({ ...response.data, _id: null, aiParsed: true });
        setIsFormOpen(true);
        setNlText("");
        toast.success("Task parsed from description! ✨");
      }
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Could not parse task.");
    } finally {
      setParsingNl(false);
    }
  };

  const summaryCards = [
    { label: "Total Tasks", value: analytics.totalTasks ?? 0, color: "#4f46e5", bg: "rgba(79, 70, 229, 0.06)" },
    { label: "Completed", value: analytics.completedTasks ?? 0, color: "#059669", bg: "rgba(5, 150, 105, 0.06)" },
    { label: "In Progress", value: analytics.inProgressTasks ?? 0, color: "#0ea5e9", bg: "rgba(14, 165, 233, 0.06)" },
    { label: "Pending", value: analytics.pendingTasks ?? 0, color: "#d97706", bg: "rgba(217, 119, 6, 0.06)" },
    { label: "Overdue", value: analytics.overdueTasks ?? 0, color: "#dc2626", bg: "rgba(220, 38, 38, 0.06)" },
    { label: "Completion Rate", value: `${analytics.completionRate ?? 0}%`, color: "#7c3aed", bg: "rgba(124, 58, 237, 0.06)" },
  ];

  const userName = user?.name ? user.name.split(" ")[0] : "User";
  const showTeamProductivity = (userRole === "OWNER" || userRole === "ADMIN") && analytics.memberStats?.length > 0;
  const isFiltered = Boolean(filters.search || filters.status || filters.priority || filters.assignment);

  return (
    <div className="dashboard-page">
      <Navbar onCreateTask={handleOpenCreate} />

      <main className="dashboard-layout">
        <Breadcrumbs items={[{ label: "Home", to: "/dashboard" }, { label: "Dashboard" }]} />

        {/* Welcome Header */}
        <section className="welcome-banner">
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <div>
              <Typography component="h1" variant="h5" fontWeight={800}>
                {getGreeting()}, {userName} 👋
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Workspace Overview — <strong>{activeWorkspace?.name || "Personal Workspace"}</strong> ({userRole})
              </Typography>
            </div>
            <Button variant="contained" size="small" onClick={handleOpenCreate} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}>
              + Create Task
            </Button>
          </Box>
        </section>

        {/* Summary Metrics Row */}
        <section className="summary-row" aria-label="Workspace metrics summary">
          {summaryCards.map(({ label, value, color, bg }) => (
            <Paper className="summary-card" elevation={0} key={label} style={{ backgroundColor: bg }}>
              <Typography color="text.secondary" variant="caption" fontWeight={700}>{label}</Typography>
              <Typography component="p" variant="h4" sx={{ color, fontWeight: 800 }}>
                {value}
              </Typography>
            </Paper>
          ))}
        </section>



        {/* Team Productivity Table for Owner/Admin */}
        {showTeamProductivity && (
          <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3 }} elevation={0}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              👥 Team Workload & Productivity
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell fontWeight={700}>Member</TableCell>
                    <TableCell fontWeight={700}>Role</TableCell>
                    <TableCell fontWeight={700} align="center">Total</TableCell>
                    <TableCell fontWeight={700} align="center">Completed</TableCell>
                    <TableCell fontWeight={700} align="center">In Progress</TableCell>
                    <TableCell fontWeight={700} align="center">Overdue</TableCell>
                    <TableCell fontWeight={700} align="right">Completion %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analytics.memberStats.map((m) => (
                    <TableRow key={m.user._id || m.user.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar src={m.user.avatar || undefined} sx={{ width: 26, height: 26, fontSize: "0.75rem" }}>
                            {m.user.name ? m.user.name[0].toUpperCase() : "?"}
                          </Avatar>
                          <Typography variant="body2" fontWeight={600}>{m.user.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={m.role} size="small" sx={{ height: 18, fontSize: "0.65rem" }} />
                      </TableCell>
                      <TableCell align="center">{m.totalTasks}</TableCell>
                      <TableCell align="center" style={{ color: "#059669", fontWeight: 700 }}>{m.completedTasks}</TableCell>
                      <TableCell align="center" style={{ color: "#0ea5e9" }}>{m.inProgressTasks}</TableCell>
                      <TableCell align="center" style={{ color: m.overdueTasks > 0 ? "#dc2626" : "inherit" }}>
                        {m.overdueTasks}
                      </TableCell>
                      <TableCell align="right" style={{ fontWeight: 700 }}>{m.completionRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Main 2-Column Dashboard Body */}
        <div className="dashboard-body-grid">
          {/* LEFT MAIN AREA: Workspace Tasks & Controls */}
          <div className="main-content-column">
            {/* Filter & Search Toolbar */}
            <Paper className="tasks-toolbar-panel" elevation={0}>
              <div className="toolbar-header">
                <Typography component="h2" variant="h6" fontWeight={700}>
                  Tasks ({pagination.totalTasks})
                </Typography>
                {isFiltered && (
                  <Button size="small" onClick={handleClearFilters} sx={{ fontSize: "0.75rem", p: 0.5 }}>
                    Clear Filters
                  </Button>
                )}
              </div>

              <Box className="toolbar-controls" component="form" onSubmit={handleSearchSubmit}>
                <TextField
                  className="search-field"
                  id="search-input"
                  placeholder="Search tasks..."
                  onChange={(event) => setSearchInput(event.target.value)}
                  size="small"
                  value={searchInput}
                  slotProps={{ input: { sx: { borderRadius: 2 } } }}
                />
                <TextField
                  className="filter-select"
                  id="filter-assignment"
                  onChange={(event) => updateFilters({ assignment: event.target.value, page: 1 })}
                  select
                  size="small"
                  value={filters.assignment || ""}
                  slotProps={{ input: { sx: { borderRadius: 2 } } }}
                >
                  <MenuItem value="">All Workspace Tasks</MenuItem>
                  <MenuItem value="my_tasks">My Created Tasks</MenuItem>
                  <MenuItem value="assigned_to_me">Assigned to Me</MenuItem>
                  <MenuItem value="assigned_by_me">Assigned by Me</MenuItem>
                </TextField>
                <TextField
                  className="filter-select"
                  id="filter-status"
                  onChange={(event) => updateFilters({ status: event.target.value, page: 1 })}
                  select
                  size="small"
                  value={filters.status}
                  slotProps={{ input: { sx: { borderRadius: 2 } } }}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                </TextField>
                <TextField
                  className="filter-select"
                  id="filter-priority"
                  onChange={(event) => updateFilters({ priority: event.target.value, page: 1 })}
                  select
                  size="small"
                  value={filters.priority}
                  slotProps={{ input: { sx: { borderRadius: 2 } } }}
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  <MenuItem value="High">🔥 High</MenuItem>
                  <MenuItem value="Medium">⚡ Medium</MenuItem>
                  <MenuItem value="Low">🟢 Low</MenuItem>
                </TextField>
                <Button id="search-btn" type="submit" variant="contained" size="small" sx={{ borderRadius: 2, height: 40, px: 2.5, fontWeight: 700 }}>
                  Search
                </Button>
              </Box>

              {/* Quick Filter Presets Bar */}
              <Box className="preset-filter-bar" mt={0.5}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>Presets:</Typography>
                <Chip
                  label="🔥 High Priority"
                  size="small"
                  onClick={() => updateFilters({ priority: filters.priority === "High" ? "" : "High", page: 1 })}
                  color={filters.priority === "High" ? "error" : "default"}
                  variant={filters.priority === "High" ? "filled" : "outlined"}
                  sx={{ height: 22, fontSize: "0.68rem", cursor: "pointer" }}
                />
                <Chip
                  label="⏳ In Progress"
                  size="small"
                  onClick={() => updateFilters({ status: filters.status === "In Progress" ? "" : "In Progress", page: 1 })}
                  color={filters.status === "In Progress" ? "info" : "default"}
                  variant={filters.status === "In Progress" ? "filled" : "outlined"}
                  sx={{ height: 22, fontSize: "0.68rem", cursor: "pointer" }}
                />
                <Chip
                  label="✓ Completed"
                  size="small"
                  onClick={() => updateFilters({ status: filters.status === "Completed" ? "" : "Completed", page: 1 })}
                  color={filters.status === "Completed" ? "success" : "default"}
                  variant={filters.status === "Completed" ? "filled" : "outlined"}
                  sx={{ height: 22, fontSize: "0.68rem", cursor: "pointer" }}
                />
                <Chip
                  label="👤 Assigned to Me"
                  size="small"
                  onClick={() => updateFilters({ assignment: filters.assignment === "assigned_to_me" ? "" : "assigned_to_me", page: 1 })}
                  color={filters.assignment === "assigned_to_me" ? "primary" : "default"}
                  variant={filters.assignment === "assigned_to_me" ? "filled" : "outlined"}
                  sx={{ height: 22, fontSize: "0.68rem", cursor: "pointer" }}
                />
              </Box>
            </Paper>

            {error && <Alert className="dashboard-alert" severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

            {/* Task Grid / Cards List */}
            {loading ? (
              <div className="tasks-grid">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <TaskCardSkeleton key={item} />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <EmptyState
                title={isFiltered ? "No matching tasks found" : "No tasks in this workspace"}
                description={isFiltered ? "Try clearing or adjusting your search filters." : "Get started by creating your first task using AI or manual creation."}
                actionLabel="+ Create Task"
                onAction={handleOpenCreate}
              />
            ) : (
              <>
                <div className="tasks-grid">
                  {tasks.map((task) => (
                    <TaskCard
                      deadline={insights[task._id]?.deadline}
                      key={task._id}
                      onDelete={setTaskToDelete}
                      onEdit={(selectedTask) => {
                        setFormTask(selectedTask);
                        setIsFormOpen(true);
                      }}
                      onStatusChange={handleStatusChange}
                      onSummarize={handleAiInsight}
                      summary={insights[task._id]?.summary}
                      task={task}
                      workingAction={workingAction[task._id]}
                    />
                  ))}
                </div>

                {pagination.totalPages > 1 && (
                  <div className="pagination-wrap">
                    <Pagination
                      count={pagination.totalPages}
                      onChange={(_, page) => updateFilters({ page })}
                      page={pagination.page}
                      shape="rounded"
                      color="primary"
                      size="small"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* RIGHT SECONDARY COLUMN: Widgets Sidebar */}
          <aside className="sidebar-column">
            {/* Widget 1: Create with AI */}
            <Paper className="sidebar-card nl-card" elevation={0}>
              <Typography variant="subtitle2" fontWeight={800} gutterBottom className="card-heading">
                ✨ Create Task with AI
              </Typography>
              <Typography color="text.secondary" variant="caption" display="block" sx={{ mb: 1.5 }}>
                Describe a task in natural language (e.g. "Draft API documentation by 5 PM, high priority").
              </Typography>
              <Box component="form" onSubmit={handleNaturalLanguageCreate} className="nl-form-compact">
                <TextField
                  fullWidth
                  id="nl-input"
                  multiline
                  rows={2}
                  placeholder="e.g. Prepare TCS NQT prep deck by Friday, high priority"
                  onChange={(e) => setNlText(e.target.value)}
                  size="small"
                  value={nlText}
                  slotProps={{ input: { sx: { borderRadius: 2 } } }}
                />
                <Box display="flex" gap={0.5} flexWrap="wrap" my={1}>
                  <Chip
                    label="💡 TCS NQT deck by Friday"
                    size="small"
                    onClick={() => setNlText("Prepare TCS NQT prep deck by Friday, high priority")}
                    sx={{ fontSize: "0.68rem", height: 22, cursor: "pointer" }}
                  />
                  <Chip
                    label="💡 Security audit report"
                    size="small"
                    onClick={() => setNlText("Review backend security audit report before 5 PM")}
                    sx={{ fontSize: "0.68rem", height: 22, cursor: "pointer" }}
                  />
                </Box>
                <Button
                  disabled={parsingNl || !nlText.trim()}
                  fullWidth
                  id="nl-submit-btn"
                  size="small"
                  startIcon={parsingNl ? <CircularProgress size={14} /> : null}
                  type="submit"
                  variant="contained"
                  sx={{ mt: 1, borderRadius: 2, py: 1, fontWeight: 700, textTransform: "none" }}
                >
                  {parsingNl ? "Analyzing prompt..." : "✨ Parse with AI & Create"}
                </Button>
              </Box>
            </Paper>

            {/* Widget 2: Upcoming Deadlines & Priority Focus */}
            <Paper className="sidebar-card" elevation={0}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom className="card-heading">
                📅 Upcoming Deadlines (Next 7 Days)
              </Typography>
              {analytics.upcomingTasks?.length > 0 ? (
                <div className="deadline-list">
                  {analytics.upcomingTasks.map((task) => (
                    <div key={task._id} className="deadline-item">
                      <div className="deadline-item-info">
                        <Typography variant="body2" fontWeight={600} className="deadline-title">
                          {task.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </Typography>
                      </div>
                      <Chip label={task.priority} size="small" color={task.priority === "High" ? "error" : "warning"} variant="outlined" />
                    </div>
                  ))}
                </div>
              ) : (
                <Typography color="text.secondary" variant="caption" display="block">
                  No upcoming deadlines in the next 7 days.
                </Typography>
              )}
            </Paper>

            {/* Widget 3: AI Productivity Insights */}
            <Paper className="sidebar-card" elevation={0}>
              <div className="sidebar-card-header">
                <Typography variant="subtitle2" fontWeight={700} className="card-heading">
                  💡 AI Productivity Coach
                </Typography>
                <Button
                  disabled={loadingProductivity}
                  onClick={handleLoadProductivity}
                  size="small"
                  startIcon={loadingProductivity ? <CircularProgress size={12} /> : null}
                  variant="text"
                  sx={{ fontSize: "0.75rem", minWidth: "auto", p: 0.5 }}
                >
                  {productivitySuggestions.length > 0 ? "Refresh" : "Get Tips"}
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="completion-widget">
                <div className="completion-label-row">
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Completion Rate</Typography>
                  <Typography variant="caption" fontWeight={700} color="primary">{analytics.completionRate || 0}%</Typography>
                </div>
                <div className="completion-bar-track">
                  <div className="completion-bar-fill" style={{ width: `${analytics.completionRate || 0}%` }} />
                </div>
              </div>

              {productivitySuggestions.length > 0 ? (
                <ul className="productivity-list">
                  {productivitySuggestions.map((tip, i) => (
                    <li key={i}><Typography variant="caption">{tip}</Typography></li>
                  ))}
                </ul>
              ) : (
                <Typography color="text.secondary" variant="caption" display="block" sx={{ mt: 1 }}>
                  Click "Get Tips" to generate personalized productivity tips based on your active workload.
                </Typography>
              )}
            </Paper>
          </aside>
        </div>
      </main>

      {/* Task Form Dialog */}
      <TaskForm
        key={formTask?._id || "new"}
        onClose={handleCloseForm}
        onSubmit={handleSubmitTask}
        open={isFormOpen}
        submitting={submitting}
        task={formTask}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog onClose={() => setTaskToDelete(null)} open={Boolean(taskToDelete)}>
        <DialogTitle fontWeight={700}>Delete task?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This action permanently removes "{taskToDelete?.title}". This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTaskToDelete(null)} color="inherit">Cancel</Button>
          <Button color="error" onClick={handleDelete} variant="contained" id="confirm-delete-btn" sx={{ borderRadius: 2, fontWeight: 700 }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Dashboard;
