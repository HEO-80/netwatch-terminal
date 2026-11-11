NETWATCH Terminal v3 — Roadmap

Proyecto: https://github.com/HEO-80/netwatch-terminal
Stack: Tauri v2 (Rust) + React + Vite + xterm.js
Branch actual: feature/tauri-setup

FASE 1 — Optimización de lo existente

Paneles lazy:

 Los 4 paneles laterales (Crypto, Infra, AI, Metrics) solo deben hacer fetch/polling cuando están visibles. Si el panel está oculto, cero requests, cero CPU
 Añadir un flag isVisible en el state de cada panel y condicionar los intervals/fetches a ese flag

Store seguro para claves API:

 Migrar las API keys (Ollama, Gemini, Claude, CoinGecko, Etherscan, GitHub) de localStorage a tauri-plugin-store
 Crear un mini panel de Settings (accesible con nw config o un icono) para gestionar las keys desde la UI

Métricas nativas en Rust:

 Reemplazar el polling de métricas via run_powershell (que lanza un proceso PS cada 3s) por un worker Rust persistente usando el crate sysinfo o wmi
 El worker envía datos al frontend por eventos Tauri (emit) en vez de request-response
 Mantener el fallback a mock si no hay Tauri (modo dev en browser)

WebSocket mejorado:

 Añadir exponential backoff a la reconexión (ahora son 5 reintentos lineales)
 Indicador visual en la TabBar: dot verde = conectado, amarillo = reconectando, rojo = desconectado
 Auto-reconnect silencioso cuando la ventana recupera el foco

PTY nativo (opcional, puede ir a fase posterior):

 Evaluar reemplazar el sidecar Node.js (pty.js) por el crate portable-pty en Rust puro
 Si se migra: eliminar dependencia de Node.js, el PTY corre dentro del propio binario Tauri
 Mantener soporte multi-shell: PowerShell, WSL, CMD
FASE 2 — DSL propio en Rust (lenguaje nw)

Parser básico:

 Crear módulo Rust nw-lang/ dentro de src-tauri/ con un parser (pest o nom) que interprete comandos nw
 Sintaxis base: nw <comando> [args] [| pipe] [> output]
 Si el parser no reconoce el comando, pasarlo transparentemente al shell activo (bridge)

Comandos core del DSL:

 nw proc — lista procesos (equivalente a top-cpu de powershell-cyberpunk)
 nw proc | filter cpu > 50 | top 10 — pipes con filter y top
 nw ports — puertos activos (migrar puertos de PS)
 nw kill <nombre> — matar proceso (migrar matar de PS)
 nw find <patrón> — buscar archivos (migrar buscar)
 nw size [n] — archivos más grandes (migrar top-size)
 nw dupes [ruta] — encontrar duplicados (migrar duplicados)
 nw hash <archivo> — hash de archivo (migrar hash)
 nw diff <a> <b> — comparar archivos (migrar comparar)
 nw clean [--dry] — limpiar logs/tmp (migrar clean-logs)
 nw help — listar todos los comandos disponibles con descripción

Variables de entorno NETWATCH:

 $NW_PROJECTS — ruta a proyectos
 $NW_SERVERS — lista de servidores SSH guardados
 $NW_SHELL — shell activo (ps, wsl, cmd)
 Persistir variables en el store de Tauri entre sesiones

Scripting .nw:

 Soporte para ejecutar archivos .nw con nw run script.nw
 Sintaxis mínima: variables (let x = ...), condicionales (if/else), loops (for/each), funciones (fn)
 No necesita ser Turing-complete en esta fase, solo automatización de workflows
FASE 3 — Features killer

Command Palette (Ctrl+Shift+P):

- [x] Overlay modal tipo VS Code con búsqueda fuzzy
- [x] Indexa: comandos nw, historial de shell, snippets guardados, servidores SSH, repos git, contenedores Docker, pods K8s
- [x] Resultados agrupados por categoría con iconos
- [x] Enter ejecuta, Esc cierra

Output inteligente:

- [x] Detectar cuando stdout es JSON válido y renderizarlo como tabla formateada o árbol colapsable en la terminal (nw json / nw json table)
- [x] Detectar errores comunes (npm, git, docker, python, rust, node) y mostrar sugerencia de fix inline (20+ patrones)
- [x] Opcionalmente pedir fix a AI con nw fix después de un error

Clipboard manager:

- [x] nw clip — muestra últimos 20 items copiados dentro de NETWATCH
- [x] nw clip <n> — pega el item número n
- [x] nw clip search <texto> — busca en el historial de clipboard
- [x] Shortcut Alt+V para abrir el clipboard en overlay
- [x] Persistir entre sesiones (localStorage, migrar a store de Tauri después)

Contexto de proyecto automático:

- [x] Detectar tipo de proyecto por archivos presentes (package.json, Cargo.toml, docker-compose.yml, hardhat.config.js, etc.) via nw ctx
- [x] Mostrar stack detectado, versiones, scripts npm, estado git
- [x] Comandos context-aware en Command Palette (categoría TOOLS)

Grabación de sesiones:

- [x] nw rec start [nombre] — empieza a grabar input/output de la terminal activa
- [x] nw rec stop — para y guarda la grabación
- [x] nw rec list — lista sesiones grabadas
- [x] nw rec play <nombre> — reproduce paso a paso con timestamps
- [x] nw rec export <nombre> — exportar como markdown al portapapeles
- [x] nw rec del <nombre> — eliminar grabación

Snippets con templates:

- [x] Extender nw snip con variables de template: {{name}}, {{port}}, {{date}}, {{time}}, {{user}}, {{ts}}
- [x] nw snip run deploy --name=api --port=3000 expande y ejecuta
- [x] nw snip edit <nombre> — ver snippet y variables detectadas
- [x] nw snip export / nw snip import — exportar/importar snippets como JSON
FASE 4 — Dojo integrado (training mode)

Migrar el sistema de entrenamiento de powershell-cyberpunk:

- [x] Tab especial “DOJO” con UI propia (no es un panel lateral, es un tab completo como Dashboard)
- [x] Quiz interactivo con preguntas de PowerShell, Linux, redes, Docker, K8s, git (20+ preguntas)
- [ ] Modo tatami — sandbox con misiones guiadas paso a paso (futuro)
- [x] Modo rosetta — equivalencias entre shells (PS vs bash vs cmd), tabla de 12 acciones
- [ ] Modo forja — escribir scripts desde cero con validación automática (futuro)
- [x] Progreso persistente: racha diaria, puntos, nivel, historial de aciertos/fallos (XP + streak + localStorage)
- [x] Dashboard visual de progreso con gráficos estilo cyberpunk (barras por categoría, stats grid)
- [x] Banco de preguntas ampliable (QUIZ_BANK array extensible, filtro por categoría)

Modo Notebook (tab especial):

- [x] Tab “NOTEBOOK” donde puedes mezclar celdas de código (ejecutables) con celdas de markdown
- [x] Output inline debajo de cada celda de código
- [x] Guardar/cargar notebooks en localStorage (crear, abrir, eliminar)
- [x] Ejecutar celdas individuales o RUN ALL
- [x] Cambiar tipo de celda (code ↔ markdown)
FASE 5 — Ecosistema

Sistema de plugins:

- [x] Estructura de plugin: carpeta con manifest.json (nombre, versión, comandos, panel?) + archivos .nw o .js
- [x] nw plugin install <nombre> / nw plugin remove <nombre> / nw plugin list
- [x] Los plugins pueden registrar nuevos comandos nw y opcionalmente un panel lateral custom
- [x] Repositorio local de plugins en ~/.netwatch/plugins/

Profiles exportables:

- [x] nw profile export — genera un .nw-profile con: theme, snippets, servidores SSH, variables, shortcuts custom, plugins instalados
- [x] nw profile import <archivo> — importa y aplica
- [x] Útil para sincronizar entre máquinas o compartir con alumnos

Sync entre instancias:

- [x] Sincronización opcional de config/snippets/historial entre instancias de NETWATCH (ej: portátil ↔ Beelink)
- [x] Puede ser via git repo privado, rsync, o un mini server en el Beelink
- [x] nw sync push / nw sync pull

Theme engine:

- [x] Sistema de temas custom con paleta de colores (accent, glow, corner, border) en localStorage
- [x] nw theme list / nw theme <nombre> / nw theme create <nombre> <hex> [corner-hex]
- [x] nw theme delete <nombre> — eliminar temas custom
- [x] 5 temas built-in (cyan, red, yellow, green, magenta) + temas custom ilimitados
- [x] Hot-reload al cambiar de tema sin reiniciar (CustomEvent + CSS custom properties)

Multi-plataforma:

- [ ] Asegurar que el build funciona en Linux además de Windows (Tauri ya lo soporta)
- [ ] Adaptar las métricas WMI a equivalentes Linux (ya hay fallback a mock, pero hacerlo real con sysinfo)
- [ ] Build para macOS si hay demanda
---

## Notas para Claude Code

- El repo está en `feature/tauri-setup`. Trabajar ahí o crear ramas por fase (`phase-1/optimization`, `phase-2/nw-lang`, etc.)
- El backend Rust está en `src-tauri/`, el frontend React en `frontend/`
- Los comandos `nw` actuales se interceptan en `frontend/src/nw-commands.js` — en fase 2 eso se mueve al backend Rust
- Prioridad: fase 1 primero (optimizar lo que hay), luego fase 2 (DSL), luego 3-4-5 en orden
- Cada feature debería funcionar independientemente, no bloquear otras


### FASE 1.5 — Paneles modulares (slot derecho intercambiable)

El panel derecho deja de ser solo CRYPTO. `Alt+P` cicla entre paneles disponibles. Cada panel es un modulo independiente. Prepara la arquitectura para plugins (Fase 5).

#### Arquitectura
- [x] Refactorizar `App.jsx`: slot derecho acepta multiples panel types
- [x] `Alt+P` cicla: (cerrado) → CRYPTO → TASKS → GIT → (cerrado)
- [x] Indicador en TabBar muestra panel activo (label + color dinamico)
- [x] Cada panel es lazy (solo fetch/render cuando visible)

#### Panel TASKS (A)
- [x] Kanban vertical: pendiente / en curso / hecho
- [x] `nw task add “texto”` / `nw task done <n>` / `nw task rm <n>` / `nw task start <n>`
- [x] `nw task list` — listar desde terminal
- [x] Persistente en localStorage (migrar a tauri-store despues)
- [x] Panel visual con input, botones avanzar/retroceder, limpiar completadas
- [x] Drag visual para mover tareas entre columnas (HTML5 drag & drop con drop zones)

#### Panel GIT (B)
- [x] Rama actual, commits ahead/behind, archivos modified/staged/stash
- [x] Refresh cada 10s + al recuperar foco de ventana (`visibilitychange`)
- [x] Nombre del repo, ultimo commit con timestamp
- [x] Archivos separados por staged / cambios con status (mod/add/del/new/ren)
- [x] Dot animado si hay cambios, verde si clean
- [x] Botones rápidos: commit (con input inline), push, pull, stash, stash pop
- [x] Diff visual inline — click en archivo muestra diff coloreado (+/- lines)

#### Panel LOGS (C)
- [x] Stream en vivo de Windows Event Logs (System + Application)
- [x] Filtros por severity (error, warn, info, debug) con contadores
- [x] Busqueda por texto en tiempo real
- [x] Auto-scroll con deteccion de scroll manual
- [x] Pause/resume, limpiar buffer, refresh manual
- [x] `nw docker ps/logs/follow` — monitorear contenedores y sus logs
- [x] `nw tail <archivo> [n]` / `nw tail -f <archivo>` — tail con color-coded errors/warnings

#### Panel NOTES (D)
- [x] Scratchpad rapido con texto plano / markdown basico
- [x] `nw note “texto”` para agregar desde terminal
- [x] Persistente entre sesiones (localStorage `nw-notes`)
- [x] Pin/unpin notas (★/☆) — fijadas siempre arriba
- [x] `nw note` / `nw note add` / `nw note rm` / `nw note clear` desde terminal
- [x] `nw note export` — exportar notas como markdown al portapapeles
- [x] `nw note pin <n>` — fijar/desfijar notas desde terminal

---

## CHECKLIST DE PROGRESO

### FASE 1 — Optimizacion de lo existente

#### Paneles lazy
- [x] `InfraPanel` — ya solo hace fetch cuando `open === true`
- [x] `MetricsPanel` — ya usa `useMetrics(open)`, para interval si cerrado
- [x] `SidePanel` (Crypto) — migrar fetch/interval a solo cuando `open`
- [x] `AIPanel` — diferir deteccion de providers y warmup de Ollama hasta que se abra el panel

#### Store seguro para claves API
- [x] Instalar `tauri-plugin-store` (Rust crate + `@tauri-apps/plugin-store` npm)
- [x] Migrar API keys de `localStorage` a store de Tauri (Gemini, Claude, GitHub token/user) con auto-migración desde localStorage
- [x] Crear mini panel de Settings (`nw config` o `Alt+P → SETTINGS`) para gestionar keys desde la UI
- [x] Utility `secure-store.js` con fallback a localStorage en modo dev (browser sin Tauri)
- [x] Capabilities Tauri v2 configuradas (`store:default`)

#### Metricas nativas en Rust
- [x] Agregar crate `sysinfo` (v0.33) a `Cargo.toml`
- [x] Crear comando Tauri `get_system_metrics` que devuelva CPU, RAM, discos, red, uptime
- [x] Reemplazar el polling via `run_powershell` en `MetricsPanel` por el nuevo comando nativo
- [ ] Evaluar worker Rust persistente con eventos Tauri (`emit`) en vez de request-response
- [x] Mantener fallback a mock si no hay Tauri (modo dev en browser)

#### WebSocket mejorado
- [x] Implementar exponential backoff en la reconexion (1s→2s→4s→8s→16s→30s, 8 reintentos)
- [x] Agregar indicador visual en info bar: ● verde = conectado, ◌ amarillo = reconectando, ○ rojo = desconectado
- [x] Auto-reconnect silencioso cuando la ventana recupera el foco (`visibilitychange`)

#### PTY nativo (opcional)
- [ ] Evaluar crate `portable-pty` vs sidecar Node.js actual
- [ ] Si se migra: eliminar dependencia de Node.js, PTY dentro del binario Tauri
- [ ] Mantener soporte multi-shell: PowerShell, WSL, CMD

### FASE 2 — DSL propio en Rust (lenguaje nw)

#### Parser basico
- [x] Crear modulo `nw_lang/` en `src-tauri/src/` con parser (hand-rolled tokenizer + pipeline)
- [x] Sintaxis base: `nw <comando> [args] [| pipe] [> output]`
- [x] Bridge: si el parser no reconoce el comando, pasarlo al frontend JS (que mantiene los comandos originales)

#### Comandos core del DSL
- [x] `nw proc` — lista procesos (top CPU) via `sysinfo` nativo
- [x] `nw proc | filter cpu > 50 | top 10` — pipes con filter, top, grep
- [x] `nw ports` — puertos activos TCP (via PowerShell bridge)
- [x] `nw kill <nombre>` — matar proceso por nombre o PID via `sysinfo`
- [x] `nw find <patron>` — buscar archivos via `walkdir`
- [x] `nw size [n]` — archivos mas grandes via `walkdir`
- [x] `nw dupes [ruta]` — encontrar duplicados via SHA-256 + walkdir
- [x] `nw hash <archivo>` — SHA-256 via `sha2`
- [x] `nw diff <a> <b>` — comparar archivos linea a linea
- [x] `nw clean [--dry]` — limpiar logs/tmp/bak con dry-run
- [x] `nw help` — listar todos los comandos (JS + Rust nativos ⚡)

#### Variables de entorno NETWATCH
- [x] `$NW_PROJECTS` — ruta a proyectos
- [x] `$NW_SERVERS` — lista de servidores SSH guardados
- [x] `$NW_SHELL` — shell activo (ps, wsl, cmd)
- [x] Persistir variables en `~/.netwatch/env.json` entre sesiones

#### Scripting .nw
- [x] Soporte para `nw run script.nw`
- [x] Variables (`let x = ...`), condicionales (`if/else`), loops (`for/each`), sustitución `$var`

### FASE 2.5 — UX & Personalización

#### Paneles reordenables (drag & drop)
- [x] Permitir cambiar posición de paneles laterales arrastrando
- [x] Mantener estética cyberpunk al reorganizar (bordes, glow, transiciones)
- [x] Persistir orden personalizado en store entre sesiones
- [x] Tabs también reordenables con drag & drop

#### Selector de tema de color (botón top-bar)
- [x] Botón en la barra superior para cambiar esquema de colores
- [x] Tema default: Cyan/Azul (actual cyberpunk-2077)
- [x] Tema Rojo: bordes y acentos en rojo (#ff0033)
- [x] Tema Amarillo: bordes y acentos en amarillo (#FCEE0A)
- [x] Tema Verde: bordes y acentos en verde (#39FF14)
- [x] Tema Magenta: bordes y acentos en magenta (#D9027D)
- [x] Cada tema mantiene esencia cyberpunk (fondo oscuro, glow, tipografía)
- [x] Hot-switch sin recargar — CSS custom properties (`var(--nw-accent)`)
- [x] Hook `useTheme()` con localStorage persistence + cycle + event listener
- [x] Todos los paneles migrados de `#00F0FF` hardcoded a `var(--nw-accent)`

#### Optimización general
- [x] Reducir re-renders innecesarios en paneles (React.memo en 12 componentes)
- [x] Lazy import de componentes pesados (ya implementado con React.lazy + Suspense)
- [x] Debounce en búsquedas y filtros de paneles (LogsPanel 300ms debounce ya implementado)
- [x] Virtualización de listas largas (LogsPanel — windowed rendering, solo rows visibles)

### FASE 3 — Features killer

#### Command Palette (Ctrl+Shift+P)
- [x] Overlay modal tipo VS Code con busqueda fuzzy
- [x] Indexar: comandos nw (DSL, tasks, notes, crypto, AI, snippets)
- [x] Resultados agrupados por categoria con iconos/colores
- [x] Enter ejecuta, Esc cierra, ↑↓ navegar
- [x] Lazy-loaded (React.lazy), wired a Terminal via CustomEvent

#### Output inteligente
- [x] `nw json <cmd>` — ejecuta comando y formatea JSON como tabla o árbol coloreado
- [x] `nw json table <cmd>` — fuerza renderizado como tabla
- [x] Detectar errores comunes (npm, git, docker, python, rust, node) — smart-output.js con 15+ patrones
- [x] `nw fix` después de un error — muestra sugerencias de fix automáticas

#### Clipboard manager
- [x] `nw clip` — últimos 20 items copiados
- [x] `nw clip <n>` — pegar item N al portapapeles
- [x] `nw clip search <texto>` — buscar en historial
- [x] `nw clip add <texto>` — guardar manualmente
- [x] Shortcut `Alt+V` ejecuta `nw clip` en terminal activa
- [x] Persistir entre sesiones (localStorage)

#### Contexto de proyecto automatico
- [x] `nw ctx` — detectar tipo de proyecto (Node, Rust, Python, Docker, Go, Vite, Next, Astro, Hardhat)
- [x] Mostrar runtime, version, scripts, rama git, estado dirty/clean
- [x] Categoría "QUICK RUN" en Command Palette con scripts npm + git commands contextuales

#### Grabacion de sesiones
- [x] `nw rec start [nombre]` / `nw rec stop`
- [x] `nw rec list` / `nw rec play <nombre>` / `nw rec del <nombre>`
- [x] `nw rec export <nombre>` — exportar como markdown al portapapeles
- [x] Persistir grabaciones en localStorage

#### Snippets con templates
- [x] Variables de template: `{{name}}`, `{{port}}`, `{{date}}`, `{{time}}`, `{{user}}`
- [x] `nw snip run deploy --name=api --port=3000` — expande variables desde args
- [x] `nw snip edit <nombre>` — ver snippet y variables
- [x] Snippets guardados en localStorage, exportables con nw snip ls

### FASE 4 — Dojo integrado (training mode)

- [x] Tab especial "DOJO" con UI propia (DojoPanel.jsx con quiz, rosetta, stats)
- [x] Quiz interactivo (PowerShell, Linux, redes, Docker, K8s, git) — 25+ preguntas, categorías
- [x] Modo tatami — sandbox con misiones guiadas (8 misiones, 6 categorías, validación PowerShell)
- [x] Modo rosetta — equivalencias entre shells (PS vs bash vs cmd) — tabla 15 acciones
- [ ] Modo forja — escribir scripts con validacion automatica (futuro)
- [x] Progreso persistente: racha diaria, puntos XP, nivel, historial (localStorage)
- [x] Dashboard visual de progreso (barras por categoría, stats, nivel + XP bar)
- [x] Banco de preguntas ampliable (QUIZ_BANK array extensible, filtro por categoría)
- [x] Tab "NOTEBOOK" — celdas de código + markdown (NotebookPanel.jsx)
- [x] Output inline debajo de cada celda de código
- [x] Guardar/cargar notebooks en localStorage (crear, abrir, eliminar)
- [x] Ejecutar celdas individuales o RUN ALL
- [x] Cambiar tipo de celda (code ↔ markdown)

### FASE 5 — Ecosistema

#### Plugins
- [x] Estructura: `manifest.json` + archivos `.nw` o `.js` en `~/.netwatch/plugins/`
- [x] `nw plugin install/remove/list`
- [x] Plugins registran comandos, manifiesto con versión y lista de cmds
- [x] Repositorio local en `~/.netwatch/plugins/`

#### Profiles exportables
- [x] `nw profile export` — exporta config completa al portapapeles (JSON)
- [x] `nw profile import` / `nw profile load` — importar desde portapapeles

#### Sync entre instancias
- [x] `nw sync push` / `nw sync pull` — sincroniza via repo git
- [x] `nw sync setup <repo>` — configurar repo de sync
- [x] Sync incluye: tema, panel order, snippets, plugins, notas, tasks, dojo progress

#### Theme engine
- [x] 5 temas integrados: Cyberpunk-2077 (cyan), Blade Runner (red), Deus Ex (yellow), Matrix (green), Ghost in Shell (magenta)
- [x] `nw theme` lista temas, `nw theme <nombre>` cambia tema
- [x] Aliases por nombre (matrix, blade-runner, ghost, cyberpunk, deus-ex)
- [x] `nw theme create/delete` — crear/eliminar temas custom con colores personalizados
- [x] Hot-switch sin reiniciar — CSS custom properties + `useTheme` hook
- [x] Archivos `.nw-theme` custom — save/load/edit con propiedades extendidas (bg, surface, text, font, opacity)

#### Multi-plataforma
- [x] Tauri v2 cross-platform ready (build config presente)
- [x] Métricas nativas via `sysinfo` crate (funciona en Linux/Mac)
- [ ] Build Linux testeado y distribuido
- [ ] Build macOS si hay demanda

---

## PRIORIDAD DE LO PENDIENTE

### Bloque 1 — Ahora (frontend, autocontenidos)
- [x] **Task drag & drop** — mover tareas entre columnas arrastrando (HTML5 DnD en TasksPanel)
- [x] **Archivos .nw-theme custom** — crear temas propios en JSON (paleta, fuente, opacidad, efectos)

### Bloque 2 — Siguiente (Dojo avanzado, perfil docente ASIR)
- [ ] **Modo tatami** — sandbox con misiones guiadas y validacion de estado (¿archivo creado? ¿servicio corriendo?)
- [ ] **Modo forja** — escribir scripts desde cero con linter/validator integrado
> Estos dos son los que mas diferencian NETWATCH — sistema de entrenamiento para alumnos de ASIR/ASO/SRI con bancos de misiones reales.

### Bloque 3 — Cuando haya tiempo largo
- [ ] **PTY nativo en Rust** (`portable-pty`) — eliminar sidecar Node.js, arranque mas rapido, bundle mas limpio
- [ ] **Worker Rust con eventos Tauri** (`emit`) — metricas event-driven en vez de request-response

### Bloque 4 — Cuando todo lo demas este estable
- [ ] **Build Linux** testeado y distribuido
- [ ] **Build macOS** si hay demanda