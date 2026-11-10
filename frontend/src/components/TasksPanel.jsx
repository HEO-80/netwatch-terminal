import { useState, useEffect, useCallback, useRef } from "react";

const Y   = "#FCEE0A";
const G   = "#39FF14";
const C   = "#00F0FF";
const M   = "#D9027D";
const R   = "#ff5555";
const DIM = "#444";

const STORAGE_KEY = "nw-tasks";

const COLUMNS = [
  { id: "todo",    label: "PENDIENTE", color: Y, icon: "○" },
  { id: "doing",   label: "EN CURSO",  color: C, icon: "◎" },
  { id: "done",    label: "HECHO",     color: G, icon: "●" },
];

function loadTasks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function SectionTitle({ children, color = C, count }) {
  return (
    <div style={{
      fontFamily: "var(--font-mono)", fontSize: "9px", color,
      letterSpacing: "0.12em", textTransform: "uppercase",
      borderBottom: "1px solid #1a1a1a",
      paddingBottom: "4px", marginBottom: "6px", marginTop: "12px",
      display: "flex", justifyContent: "space-between",
    }}>
      <span>{children}</span>
      {count > 0 && <span style={{ color: DIM }}>{count}</span>}
    </div>
  );
}

function TaskItem({ task, onMove, onDelete }) {
  const col = COLUMNS.find(c => c.id === task.status) || COLUMNS[0];
  const nextStatus = task.status === "todo" ? "doing" : task.status === "doing" ? "done" : null;
  const prevStatus = task.status === "done" ? "doing" : task.status === "doing" ? "todo" : null;

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "6px",
      padding: "4px 6px", marginBottom: "3px",
      background: "#0a0a00", border: "1px solid #111",
      transition: "border-color 0.15s",
    }}
      onMouseOver={e => e.currentTarget.style.borderColor = col.color + "44"}
      onMouseOut={e => e.currentTarget.style.borderColor = "#111"}
    >
      {/* Advance button */}
      {nextStatus && (
        <span
          onClick={() => onMove(task.id, nextStatus)}
          title={nextStatus === "doing" ? "Empezar" : "Completar"}
          style={{
            color: nextStatus === "done" ? G : C,
            cursor: "pointer", fontSize: "10px", flexShrink: 0, marginTop: "1px",
            fontFamily: "var(--font-mono)",
          }}
          onMouseOver={e => e.currentTarget.style.opacity = "0.6"}
          onMouseOut={e => e.currentTarget.style.opacity = "1"}
        >▸</span>
      )}
      {!nextStatus && (
        <span style={{ color: G, fontSize: "10px", flexShrink: 0, marginTop: "1px", fontFamily: "var(--font-mono)" }}>✓</span>
      )}

      {/* Text */}
      <span style={{
        flex: 1, fontFamily: "var(--font-mono)", fontSize: "10px",
        color: task.status === "done" ? "#555" : "#ccc",
        textDecoration: task.status === "done" ? "line-through" : "none",
        lineHeight: "1.4", wordBreak: "break-word",
      }}>
        {task.text}
      </span>

      {/* Controls */}
      <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
        {prevStatus && (
          <span
            onClick={() => onMove(task.id, prevStatus)}
            title="Retroceder"
            style={{ color: "#333", cursor: "pointer", fontSize: "9px", fontFamily: "var(--font-mono)" }}
            onMouseOver={e => e.currentTarget.style.color = Y}
            onMouseOut={e => e.currentTarget.style.color = "#333"}
          >◂</span>
        )}
        <span
          onClick={() => onDelete(task.id)}
          title="Eliminar"
          style={{ color: "#333", cursor: "pointer", fontSize: "10px", fontFamily: "var(--font-mono)" }}
          onMouseOver={e => e.currentTarget.style.color = R}
          onMouseOut={e => e.currentTarget.style.color = "#333"}
        >×</span>
      </div>
    </div>
  );
}

export default function TasksPanel({ open }) {
  const [tasks, setTasks] = useState(() => loadTasks());
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { saveTasks(tasks); }, [tasks]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 80); }, [open]);

  const addTask = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setTasks(prev => [...prev, { id: Date.now(), text, status: "todo", created: new Date().toISOString() }]);
    setInput("");
  }, [input]);

  const moveTask = useCallback((id, newStatus) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearDone = useCallback(() => {
    setTasks(prev => prev.filter(t => t.status !== "done"));
  }, []);

  const byStatus = (status) => tasks.filter(t => t.status === status);

  return (
    <div style={{
      width:      open ? "220px" : "0px",
      minWidth:   open ? "220px" : "0px",
      overflow:   "hidden",
      background: "#020200",
      borderLeft: open ? "1px solid #FCEE0A" : "none",
      flexShrink: 0,
      transition: "width 0.2s ease, min-width 0.2s ease",
      display:    "flex",
      flexDirection: "column",
    }}>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Header */}
          <div style={{ padding: "12px 14px 0 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: Y, letterSpacing: "0.1em" }}>
                ◈ TASKS
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: DIM }}>
                {tasks.length}
              </span>
            </div>
          </div>

          {/* Input */}
          <div style={{ padding: "6px 14px", borderBottom: "1px solid #1a1a00" }}>
            <div style={{ display: "flex", gap: "4px" }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addTask(); }}
                placeholder="+ nueva tarea..."
                style={{
                  flex: 1, background: "#0a0a00", border: "1px solid #1a1a00",
                  color: "#ccc", fontFamily: "var(--font-mono)", fontSize: "10px",
                  padding: "4px 6px", outline: "none",
                }}
              />
              <button
                onClick={addTask}
                style={{
                  background: "transparent", border: "1px solid #1a1a00",
                  color: input.trim() ? Y : "#222",
                  fontFamily: "var(--font-mono)", fontSize: "10px",
                  padding: "2px 8px", cursor: input.trim() ? "pointer" : "default",
                }}
                onMouseOver={e => { if (input.trim()) e.currentTarget.style.borderColor = Y; }}
                onMouseOut={e => e.currentTarget.style.borderColor = "#1a1a00"}
              >+</button>
            </div>
          </div>

          {/* Task lists */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 12px 14px" }}>
            {COLUMNS.map(col => {
              const items = byStatus(col.id);
              return (
                <div key={col.id}>
                  <SectionTitle color={col.color} count={items.length}>
                    {col.icon} {col.label}
                  </SectionTitle>
                  {items.length === 0 && (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#222", padding: "2px 0" }}>
                      —
                    </div>
                  )}
                  {items.map(task => (
                    <TaskItem key={task.id} task={task} onMove={moveTask} onDelete={deleteTask} />
                  ))}
                </div>
              );
            })}

            {/* Clear done */}
            {byStatus("done").length > 0 && (
              <div style={{ marginTop: "10px", textAlign: "center" }}>
                <button
                  onClick={clearDone}
                  style={{
                    background: "transparent", border: "1px solid #1a1a00",
                    color: "#333", fontFamily: "var(--font-mono)", fontSize: "8px",
                    padding: "2px 10px", cursor: "pointer",
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = R; e.currentTarget.style.color = R; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = "#1a1a00"; e.currentTarget.style.color = "#333"; }}
                >limpiar completadas</button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: "4px 14px", borderTop: "1px solid #1a1a00",
            fontFamily: "var(--font-mono)", fontSize: "8px", color: "#222", textAlign: "center",
          }}>
            Alt+P para ciclar paneles
          </div>
        </div>
      )}
    </div>
  );
}
