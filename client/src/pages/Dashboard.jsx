import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
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
import {
  createTask,
  deleteTask,
  getDeadlineSuggestion,
  getTaskSummary,
  getTasks,
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

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [searchInput, setSearchInput] = useState("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalTasks: 0 });
  const [statistics, setStatistics] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formTask, setFormTask] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [insights, setInsights] = useState({});
  const [workingAction, setWorkingAction] = useState({});

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
      setStatistics(response.statistics || { total: 0, pending: 0, inProgress: 0, completed: 0 });
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to load tasks.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    // The request updates state only after its asynchronous response resolves.
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
        toast.success("Task created with AI priority");
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
      setTasks((currentTasks) => currentTasks.map((currentTask) => (
        currentTask._id === task._id ? { ...currentTask, status } : currentTask
      )));
      toast.success("Task status updated");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update task status.");
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
      toast.success("Task deleted successfully");
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
      toast.error(requestError.response?.data?.message || "AI request failed. Please try again.");
    } finally {
      setWorkingAction((current) => ({ ...current, [task._id]: null }));
    }
  };

  return (
    <div className="dashboard-page">
      <Navbar onCreateTask={handleOpenCreate} />
      <main className="dashboard-content">
        <section className="dashboard-heading">
          <div>
            <Typography component="h1" variant="h4">My tasks</Typography>
            <Typography color="text.secondary" variant="body1">Track priorities, progress, and AI-assisted planning in one place.</Typography>
          </div>
          <Button onClick={handleOpenCreate} variant="contained">Create task</Button>
        </section>

        <section className="stats-grid" aria-label="Task statistics">
          {[
            ["Total tasks", statistics.total],
            ["Pending", statistics.pending],
            ["In progress", statistics.inProgress],
            ["Completed", statistics.completed],
          ].map(([label, value]) => (
            <Paper className="stat-card" elevation={0} key={label}>
              <Typography color="text.secondary" variant="body2">{label}</Typography>
              <Typography component="p" variant="h5">{value}</Typography>
            </Paper>
          ))}
        </section>

        <Paper className="filters-panel" elevation={0}>
          <Box className="filters-grid" component="form" onSubmit={handleSearchSubmit}>
            <TextField label="Search tasks" onChange={(event) => setSearchInput(event.target.value)} placeholder="Title or description" value={searchInput} />
            <TextField label="Status" onChange={(event) => updateFilters({ status: event.target.value, page: 1 })} select value={filters.status}>
              <MenuItem value="">All statuses</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
            </TextField>
            <TextField label="Priority" onChange={(event) => updateFilters({ priority: event.target.value, page: 1 })} select value={filters.priority}>
              <MenuItem value="">All priorities</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
            </TextField>
            <TextField label="Sort by" onChange={(event) => updateFilters({ sort: event.target.value, page: 1 })} select value={filters.sort}>
              <MenuItem value="createdAt">Created date</MenuItem>
              <MenuItem value="updatedAt">Last updated</MenuItem>
              <MenuItem value="title">Title</MenuItem>
              <MenuItem value="priority">Priority</MenuItem>
            </TextField>
            <TextField label="Order" onChange={(event) => updateFilters({ order: event.target.value, page: 1 })} select value={filters.order}>
              <MenuItem value="desc">Descending</MenuItem>
              <MenuItem value="asc">Ascending</MenuItem>
            </TextField>
            <Button type="submit" variant="outlined">Search</Button>
          </Box>
        </Paper>

        {error && <Alert className="dashboard-alert" severity="error">{error}</Alert>}

        {loading ? (
          <div className="tasks-grid">
            {[1, 2, 3, 4, 5, 6].map((item) => <Skeleton className="task-skeleton" height={260} key={item} variant="rounded" />)}
          </div>
        ) : tasks.length === 0 ? (
          <Paper className="empty-state" elevation={0}>
            <Typography component="h2" variant="h5">No tasks found</Typography>
            <Typography color="text.secondary" variant="body1">Create a task or adjust your search and filters.</Typography>
            <Button onClick={handleOpenCreate} variant="contained">Create your first task</Button>
          </Paper>
        ) : (
          <>
            <Typography className="task-count" color="text.secondary" variant="body2">{pagination.totalTasks} task{pagination.totalTasks === 1 ? "" : "s"} found</Typography>
            <div className="tasks-grid">
              {tasks.map((task) => (
                <TaskCard
                  deadline={insights[task._id]?.deadline}
                  key={task._id}
                  onDelete={setTaskToDelete}
                  onEdit={(selectedTask) => { setFormTask(selectedTask); setIsFormOpen(true); }}
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
                <Pagination count={pagination.totalPages} onChange={(_, page) => updateFilters({ page })} page={pagination.page} shape="rounded" />
              </div>
            )}
          </>
        )}
      </main>

      <TaskForm
        key={formTask?._id || "new"}
        onClose={handleCloseForm}
        onSubmit={handleSubmitTask}
        open={isFormOpen}
        submitting={submitting}
        task={formTask}
      />

      <Dialog onClose={() => setTaskToDelete(null)} open={Boolean(taskToDelete)}>
        <DialogTitle>Delete task?</DialogTitle>
        <DialogContent>
          <DialogContentText>This action permanently removes “{taskToDelete?.title}”.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskToDelete(null)}>Cancel</Button>
          <Button color="error" onClick={handleDelete} variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Dashboard;
