export default function TitleBar({ title = "NETWATCH OS V2.077", subtitle = "HEO-80", onNewTab, activeTabLabel }) {

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

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      const isMax = await win.isMaximized();
      isMax ? await win.unmaximize() : await win.maximize();
    } catch {}
  };

  return (
    <div
      data-tauri-drag-region
      style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "0 16px",
        background: "#000000",
        borderBottom: "1px solid #00F0FF",
        flexShrink: 0, height: "40px",
        userSelect: "none",
      }}
    >
      {/* Dots — NO drag */}
      <div style={{ display: "flex", gap: "6px" }}>
        {[
          { color: "#ff5555", action: handleClose,    title: "Cerrar" },
          { color: "#ffcb6b", action: handleMinimize, title: "Minimizar" },
          { color: "#4ec994", action: handleMaximize, title: "Maximizar" },
        ].map((dot, i) => (
          <span
            key={i}
            onClick={(e) => { e.stopPropagation(); dot.action(); }}
            title={dot.title}
            style={{
              width: 12, height: 12, borderRadius: "50%",
              background: dot.color, cursor: "pointer",
              display: "inline-block", flexShrink: 0,
              transition: "filter 0.15s",
            }}
            onMouseOver={e => e.target.style.filter = "brightness(1.4)"}
            onMouseOut={e => e.target.style.filter = "brightness(1)"}
          />
        ))}
      </div>

      <div style={{ width: 1, height: 18, background: "#1a1a1a" }}/>

      {/* Icono */}
      <span style={{ color: "#00F0FF", fontSize: "11px", opacity: 0.6 }}>▣</span>

      {/* Título — drag region */}
      <span
        data-tauri-drag-region
        style={{
          flex: 1, textAlign: "center",
          fontSize: "11px", color: "#FCEE0A",
          letterSpacing: "0.18em", textTransform: "uppercase",
          fontFamily: "var(--font-mono)", fontWeight: 700,
          cursor: "grab",
        }}
      >
        {title}
        <span style={{ color: "#333", margin: "0 8px" }}>·</span>
        <span style={{ color: "#39FF14" }}>{subtitle}</span>
        {activeTabLabel && (
          <span style={{ color: "#444", marginLeft: 12, fontSize: "10px", fontWeight: 400 }}>
            — {activeTabLabel}
          </span>
        )}
      </span>

      {/* Hints teclado */}
      <div style={{
        display: "flex", gap: "10px", alignItems: "center",
        fontFamily: "var(--font-mono)", fontSize: "9px", color: "#333",
      }}>
        <span><span style={{ color: "#FCEE0A" }}>Alt+T</span> nueva PS</span>
        <span><span style={{ color: "#FCEE0A" }}>Alt+D</span> dashboard</span>
        <span><span style={{ color: "#FCEE0A" }}>Alt+W</span> cerrar tab</span>
        <span><span style={{ color: "#FCEE0A" }}>Alt+1-9</span> saltar</span>
      </div>
    </div>
  );
}
