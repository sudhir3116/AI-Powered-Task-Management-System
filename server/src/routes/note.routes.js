import express from "express";
import { check, param } from "express-validator";
import validateRequest from "../middleware/validation.middleware.js";
import authMiddleware from "../middleware/auth.middleware.js";
import workspaceMiddleware from "../middleware/workspace.middleware.js";
import {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  toggleFavoriteNote,
  deleteNote,
  convertNoteToTasks,
  executeNoteAiAction,
  shareNote,
  duplicateNote,
} from "../controllers/note.controller.js";

const router = express.Router();

router.use(authMiddleware);
router.use(workspaceMiddleware);

router.get("/", getNotes);

router.post(
  "/",
  [
    check("title").optional().trim().isLength({ max: 200 }).withMessage("Title max length is 200"),
    check("content").optional().trim(),
  ],
  validateRequest,
  createNote
);

router.get("/:id", [param("id").isMongoId().withMessage("Invalid note id")], validateRequest, getNoteById);

router.patch("/:id", [param("id").isMongoId().withMessage("Invalid note id")], validateRequest, updateNote);

router.patch("/:id/favorite", [param("id").isMongoId().withMessage("Invalid note id")], validateRequest, toggleFavoriteNote);

router.delete("/:id", [param("id").isMongoId().withMessage("Invalid note id")], validateRequest, deleteNote);

router.post("/:id/convert-to-tasks", [param("id").isMongoId().withMessage("Invalid note id")], validateRequest, convertNoteToTasks);

router.post("/:id/ai-action", [param("id").isMongoId().withMessage("Invalid note id")], validateRequest, executeNoteAiAction);

router.post("/:id/share", [param("id").isMongoId().withMessage("Invalid note id")], validateRequest, shareNote);

router.post("/:id/duplicate", [param("id").isMongoId().withMessage("Invalid note id")], validateRequest, duplicateNote);

export default router;
