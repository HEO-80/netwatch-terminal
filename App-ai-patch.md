# Integrar AIPanel en App.jsx

## 1. Añadir import al principio de App.jsx

```jsx
import AIPanel from "./components/AIPanel";
```

## 2. Añadir estado aiOpen junto a panelOpen e infraOpen

```jsx
const [aiOpen, setAiOpen] = useState(false);
```

## 3. En el useEffect de atajos, añadir Alt+A

```jsx
if (e.altKey && e.key.toLowerCase() === "a") {
  e.preventDefault();
  setAiOpen(o => !o);
  return;
}
```

## 4. Pasar props a TitleBar

```jsx
<TitleBar
  ...
  aiOpen={aiOpen}
  onToggleAi={() => setAiOpen(o => !o)}
/>
```

## 5. Añadir AIPanel ENCIMA del contenido principal

Busca el div que contiene InfraPanel + contenido + SidePanel y añade AIPanel ANTES:

```jsx
{/* Fila: InfraPanel | Contenido | SidePanel */}
<div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>

  {/* Panel AI — arriba */}
  <AIPanel open={aiOpen} height={320} />

  {/* Fila horizontal: infra + contenido + crypto */}
  <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"row" }}>
    <InfraPanel open={infraOpen} />
    <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", position:"relative" }}>
      {/* ... tabs como ahora ... */}
    </div>
    <SidePanel open={panelOpen} />
  </div>

</div>
```

## 6. En TabBar — añadir botón AI

Busca los botones de panel y añade:

```jsx
<button onClick={onToggleAi} title="Alt+A — Panel AI"
  style={{
    background: aiOpen ? "#39FF14" : "transparent",
    border: `1px solid ${aiOpen ? "#39FF14" : "#1a1a00"}`,
    color: aiOpen ? "#080700" : "#333",
    fontFamily: "var(--font-mono)", fontSize: "9px",
    padding: "1px 7px", cursor: "pointer",
  }}
  onMouseOver={e => { if (!aiOpen) { e.target.style.borderColor = "#39FF14"; e.target.style.color = "#39FF14"; } }}
  onMouseOut={e => { if (!aiOpen) { e.target.style.borderColor = "#1a1a00"; e.target.style.color = "#333"; } }}
>◈ AI</button>
```
