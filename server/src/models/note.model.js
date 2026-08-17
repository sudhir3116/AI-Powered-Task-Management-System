import mongoose from "mongoose";

const blockSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ["paragraph", "heading1", "heading2", "heading3", "bullet", "number", "checklist", "code", "quote", "divider", "table", "image"],
      default: "paragraph",
    },
    content: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Note title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    icon: {
      type: String,
      default: "📄",
    },
    cover: {
      type: String,
      default: null,
    },
    content: {
      type: String,
      default: "",
    },
    contentBlocks: {
      type: [blockSchema],
      default: [],
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isFavorite: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    isTrash: {
      type: Boolean,
      default: false,
    },
    folder: {
      type: String,
      default: null,
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    relatedTasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    linkedTasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    aiMetadata: {
      summary: { type: String, default: null },
      explanation: { type: String, default: null },
      keyPoints: { type: [String], default: [] },
      quiz: { type: mongoose.Schema.Types.Mixed, default: null },
      studyChecklist: { type: [String], default: [] },
      lastProcessedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

noteSchema.index({ workspace: 1, isFavorite: -1, updatedAt: -1 });

const Note = mongoose.model("Note", noteSchema);

export default Note;
