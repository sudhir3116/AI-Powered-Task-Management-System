import mongoose from "mongoose";

const subtaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    completed: { type: Boolean, default: false },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },

    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },

    dueDate: {
      type: Date,
      default: null,
    },

    // New fields — all optional, backward compatible
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: "Maximum 10 tags allowed",
      },
    },

    estimatedTime: {
      type: Number, // minutes
      default: null,
      min: [1, "Estimated time must be at least 1 minute"],
      max: [10080, "Estimated time cannot exceed 1 week (10080 minutes)"],
    },

    completedAt: {
      type: Date,
      default: null,
    },

    subtasks: {
      type: [subtaskSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 20,
        message: "Maximum 20 subtasks allowed",
      },
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
      default: null,
    },

    sourceNote: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
      index: true,
      default: null,
    },

    aiSummary: {
      type: String,
      default: null,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ user: 1, createdAt: -1 });
taskSchema.index({ user: 1, status: 1 });
taskSchema.index({ user: 1, dueDate: 1 });
taskSchema.index({ user: 1, priority: 1 });
taskSchema.index({ organization: 1, createdAt: -1 });
taskSchema.index({ organization: 1, status: 1 });

export default mongoose.model("Task", taskSchema);
