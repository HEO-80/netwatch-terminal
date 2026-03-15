export default function TitleBar({ title = "NETWATCH OS V2.077", subtitle = "HEO-80", screen, onToggle }) {

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch { window.close(); }
  };

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().minimize();
    } catch {}
  };

  const handleMouseDown = async (e) => {
    if (e.target.closest(".nw-dot") || e.target.closest(".nw-btn")) return;
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().startDragging();
    } catch {}
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "8px 16px",
        background: "#000000",
        borderBottom: "1px solid #00F0FF",
        flexShrink: 0,
        cursor: "grab",
        userSelect: "none",
        height: "42px",
      }}
    >
      {/* macOS dots */}
      <div style={{ display: "flex", gap: "6px" }}>
        {[
          { color: "#ff5555", action: handleClose,    title: "Close" },
          { color: "#ffcb6b", action: handleMinimize, title: "Minimize" },
          { color: "#4ec994", action: null,            title: "" },
        ].map((dot, i) => (
          <span
            key={i}
            className="nw-dot"
            onClick={dot.action || undefined}
            style={{
              width: 12, height: 12,
              borderRadius: "50%",
              background: dot.color,
              cursor: dot.action ? "pointer" : "default",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
        ))}
      </div>

      {/* Separador vertical */}
      <div style={{ width: 1, height: 20, background: "#00F0FF", opacity: 0.3 }}/>

      {/* Icono terminal */}
      <span style={{ color: "#00F0FF", fontSize: "11px", opacity: 0.7 }}>▣</span>

      {/* Title centrado */}
      <span style={{
        flex: 1,
        textAlign: "center",
        fontSize: "11px",
        color: "#FCEE0A",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
      }}>
        {title}
        <span style={{ color: "#666", margin: "0 8px" }}>·</span>
        <span style={{ color: "#39FF14" }}>{subtitle}</span>
      </span>

      {/* Botón toggle dashboard/terminal */}
      <button
        className="nw-btn"
        onClick={onToggle}
        style={{
          background: "transparent",
          border: "1px solid #00F0FF",
          color: "#00F0FF",
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          letterSpacing: "0.1em",
          padding: "3px 10px",
          cursor: "pointer",
          textTransform: "uppercase",
          transition: "all 0.15s",
        }}
        onMouseOver={e => { e.target.style.background = "#00F0FF"; e.target.style.color = "#000"; }}
        onMouseOut={e => { e.target.style.background = "transparent"; e.target.style.color = "#00F0FF"; }}
      >
        {screen === "dashboard" ? "▸ terminal" : "▣ dashboard"}
      </button>

      {/* ESC hint */}
      <span style={{
        fontSize: "10px",
        color: "#444",
        letterSpacing: "0.06em",
        fontFamily: "var(--font-mono)",
      }}>
        ESC para cerrar
      </span>
    </div>
  );
}
