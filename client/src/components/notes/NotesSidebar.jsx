import { useCallback, useRef, useState } from "react";
import { Avatar, IconButton, InputAdornment, TextField } from "@mui/material";

const VIEWS = [
  { id: "all", label: "All Documents", icon: "📚" },
  { id: "recent", label: "Recent", icon: "🕒" },
  { id: "favorites", label: "Favorites", icon: "⭐" },
  { id: "my_notes", label: "My Notes", icon: "👤" },
  { id: "workspace_notes", label: "Workspace Notes", icon: "🏢" },
  { id: "archived", label: "Archived", icon: "📥" },
  { id: "trash", label: "Trash", icon: "🗑️" },
];

const DOC_ICONS = ["📘", "📝", "📗", "📙", "📕", "🗒️", "📓"];

const getDocIcon = (id) => DOC_ICONS[id?.charCodeAt(id.length - 1) % DOC_ICONS.length] || "📄";

const NotesSidebar = ({
  notes = [],
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onToggleFavorite,
  searchQuery = "",
  onSearchChange,
  activeTag = "",
  onTagSelect,
  activeView = "all",
  onViewChange,
  counts,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});

  const toggleFolder = (folderName) => {
    setExpandedFolders((prev) => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  const favoriteNotes = notes.filter((n) => n.isFavorite);
  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 6);
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags || []))).slice(0, 12);

  // Group notes by folder
  const activeNotes = notes.filter((n) => !n.isTrash && !n.isArchived);
  const foldersMap = {};
  activeNotes.forEach((n) => {
    if (n.folder) {
      if (!foldersMap[n.folder]) foldersMap[n.folder] = [];
      foldersMap[n.folder].push(n);
    }
  });
  const folders = Object.keys(foldersMap).sort();

  const viewCounts = counts || {
    all: notes.length,
    recent: Math.min(notes.length, 6),
    favorites: favoriteNotes.length,
    my_notes: notes.length,
    workspace_notes: notes.length,
    archived: notes.filter(n => n.isArchived).length,
    trash: notes.filter(n => n.isTrash).length,
  };

  /* ── Collapsed icon-only mode ────────────────────────── */
  if (collapsed) {
    return (
      <div className="kb-sidebar kb-sidebar--collapsed">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 8 }}>
          <IconButton
            size="small"
            onClick={() => setCollapsed(false)}
            title="Expand Sidebar"
            sx={{ color: "#4f46e5" }}
          >
            <span style={{ fontSize: "1rem" }}>▶</span>
          </IconButton>
          <IconButton
            size="small"
            onClick={onCreateNote}
            title="New Document"
            sx={{
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              color: "#fff",
              width: 32,
              height: 32,
              "&:hover": { background: "linear-gradient(135deg, #4338ca, #6d28d9)" },
            }}
          >
            <span style={{ fontSize: "0.85rem" }}>+</span>
          </IconButton>
          {VIEWS.map((v) => (
            <IconButton
              key={v.id}
              size="small"
              onClick={() => { onViewChange && onViewChange(v.id); setCollapsed(false); }}
              title={v.label}
              sx={{
                fontSize: "0.9rem",
                bgcolor: activeView === v.id ? "rgba(79,70,229,0.1)" : "transparent",
                borderRadius: 1.5,
              }}
            >
              {v.icon}
            </IconButton>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="kb-sidebar">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="kb-sidebar__header">
        <span className="kb-sidebar__brand">🧠 Knowledge Hub</span>
        <IconButton size="small" onClick={() => setCollapsed(true)} title="Collapse" sx={{ p: 0.4 }}>
          <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>◀</span>
        </IconButton>
      </div>

      {/* ── New Document Button ───────────────────────────── */}
      <button className="kb-sidebar__new-btn" onClick={onCreateNote}>
        + New Document
      </button>

      {/* ── Search ───────────────────────────────────────── */}
      <div className="kb-sidebar__search">
        <TextField
          size="small"
          fullWidth
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>🔍</span>
                </InputAdornment>
              ),
              sx: {
                fontSize: "0.82rem",
                bgcolor: "#ffffff",
                borderRadius: "9px",
                "& fieldset": { borderColor: "#e8ecf0" },
                "&:hover fieldset": { borderColor: "#c7d2fe" },
              },
            },
          }}
        />
      </div>

      {/* ── Scrollable area ──────────────────────────────── */}
      <div className="kb-sidebar__scroll">

        {/* Views */}
        <div className="kb-sidebar__section-label">Views</div>
        {VIEWS.map((view) => (
          <div
            key={view.id}
            className={`kb-nav-item${activeView === view.id ? " kb-nav-item--active" : ""}`}
            onClick={() => onViewChange && onViewChange(view.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onViewChange && onViewChange(view.id)}
          >
            <span className="kb-nav-icon">{view.icon}</span>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {view.label}
            </span>
            <span className="kb-nav-count">{viewCounts[view.id]}</span>
          </div>
        ))}

        {/* Favorites */}
        {favoriteNotes.length > 0 && (
          <>
            <div className="kb-sidebar__section-label" style={{ marginTop: 12 }}>
              ⭐ Favorites
            </div>
            {favoriteNotes.map((note) => (
              <div
                key={note._id}
                className={`kb-note-item${note._id === activeNoteId ? " kb-note-item--active" : ""}`}
                onClick={() => onSelectNote && onSelectNote(note._id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onSelectNote && onSelectNote(note._id)}
              >
                <span style={{ fontSize: "0.85rem", flexShrink: 0 }}>{note.icon || getDocIcon(note._id)}</span>
                <span className="kb-note-item__title">{note.title || "Untitled"}</span>
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite && onToggleFavorite(note._id); }}
                  sx={{ p: 0.2, fontSize: "0.75rem", flexShrink: 0 }}
                  title="Unfavorite"
                >
                  ⭐
                </IconButton>
              </div>
            ))}
          </>
        )}

        {/* Folders Section */}
        {folders.length > 0 && (
          <>
            <div className="kb-sidebar__section-label" style={{ marginTop: 12 }}>
              📁 Folders
            </div>
            {folders.map((folder) => {
              const isOpen = expandedFolders[folder];
              const folderNotes = foldersMap[folder] || [];
              return (
                <div key={folder} style={{ marginBottom: 4 }}>
                  <div
                    onClick={() => toggleFolder(folder)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "#475569",
                      background: "transparent",
                      transition: "background-color 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f1f5f9"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <span style={{ fontSize: "0.6rem", color: "#64748b" }}>{isOpen ? "▼" : "▶"}</span>
                    <span>📁</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {folder}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600 }}>
                      {folderNotes.length}
                    </span>
                  </div>
                  {isOpen && (
                    <div style={{ paddingLeft: 12, borderLeft: "1px solid #e2e8f0", marginLeft: 16, marginTop: 2 }}>
                      {folderNotes.map((note) => (
                        <div
                          key={note._id}
                          className={`kb-note-item${note._id === activeNoteId ? " kb-note-item--active" : ""}`}
                          onClick={() => onSelectNote && onSelectNote(note._id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === "Enter" && onSelectNote && onSelectNote(note._id)}
                          style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                        >
                          <span style={{ fontSize: "0.8rem", flexShrink: 0 }}>{note.icon || getDocIcon(note._id)}</span>
                          <span className="kb-note-item__title" style={{ fontSize: "0.75rem" }}>{note.title || "Untitled"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* Recent */}
        <div className="kb-sidebar__section-label" style={{ marginTop: 12 }}>
          Recent
        </div>
        {recentNotes.length === 0 ? (
          <div style={{ padding: "6px 14px", fontSize: "0.78rem", color: "#94a3b8" }}>No notes yet</div>
        ) : (
          recentNotes.map((note) => (
            <div
              key={note._id}
              className={`kb-note-item${note._id === activeNoteId ? " kb-note-item--active" : ""}`}
              onClick={() => onSelectNote && onSelectNote(note._id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onSelectNote && onSelectNote(note._id)}
            >
              <span style={{ fontSize: "0.85rem", flexShrink: 0 }}>{note.isFavorite ? "⭐" : (note.icon || getDocIcon(note._id))}</span>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div className="kb-note-item__title">{note.title || "Untitled"}</div>
                <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>
                  {new Date(note.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Tags */}
        {allTags.length > 0 && (
          <>
            <div className="kb-sidebar__section-label" style={{ marginTop: 12 }}>
              Tags
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "4px 12px" }}>
              <button
                onClick={() => onTagSelect && onTagSelect("")}
                style={{
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  border: "1px solid",
                  borderColor: activeTag === "" ? "#4f46e5" : "#e2e8f0",
                  background: activeTag === "" ? "rgba(79,70,229,0.08)" : "#ffffff",
                  color: activeTag === "" ? "#4f46e5" : "#64748b",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onTagSelect && onTagSelect(activeTag === tag ? "" : tag)}
                  style={{
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    border: "1px solid",
                    borderColor: activeTag === tag ? "#4f46e5" : "#e2e8f0",
                    background: activeTag === tag ? "rgba(79,70,229,0.08)" : "#ffffff",
                    color: activeTag === tag ? "#4f46e5" : "#64748b",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </>
        )}

        {/* All Notes list */}
        <div className="kb-sidebar__section-label" style={{ marginTop: 12 }}>
          All Documents ({notes.length})
        </div>
        {notes.length === 0 ? (
          <div style={{ padding: "6px 14px", fontSize: "0.78rem", color: "#94a3b8" }}>Create your first document</div>
        ) : (
          notes.map((note) => (
            <div
              key={note._id}
              className={`kb-note-item${note._id === activeNoteId ? " kb-note-item--active" : ""}`}
              onClick={() => onSelectNote && onSelectNote(note._id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onSelectNote && onSelectNote(note._id)}
            >
              <span style={{ fontSize: "0.85rem", flexShrink: 0 }}>{note.icon || getDocIcon(note._id)}</span>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div className="kb-note-item__title">{note.title || "Untitled"}</div>
              </div>
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onToggleFavorite && onToggleFavorite(note._id); }}
                sx={{ p: 0.2, fontSize: "0.75rem", opacity: note.isFavorite ? 1 : 0.35, flexShrink: 0 }}
                title={note.isFavorite ? "Unfavorite" : "Favorite"}
              >
                {note.isFavorite ? "⭐" : "☆"}
              </IconButton>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotesSidebar;
