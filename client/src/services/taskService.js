import api from "../api/axios";

// Get all tasks
export const getTasks = async (params = {}) => {
  const response = await api.get("/tasks", { params });
  return response.data;
};

// Create task
export const createTask = async (taskData) => {
  const response = await api.post("/tasks", taskData);
  return response.data;
};

// Update task
export const updateTask = async (id, taskData) => {
  const response = await api.put(`/tasks/${id}`, taskData);
  return response.data;
};

// Delete task
export const deleteTask = async (id) => {
  const response = await api.delete(`/tasks/${id}`);
  return response.data;
};

export const getTaskSummary = async ({ title, description }) => {
  const response = await api.post("/ai/summarize", { title, description });
  return response.data;
};

export const getDeadlineSuggestion = async ({ title, description }) => {
  const response = await api.post("/ai/deadline", { title, description });
  return response.data;
};
