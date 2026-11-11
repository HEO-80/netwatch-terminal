import { useState, useEffect, useRef, useCallback } from "react";

const Y   = "#FCEE0A";
const G   = "#39FF14";
const C   = "var(--nw-accent)";
const M   = "#D9027D";
const DIM = "#546E7A";

const HISTORY_LEN = 50;

function Sparkline({ data, color, width = 70, height = 22 }) {
  if (!data || data.length < 2) return (
    <svg width={width} height={height}>
      <line x1="0" y1={height/2} x2={width} y2={height/2} stroke={color} strokeOpacity="0.15" strokeWidth="1"/>
    </svg>
  );
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = pts[pts.length - 1].split(",");
  return (
    <svg width={width} height={height} style={{ overflow: "visible", flexShrink: 0 }}>
      <path d={`M 0,${height} L ${pts.join(" L ")} L ${width},${height} Z`} fill={color} fillOpacity="0.07"/>
      <path d={`M ${pts.join(" L ")}`} stroke={color} strokeWidth="1.2" fill="none"/>
      <circle cx={last[0]} cy={last[1]} r="2" fill={color}/>
    </svg>
  );
}

function ThinBar({ pct, color }) {
  const c = pct > 90 ? M : pct > 75 ? Y : color;
  return (
    <div style={{ height: 2, background: "#111", width: "100%", marginTop: 2 }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: c, transition: "width 0.6s ease", boxShadow: `0 0 3px ${c}66` }}/>
    </div>
  );
}

// Disco compacto — una línea
function DiskRow({ d }) {
  const dc = d.pct > 90 ? M : d.pct > 75 ? Y : C;
  const barW = Math.min(d.pct, 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: dc, fontWeight: 700, width: 12, flexShrink: 0 }}>{d.name}</span>
      {/* Mini barra inline */}
      <div style={{ flex: 1, height: 3, background: "#111", position: "relative" }}>
        <div style={{ width: `${barW}%`, height: "100%", background: dc, transition: "width 0.6s ease" }}/>
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: dc, width: 28, textAlign: "right", flexShrink: 0 }}>{d.pct}%</span>
    </div>
  );
}

function useMetrics(active) {
  const [m, setM] = useState({
    cpu: 0, cpuH: Array(HISTORY_LEN).fill(0),
    ramPct: 0, ramUsed: 0, ramTotal: 0, ramH: Array(HISTORY_LEN).fill(0),
    disks: [], netRx: 0, netTx: 0, netH: Array(HISTORY_LEN).fill(0),
    user: "...", host: "...", source: "pending",
  });

  const timerRef    = useRef(null);
  const fetchingRef = useRef(false);
  const push = (arr, val) => [...arr.slice(1), val];

  const fetchTauri = useCallback(async () => {
    if (fetchingRef.current) return null;
    fetchingRef.current = true;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const res = await invoke("get_system_metrics");
      if (!res) return null;
      const netRx = res.net?.reduce((s, n) => s + n.rx_bytes, 0) || 0;
      const netTx = res.net?.reduce((s, n) => s + n.tx_bytes, 0) || 0;
      const disks = (res.disks || []).map(d => ({
        name: d.mount.replace(":\\", "").replace("/", "") || d.name,
        used: d.used_gb,
        total: d.total_gb,
        pct: d.percent,
      })).filter(d => d.total > 0.5);
      return {
        cpu: res.cpu_usage,
        ramUsed: res.ram_used_gb,
        ramTotal: res.ram_total_gb,
        ramPct: res.ram_percent,
        disks,
        netRx: Math.round(netRx / 1024),
        netTx: Math.round(netTx / 1024),
        user: "Usuario",
        host: "HEO",
        source: "native",
      };
    } catch { return null; }
    finally { fetchingRef.current = false; }
  }, []);

  const getMock = useCallback(() => {
    const t = Date.now() / 1000;
    const cpu    = Math.round(Math.max(2, 15 + Math.sin(t * 0.4) * 12 + Math.random() * 8));
    const ramPct = Math.round(Math.max(40, 58 + Math.sin(t * 0.15) * 6 + Math.random() * 4));
    return {
      cpu, ramPct,
      ramUsed:  parseFloat((31.17 * ramPct / 100).toFixed(1)),
      ramTotal: 31.17,
      disks: [
        { name: "C", used: 737, total: 824, pct: 89 },
        { name: "D", used: 981, total: 1038, pct: 87 },
        { name: "E", used: 1.1, total: 225, pct: 0 },
        { name: "F", used: 691, total: 981, pct: 70 },
        { name: "H", used: 461, total: 488, pct: 95 },
        { name: "T", used: 144, total: 393, pct: 37 },
      ],
      netRx: Math.round(Math.abs(Math.sin(t * 0.6) * 400 + Math.random() * 150)),
      netTx: Math.round(Math.abs(Math.sin(t * 0.3) * 100 + Math.random() * 50)),
      user: "Usuario", host: "HEO", source: "mock",
    };
  }, []);

  const refresh = useCallback(async () => {
    const data = await fetchTauri() || getMock();
    setM(prev => ({
      ...prev,
      cpu:      data.cpu,
      cpuH:     push(prev.cpuH, data.cpu),
      ramPct:   data.ramPct,
      ramUsed:  data.ramUsed,
      ramTotal: data.ramTotal,
      ramH:     push(prev.ramH, data.ramPct),
      disks:    data.disks?.length ? data.disks : prev.disks,
      netRx:    data.netRx ?? prev.netRx,
      netTx:    data.netTx ?? prev.netTx,
      netH:     push(prev.netH, data.netRx ?? 0),
      user:     data.user || prev.user,
      host:     data.host || prev.host,
      source:   data.source,
    }));
  }, [fetchTauri, getMock]);

  useEffect(() => {
    if (!active) { clearInterval(timerRef.current); return; }
    refresh();
    timerRef.current = setInterval(refresh, 3000);
    return () => clearInterval(timerRef.current);
  }, [active, refresh]);

  return m;
}

export default function MetricsPanel({ open, height = 130 }) {
  const m = useMetrics(open);
  const cpuC = m.cpu    > 90 ? M : m.cpu    > 70 ? Y : G;
  const ramC = m.ramPct > 90 ? M : m.ramPct > 70 ? Y : C;

  // Partir discos en 2 columnas si hay más de 4
  const col1 = m.disks.filter((_, i) => i % 2 === 0);
  const col2 = m.disks.filter((_, i) => i % 2 === 1);

  return (
    <div style={{
      height:        open ? `${height}px` : "0px",
      minHeight:     open ? `${height}px` : "0px",
      overflow:      "hidden",
      background:    "#090909",
      borderTop:     open ? "1px solid var(--nw-accent)" : "none",
      flexShrink:    0,
      transition:    "height 0.2s ease, min-height 0.2s ease",
      display:       "flex",
      flexDirection: "column",
    }}>
      {open && (
        <>
          {/* ── Header ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "3px 12px", background: "#080900",
            borderBottom: "1px solid #0a1a0a",
            flexShrink: 0, userSelect: "none",
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: G, letterSpacing: "0.1em" }}>◈ METRICS</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#39a039" }}>{m.user}@{m.host}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#1a3a1a" }}>·</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#2a5a2a" }}>AMD Ryzen 7 7800X3D · {m.ramTotal} GB RAM</span>
            <div style={{ flex: 1 }}/>
            {m.source === "mock"   && <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: "#3a3a00" }}>◌ simulado</span>}
            {m.source === "native" && <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: G }}>● native · 3s</span>}
            {m.source === "tauri"  && <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: G }}>● live · 3s</span>}
          </div>

          {/* ── Body: 4 secciones con flex proporcional ── */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "row",
            padding: "6px 12px", gap: "0", overflow: "hidden",
          }}>

            {/* ── CPU — ancho fijo ── */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 140, flexShrink: 0, paddingRight: 12 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: DIM, letterSpacing: "0.1em", marginBottom: 3 }}>CPU</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: cpuC, lineHeight: 1, textShadow: `0 0 8px ${cpuC}44` }}>
                    {m.cpu}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: DIM }}>%</span>
                </div>
                <Sparkline data={m.cpuH} color={cpuC} width={58} height={22}/>
              </div>
              <ThinBar pct={m.cpu} color={G}/>
            </div>

            <div style={{ width: 1, background: "#0f1a0f", alignSelf: "stretch", flexShrink: 0 }}/>

            {/* ── RAM — ancho fijo ── */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 150, flexShrink: 0, padding: "0 12px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: DIM, letterSpacing: "0.1em", marginBottom: 3 }}>MEMORY</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: ramC, lineHeight: 1, textShadow: `0 0 8px ${ramC}44` }}>
                    {m.ramPct}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: DIM }}>%</span>
                </div>
                <Sparkline data={m.ramH} color={ramC} width={58} height={22}/>
              </div>
              <ThinBar pct={m.ramPct} color={C}/>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: "#2a5a5a", marginTop: 2 }}>{m.ramUsed} / {m.ramTotal} GB</span>
            </div>

            <div style={{ width: 1, background: "#0f1a0f", alignSelf: "stretch", flexShrink: 0 }}/>

            {/* ── DISCOS — flex 1, 2 columnas ── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 12px", minWidth: 0 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: DIM, letterSpacing: "0.1em", marginBottom: 4 }}>DISK</span>
              {m.disks.length === 0 ? (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: DIM }}>detectando...</span>
              ) : (
                <div style={{ display: "flex", gap: "12px" }}>
                  {/* Columna 1 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {col1.map(d => <DiskRow key={d.name} d={d}/>)}
                  </div>
                  {/* Columna 2 — solo si hay discos */}
                  {col2.length > 0 && (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {col2.map(d => <DiskRow key={d.name} d={d}/>)}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ width: 1, background: "#0f1a0f", alignSelf: "stretch", flexShrink: 0 }}/>

            {/* ── RED — ancho fijo ── */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 160, flexShrink: 0, paddingLeft: 12 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: DIM, letterSpacing: "0.1em", marginBottom: 4 }}>NETWORK</span>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: DIM }}>↓ RX</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: G, fontWeight: 700 }}>
                  {m.netRx > 1024 ? `${(m.netRx/1024).toFixed(1)} MB/s` : `${m.netRx} KB/s`}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: DIM }}>↑ TX</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: Y, fontWeight: 700 }}>
                  {m.netTx > 1024 ? `${(m.netTx/1024).toFixed(1)} MB/s` : `${m.netTx} KB/s`}
                </span>
              </div>
              <Sparkline data={m.netH} color={G} width={140} height={18}/>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
