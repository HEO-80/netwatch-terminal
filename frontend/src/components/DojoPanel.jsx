import { useState, useEffect, useCallback, useRef, memo } from "react";

const Y   = "#FCEE0A";
const G   = "#39FF14";
const C   = "var(--nw-accent)";
const M   = "#D9027D";
const R   = "#ff5555";
const DIM = "#333";
const W   = "#E8E8E8";

const DOJO_KEY = "nw-dojo-progress";

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(DOJO_KEY) || "null") || defaultProgress(); }
  catch { return defaultProgress(); }
}
function saveProgress(p) { localStorage.setItem(DOJO_KEY, JSON.stringify(p)); }
function defaultProgress() {
  return { level: 1, xp: 0, streak: 0, lastDay: null, history: [], totalCorrect: 0, totalWrong: 0 };
}

const QUIZ_BANK = [
  { cat: "powershell", q: "¿Cómo listas todos los procesos en PowerShell?", options: ["Get-Process", "ps aux", "tasklist", "top"], answer: 0 },
  { cat: "powershell", q: "¿Cómo obtienes la IP local en PowerShell?", options: ["ipconfig", "Get-NetIPAddress", "ifconfig", "hostname -I"], answer: 1 },
  { cat: "powershell", q: "¿Cómo creas un archivo vacío en PowerShell?", options: ["touch file.txt", "New-Item file.txt", "echo > file.txt", "cat file.txt"], answer: 1 },
  { cat: "powershell", q: "¿Qué cmdlet muestra los servicios del sistema?", options: ["Get-Service", "sc query", "systemctl", "services.msc"], answer: 0 },
  { cat: "linux", q: "¿Cómo ves permisos de un archivo en Linux?", options: ["ls -l", "dir /q", "Get-Acl", "chmod"], answer: 0 },
  { cat: "linux", q: "¿Qué comando busca texto dentro de archivos?", options: ["find", "grep", "locate", "which"], answer: 1 },
  { cat: "linux", q: "¿Cómo cambias el dueño de un archivo?", options: ["chmod", "chown", "chgrp", "setfacl"], answer: 1 },
  { cat: "linux", q: "¿Cómo muestras las últimas 20 líneas de un log?", options: ["head -20", "tail -20", "cat -20", "less -20"], answer: 1 },
  { cat: "git", q: "¿Cómo ves el historial de commits en una línea?", options: ["git log --oneline", "git status", "git show", "git diff"], answer: 0 },
  { cat: "git", q: "¿Cómo deshaces el último commit sin perder cambios?", options: ["git revert HEAD", "git reset --soft HEAD~1", "git checkout .", "git stash"], answer: 1 },
  { cat: "git", q: "¿Cómo ves qué archivos están staged?", options: ["git diff", "git status", "git log", "git show"], answer: 1 },
  { cat: "git", q: "¿Cómo creas y cambias a una nueva rama?", options: ["git branch new && git checkout new", "git checkout -b new", "git switch new", "git merge new"], answer: 1 },
  { cat: "docker", q: "¿Cómo listas contenedores activos?", options: ["docker ps", "docker images", "docker ls", "docker run"], answer: 0 },
  { cat: "docker", q: "¿Cómo paras todos los contenedores?", options: ["docker kill all", "docker stop $(docker ps -q)", "docker rm -f *", "docker down"], answer: 1 },
  { cat: "docker", q: "¿Cómo ves los logs de un contenedor?", options: ["docker info <id>", "docker logs <id>", "docker inspect <id>", "docker cat <id>"], answer: 1 },
  { cat: "redes", q: "¿Qué puerto usa SSH por defecto?", options: ["21", "22", "80", "443"], answer: 1 },
  { cat: "redes", q: "¿Qué protocolo usa HTTPS?", options: ["HTTP", "FTP", "TLS/SSL", "SMTP"], answer: 2 },
  { cat: "redes", q: "¿Qué herramienta analiza paquetes de red?", options: ["ping", "tracert", "Wireshark", "nslookup"], answer: 2 },
  { cat: "k8s", q: "¿Cómo listas los pods en Kubernetes?", options: ["kubectl get pods", "kubectl list", "k8s pods", "docker ps"], answer: 0 },
  { cat: "k8s", q: "¿Qué es un Deployment en K8s?", options: ["Un contenedor", "Un pod wrapper", "Un controlador de réplicas", "Un servicio"], answer: 2 },
];

const ROSETTA = [
  { action: "Listar archivos",     ps: "Get-ChildItem / dir",       bash: "ls -la",         cmd: "dir" },
  { action: "Ver procesos",        ps: "Get-Process",               bash: "ps aux / top",    cmd: "tasklist" },
  { action: "Copiar archivo",      ps: "Copy-Item a b",             bash: "cp a b",          cmd: "copy a b" },
  { action: "Mover archivo",       ps: "Move-Item a b",             bash: "mv a b",          cmd: "move a b" },
  { action: "Eliminar archivo",    ps: "Remove-Item file",          bash: "rm file",         cmd: "del file" },
  { action: "Ver contenido",       ps: "Get-Content file",          bash: "cat file",        cmd: "type file" },
  { action: "Buscar texto",        ps: "Select-String 'pattern'",   bash: "grep 'pattern'",  cmd: "findstr pattern" },
  { action: "IP local",            ps: "Get-NetIPAddress",          bash: "ip addr / ifconfig", cmd: "ipconfig" },
  { action: "Puertos abiertos",    ps: "Get-NetTCPConnection",      bash: "ss -tlnp / netstat", cmd: "netstat -ano" },
  { action: "Variable entorno",    ps: "$env:PATH",                 bash: "$PATH",           cmd: "%PATH%" },
  { action: "Crear directorio",    ps: "New-Item -Type Dir name",   bash: "mkdir name",      cmd: "mkdir name" },
  { action: "Permisos",            ps: "Get-Acl file",              bash: "chmod 755 file",  cmd: "icacls file" },
];

const CAT_COLORS = { powershell: Y, linux: G, git: M, docker: "#00F0FF", redes: "#ff8800", k8s: "#39ccff" };
const MODES = ["quiz", "rosetta", "progress"];

function DojoPanel() {
  const [progress, setProgress] = useState(loadProgress);
  const [mode, setMode] = useState("quiz");
  const [currentQ, setCurrentQ] = useState(null);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [catFilter, setCatFilter] = useState(null);

  useEffect(() => { saveProgress(progress); }, [progress]);

  const pickQuestion = useCallback(() => {
    const pool = catFilter ? QUIZ_BANK.filter(q => q.cat === catFilter) : QUIZ_BANK;
    const q = pool[Math.floor(Math.random() * pool.length)];
    setCurrentQ(q);
    setSelected(null);
    setRevealed(false);
  }, [catFilter]);

  useEffect(() => { if (mode === "quiz" && !currentQ) pickQuestion(); }, [mode, currentQ, pickQuestion]);

  const handleAnswer = (idx) => {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
    const correct = idx === currentQ.answer;
    const today = new Date().toISOString().slice(0, 10);

    setProgress(prev => {
      const streak = prev.lastDay === today ? prev.streak :
        (prev.lastDay === new Date(Date.now() - 86400000).toISOString().slice(0, 10) ? prev.streak + 1 : 1);
      const xpGain = correct ? 10 + Math.floor(streak * 2) : 0;
      const newXp = prev.xp + xpGain;
      const newLevel = Math.floor(newXp / 100) + 1;
      return {
        ...prev,
        level: newLevel,
        xp: newXp,
        streak,
        lastDay: today,
        totalCorrect: prev.totalCorrect + (correct ? 1 : 0),
        totalWrong: prev.totalWrong + (correct ? 0 : 1),
        history: [...prev.history, { cat: currentQ.cat, correct, date: today }].slice(-200),
      };
    });
  };

  const xpForLevel = (progress.level - 1) * 100;
  const xpInLevel = progress.xp - xpForLevel;
  const xpPercent = Math.min(100, (xpInLevel / 100) * 100);

  const cats = [...new Set(QUIZ_BANK.map(q => q.cat))];
  const accuracy = progress.totalCorrect + progress.totalWrong > 0
    ? Math.round((progress.totalCorrect / (progress.totalCorrect + progress.totalWrong)) * 100)
    : 0;

  return (
    <div style={{
      flex: 1, overflow: "hidden", display: "flex", flexDirection: "column",
      background: "#050500", fontFamily: "var(--font-mono)",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px", borderBottom: `1px solid ${M}33`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: M, fontSize: "14px" }}>⛩</span>
          <span style={{ color: Y, fontSize: "12px", letterSpacing: "0.15em" }}>NETWATCH DOJO</span>
          <span style={{ color: DIM, fontSize: "10px" }}>Lv.{progress.level}</span>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {MODES.map(m => (
            <button key={m} onClick={() => { setMode(m); if (m === "quiz") setCurrentQ(null); }}
              style={{
                background: mode === m ? `${M}33` : "transparent",
                border: `1px solid ${mode === m ? M : "#1a1a1a"}`,
                color: mode === m ? M : "#444",
                fontFamily: "var(--font-mono)", fontSize: "9px",
                padding: "3px 10px", cursor: "pointer",
                textTransform: "uppercase", letterSpacing: "0.08em",
              }}
            >{m}</button>
          ))}
        </div>
      </div>

      {/* XP bar */}
      <div style={{ padding: "6px 16px", display: "flex", gap: "8px", alignItems: "center" }}>
        <span style={{ color: Y, fontSize: "9px" }}>XP {progress.xp}</span>
        <div style={{ flex: 1, height: 4, background: "#1a1a00", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${xpPercent}%`, background: G, transition: "width 0.3s" }}/>
        </div>
        <span style={{ color: DIM, fontSize: "9px" }}>🔥{progress.streak}d</span>
        <span style={{ color: DIM, fontSize: "9px" }}>{accuracy}%</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {mode === "quiz" && currentQ && (
          <div>
            {/* Category filters */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "16px", flexWrap: "wrap" }}>
              <button onClick={() => { setCatFilter(null); setCurrentQ(null); }}
                style={{ background: !catFilter ? "#1a1a00" : "transparent", border: `1px solid ${!catFilter ? Y + "55" : "#111"}`, color: !catFilter ? Y : "#333", fontFamily: "var(--font-mono)", fontSize: "8px", padding: "2px 8px", cursor: "pointer" }}
              >ALL</button>
              {cats.map(cat => (
                <button key={cat} onClick={() => { setCatFilter(cat); setCurrentQ(null); }}
                  style={{ background: catFilter === cat ? `${CAT_COLORS[cat]}18` : "transparent", border: `1px solid ${catFilter === cat ? CAT_COLORS[cat] + "55" : "#111"}`, color: catFilter === cat ? CAT_COLORS[cat] : "#333", fontFamily: "var(--font-mono)", fontSize: "8px", padding: "2px 8px", cursor: "pointer", textTransform: "uppercase" }}
                >{cat}</button>
              ))}
            </div>

            {/* Question */}
            <div style={{ marginBottom: "16px" }}>
              <span style={{ color: CAT_COLORS[currentQ.cat] || W, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {currentQ.cat}
              </span>
              <div style={{ color: W, fontSize: "13px", marginTop: "8px", lineHeight: "20px" }}>
                {currentQ.q}
              </div>
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
              {currentQ.options.map((opt, i) => {
                let bg = "transparent";
                let borderColor = "#1a1a1a";
                let color = "#888";
                if (revealed) {
                  if (i === currentQ.answer) { bg = `${G}18`; borderColor = G; color = G; }
                  else if (i === selected && i !== currentQ.answer) { bg = `${R}18`; borderColor = R; color = R; }
                } else if (i === selected) {
                  borderColor = Y; color = Y;
                }
                return (
                  <button key={i} onClick={() => handleAnswer(i)}
                    style={{
                      background: bg, border: `1px solid ${borderColor}`,
                      color, fontFamily: "var(--font-mono)", fontSize: "12px",
                      padding: "8px 14px", cursor: revealed ? "default" : "pointer",
                      textAlign: "left", transition: "all 0.15s",
                    }}
                  >
                    <span style={{ color: Y, marginRight: "8px", fontSize: "10px" }}>{String.fromCharCode(65 + i)}</span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Result + Next */}
            {revealed && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ color: selected === currentQ.answer ? G : R, fontSize: "12px" }}>
                  {selected === currentQ.answer ? "✓ Correcto! +10 XP" : `✗ Incorrecto — ${currentQ.options[currentQ.answer]}`}
                </span>
                <button onClick={pickQuestion}
                  style={{ background: "transparent", border: `1px solid ${Y}`, color: Y, fontFamily: "var(--font-mono)", fontSize: "10px", padding: "4px 14px", cursor: "pointer", marginLeft: "auto" }}
                >NEXT ▸</button>
              </div>
            )}
          </div>
        )}

        {mode === "rosetta" && (
          <div>
            <div style={{ color: Y, fontSize: "11px", marginBottom: "12px", letterSpacing: "0.1em" }}>
              ROSETTA — Equivalencias entre shells
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "10px" }}>
                <thead>
                  <tr>
                    {["Acción", "PowerShell", "Bash/Linux", "CMD"].map(h => (
                      <th key={h} style={{ padding: "6px 8px", borderBottom: `1px solid ${M}33`, color: Y, textAlign: "left", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROSETTA.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #111" }}>
                      <td style={{ padding: "5px 8px", color: W }}>{row.action}</td>
                      <td style={{ padding: "5px 8px", color: Y }}>{row.ps}</td>
                      <td style={{ padding: "5px 8px", color: G }}>{row.bash}</td>
                      <td style={{ padding: "5px 8px", color: "#00F0FF" }}>{row.cmd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {mode === "progress" && (
          <div>
            <div style={{ color: Y, fontSize: "11px", marginBottom: "16px", letterSpacing: "0.1em" }}>
              PROGRESO
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              {[
                { label: "Nivel", value: progress.level, color: Y },
                { label: "XP Total", value: progress.xp, color: G },
                { label: "Racha", value: `${progress.streak} días`, color: "#ff8800" },
                { label: "Precisión", value: `${accuracy}%`, color: M },
                { label: "Correctas", value: progress.totalCorrect, color: G },
                { label: "Incorrectas", value: progress.totalWrong, color: R },
              ].map(stat => (
                <div key={stat.label} style={{
                  padding: "10px", border: `1px solid ${stat.color}22`,
                  background: `${stat.color}08`,
                }}>
                  <div style={{ color: DIM, fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase" }}>{stat.label}</div>
                  <div style={{ color: stat.color, fontSize: "18px", fontWeight: 700, marginTop: "4px" }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Category breakdown */}
            <div style={{ color: Y, fontSize: "10px", marginBottom: "8px" }}>POR CATEGORÍA</div>
            {cats.map(cat => {
              const catHistory = progress.history.filter(h => h.cat === cat);
              const catCorrect = catHistory.filter(h => h.correct).length;
              const catTotal = catHistory.length;
              const catPct = catTotal > 0 ? Math.round((catCorrect / catTotal) * 100) : 0;
              return (
                <div key={cat} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ color: CAT_COLORS[cat], fontSize: "9px", width: "70px", textTransform: "uppercase" }}>{cat}</span>
                  <div style={{ flex: 1, height: 6, background: "#1a1a00", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${catPct}%`, background: CAT_COLORS[cat], transition: "width 0.3s" }}/>
                  </div>
                  <span style={{ color: DIM, fontSize: "9px", width: "40px" }}>{catPct}%</span>
                  <span style={{ color: DIM, fontSize: "9px" }}>{catTotal}q</span>
                </div>
              );
            })}

            {/* Reset */}
            <button onClick={() => { setProgress(defaultProgress()); }}
              style={{
                marginTop: "20px", background: "transparent",
                border: `1px solid ${R}44`, color: R + "88",
                fontFamily: "var(--font-mono)", fontSize: "9px",
                padding: "4px 12px", cursor: "pointer",
              }}
            >RESET PROGRESO</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(DojoPanel);
