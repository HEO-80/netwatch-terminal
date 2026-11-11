import { useState, useEffect, useRef, useCallback, memo } from "react";
import WinControls from "./WinControls";

// ── Helpers ───────────────────────────────────────────────────────────────────
const Y  = "#FCEE0A";
const G  = "#39FF14";
const C  = "var(--nw-accent)";
const M  = "#D9027D";
const R  = "#ff5555";
const DIM = "#888";

function Label({ children, color = DIM }) {
  return (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color, letterSpacing: "0.08em", textTransform: "uppercase" }}>
      {children}
    </span>
  );
}

function Value({ children, color = G }) {
  return (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color, fontWeight: 700 }}>
      {children}
    </span>
  );
}

function Row({ label, value, valueColor, sub }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Label>{label}</Label>
        <Value color={valueColor || G}>{value}</Value>
      </div>
      {sub && <div style={{ textAlign: "right", fontSize: "9px", color: DIM, fontFamily: "var(--font-mono)", marginTop: "1px" }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontFamily: "var(--font-mono)", fontSize: "9px", color: C,
      letterSpacing: "0.12em", textTransform: "uppercase",
      borderBottom: `1px solid #1a1a1a`, paddingBottom: "4px",
      marginBottom: "10px", marginTop: "14px",
    }}>
      {children}
    </div>
  );
}

function Dot({ color }) {
  return (
    <span style={{
      display: "inline-block", width: 6, height: 6,
      borderRadius: "50%", background: color,
      boxShadow: `0 0 4px ${color}`, marginRight: 5,
      flexShrink: 0,
    }}/>
  );
}

// ── Fetch ETH gas + precios ───────────────────────────────────────────────────
async function fetchCryptoData() {
  try {
    // Precios BTC/ETH via CoinGecko (free, no API key)
    const priceRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true",
      { signal: AbortSignal.timeout(5000) }
    );
    const prices = await priceRes.json();

    // ETH gas via etherscan public endpoint
    const gasRes = await fetch(
      "https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=YourApiKeyToken",
      { signal: AbortSignal.timeout(5000) }
    );
    const gasData = await gasRes.json();

    return {
      btc: {
        price:  prices?.bitcoin?.usd,
        change: prices?.bitcoin?.usd_24h_change,
        marketCap: prices?.bitcoin?.usd_market_cap,
        volume: prices?.bitcoin?.usd_24h_vol,
      },
      eth: {
        price:  prices?.ethereum?.usd,
        change: prices?.ethereum?.usd_24h_change,
        marketCap: prices?.ethereum?.usd_market_cap,
        volume: prices?.ethereum?.usd_24h_vol,
      },
      gas: {
        safe:     gasData?.result?.SafeGasPrice,
        standard: gasData?.result?.ProposeGasPrice,
        fast:     gasData?.result?.FastGasPrice,
      },
    };
  } catch {
    return null;
  }
}

// ── Docker status via Tauri ───────────────────────────────────────────────────
async function fetchDockerStatus() {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke("get_docker_status");
  } catch {
    return { available: false, containers: [] };
  }
}

// ── MEV bots — ping a endpoints conocidos ────────────────────────────────────
// Adaptar según tus bots reales. Por ahora simula el estado
async function fetchMevStatus() {
  // TODO: reemplazar con tus endpoints reales de MEV bots
  // Ejemplo: fetch("http://localhost:3001/status")
  return [
    { name: "MEV-ETH-Main",  chain: "Ethereum", status: "online",  lastTx: "2m ago" },
    { name: "MEV-BSC-Flash", chain: "BSC",      status: "online",  lastTx: "8m ago" },
    { name: "MEV-ARB-Snipe", chain: "Arbitrum", status: "offline", lastTx: "2h ago" },
  ];
}

// ── Uptime ────────────────────────────────────────────────────────────────────
function useUptime() {
  const startRef = useRef(Date.now());
  const [uptime, setUptime] = useState("00:00:00");

  useEffect(() => {
    const t = setInterval(() => {
      const diff = Math.floor((Date.now() - startRef.current) / 1000);
      const h    = String(Math.floor(diff / 3600)).padStart(2, "0");
      const m    = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
      const s    = String(diff % 60).padStart(2, "0");
      setUptime(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return uptime;
}

// ── Main SidePanel ────────────────────────────────────────────────────────────
function SidePanel({ open, focused, onFocus, onOverlay, minimized, onMinimize }) {
  const [crypto,  setCrypto]  = useState(null);
  const [docker,  setDocker]  = useState(null);
  const [mev,     setMev]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [expanded, setExpanded] = useState(null); // { section, index }
  const [hovered,  setHovered]  = useState(false);
  const uptime = useUptime();

  const refresh = useCallback(async () => {
    setLoading(true);
    const [c, d, m] = await Promise.all([
      fetchCryptoData(),
      fetchDockerStatus(),
      fetchMevStatus(),
    ]);
    setCrypto(c);
    setDocker(d);
    setMev(m);
    setLastUpdate(new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    setLoading(false);
  }, []);

  // Solo fetch/polling cuando el panel está abierto
  useEffect(() => {
    if (!open) return;
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [open, refresh]);

  const formatPrice = (n) => n ? `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "---";
  const formatChange = (n) => {
    if (!n) return "";
    const sign = n >= 0 ? "+" : "";
    return `${sign}${Number(n).toFixed(2)}%`;
  };
  const changeColor = (n) => !n ? DIM : n >= 0 ? G : R;

  const toggle = (section, index) =>
    setExpanded(prev => (prev?.section === section && prev?.index === index ? null : { section, index }));
  const isOpen = (section, index) => expanded?.section === section && expanded?.index === index;
  const runNw = (cmd) => window.dispatchEvent(new CustomEvent("nw-palette-execute", { detail: cmd }));
  const hoverOn  = (e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; };
  const hoverOff = (e) => { e.currentTarget.style.background = "transparent"; };
  const clickableStyle = { cursor: "pointer" };
  const detailStyle = {
    padding: "6px 10px", background: "#111",
    borderLeft: "2px solid var(--nw-accent)",
    marginBottom: "6px", marginTop: "2px",
    fontSize: "9px", fontFamily: "var(--font-mono)",
  };
  const actionBtn = {
    background: "transparent", border: "1px solid #333", color: "var(--nw-accent)",
    fontFamily: "var(--font-mono)", fontSize: "8px", padding: "2px 8px", cursor: "pointer",
  };
  const DetailLine = ({ label, value }) => (
    <div style={{ display: "flex", justifyContent: "space-between", color: DIM }}>
      <span>{label}</span><span style={{ color: "#ccc" }}>{value}</span>
    </div>
  );

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
      boxShadow:  hovered ? "0 0 12px rgba(0,240,255,0.3)" : "none",
      width:      open ? (focused ? "350px" : "220px") : "0px",
      minWidth:   open ? (focused ? "350px" : "220px") : "0px",
      overflow:   "hidden",
      background: "#020200",
      borderLeft: open ? (focused ? "1px solid var(--nw-accent)" : "1px solid rgba(0,240,255,0.3)") : "none",
      flexShrink: 0,
      transition: "width 0.2s ease, min-width 0.2s ease, box-shadow 0.2s ease",
      display:    "flex",
      flexDirection: "column",
      position:   "relative",
    }}>
      {open && (
        <div style={{ padding: "12px 14px", overflowY: minimized ? "hidden" : "auto", flex: minimized ? "none" : 1, height: minimized ? "28px" : undefined, boxSizing: "border-box" }}>

          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center",
            marginBottom: "4px",
          }} onDoubleClick={onOverlay}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: C, letterSpacing: "0.1em", cursor: "pointer" }} onClick={onFocus}>
              ◈ NETWATCH {focused ? "⊟" : ""}
            </span>
            <button
              onClick={refresh}
              style={{
                marginLeft: "auto", background: "transparent", border: "none",
                color: loading ? DIM : Y,
                fontFamily: "var(--font-mono)", fontSize: "9px",
                cursor: "pointer", padding: 0,
              }}
              title="Actualizar"
            >
              {loading ? "···" : "↺"}
            </button>
            <WinControls minimized={minimized} onMinimize={onMinimize} onOverlay={onOverlay} color={C} dim={DIM} />
          </div>
          {!minimized && <>
          {lastUpdate && (
            <div style={{ fontSize: "8px", color: "#777", fontFamily: "var(--font-mono)", marginBottom: "4px" }}>
              upd: {lastUpdate}
            </div>
          )}

          {/* ── SISTEMA ── */}
          <SectionTitle>Sistema</SectionTitle>
          <Row label="Uptime"  value={uptime}    valueColor={C} />
          <Row label="Hora"    value={new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} valueColor={Y} />

          {/* ── CRYPTO ── */}
          <SectionTitle>Crypto</SectionTitle>

          {!crypto ? (
            <div style={{ fontSize: "10px", color: DIM, fontFamily: "var(--font-mono)" }}>
              {loading ? "Cargando..." : "Sin conexión"}
            </div>
          ) : (
            <>
              {[
                { key: "btc", label: "BTC", color: Y },
                { key: "eth", label: "ETH", color: C },
              ].map(({ key, label, color }) => {
                const d = crypto[key];
                return (
                  <div key={key}>
                    <div
                      onClick={() => toggle(key, 0)}
                      onMouseOver={hoverOn}
                      onMouseOut={hoverOff}
                      style={clickableStyle}
                    >
                      <Row
                        label={label}
                        value={formatPrice(d?.price)}
                        valueColor={color}
                        sub={<span style={{ color: changeColor(d?.change) }}>{formatChange(d?.change)} 24h</span>}
                      />
                    </div>
                    {isOpen(key, 0) && (
                      <div style={detailStyle}>
                        <DetailLine label="High 24h"   value={formatPrice(d?.high24)} />
                        <DetailLine label="Low 24h"    value={formatPrice(d?.low24)} />
                        <DetailLine label="Market Cap" value={formatPrice(d?.marketCap)} />
                        <DetailLine label="Volume 24h" value={formatPrice(d?.volume)} />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Gas */}
              <div style={{ marginTop: "4px", marginBottom: "8px" }}>
                <Label>Gas (Gwei)</Label>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                  {[
                    { label: "slow",  value: crypto.gas?.safe,     color: G },
                    { label: "std",   value: crypto.gas?.standard, color: Y },
                    { label: "fast",  value: crypto.gas?.fast,     color: R },
                  ].map(g => (
                    <div key={g.label} style={{ textAlign: "center", flex: 1 }}>
                      <div style={{ fontSize: "8px", color: DIM, fontFamily: "var(--font-mono)" }}>{g.label}</div>
                      <div style={{ fontSize: "11px", color: g.color, fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                        {g.value || "?"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── DOCKER ── */}
          <SectionTitle>Docker</SectionTitle>
          {!docker?.available ? (
            <div style={{ fontSize: "10px", color: DIM, fontFamily: "var(--font-mono)" }}>No disponible</div>
          ) : docker.containers.length === 0 ? (
            <div style={{ fontSize: "10px", color: DIM, fontFamily: "var(--font-mono)" }}>Sin contenedores</div>
          ) : (
            docker.containers.map((c, i) => {
              const isUp = c.status?.includes("Up");
              return (
                <div key={i} style={{ marginBottom: "5px" }}>
                  <div
                    onClick={() => toggle("docker", i)}
                    onMouseOver={hoverOn}
                    onMouseOut={hoverOff}
                    style={{ ...clickableStyle, display: "flex", alignItems: "center" }}
                  >
                    <Dot color={c.status?.toLowerCase().includes("up") ? G : R} />
                    <div>
                      <div style={{ fontSize: "10px", color: Y, fontFamily: "var(--font-mono)" }}>{c.name}</div>
                      <div style={{ fontSize: "8px", color: DIM, fontFamily: "var(--font-mono)" }}>{c.status}</div>
                    </div>
                  </div>
                  {isOpen("docker", i) && (
                    <div style={{ ...detailStyle, display: "flex", gap: "6px" }}>
                      <button style={actionBtn} onClick={() => runNw("nw docker logs " + c.name)}>Logs</button>
                      {isUp
                        ? <button style={actionBtn} onClick={() => runNw(`nw docker stop ${c.name}`)}>Stop</button>
                        : <button style={actionBtn} onClick={() => runNw(`nw docker start ${c.name}`)}>Start</button>}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* ── MEV BOTS ── */}
          <SectionTitle>MEV Bots</SectionTitle>
          {mev.length === 0 ? (
            <div style={{ fontSize: "10px", color: DIM, fontFamily: "var(--font-mono)" }}>Sin bots configurados</div>
          ) : (
            mev.map((bot, i) => (
              <div key={i} style={{ marginBottom: "8px" }}>
                <div
                  onClick={() => toggle("mev", i)}
                  onMouseOver={hoverOn}
                  onMouseOut={hoverOff}
                  style={clickableStyle}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Dot color={bot.status === "online" ? G : R} />
                    <span style={{ fontSize: "10px", color: bot.status === "online" ? G : R, fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                      {bot.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: "9px", color: Y, fontFamily: "var(--font-mono)", paddingLeft: "11px" }}>{bot.name}</div>
                  <div style={{ fontSize: "8px", color: DIM, fontFamily: "var(--font-mono)", paddingLeft: "11px" }}>
                    {bot.chain} · last tx {bot.lastTx}
                  </div>
                </div>
                {isOpen("mev", i) && (
                  <div style={detailStyle}>
                    <DetailLine label="Name"     value={bot.name} />
                    <DetailLine label="Chain"    value={bot.chain} />
                    <DetailLine label="Strategy" value={bot.strategy || "n/a"} />
                    <DetailLine label="Status"   value={bot.status} />
                    <DetailLine label="Last tx"  value={bot.lastTx} />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Separador final */}
          <div style={{ height: 1, background: "#1a1a1a", margin: "12px 0" }}/>
          <div style={{ fontSize: "8px", color: "#777", fontFamily: "var(--font-mono)", textAlign: "center" }}>
            Alt+P para cerrar
          </div>
          </>}
        </div>
      )}
    </div>
  );
}

export default memo(SidePanel);
