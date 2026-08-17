import { useEffect, useRef, useState } from "react";
import { Checkbox, Divider, Menu, MenuItem, Popover } from "@mui/material";

const BLOCK_TYPES = [
  { type: "paragraph",  label: "Paragraph",     icon: "¶",    desc: "Plain text block", aliases: ["text", "plain", "p", "paragraph"] },
  { type: "heading1",   label: "Heading 1",      icon: "H1",   desc: "Large section title", aliases: ["h1", "heading 1", "large"] },
  { type: "heading2",   label: "Heading 2",      icon: "H2",   desc: "Medium section heading", aliases: ["h2", "heading 2", "medium"] },
  { type: "heading3",   label: "Heading 3",      icon: "H3",   desc: "Small sub-heading", aliases: ["h3", "heading 3", "small"] },
  { type: "bullet",     label: "Bullet List",    icon: "•",    desc: "Unordered list item", aliases: ["bullet", "list", "ul", "unordered"] },
  { type: "number",     label: "Numbered List",  icon: "1.",   desc: "Ordered list item", aliases: ["number", "list", "ol", "ordered"] },
  { type: "checklist",  label: "Checklist",      icon: "☑",   desc: "To-do item with checkbox", aliases: ["checklist", "todo", "task", "check"] },
  { type: "code",       label: "Code Block",     icon: "</>",  desc: "Syntax-highlighted code", aliases: ["code", "pre", "javascript", "python", "developer"] },
  { type: "quote",      label: "Quote",          icon: "❝",    desc: "Callout or blockquote", aliases: ["quote", "blockquote", "cite", "callout"] },
  { type: "divider",    label: "Divider",        icon: "—",    desc: "Horizontal separator line", aliases: ["divider", "hr", "line", "separator"] },
  { type: "image",      label: "Image",          icon: "🖼️",   desc: "Image block with caption", aliases: ["image", "img", "picture", "photo"] },
  { type: "table",      label: "Table",          icon: "⊞",    desc: "Interactive data grid", aliases: ["table", "grid", "data", "columns"] },
  { type: "task",       label: "Convert to Task", icon: "⚡",   desc: "Generate actionable task", aliases: ["task", "convert", "action"] },
];

const makeBlock = (type = "paragraph", extra = {}) => ({
  id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  type,
  content: "",
  metadata: type === "checklist" ? { checked: false }
           : type === "code"      ? { language: "javascript" }
           : type === "image"     ? { caption: "" }
           : type === "table"     ? { headers: ["Column 1", "Column 2", "Column 3"], rows: [["", "", ""], ["", "", ""]] }
           : {},
  ...extra,
});

const NotionBlockEditor = ({ blocks = [], onChange, onOpenConvertModal }) => {
  const [localBlocks, setLocalBlocks] = useState([]);
  const [activeBlockId, setActiveBlockId] = useState(null);

  // Slash menu
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashTargetId, setSlashTargetId] = useState(null);
  const [slashSelectedIdx, setSlashSelectedIdx] = useState(0);
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 0, left: 0 });

  // Block action menu
  const [blockMenuAnchor, setBlockMenuAnchor] = useState(null);
  const [menuBlockId, setMenuBlockId] = useState(null);

  // Selection formatting state
  const [selectionInfo, setSelectionInfo] = useState(null); // { blockId, start, end, text, targetEl }
  const activeSlashItemRef = useRef(null);

  const inputRefs = useRef({});

  useEffect(() => {
    if (slashMenuOpen && activeSlashItemRef.current) {
      activeSlashItemRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [slashSelectedIdx, slashMenuOpen]);

  const handleTextSelection = (blockId, e) => {
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    if (start !== undefined && end !== undefined && start !== end) {
      const text = e.target.value.substring(start, end);
      setSelectionInfo({ blockId, start, end, text, targetEl: e.target });
    } else {
      setSelectionInfo(null);
    }
  };

  const applyFormatting = (prefix, suffix = prefix) => {
    if (!selectionInfo) return;
    const { blockId, start, end, text, targetEl } = selectionInfo;
    const block = localBlocks.find((b) => b.id === blockId);
    if (!block) return;

    let formattedText = `${prefix}${text}${suffix}`;
    if (prefix === "link") {
      const url = window.prompt("Enter URL:");
      if (!url) return;
      formattedText = `[${text}](${url})`;
    }

    const before = block.content.substring(0, start);
    const after = block.content.substring(end);
    const newContent = before + formattedText + after;

    updateContent(blockId, newContent);
    setSelectionInfo(null);

    setTimeout(() => {
      if (targetEl) {
        targetEl.focus();
        const newCursorPos = start + formattedText.length;
        targetEl.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 50);
  };

  // Sync incoming blocks
  useEffect(() => {
    if (blocks && Array.isArray(blocks) && blocks.length > 0) {
      setLocalBlocks(blocks);
    } else {
      setLocalBlocks([makeBlock("paragraph")]);
    }
  }, [blocks]);

  const push = (newBlocks) => {
    setLocalBlocks(newBlocks);
    onChange(newBlocks);
  };

  const updateContent = (id, content) => {
    const updated = localBlocks.map((b) => {
      if (b.id !== id) return b;

      // Slash trigger
      if (content.endsWith("/") && !slashMenuOpen) {
        const el = inputRefs.current[id];
        if (el) {
          const rect = el.getBoundingClientRect();
          const menuHeight = 280;
          let top = rect.bottom + 4;
          if (top + menuHeight > window.innerHeight) {
            top = rect.top - menuHeight - 4;
          }
          setSlashMenuPos({ top, left: rect.left });
        }
        setSlashMenuOpen(true);
        setSlashQuery("");
        setSlashTargetId(id);
        setSlashSelectedIdx(0);
      } else if (slashMenuOpen && slashTargetId === id) {
        const slashIdx = content.lastIndexOf("/");
        if (slashIdx !== -1) {
          setSlashQuery(content.slice(slashIdx + 1));
          setSlashSelectedIdx(0);
        } else {
          setSlashMenuOpen(false);
        }
      }

      return { ...b, content };
    });
    push(updated);
  };

  const filteredTypes = BLOCK_TYPES.filter(
    (t) =>
      t.label.toLowerCase().includes(slashQuery.toLowerCase()) ||
      t.type.toLowerCase().includes(slashQuery.toLowerCase()) ||
      (t.aliases && t.aliases.some((alias) => alias.toLowerCase().includes(slashQuery.toLowerCase())))
  );

  const convertType = (blockId, newType) => {
    setSlashMenuOpen(false);
    
    if (newType === "task") {
      onOpenConvertModal?.();
      const updated = localBlocks.map((b) => {
        if (b.id !== blockId) return b;
        return { ...b, content: b.content.replace(/\/\w*$/, "").trim() };
      });
      push(updated);
      return;
    }

    const updated = localBlocks.map((b) => {
      if (b.id !== blockId) return b;
      const cleanContent = b.content.replace(/\/\w*$/, "").trim();
      const meta =
        newType === "checklist" ? { checked: false }
        : newType === "code"   ? { language: "javascript" }
        : newType === "image"  ? { caption: "" }
        : newType === "table"  ? { headers: ["Column 1", "Column 2", "Column 3"], rows: [["", "", ""], ["", "", ""]] }
        : {};
      return { ...b, type: newType, content: cleanContent, metadata: meta };
    });
    push(updated);
    
    setTimeout(() => {
      const el = inputRefs.current[blockId];
      if (el) el.focus();
    }, 50);
  };

  const handleKeyDown = (e, index, block) => {
    if (slashMenuOpen) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashSelectedIdx((p) => (p + 1) % (filteredTypes.length || 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSlashSelectedIdx((p) => (p - 1 + filteredTypes.length) % (filteredTypes.length || 1)); return; }
      if (e.key === "Enter")     { e.preventDefault(); if (filteredTypes[slashSelectedIdx]) convertType(slashTargetId, filteredTypes[slashSelectedIdx].type); return; }
      if (e.key === "Escape")    { setSlashMenuOpen(false); return; }
    }

    if (e.key === "Enter" && !e.shiftKey && block.type !== "code" && block.type !== "table") {
      e.preventDefault();
      const continueType = ["bullet", "number", "checklist"].includes(block.type) ? block.type : "paragraph";
      const nb = makeBlock(continueType);
      const updated = [...localBlocks];
      updated.splice(index + 1, 0, nb);
      push(updated);
      setTimeout(() => { const el = inputRefs.current[nb.id]; if (el) el.focus(); }, 50);
    }

    if (e.key === "Backspace" && block.content === "") {
      if (block.type !== "paragraph") {
        e.preventDefault();
        convertType(block.id, "paragraph");
      } else if (localBlocks.length > 1) {
        e.preventDefault();
        const updated = localBlocks.filter((b) => b.id !== block.id);
        push(updated);
        const prev = localBlocks[index - 1];
        if (prev) setTimeout(() => { const el = inputRefs.current[prev.id]; if (el) el.focus(); }, 50);
      }
    }
  };

  const addBlockBelow = (index) => {
    const nb = makeBlock("paragraph");
    const updated = [...localBlocks];
    updated.splice(index + 1, 0, nb);
    push(updated);
    setTimeout(() => { const el = inputRefs.current[nb.id]; if (el) el.focus(); }, 50);
  };

  const moveBlock = (index, dir) => {
    if ((dir === -1 && index === 0) || (dir === 1 && index === localBlocks.length - 1)) return;
    const updated = [...localBlocks];
    [updated[index], updated[index + dir]] = [updated[index + dir], updated[index]];
    push(updated);
  };

  const duplicateBlock = (index) => {
    const dup = { ...localBlocks[index], id: `block-${Date.now()}` };
    const updated = [...localBlocks];
    updated.splice(index + 1, 0, dup);
    push(updated);
  };

  const deleteBlock = (id) => {
    if (localBlocks.length <= 1) return;
    push(localBlocks.filter((b) => b.id !== id));
  };

  const toggleCheck = (id) => {
    push(localBlocks.map((b) => b.id !== id ? b : { ...b, metadata: { ...b.metadata, checked: !b.metadata?.checked } }));
  };

  const updateTableCell = (blockId, rIdx, cIdx, val) => {
    push(localBlocks.map((b) => {
      if (b.id !== blockId) return b;
      const rows = (b.metadata?.rows || []).map((r, ri) => ri === rIdx ? r.map((c, ci) => ci === cIdx ? val : c) : r);
      return { ...b, metadata: { ...b.metadata, rows } };
    }));
  };

  const updateTableHeader = (blockId, cIdx, val) => {
    push(localBlocks.map((b) => {
      if (b.id !== blockId) return b;
      const headers = (b.metadata?.headers || []).map((h, ci) => ci === cIdx ? val : h);
      return { ...b, metadata: { ...b.metadata, headers } };
    }));
  };

  const addTableRow = (blockId) => {
    push(localBlocks.map((b) => {
      if (b.id !== blockId) return b;
      const cols = b.metadata?.headers?.length || 3;
      return { ...b, metadata: { ...b.metadata, rows: [...(b.metadata?.rows || []), new Array(cols).fill("")] } };
    }));
  };

  const deleteTableRow = (blockId, rIdx) => {
    push(localBlocks.map((b) => {
      if (b.id !== blockId) return b;
      if ((b.metadata?.rows?.length || 0) <= 1) return b;
      const rows = (b.metadata?.rows || []).filter((_, ri) => ri !== rIdx);
      return { ...b, metadata: { ...b.metadata, rows } };
    }));
  };

  const addTableColumn = (blockId) => {
    push(localBlocks.map((b) => {
      if (b.id !== blockId) return b;
      const headers = [...(b.metadata?.headers || []), `Column ${(b.metadata?.headers?.length || 0) + 1}`];
      const rows = (b.metadata?.rows || []).map((r) => [...r, ""]);
      return { ...b, metadata: { ...b.metadata, headers, rows } };
    }));
  };

  const deleteTableColumn = (blockId) => {
    push(localBlocks.map((b) => {
      if (b.id !== blockId) return b;
      if ((b.metadata?.headers?.length || 0) <= 1) return b;
      const headers = (b.metadata?.headers || []).slice(0, -1);
      const rows = (b.metadata?.rows || []).map((r) => r.slice(0, -1));
      return { ...b, metadata: { ...b.metadata, headers, rows } };
    }));
  };

  const inputStyle = (type) => {
    const base = { width: "100%", border: "none", outline: "none", background: "transparent", fontFamily: "inherit", padding: "2px 0", resize: "none" };
    if (type === "heading1")  return { ...base, fontSize: "1.9rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px", lineHeight: 1.2 };
    if (type === "heading2")  return { ...base, fontSize: "1.45rem", fontWeight: 750, color: "#1e293b", lineHeight: 1.25 };
    if (type === "heading3")  return { ...base, fontSize: "1.15rem", fontWeight: 700, color: "#334155", lineHeight: 1.3 };
    if (type === "bullet" || type === "number") return { ...base, fontSize: "0.95rem", color: "#374151", lineHeight: 1.7 };
    if (type === "checklist") return { ...base, fontSize: "0.95rem", color: "#374151", lineHeight: 1.7 };
    if (type === "quote")     return { ...base, fontSize: "0.95rem", fontStyle: "italic", color: "#475569", lineHeight: 1.7 };
    return { ...base, fontSize: "0.95rem", color: "#374151", lineHeight: 1.7 };
  };

  const placeholderFor = (type) => {
    if (type === "heading1") return "Heading 1";
    if (type === "heading2") return "Heading 2";
    if (type === "heading3") return "Heading 3";
    if (type === "bullet")   return "List item...";
    if (type === "number")   return "List item...";
    if (type === "checklist")return "To-do...";
    if (type === "quote")    return "Quote or callout...";
    return "Type '/' for commands, or start writing...";
  };

  return (
    <div className="block-editor">
      {localBlocks.map((block, index) => (
        <div
          key={block.id}
          className="block-row"
          onFocus={() => setActiveBlockId(block.id)}
          onBlur={() => setActiveBlockId(null)}
        >
          {/* Block handle */}
          <div className="block-handle">
            <button
              onClick={() => addBlockBelow(index)}
              title="Add block"
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "2px 3px",
                fontSize: "0.75rem", color: "#94a3b8", borderRadius: 4,
                display: "flex", alignItems: "center", lineHeight: 1,
              }}
            >
              ＋
            </button>
            <button
              onClick={(e) => { setBlockMenuAnchor(e.currentTarget); setMenuBlockId(block.id); }}
              title="Block options"
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "2px 3px",
                fontSize: "0.75rem", color: "#94a3b8", borderRadius: 4,
                display: "flex", alignItems: "center", lineHeight: 1,
              }}
            >
              ⠿
            </button>
          </div>

          {/* Block content */}
          <div className="block-content">
            {/* ─── Headings ─────────────────────────────── */}
            {(block.type === "heading1" || block.type === "heading2" || block.type === "heading3") && (
              <input
                ref={(el) => (inputRefs.current[block.id] = el)}
                id={`input-${block.id}`}
                type="text"
                value={block.content}
                placeholder={placeholderFor(block.type)}
                onChange={(e) => updateContent(block.id, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index, block)}
                onMouseUp={(e) => handleTextSelection(block.id, e)}
                onKeyUp={(e) => handleTextSelection(block.id, e)}
                style={inputStyle(block.type)}
              />
            )}

            {/* ─── Paragraph ────────────────────────────── */}
            {block.type === "paragraph" && (
              <textarea
                ref={(el) => (inputRefs.current[block.id] = el)}
                id={`input-${block.id}`}
                rows={1}
                value={block.content}
                placeholder={placeholderFor(block.type)}
                onChange={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                  updateContent(block.id, e.target.value);
                }}
                onKeyDown={(e) => handleKeyDown(e, index, block)}
                onMouseUp={(e) => handleTextSelection(block.id, e)}
                onKeyUp={(e) => handleTextSelection(block.id, e)}
                style={{ ...inputStyle(block.type), overflow: "hidden", minHeight: "1.7em" }}
              />
            )}

            {/* ─── Bullet ───────────────────────────────── */}
            {block.type === "bullet" && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "#4f46e5", fontWeight: 800, paddingTop: 2, flexShrink: 0, fontSize: "1rem", lineHeight: 1.7 }}>•</span>
                <textarea
                  ref={(el) => (inputRefs.current[block.id] = el)}
                  id={`input-${block.id}`}
                  rows={1}
                  value={block.content}
                  placeholder="List item..."
                  onChange={(e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; updateContent(block.id, e.target.value); }}
                  onKeyDown={(e) => handleKeyDown(e, index, block)}
                  onMouseUp={(e) => handleTextSelection(block.id, e)}
                  onKeyUp={(e) => handleTextSelection(block.id, e)}
                  style={{ ...inputStyle("bullet"), overflow: "hidden", minHeight: "1.7em", flex: 1 }}
                />
              </div>
            )}

            {/* ─── Numbered list ────────────────────────── */}
            {block.type === "number" && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "#64748b", fontWeight: 700, paddingTop: 2, flexShrink: 0, fontSize: "0.9rem", lineHeight: 1.7, minWidth: 20 }}>{index + 1}.</span>
                <textarea
                  ref={(el) => (inputRefs.current[block.id] = el)}
                  id={`input-${block.id}`}
                  rows={1}
                  value={block.content}
                  placeholder="List item..."
                  onChange={(e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; updateContent(block.id, e.target.value); }}
                  onKeyDown={(e) => handleKeyDown(e, index, block)}
                  onMouseUp={(e) => handleTextSelection(block.id, e)}
                  onKeyUp={(e) => handleTextSelection(block.id, e)}
                  style={{ ...inputStyle("number"), overflow: "hidden", minHeight: "1.7em", flex: 1 }}
                />
              </div>
            )}

            {/* ─── Checklist ────────────────────────────── */}
            {block.type === "checklist" && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                <Checkbox
                  size="small"
                  checked={Boolean(block.metadata?.checked)}
                  onChange={() => toggleCheck(block.id)}
                  sx={{ p: 0.2, mt: 0.2, color: "#4f46e5", "&.Mui-checked": { color: "#4f46e5" } }}
                />
                <textarea
                  ref={(el) => (inputRefs.current[block.id] = el)}
                  id={`input-${block.id}`}
                  rows={1}
                  value={block.content}
                  placeholder="To-do item..."
                  onChange={(e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; updateContent(block.id, e.target.value); }}
                  onKeyDown={(e) => handleKeyDown(e, index, block)}
                  onMouseUp={(e) => handleTextSelection(block.id, e)}
                  onKeyUp={(e) => handleTextSelection(block.id, e)}
                  style={{
                    ...inputStyle("checklist"),
                    overflow: "hidden",
                    minHeight: "1.7em",
                    flex: 1,
                    textDecoration: block.metadata?.checked ? "line-through" : "none",
                    color: block.metadata?.checked ? "#94a3b8" : "#374151",
                  }}
                />
              </div>
            )}

            {/* ─── Code block ───────────────────────────── */}
            {block.type === "code" && (
              <div className="block-code" style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.5px", background: "#334155", padding: "2px 8px", borderRadius: 4 }}>
                    CODE BLOCK
                  </span>
                  <select
                    value={block.metadata?.language || "javascript"}
                    onChange={(e) => {
                      push(localBlocks.map((b) => b.id === block.id ? { ...b, metadata: { ...b.metadata, language: e.target.value } } : b));
                    }}
                    style={{ background: "#334155", color: "#94a3b8", border: "none", fontSize: "0.72rem", padding: "2px 6px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="html">HTML/CSS</option>
                    <option value="json">JSON</option>
                    <option value="bash">Bash</option>
                    <option value="sql">SQL</option>
                  </select>
                </div>
                <textarea
                  ref={(el) => (inputRefs.current[block.id] = el)}
                  id={`input-${block.id}`}
                  rows={4}
                  value={block.content}
                  placeholder="// Write your code here..."
                  onChange={(e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; updateContent(block.id, e.target.value); }}
                  onKeyDown={(e) => handleKeyDown(e, index, block)}
                  onMouseUp={(e) => handleTextSelection(block.id, e)}
                  onKeyUp={(e) => handleTextSelection(block.id, e)}
                  style={{
                    width: "100%", border: "none", outline: "none", background: "transparent", resize: "none",
                    fontFamily: "Consolas, Monaco, 'Courier New', monospace", fontSize: "0.85rem", color: "#38bdf8",
                    lineHeight: 1.65, overflow: "hidden", padding: 0,
                  }}
                />
              </div>
            )}

            {/* ─── Quote ────────────────────────────────── */}
            {block.type === "quote" && (
              <div className="block-quote">
                <textarea
                  ref={(el) => (inputRefs.current[block.id] = el)}
                  id={`input-${block.id}`}
                  rows={1}
                  value={block.content}
                  placeholder="Quote or important callout..."
                  onChange={(e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; updateContent(block.id, e.target.value); }}
                  onKeyDown={(e) => handleKeyDown(e, index, block)}
                  onMouseUp={(e) => handleTextSelection(block.id, e)}
                  onKeyUp={(e) => handleTextSelection(block.id, e)}
                  style={{ ...inputStyle("quote"), overflow: "hidden", minHeight: "1.7em", width: "100%", border: "none", outline: "none", background: "transparent", resize: "none", fontFamily: "inherit" }}
                />
              </div>
            )}

            {/* ─── Divider ──────────────────────────────── */}
            {block.type === "divider" && (
              <div style={{ padding: "12px 0", cursor: "pointer" }} onClick={() => setActiveBlockId(block.id)}>
                <hr style={{ border: "none", borderTop: "2px solid #e2e8f0", margin: 0 }} />
              </div>
            )}

            {/* ─── Image block ───────────────────────────── */}
            {block.type === "image" && (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#f8fafc", padding: 12, marginTop: 4 }}>
                {!block.content ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: "1.2rem" }}>🖼️</span>
                    <input
                      ref={(el) => (inputRefs.current[block.id] = el)}
                      id={`input-${block.id}`}
                      type="text"
                      placeholder="Paste image URL here & press Enter..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          updateContent(block.id, e.target.value);
                        }
                      }}
                      style={{ flex: 1, border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 10px", fontSize: "0.82rem", outline: "none", background: "#fff" }}
                    />
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <img
                      src={block.content}
                      alt={block.metadata?.caption || "Note Image"}
                      style={{ maxWidth: "100%", maxHeight: 350, borderRadius: 8, objectFit: "contain", border: "1px solid #e2e8f0" }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Add a caption..."
                      value={block.metadata?.caption || ""}
                      onChange={(e) => {
                        push(localBlocks.map((b) => b.id === block.id ? { ...b, metadata: { ...b.metadata, caption: e.target.value } } : b));
                      }}
                      style={{ border: "none", outline: "none", background: "transparent", fontSize: "0.75rem", color: "#64748b", textAlign: "center", width: "100%", marginTop: 8, fontFamily: "inherit" }}
                    />
                    <button
                      onClick={() => updateContent(block.id, "")}
                      style={{ fontSize: "0.7rem", color: "#dc2626", background: "none", border: "none", cursor: "pointer", marginTop: 4, textDecoration: "underline", fontFamily: "inherit" }}
                    >
                      Change Image URL
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ─── Table ────────────────────────────────── */}
            {block.type === "table" && (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "auto", background: "#fafafa", marginTop: 4 }}>
                <div style={{ padding: "8px 12px 4px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.5px" }}>📊 TABLE</span>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => addTableColumn(block.id)}
                      style={{ fontSize: "0.7rem", fontWeight: 700, color: "#4f46e5", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      + Add Column
                    </button>
                    <button
                      onClick={() => deleteTableColumn(block.id)}
                      style={{ fontSize: "0.7rem", fontWeight: 700, color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      - Delete Column
                    </button>
                  </div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {(block.metadata?.headers || []).map((h, i) => (
                        <th key={i} style={{ border: "1px solid #e2e8f0", padding: "4px 8px", background: "#f1f5f9", textAlign: "left" }}>
                          <input
                            type="text"
                            value={h}
                            onChange={(e) => updateTableHeader(block.id, i, e.target.value)}
                            style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: "0.78rem", fontWeight: 700, color: "#475569", fontFamily: "inherit" }}
                          />
                        </th>
                      ))}
                      <th style={{ border: "1px solid #e2e8f0", padding: "4px 8px", background: "#f1f5f9", width: 40 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {(block.metadata?.rows || []).map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} style={{ border: "1px solid #e2e8f0", padding: "2px 4px" }}>
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) => updateTableCell(block.id, rIdx, cIdx, e.target.value)}
                              style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: "0.82rem", padding: "4px 6px", fontFamily: "inherit", color: "#374151" }}
                            />
                          </td>
                        ))}
                        <td style={{ border: "1px solid #e2e8f0", padding: "2px 4px", textAlign: "center" }}>
                          <button
                            onClick={() => deleteTableRow(block.id, rIdx)}
                            style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700, fontFamily: "inherit" }}
                            title="Delete Row"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={() => addTableRow(block.id)}
                  style={{ margin: "6px 12px 8px", fontSize: "0.75rem", fontWeight: 700, color: "#4f46e5", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                >
                  + Add Row
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* ── Floating Slash Menu ──────────────────────────── */}
      {slashMenuOpen && (
        <div
          className="slash-menu"
          style={{ top: slashMenuPos.top, left: slashMenuPos.left }}
        >
          <div className="slash-menu__header">
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.5px" }}>
              BLOCK TYPES {slashQuery && `— "${slashQuery}"`}
            </span>
          </div>
          {filteredTypes.length === 0 ? (
            <div style={{ padding: "12px 16px", fontSize: "0.8rem", color: "#94a3b8" }}>No matching blocks</div>
          ) : (
            filteredTypes.map((item, idx) => (
              <div
                key={item.type}
                ref={idx === slashSelectedIdx ? activeSlashItemRef : null}
                className={`slash-menu__item${idx === slashSelectedIdx ? " slash-menu__item--selected" : ""}`}
                onClick={() => convertType(slashTargetId, item.type)}
                onMouseEnter={() => setSlashSelectedIdx(idx)}
              >
                <div className="slash-menu__icon">{item.icon}</div>
                <div>
                  <div style={{ fontSize: "0.83rem", fontWeight: 700, color: "#1e293b" }}>{item.label}</div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{item.desc}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Click outside to close slash menu */}
      {slashMenuOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 999 }}
          onClick={() => setSlashMenuOpen(false)}
        />
      )}

      {/* ── Block Action Menu ──────────────────────────────── */}
      <Menu
        anchorEl={blockMenuAnchor}
        open={Boolean(blockMenuAnchor)}
        onClose={() => setBlockMenuAnchor(null)}
        slotProps={{ paper: { sx: { borderRadius: 2.5, minWidth: 180, maxHeight: 400, boxShadow: "0 8px 24px rgba(15,23,42,0.12)" } } }}
      >
        {[
          { label: "⬆ Move Up",   action: () => { const i = localBlocks.findIndex((b) => b.id === menuBlockId); moveBlock(i, -1); } },
          { label: "⬇ Move Down", action: () => { const i = localBlocks.findIndex((b) => b.id === menuBlockId); moveBlock(i, 1); } },
          { label: "📄 Duplicate", action: () => { const i = localBlocks.findIndex((b) => b.id === menuBlockId); duplicateBlock(i); } },
        ].map((item) => (
          <MenuItem key={item.label} onClick={() => { item.action(); setBlockMenuAnchor(null); }} sx={{ fontSize: "0.83rem", fontWeight: 600 }}>
            {item.label}
          </MenuItem>
        ))}
        <Divider />
        <div style={{ padding: "6px 16px 2px", fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.5px" }}>
          TURN INTO
        </div>
        {[
          { label: "¶ Paragraph", type: "paragraph" },
          { label: "H1 Heading 1", type: "heading1" },
          { label: "H2 Heading 2", type: "heading2" },
          { label: "H3 Heading 3", type: "heading3" },
          { label: "• Bullet List", type: "bullet" },
          { label: "1. Numbered List", type: "number" },
          { label: "☑ Checklist", type: "checklist" },
          { label: "❝ Quote", type: "quote" },
          { label: "</> Code Block", type: "code" },
          { label: "— Divider", type: "divider" },
          { label: "⊞ Table", type: "table" },
        ].map((item) => (
          <MenuItem
            key={item.type}
            onClick={() => {
              convertType(menuBlockId, item.type);
              setBlockMenuAnchor(null);
            }}
            sx={{ fontSize: "0.78rem", py: 0.5, px: 2 }}
          >
            {item.label}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => { deleteBlock(menuBlockId); setBlockMenuAnchor(null); }}
          sx={{ fontSize: "0.83rem", fontWeight: 700, color: "error.main" }}
        >
          🗑 Delete Block
        </MenuItem>
      </Menu>

      {/* ── Text Formatting Selection Popover ──────────────── */}
      {selectionInfo && (
        <Popover
          open={Boolean(selectionInfo)}
          anchorEl={selectionInfo.targetEl}
          onClose={() => setSelectionInfo(null)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          transformOrigin={{ vertical: "bottom", horizontal: "center" }}
          slotProps={{
            paper: {
              sx: {
                p: 0.5,
                borderRadius: 2,
                boxShadow: "0 4px 16px rgba(15,23,42,0.15)",
                display: "flex",
                gap: 0.5,
                bgcolor: "#1e293b",
                color: "#ffffff",
                border: "1px solid #334155",
              },
            },
          }}
        >
          <button
            onClick={() => applyFormatting("**")}
            style={{ background: "none", border: "none", color: "#fff", padding: "4px 8px", cursor: "pointer", fontWeight: "bold", fontSize: "0.8rem", borderRadius: 4 }}
            title="Bold"
          >
            B
          </button>
          <button
            onClick={() => applyFormatting("*")}
            style={{ background: "none", border: "none", color: "#fff", padding: "4px 8px", cursor: "pointer", fontStyle: "italic", fontSize: "0.8rem", borderRadius: 4 }}
            title="Italic"
          >
            I
          </button>
          <button
            onClick={() => applyFormatting("<u>", "</u>")}
            style={{ background: "none", border: "none", color: "#fff", padding: "4px 8px", cursor: "pointer", textDecoration: "underline", fontSize: "0.8rem", borderRadius: 4 }}
            title="Underline"
          >
            U
          </button>
          <button
            onClick={() => applyFormatting("`")}
            style={{ background: "none", border: "none", color: "#60a5fa", padding: "4px 8px", cursor: "pointer", fontFamily: "monospace", fontSize: "0.8rem", borderRadius: 4 }}
            title="Inline Code"
          >
            {"<>"}
          </button>
          <button
            onClick={() => applyFormatting("link")}
            style={{ background: "none", border: "none", color: "#34d399", padding: "4px 8px", cursor: "pointer", fontSize: "0.8rem", borderRadius: 4 }}
            title="Insert Link"
          >
            🔗
          </button>
        </Popover>
      )}
    </div>
  );
};

export default NotionBlockEditor;
