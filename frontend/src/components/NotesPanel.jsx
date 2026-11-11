import { useState, useEffect, useRef, useCallback, memo } from "react";

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

function NoteItem({ note, onDelete, onPin }) {
  const isPinned = note.pinned;
  return (
    <div style={{
      padding: "5px 7px", marginBottom: "4px",
      background: isPinned ? "#0d0c00" : "#0a0a00",
      border: `1px solid ${isPinned ? Y + "33" : "#111"}`,
      transition: "border-color 0.15s",
    }}
      onMouseOver={e => e.currentTarget.style.borderColor = isPinned ? Y + "66" : "#222"}
      onMouseOut={e => e.currentTarget.style.borderColor = isPinned ? Y + "33" : "#111"}
    >
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: "10px",
        color: "#ccc", lineHeight: "1.5",
        whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {note.text}
      </div>
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

function NotesPanel({ open, focused, onFocus, onOverlay }) {
  const [notes, setNotes] = useState(() => loadNotes());
  const [input, setInput] = useState("");
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef(null);

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
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Header */}
          <div style={{ padding: "12px 14px 0 14px" }} onDoubleClick={onOverlay}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", cursor: "pointer" }} onClick={onFocus}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: G, letterSpacing: "0.1em" }}>
                ◈ NOTES {focused ? "⊟" : ""}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: DIM }}>
                {notes.length}
              </span>
            </div>
          </div>

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
              sorted.map(note => (
                <NoteItem key={note.id} note={note} onDelete={deleteNote} onPin={togglePin} />
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
        </div>
      )}
    </div>
  );
}

export default memo(NotesPanel);
