import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
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
  Tooltip,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";

import Navbar from "../components/Navbar";
import TaskCard from "../components/TaskCard";
import TaskForm from "../components/TaskForm";
import {
  createTask,
  deleteTask,
  getDeadlineSuggestion,
  getProductivitySuggestions,
  getSubtaskBreakdown,
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

const PriorityBar = ({ label, count, total, color }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="priority-bar-row">
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 48 }}>{label}</Typography>
      <div className="priority-bar-track">
        <div className="priority-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28, textAlign: "right" }}>{count}</Typography>
    </div>
  );
};

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [searchInput, setSearchInput] = useState("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalTasks: 0 });
  const [statistics, setStatistics] = useState({
    total: 0, pending: 0, inProgress: 0, completed: 0,
    overdue: 0, completionRate: 0,
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
  const [aiSubtasksForForm, setAiSubtasksForForm] = useState([]);
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
    setAiSubtasksForForm([]);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    if (!submitting) {
      setIsFormOpen(false);
      setFormTask(null);
      setAiSubtasksForForm([]);
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
      setAiSubtasksForForm([]);
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
      const response = type === "summary"
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

  const handleAiSubtasks = async (task) => {
    setWorkingAction((current) => ({ ...current, [task._id]: "subtasks" }));
    try {
      const response = await getSubtaskBreakdown({ title: task.title, description: task.description });
      if (response.subtasks?.length > 0) {
        setFormTask(task);
        setAiSubtasksForForm(response.subtasks);
        setIsFormOpen(true);
        toast.success(`${response.subtasks.length} subtasks generated!`);
      } else {
        toast.error("Could not generate subtasks for this task.");
      }
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "AI subtask generation failed.");
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
        setAiSubtasksForForm([]);
        setIsFormOpen(true);
        setNlText("");
        toast.success("Task parsed from your description! ✨");
      }
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Could not parse task. Try being more specific.");
    } finally {
      setParsingNl(false);
    }
  };

  const statCards = [
    { label: "Total", value: statistics.total, color: "#4f46e5" },
    { label: "Pending", value: statistics.pending, color: "#d97706" },
    { label: "In Progress", value: statistics.inProgress, color: "#0ea5e9" },
    { label: "Completed", value: statistics.completed, color: "#059669" },
    { label: "Overdue", value: statistics.overdue, color: "#dc2626" },
    { label: "Done %", value: `${statistics.completionRate || 0}%`, color: "#7c3aed" },
  ];

  return (
    <div className="dashboard-page">
      <Navbar onCreateTask={handleOpenCreate} />
      <main className="dashboard-content">

        {/* Heading */}
        <section className="dashboard-heading">
          <div>
            <Typography component="h1" variant="h4">My Tasks</Typography>
            <Typography color="text.secondary" variant="body1">
              AI-powered task management — prioritize, track, and deliver.
            </Typography>
          </div>
          <Button onClick={handleOpenCreate} variant="contained" id="create-task-btn" size="large">
            + Create Task
          </Button>
        </section>

        {/* Stats */}
        <section className="stats-grid" aria-label="Task statistics">
          {statCards.map(({ label, value, color }) => (
            <Paper className="stat-card" elevation={0} key={label}>
              <Typography color="text.secondary" variant="caption">{label}</Typography>
              <Typography component="p" variant="h5" sx={{ color, fontWeight: 700 }}>{value}</Typography>
            </Paper>
          ))}
        </section>

        {/* Analytics row: Priority Distribution + Upcoming Deadlines */}
        <div className="analytics-grid">
          {/* Priority Distribution */}
          <Paper className="analytics-card" elevation={0}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Priority Distribution</Typography>
            <PriorityBar label="High" count={statistics.priorityDistribution?.High || 0} total={statistics.total} color="#dc2626" />
            <PriorityBar label="Medium" count={statistics.priorityDistribution?.Medium || 0} total={statistics.total} color="#d97706" />
            <PriorityBar label="Low" count={statistics.priorityDistribution?.Low || 0} total={statistics.total} color="#059669" />
          </Paper>

          {/* Upcoming Deadlines */}
          <Paper className="analytics-card" elevation={0}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Upcoming Deadlines (7 days)</Typography>
            {statistics.upcomingDeadlines?.length > 0 ? (
              <div className="deadline-list">
                {statistics.upcomingDeadlines.map((task) => (
                  <div key={task._id} className="deadline-item">
                    <Typography variant="body2" className="deadline-title">{task.title}</Typography>
                    <Typography variant="caption" color="warning.main">
                      {new Date(task.dueDate).toLocaleDateString()}
                    </Typography>
                  </div>
                ))}
              </div>
            ) : (
              <Typography color="text.secondary" variant="body2">No upcoming deadlines in the next 7 days.</Typography>
            )}
          </Paper>

          {/* AI Productivity Suggestions */}
          <Paper className="analytics-card" elevation={0}>
            <div className="analytics-card-header">
              <Typography variant="subtitle2" fontWeight={700}>AI Productivity Coach</Typography>
              <Button
                disabled={loadingProductivity}
                onClick={handleLoadProductivity}
                size="small"
                startIcon={loadingProductivity ? <CircularProgress size={12} /> : null}
                variant="outlined"
              >
                {productivitySuggestions.length > 0 ? "Refresh" : "Get Tips"}
              </Button>
            </div>
            {productivitySuggestions.length > 0 ? (
              <ul className="productivity-list">
                {productivitySuggestions.map((tip, i) => (
                  <li key={i}><Typography variant="body2">{tip}</Typography></li>
                ))}
              </ul>
            ) : (
              <Typography color="text.secondary" variant="body2">
                Click "Get Tips" for personalized AI productivity suggestions based on your task data.
              </Typography>
            )}
          </Paper>
        </div>

        {/* Natural Language Task Creation */}
        <Paper className="nl-create-panel" elevation={0}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            ✨ Create Task from Natural Language
          </Typography>
          <Typography color="text.secondary" variant="caption" display="block" sx={{ mb: 1.5 }}>
            Describe your task in plain English — AI will structure it for you.
          </Typography>
          <Box component="form" onSubmit={handleNaturalLanguageCreate} className="nl-form">
            <TextField
              fullWidth
              id="nl-input"
              label="e.g. Write a blog post about AI productivity by next Friday, high priority"
              onChange={(e) => setNlText(e.target.value)}
              size="small"
              value={nlText}
            />
            <Button
              disabled={parsingNl || !nlText.trim()}
              id="nl-submit-btn"
              startIcon={parsingNl ? <CircularProgress size={14} /> : null}
              type="submit"
              variant="contained"
              sx={{ whiteSpace: "nowrap" }}
            >
              {parsingNl ? "Parsing..." : "Parse & Create"}
            </Button>
          </Box>
        </Paper>

        {/* Filters */}
        <Paper className="filters-panel" elevation={0}>
          <Box className="filters-grid" component="form" onSubmit={handleSearchSubmit}>
            <TextField
              id="search-input"
              label="Search tasks"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Title or description"
              size="small"
              value={searchInput}
            />
            <TextField
              id="filter-status"
              label="Status"
              onChange={(event) => updateFilters({ status: event.target.value, page: 1 })}
              select
              size="small"
              value={filters.status}
            >
              <MenuItem value="">All statuses</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
            </TextField>
            <TextField
              id="filter-priority"
              label="Priority"
              onChange={(event) => updateFilters({ priority: event.target.value, page: 1 })}
              select
              size="small"
              value={filters.priority}
            >
              <MenuItem value="">All priorities</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
            </TextField>
            <TextField
              id="filter-sort"
              label="Sort by"
              onChange={(event) => updateFilters({ sort: event.target.value, page: 1 })}
              select
              size="small"
              value={filters.sort}
            >
              <MenuItem value="createdAt">Created date</MenuItem>
              <MenuItem value="dueDate">Due date</MenuItem>
              <MenuItem value="updatedAt">Last updated</MenuItem>
              <MenuItem value="title">Title</MenuItem>
              <MenuItem value="priority">Priority</MenuItem>
            </TextField>
            <TextField
              id="filter-order"
              label="Order"
              onChange={(event) => updateFilters({ order: event.target.value, page: 1 })}
              select
              size="small"
              value={filters.order}
            >
              <MenuItem value="desc">Descending</MenuItem>
              <MenuItem value="asc">Ascending</MenuItem>
            </TextField>
            <Button id="search-btn" type="submit" variant="outlined" size="small">Search</Button>
          </Box>
        </Paper>

        {error && <Alert className="dashboard-alert" severity="error">{error}</Alert>}

        {loading ? (
          <div className="tasks-grid">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <Skeleton className="task-skeleton" key={item} variant="rounded" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <Paper className="empty-state" elevation={0}>
            <div className="empty-state-icon">📋</div>
            <Typography component="h2" variant="h5">No tasks found</Typography>
            <Typography color="text.secondary" variant="body1">
              {filters.search || filters.status || filters.priority
                ? "Try adjusting your search or filters."
                : "Create your first task to get started!"}
            </Typography>
            <Button onClick={handleOpenCreate} variant="contained" size="large" id="create-first-task-btn">
              Create a task
            </Button>
          </Paper>
        ) : (
          <>
            <Typography className="task-count" color="text.secondary" variant="body2">
              {pagination.totalTasks} task{pagination.totalTasks === 1 ? "" : "s"} found
            </Typography>
            <div className="tasks-grid">
              {tasks.map((task) => (
                <TaskCard
                  deadline={insights[task._id]?.deadline}
                  key={task._id}
                  onDelete={setTaskToDelete}
                  onEdit={(selectedTask) => {
                    setFormTask(selectedTask);
                    setAiSubtasksForForm([]);
                    setIsFormOpen(true);
                  }}
                  onStatusChange={handleStatusChange}
                  onSummarize={handleAiInsight}
                  onSubtasks={handleAiSubtasks}
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
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Task Form Dialog */}
      <TaskForm
        aiSubtasks={aiSubtasksForForm}
        key={`${formTask?._id || "new"}-${aiSubtasksForForm.length}`}
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
