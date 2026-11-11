import { useState } from "react";
import { MODULE_DEFS, PRESETS } from "../config/modules";
import { useModuleConfig } from "../hooks/useModuleConfig.jsx";

const Y = "#FCEE0A";
const G = "#39FF14";
const C = "var(--nw-accent)";
const DIM = "#888";

export default function SetupWizard({ onDone }) {
  const { setPreset, setModule, markFirstRunDone, isEnabled } = useModuleConfig();
  const [step, setStep] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState(null);

  const handlePreset = (name) => {
    setSelectedPreset(name);
    setPreset(name);
  };

  const handleFinish = () => {
    markFirstRunDone();
    onDone();
  };

  const presetEntries = Object.entries(PRESETS);

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 300,
      background: "#080700",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-mono)",
    }}>
      {/* Header */}
      <div style={{ marginBottom: "32px", textAlign: "center" }}>
        <div style={{ fontSize: "10px", color: DIM, letterSpacing: "0.2em", marginBottom: "8px" }}>
          {`PASO ${step + 1} DE 3`}
        </div>
        <div style={{ fontSize: "18px", color: Y, letterSpacing: "0.15em" }}>
          {step === 0 ? "BIENVENIDO A NETWATCH" : step === 1 ? "MÓDULOS" : "TODO LISTO"}
        </div>
        <div style={{ width: "200px", height: "2px", background: `${Y}33`, margin: "12px auto 0", position: "relative" }}>
          <div style={{ width: `${((step + 1) / 3) * 100}%`, height: "100%", background: Y, transition: "width 0.3s" }} />
        </div>
      </div>

      {/* Step content */}
      <div style={{ width: "100%", maxWidth: "500px", padding: "0 24px" }}>
        {step === 0 && (
          <div>
            <div style={{ fontSize: "10px", color: DIM, marginBottom: "16px", textAlign: "center" }}>
              Elige tu perfil. Puedes cambiar todo después con <span style={{ color: C }}>nw config</span>
            </div>
            {presetEntries.map(([key, p]) => (
              <div key={key}
                onClick={() => handlePreset(key)}
                style={{
                  padding: "12px 16px", marginBottom: "8px",
                  background: selectedPreset === key ? "#0d0c00" : "#0a0a00",
                  border: `1px solid ${selectedPreset === key ? Y : "#1a1a00"}`,
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onMouseOver={e => { if (selectedPreset !== key) e.currentTarget.style.borderColor = "#333"; }}
                onMouseOut={e => { if (selectedPreset !== key) e.currentTarget.style.borderColor = "#1a1a00"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: selectedPreset === key ? Y : "#ccc", fontWeight: 700 }}>
                    {p.label.toUpperCase()}
                  </span>
                  {selectedPreset === key && <span style={{ fontSize: "10px", color: G }}>✓</span>}
                </div>
                <div style={{ fontSize: "9px", color: DIM, marginTop: "4px" }}>{p.description}</div>
              </div>
            ))}
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ fontSize: "10px", color: DIM, marginBottom: "16px", textAlign: "center" }}>
              Ajusta módulos individualmente
            </div>
            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
              {Object.entries(MODULE_DEFS).map(([key, def]) => {
                const on = isEnabled(key);
                return (
                  <div key={key}
                    onClick={() => setModule(key, !on)}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "6px 12px", marginBottom: "4px",
                      background: on ? "#0d0c00" : "transparent",
                      border: `1px solid ${on ? Y + "33" : "#111"}`,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ color: on ? G : "#333", fontSize: "10px" }}>{on ? "●" : "○"}</span>
                    <span style={{ fontSize: "10px", color: on ? "#ccc" : "#666", flex: 1 }}>{def.label}</span>
                    <span style={{ fontSize: "8px", color: DIM }}>{def.description}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚡</div>
            <div style={{ fontSize: "10px", color: DIM, marginBottom: "8px" }}>
              {Object.keys(MODULE_DEFS).filter(k => isEnabled(k)).length} módulos activos
            </div>
            <div style={{ fontSize: "9px", color: DIM }}>
              Cambia la config en cualquier momento con <span style={{ color: C }}>nw config</span>
              <br />o relanza este wizard con <span style={{ color: C }}>nw setup</span>
            </div>
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{
            background: "transparent", border: "1px solid #333",
            color: DIM, fontFamily: "var(--font-mono)", fontSize: "10px",
            padding: "6px 20px", cursor: "pointer",
          }}
            onMouseOver={e => { e.target.style.borderColor = Y; e.target.style.color = Y; }}
            onMouseOut={e => { e.target.style.borderColor = "#333"; e.target.style.color = DIM; }}
          >← ATRÁS</button>
        )}
        {step < 2 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 0 && !selectedPreset}
            style={{
              background: (step === 0 && !selectedPreset) ? "#111" : Y,
              border: "none",
              color: (step === 0 && !selectedPreset) ? "#333" : "#000",
              fontFamily: "var(--font-mono)", fontSize: "10px",
              padding: "6px 20px", cursor: (step === 0 && !selectedPreset) ? "default" : "pointer",
              fontWeight: 700,
            }}
            onMouseOver={e => { if (!e.target.disabled) e.target.style.boxShadow = `0 0 12px ${Y}`; }}
            onMouseOut={e => { e.target.style.boxShadow = "none"; }}
          >SIGUIENTE →</button>
        ) : (
          <button onClick={handleFinish} style={{
            background: G, border: "none", color: "#000",
            fontFamily: "var(--font-mono)", fontSize: "10px",
            padding: "6px 24px", cursor: "pointer", fontWeight: 700,
          }}
            onMouseOver={e => { e.target.style.boxShadow = `0 0 12px ${G}`; }}
            onMouseOut={e => { e.target.style.boxShadow = "none"; }}
          >INICIAR NETWATCH ⚡</button>
        )}
      </div>

      {/* Skip */}
      {step === 0 && (
        <button onClick={handleFinish} style={{
          position: "absolute", bottom: "24px", right: "24px",
          background: "transparent", border: "1px solid #222",
          color: "#444", fontFamily: "var(--font-mono)", fontSize: "8px",
          padding: "3px 10px", cursor: "pointer", letterSpacing: "0.1em",
        }}
          onMouseOver={e => { e.target.style.borderColor = "#555"; e.target.style.color = "#888"; }}
          onMouseOut={e => { e.target.style.borderColor = "#222"; e.target.style.color = "#444"; }}
        >SKIP →</button>
      )}
    </div>
  );
}
