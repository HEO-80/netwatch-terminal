import { useState, useEffect, useRef, useCallback, memo } from "react";
import { secureGet, secureSet } from "../utils/secure-store";

// ── Paleta NETWATCH ───────────────────────────────────────────────────────────
const Y   = "#FCEE0A";
const G   = "#39FF14";
const C   = "var(--nw-accent)";
const M   = "#D9027D";
const R   = "#ff2a6d";
const DIM = "#546E7A";
const BG  = "#080700";
const BG2 = "#0b0a00";
const MONO = "var(--font-mono)";

// ── Historial persistente ─────────────────────────────────────────────────────
const HISTORY_KEY = "nw-ai-history";
const MAX_HISTORY = 50;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}
function saveHistory(messages) {
  const toSave = messages.slice(-MAX_HISTORY).map(m => ({
    role: m.role, content: m.content, id: m.id, ts: m.ts,
  }));
  localStorage.setItem(HISTORY_KEY, JSON.stringify(toSave));
}

// ── Estimación de tokens ─────────────────────────────────────────────────────
function estimateTokens(text) {
  return Math.ceil((text || "").length / 4);
}
function totalTokens(messages) {
  return messages.reduce((acc, m) => acc + estimateTokens(m.content), 0);
}

// ── Comandos rápidos con system prompts especializados ────────────────────────
const QUICK_COMMANDS = [
  {
    prefix: "/code",
    label: "/code",
    color: G,
    hint: "Revisar / escribir código",
    system: "Eres un experto en desarrollo de software. Responde SOLO con código limpio y una explicación muy breve. Sin introducciones largas. Usuario: HEO-80, Full Stack Dev (React, Next.js, Solidity, PowerShell).",
    placeholder: "/code [pega tu código o describe lo que necesitas]",
  },
  {
    prefix: "/git",
    label: "/git",
    color: M,
    hint: "Comandos y flujos de Git",
    system: "Eres un experto en Git. Responde con el comando exacto primero, luego explica brevemente. Sin preámbulos.",
    placeholder: "/git [describe tu situación de git]",
  },
  {
    prefix: "/fix",
    label: "/fix",
    color: R,
    hint: "Analizar último error",
    system: "Eres un debugger experto. Analiza el error y da la solución exacta. Muestra el comando o código para arreglarlo. Sin preámbulos.",
    placeholder: "/fix [pega el error o deja vacío para usar el último]",
  },
  {
    prefix: "/solidity",
    label: "/sol",
    color: C,
    hint: "Smart contracts y DeFi",
    system: "Eres un auditor de smart contracts y experto en DeFi. Prioriza seguridad, gas efficiency y mejores prácticas de Solidity. Usuario trabaja con MEV bots en Ethereum Mainnet y BSC.",
    placeholder: "/solidity [pega el contrato o describe la lógica]",
  },
  {
    prefix: "/explain",
    label: "/explain",
    color: Y,
    hint: "Explicar conceptos",
    system: "Explica de forma concisa y técnica. Usa analogías cuando ayuden. Sin relleno innecesario. El usuario tiene nivel senior.",
    placeholder: "/explain [concepto o error a explicar]",
  },
];

function getActiveCommand(input) {
  return QUICK_COMMANDS.find(c => input.startsWith(c.prefix + " ") || input === c.prefix);
}

// ── Providers ─────────────────────────────────────────────────────────────────
const PROVIDERS = {
  ollama: {
    id: "ollama", name: "Ollama", color: G, local: true,
    install: "winget install Ollama.Ollama",
    models: ["llama3.2", "codellama", "mistral", "qwen2.5-coder"],
    defaultModel: "llama3.2",
    check: async () => {
      try {
        const r = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(2000) });
        if (!r.ok) return { available: false, models: [] };
        const data = await r.json();
        const models = data.models
          ?.map(m => m.name.split(":")[0])
          .filter((v, i, a) => a.indexOf(v) === i) || [];
        return { available: true, models: models.length ? models : ["llama3.2"] };
      } catch { return { available: false, models: [] }; }
    },
    warmup: async (model) => {
      try {
        await fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, prompt: ".", stream: false, options: { num_predict: 1 } }),
          signal: AbortSignal.timeout(15000),
        });
      } catch { /* silencioso */ }
    },
    chat: async function* (model, messages, signal) {
      const r = await fetch("http://localhost:11434/api/chat", {
        method: "POST", signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, stream: true }),
      });
      if (!r.ok) { yield `[Error HTTP ${r.status}]`; return; }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split("\n").filter(l => l.trim())) {
          try {
            const d = JSON.parse(line);
            if (d.message?.content) yield d.message.content;
            if (d.done) return;
          } catch { }
        }
      }
    },
  },

  gemini: {
    id: "gemini", name: "Gemini CLI", color: C, local: false,
    install: "npm install -g @google/gemini-cli",
    models: ["gemini-2.0-flash", "gemini-1.5-pro"],
    defaultModel: "gemini-2.0-flash",
    check: async () => {
      const key = await secureGet("gemini-key");
      return { available: key !== "", models: ["gemini-2.0-flash", "gemini-1.5-pro"] };
    },
    warmup: async () => {},
    chat: async function* (model, messages, signal) {
      const apiKey = await secureGet("gemini-key");
      if (!apiKey) {
        yield "[Error: GEMINI_API_KEY no configurada]\n→ Usa el panel SETTINGS (Alt+P) o ejecuta: nw config";
        return;
      }
      const prompt = messages.map(m => `${m.role === "user" ? "User" : "AI"}: ${m.content}`).join("\n");
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST", signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const data = await r.json();
      yield data.candidates?.[0]?.content?.parts?.[0]?.text || "[Sin respuesta]";
    },
  },

  claude: {
    id: "claude", name: "Claude API", color: M, local: false,
    install: "Obtén API key en console.anthropic.com",
    models: ["claude-sonnet-4-20250514", "claude-haiku-4-5-20251001"],
    defaultModel: "claude-sonnet-4-20250514",
    check: async () => {
      const key = await secureGet("claude-key");
      return { available: key !== "", models: ["claude-sonnet-4-20250514", "claude-haiku-4-5-20251001"] };
    },
    warmup: async () => {},
    chat: async function* (model, messages, signal) {
      const apiKey = await secureGet("claude-key");
      if (!apiKey) {
        yield "[Error: Claude API key no configurada]\n→ Usa el panel SETTINGS (Alt+P) o ejecuta: nw config";
        return;
      }
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: "Eres el asistente AI de NETWATCH Terminal. Usuario: HEO-80, Full Stack Dev y DeFi researcher. Responde conciso y técnico.",
          messages: messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
        }),
      });
      const data = await r.json();
      if (data.error) { yield `[Error API: ${data.error.message}]`; return; }
      yield data.content?.[0]?.text || "[Sin respuesta]";
    },
  },
};

// ── Code block parsing ───────────────────────────────────────────────────────
function parseContentBlocks(text) {
  if (!text) return [{ type: "text", content: text || "" }];
  const blocks = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      blocks.push({ type: "text", content: text.slice(last, match.index) });
    }
    blocks.push({ type: "code", lang: match[1] || "", content: match[2].trimEnd() });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    blocks.push({ type: "text", content: text.slice(last) });
  }
  return blocks.length ? blocks : [{ type: "text", content: text }];
}

// ── Sub-componentes ───────────────────────────────────────────────────────────
function ProviderBadge({ provider, active, available, warming, onClick }) {
  const color = available ? provider.color : DIM;
  return (
    <button
      onClick={onClick}
      title={!available ? `${provider.name} no configurado — click para configurar` : undefined}
      style={{
        background: active ? color : "transparent",
        border: `1px solid ${active ? color : "#1a1a00"}`,
        color: active ? BG : color,
        fontFamily: MONO, fontSize: "9px",
        padding: "2px 8px", cursor: "pointer",
        letterSpacing: "0.06em", opacity: available ? 1 : 0.6,
        transition: "all 0.15s", display: "flex", alignItems: "center", gap: "4px",
      }}
    >
      <span style={{
        fontSize: "7px",
        animation: warming ? "blink 0.8s step-end infinite" : "none",
      }}>
        {warming ? "◌" : available ? "●" : "○"}
      </span>
      {provider.name}
    </button>
  );
}

function CodeBlock({ content, lang }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const execute = () => {
    const cmd = content.trim().split("\n")[0].replace(/^\$\s*/, "").replace(/^>\s*/, "");
    window.dispatchEvent(new CustomEvent("nw-palette-execute", { detail: cmd }));
  };
  const isExecutable = /^[$>]?\s*(git |npm |nw |docker |cargo |cd |ls |dir |mkdir |rm |cat |pwsh|powershell)/im.test(content);

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #1a2a1a", margin: "4px 0", overflow: "hidden" }}>
      {lang && (
        <div style={{ padding: "2px 8px", background: "#111", fontSize: 8, color: DIM, fontFamily: MONO, borderBottom: "1px solid #1a1a1a" }}>
          {lang}
        </div>
      )}
      <pre style={{
        padding: "6px 8px", margin: 0, fontFamily: MONO, fontSize: 11,
        color: G, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-all",
        overflowX: "auto",
      }}>{content}</pre>
      <div style={{ display: "flex", gap: 6, padding: "3px 8px", borderTop: "1px solid #1a1a1a", background: "#0a0a0a" }}>
        <span onClick={copy} style={{ fontSize: 8, color: copied ? G : DIM, cursor: "pointer", fontFamily: MONO }}>
          {copied ? "✓ Copiado" : "📋 Copiar"}
        </span>
        {isExecutable && (
          <span onClick={execute} style={{ fontSize: 8, color: Y, cursor: "pointer", fontFamily: MONO }}>
            ▸ Ejecutar
          </span>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const cmd = isUser ? getActiveCommand(msg.content) : null;
  const [hov, setHov] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const copied = copiedId === msg.id;

  const copyMsg = () => {
    if (!msg.content || msg.streaming) return;
    navigator.clipboard?.writeText(msg.content);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const blocks = !isUser && !msg.streaming ? parseContentBlocks(msg.content) : null;

  return (
    <div style={{
      display: "flex", flexDirection: isUser ? "row-reverse" : "row",
      gap: "8px", marginBottom: "10px", alignItems: "flex-start",
    }}>
      {/* Avatar */}
      <div style={{
        width: 20, height: 20,
        background: isUser ? Y : "#0d1a0d",
        border: `1px solid ${isUser ? Y : "#1a3a1a"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "8px", color: isUser ? BG : G,
        flexShrink: 0, fontFamily: MONO,
      }}>
        {isUser ? ">" : "AI"}
      </div>

      {/* Contenido */}
      <div
        style={{ flex: 1, maxWidth: "87%" }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        {/* Badge de comando si aplica */}
        {cmd && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            background: "#0f0f00", border: `1px solid ${cmd.color}22`,
            padding: "1px 6px", marginBottom: "3px",
            fontFamily: MONO, fontSize: "8px", color: cmd.color,
          }}>
            {cmd.label} — {cmd.hint}
          </div>
        )}

        {/* Message body */}
        <div style={{
          position: "relative",
          background: isUser ? "#0f0e00" : "#090d09",
          border: `1px solid ${isUser ? "#2a2700" : "#0d1f0d"}`,
          borderLeft: `2px solid ${copied ? G : (isUser ? "#2a2700" : "#0d1f0d")}`,
          transition: "border-color 0.3s",
          padding: "8px 10px",
          fontFamily: MONO, fontSize: "12px",
          color: isUser ? Y : "#E8E8E8",
          lineHeight: "1.65", whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {/* Render with code blocks for assistant, plain for user/streaming */}
          {blocks ? (
            blocks.map((b, i) =>
              b.type === "code"
                ? <CodeBlock key={i} content={b.content} lang={b.lang} />
                : <span key={i}>{b.content}</span>
            )
          ) : (
            <>
              {msg.content}
              {msg.streaming && (
                <span style={{
                  display: "inline-block", width: 7, height: 12,
                  background: G, marginLeft: 3, verticalAlign: "middle",
                  animation: "blink 1s step-end infinite",
                }} />
              )}
            </>
          )}

          {/* Copy button on hover (assistant only) */}
          {!isUser && hov && !msg.streaming && (
            <span
              onClick={e => { e.stopPropagation(); copyMsg(); }}
              style={{
                position: "absolute", top: 4, right: 6,
                fontFamily: MONO, fontSize: "9px", color: copied ? G : DIM,
                cursor: "pointer", transition: "color 0.2s",
              }}
            >{copied ? "✓ Copiado" : "📋"}</span>
          )}

          {/* User copy feedback */}
          {isUser && (
            <span onClick={e => { e.stopPropagation(); copyMsg(); }} style={{
              position: "absolute", top: 3, right: 6,
              fontFamily: MONO, fontSize: "9px", color: G,
              opacity: copied ? 1 : 0, transition: "opacity 0.6s ease",
              cursor: "pointer",
            }}>📋 Copiado</span>
          )}
        </div>

        {/* Timestamp + tokens */}
        {msg.ts && !msg.streaming && (
          <div style={{
            fontFamily: MONO, fontSize: "8px", color: "#2a3a2a",
            marginTop: "2px", textAlign: isUser ? "right" : "left",
            paddingLeft: isUser ? 0 : "2px", paddingRight: isUser ? "2px" : 0,
          }}>
            {msg.ts} · ~{estimateTokens(msg.content)}t
          </div>
        )}
      </div>
    </div>
  );
}

function QuickCommandBar({ onSelect, activeCmd }) {
  return (
    <div style={{
      display: "flex", gap: "4px", padding: "4px 10px",
      background: "#080800", borderBottom: "1px solid #0f0f00",
      flexShrink: 0, flexWrap: "wrap",
    }}>
      {QUICK_COMMANDS.map(cmd => {
        const isActive = activeCmd?.prefix === cmd.prefix;
        return (
          <button
            key={cmd.prefix}
            onClick={() => onSelect(cmd)}
            title={cmd.hint}
            style={{
              background: isActive ? cmd.color + "22" : "transparent",
              border: `1px solid ${isActive ? cmd.color : "#1a1a00"}`,
              color: isActive ? cmd.color : DIM,
              fontFamily: MONO, fontSize: "9px",
              padding: "1px 7px", cursor: "pointer",
              transition: "all 0.12s", letterSpacing: "0.05em",
            }}
            onMouseOver={e => { if (!isActive) { e.currentTarget.style.borderColor = cmd.color; e.currentTarget.style.color = cmd.color; } }}
            onMouseOut={e => { if (!isActive) { e.currentTarget.style.borderColor = "#1a1a00"; e.currentTarget.style.color = DIM; } }}
          >
            {cmd.label}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      <span style={{ fontFamily: MONO, fontSize: "8px", color: "#1a2a1a", alignSelf: "center" }}>
        prefijos con system prompt especializado
      </span>
    </div>
  );
}

const CFG_BTN = { background: "transparent", border: "1px solid #333", fontFamily: MONO, fontSize: "8px", padding: "2px 8px", cursor: "pointer" };

function ProviderConfig({ provider, onSaved }) {
  const [value, setValue]   = useState("");
  const [saved, setSaved]   = useState(false);
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    if (provider.id !== "ollama") return;
    let alive = true;
    provider.check().then(r => { if (alive) setStatus(r.available ? "running" : "not running"); });
    return () => { alive = false; };
  }, [provider]);

  const save = async () => {
    if (!value.trim()) return;
    await secureSet(provider.id + "-key", value.trim());
    setValue(""); setSaved(true);
    onSaved?.();
  };

  const txt = { fontFamily: MONO, fontSize: "9px", color: DIM };
  return (
    <div style={{
      background: "#111", borderLeft: `2px solid ${provider.color}`, padding: "6px 10px",
      display: "flex", alignItems: "center", gap: "8px", flexShrink: 0,
    }}>
      {provider.id === "ollama" ? (
        <>
          <span style={txt}>Status: <span style={{ color: status === "running" ? G : Y }}>{status}</span></span>
          <span style={{ ...txt, color: Y }}>{provider.install}</span>
          <button style={{ ...CFG_BTN, color: provider.color }}
            onClick={() => navigator.clipboard?.writeText(provider.install)}>Copiar</button>
        </>
      ) : (
        <>
          <span style={txt}>{provider.name} API key</span>
          <input
            type="password" value={value} placeholder="API key..."
            onChange={e => { setValue(e.target.value); setSaved(false); }}
            onKeyDown={e => { if (e.key === "Enter") save(); }}
            style={{
              flex: 1, maxWidth: 280, background: "#0a0a0a", border: "1px solid #333", outline: "none",
              color: "#E8E8E8", fontFamily: MONO, fontSize: "9px", padding: "2px 6px",
            }}
          />
          <button style={{ ...CFG_BTN, color: provider.color }} onClick={save}>Guardar</button>
          {saved && <span style={{ ...txt, color: G }}>guardada</span>}
        </>
      )}
    </div>
  );
}

// ── Main AIPanel ──────────────────────────────────────────────────────────────
function AIPanel({ open, height = 340 }) {
  const [providers,   setProviders]   = useState({});
  const [activeId,    setActiveId]    = useState("ollama");
  const [activeModel, setActiveModel] = useState("");
  const [messages,    setMessages]    = useState(() => loadHistory());
  const [input,       setInput]       = useState("");
  const [streaming,   setStreaming]   = useState(false);
  const [checking,    setChecking]    = useState(true);
  const [warming,     setWarming]     = useState(false);
  const [hovered,     setHovered]     = useState(false);
  const [expanded,    setExpanded]    = useState(null);
  const [collapsed,   setCollapsed]   = useState(false);
  const [flashBorder, setFlashBorder] = useState(false);
  const [termContext,  setTermContext] = useState({ cwd: "", project: "", lastCmds: [], lastError: null });

  const inputRef  = useRef(null);
  const bottomRef = useRef(null);
  const abortRef  = useRef(null);
  const warmupRef = useRef(false);

  const activeProvider = PROVIDERS[activeId];
  const provStatus     = providers[activeId];
  const isAvailable    = provStatus?.available;
  const accentColor    = isAvailable ? activeProvider.color : DIM;
  const activeCmd      = getActiveCommand(input);
  const totalToks      = totalTokens(messages);
  const noProvider     = !checking && !isAvailable;
  const effectiveHeight = noProvider && collapsed ? 28 : height;

  // ── Terminal context listener ──
  useEffect(() => {
    const handler = (e) => setTermContext(prev => ({ ...prev, ...e.detail }));
    window.addEventListener("nw-ai-context", handler);
    return () => window.removeEventListener("nw-ai-context", handler);
  }, []);

  // ── Expose AI status globally ──
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("nw-ai-status", {
      detail: { available: !!isAvailable, streaming, provider: activeProvider?.name, model: activeModel }
    }));
  }, [isAvailable, streaming, activeProvider, activeModel]);

  // ── Listen for external "nw ai" asks ──
  const sendMessageRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (!isAvailable || !e.detail?.question) return;
      setInput(e.detail.question);
      setTimeout(() => sendMessageRef.current?.(), 80);
    };
    window.addEventListener("nw-ai-ask", handler);
    return () => window.removeEventListener("nw-ai-ask", handler);
  }, [isAvailable]);

  // Al cambiar la disponibilidad, resetear el estado colapsado
  useEffect(() => {
    if (checking) return;
    setCollapsed(!isAvailable);
  }, [isAvailable, checking]);

  // Solo detectar providers y warmup cuando el panel se abre por primera vez
  const checkedRef = useRef(false);
  useEffect(() => {
    if (!open || checkedRef.current) return;
    checkedRef.current = true;
    setChecking(true);
    Promise.all(
      Object.values(PROVIDERS).map(async p => {
        const status = await p.check();
        return [p.id, status];
      })
    ).then(results => {
      const map = Object.fromEntries(results);
      setProviders(map);
      const firstAvail = Object.entries(map).find(([, s]) => s.available)?.[0];
      if (firstAvail) {
        setActiveId(firstAvail);
        const models = map[firstAvail].models;
        setActiveModel(models[0] || PROVIDERS[firstAvail].defaultModel);

        if (PROVIDERS[firstAvail].local && !warmupRef.current) {
          warmupRef.current = true;
          setWarming(true);
          const model = models[0] || PROVIDERS[firstAvail].defaultModel;
          PROVIDERS[firstAvail].warmup(model).finally(() => setWarming(false));
        }
      }
      setChecking(false);
    });
  }, [open]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus al abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  // Persistir historial
  useEffect(() => {
    if (messages.length > 0) saveHistory(messages);
  }, [messages]);

  const recheckProviders = useCallback(async () => {
    const results = await Promise.all(
      Object.values(PROVIDERS).map(async p => [p.id, await p.check()])
    );
    setProviders(Object.fromEntries(results));
  }, []);

  const activateProvider = useCallback((id) => {
    const status = providers[id];
    if (!status?.available) { setExpanded(prev => prev === id ? null : id); return; }
    setActiveId(id);
    setActiveModel(status.models[0] || PROVIDERS[id].defaultModel);
  }, [providers]);

  // ── Build context system message ──
  const buildContextPrefix = useCallback(() => {
    const ctx = termContext;
    if (!ctx.cwd && !ctx.project && ctx.lastCmds.length === 0 && !ctx.lastError) return "";
    const parts = [];
    if (ctx.cwd) parts.push(`Dir: ${ctx.cwd}`);
    if (ctx.project) parts.push(`Proyecto: ${ctx.project}`);
    if (ctx.lastCmds.length > 0) parts.push(`Últimos comandos: ${ctx.lastCmds.slice(-5).join(", ")}`);
    parts.push(ctx.lastError ? `Último error: ${ctx.lastError}` : "Sin errores");
    return `[Contexto] ${parts.join(" | ")}`;
  }, [termContext]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming || !isAvailable) return;

    const cmd = getActiveCommand(text);
    const systemOverride = cmd?.system || null;

    const now = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    const userMsg = { role: "user", content: text, id: Date.now(), ts: now };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    const history = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Prepend terminal context + system override
    const ctxMsg = buildContextPrefix();
    const systemParts = [systemOverride, ctxMsg].filter(Boolean).join("\n\n");
    const finalHistory = systemParts
      ? [{ role: "system", content: systemParts }, ...history]
      : history;

    const assistantId = Date.now() + 1;
    setMessages(prev => [...prev, { role: "assistant", content: "", id: assistantId, streaming: true }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const model = activeModel || activeProvider.defaultModel;
      const gen   = activeProvider.chat(model, finalHistory, controller.signal);
      let full    = "";

      for await (const chunk of gen) {
        full += chunk;
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: full } : m
        ));
      }
      const endTs = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, streaming: false, ts: endTs } : m
      ));

      // Flash border on completion
      setFlashBorder(true);
      setTimeout(() => setFlashBorder(false), 300);
    } catch (e) {
      if (e.name !== "AbortError") {
        const endTs = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: `[Error: ${e.message}]`, streaming: false, ts: endTs }
            : m
        ));
      }
    }
    setStreaming(false);
  }, [input, streaming, messages, activeId, activeModel, activeProvider, isAvailable, buildContextPrefix]);

  // Keep sendMessageRef in sync
  sendMessageRef.current = sendMessage;

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
    setMessages(prev => prev.map((m, i) =>
      i === prev.length - 1 && m.streaming ? { ...m, streaming: false } : m
    ));
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    if (e.key === "Escape" && streaming) stopStreaming();
  }, [sendMessage, streaming, stopStreaming]);

  const handleQuickCommand = useCallback((cmd) => {
    setInput(cmd.prefix + " ");
    inputRef.current?.focus();
  }, []);

  const analyzeError = useCallback(() => {
    if (!termContext.lastError) return;
    const errorSnippet = termContext.lastError.substring(0, 200);
    setInput(`/fix ${errorSnippet}`);
    setTimeout(() => sendMessageRef.current?.(), 80);
  }, [termContext.lastError]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
      height:        open ? `${effectiveHeight}px` : "0px",
      minHeight:     open ? `${effectiveHeight}px` : "0px",
      overflow:      "hidden",
      background:    BG2,
      borderBottom:  open ? `1px solid ${flashBorder ? G : "var(--nw-accent)"}` : "none",
      flexShrink:    0,
      boxShadow:     flashBorder ? `0 0 15px rgba(57,255,20,0.4)` : (hovered ? "0 0 12px rgba(57,255,20,0.25)" : "none"),
      transition:    "height 0.2s ease, min-height 0.2s ease, box-shadow 0.3s ease, border-color 0.3s ease",
      display:       "flex",
      flexDirection: "column",
    }}>
      {open && noProvider && collapsed ? (
        <div onClick={() => setCollapsed(false)} style={{
          height: "28px", display: "flex", alignItems: "center", gap: "8px",
          padding: "0 12px", cursor: "pointer", flexShrink: 0,
          fontFamily: MONO, fontSize: "10px",
        }}>
          <span style={{ color: DIM }}>◈ AI · sin provider</span>
          <span style={{ color: DIM }}>— click para configurar</span>
          <div style={{ display: "flex", gap: "4px", marginLeft: "auto" }}>
            {Object.values(PROVIDERS).map(p => (
              <ProviderBadge
                key={p.id} provider={p} active={false} available={false} warming={false}
                onClick={e => { e.stopPropagation(); setCollapsed(false); setExpanded(p.id); }}
              />
            ))}
          </div>
        </div>
      ) : open && (
        <>
          {/* ── Header ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "5px 12px", background: "#080900",
            borderBottom: "1px solid #0f0f00", flexShrink: 0, userSelect: "none",
          }}>
            <span style={{ fontFamily: MONO, fontSize: "10px", color: accentColor, letterSpacing: "0.1em", flexShrink: 0 }}>
              ◈ AI
            </span>

            {/* Provider badges */}
            <div style={{ display: "flex", gap: "4px" }}>
              {Object.values(PROVIDERS).map(p => (
                <ProviderBadge
                  key={p.id} provider={p}
                  active={activeId === p.id}
                  available={!!providers[p.id]?.available}
                  warming={warming && activeId === p.id && p.local}
                  onClick={() => activateProvider(p.id)}
                />
              ))}
            </div>

            {/* Model selector */}
            {isAvailable && provStatus?.models?.length > 1 && (
              <select
                value={activeModel}
                onChange={e => setActiveModel(e.target.value)}
                style={{
                  background: "#0d0c00", border: "1px solid #2a2700",
                  color: Y, fontFamily: MONO, fontSize: "9px",
                  padding: "1px 6px", cursor: "pointer", outline: "none",
                }}
              >
                {provStatus.models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}

            <div style={{ flex: 1 }} />

            {/* Token counter */}
            {messages.length > 0 && (
              <span style={{ fontFamily: MONO, fontSize: "8px", color: "#2a4a2a" }}>
                ~{totalToks.toLocaleString()}t · {messages.length} msgs
              </span>
            )}

            {/* Estado con local/cloud suffix */}
            {checking ? (
              <span style={{ fontFamily: MONO, fontSize: "9px", color: DIM }}>detectando...</span>
            ) : warming ? (
              <span style={{ fontFamily: MONO, fontSize: "9px", color: G, animation: "blink 1s step-end infinite" }}>
                ◌ cargando modelo...
              </span>
            ) : isAvailable ? (
              <span style={{ fontFamily: MONO, fontSize: "9px", color: G }}>
                ● {activeProvider.name} · {activeModel} · {activeProvider.local ? "local" : "cloud"}
              </span>
            ) : (
              <span style={{ fontFamily: MONO, fontSize: "9px", color: DIM }}>
                sin provider activo
              </span>
            )}

            {/* Limpiar historial */}
            <button
              onClick={clearChat}
              style={{
                background: "transparent", border: "1px solid #1a1a00",
                color: DIM, fontFamily: MONO, fontSize: "9px",
                padding: "1px 7px", cursor: "pointer", flexShrink: 0,
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = M; e.currentTarget.style.color = M; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = "#1a1a00"; e.currentTarget.style.color = DIM; }}
            >
              clear
            </button>
          </div>

          {/* ── Config inline del provider no configurado ── */}
          {expanded && PROVIDERS[expanded] && !providers[expanded]?.available && (
            <ProviderConfig key={expanded} provider={PROVIDERS[expanded]} onSaved={recheckProviders} />
          )}

          {/* ── Barra de comandos rápidos ── */}
          <QuickCommandBar onSelect={handleQuickCommand} activeCmd={activeCmd} />

          {/* ── Mensajes ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column" }}>
            {(messages.length === 0 || !isAvailable) && !checking && (
              <div style={{ fontFamily: MONO, fontSize: "11px", color: DIM, lineHeight: "1.9" }}>
                {isAvailable ? (
                  <>
                    <div style={{ color: accentColor, marginBottom: "6px" }}>
                      ● {activeProvider.name} {warming ? "— cargando en VRAM..." : "listo"} · {activeModel} · {activeProvider.local ? "local" : "cloud"}
                    </div>
                    {termContext.cwd && (
                      <div style={{ color: "#1a3a3a", fontSize: "9px", marginBottom: "6px" }}>
                        📂 {termContext.cwd} {termContext.project && `· ${termContext.project}`}
                      </div>
                    )}
                    <div style={{ color: "#2a4a2a", marginBottom: "4px" }}>Sugerencias rápidas:</div>
                    {[
                      { text: "/code explícame este error: [pega el error]", color: G },
                      { text: "/git cómo revierto el último commit sin perder cambios", color: M },
                      { text: "/fix [pega un error para diagnóstico]", color: R },
                      { text: "/explain qué es un MEV flashloan attack", color: Y },
                    ].map((s, i) => (
                      <div
                        key={i}
                        onClick={() => { setInput(s.text); inputRef.current?.focus(); }}
                        style={{ color: s.color, cursor: "pointer", marginTop: "3px", paddingLeft: "10px" }}
                        onMouseOver={e => e.currentTarget.style.opacity = "0.7"}
                        onMouseOut={e => e.currentTarget.style.opacity = "1"}
                      >
                        ▸ {s.text}
                      </div>
                    ))}
                  </>
                ) : (
                  <div>
                    <div style={{ color: M, marginBottom: "8px" }}>● No hay ningún provider disponible</div>
                    {Object.values(PROVIDERS).map(p => (
                      <div
                        key={p.id}
                        onClick={() => setExpanded(prev => prev === p.id ? null : p.id)}
                        style={{ marginTop: "4px", paddingLeft: "10px", cursor: "pointer" }}
                        onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                        onMouseOut={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span style={{ color: p.color }}>{p.name}</span>
                        <span style={{ color: DIM }}> → </span>
                        <span style={{ color: Y }}>{p.install}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isAvailable && messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* ── Error analysis banner ── */}
          {termContext.lastError && !streaming && isAvailable && (
            <div
              onClick={analyzeError}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
                background: "#1a0000", borderTop: `1px solid ${R}33`, cursor: "pointer",
                flexShrink: 0, transition: "background 0.15s",
              }}
              onMouseOver={e => e.currentTarget.style.background = "#2a0000"}
              onMouseOut={e => e.currentTarget.style.background = "#1a0000"}
            >
              <span style={{ fontSize: 9, color: R, fontFamily: MONO, fontWeight: 700 }}>⚠</span>
              <span style={{ fontSize: 9, color: R, fontFamily: MONO }}>Error detectado — Click para analizar</span>
              <span style={{ fontSize: 8, color: "#ff2a6d66", fontFamily: MONO, marginLeft: "auto", maxWidth: 200, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                {termContext.lastError.substring(0, 80)}
              </span>
            </div>
          )}

          {/* ── Input ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "6px 10px", background: "#080900",
            borderTop: `1px solid ${activeCmd ? activeCmd.color + "33" : "#0f0f00"}`,
            flexShrink: 0, transition: "border-color 0.15s",
          }}>
            <span style={{ color: activeCmd ? activeCmd.color : accentColor, fontSize: "11px", fontFamily: MONO, flexShrink: 0 }}>
              {activeCmd ? activeCmd.prefix.slice(1, 2).toUpperCase() + "›" : "❯"}
            </span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!isAvailable || streaming}
              placeholder={
                warming ? "calentando modelo... un momento" :
                !isAvailable ? "instala un provider de AI..." :
                streaming ? "generando respuesta..." :
                activeCmd ? activeCmd.placeholder :
                "pregunta algo · Enter para enviar · Shift+Enter nueva línea"
              }
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: isAvailable ? "#E8E8E8" : DIM,
                fontFamily: MONO, fontSize: "12px",
                caretColor: activeCmd ? activeCmd.color : accentColor,
              }}
            />
            {streaming ? (
              <button
                onClick={stopStreaming}
                style={{
                  background: "transparent", border: `1px solid ${M}`, color: M,
                  fontFamily: MONO, fontSize: "9px",
                  padding: "2px 8px", cursor: "pointer", flexShrink: 0,
                }}
              >◼ stop</button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={!isAvailable || !input.trim() || warming}
                style={{
                  background: isAvailable && input.trim() && !warming ? (activeCmd ? activeCmd.color : accentColor) : "transparent",
                  border: `1px solid ${isAvailable && input.trim() && !warming ? (activeCmd ? activeCmd.color : accentColor) : "#1a1a00"}`,
                  color: isAvailable && input.trim() && !warming ? BG : DIM,
                  fontFamily: MONO, fontSize: "9px",
                  padding: "2px 10px", cursor: isAvailable && input.trim() && !warming ? "pointer" : "default",
                  transition: "all 0.15s", flexShrink: 0,
                }}
              >▸ send</button>
            )}
          </div>

          {/* ── Hints ── */}
          <div style={{
            padding: "2px 12px", background: "#080700",
            fontFamily: MONO, fontSize: "9px",
            color: "#1a2a1a", display: "flex", gap: "12px", userSelect: "none", flexShrink: 0,
          }}>
            <span><span style={{ color: Y }}>Enter</span> enviar</span>
            <span><span style={{ color: DIM }}>Shift+Enter</span> nueva línea</span>
            <span><span style={{ color: M }}>Esc</span> detener</span>
            <span><span style={{ color: G }}>/code /git /fix /sol /explain</span> modos</span>
            <div style={{ flex: 1 }} />
            <span style={{ color: "#1a1a00" }}>Alt+A cerrar</span>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(AIPanel);
