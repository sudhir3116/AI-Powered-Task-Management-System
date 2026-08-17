import asyncHandler from "../utils/asyncHandler.js";
import {
  getNotesService,
  getNoteByIdService,
  createNoteService,
  updateNoteService,
  deleteNoteService,
  toggleFavoriteNoteService,
  convertNoteToTasksService,
  executeNoteAiActionService,
  shareNoteService,
  duplicateNoteService,
} from "../services/note.service.js";

export const getNotes = asyncHandler(async (req, res) => {
  const { search, tag, favorite, view, sortBy, page, limit } = req.query;
  const result = await getNotesService(req.workspace._id, { search, tag, favorite, view, sortBy, page, limit });

  // Get total counts for each view type
  const Note = (await import("../models/note.model.js")).default;
  const [activeCount, archivedCount, trashCount, favoriteCount] = await Promise.all([
    Note.countDocuments({ workspace: req.workspace._id, isTrash: { $ne: true }, isArchived: { $ne: true } }),
    Note.countDocuments({ workspace: req.workspace._id, isArchived: true, isTrash: { $ne: true } }),
    Note.countDocuments({ workspace: req.workspace._id, isTrash: true }),
    Note.countDocuments({ workspace: req.workspace._id, isFavorite: true, isTrash: { $ne: true }, isArchived: { $ne: true } }),
  ]);

  res.status(200).json({
    success: true,
    data: result.notes,
    counts: {
      all: activeCount,
      recent: Math.min(activeCount, 6),
      favorites: favoriteCount,
      my_notes: activeCount,
      workspace_notes: activeCount,
      archived: archivedCount,
      trash: trashCount,
    },
    pagination: {
      total: result.total,
      page: result.page,
      pages: result.pages,
    },
  });
});

export const getNoteById = asyncHandler(async (req, res) => {
  const note = await getNoteByIdService(req.workspace._id, req.params.id);
  res.status(200).json({
    success: true,
    data: note,
  });
});

export const createNote = asyncHandler(async (req, res) => {
  const note = await createNoteService(req.workspace._id, req.user.id, req.body);
  res.status(201).json({
    success: true,
    message: "Note created successfully",
    data: note,
  });
});

export const updateNote = asyncHandler(async (req, res) => {
  const note = await updateNoteService(req.workspace._id, req.user.id, req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: "Note updated successfully",
    data: note,
  });
});

export const toggleFavoriteNote = asyncHandler(async (req, res) => {
  const result = await toggleFavoriteNoteService(req.workspace._id, req.params.id);
  res.status(200).json({
    success: true,
    message: result.isFavorite ? "Added to favorites" : "Removed from favorites",
    data: result,
  });
});

export const deleteNote = asyncHandler(async (req, res) => {
  await deleteNoteService(req.workspace._id, req.user.id, req.params.id);
  res.status(200).json({
    success: true,
    message: "Note deleted successfully",
  });
});

export const convertNoteToTasks = asyncHandler(async (req, res) => {
  const result = await convertNoteToTasksService(req.workspace._id, req.params.id);
  res.status(200).json({
    success: true,
    message: "Tasks proposed from note",
    data: result,
  });
});

export const executeNoteAiAction = asyncHandler(async (req, res) => {
  const { action } = req.body;
  if (!action) {
    return res.status(400).json({ success: false, message: "AI action name is required" });
  }

  const result = await executeNoteAiActionService(req.workspace._id, req.params.id, action);
  res.status(200).json({
    success: true,
    message: `AI action ${action} completed successfully`,
    data: result,
  });
});

export const shareNote = asyncHandler(async (req, res) => {
  const { collaboratorEmails } = req.body;
  const note = await shareNoteService(req.workspace._id, req.params.id, collaboratorEmails);
  res.status(200).json({
    success: true,
    message: "Note shared successfully",
    data: note,
  });
});

export const duplicateNote = asyncHandler(async (req, res) => {
  const note = await duplicateNoteService(req.workspace._id, req.user.id, req.params.id);
  res.status(201).json({
    success: true,
    message: "Note duplicated successfully",
    data: note,
  });
});
