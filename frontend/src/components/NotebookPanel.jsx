import { useState, useEffect, useCallback, useRef, memo } from "react";

const Y   = "#FCEE0A";
const G   = "#39FF14";
const C   = "var(--nw-accent)";
const M   = "#D9027D";
const R   = "#ff5555";
const DIM = "#333";
const W   = "#E8E8E8";

const NB_KEY = "nw-notebooks";

function loadNotebooks() { try { return JSON.parse(localStorage.getItem(NB_KEY) || "{}"); } catch { return {}; } }
function saveNotebooks(n) { localStorage.setItem(NB_KEY, JSON.stringify(n)); }

async function runCell(code, shell = "pwsh.exe") {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const res = await invoke("run_powershell", { command: code });
    return { stdout: res?.stdout || "", stderr: res?.stderr || "", success: res?.success !== false };
  } catch (e) {
    return { stdout: "", stderr: e.message || "Error ejecutando celda", success: false };
  }
}

function NotebookPanel() {
  const [notebooks, setNotebooks] = useState(loadNotebooks);
  const [activeNb, setActiveNb] = useState(null);
  const [cells, setCells] = useState([]);
  const [nbName, setNbName] = useState("");
  const cellRefs = useRef({});

  useEffect(() => { saveNotebooks(notebooks); }, [notebooks]);

  const createNotebook = useCallback(() => {
    const name = nbName.trim() || `notebook-${Date.now()}`;
    const nb = { name, cells: [{ id: Date.now(), type: "code", content: "", output: "" }], created: new Date().toISOString() };
    setNotebooks(prev => ({ ...prev, [name]: nb }));
    setActiveNb(name);
    setCells(nb.cells);
    setNbName("");
  }, [nbName]);

  const openNotebook = useCallback((name) => {
    const nb = notebooks[name];
    if (nb) {
      setActiveNb(name);
      setCells([...nb.cells]);
    }
  }, [notebooks]);

  const saveCurrentNb = useCallback(() => {
    if (!activeNb) return;
    setNotebooks(prev => ({ ...prev, [activeNb]: { ...prev[activeNb], cells } }));
  }, [activeNb, cells]);

  const deleteNotebook = useCallback((name) => {
    setNotebooks(prev => { const n = { ...prev }; delete n[name]; return n; });
    if (activeNb === name) { setActiveNb(null); setCells([]); }
  }, [activeNb]);

  const addCell = useCallback((type = "code", afterIdx = cells.length - 1) => {
    const newCell = { id: Date.now(), type, content: "", output: "" };
    setCells(prev => {
      const n = [...prev];
      n.splice(afterIdx + 1, 0, newCell);
      return n;
    });
  }, [cells]);

  const updateCell = useCallback((id, content) => {
    setCells(prev => prev.map(c => c.id === id ? { ...c, content } : c));
  }, []);

  const removeCell = useCallback((id) => {
    setCells(prev => prev.filter(c => c.id !== id));
  }, []);

  const executeCell = useCallback(async (id) => {
    const cell = cells.find(c => c.id === id);
    if (!cell || cell.type !== "code") return;
    setCells(prev => prev.map(c => c.id === id ? { ...c, output: "⏳ Ejecutando..." } : c));
    const result = await runCell(cell.content);
    const output = result.stderr ? `${result.stdout}\n⚠ ${result.stderr}` : result.stdout;
    setCells(prev => prev.map(c => c.id === id ? { ...c, output: output.trim() } : c));
  }, [cells]);

  const executeAll = useCallback(async () => {
    for (const cell of cells) {
      if (cell.type === "code" && cell.content.trim()) {
        await executeCell(cell.id);
      }
    }
  }, [cells, executeCell]);

  const toggleCellType = useCallback((id) => {
    setCells(prev => prev.map(c => c.id === id ? { ...c, type: c.type === "code" ? "markdown" : "code", output: "" } : c));
  }, []);

  // List view (no active notebook)
  if (!activeNb) {
    const nbNames = Object.keys(notebooks);
    return (
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: "#050500", fontFamily: "var(--font-mono)" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${G}33`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: G, fontSize: "14px" }}>📓</span>
            <span style={{ color: Y, fontSize: "12px", letterSpacing: "0.15em" }}>NETWATCH NOTEBOOK</span>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
            <input type="text" value={nbName} onChange={e => setNbName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createNotebook()}
              placeholder="Nombre del notebook..."
              style={{ flex: 1, background: "#0a0a00", border: "1px solid #1a1a1a", color: W, fontFamily: "var(--font-mono)", fontSize: "11px", padding: "6px 10px", outline: "none" }}
            />
            <button onClick={createNotebook}
              style={{ background: "transparent", border: `1px solid ${G}`, color: G, fontFamily: "var(--font-mono)", fontSize: "10px", padding: "6px 14px", cursor: "pointer" }}
            >+ NUEVO</button>
          </div>
          {nbNames.length === 0 ? (
            <div style={{ color: DIM, fontSize: "11px", textAlign: "center", padding: "20px" }}>
              Sin notebooks. Crea uno arriba.
            </div>
          ) : (
            nbNames.map(name => {
              const nb = notebooks[name];
              return (
                <div key={name} onClick={() => openNotebook(name)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 12px", border: "1px solid #1a1a1a", marginBottom: "4px",
                    cursor: "pointer", transition: "border-color 0.15s",
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = G}
                  onMouseOut={e => e.currentTarget.style.borderColor = "#1a1a1a"}
                >
                  <div>
                    <div style={{ color: W, fontSize: "11px" }}>{name}</div>
                    <div style={{ color: DIM, fontSize: "9px" }}>{nb.cells?.length || 0} celdas · {new Date(nb.created).toLocaleDateString("es-ES")}</div>
                  </div>
                  <span onClick={e => { e.stopPropagation(); deleteNotebook(name); }}
                    style={{ color: DIM, fontSize: "12px", cursor: "pointer" }}
                    onMouseOver={e => e.currentTarget.style.color = R}
                    onMouseOut={e => e.currentTarget.style.color = DIM}
                  >×</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Active notebook editor
  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: "#050500", fontFamily: "var(--font-mono)" }}>
      {/* Header */}
      <div style={{ padding: "8px 16px", borderBottom: `1px solid ${G}33`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span onClick={() => { saveCurrentNb(); setActiveNb(null); }} style={{ color: DIM, fontSize: "12px", cursor: "pointer" }}
            onMouseOver={e => e.currentTarget.style.color = Y} onMouseOut={e => e.currentTarget.style.color = DIM}
          >◂</span>
          <span style={{ color: Y, fontSize: "11px" }}>{activeNb}</span>
          <span style={{ color: DIM, fontSize: "9px" }}>{cells.length} celdas</span>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          <button onClick={executeAll} style={{ background: "transparent", border: `1px solid ${G}`, color: G, fontFamily: "var(--font-mono)", fontSize: "9px", padding: "2px 8px", cursor: "pointer" }}>▸ RUN ALL</button>
          <button onClick={saveCurrentNb} style={{ background: "transparent", border: `1px solid ${Y}`, color: Y, fontFamily: "var(--font-mono)", fontSize: "9px", padding: "2px 8px", cursor: "pointer" }}>💾 SAVE</button>
          <button onClick={() => addCell("code")} style={{ background: "transparent", border: "1px solid #1a1a1a", color: "#444", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "2px 8px", cursor: "pointer" }}>+ CODE</button>
          <button onClick={() => addCell("markdown")} style={{ background: "transparent", border: "1px solid #1a1a1a", color: "#444", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "2px 8px", cursor: "pointer" }}>+ MD</button>
        </div>
      </div>

      {/* Cells */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {cells.map((cell, idx) => (
          <div key={cell.id} style={{ margin: "4px 12px", border: `1px solid ${cell.type === "code" ? "#1a1a00" : "#0a1a0a"}` }}>
            {/* Cell header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 8px", background: cell.type === "code" ? "#0a0a00" : "#050a05" }}>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span style={{ color: cell.type === "code" ? Y : G, fontSize: "9px" }}>
                  [{idx + 1}] {cell.type === "code" ? "CODE" : "MD"}
                </span>
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                {cell.type === "code" && (
                  <span onClick={() => executeCell(cell.id)} style={{ color: G, fontSize: "10px", cursor: "pointer" }} title="Ejecutar">▸</span>
                )}
                <span onClick={() => toggleCellType(cell.id)} style={{ color: DIM, fontSize: "10px", cursor: "pointer" }} title="Cambiar tipo">⇄</span>
                <span onClick={() => removeCell(cell.id)} style={{ color: DIM, fontSize: "10px", cursor: "pointer" }}
                  onMouseOver={e => e.currentTarget.style.color = R} onMouseOut={e => e.currentTarget.style.color = DIM}
                >×</span>
              </div>
            </div>

            {/* Cell content */}
            <textarea
              value={cell.content}
              onChange={e => updateCell(cell.id, e.target.value)}
              placeholder={cell.type === "code" ? "# Escribe código PowerShell..." : "# Escribe markdown..."}
              rows={Math.max(2, (cell.content.match(/\n/g) || []).length + 1)}
              style={{
                width: "100%", background: "transparent", border: "none", outline: "none",
                color: cell.type === "code" ? Y : "#ccc", fontFamily: "var(--font-mono)",
                fontSize: "11px", padding: "6px 10px", resize: "vertical", lineHeight: "18px",
                boxSizing: "border-box",
              }}
            />

            {/* Cell output */}
            {cell.output && (
              <div style={{
                padding: "6px 10px", borderTop: "1px solid #111",
                background: "#030300", fontSize: "10px", color: "#888",
                whiteSpace: "pre-wrap", maxHeight: "200px", overflow: "auto",
                lineHeight: "16px",
              }}>
                {cell.output}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(NotebookPanel);
