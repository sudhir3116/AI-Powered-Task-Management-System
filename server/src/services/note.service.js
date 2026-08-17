import Note from "../models/note.model.js";
import Task from "../models/task.model.js";
import {
  generateTasksFromNote,
  generateNoteSummary,
  explainNoteContent,
  generateNoteKeyPoints,
  generateNoteQuiz,
  generateNoteStudyChecklist,
} from "./ai.service.js";

const blocksToText = (blocks) => {
  if (!Array.isArray(blocks) || blocks.length === 0) return "";
  return blocks
    .map((b) => {
      if (b.type === "heading1") return `# ${b.content}`;
      if (b.type === "heading2") return `## ${b.content}`;
      if (b.type === "heading3") return `### ${b.content}`;
      if (b.type === "bullet") return `• ${b.content}`;
      if (b.type === "number") return `1. ${b.content}`;
      if (b.type === "checklist") return `[${b.metadata?.checked ? "x" : " "}] ${b.content}`;
      if (b.type === "code") return `\`\`\`${b.metadata?.language || ""}\n${b.content}\n\`\`\``;
      if (b.type === "quote") return `> ${b.content}`;
      if (b.type === "divider") return `---`;
      if (b.type === "image") return `![${b.metadata?.caption || "image"}](${b.content})`;
      if (b.type === "table") {
        const rows = b.metadata?.rows || [];
        return rows.map((r) => r.join(" | ")).join("\n");
      }
      return b.content || "";
    })
    .join("\n\n");
};

export const getNotesService = async (workspaceId, { search, tag, favorite, view, sortBy, page = 1, limit = 50 }) => {
  const query = { workspace: workspaceId };

  // Handle Trash / Archive views
  if (view === "trash") {
    query.isTrash = true;
  } else if (view === "archived") {
    query.isArchived = true;
    query.isTrash = { $ne: true };
  } else {
    query.isTrash = { $ne: true };
    query.isArchived = { $ne: true };
  }

  if (favorite === "true" || favorite === true || view === "favorites") {
    query.isFavorite = true;
  }

  if (search && search.trim()) {
    const reg = new RegExp(search.trim(), "i");
    query.$or = [
      { title: reg },
      { content: reg },
      { "contentBlocks.content": reg },
      { tags: reg },
    ];
  }

  if (tag && tag.trim()) {
    query.tags = tag.trim();
  }

  // Handle sorting
  let sortOption = { isFavorite: -1, updatedAt: -1 };
  if (sortBy === "created") {
    sortOption = { createdAt: -1 };
  } else if (sortBy === "alphabetical") {
    sortOption = { title: 1 };
  } else if (sortBy === "updated") {
    sortOption = { updatedAt: -1 };
  } else if (sortBy === "favorites") {
    sortOption = { isFavorite: -1, updatedAt: -1 };
  }

  const skip = (page - 1) * limit;

  const [notes, total] = await Promise.all([
    Note.find(query)
      .populate("author", "name email avatar")
      .populate("collaborators", "name email avatar")
      .populate("linkedTasks", "title status priority dueDate")
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit)),
    Note.countDocuments(query),
  ]);

  return {
    notes,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit) || 1,
  };
};

export const getNoteByIdService = async (workspaceId, noteId) => {
  const note = await Note.findOne({ _id: noteId, workspace: workspaceId })
    .populate("author", "name email avatar")
    .populate("collaborators", "name email avatar")
    .populate("relatedTasks", "title status priority dueDate")
    .populate("linkedTasks", "title status priority dueDate");

  if (!note) {
    const error = new Error("Note not found in this workspace.");
    error.statusCode = 404;
    throw error;
  }

  return note;
};

export const createNoteService = async (workspaceId, userId, noteData) => {
  const { title, content, contentBlocks, tags, isFavorite, icon, cover, collaborators } = noteData;

  const finalTitle = title && title.trim() ? title.trim() : "Untitled Note";

  let finalContent = content ? content.trim() : "";
  let finalBlocks = Array.isArray(contentBlocks) ? contentBlocks : [];

  if (finalBlocks.length > 0 && !finalContent) {
    finalContent = blocksToText(finalBlocks);
  } else if (finalBlocks.length === 0 && finalContent) {
    finalBlocks = [
      {
        id: "block-1",
        type: "paragraph",
        content: finalContent,
        metadata: {},
      },
    ];
  } else if (finalBlocks.length === 0 && !finalContent) {
    finalBlocks = [
      {
        id: "block-1",
        type: "paragraph",
        content: "",
        metadata: {},
      },
    ];
  }

  const note = await Note.create({
    title: finalTitle,
    content: finalContent,
    contentBlocks: finalBlocks,
    tags: Array.isArray(tags) ? tags.map((t) => t.trim()).filter(Boolean) : [],
    isFavorite: Boolean(isFavorite),
    icon: icon || "📄",
    cover: cover || null,
    collaborators: Array.isArray(collaborators) ? collaborators : [],
    workspace: workspaceId,
    author: userId,
  });

  return await Note.findById(note._id)
    .populate("author", "name email avatar")
    .populate("collaborators", "name email avatar")
    .populate("linkedTasks", "title status priority");
};

export const updateNoteService = async (workspaceId, userId, noteId, noteData) => {
  const note = await Note.findOne({ _id: noteId, workspace: workspaceId });

  if (!note) {
    const error = new Error("Note not found.");
    error.statusCode = 404;
    throw error;
  }

  if (noteData.title !== undefined) note.title = noteData.title.trim() || "Untitled Note";

  if (noteData.contentBlocks !== undefined && Array.isArray(noteData.contentBlocks)) {
    note.contentBlocks = noteData.contentBlocks;
    note.content = blocksToText(noteData.contentBlocks);
  } else if (noteData.content !== undefined) {
    note.content = noteData.content.trim();
  }

  if (noteData.tags !== undefined && Array.isArray(noteData.tags)) {
    note.tags = noteData.tags.map((t) => t.trim()).filter(Boolean);
  }

  if (noteData.isFavorite !== undefined) {
    note.isFavorite = Boolean(noteData.isFavorite);
  }

  if (noteData.isArchived !== undefined) {
    note.isArchived = Boolean(noteData.isArchived);
  }

  if (noteData.isTrash !== undefined) {
    note.isTrash = Boolean(noteData.isTrash);
  }

  if (noteData.folder !== undefined) {
    note.folder = noteData.folder;
  }

  if (noteData.icon !== undefined) {
    note.icon = noteData.icon;
  }

  if (noteData.cover !== undefined) {
    note.cover = noteData.cover;
  }

  if (noteData.collaborators !== undefined && Array.isArray(noteData.collaborators)) {
    note.collaborators = noteData.collaborators;
  }

  if (noteData.aiMetadata !== undefined) {
    note.aiMetadata = { ...note.aiMetadata, ...noteData.aiMetadata };
  }

  await note.save();

  return await Note.findById(note._id)
    .populate("author", "name email avatar")
    .populate("collaborators", "name email avatar")
    .populate("linkedTasks", "title status priority dueDate");
};

export const shareNoteService = async (workspaceId, noteId, collaboratorEmails) => {
  const note = await Note.findOne({ _id: noteId, workspace: workspaceId });
  if (!note) {
    const error = new Error("Note not found.");
    error.statusCode = 404;
    throw error;
  }

  if (!Array.isArray(collaboratorEmails)) {
    const error = new Error("Collaborator emails must be an array.");
    error.statusCode = 400;
    throw error;
  }

  const User = (await import("../models/user.model.js")).default;
  const users = await User.find({ email: { $in: collaboratorEmails.map((e) => e.trim().toLowerCase()) } });

  const userIds = users.map((u) => u._id);
  note.collaborators = Array.from(new Set([...note.collaborators.map((id) => id.toString()), ...userIds.map((id) => id.toString())]));
  await note.save();

  return await Note.findById(note._id)
    .populate("author", "name email avatar")
    .populate("collaborators", "name email avatar");
};

export const duplicateNoteService = async (workspaceId, userId, noteId) => {
  const original = await Note.findOne({ _id: noteId, workspace: workspaceId });
  if (!original) {
    const error = new Error("Note not found.");
    error.statusCode = 404;
    throw error;
  }

  // Clone blocks with new independent block IDs
  const clonedBlocks = (original.contentBlocks || []).map((b) => {
    const obj = b.toObject ? b.toObject() : b;
    return {
      ...obj,
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
  });

  const cloned = await Note.create({
    title: `${original.title} — Copy`,
    icon: original.icon || "📄",
    cover: original.cover || null,
    content: original.content,
    contentBlocks: clonedBlocks,
    tags: original.tags || [],
    workspace: workspaceId,
    author: userId,
  });

  return await Note.findById(cloned._id)
    .populate("author", "name email avatar")
    .populate("collaborators", "name email avatar");
};

export const toggleFavoriteNoteService = async (workspaceId, noteId) => {
  const note = await Note.findOne({ _id: noteId, workspace: workspaceId });

  if (!note) {
    const error = new Error("Note not found.");
    error.statusCode = 404;
    throw error;
  }

  note.isFavorite = !note.isFavorite;
  await note.save();

  return { id: note._id, isFavorite: note.isFavorite };
};

export const deleteNoteService = async (workspaceId, userId, noteId) => {
  const note = await Note.findOne({ _id: noteId, workspace: workspaceId });

  if (!note) {
    const error = new Error("Note not found.");
    error.statusCode = 404;
    throw error;
  }

  if (!note.isTrash) {
    // Soft delete: Move to Trash
    note.isTrash = true;
    await note.save();
    return { success: true, trashed: true };
  } else {
    // Hard delete: Permanent Delete from database
    await Note.deleteOne({ _id: noteId, workspace: workspaceId });
    return { success: true, deleted: true };
  }
};

export const convertNoteToTasksService = async (workspaceId, noteId) => {
  const note = await Note.findOne({ _id: noteId, workspace: workspaceId });

  if (!note) {
    const error = new Error("Note not found.");
    error.statusCode = 404;
    throw error;
  }

  const textToAnalyze = `${note.title}\n\n${note.content || blocksToText(note.contentBlocks)}`;
  const proposal = await generateTasksFromNote(note.title, textToAnalyze);

  return {
    sourceNoteId: note._id,
    sourceNoteTitle: note.title,
    proposal,
  };
};

export const executeNoteAiActionService = async (workspaceId, noteId, action) => {
  const note = await Note.findOne({ _id: noteId, workspace: workspaceId });

  if (!note) {
    const error = new Error("Note not found.");
    error.statusCode = 404;
    throw error;
  }

  const fullText = `${note.title}\n\n${note.content || blocksToText(note.contentBlocks)}`;

  let resultData = null;
  const aiMeta = note.aiMetadata || {};

  switch (action) {
    case "summarize":
      resultData = await generateNoteSummary(note.title, fullText);
      aiMeta.summary = resultData;
      break;

    case "explain":
      resultData = await explainNoteContent(note.title, fullText);
      aiMeta.explanation = resultData;
      break;

    case "key-points":
      resultData = await generateNoteKeyPoints(note.title, fullText);
      aiMeta.keyPoints = resultData;
      break;

    case "quiz":
      resultData = await generateNoteQuiz(note.title, fullText);
      aiMeta.quiz = resultData;
      break;

    case "study-checklist":
      resultData = await generateNoteStudyChecklist(note.title, fullText);
      aiMeta.studyChecklist = resultData;
      break;

    default: {
      const err = new Error(`Unsupported AI action: ${action}`);
      err.statusCode = 400;
      throw err;
    }
  }

  aiMeta.lastProcessedAt = new Date();
  note.aiMetadata = aiMeta;
  await note.save();

  return {
    action,
    result: resultData,
    aiMetadata: note.aiMetadata,
  };
};
