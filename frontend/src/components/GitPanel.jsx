import { useState, useEffect, useCallback, useRef, memo } from "react";

const Y   = "#FCEE0A";
const G   = "#39FF14";
const C   = "var(--nw-accent)";
const M   = "#D9027D";
const R   = "#ff5555";
const DIM = "#444";

async function invoke(cmd, args) {
  try {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return await tauriInvoke(cmd, args);
  } catch { return null; }
}

function SectionTitle({ children, color = C }) {
  return (
    <div style={{
      fontFamily: "var(--font-mono)", fontSize: "9px", color,
      letterSpacing: "0.12em", textTransform: "uppercase",
      borderBottom: "1px solid #1a1a1a",
      paddingBottom: "4px", marginBottom: "6px", marginTop: "12px",
    }}>
      {children}
    </div>
  );
}

function StatusDot({ color, pulse }) {
  return (
    <span style={{
      display: "inline-block", width: 6, height: 6,
      borderRadius: "50%", background: color,
      boxShadow: pulse ? `0 0 4px ${color}` : "none",
      marginRight: 5, flexShrink: 0,
    }}/>
  );
}

function FileRow({ file }) {
  const [diff, setDiff] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const statusMap = {
    "M":  { label: "mod", color: Y },
    "A":  { label: "add", color: G },
    "D":  { label: "del", color: R },
    "R":  { label: "ren", color: C },
    "??": { label: "new", color: M },
    "U":  { label: "conflict", color: R },
  };
  const st = statusMap[file.status] || { label: file.status, color: DIM };

  const toggleDiff = async () => {
    if (expanded) { setExpanded(false); return; }
    if (diff !== null) { setExpanded(true); return; }
    const cmd = file.staged
      ? `git diff --cached -- "${file.path}"`
      : file.status === "??" ? `Get-Content "${file.path}" -TotalCount 30 -ErrorAction SilentlyContinue`
      : `git diff -- "${file.path}"`;
    const res = await runGitCmd(cmd);
    setDiff(res || "(sin cambios)");
    setExpanded(true);
  };

  return (
    <div>
      <div onClick={toggleDiff} style={{
        display: "flex", alignItems: "center", gap: "5px",
        padding: "2px 0", fontFamily: "var(--font-mono)", fontSize: "9px",
        cursor: "pointer",
      }}
        onMouseOver={e => e.currentTarget.style.background = "#111"}
        onMouseOut={e => e.currentTarget.style.background = "transparent"}
      >
        <span style={{
          color: st.color, width: 28, textAlign: "center", flexShrink: 0,
          fontSize: "8px", letterSpacing: "0.05em",
        }}>{st.label}</span>
        <span style={{
          color: file.staged ? G : "#999",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          flex: 1,
        }}>{file.path}</span>
        {file.staged && <span style={{ color: G, fontSize: "7px", flexShrink: 0 }}>staged</span>}
        <span style={{ color: DIM, fontSize: "8px", flexShrink: 0 }}>{expanded ? "▾" : "▸"}</span>
      </div>
      {expanded && diff !== null && (
        <div style={{
          maxHeight: "120px", overflowY: "auto", padding: "4px 6px",
          background: "#0a0a00", border: "1px solid #1a1a00", marginBottom: "4px",
          fontFamily: "var(--font-mono)", fontSize: "8px", lineHeight: "1.5",
          whiteSpace: "pre-wrap", wordBreak: "break-all",
        }}>
          {diff.split("\n").slice(0, 40).map((line, i) => {
            let color = "#555";
            if (line.startsWith("+")) color = G;
            else if (line.startsWith("-")) color = R;
            else if (line.startsWith("@@")) color = C;
            return <div key={i} style={{ color }}>{line}</div>;
          })}
        </div>
      )}
    </div>
  );
}

async function fetchGitData() {
  const res = await invoke("run_powershell", {
    command: [
      "$ErrorActionPreference='SilentlyContinue'",
      "$inGit = git rev-parse --is-inside-work-tree 2>$null",
      "if ($inGit -ne 'true') { Write-Output 'NOGIT'; exit }",
      "$branch = git branch --show-current 2>$null",
      "$remote = git rev-parse --abbrev-ref '@{upstream}' 2>$null",
      "$ahead = 0; $behind = 0",
      "if ($remote) {",
      "  $ahead = git rev-list --count '@{upstream}..HEAD' 2>$null",
      "  $behind = git rev-list --count 'HEAD..@{upstream}' 2>$null",
      "}",
      "$stashCount = (git stash list 2>$null | Measure-Object).Count",
      "$lastMsg = git log -1 --format='%s' 2>$null",
      "$lastWhen = git log -1 --format='%cr' 2>$null",
      "$repoName = (git rev-parse --show-toplevel 2>$null) | Split-Path -Leaf",
      "$status = git status --porcelain 2>$null",
      "$files = @()",
      "if ($status) {",
      "  $status | ForEach-Object {",
      "    $xy = $_.Substring(0,2)",
      "    $f = $_.Substring(3)",
      "    $staged = $xy[0] -ne ' ' -and $xy[0] -ne '?'",
      "    $st = if ($xy -eq '??') {'??'} elseif ($staged) {$xy[0].ToString()} else {$xy[1].ToString()}",
      "    $files += \"$st|$staged|$f\"",
      "  }",
      "}",
      "$filesStr = $files -join ';;'",
      "Write-Output \"OK|$repoName|$branch|$ahead|$behind|$stashCount|$lastMsg|$lastWhen|$filesStr\"",
    ].join(";"),
  });

  const raw = res?.stdout?.trim();
  if (!raw || raw === "NOGIT") return null;
  if (!raw.startsWith("OK|")) return null;

  const parts = raw.substring(3).split("|");
  const repoName  = parts[0] || "";
  const branch    = parts[1] || "";
  const ahead     = parseInt(parts[2]) || 0;
  const behind    = parseInt(parts[3]) || 0;
  const stash     = parseInt(parts[4]) || 0;
  const lastMsg   = parts[5] || "";
  const lastWhen  = parts[6] || "";
  const filesStr  = parts.slice(7).join("|");

  const files = filesStr ? filesStr.split(";;").filter(Boolean).map(f => {
    const [status, staged, ...pathParts] = f.split("|");
    return { status, staged: staged === "True", path: pathParts.join("|") };
  }) : [];

  return { repoName, branch, ahead, behind, stash, lastMsg, lastWhen, files };
}

async function runGitCmd(command) {
  const res = await invoke("run_powershell", { command });
  return res?.stdout?.trim() || res?.stderr?.trim() || "";
}

function GitButton({ label, color, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "transparent", border: `1px solid ${disabled ? "#222" : color}`,
        color: disabled ? "#333" : color, fontFamily: "var(--font-mono)", fontSize: "8px",
        padding: "3px 8px", cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1, transition: "border-color 0.15s",
      }}
    >{label}</button>
  );
}

function GitPanel({ open }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpd, setLastUpd] = useState(null);
  const [actionMsg, setActionMsg] = useState("");
  const [commitMode, setCommitMode] = useState(false);
  const [commitMsg, setCommitMsg]   = useState("");
  const commitRef = useRef(null);
  const timerRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const d = await fetchGitData();
    setData(d);
    setLastUpd(new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) { clearInterval(timerRef.current); return; }
    refresh();
    timerRef.current = setInterval(refresh, 10000);
    return () => clearInterval(timerRef.current);
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const handler = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [open, refresh]);

  const doAction = useCallback(async (label, cmd) => {
    setActionMsg(`${label}...`);
    await runGitCmd(cmd);
    await refresh();
    setActionMsg(`✓ ${label}`);
    setTimeout(() => setActionMsg(""), 2000);
  }, [refresh]);

  const gitPush  = useCallback(() => doAction("Push", "git push origin HEAD"), [doAction]);
  const gitPull  = useCallback(() => doAction("Pull", "git pull --ff-only"), [doAction]);
  const gitStash = useCallback(() => doAction("Stash", "git stash -u"), [doAction]);
  const gitStashPop = useCallback(() => doAction("Stash pop", "git stash pop"), [doAction]);
  const gitCommit = useCallback(() => {
    setCommitMode(true);
    setCommitMsg("");
    setTimeout(() => commitRef.current?.focus(), 50);
  }, []);
  const doCommit = useCallback(() => {
    if (!commitMsg.trim()) return;
    doAction("Commit", `git add -A; git commit -m '${commitMsg.trim().replace(/'/g, "''")}'`);
    setCommitMode(false);
    setCommitMsg("");
  }, [commitMsg, doAction]);

  const staged   = data?.files?.filter(f => f.staged) || [];
  const unstaged = data?.files?.filter(f => !f.staged) || [];
  const isClean  = data && data.files.length === 0;

  return (
    <div style={{
      width:      open ? "220px" : "0px",
      minWidth:   open ? "220px" : "0px",
      overflow:   "hidden",
      background: "#020200",
      borderLeft: open ? "1px solid #D9027D" : "none",
      flexShrink: 0,
      transition: "width 0.2s ease, min-width 0.2s ease",
      display:    "flex",
      flexDirection: "column",
    }}>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Header */}
          <div style={{ padding: "12px 14px 0 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: M, letterSpacing: "0.1em" }}>
                ◈ GIT
              </span>
              <button
                onClick={refresh}
                style={{ background: "transparent", border: "none", color: loading ? DIM : M, fontFamily: "var(--font-mono)", fontSize: "9px", cursor: "pointer", padding: 0 }}
                title="Actualizar"
              >{loading ? "···" : "↺"}</button>
            </div>
            {lastUpd && <div style={{ fontSize: "8px", color: "#333", fontFamily: "var(--font-mono)", marginBottom: "4px" }}>upd: {lastUpd}</div>}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 12px 14px" }}>
            {!data ? (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: DIM, marginTop: "14px" }}>
                {loading ? "Detectando repo..." : "No es un repo git"}
              </div>
            ) : (
              <>
                {/* Repo + Branch */}
                <SectionTitle color={M}>Repositorio</SectionTitle>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: Y, fontWeight: 700 }}>
                  {data.repoName}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                  <StatusDot color={isClean ? G : Y} pulse={!isClean} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: C }}>{data.branch}</span>
                </div>

                {/* Ahead / Behind */}
                {(data.ahead > 0 || data.behind > 0) && (
                  <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                    {data.ahead > 0 && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: G }}>
                        ↑{data.ahead} ahead
                      </span>
                    )}
                    {data.behind > 0 && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: R }}>
                        ↓{data.behind} behind
                      </span>
                    )}
                  </div>
                )}

                {/* Status */}
                <SectionTitle>Estado</SectionTitle>
                {isClean ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: G }}>✓ Working tree clean</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {staged.length > 0 && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: G }}>
                        {staged.length} staged
                      </span>
                    )}
                    {unstaged.length > 0 && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: Y }}>
                        {unstaged.length} modified
                      </span>
                    )}
                  </div>
                )}

                {/* Staged files */}
                {staged.length > 0 && (
                  <>
                    <SectionTitle color={G}>Staged</SectionTitle>
                    {staged.map((f, i) => <FileRow key={i} file={f} />)}
                  </>
                )}

                {/* Unstaged files */}
                {unstaged.length > 0 && (
                  <>
                    <SectionTitle color={Y}>Cambios</SectionTitle>
                    {unstaged.map((f, i) => <FileRow key={i} file={f} />)}
                  </>
                )}

                {/* Stash */}
                {data.stash > 0 && (
                  <>
                    <SectionTitle color={C}>Stash</SectionTitle>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: C }}>
                      {data.stash} {data.stash === 1 ? "entrada" : "entradas"}
                    </span>
                  </>
                )}

                {/* Last commit */}
                <SectionTitle>Ultimo commit</SectionTitle>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "#999", lineHeight: "1.4" }}>
                  {data.lastMsg || "—"}
                </div>
                {data.lastWhen && (
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: DIM, marginTop: "2px" }}>
                    {data.lastWhen}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Git actions */}
          {data && (
            <div style={{ padding: "6px 14px", borderTop: "1px solid #1a1a00" }}>
              {commitMode ? (
                <div style={{ display: "flex", gap: "4px" }}>
                  <input ref={commitRef} value={commitMsg} onChange={e => setCommitMsg(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") doCommit(); if (e.key === "Escape") setCommitMode(false); }}
                    placeholder="commit msg..."
                    style={{ flex: 1, background: "#0a0a00", border: `1px solid ${G}`, color: "#E8E8E8",
                      fontFamily: "var(--font-mono)", fontSize: "9px", padding: "3px 6px", outline: "none" }} />
                  <GitButton label="OK" color={G} onClick={doCommit} />
                </div>
              ) : (
                <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
                  <GitButton label="COMMIT" color={G} onClick={gitCommit} disabled={isClean} />
                  <GitButton label="PUSH" color={C} onClick={gitPush} />
                  <GitButton label="PULL" color={C} onClick={gitPull} />
                  <GitButton label="STASH" color={Y} onClick={gitStash} disabled={isClean} />
                  {data.stash > 0 && <GitButton label="POP" color={Y} onClick={gitStashPop} />}
                </div>
              )}
              {actionMsg && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: G, marginTop: "4px" }}>
                  {actionMsg}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div style={{
            padding: "4px 14px", borderTop: "1px solid #1a1a00",
            fontFamily: "var(--font-mono)", fontSize: "8px", color: "#222", textAlign: "center",
          }}>
            Alt+P para ciclar paneles
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(GitPanel);
