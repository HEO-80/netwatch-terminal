import { useState, useEffect, useRef, useCallback, memo } from "react";

const C   = "var(--nw-accent)";
const Y   = "#FCEE0A";
const G   = "#39FF14";
const M   = "#D9027D";
const DIM = "#888";

const CATEGORIES = [
  {
    label: "NW COMMANDS",
    color: Y,
    items: [
      { cmd: "nw help",              desc: "Mostrar ayuda de comandos" },
      { cmd: "nw status",            desc: "Resumen del sistema" },
      { cmd: "nw config",            desc: "Abrir panel de Settings / API keys" },
      { cmd: "nw theme cyan",        desc: "Cambiar tema a Cyan" },
      { cmd: "nw theme red",         desc: "Cambiar tema a Rojo" },
      { cmd: "nw theme green",       desc: "Cambiar tema a Verde" },
      { cmd: "nw theme yellow",      desc: "Cambiar tema a Amarillo" },
      { cmd: "nw theme magenta",     desc: "Cambiar tema a Magenta" },
      { cmd: "nw theme matrix",      desc: "Tema Matrix (verde)" },
      { cmd: "nw theme blade-runner", desc: "Tema Blade Runner (rojo)" },
      { cmd: "nw theme ghost",       desc: "Tema Ghost in Shell (magenta)" },
      { cmd: "nw dojo",              desc: "Abrir tab DOJO (entrenamiento)" },
      { cmd: "nw dojo tatami",       desc: "Misiones guiadas paso a paso" },
      { cmd: "nw dojo quiz",         desc: "Preguntas de entrenamiento" },
      { cmd: "nw dojo forja",        desc: "Escribir scripts con validación" },
      { cmd: "nw notebook",          desc: "Abrir tab NOTEBOOK" },
    ],
  },
  {
    label: "RUST DSL ⚡",
    color: G,
    items: [
      { cmd: "nw proc",              desc: "Lista procesos (top CPU)" },
      { cmd: "nw ports",             desc: "Puertos TCP escuchando" },
      { cmd: "nw kill",              desc: "Matar proceso por nombre/PID" },
      { cmd: "nw find",              desc: "Buscar archivos por patrón" },
      { cmd: "nw size",              desc: "Archivos más grandes" },
      { cmd: "nw dupes",             desc: "Encontrar archivos duplicados" },
      { cmd: "nw hash",              desc: "SHA-256 de un archivo" },
      { cmd: "nw diff",              desc: "Comparar dos archivos" },
      { cmd: "nw clean --dry",       desc: "Limpiar logs/tmp/bak (dry-run)" },
      { cmd: "nw env list",          desc: "Variables de entorno NETWATCH" },
    ],
  },
  {
    label: "TASKS & NOTES",
    color: M,
    items: [
      { cmd: "nw task",              desc: "Listar tareas" },
      { cmd: "nw task add",          desc: "Añadir tarea nueva" },
      { cmd: "nw note",              desc: "Listar notas" },
      { cmd: "nw note add",          desc: "Crear nota rápida" },
      { cmd: "nw note export",       desc: "Exportar notas como markdown" },
    ],
  },
  {
    label: "CRYPTO & GIT",
    color: C,
    items: [
      { cmd: "nw eth",               desc: "Precios BTC/ETH + gas" },
      { cmd: "nw repos",             desc: "Repos git: rama, estado" },
      { cmd: "nw ssh",               desc: "Servidores SSH guardados" },
      { cmd: "nw deploy",            desc: "Detectar proyecto + deploy" },
    ],
  },
  {
    label: "AI & OUTPUT",
    color: "#39FF14",
    items: [
      { cmd: "nw ai",                desc: "Preguntar a Claude AI" },
      { cmd: "nw json",              desc: "Ejecutar cmd y formatear JSON" },
      { cmd: "nw fix",               desc: "Sugerir fix para último error" },
    ],
  },
  {
    label: "TOOLS",
    color: M,
    items: [
      { cmd: "nw ctx",               desc: "Contexto del proyecto actual" },
      { cmd: "nw clip",              desc: "Clipboard manager" },
      { cmd: "nw rec start",         desc: "Grabar sesión de terminal" },
      { cmd: "nw rec stop",          desc: "Parar grabación" },
      { cmd: "nw rec list",          desc: "Listar grabaciones" },
      { cmd: "nw tail",              desc: "Monitorizar archivo de log" },
      { cmd: "nw docker ps",         desc: "Contenedores Docker activos" },
      { cmd: "nw docker logs",       desc: "Logs de un contenedor" },
    ],
  },
  {
    label: "SNIPPETS",
    color: DIM,
    items: [
      { cmd: "nw snip ls",           desc: "Listar snippets guardados" },
      { cmd: "nw snip add",          desc: "Guardar nuevo snippet" },
      { cmd: "nw snip run",          desc: "Ejecutar snippet con templates" },
      { cmd: "nw snip edit",         desc: "Ver snippet y variables" },
    ],
  },
  {
    label: "QUICK RUN",
    color: G,
    get items() { return getContextItems(); },
  },
  {
    label: "ECOSYSTEM",
    color: "#00F0FF",
    items: [
      { cmd: "nw theme create",       desc: "Crear tema custom" },
      { cmd: "nw theme delete",       desc: "Eliminar tema custom" },
      { cmd: "nw plugin",            desc: "Listar plugins instalados" },
      { cmd: "nw plugin install",    desc: "Instalar plugin" },
      { cmd: "nw plugin remove",     desc: "Eliminar plugin" },
      { cmd: "nw profile export",    desc: "Exportar config al portapapeles" },
      { cmd: "nw profile import",    desc: "Importar profile" },
      { cmd: "nw sync",              desc: "Estado de sincronización" },
      { cmd: "nw sync push",         desc: "Subir config al repo de sync" },
      { cmd: "nw sync pull",         desc: "Descargar config del repo" },
    ],
  },
];

function getContextItems() {
  const items = [];
  try {
    const scripts = JSON.parse(localStorage.getItem("nw-ctx-scripts") || "null");
    if (scripts) {
      scripts.forEach(s => items.push({ cmd: `npm run ${s}`, desc: `Script: ${s}` }));
    }
  } catch {}
  if (items.length === 0) {
    ["dev", "build", "start", "test", "lint"].forEach(s => {
      items.push({ cmd: `npm run ${s}`, desc: `Script: ${s} (common)` });
    });
  }
  items.push(
    { cmd: "git status", desc: "Ver estado del repositorio" },
    { cmd: "git log --oneline -10", desc: "Últimos 10 commits" },
    { cmd: "git diff --stat", desc: "Resumen de cambios" },
  );
  return items;
}

function fuzzyMatch(text, query) {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (lower.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

function CommandPalette({ open, onClose, onExecute }) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const flatItems = [];
  CATEGORIES.forEach(cat => {
    const matching = cat.items.filter(item =>
      !query || fuzzyMatch(item.cmd + " " + item.desc, query)
    );
    if (matching.length > 0) {
      flatItems.push({ type: "header", label: cat.label, color: cat.color });
      matching.forEach(item => flatItems.push({ type: "item", ...item, catColor: cat.color }));
    }
  });

  const selectableItems = flatItems.filter(i => i.type === "item");

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, selectableItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = selectableItems[selectedIdx];
      if (item) {
        onClose();
        onExecute(item.cmd);
      }
    }
  }, [selectableItems, selectedIdx, onClose, onExecute]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-sel-idx="${selectedIdx}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (!open) return null;

  let selCounter = -1;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.75)",
      display: "flex", justifyContent: "center", paddingTop: "80px",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "520px", maxHeight: "420px",
        background: "#0a0a00",
        border: `1px solid ${C}`,
        boxShadow: `0 0 30px rgba(0,240,255,0.15), 0 0 2px ${C}`,
        display: "flex", flexDirection: "column",
        fontFamily: "var(--font-mono)",
      }}>
        {/* Search input */}
        <div style={{ padding: "12px 14px 8px 14px", borderBottom: `1px solid #1a1a00` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: Y, fontSize: "12px" }}>▸</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar comandos..."
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "#E8E8E8", fontFamily: "var(--font-mono)", fontSize: "13px",
                caretColor: Y,
              }}
            />
            <span style={{ color: DIM, fontSize: "9px" }}>ESC cerrar</span>
          </div>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
          {flatItems.length === 0 && (
            <div style={{ padding: "20px 14px", color: DIM, fontSize: "11px", textAlign: "center" }}>
              Sin resultados para "{query}"
            </div>
          )}
          {flatItems.map((item, i) => {
            if (item.type === "header") {
              return (
                <div key={`h-${i}`} style={{
                  padding: "8px 14px 4px 14px", fontSize: "9px",
                  color: item.color, letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}>
                  {item.label}
                </div>
              );
            }
            selCounter++;
            const isSelected = selCounter === selectedIdx;
            const idx = selCounter;
            return (
              <div
                key={`i-${i}`}
                data-sel-idx={idx}
                onClick={() => { onClose(); onExecute(item.cmd); }}
                onMouseEnter={() => setSelectedIdx(idx)}
                style={{
                  padding: "5px 14px 5px 24px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: isSelected ? "#1a1a00" : "transparent",
                  borderLeft: isSelected ? `2px solid ${Y}` : "2px solid transparent",
                  cursor: "pointer",
                  transition: "background 0.08s",
                }}
              >
                <span style={{ color: isSelected ? "#E8E8E8" : "#888", fontSize: "12px" }}>
                  {item.cmd}
                </span>
                <span style={{ color: DIM, fontSize: "10px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.desc}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: "6px 14px", borderTop: "1px solid #1a1a00",
          display: "flex", justifyContent: "space-between",
          fontSize: "9px", color: DIM,
        }}>
          <span>↑↓ navegar · Enter ejecutar · Esc cerrar</span>
          <span>{selectableItems.length} comandos</span>
        </div>
      </div>
    </div>
  );
}

export default memo(CommandPalette);
