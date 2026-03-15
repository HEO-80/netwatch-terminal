# NETWATCH Terminal — PTY Server Setup

## ¿Qué es esto?

El PTY server conecta xterm.js (frontend) con PowerShell real vía WebSocket.
Arquitectura completa:

```
xterm.js  ←→  ws://127.0.0.1:7777  ←→  node-pty  ←→  pwsh.exe + tu profile.ps1
```

---

## Paso 1 — Instalar dependencias del sidecar

```powershell
cd C:\Cursos\Projects\netwatch-terminal\sidecar
npm install
```

Esto instala `node-pty` y `ws`.

---

## Paso 2 — Instalar Visual C++ Redistributable (si node-pty falla)

node-pty necesita compilar bindings nativos. Si falla:

```powershell
# Instalar node-gyp globalmente
npm install -g node-gyp windows-build-tools
```

O simplemente instala las dependencias y si hay error de compilación:
```powershell
npm install --build-from-source
```

---

## Paso 3 — Instalar addon Unicode en el frontend

```powershell
cd C:\Cursos\Projects\netwatch-terminal\frontend
npm install @xterm/addon-unicode11
```

---

## Paso 4 — Reemplazar archivos

| Archivo | Destino |
|---------|---------|
| `Terminal.jsx` | `frontend/src/components/Terminal.jsx` |
| `main.rs` | `src-tauri/src/main.rs` |
| `sidecar/pty-server.js` | `sidecar/pty-server.js` (crear carpeta) |
| `sidecar/package.json` | `sidecar/package.json` |

---

## Paso 5 — Crear carpeta sidecar en la raíz

```
netwatch-terminal/
├── sidecar/              ← NUEVA carpeta
│   ├── pty-server.js
│   ├── package.json
│   └── node_modules/     ← tras npm install
├── frontend/
├── src-tauri/
└── ...
```

---

## Paso 6 — Probar el PTY server solo

Antes de arrancar Tauri, prueba que el servidor funciona:

```powershell
cd sidecar
node pty-server.js
# Deberías ver: [NETWATCH PTY] Servidor escuchando en ws://127.0.0.1:7777
```

---

## Paso 7 — Arrancar todo

```powershell
cd C:\Cursos\Projects\netwatch-terminal
cargo tauri dev
```

Tauri arrancará el PTY server automáticamente. Cuando abras la pestaña Terminal,
xterm.js se conectará a PowerShell con tu profile.ps1 cargado.

---

## Lo que tendrás funcionando

- ✅ Oh My Posh con `omp_cyberpunk.json` — prompt NETWATCH completo
- ✅ PSReadLine con autocompletado inline (flecha →)  
- ✅ fzf con Ctrl+T (archivos) y Ctrl+R (historial)
- ✅ zoxide con `z nombre_carpeta`
- ✅ Terminal-Icons con `ls`
- ✅ Git info en el prompt automático
- ✅ Aliases: `bee`, `n`, `o`, `g`, `vsc`, `proj`
- ✅ `Set-Theme`, `Show-Dashboard`, `Show-Help`
- ✅ Resize automático al cambiar tamaño de ventana
- ✅ Scroll con 10.000 líneas de historial

---

## Para producción (.exe instalable)

Compilar el PTY server a ejecutable standalone:

```powershell
cd sidecar
npm install -g pkg
npm run build
# Genera: netwatch-pty-server.exe
# Copiarlo a: src-tauri/binaries/netwatch-pty-server-x86_64-pc-windows-msvc.exe
```

Y en `tauri.conf.json` añadir:
```json
"bundle": {
  "externalBin": ["binaries/netwatch-pty-server"]
}
```
