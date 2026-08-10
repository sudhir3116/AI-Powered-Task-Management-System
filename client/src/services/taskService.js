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

// Get statistics (dedicated endpoint)
export const getStatistics = async () => {
  const response = await api.get("/tasks/statistics");
  return response.data;
};

// AI: Get task summary
export const getTaskSummary = async ({ title, description }) => {
  const response = await api.post("/ai/summarize", { title, description });
  return response.data;
};

// AI: Get deadline suggestion
export const getDeadlineSuggestion = async ({ title, description }) => {
  const response = await api.post("/ai/deadline", { title, description });
  return response.data;
};

// AI: Get subtask breakdown
export const getSubtaskBreakdown = async ({ title, description }) => {
  const response = await api.post("/ai/subtasks", { title, description });
  return response.data;
};

// AI: Get productivity suggestions
export const getProductivitySuggestions = async () => {
  const response = await api.post("/ai/productivity");
  return response.data;
};

// AI: Parse natural language into task
export const parseNaturalLanguage = async (text) => {
  const response = await api.post("/ai/natural-language", { text });
  return response.data;
};
