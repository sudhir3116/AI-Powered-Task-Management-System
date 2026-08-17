import api from "../api/axios";

export const getNotes = async (params = {}) => {
  const response = await api.get("/notes", { params });
  return response.data;
};

export const getNoteById = async (noteId) => {
  const response = await api.get(`/notes/${noteId}`);
  return response.data;
};

export const createNote = async (noteData) => {
  const response = await api.post("/notes", noteData);
  return response.data;
};

export const updateNote = async (noteId, noteData) => {
  const response = await api.patch(`/notes/${noteId}`, noteData);
  return response.data;
};

export const deleteNote = async (noteId) => {
  const response = await api.delete(`/notes/${noteId}`);
  return response.data;
};

export const toggleFavoriteNote = async (noteId) => {
  const response = await api.patch(`/notes/${noteId}/favorite`);
  return response.data;
};

export const convertNoteToTasks = async (noteId) => {
  const response = await api.post(`/notes/${noteId}/convert-to-tasks`);
  return response.data;
};

export const executeNoteAiAction = async (noteId, action) => {
  const response = await api.post(`/notes/${noteId}/ai-action`, { action });
  return response.data;
};

export const shareNote = async (noteId, collaboratorEmails) => {
  const response = await api.post(`/notes/${noteId}/share`, { collaboratorEmails });
  return response.data;
};

export const duplicateNote = async (noteId) => {
  const response = await api.post(`/notes/${noteId}/duplicate`);
  return response.data;
};
