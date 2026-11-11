import { useState, useEffect, useRef, useCallback, memo } from "react";
import WinControls from "./WinControls";
import { useKeyboardNav, KB_HIGHLIGHT } from "../hooks/useKeyboardNav";

const Y   = "#FCEE0A";
const G   = "#39FF14";
const C   = "var(--nw-accent)";
const M   = "#D9027D";
const R   = "#ff5555";
const DIM = "#888";

const STORAGE_KEY = "nw-notes";

function loadNotes() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

const ACT_BTN = {
  background: "transparent", border: "1px solid #333",
  fontFamily: "var(--font-mono)", fontSize: "8px",
  padding: "1px 8px", cursor: "pointer",
};

function NoteItem({ note, expanded, onToggle, onDelete, onPin, onEdit, kbActive, editRequest }) {
  const isPinned = note.pinned;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(note.text);
  const [copied, setCopied]   = useState(false);

  // Cerrar la edición si la nota se colapsa
  useEffect(() => { if (!expanded) setEditing(false); }, [expanded]);

  const startEdit = () => { setDraft(note.text); setEditing(true); };

  // Edición solicitada por teclado (nw-panel-action: edit)
  useEffect(() => {
    if (editRequest && editRequest.id === note.id) { setDraft(note.text); setEditing(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRequest]);

  const wrapRef = useRef(null);
  useEffect(() => {
    if (kbActive) wrapRef.current?.scrollIntoView({ block: "nearest" });
  }, [kbActive]);
  const saveEdit = () => {
    const t = draft.trim();
    if (t) onEdit(note.id, t);
    setEditing(false);
  };
  const copy = () => {
    navigator.clipboard?.writeText(note.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div ref={wrapRef} style={{
      padding: "5px 7px", marginBottom: "4px",
      background: isPinned ? "#0d0c00" : "#0a0a00",
      border: `1px solid ${isPinned ? Y + "33" : "#111"}`,
      transition: "border-color 0.15s",
      ...(kbActive ? KB_HIGHLIGHT : {}),
    }}
      onMouseOver={e => e.currentTarget.style.borderColor = isPinned ? Y + "66" : "#222"}
      onMouseOut={e => e.currentTarget.style.borderColor = isPinned ? Y + "33" : "#111"}
    >
      {editing ? (
        <textarea
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
            if (e.key === "Escape") { e.stopPropagation(); setEditing(false); }
          }}
          rows={3}
          style={{
            width: "100%", background: "#0a0a00", border: `1px solid ${G}`,
            color: "#ccc", fontFamily: "var(--font-mono)", fontSize: "10px",
            padding: "3px 5px", outline: "none", resize: "none", lineHeight: "1.4",
          }}
        />
      ) : (
        <div
          onClick={() => onToggle(note.id)}
          style={{
            fontFamily: "var(--font-mono)", fontSize: "10px",
            color: "#ccc", lineHeight: "1.5",
            whiteSpace: "pre-wrap", wordBreak: "break-word", cursor: "pointer",
          }}
        >
          {note.text}
        </div>
      )}
      {expanded && !editing && (
        <div style={{
          background: "#111", borderLeft: `2px solid ${G}`,
          padding: "4px 8px", marginTop: "3px",
          display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap",
        }}>
          <button style={{ ...ACT_BTN, color: Y }} onClick={startEdit}>Editar</button>
          <button style={{ ...ACT_BTN, color: copied ? G : DIM }} onClick={copy}>
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      )}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: "3px",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "7px", color: "#777" }}>
          {note.time}
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          <span
            onClick={() => onPin(note.id)}
            title={isPinned ? "Desfijar" : "Fijar arriba"}
            style={{
              fontFamily: "var(--font-mono)", fontSize: "9px",
              color: isPinned ? Y : "#777", cursor: "pointer",
            }}
            onMouseOver={e => e.currentTarget.style.color = Y}
            onMouseOut={e => e.currentTarget.style.color = isPinned ? Y : "#777"}
          >{isPinned ? "★" : "☆"}</span>
          <span
            onClick={() => onDelete(note.id)}
            title="Eliminar"
            style={{
              fontFamily: "var(--font-mono)", fontSize: "10px",
              color: "#777", cursor: "pointer",
            }}
            onMouseOver={e => e.currentTarget.style.color = R}
            onMouseOut={e => e.currentTarget.style.color = "#777"}
          >×</span>
        </div>
      </div>
    </div>
  );
}

function NotesPanel({ open, focused, onFocus, onOverlay, minimized, onMinimize }) {
  const [notes, setNotes] = useState(() => loadNotes());
  const [input, setInput] = useState("");
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const inputRef = useRef(null);

  const toggleExpanded = useCallback((id) => {
    setExpanded(prev => prev === id ? null : id);
  }, []);

  const editNote = useCallback((id, text) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, text } : n));
  }, []);

  useEffect(() => { saveNotes(notes); }, [notes]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 80); }, [open]);

  const addNote = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const now = new Date();
    const time = now.toLocaleString("es-ES", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
    setNotes(prev => [{
      id: Date.now(), text, time, pinned: false,
    }, ...prev]);
    setInput("");
  }, [input]);

  const deleteNote = useCallback((id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  const togglePin = useCallback((id) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  }, []);

  const clearAll = useCallback(() => {
    setNotes([]);
  }, []);

  const pinned   = notes.filter(n => n.pinned);
  const unpinned = notes.filter(n => !n.pinned);
  const sorted   = [...pinned, ...unpinned];

  const [kbIndex, setKbIndex] = useKeyboardNav("notes", sorted.length, focused);
  const [editRequest, setEditRequest] = useState(null);

  // Mantener kbIndex dentro de rango si cambia la lista
  useEffect(() => {
    if (focused && sorted.length > 0 && kbIndex >= sorted.length) setKbIndex(sorted.length - 1);
  }, [sorted.length, kbIndex, focused, setKbIndex]);

  const sortedRef = useRef(sorted);
  sortedRef.current = sorted;
  const kbIndexRef = useRef(kbIndex);
  kbIndexRef.current = kbIndex;

  useEffect(() => {
    if (!focused) return;
    const onAction = (e) => {
      if (e.detail.panel !== "notes") return;
      const note = sortedRef.current[kbIndexRef.current];
      if (!note) return;
      switch (e.detail.action) {
        case "enter":
        case "space":
          toggleExpanded(note.id); break;
        case "copy":
          navigator.clipboard?.writeText(note.text); break;
        case "edit":
          setExpanded(note.id);
          setEditRequest({ id: note.id, n: Date.now() }); break;
        case "delete":
          deleteNote(note.id); break;
        case "open":
          togglePin(note.id); break;
        default: break;
      }
    };
    window.addEventListener("nw-panel-action", onAction);
    return () => window.removeEventListener("nw-panel-action", onAction);
  }, [focused, toggleExpanded, deleteNote, togglePin]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
      width:      open ? (focused ? "350px" : "220px") : "0px",
      minWidth:   open ? (focused ? "350px" : "220px") : "0px",
      overflow:   "hidden",
      background: "#020200",
      borderLeft: open ? "1px solid #39FF14" : "none",
      flexShrink: 0,
      transition: "width 0.2s ease, min-width 0.2s ease, box-shadow 0.2s ease",
      display:    "flex",
      flexDirection: "column",
      boxShadow: hovered && open ? "0 0 12px rgba(57, 255, 20, 0.3)" : "none",
    }}>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", height: minimized ? "28px" : "100%", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "12px 14px 0 14px" }} onDoubleClick={onOverlay}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "4px", cursor: "pointer" }} onClick={onFocus}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: G, letterSpacing: "0.1em" }}>
                ◈ NOTES {focused ? "⊟" : ""}
              </span>
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "9px", color: DIM }}>
                {notes.length}
              </span>
              <WinControls minimized={minimized} onMinimize={onMinimize} onOverlay={onOverlay} color={G} dim={DIM} />
            </div>
          </div>

          {!minimized && <>

          {/* Input */}
          <div style={{ padding: "6px 14px", borderBottom: "1px solid #1a1a00" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); }
              }}
              placeholder="Escribe una nota... (Enter enviar, Shift+Enter nueva linea)"
              rows={2}
              style={{
                width: "100%", background: "#0a0a00", border: "1px solid #1a1a00",
                color: "#ccc", fontFamily: "var(--font-mono)", fontSize: "10px",
                padding: "5px 6px", outline: "none", resize: "none",
                lineHeight: "1.4",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "3px" }}>
              <button
                onClick={addNote}
                style={{
                  background: "transparent",
                  border: `1px solid ${input.trim() ? G : "#1a1a00"}`,
                  color: input.trim() ? G : "#777",
                  fontFamily: "var(--font-mono)", fontSize: "9px",
                  padding: "1px 10px", cursor: input.trim() ? "pointer" : "default",
                }}
              >+ nota</button>
            </div>
          </div>

          {/* Notes list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px" }}>
            {sorted.length === 0 ? (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#777", textAlign: "center", marginTop: "20px" }}>
                Sin notas todavia.<br/>
                <span style={{ color: DIM }}>nw note "texto"</span> desde la terminal
              </div>
            ) : (
              sorted.map((note, idx) => (
                <NoteItem
                  key={note.id} note={note}
                  kbActive={focused && idx === kbIndex}
                  editRequest={editRequest}
                  expanded={expanded === note.id}
                  onToggle={toggleExpanded}
                  onDelete={deleteNote} onPin={togglePin} onEdit={editNote}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: "4px 14px", borderTop: "1px solid #1a1a00",
            fontFamily: "var(--font-mono)", fontSize: "8px", color: "#777",
            display: "flex", justifyContent: "space-between",
          }}>
            <span>Alt+P ciclar</span>
            {notes.length > 0 && (
              <span
                onClick={clearAll}
                style={{ cursor: "pointer" }}
                onMouseOver={e => e.currentTarget.style.color = R}
                onMouseOut={e => e.currentTarget.style.color = "#777"}
              >borrar todo</span>
            )}
          </div>
          </>}
        </div>
      )}
    </div>
  );
}

export default memo(NotesPanel);
