import { useState, useEffect, useCallback, useRef, memo } from "react";
import WinControls from "./WinControls";
import { useKeyboardNav, KB_HIGHLIGHT } from "../hooks/useKeyboardNav";

const Y   = "#FCEE0A";
const G   = "#39FF14";
const C   = "var(--nw-accent)";
const M   = "#D9027D";
const R   = "#ff5555";
const DIM = "#888";

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

function SectionTitle({ children, color = C, count, isOver }) {
  return (
    <div style={{
      fontFamily: "var(--font-mono)", fontSize: "9px", color,
      letterSpacing: "0.12em", textTransform: "uppercase",
      borderBottom: isOver ? `1px solid ${color}` : "1px solid #1a1a1a",
      paddingBottom: "4px", marginBottom: "6px", marginTop: "12px",
      display: "flex", justifyContent: "space-between",
      transition: "border-color 0.15s",
    }}>
      <span>{children}</span>
      {count > 0 && <span style={{ color: DIM }}>{count}</span>}
    </div>
  );
}

function TaskItem({ task, onMove, onDelete, onDragStart, onDragEnd, isDragging, kbActive }) {
  const col = COLUMNS.find(c => c.id === task.status) || COLUMNS[0];
  const nextStatus = task.status === "todo" ? "doing" : task.status === "doing" ? "done" : null;
  const prevStatus = task.status === "done" ? "doing" : task.status === "doing" ? "todo" : null;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(task.id));
        e.dataTransfer.effectAllowed = "move";
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
      style={{
        display: "flex", alignItems: "flex-start", gap: "6px",
        padding: "4px 6px", marginBottom: "3px",
        background: isDragging ? "#1a1a00" : "#0a0a00",
        border: isDragging ? `1px dashed ${Y}44` : "1px solid #2a2a2a",
        opacity: isDragging ? 0.5 : 1,
        cursor: "grab",
        transition: "border-color 0.15s, opacity 0.15s",
        ...(kbActive ? KB_HIGHLIGHT : {}),
      }}
      onMouseOver={e => { if (!isDragging) e.currentTarget.style.borderColor = col.color + "44"; }}
      onMouseOut={e => { if (!isDragging) e.currentTarget.style.borderColor = "#2a2a2a"; }}
    >
      {/* Drag handle + advance */}
      <span style={{ color: "#777", fontSize: "8px", cursor: "grab", flexShrink: 0, marginTop: "2px", userSelect: "none" }}>⠿</span>

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
        color: task.status === "done" ? "#999" : "#ccc",
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
            style={{ color: "#777", cursor: "pointer", fontSize: "9px", fontFamily: "var(--font-mono)" }}
            onMouseOver={e => e.currentTarget.style.color = Y}
            onMouseOut={e => e.currentTarget.style.color = "#777"}
          >◂</span>
        )}
        <span
          onClick={() => onDelete(task.id)}
          title="Eliminar"
          style={{ color: "#777", cursor: "pointer", fontSize: "10px", fontFamily: "var(--font-mono)" }}
          onMouseOver={e => e.currentTarget.style.color = R}
          onMouseOut={e => e.currentTarget.style.color = "#777"}
        >×</span>
      </div>
    </div>
  );
}

function DropZone({ columnId, color, isOver, onDrop, children }) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
      onDragEnter={(e) => e.preventDefault()}
      onDrop={onDrop}
      style={{
        minHeight: "24px",
        borderRadius: "2px",
        background: isOver ? (color + "0a") : "transparent",
        border: isOver ? `1px dashed ${color}44` : "1px dashed transparent",
        transition: "background 0.15s, border-color 0.15s",
        padding: isOver ? "2px" : "0",
      }}
    >
      {children}
      {isOver && (
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: "8px", color: color + "66",
          textAlign: "center", padding: "4px 0",
        }}>
          soltar aqui
        </div>
      )}
    </div>
  );
}

function TasksPanel({ open, focused, onFocus, onOverlay, minimized, onMinimize }) {
  const [tasks, setTasks] = useState(() => loadTasks());
  const [input, setInput] = useState("");
  const [draggingId, setDraggingId] = useState(null);
  const [overColumn, setOverColumn] = useState(null);
  const [hovered, setHovered] = useState(false);
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

  const handleDragStart = useCallback((id) => setDraggingId(id), []);
  const handleDragEnd = useCallback(() => { setDraggingId(null); setOverColumn(null); }, []);

  const handleColumnDragOver = useCallback((colId) => {
    setOverColumn(prev => prev === colId ? prev : colId);
  }, []);

  const handleColumnDragLeave = useCallback((colId) => {
    setOverColumn(prev => prev === colId ? null : prev);
  }, []);

  const handleDrop = useCallback((colId, e) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData("text/plain"));
    if (taskId && !isNaN(taskId)) {
      moveTask(taskId, colId);
    }
    setDraggingId(null);
    setOverColumn(null);
  }, [moveTask]);

  const byStatus = (status) => tasks.filter(t => t.status === status);

  const navTasks = COLUMNS.flatMap(c => byStatus(c.id));
  const [kbIndex, setKbIndex] = useKeyboardNav("tasks", navTasks.length, focused);

  useEffect(() => {
    if (!focused) return;
    const onAction = (e) => {
      if (e.detail.panel !== "tasks") return;
      const task = navTasks[kbIndex];
      if (!task) return;
      const action = e.detail.action;
      if (action === "enter" || action === "space") {
        const order = ["todo", "doing", "done"];
        const idx = order.indexOf(task.status);
        const next = order[action === "enter" ? idx + 1 : idx - 1];
        if (!next) return;
        moveTask(task.id, next);
        // keep highlight on the moved task (list order is grouped by status)
        const moved = navTasks.map(t => t.id === task.id ? { ...t, status: next } : t);
        const newOrder = COLUMNS.flatMap(c => moved.filter(t => t.status === c.id));
        setKbIndex(newOrder.findIndex(t => t.id === task.id));
      } else if (action === "copy") {
        navigator.clipboard?.writeText(task.text).catch(() => {});
      } else if (action === "delete") {
        deleteTask(task.id);
        setKbIndex(Math.min(kbIndex, navTasks.length - 2));
      }
    };
    window.addEventListener("nw-panel-action", onAction);
    return () => window.removeEventListener("nw-panel-action", onAction);
  });

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
      width:      open ? (focused ? "350px" : "220px") : "0px",
      minWidth:   open ? (focused ? "350px" : "220px") : "0px",
      overflow:   "hidden",
      background: "#020200",
      borderLeft: open ? "1px solid #FCEE0A" : "none",
      flexShrink: 0,
      transition: "width 0.2s ease, min-width 0.2s ease, box-shadow 0.2s ease",
      display:    "flex",
      flexDirection: "column",
      boxShadow: hovered && open ? "0 0 12px rgba(252, 238, 10, 0.3)" : "none",
    }}>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", height: minimized ? "28px" : "100%", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "12px 14px 0 14px" }} onDoubleClick={onOverlay}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "4px", cursor: "pointer" }} onClick={onFocus}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: Y, letterSpacing: "0.1em" }}>
                ◈ TASKS {focused ? "⊟" : ""}
              </span>
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "9px", color: DIM }}>
                {tasks.length}
              </span>
              <WinControls minimized={minimized} onMinimize={onMinimize} onOverlay={onOverlay} color={Y} dim={DIM} />
            </div>
          </div>

          {!minimized && <>
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
                  color: input.trim() ? Y : "#777",
                  fontFamily: "var(--font-mono)", fontSize: "10px",
                  padding: "2px 8px", cursor: input.trim() ? "pointer" : "default",
                }}
                onMouseOver={e => { if (input.trim()) e.currentTarget.style.borderColor = Y; }}
                onMouseOut={e => e.currentTarget.style.borderColor = "#1a1a00"}
              >+</button>
            </div>
          </div>

          {/* Task lists with drag & drop */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 12px 14px" }}>
            {COLUMNS.map(col => {
              const items = byStatus(col.id);
              const isOver = overColumn === col.id && draggingId !== null;
              return (
                <div
                  key={col.id}
                  onDragOver={(e) => { e.preventDefault(); handleColumnDragOver(col.id); }}
                  onDragLeave={() => handleColumnDragLeave(col.id)}
                  onDrop={(e) => handleDrop(col.id, e)}
                >
                  <SectionTitle color={col.color} count={items.length} isOver={isOver}>
                    {col.icon} {col.label}
                  </SectionTitle>
                  <DropZone columnId={col.id} color={col.color} isOver={isOver && items.length === 0}>
                    {items.length === 0 && !isOver && (
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#777", padding: "2px 0" }}>
                        —
                      </div>
                    )}
                    {items.map(task => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onMove={moveTask}
                        onDelete={deleteTask}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        isDragging={draggingId === task.id}
                        kbActive={navTasks[kbIndex]?.id === task.id}
                      />
                    ))}
                  </DropZone>
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
                    color: "#777", fontFamily: "var(--font-mono)", fontSize: "8px",
                    padding: "2px 10px", cursor: "pointer",
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = R; e.currentTarget.style.color = R; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = "#1a1a00"; e.currentTarget.style.color = "#777"; }}
                >limpiar completadas</button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: "4px 14px", borderTop: "1px solid #1a1a00",
            fontFamily: "var(--font-mono)", fontSize: "8px", color: "#777", textAlign: "center",
          }}>
            arrastra tareas entre columnas · Alt+P ciclar
          </div>
          </>}
        </div>
      )}
    </div>
  );
}

export default memo(TasksPanel);
