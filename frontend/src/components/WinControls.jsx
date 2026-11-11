// Mini window controls (minimize/restore + maximize) for side panel headers
export default function WinControls({ minimized, onMinimize, onOverlay, color, dim = "#888" }) {
  const btn = {
    fontSize: "10px", color: dim, cursor: "pointer", background: "transparent",
    border: "none", padding: "0 2px", fontFamily: "var(--font-mono)", lineHeight: 1,
  };
  const hover = {
    onMouseOver: e => { e.currentTarget.style.color = color; },
    onMouseOut: e => { e.currentTarget.style.color = dim; },
  };
  return (
    <div style={{ display: "flex", gap: "4px", marginLeft: "8px", flexShrink: 0 }} onDoubleClick={e => e.stopPropagation()}>
      <button onClick={e => { e.stopPropagation(); onMinimize?.(); }} title={minimized ? "Restaurar" : "Minimizar"} style={btn} {...hover}>
        {minimized ? "+" : "—"}
      </button>
      <button onClick={e => { e.stopPropagation(); onOverlay?.(); }} title="Maximizar" style={btn} {...hover}>□</button>
    </div>
  );
}
