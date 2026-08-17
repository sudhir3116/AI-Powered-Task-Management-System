import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, CircularProgress, IconButton, InputAdornment, TextField, Tooltip, Box, MenuItem } from "@mui/material";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import NotesSidebar from "../components/notes/NotesSidebar";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";
import { getNotes, createNote, deleteNote, toggleFavoriteNote, updateNote } from "../services/noteService";

/* ── Helpers ──────────────────────────────────────────── */
const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

/* ── Notes home page ─────────────────────────────────── */
const Notes = () => {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [activeView, setActiveView] = useState("all");
  const [sortBy, setSortBy] = useState("favorites");
  const [counts, setCounts] = useState({ all: 0, recent: 0, favorites: 0, my_notes: 0, workspace_notes: 0, archived: 0, trash: 0 });
  const [creatingNote, setCreatingNote] = useState(false);

  const workspaceId = activeWorkspace?._id || activeWorkspace?.id;

  /* ── Fetch ───────────────────────────────────────────── */
  const fetchNotes = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await getNotes({ search: searchQuery, tag: activeTag, view: activeView, sortBy });
      setNotes(res.data || []);
      if (res.counts) {
        setCounts(res.counts);
      }
    } catch {
      toast.error("Failed to load workspace notes");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeTag, activeView, sortBy, workspaceId]);

  useEffect(() => { void fetchNotes(); }, [fetchNotes]);

  /* ── Handlers ────────────────────────────────────────── */
  const handleCreate = async () => {
    setCreatingNote(true);
    try {
      const res = await createNote({
        title: "Untitled Page",
        contentBlocks: [{ id: `block-${Date.now()}`, type: "paragraph", content: "", metadata: {} }],
        tags: [],
      });
      toast.success("Document created");
      navigate(`/notes/${res.data._id}`);
    } catch {
      toast.error("Failed to create document");
    } finally {
      setCreatingNote(false);
    }
  };

  const handleToggleFavorite = async (e, noteId) => {
    e?.stopPropagation();
    try {
      const res = await toggleFavoriteNote(noteId);
      setNotes((prev) => prev.map((n) => n._id === noteId ? { ...n, isFavorite: res.data.isFavorite } : n));
      toast.success(res.data.isFavorite ? "Added to Favorites ⭐" : "Removed from Favorites");
      void fetchNotes();
    } catch {
      toast.error("Failed to update favorite");
    }
  };

  const handleRestore = async (e, noteId, fromField = "isTrash") => {
    e?.stopPropagation();
    try {
      const payload = fromField === "isTrash" ? { isTrash: false } : { isArchived: false };
      await updateNote(noteId, payload);
      toast.success(fromField === "isTrash" ? "Document restored from Trash ↩" : "Document restored from Archive ↩");
      void fetchNotes();
    } catch {
      toast.error("Failed to restore document");
    }
  };

  const handleDelete = async (e, noteId) => {
    e?.stopPropagation();
    const isPermanent = activeView === "trash";
    const confirmMessage = isPermanent
      ? "Are you sure you want to permanently delete this document? This cannot be undone."
      : "Move this document to Trash?";
    
    if (!window.confirm(confirmMessage)) return;

    try {
      await deleteNote(noteId);
      toast.success(isPermanent ? "Document permanently deleted" : "Document moved to Trash 🗑️");
      void fetchNotes();
    } catch {
      toast.error("Failed to delete document");
    }
  };

  /* ── Client-side view filtering ─────────────────────── */
  const userId = user?.id || user?._id;
  let displayedNotes = [...notes];
  if (activeView === "favorites") {
    displayedNotes = displayedNotes.filter((n) => n.isFavorite);
  } else if (activeView === "my_notes") {
    displayedNotes = displayedNotes.filter((n) => {
      const authorId = n.author?._id || n.author;
      return authorId && userId && authorId.toString() === userId.toString();
    });
  } else if (activeView === "recent") {
    displayedNotes = [...displayedNotes].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 12);
  }

  // Quick search filter applied on top of view filter
  const finalNotes = searchQuery
    ? displayedNotes.filter((n) =>
        (n.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.content || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : displayedNotes;

  const viewLabel = {
    all: "All Documents",
    recent: "Recent Documents",
    favorites: "Favorites",
    my_notes: "My Notes",
    workspace_notes: "Workspace Notes",
  }[activeView] || "Documents";

  /* ── Stats ───────────────────────────────────────────── */
  const stats = {
    total: notes.length,
    favorites: notes.filter((n) => n.isFavorite).length,
    mine: notes.filter((n) => {
      const authorId = n.author?._id || n.author;
      return authorId && userId && authorId.toString() === userId.toString();
    }).length,
  };

  return (
    <div className="notes-workspace">
      <Navbar />

      <div className="notes-body">
        {/* ── Left Sidebar ───────────────────────────────── */}
        <NotesSidebar
          notes={notes}
          activeNoteId={null}
          onSelectNote={(id) => navigate(`/notes/${id}`)}
          onCreateNote={handleCreate}
          onToggleFavorite={(id) => handleToggleFavorite(null, id)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeTag={activeTag}
          onTagSelect={setActiveTag}
          activeView={activeView}
          onViewChange={setActiveView}
          counts={counts}
        />

        {/* ── Main content ───────────────────────────────── */}
        <div className="notes-main">
          {/* Hero Header */}
          <div className="kb-hero">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: "1.75rem" }}>🧠</span>
                  <h1 className="kb-hero__title" style={{ margin: 0 }}>Knowledge Workspace</h1>
                </div>
                <p className="kb-hero__subtitle" style={{ margin: 0 }}>
                  Capture ideas, learning materials, and documentation — then turn knowledge into actionable tasks.
                </p>
              </div>

              {/* Quick stats */}
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {[
                  { label: "Total", value: counts.all, color: "#4f46e5" },
                  { label: "Favorites", value: counts.favorites, color: "#f59e0b" },
                  { label: "Archived", value: counts.archived, color: "#0284c7" },
                  { label: "Trash", value: counts.trash, color: "#dc2626" },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      textAlign: "center", padding: "8px 16px", borderRadius: 10,
                      background: "#ffffff", border: "1px solid #e8ecf0",
                      boxShadow: "0 1px 4px rgba(15,23,42,0.05)",
                    }}
                  >
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action bar */}
            <div className="kb-hero__actions">
              <TextField
                size="small"
                placeholder="Search all documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>🔍</span>
                      </InputAdornment>
                    ),
                    sx: { fontSize: "0.85rem", bgcolor: "#ffffff", borderRadius: "10px", minWidth: 240, "& fieldset": { borderColor: "#e8ecf0" } },
                  },
                }}
              />
              <TextField
                select
                size="small"
                label="Sort By"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                sx={{
                  bgcolor: "#ffffff",
                  borderRadius: "10px",
                  minWidth: 160,
                  "& fieldset": { borderColor: "#e8ecf0" },
                  "& .MuiSelect-select": { fontSize: "0.8rem", py: "8.5px", fontWeight: 700, color: "#64748b" }
                }}
              >
                <MenuItem value="favorites" sx={{ fontSize: "0.78rem", fontWeight: 600 }}>⭐ Favorites First</MenuItem>
                <MenuItem value="updated" sx={{ fontSize: "0.78rem", fontWeight: 600 }}>🕒 Recently Updated</MenuItem>
                <MenuItem value="created" sx={{ fontSize: "0.78rem", fontWeight: 600 }}>📅 Recently Created</MenuItem>
                <MenuItem value="alphabetical" sx={{ fontSize: "0.78rem", fontWeight: 600 }}>🔤 Alphabetical</MenuItem>
              </TextField>
              <button
                onClick={handleCreate}
                disabled={creatingNote}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 18px", borderRadius: 9, border: "none",
                  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                  color: "#ffffff", fontWeight: 700, fontSize: "0.88rem",
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: "0 2px 10px rgba(79,70,229,0.3)",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(79,70,229,0.4)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 10px rgba(79,70,229,0.3)"; }}
              >
                {creatingNote ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : "✦"}
                {creatingNote ? "Creating..." : "New Document"}
              </button>
            </div>
          </div>

          {/* Section filter tabs bar */}
          <div className="kb-filter-bar" style={{ marginTop: 20 }}>
            {[
              { id: "all", label: "All Documents", icon: "📚" },
              { id: "recent", label: "Recent", icon: "🕒" },
              { id: "favorites", label: "Favorites", icon: "⭐" },
              { id: "my_notes", label: "My Notes", icon: "👤" },
              { id: "workspace_notes", label: "Workspace Notes", icon: "🏢" },
              { id: "archived", label: "Archived", icon: "📥" },
              { id: "trash", label: "Trash", icon: "🗑️" },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setActiveView(v.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  border: "1px solid",
                  borderColor: activeView === v.id ? "#4f46e5" : "#e2e8f0",
                  background: activeView === v.id ? "rgba(79, 70, 229, 0.06)" : "#ffffff",
                  color: activeView === v.id ? "#4f46e5" : "#64748b",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                <span>{v.icon}</span>
                <span>{v.label}</span>
              </button>
            ))}
          </div>

          {/* Section label */}
          <div style={{ padding: "16px 28px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.5px", textTransform: "uppercase" }}>
              {viewLabel} · {finalNotes.length} document{finalNotes.length !== 1 ? "s" : ""}
            </div>
            {activeTag && (
              <button
                onClick={() => setActiveTag("")}
                style={{ background: "rgba(79,70,229,0.08)", border: "1px solid #c7d2fe", borderRadius: 6, padding: "2px 10px", fontSize: "0.72rem", fontWeight: 700, color: "#4f46e5", cursor: "pointer", fontFamily: "inherit" }}
              >
                #{activeTag} ✕
              </button>
            )}
          </div>

          {/* Document Grid */}
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
              <div style={{ textAlign: "center" }}>
                <CircularProgress sx={{ color: "#4f46e5" }} />
                <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: 12 }}>Loading workspace...</p>
              </div>
            </div>
          ) : finalNotes.length === 0 ? (
            <div className="notes-empty">
              <div className="notes-empty__icon">
                {activeView === "favorites" ? "⭐" : searchQuery ? "🔍" : "📝"}
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b" }}>
                {searchQuery ? `No results for "${searchQuery}"` : activeView === "favorites" ? "No favorites yet" : "No documents yet"}
              </div>
              <p style={{ fontSize: "0.88rem", color: "#64748b", margin: 0, maxWidth: 360, lineHeight: 1.6 }}>
                {searchQuery
                  ? "Try a different search term or browse all documents."
                  : activeView === "favorites"
                  ? "Star any document to pin it to your favorites for quick access."
                  : "Create your first knowledge document and start building your workspace."}
              </p>
              {!searchQuery && activeView === "all" && (
                <button
                  onClick={handleCreate}
                  style={{
                    padding: "10px 22px", borderRadius: 9, border: "none",
                    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    color: "#ffffff", fontWeight: 700, fontSize: "0.9rem",
                    cursor: "pointer", fontFamily: "inherit",
                    boxShadow: "0 2px 10px rgba(79,70,229,0.3)",
                  }}
                >
                  ✦ Create First Document
                </button>
              )}
            </div>
          ) : (
            <div className="doc-grid" style={{ padding: "16px 28px 40px" }}>
              {finalNotes.map((note) => (
                <div
                  key={note._id}
                  className="doc-card"
                  onClick={() => navigate(`/notes/${note._id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && navigate(`/notes/${note._id}`)}
                >
                  <div>
                    {/* Visual Cover Banner preset */}
                    <div
                      style={{
                        height: 70,
                        background: note.cover || "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
                        width: "100%",
                        borderRadius: "10px 10px 0 0",
                        marginTop: "-20px",
                        marginLeft: "-20px",
                        marginRight: "-20px",
                        marginBottom: "16px",
                      }}
                    />

                    {/* Header info */}
                    <div className="doc-card__header">
                      <span className="doc-card__icon" style={{ userSelect: "none" }}>
                        {note.icon || "📄"}
                      </span>
                      <div className="doc-card__title">
                        {note.title || "Untitled Page"}
                      </div>
                      <div style={{ display: "flex", gap: 2, flexShrink: 0, marginTop: -4 }}>
                        {activeView === "trash" ? (
                          <>
                            <Tooltip title="Restore document">
                              <IconButton
                                size="small"
                                onClick={(e) => handleRestore(e, note._id, "isTrash")}
                                sx={{ p: 0.3, color: "success.main" }}
                              >
                                <span style={{ fontSize: "0.85rem" }}>↩</span>
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete permanently">
                              <IconButton
                                size="small"
                                onClick={(e) => handleDelete(e, note._id)}
                                sx={{ p: 0.3, color: "error.main" }}
                              >
                                <span style={{ fontSize: "0.85rem" }}>🗑</span>
                              </IconButton>
                            </Tooltip>
                          </>
                        ) : activeView === "archived" ? (
                          <>
                            <Tooltip title="Restore from Archive">
                              <IconButton
                                size="small"
                                onClick={(e) => handleRestore(e, note._id, "isArchived")}
                                sx={{ p: 0.3, color: "info.main" }}
                              >
                                <span style={{ fontSize: "0.85rem" }}>📥</span>
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Move to Trash">
                              <IconButton
                                size="small"
                                onClick={(e) => handleDelete(e, note._id)}
                                sx={{ p: 0.3, opacity: 0.35, "&:hover": { opacity: 1, color: "error.main" } }}
                              >
                                <span style={{ fontSize: "0.85rem" }}>🗑</span>
                              </IconButton>
                            </Tooltip>
                          </>
                        ) : (
                          <>
                            <Tooltip title={note.isFavorite ? "Remove from favorites" : "Add to favorites"}>
                              <IconButton
                                size="small"
                                onClick={(e) => handleToggleFavorite(e, note._id)}
                                sx={{ p: 0.3 }}
                              >
                                <span style={{ fontSize: "0.85rem", opacity: note.isFavorite ? 1 : 0.35 }}>⭐</span>
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Archive document">
                              <IconButton
                                size="small"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await updateNote(note._id, { isArchived: true });
                                    toast.success("Document archived");
                                    void fetchNotes();
                                  } catch {
                                    toast.error("Failed to archive document");
                                  }
                                }}
                                sx={{ p: 0.3, opacity: 0.35, "&:hover": { opacity: 1 } }}
                              >
                                <span style={{ fontSize: "0.85rem" }}>📦</span>
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Move to Trash">
                              <IconButton
                                size="small"
                                onClick={(e) => handleDelete(e, note._id)}
                                sx={{ p: 0.3, opacity: 0.35, "&:hover": { opacity: 1, color: "error.main" } }}
                              >
                                <span style={{ fontSize: "0.85rem" }}>🗑</span>
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Preview text */}
                    <p className="doc-card__preview">
                      {(note.content || "").replace(/^[#\-*`>\[\]\s]+/gm, " ").replace(/\s+/g, " ").trim() || "Empty document — click to start writing."}
                    </p>

                    {/* Tags */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="doc-card__tags">
                        {note.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="doc-card__tag" style={{
                            padding: "1px 7px", borderRadius: 5, fontSize: "0.62rem",
                            fontWeight: 700, border: "1px solid #c7d2fe", color: "#6366f1",
                            background: "rgba(99,102,241,0.06)",
                          }}>
                            #{tag}
                          </span>
                        ))}
                        {note.tags.length > 3 && (
                          <span style={{ fontSize: "0.62rem", color: "#94a3b8", alignSelf: "center", marginLeft: 4 }}>+{note.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer (Author avatar + Last edited) */}
                  <div className="doc-card__footer">
                    <div className="doc-card__author">
                      <Avatar
                        src={note.author?.avatar || undefined}
                        sx={{ width: 18, height: 18, fontSize: "0.55rem", bgcolor: "#4f46e5" }}
                      >
                        {note.author?.name?.[0]?.toUpperCase() || "U"}
                      </Avatar>
                      <span>
                        {timeAgo(note.updatedAt)}
                      </span>
                    </div>

                    {/* Shared collaborators avatar stack */}
                    {note.collaborators && note.collaborators.length > 0 && (
                      <Box display="flex" gap={0.3} alignItems="center">
                        {note.collaborators.slice(0, 3).map((c) => (
                          <Tooltip key={c._id || c} title={c.name || c.email || "Collaborator"}>
                            <Avatar
                              src={c.avatar || undefined}
                              sx={{ width: 16, height: 16, fontSize: "0.5rem", bgcolor: "#10b981" }}
                            >
                              {(c.name?.[0] || c.email?.[0] || "C").toUpperCase()}
                            </Avatar>
                          </Tooltip>
                        ))}
                        {note.collaborators.length > 3 && (
                          <span style={{ fontSize: "0.6rem", color: "#94a3b8", fontWeight: 700, marginLeft: 4 }}>+{note.collaborators.length - 3}</span>
                        )}
                      </Box>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notes;
