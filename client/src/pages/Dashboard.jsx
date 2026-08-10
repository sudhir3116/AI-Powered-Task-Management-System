import { useCallback, useEffect, useState } from "react";
import {
  Alert,
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
  Skeleton,
  TextField,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";

import Navbar from "../components/Navbar";
import TaskCard from "../components/TaskCard";
import TaskForm from "../components/TaskForm";
import { useAuth } from "../context/AuthContext";
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

const initialFilters = {
  page: 1,
  limit: 6,
  search: "",
  status: "",
  priority: "",
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
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [searchInput, setSearchInput] = useState("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalTasks: 0 });
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    completionRate: 0,
    priorityDistribution: { High: 0, Medium: 0, Low: 0 },
    upcomingDeadlines: [],
  });
  const [loading, setLoading] = useState(true);
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
      setStatistics((prev) => ({ ...prev, ...(response.statistics || {}) }));
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to load tasks.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTasks();
  }, [fetchTasks]);

  const updateFilters = (nextValues) => {
    setFilters((currentFilters) => ({ ...currentFilters, ...nextValues }));
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    updateFilters({ search: searchInput.trim(), page: 1 });
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
        setFormTask({ ...response.data, _id: null });
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
    { label: "Total Tasks", value: statistics.total, color: "#4f46e5", bg: "rgba(79, 70, 229, 0.06)" },
    { label: "Completed", value: statistics.completed, color: "#059669", bg: "rgba(5, 150, 105, 0.06)" },
    { label: "In Progress", value: statistics.inProgress, color: "#0ea5e9", bg: "rgba(14, 165, 233, 0.06)" },
    { label: "Overdue", value: statistics.overdue, color: "#dc2626", bg: "rgba(220, 38, 38, 0.06)" },
  ];

  const userName = user?.name ? user.name.split(" ")[0] : "User";

  return (
    <div className="dashboard-page">
      <Navbar onCreateTask={handleOpenCreate} />

      <main className="dashboard-layout">
        {/* Welcome Header */}
        <section className="welcome-banner">
          <Typography component="h1" variant="h5" fontWeight={700}>
            {getGreeting()}, {userName} 👋
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Here's your productivity overview.
          </Typography>
        </section>

        {/* 4-Card Summary Row */}
        <section className="summary-row" aria-label="Task metrics summary">
          {summaryCards.map(({ label, value, color, bg }) => (
            <Paper className="summary-card" elevation={0} key={label} style={{ backgroundColor: bg }}>
              <Typography color="text.secondary" variant="caption" fontWeight={600}>{label}</Typography>
              <Typography component="p" variant="h4" sx={{ color, fontWeight: 800 }}>
                {value}
              </Typography>
            </Paper>
          ))}
        </section>

        {/* Main 2-Column Dashboard Body */}
        <div className="dashboard-body-grid">
          {/* LEFT MAIN AREA: My Tasks & Controls */}
          <div className="main-content-column">
            {/* Filter & Search Toolbar */}
            <Paper className="tasks-toolbar-panel" elevation={0}>
              <div className="toolbar-header">
                <Typography component="h2" variant="h6" fontWeight={700}>
                  My Tasks
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {pagination.totalTasks} task{pagination.totalTasks === 1 ? "" : "s"}
                </Typography>
              </div>

              <Box className="toolbar-controls" component="form" onSubmit={handleSearchSubmit}>
                <TextField
                  className="search-field"
                  id="search-input"
                  placeholder="Search tasks..."
                  onChange={(event) => setSearchInput(event.target.value)}
                  size="small"
                  value={searchInput}
                />
                <TextField
                  className="filter-select"
                  id="filter-status"
                  onChange={(event) => updateFilters({ status: event.target.value, page: 1 })}
                  select
                  size="small"
                  value={filters.status}
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
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="Low">Low</MenuItem>
                </TextField>
                <TextField
                  className="filter-select"
                  id="filter-sort"
                  onChange={(event) => updateFilters({ sort: event.target.value, page: 1 })}
                  select
                  size="small"
                  value={filters.sort}
                >
                  <MenuItem value="createdAt">Created Date</MenuItem>
                  <MenuItem value="dueDate">Due Date</MenuItem>
                  <MenuItem value="priority">Priority</MenuItem>
                </TextField>
                <Button id="search-btn" type="submit" variant="contained" size="small">
                  Search
                </Button>
              </Box>
            </Paper>

            {error && <Alert className="dashboard-alert" severity="error">{error}</Alert>}

            {/* Task Grid / Cards List */}
            {loading ? (
              <div className="tasks-grid">
                {[1, 2, 3, 4].map((item) => (
                  <Skeleton className="task-skeleton" key={item} variant="rounded" />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <Paper className="empty-state" elevation={0}>
                <div className="empty-state-icon">📋</div>
                <Typography component="h3" variant="h6" fontWeight={700}>No tasks found</Typography>
                <Typography color="text.secondary" variant="body2">
                  {filters.search || filters.status || filters.priority
                    ? "Try adjusting your search or filters."
                    : "Get started by creating your first task!"}
                </Typography>
                <Button onClick={handleOpenCreate} variant="contained" size="small" id="create-first-task-btn" sx={{ mt: 1 }}>
                  + Create Task
                </Button>
              </Paper>
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
              <Typography variant="subtitle2" fontWeight={700} gutterBottom className="card-heading">
                ✨ Create Task with AI
              </Typography>
              <Typography color="text.secondary" variant="caption" display="block" sx={{ mb: 1.5 }}>
                Describe a task in plain English (e.g. "Prepare deck by Friday, high priority").
              </Typography>
              <Box component="form" onSubmit={handleNaturalLanguageCreate} className="nl-form-compact">
                <TextField
                  fullWidth
                  id="nl-input"
                  multiline
                  rows={2}
                  placeholder="Task details & deadline..."
                  onChange={(e) => setNlText(e.target.value)}
                  size="small"
                  value={nlText}
                />
                <Button
                  disabled={parsingNl || !nlText.trim()}
                  fullWidth
                  id="nl-submit-btn"
                  size="small"
                  startIcon={parsingNl ? <CircularProgress size={14} /> : null}
                  type="submit"
                  variant="contained"
                  sx={{ mt: 1 }}
                >
                  {parsingNl ? "Parsing..." : "Parse & Create"}
                </Button>
              </Box>
            </Paper>

            {/* Widget 2: Upcoming Deadlines & Priority Focus */}
            <Paper className="sidebar-card" elevation={0}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom className="card-heading">
                📅 Upcoming Deadlines
              </Typography>
              {statistics.upcomingDeadlines?.length > 0 ? (
                <div className="deadline-list">
                  {statistics.upcomingDeadlines.map((task) => (
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
                  <Typography variant="caption" fontWeight={700} color="primary">{statistics.completionRate || 0}%</Typography>
                </div>
                <div className="completion-bar-track">
                  <div className="completion-bar-fill" style={{ width: `${statistics.completionRate || 0}%` }} />
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
        <DialogTitle>Delete task?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This action permanently removes "{taskToDelete?.title}". This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskToDelete(null)}>Cancel</Button>
          <Button color="error" onClick={handleDelete} variant="contained" id="confirm-delete-btn">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Dashboard;
