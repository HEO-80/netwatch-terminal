import { useState, useEffect, useRef, useCallback } from "react";

// ── Paleta NETWATCH ───────────────────────────────────────────────────────────
const Y   = "#FCEE0A";
const G   = "#39FF14";
const C   = "#00F0FF";
const M   = "#D9027D";
const DIM = "#546E7A";
const BG  = "#080700";
const BG2 = "#0b0a00";

// ── Historial persistente ─────────────────────────────────────────────────────
const HISTORY_KEY = "nw-ai-history";
const MAX_HISTORY = 50; // máximo mensajes guardados

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

// ── Estimación de tokens (aprox: 1 token ≈ 4 chars) ──────────────────────────
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
    // Warm-up: carga el modelo en VRAM sin generar output visible
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
      const key = localStorage.getItem("nw-gemini-key") || "";
      return { available: key !== "", models: ["gemini-2.0-flash", "gemini-1.5-pro"] };
    },
    warmup: async () => { /* API cloud, no necesita warmup */ },
    chat: async function* (model, messages, signal) {
      const apiKey = localStorage.getItem("nw-gemini-key") || "";
      if (!apiKey) {
        yield "[Error: GEMINI_API_KEY no configurada]\n→ Ejecuta en consola del navegador:\n  localStorage.setItem('nw-gemini-key', 'TU_KEY')";
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
      const key = localStorage.getItem("nw-claude-key") || "";
      return { available: key !== "", models: ["claude-sonnet-4-20250514", "claude-haiku-4-5-20251001"] };
    },
    warmup: async () => { /* API cloud, no necesita warmup */ },
    chat: async function* (model, messages, signal) {
      const apiKey = localStorage.getItem("nw-claude-key") || "";
      if (!apiKey) {
        yield "[Error: Claude API key no configurada]\n→ Ejecuta en consola del navegador:\n  localStorage.setItem('nw-claude-key', 'TU_KEY')";
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

// ── Sub-componentes ───────────────────────────────────────────────────────────
function ProviderBadge({ provider, active, available, warming, onClick }) {
  const color = available ? provider.color : DIM;
  return (
    <button
      onClick={onClick}
      title={!available ? `${provider.name} no disponible — ${provider.install}` : undefined}
      style={{
        background: active ? color : "transparent",
        border: `1px solid ${active ? color : "#1a1a00"}`,
        color: active ? BG : color,
        fontFamily: "var(--font-mono)", fontSize: "9px",
        padding: "2px 8px", cursor: available ? "pointer" : "default",
        letterSpacing: "0.06em", opacity: available ? 1 : 0.35,
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

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const cmd = isUser ? getActiveCommand(msg.content) : null;
  const accentCmd = cmd ? cmd.color : (isUser ? Y : "#2a4a2a");

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
        flexShrink: 0, fontFamily: "var(--font-mono)",
      }}>
        {isUser ? ">" : "AI"}
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, maxWidth: "87%" }}>
        {/* Badge de comando si aplica */}
        {cmd && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            background: "#0f0f00", border: `1px solid ${cmd.color}22`,
            padding: "1px 6px", marginBottom: "3px",
            fontFamily: "var(--font-mono)", fontSize: "8px", color: cmd.color,
          }}>
            {cmd.label} — {cmd.hint}
          </div>
        )}
        <div style={{
          background: isUser ? "#0f0e00" : "#090d09",
          border: `1px solid ${isUser ? "#2a2700" : "#0d1f0d"}`,
          padding: "8px 10px",
          fontFamily: "var(--font-mono)", fontSize: "12px",
          color: isUser ? Y : "#E8E8E8",
          lineHeight: "1.65", whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {msg.content}
          {msg.streaming && (
            <span style={{
              display: "inline-block", width: 7, height: 12,
              background: G, marginLeft: 3, verticalAlign: "middle",
              animation: "blink 1s step-end infinite",
            }} />
          )}
        </div>
        {/* Timestamp + tokens */}
        {msg.ts && !msg.streaming && (
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "8px", color: "#2a3a2a",
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
              fontFamily: "var(--font-mono)", fontSize: "9px",
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
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: "#1a2a1a", alignSelf: "center" }}>
        comandos rápidos — prefijos con system prompt especializado
      </span>
    </div>
  );
}

// ── Main AIPanel ──────────────────────────────────────────────────────────────
export default function AIPanel({ open, height = 340 }) {
  const [providers,   setProviders]   = useState({});
  const [activeId,    setActiveId]    = useState("ollama");
  const [activeModel, setActiveModel] = useState("");
  const [messages,    setMessages]    = useState(() => loadHistory());
  const [input,       setInput]       = useState("");
  const [streaming,   setStreaming]   = useState(false);
  const [checking,    setChecking]    = useState(true);
  const [warming,     setWarming]     = useState(false); // warmup en curso

  const inputRef  = useRef(null);
  const bottomRef = useRef(null);
  const abortRef  = useRef(null);
  const warmupRef = useRef(false); // evita doble warmup

  const activeProvider = PROVIDERS[activeId];
  const provStatus     = providers[activeId];
  const isAvailable    = provStatus?.available;
  const accentColor    = isAvailable ? activeProvider.color : DIM;
  const activeCmd      = getActiveCommand(input);
  const totalToks      = totalTokens(messages);

  // ── CHECK EN BACKGROUND al montar — no espera a que el panel esté abierto ──
  useEffect(() => {
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

        // Warm-up automático del modelo local (Ollama) — solo una vez
        if (PROVIDERS[firstAvail].local && !warmupRef.current) {
          warmupRef.current = true;
          setWarming(true);
          const model = models[0] || PROVIDERS[firstAvail].defaultModel;
          PROVIDERS[firstAvail].warmup(model).finally(() => setWarming(false));
        }
      }
      setChecking(false);
    });
  }, []); // ← Array vacío: solo al montar, independiente de `open`

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus al abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  // Persistir historial cuando cambian los mensajes
  useEffect(() => {
    if (messages.length > 0) saveHistory(messages);
  }, [messages]);

  const activateProvider = useCallback((id) => {
    const status = providers[id];
    if (!status?.available) return;
    setActiveId(id);
    setActiveModel(status.models[0] || PROVIDERS[id].defaultModel);
  }, [providers]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming || !isAvailable) return;

    // Extraer system prompt del comando rápido si aplica
    const cmd = getActiveCommand(text);
    const systemOverride = cmd?.system || null;
    const cleanText = cmd ? text : text; // el texto incluye el prefijo, lo mandamos tal cual

    const now = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    const userMsg = { role: "user", content: cleanText, id: Date.now(), ts: now };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    // Construir historia con system override si hay comando
    const history = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Si hay comando, añadimos system como primer mensaje tipo user (compatible con Ollama)
    const finalHistory = systemOverride
      ? [{ role: "system", content: systemOverride }, ...history]
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
  }, [input, streaming, messages, activeId, activeModel, activeProvider, isAvailable]);

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

  return (
    <div style={{
      height:        open ? `${height}px` : "0px",
      minHeight:     open ? `${height}px` : "0px",
      overflow:      "hidden",
      background:    BG2,
      borderBottom:  open ? `1px solid ${accentColor}` : "none",
      flexShrink:    0,
      transition:    "height 0.2s ease, min-height 0.2s ease",
      display:       "flex",
      flexDirection: "column",
    }}>
      {open && (
        <>
          {/* ── Header ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "5px 12px", background: "#080900",
            borderBottom: "1px solid #0f0f00", flexShrink: 0, userSelect: "none",
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: accentColor, letterSpacing: "0.1em", flexShrink: 0 }}>
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
                  color: Y, fontFamily: "var(--font-mono)", fontSize: "9px",
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
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: "#2a4a2a" }}>
                ~{totalToks.toLocaleString()}t · {messages.length} msgs
              </span>
            )}

            {/* Estado */}
            {checking ? (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: DIM }}>detectando...</span>
            ) : warming ? (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: G, animation: "blink 1s step-end infinite" }}>
                ◌ cargando modelo...
              </span>
            ) : isAvailable ? (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: G }}>
                ● {activeProvider.name} · {activeModel}
              </span>
            ) : (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: DIM }}>
                sin provider activo
              </span>
            )}

            {/* Limpiar historial */}
            <button
              onClick={clearChat}
              style={{
                background: "transparent", border: "1px solid #1a1a00",
                color: DIM, fontFamily: "var(--font-mono)", fontSize: "9px",
                padding: "1px 7px", cursor: "pointer", flexShrink: 0,
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = M; e.currentTarget.style.color = M; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = "#1a1a00"; e.currentTarget.style.color = DIM; }}
            >
              clear
            </button>
          </div>

          {/* ── Barra de comandos rápidos ── */}
          <QuickCommandBar onSelect={handleQuickCommand} activeCmd={activeCmd} />

          {/* ── Mensajes ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column" }}>
            {messages.length === 0 && !checking && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: DIM, lineHeight: "1.9" }}>
                {isAvailable ? (
                  <>
                    <div style={{ color: accentColor, marginBottom: "6px" }}>
                      ● {activeProvider.name} {warming ? "— cargando en VRAM..." : "listo"} · {activeModel}
                    </div>
                    <div style={{ color: "#2a4a2a", marginBottom: "4px" }}>Sugerencias rápidas:</div>
                    {[
                      { text: "/code explícame este error: [pega el error]", color: G },
                      { text: "/git cómo revierto el último commit sin perder cambios", color: M },
                      { text: "/solidity revisa esta función para reentrancy", color: C },
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
                      <div key={p.id} style={{ marginTop: "4px", paddingLeft: "10px" }}>
                        <span style={{ color: p.color }}>{p.name}</span>
                        <span style={{ color: DIM }}> → </span>
                        <span style={{ color: Y }}>{p.install}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* ── Input ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "6px 10px", background: "#080900",
            borderTop: `1px solid ${activeCmd ? activeCmd.color + "33" : "#0f0f00"}`,
            flexShrink: 0, transition: "border-color 0.15s",
          }}>
            <span style={{ color: activeCmd ? activeCmd.color : accentColor, fontSize: "11px", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
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
                fontFamily: "var(--font-mono)", fontSize: "12px",
                caretColor: activeCmd ? activeCmd.color : accentColor,
              }}
            />
            {streaming ? (
              <button
                onClick={stopStreaming}
                style={{
                  background: "transparent", border: `1px solid ${M}`, color: M,
                  fontFamily: "var(--font-mono)", fontSize: "9px",
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
                  fontFamily: "var(--font-mono)", fontSize: "9px",
                  padding: "2px 10px", cursor: isAvailable && input.trim() && !warming ? "pointer" : "default",
                  transition: "all 0.15s", flexShrink: 0,
                }}
              >▸ send</button>
            )}
          </div>

          {/* ── Hints ── */}
          <div style={{
            padding: "2px 12px", background: "#080700",
            fontFamily: "var(--font-mono)", fontSize: "9px",
            color: "#1a2a1a", display: "flex", gap: "12px", userSelect: "none", flexShrink: 0,
          }}>
            <span><span style={{ color: Y }}>Enter</span> enviar</span>
            <span><span style={{ color: DIM }}>Shift+Enter</span> nueva línea</span>
            <span><span style={{ color: M }}>Esc</span> detener</span>
            <span><span style={{ color: G }}>/code /git /sol /explain</span> modos</span>
            <div style={{ flex: 1 }} />
            <span style={{ color: "#1a1a00" }}>Alt+A cerrar</span>
          </div>
        </>
      )}
    </div>
  );
}
