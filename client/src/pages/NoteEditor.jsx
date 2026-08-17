import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Avatar,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
  Box,
  Popover,
} from "@mui/material";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import NotesSidebar from "../components/notes/NotesSidebar";
import NotionBlockEditor from "../components/notes/NotionBlockEditor";
import NoteAiAssistantPanel from "../components/notes/NoteAiAssistantPanel";
import { useWorkspace } from "../context/WorkspaceContext";
import {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  toggleFavoriteNote,
  convertNoteToTasks,
  executeNoteAiAction,
  shareNote,
  duplicateNote,
} from "../services/noteService";
import { createTask } from "../services/taskService";

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const COVERS = [
  "linear-gradient(135deg, #f6d365 0%, #fda085 100%)", // Sunset Glow
  "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)", // Ocean Breeze
  "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)", // Sky Blue
  "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)", // Rose Quartz
  "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)", // Lavender Fields
  "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", // Deep Violet
  "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", // Dark Space
];

const EMOJIS = ["📄", "🧠", "💡", "📝", "💻", "🚀", "📚", "🏆", "📅", "🌟", "🔥", "🎨", "📈", "⚙️", "✅", "🔑"];

const NoteEditor = () => {
  const { id } = useParams();
  const noteId = id;
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspace();

  // Sidebar
  const [workspaceNotes, setWorkspaceNotes] = useState([]);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [sidebarTag, setSidebarTag] = useState("");
  const [sidebarCounts, setSidebarCounts] = useState(null);

  // Current note
  const [loading, setLoading] = useState(true);
  const [note, setNote]       = useState(null);
  const [title, setTitle]     = useState("");
  const [blocks, setBlocks]   = useState([]);
  const [tags, setTags]       = useState("");
  const [folder, setFolder]   = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [icon, setIcon]       = useState("📄");
  const [cover, setCover]     = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [saveStatus, setSaveStatus] = useState("saved"); // saving | saved | error
  const [lastSaved, setLastSaved]   = useState(null);

  // Popover state for emoji & cover select
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const [coverAnchor, setCoverAnchor] = useState(null);

  // Share Dialog state
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmails, setShareEmails] = useState("");
  const [sharing, setSharing] = useState(false);

  // Task conversion modal
  const [convertOpen, setConvertOpen]         = useState(false);
  const [loadingProposal, setLoadingProposal] = useState(false);
  const [proposal, setProposal]               = useState(null);
  const [confirmingTask, setConfirmingTask]   = useState(false);

  const titleRef = useRef(null);
  const saveTimer = useRef(null);
  const lastSavedContentRef = useRef(null);

  const workspaceId = activeWorkspace?._id || activeWorkspace?.id;

  /* ── Fetch sidebar note list ──────────────────────────── */
  const fetchSidebar = useCallback(async () => {
    try {
      const res = await getNotes({ search: sidebarSearch, tag: sidebarTag });
      setWorkspaceNotes(res.data || []);
      if (res.counts) {
        setSidebarCounts(res.counts);
      }
    } catch { /* silent */ }
  }, [sidebarSearch, sidebarTag, workspaceId]);

  useEffect(() => { void fetchSidebar(); }, [fetchSidebar]);

  /* ── Fetch single note ───────────────────────────────── */
  const fetchNote = useCallback(async () => {
    if (!noteId) return;
    setLoading(true);
    try {
      const res  = await getNoteById(noteId);
      const data = res.data;
      setNote(data);
      setTitle(data.title || "");
      setBlocks(data.contentBlocks?.length > 0 ? data.contentBlocks : []);
      setTags((data.tags || []).join(", "));
      setIsFavorite(Boolean(data.isFavorite));
      setFolder(data.folder || null);
      setIcon(data.icon || "📄");
      setCover(data.cover || null);
      setCollaborators(data.collaborators || []);
      setLastSaved(data.updatedAt ? new Date(data.updatedAt) : null);

      // Initialize content reference ref
      lastSavedContentRef.current = JSON.stringify({
        title: data.title || "",
        contentBlocks: data.contentBlocks?.length > 0 ? data.contentBlocks : [],
        tags: data.tags || [],
        isFavorite: Boolean(data.isFavorite),
        folder: data.folder || null,
        icon: data.icon || "📄",
        cover: data.cover || null,
      });
    } catch {
      toast.error("Failed to load document");
      navigate("/notes");
    } finally {
      setLoading(false);
    }
  }, [noteId, navigate, workspaceId]);

  useEffect(() => { void fetchNote(); }, [fetchNote]);

  /* ── Debounced auto-save ─────────────────────────────── */
  useEffect(() => {
    if (!note || loading) return;

    const currentPayload = {
      title: title.trim() || "Untitled Page",
      contentBlocks: blocks,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      isFavorite,
      folder,
      icon,
      cover,
    };

    const currentStr = JSON.stringify(currentPayload);
    if (currentStr === lastSavedContentRef.current) {
      setSaveStatus("saved");
      return;
    }

    setSaveStatus("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const updated = await updateNote(noteId, currentPayload);
        lastSavedContentRef.current = JSON.stringify({
          title: updated.data.title,
          contentBlocks: updated.data.contentBlocks,
          tags: updated.data.tags,
          isFavorite: updated.data.isFavorite,
          folder: updated.data.folder,
          icon: updated.data.icon,
          cover: updated.data.cover,
        });
        setNote(updated.data);
        setSaveStatus("saved");
        setLastSaved(new Date());
        void fetchSidebar();
      } catch {
        setSaveStatus("error");
      }
    }, 1000);
    return () => clearTimeout(saveTimer.current);
  }, [title, blocks, tags, folder, isFavorite, icon, cover, noteId, loading, fetchSidebar, note]);

  /* ── Handlers ────────────────────────────────────────── */
  const handleCreateNew = async () => {
    try {
      const res = await createNote({
        title: "Untitled Page",
        contentBlocks: [{ id: `block-${Date.now()}`, type: "paragraph", content: "", metadata: {} }],
        tags: [],
      });
      toast.success("New document created");
      navigate(`/notes/${res.data._id}`);
    } catch {
      toast.error("Failed to create note");
    }
  };

  const handleToggleFav = async (idToToggle) => {
    const target = idToToggle || noteId;
    try {
      const res = await toggleFavoriteNote(target);
      if (target === noteId) setIsFavorite(res.data.isFavorite);
      toast.success(res.data.isFavorite ? "Added to Favorites ⭐" : "Removed from Favorites");
      void fetchSidebar();
    } catch {
      toast.error("Failed to update favorite");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    try {
      await deleteNote(noteId);
      toast.success("Document deleted");
      navigate("/notes");
    } catch {
      toast.error("Failed to delete document");
    }
  };

  const handleAiAction = async (action) => {
    const res = await executeNoteAiAction(noteId, action);
    return res;
  };

  const handleInsertBlock = (type, content) => {
    const nb = {
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      type: type || "paragraph",
      content: content || "",
      metadata: type === "checklist" ? { checked: false } : {},
    };
    setBlocks((prev) => [...prev, nb]);
  };

  /* ── Share Modal Logic ───────────────────────────────── */
  const handleShare = async () => {
    if (!shareEmails.trim()) return;
    setSharing(true);
    try {
      const emails = shareEmails.split(",").map((e) => e.trim()).filter(Boolean);
      const res = await shareNote(noteId, emails);
      setCollaborators(res.data?.collaborators || []);
      toast.success("Document shared successfully!");
      setShareEmails("");
      setShareOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to share note");
    } finally {
      setSharing(false);
    }
  };

  /* ── Duplicate Action Logic ──────────────────────────── */
  const handleDuplicate = async () => {
    try {
      const res = await duplicateNote(noteId);
      toast.success("Document duplicated successfully!");
      navigate(`/notes/${res.data._id}`);
    } catch (err) {
      toast.error("Failed to duplicate document");
    }
  };

  /* ── AI Task Conversion ──────────────────────────────── */
  const handleOpenConvert = async () => {
    setConvertOpen(true);
    setLoadingProposal(true);
    setProposal(null);
    try {
      const res = await convertNoteToTasks(noteId);
      setProposal(res.data?.proposal || null);
    } catch {
      toast.error("Failed to generate task proposal");
      setConvertOpen(false);
    } finally {
      setLoadingProposal(false);
    }
  };

  const handleConfirmTask = async () => {
    if (!proposal) return;
    setConfirmingTask(true);
    try {
      const taskData = {
        title: proposal.title,
        description: `[From Note: "${title}"]\n\n${proposal.description}`,
        priority: proposal.priority || "Medium",
        status: "Pending",
        sourceNote: noteId,
        subtasks: (proposal.subtasks || []).map((s) => ({ title: s, completed: false })),
      };
      const created = await createTask(taskData);
      toast.success(`Task "${proposal.title}" created! 🚀`);
      if (created.data?._id) {
        await updateNote(noteId, {
          linkedTasks: [...(note?.linkedTasks || []).map((t) => t._id || t), created.data._id],
        });
        void fetchNote();
      }
      setConvertOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create task");
    } finally {
      setConfirmingTask(false);
    }
  };

  /* ── Save indicator ──────────────────────────────────── */
  const SaveIndicator = () => (
    <div className="editor-save-indicator">
      <div className={`editor-save-dot editor-save-dot--${saveStatus}`} />
      {saveStatus === "saving" && "Saving..."}
      {saveStatus === "saved" && lastSaved && `Saved ${timeAgo(lastSaved)}`}
      {saveStatus === "error" && "Save failed"}
    </div>
  );

  return (
    <div className="notes-workspace">
      <Navbar />

      <div className="editor-workspace">
        {/* ── Left Sidebar ─────────────────────────────── */}
        <NotesSidebar
          notes={workspaceNotes}
          activeNoteId={noteId}
          onSelectNote={(id) => navigate(`/notes/${id}`)}
          onCreateNote={handleCreateNew}
          onToggleFavorite={handleToggleFav}
          searchQuery={sidebarSearch}
          onSearchChange={setSidebarSearch}
          activeTag={sidebarTag}
          onTagSelect={setSidebarTag}
          activeView="all"
          onViewChange={() => navigate("/notes")}
          counts={sidebarCounts}
        />

        {/* ── Center: Editor Canvas ─────────────────────── */}
        <div className="editor-center">
          {/* Sticky top bar */}
          <div className="editor-topbar" style={{ position: "sticky", top: 0, zIndex: 10, width: "100%" }}>
            {/* Left group: back + breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Tooltip title="All Documents">
                <button
                  onClick={() => navigate("/notes")}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: "none", border: "1px solid #e8ecf0", borderRadius: 7,
                    padding: "4px 10px", fontSize: "0.78rem", fontWeight: 700,
                    color: "#475569", cursor: "pointer", fontFamily: "inherit",
                    transition: "background 0.12s, border-color 0.12s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.borderColor = "#c7d2fe"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.borderColor = "#e8ecf0"; }}
                >
                  ← Documents
                </button>
              </Tooltip>

              {activeWorkspace?.name && (
                <>
                  <span style={{ color: "#e2e8f0", fontSize: "0.8rem" }}>/</span>
                  <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {activeWorkspace.name}
                  </span>
                  <span style={{ color: "#e2e8f0", fontSize: "0.8rem" }}>/</span>
                  <span style={{ fontSize: "0.78rem", color: "#334155", fontWeight: 600, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {title || "Untitled Page"}
                  </span>
                </>
              )}
            </div>

            {/* Right group: save status + actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SaveIndicator />
              <Tooltip title={isFavorite ? "Remove from favorites" : "Add to favorites"}>
                <IconButton
                  size="small"
                  onClick={() => handleToggleFav()}
                  sx={{ opacity: isFavorite ? 1 : 0.4, fontSize: "0.95rem", p: 0.5, transition: "opacity 0.15s" }}
                >
                  ⭐
                </IconButton>
              </Tooltip>
              
              {/* Duplicate button */}
              <Tooltip title="Duplicate document">
                <button
                  onClick={handleDuplicate}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: "none", border: "1px solid #e8ecf0", borderRadius: 7,
                    padding: "4px 10px", fontSize: "0.78rem", fontWeight: 700,
                    color: "#475569", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  📄 Duplicate
                </button>
              </Tooltip>

              {/* Share button */}
              <Tooltip title="Share document">
                <button
                  onClick={() => setShareOpen(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: "none", border: "1px solid #e8ecf0", borderRadius: 7,
                    padding: "4px 10px", fontSize: "0.78rem", fontWeight: 700,
                    color: "#4f46e5", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  👥 Share
                </button>
              </Tooltip>

              <Tooltip title="Convert note to tasks">
                <button
                  onClick={handleOpenConvert}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 12px", borderRadius: 7, border: "none",
                    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    color: "#fff", fontWeight: 700, fontSize: "0.78rem",
                    cursor: "pointer", fontFamily: "inherit",
                    boxShadow: "0 2px 6px rgba(79,70,229,0.28)",
                  }}
                >
                  ⚡ Convert
                </button>
              </Tooltip>
              
              <Tooltip title="Delete document">
                <IconButton size="small" onClick={handleDelete} sx={{ color: "#dc2626", opacity: 0.5, "&:hover": { opacity: 1 }, p: 0.5 }}>
                  🗑
                </IconButton>
              </Tooltip>
            </div>
          </div>

          {/* Document Canvas */}
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", width: "100%" }}>
              <div style={{ textAlign: "center" }}>
                <CircularProgress sx={{ color: "#4f46e5" }} size={36} />
                <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: 12 }}>Opening document...</p>
              </div>
            </div>
          ) : (
            <div className="editor-canvas" style={{ padding: 0, position: "relative" }}>
              
              {/* Curated Cover Image Display */}
              <div
                style={{
                  height: cover ? 180 : 80,
                  background: cover || "transparent",
                  position: "relative",
                  borderRadius: "14px 14px 0 0",
                  transition: "all 0.25s ease",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "flex-end",
                  padding: 12,
                }}
                className="cover-banner-hover"
              >
                {/* Add/Change cover controls */}
                <Box sx={{ display: "flex", gap: 1, zIndex: 5 }}>
                  <button
                    onClick={(e) => setCoverAnchor(e.currentTarget)}
                    style={{
                      background: "rgba(255, 255, 255, 0.9)",
                      border: "1px solid #e2e8f0",
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "#1e293b",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    🎨 {cover ? "Change Cover" : "Add Cover"}
                  </button>
                  {cover && (
                    <button
                      onClick={() => setCover(null)}
                      style={{
                        background: "rgba(255, 255, 255, 0.9)",
                        border: "1px solid #e2e8f0",
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "#dc2626",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      ✕ Remove
                    </button>
                  )}
                </Box>
              </div>

              {/* Popover Gradient Selector */}
              <Popover
                open={Boolean(coverAnchor)}
                anchorEl={coverAnchor}
                onClose={() => setCoverAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { sx: { p: 1.5, borderRadius: 3, maxWidth: 260 } } }}
              >
                <Typography variant="caption" fontWeight={800} color="text.secondary" mb={1} display="block">
                  SELECT CURATED GRADIENT
                </Typography>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {COVERS.map((cov, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCover(cov);
                        setCoverAnchor(null);
                      }}
                      style={{
                        height: 40,
                        background: cov,
                        border: cover === cov ? "3px solid #4f46e5" : "1px solid #e2e8f0",
                        borderRadius: 8,
                        cursor: "pointer",
                        transition: "transform 0.1s",
                      }}
                      title="Curated cover preset"
                    />
                  ))}
                </div>
              </Popover>

              <div style={{ padding: "0 40px 40px" }}>
                {/* Emoji icon select trigger */}
                <div
                  onClick={(e) => setEmojiAnchor(e.currentTarget)}
                  style={{
                    fontSize: "3.2rem",
                    marginTop: "-30px",
                    width: "fit-content",
                    cursor: "pointer",
                    lineHeight: 1,
                    zIndex: 10,
                    position: "relative",
                    filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.08))",
                    userSelect: "none",
                    padding: "4px 8px",
                    borderRadius: 12,
                    background: "#ffffff",
                    border: "1px solid #f1f5f9",
                  }}
                  title="Click to select page icon"
                >
                  {icon}
                </div>

                {/* Popover Emoji Grid Selector */}
                <Popover
                  open={Boolean(emojiAnchor)}
                  anchorEl={emojiAnchor}
                  onClose={() => setEmojiAnchor(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                  transformOrigin={{ vertical: "top", horizontal: "left" }}
                  slotProps={{ paper: { sx: { p: 1.5, borderRadius: 3, maxWidth: 200 } } }}
                >
                  <Typography variant="caption" fontWeight={800} color="text.secondary" mb={1} display="block">
                    SELECT DOCUMENT ICON
                  </Typography>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    {EMOJIS.map((em) => (
                      <button
                        key={em}
                        onClick={() => {
                          setIcon(em);
                          setEmojiAnchor(null);
                        }}
                        style={{
                          fontSize: "1.5rem",
                          border: icon === em ? "2px solid #4f46e5" : "none",
                          background: icon === em ? "rgba(79,70,229,0.08)" : "none",
                          borderRadius: 8,
                          cursor: "pointer",
                          padding: 4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </Popover>

                {/* Title */}
                <textarea
                  ref={titleRef}
                  rows={1}
                  value={title}
                  placeholder="Untitled Page"
                  onChange={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                    setTitle(e.target.value);
                  }}
                  className="editor-title-input"
                  style={{ display: "block", lineHeight: 1.2, minHeight: "3.5rem", overflow: "hidden", marginTop: 12 }}
                />

                {/* Metadata bar */}
                <div className="editor-meta-bar" style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                  <div className="editor-meta-item">
                    <Avatar
                      src={note?.author?.avatar || undefined}
                      sx={{ width: 22, height: 22, fontSize: "0.6rem", bgcolor: "#4f46e5" }}
                    >
                      {note?.author?.name?.[0]?.toUpperCase() || "U"}
                    </Avatar>
                    <span style={{ fontWeight: 600, color: "#475569" }}>{note?.author?.name || "Author"}</span>
                  </div>

                  <div className="editor-meta-item">
                    <span style={{ fontSize: "0.72rem" }}>📅</span>
                    Created {new Date(note?.createdAt || Date.now()).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </div>

                  <div className="editor-meta-item">
                    <span style={{ fontSize: "0.72rem" }}>🕒</span>
                    Edited {timeAgo(note?.updatedAt)}
                  </div>

                  {/* Tags inline */}
                  <div className="editor-meta-item" style={{ minWidth: 160 }}>
                    <span style={{ fontSize: "0.72rem" }}>🏷️</span>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="Add tags (comma-separated)..."
                      style={{
                        border: "none", outline: "none", background: "transparent",
                        fontSize: "0.78rem", color: "#94a3b8", fontFamily: "inherit",
                        width: "100%",
                      }}
                    />
                  </div>

                  {/* Folder tag */}
                  <div className="editor-meta-item" style={{ minWidth: 160 }}>
                    <span style={{ fontSize: "0.72rem" }}>📁</span>
                    <input
                      type="text"
                      value={folder || ""}
                      onChange={(e) => setFolder(e.target.value || null)}
                      placeholder="Assign folder..."
                      style={{
                        border: "none", outline: "none", background: "transparent",
                        fontSize: "0.78rem", color: "#64748b", fontFamily: "inherit",
                        width: "100%",
                        fontWeight: 700,
                      }}
                    />
                  </div>

                  {/* Collaborators list */}
                  {collaborators.length > 0 && (
                    <div className="editor-meta-item" style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: 12 }}>
                      <span style={{ fontSize: "0.72rem" }}>👥</span>
                      <Box display="flex" gap={0.5} alignItems="center">
                        {collaborators.map((c) => (
                          <Tooltip key={c._id || c} title={c.name || c.email || "Collaborator"}>
                            <Avatar
                              src={c.avatar || undefined}
                              sx={{ width: 20, height: 20, fontSize: "0.6rem", bgcolor: "#10b981" }}
                            >
                              {(c.name?.[0] || c.email?.[0] || "C").toUpperCase()}
                            </Avatar>
                          </Tooltip>
                        ))}
                      </Box>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <Divider sx={{ mb: 3, mt: 2, borderColor: "#f1f5f9" }} />

                {/* Block editor */}
                <NotionBlockEditor
                  blocks={blocks}
                  onChange={setBlocks}
                  onOpenConvertModal={handleOpenConvert}
                />

                {/* Bottom padding click zone to focus last block */}
                <div style={{ height: 80 }} onClick={() => {
                  if (blocks.length > 0) {
                    const lastId = blocks[blocks.length - 1].id;
                    const el = document.getElementById(`input-${lastId}`);
                    if (el) el.focus();
                  }
                }} />
              </div>
            </div>
          )}
        </div>

        {/* ── Right: AI Panel ──────────────────────────── */}
        <NoteAiAssistantPanel
          note={note}
          onExecuteAiAction={handleAiAction}
          onInsertAiBlock={handleInsertBlock}
          onOpenConvertModal={handleOpenConvert}
        />
      </div>

      {/* ── Document Sharing Modal ──────────────────────── */}
      <Dialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5, boxShadow: "0 20px 48px rgba(15,23,42,0.16)" } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: "1.05rem", pb: 1 }}>
          👥 Share Document
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Enter the email addresses of team members you want to share this document with (separated by commas).
          </Typography>
          <TextField
            autoFocus
            fullWidth
            placeholder="coworker@company.com, editor@company.com"
            value={shareEmails}
            onChange={(e) => setShareEmails(e.target.value)}
            slotProps={{ input: { sx: { borderRadius: 2.5 } } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1.5, gap: 1 }}>
          <Button onClick={() => setShareOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            variant="contained"
            disabled={sharing || !shareEmails.trim()}
            sx={{ borderRadius: 2.5, fontWeight: 700, bgcolor: "#4f46e5", "&:hover": { bgcolor: "#4338ca" } }}
          >
            {sharing ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Share Page"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Task Conversion Dialog ──────────────────────── */}
      <Dialog
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3.5,
              boxShadow: "0 20px 48px rgba(15,23,42,0.16)",
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: "1.05rem", pb: 1 }}>
          <span style={{ marginRight: 8 }}>⚡</span>
          Convert Note to Task
        </DialogTitle>

        <DialogContent dividers>
          {loadingProposal ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <CircularProgress sx={{ color: "#4f46e5" }} />
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: 14 }}>
                AI is analyzing document content...
              </p>
            </div>
          ) : proposal ? (
            <div style={{ paddingTop: 8 }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.5px", marginBottom: 12 }}>
                PROPOSED TASK DETAILS
              </div>

              <TextField
                fullWidth
                label="Task Title"
                value={proposal.title}
                onChange={(e) => setProposal((p) => ({ ...p, title: e.target.value }))}
                sx={{ mb: 2 }}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={proposal.description}
                onChange={(e) => setProposal((p) => ({ ...p, description: e.target.value }))}
                sx={{ mb: 2 }}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />

              <TextField
                select
                fullWidth
                label="Priority"
                value={proposal.priority || "Medium"}
                onChange={(e) => setProposal((p) => ({ ...p, priority: e.target.value }))}
                sx={{ mb: 2 }}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              >
                <MenuItem value="High">🔥 High</MenuItem>
                <MenuItem value="Medium">⚡ Medium</MenuItem>
                <MenuItem value="Low">🟢 Low</MenuItem>
              </TextField>

              {proposal.subtasks?.length > 0 && (
                <>
                  <Typography variant="subtitle2" fontWeight={800} mb={1}>
                    Generated Subtasks ({proposal.subtasks.length})
                  </Typography>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                    {proposal.subtasks.map((sub, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex", gap: 8, padding: "7px 12px",
                          borderRadius: 8, background: "#f8fafc", border: "1px solid #e8ecf0",
                          fontSize: "0.83rem", color: "#334155",
                        }}
                      >
                        <span style={{ color: "#94a3b8" }}>☐</span>
                        {sub}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div style={{
                padding: "10px 14px", borderRadius: 9,
                background: "rgba(79,70,229,0.06)", border: "1px solid #c7d2fe",
              }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#4f46e5" }}>
                  🔗 This task will be linked to note "{title}"
                </span>
              </div>
            </div>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, pt: 1.5, gap: 1 }}>
          <Button onClick={() => setConvertOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmTask}
            variant="contained"
            disabled={confirmingTask || loadingProposal || !proposal}
            sx={{ borderRadius: 2, fontWeight: 700, px: 3, bgcolor: "#4f46e5", "&:hover": { bgcolor: "#4338ca" } }}
          >
            {confirmingTask ? "Creating Task..." : "Confirm & Create Task"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default NoteEditor;
