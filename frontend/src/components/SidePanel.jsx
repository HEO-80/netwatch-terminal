import { useState, useEffect, useRef, useCallback } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const Y  = "#FCEE0A";
const G  = "#39FF14";
const C  = "#00F0FF";
const M  = "#D9027D";
const R  = "#ff5555";
const DIM = "#444";

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
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true",
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
      },
      eth: {
        price:  prices?.ethereum?.usd,
        change: prices?.ethereum?.usd_24h_change,
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
export default function SidePanel({ open }) {
  const [crypto,  setCrypto]  = useState(null);
  const [docker,  setDocker]  = useState(null);
  const [mev,     setMev]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
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

  // Carga inicial + refresco cada 30s
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  const formatPrice = (n) => n ? `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "---";
  const formatChange = (n) => {
    if (!n) return "";
    const sign = n >= 0 ? "+" : "";
    return `${sign}${Number(n).toFixed(2)}%`;
  };
  const changeColor = (n) => !n ? DIM : n >= 0 ? G : R;

  return (
    <div style={{
      width:      open ? "220px" : "0px",
      minWidth:   open ? "220px" : "0px",
      overflow:   "hidden",
      background: "#020200",
      borderLeft: open ? "1px solid #00F0FF" : "none",
      flexShrink: 0,
      transition: "width 0.2s ease, min-width 0.2s ease",
      display:    "flex",
      flexDirection: "column",
      position:   "relative",
    }}>
      {open && (
        <div style={{ padding: "12px 14px", overflowY: "auto", flex: 1 }}>

          {/* Header */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: "4px",
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: C, letterSpacing: "0.1em" }}>
              ◈ NETWATCH
            </span>
            <button
              onClick={refresh}
              style={{
                background: "transparent", border: "none",
                color: loading ? DIM : Y,
                fontFamily: "var(--font-mono)", fontSize: "9px",
                cursor: "pointer", padding: 0,
              }}
              title="Actualizar"
            >
              {loading ? "···" : "↺"}
            </button>
          </div>
          {lastUpdate && (
            <div style={{ fontSize: "8px", color: "#333", fontFamily: "var(--font-mono)", marginBottom: "4px" }}>
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
              <Row
                label="BTC"
                value={formatPrice(crypto.btc?.price)}
                valueColor={Y}
                sub={<span style={{ color: changeColor(crypto.btc?.change) }}>{formatChange(crypto.btc?.change)} 24h</span>}
              />
              <Row
                label="ETH"
                value={formatPrice(crypto.eth?.price)}
                valueColor={C}
                sub={<span style={{ color: changeColor(crypto.eth?.change) }}>{formatChange(crypto.eth?.change)} 24h</span>}
              />

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
            docker.containers.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}>
                <Dot color={c.status?.toLowerCase().includes("up") ? G : R} />
                <div>
                  <div style={{ fontSize: "10px", color: Y, fontFamily: "var(--font-mono)" }}>{c.name}</div>
                  <div style={{ fontSize: "8px", color: DIM, fontFamily: "var(--font-mono)" }}>{c.status}</div>
                </div>
              </div>
            ))
          )}

          {/* ── MEV BOTS ── */}
          <SectionTitle>MEV Bots</SectionTitle>
          {mev.length === 0 ? (
            <div style={{ fontSize: "10px", color: DIM, fontFamily: "var(--font-mono)" }}>Sin bots configurados</div>
          ) : (
            mev.map((bot, i) => (
              <div key={i} style={{ marginBottom: "8px" }}>
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
            ))
          )}

          {/* Separador final */}
          <div style={{ height: 1, background: "#1a1a1a", margin: "12px 0" }}/>
          <div style={{ fontSize: "8px", color: "#222", fontFamily: "var(--font-mono)", textAlign: "center" }}>
            Alt+P para cerrar
          </div>
        </div>
      )}
    </div>
  );
}
