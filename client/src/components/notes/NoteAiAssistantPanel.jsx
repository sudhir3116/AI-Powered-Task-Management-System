import { useState } from "react";
import { Avatar, Chip, CircularProgress, Divider, IconButton, Tooltip } from "@mui/material";
import toast from "react-hot-toast";

const AI_ACTIONS = [
  { id: "summarize",       label: "Summarize Note",     icon: "📝", desc: "Get a concise AI summary" },
  { id: "explain",         label: "Explain Content",    icon: "💡", desc: "Deep explanation of concepts" },
  { id: "key-points",      label: "Key Takeaways",      icon: "🔑", desc: "Extract key points as bullets" },
  { id: "quiz",            label: "Practice Quiz",      icon: "🧠", desc: "Interactive knowledge quiz" },
  { id: "study-checklist", label: "Study Checklist",    icon: "📋", desc: "Learning checklist from content" },
];

const NoteAiAssistantPanel = ({ note, onExecuteAiAction, onInsertAiBlock, onOpenConvertModal }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);
  const [activeOutput, setActiveOutput] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});

  const runAction = async (actionId) => {
    if (actionId === "convert-tasks") {
      onOpenConvertModal?.();
      return;
    }
    setLoadingAction(actionId);
    try {
      const res = await onExecuteAiAction(actionId);
      setActiveOutput({ type: actionId, data: res.data?.result });
      setQuizAnswers({});
      toast.success("AI analysis complete ✓");
    } catch {
      toast.error("AI action failed — please try again");
    } finally {
      setLoadingAction(null);
    }
  };

  const insertResult = () => {
    if (!activeOutput || !onInsertAiBlock) return;
    if (activeOutput.type === "summary") {
      onInsertAiBlock("quote", `AI Summary: ${activeOutput.data}`);
      toast.success("Summary inserted into document");
    } else if (activeOutput.type === "explain") {
      onInsertAiBlock("paragraph", activeOutput.data);
      toast.success("Explanation inserted");
    } else if (activeOutput.type === "key-points" && Array.isArray(activeOutput.data)) {
      activeOutput.data.forEach((kp) => onInsertAiBlock("bullet", kp));
      toast.success("Key points inserted as bullets");
    } else if (activeOutput.type === "study-checklist" && Array.isArray(activeOutput.data)) {
      activeOutput.data.forEach((item) => onInsertAiBlock("checklist", item));
      toast.success("Study checklist inserted");
    }
  };

  const outputLabel = (type) =>
    type === "summarize" || type === "summary" ? "Summary"
    : type === "explain" ? "Explanation"
    : type === "key-points" ? "Key Points"
    : type === "quiz" ? "Practice Quiz"
    : type === "study-checklist" ? "Study Checklist"
    : type.toUpperCase();

  /* ── Collapsed strip ──────────────────────────────────── */
  if (collapsed) {
    return (
      <div className="ai-panel ai-panel--collapsed">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8, gap: 6 }}>
          <div style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", borderRadius: 10, padding: "8px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <Tooltip title="Expand AI Panel" placement="left">
              <IconButton size="small" onClick={() => setCollapsed(false)} sx={{ color: "#ffffff", p: 0.4 }}>
                <span style={{ fontSize: "0.75rem" }}>◀</span>
              </IconButton>
            </Tooltip>
            <span style={{ fontSize: "0.9rem" }}>✨</span>
          </div>
          {AI_ACTIONS.map((a) => (
            <Tooltip key={a.id} title={a.label} placement="left">
              <button
                onClick={() => { setCollapsed(false); runAction(a.id); }}
                disabled={loadingAction === a.id}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", padding: 4 }}
              >
                {a.icon}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ai-panel">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="ai-panel__header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "1rem" }}>✨</span>
          <span className="ai-panel__title">AI Note Companion</span>
        </div>
        <IconButton size="small" onClick={() => setCollapsed(true)} sx={{ color: "rgba(255,255,255,0.7)", p: 0.4 }}>
          <span style={{ fontSize: "0.7rem" }}>▶</span>
        </IconButton>
      </div>

      {/* ── Scrollable body ─────────────────────────────── */}
      <div className="ai-panel__scroll">

        {/* Subheading */}
        <p style={{ fontSize: "0.76rem", color: "#94a3b8", margin: "0 0 12px", lineHeight: 1.5 }}>
          Analyze, summarize, and generate tasks from this document using TaskFlow AI.
        </p>

        {/* Primary CTA */}
        <button
          className="ai-action-btn ai-action-btn--primary"
          onClick={() => runAction("convert-tasks")}
          disabled={!note}
        >
          ⚡ Convert into Tasks
        </button>

        <div style={{ marginBottom: 10, marginTop: 4 }}>
          <div style={{ fontSize: "0.67rem", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.6px", marginBottom: 6 }}>
            AI ANALYSIS
          </div>
          {AI_ACTIONS.map((action) => (
            <button
              key={action.id}
              className="ai-action-btn"
              onClick={() => runAction(action.id)}
              disabled={loadingAction !== null || !note}
              title={action.desc}
            >
              {loadingAction === action.id ? (
                <CircularProgress size={13} sx={{ color: "#4f46e5", mr: 0.5 }} />
              ) : (
                <span style={{ width: 18, textAlign: "center" }}>{action.icon}</span>
              )}
              {action.label}
            </button>
          ))}
        </div>

        {/* ── AI Output Card ──────────────────────────── */}
        {activeOutput && (
          <div className="ai-result-card">
            <div className="ai-result-card__header">
              <Chip
                label={outputLabel(activeOutput.type)}
                size="small"
                sx={{
                  fontSize: "0.65rem", fontWeight: 800, height: 20,
                  bgcolor: "rgba(79,70,229,0.1)", color: "#4f46e5",
                }}
              />
              {activeOutput.type !== "quiz" && (
                <button
                  onClick={insertResult}
                  style={{
                    background: "none", border: "1px solid #c7d2fe", borderRadius: 6, padding: "2px 8px",
                    fontSize: "0.7rem", fontWeight: 700, color: "#4f46e5", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  + Insert
                </button>
              )}
            </div>

            <div className="ai-result-card__body">
              {/* Summary / Explain */}
              {(activeOutput.type === "summarize" || activeOutput.type === "summary" || activeOutput.type === "explain") && (
                <p style={{ margin: 0, whiteSpace: "pre-line" }}>{activeOutput.data}</p>
              )}

              {/* Key Points */}
              {activeOutput.type === "key-points" && Array.isArray(activeOutput.data) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {activeOutput.data.map((kp, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                      <span style={{ color: "#4f46e5", fontWeight: 800, fontSize: "0.85rem", lineHeight: 1.5 }}>•</span>
                      <span style={{ lineHeight: 1.5 }}>{kp}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Study Checklist */}
              {activeOutput.type === "study-checklist" && Array.isArray(activeOutput.data) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {activeOutput.data.map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                      <span style={{ color: "#059669", fontWeight: 800, fontSize: "0.85rem" }}>☑</span>
                      <span style={{ lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Interactive Quiz */}
              {activeOutput.type === "quiz" && Array.isArray(activeOutput.data) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {activeOutput.data.map((q, qIdx) => {
                    const selected = quizAnswers[qIdx];
                    const answered = selected !== undefined;
                    const correct = answered && selected === q.answer;
                    return (
                      <div key={qIdx} style={{ borderRadius: 8, border: "1px solid #f1f5f9", padding: "10px 12px", background: "#fafbfc" }}>
                        <div style={{ fontWeight: 700, marginBottom: 8, color: "#1e293b" }}>
                          Q{qIdx + 1}: {q.question}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {q.options?.map((opt, oIdx) => {
                            let bg = "#ffffff", border = "#e2e8f0", color = "#374151";
                            if (answered) {
                              if (oIdx === q.answer) { bg = "#f0fdf4"; border = "#86efac"; color = "#15803d"; }
                              else if (oIdx === selected && !correct) { bg = "#fef2f2"; border = "#fca5a5"; color = "#dc2626"; }
                            } else if (selected === oIdx) { bg = "rgba(79,70,229,0.07)"; border = "#c7d2fe"; }
                            return (
                              <label
                                key={oIdx}
                                style={{
                                  display: "flex", alignItems: "center", gap: 7, padding: "6px 8px", borderRadius: 6,
                                  border: `1px solid ${border}`, background: bg, color, cursor: answered ? "default" : "pointer",
                                  fontSize: "0.79rem", transition: "all 0.15s",
                                }}
                              >
                                <input
                                  type="radio"
                                  name={`q-${qIdx}`}
                                  disabled={answered}
                                  onChange={() => setQuizAnswers((p) => ({ ...p, [qIdx]: oIdx }))}
                                  style={{ accentColor: "#4f46e5" }}
                                />
                                {opt}
                              </label>
                            );
                          })}
                        </div>
                        {answered && (
                          <div style={{
                            marginTop: 8, padding: "6px 10px", borderRadius: 6,
                            background: correct ? "#f0fdf4" : "#fef2f2",
                            fontSize: "0.75rem", fontWeight: 600,
                            color: correct ? "#15803d" : "#dc2626",
                          }}>
                            {correct ? "✓ Correct! " : `✗ Incorrect. Answer: ${q.options?.[q.answer]}. `}
                            {q.explanation && <span style={{ color: "#64748b", fontWeight: 400 }}>{q.explanation}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Linked Tasks ─────────────────────────────── */}
        {note?.linkedTasks && note.linkedTasks.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #e8ecf0" }}>
            <div style={{ fontSize: "0.67rem", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.6px", marginBottom: 8 }}>
              📌 LINKED TASKS ({note.linkedTasks.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {note.linkedTasks.map((t) => (
                <div
                  key={t._id}
                  style={{
                    padding: "7px 10px", borderRadius: 8, background: "#ffffff",
                    border: "1px solid #e8ecf0", fontSize: "0.79rem", fontWeight: 600, color: "#334155",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <span style={{ fontSize: "0.8rem" }}>
                    {t.status === "Completed" ? "✅" : t.status === "In Progress" ? "🔵" : "⭕"}
                  </span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.title}
                  </span>
                  {t.priority && (
                    <span style={{
                      fontSize: "0.62rem", fontWeight: 800, padding: "1px 6px", borderRadius: 4,
                      background: t.priority === "High" ? "#fef2f2" : t.priority === "Medium" ? "#fffbeb" : "#f0fdf4",
                      color: t.priority === "High" ? "#dc2626" : t.priority === "Medium" ? "#d97706" : "#059669",
                    }}>
                      {t.priority}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteAiAssistantPanel;
