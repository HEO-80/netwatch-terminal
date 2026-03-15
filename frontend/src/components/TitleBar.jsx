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

  return (
    <div
      data-tauri-drag-region
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "8px 16px",
        background: "#000000",
        borderBottom: "1px solid #00F0FF",
        flexShrink: 0,
        userSelect: "none",
        height: "42px",
        cursor: "default",
      }}
    >
      {/* macOS dots — NO drag region */}
      <div style={{ display: "flex", gap: "6px" }} data-tauri-drag-region="false">
        {[
          { color: "#ff5555", action: handleClose },
          { color: "#ffcb6b", action: handleMinimize },
          { color: "#4ec994", action: null },
        ].map((dot, i) => (
          <span
            key={i}
            onClick={(e) => { e.stopPropagation(); dot.action?.(); }}
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

      <div style={{ width: 1, height: 20, background: "#00F0FF", opacity: 0.3 }}/>
      <span style={{ color: "#00F0FF", fontSize: "11px", opacity: 0.7 }}>▣</span>

      {/* Title — drag region */}
      <span
        data-tauri-drag-region
        style={{
          flex: 1,
          textAlign: "center",
          fontSize: "11px",
          color: "#FCEE0A",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          cursor: "grab",
        }}
      >
        {title}
        <span style={{ color: "#666", margin: "0 8px" }}>·</span>
        <span style={{ color: "#39FF14" }}>{subtitle}</span>
      </span>

      {/* Toggle button */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
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
        }}
        onMouseOver={e => { e.target.style.background = "#00F0FF"; e.target.style.color = "#000"; }}
        onMouseOut={e => { e.target.style.background = "transparent"; e.target.style.color = "#00F0FF"; }}
      >
        {screen === "dashboard" ? "▸ terminal" : "▣ dashboard"}
      </button>

      <span style={{ fontSize: "10px", color: "#333", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
        Alt+T · ESC
      </span>
    </div>
  );
}
