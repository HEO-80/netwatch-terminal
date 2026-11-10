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

 Overlay modal tipo VS Code con búsqueda fuzzy
 Indexa: comandos nw, historial de shell, snippets guardados, servidores SSH, repos git, contenedores Docker, pods K8s
 Resultados agrupados por categoría con iconos
 Enter ejecuta, Esc cierra

Output inteligente:

 Detectar cuando stdout es JSON válido y renderizarlo como tabla formateada o árbol colapsable en la terminal
 Detectar errores comunes (npm, git, docker, python) y mostrar sugerencia de fix inline (sin AI, pattern matching)
 Opcionalmente pedir fix a AI con nw fix después de un error

Clipboard manager:

 nw clip — muestra últimos 20 items copiados dentro de NETWATCH
 nw clip <n> — pega el item número n
 nw clip search <texto> — busca en el historial de clipboard
 Shortcut Alt+V para abrir el clipboard en overlay
 Persistir entre sesiones (store de Tauri)

Contexto de proyecto automático:

 Cuando el directorio activo cambia, detectar tipo de proyecto por archivos presentes (package.json, Cargo.toml, docker-compose.yml, hardhat.config.js, etc.)
 Mostrar en la TabBar o barra de estado: runtime detectado, versión, scripts disponibles, rama git, estado dirty/clean
 Sugerir comandos relevantes en el Command Palette según el contexto

Grabación de sesiones:

 nw rec start [nombre] — empieza a grabar input/output de la terminal activa
 nw rec stop — para y guarda la grabación
 nw rec list — lista sesiones grabadas
 nw rec play <nombre> — reproduce paso a paso con timestamps
 nw rec export <nombre> — exportar como markdown o asciinema
 Útil para documentación, clases y debugging

Snippets con templates:

 Extender nw snip con variables de template: {{name}}, {{port}}, {{date}}
 nw snip run deploy --name=api --port=3000 expande y ejecuta
 nw snip edit <nombre> — abre editor inline para modificar el snippet
 Snippets guardados en store de Tauri, exportables como .nw o JSON
FASE 4 — Dojo integrado (training mode)

Migrar el sistema de entrenamiento de powershell-cyberpunk:

 Tab especial “DOJO” con UI propia (no es un panel lateral, es un tab completo como Dashboard)
 Quiz interactivo con preguntas de PowerShell, Linux, redes, Docker, K8s, git
 Modo tatami — sandbox con misiones guiadas paso a paso
 Modo rosetta — equivalencias entre shells (PS vs bash vs cmd)
 Modo forja — escribir scripts desde cero con validación automática
 Progreso persistente: racha diaria, puntos, nivel, historial de aciertos/fallos
 Dashboard visual de progreso con gráficos estilo cyberpunk
 Banco de preguntas ampliable (JSON o base de datos local SQLite)

Modo Notebook (tab especial):

 Tab “NOTEBOOK” donde puedes mezclar celdas de código (ejecutables en cualquier shell) con celdas de markdown
 Output inline debajo de cada celda de código
 Guardar/cargar notebooks como archivos .nw-notebook o .json
 Ideal para documentar procedures, preparar clases, hacer writeups de CTF
FASE 5 — Ecosistema

Sistema de plugins:

 Estructura de plugin: carpeta con manifest.json (nombre, versión, comandos, panel?) + archivos .nw o .js
 nw plugin install <nombre> / nw plugin remove <nombre> / nw plugin list
 Los plugins pueden registrar nuevos comandos nw y opcionalmente un panel lateral custom
 Repositorio local de plugins en ~/.netwatch/plugins/

Profiles exportables:

 nw profile export — genera un .nw-profile con: theme, snippets, servidores SSH, variables, shortcuts custom, plugins instalados
 nw profile import <archivo> — importa y aplica
 Útil para sincronizar entre máquinas o compartir con alumnos

Sync entre instancias:

 Sincronización opcional de config/snippets/historial entre instancias de NETWATCH (ej: portátil ↔ Beelink)
 Puede ser via git repo privado, rsync, o un mini server en el Beelink
 nw sync push / nw sync pull

Theme engine:

 Sistema de temas con archivos .nw-theme (JSON con paleta de colores, fuente, opacidad, efectos)
 nw theme list / nw theme set <nombre> / nw theme create <nombre>
 Themes incluidos: cyberpunk-2077 (default), ghost-in-shell, matrix, blade-runner, minimal-dark
 Hot-reload al cambiar de tema sin reiniciar

Multi-plataforma:

 Asegurar que el build funciona en Linux además de Windows (Tauri ya lo soporta)
 Adaptar las métricas WMI a equivalentes Linux (ya hay fallback a mock, pero hacerlo real con sysinfo)
 Build para macOS si hay demanda
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
- [ ] Drag visual para mover entre columnas (futuro)

#### Panel GIT (B)
- [x] Rama actual, commits ahead/behind, archivos modified/staged/stash
- [x] Refresh cada 10s + al recuperar foco de ventana (`visibilitychange`)
- [x] Nombre del repo, ultimo commit con timestamp
- [x] Archivos separados por staged / cambios con status (mod/add/del/new/ren)
- [x] Dot animado si hay cambios, verde si clean
- [ ] Botones rapidos: commit, push, pull, stash (futuro)
- [ ] Diff visual inline (futuro)

#### Panel LOGS (C)
- [ ] Stream en vivo tipo `tail -f` de archivos de log
- [ ] Filtros por severity (error, warn, info)
- [ ] Busqueda
- [ ] Monitorear Docker logs, system logs, archivos custom

#### Panel NOTES (D)
- [x] Scratchpad rapido con texto plano / markdown basico
- [x] `nw note “texto”` para agregar desde terminal
- [x] Persistente entre sesiones (localStorage `nw-notes`)
- [x] Pin/unpin notas (★/☆) — fijadas siempre arriba
- [x] `nw note` / `nw note add` / `nw note rm` / `nw note clear` desde terminal
- [ ] Exportar como `.md`

---

## CHECKLIST DE PROGRESO

### FASE 1 — Optimizacion de lo existente

#### Paneles lazy
- [x] `InfraPanel` — ya solo hace fetch cuando `open === true`
- [x] `MetricsPanel` — ya usa `useMetrics(open)`, para interval si cerrado
- [x] `SidePanel` (Crypto) — migrar fetch/interval a solo cuando `open`
- [x] `AIPanel` — diferir deteccion de providers y warmup de Ollama hasta que se abra el panel

#### Store seguro para claves API
- [ ] Instalar `tauri-plugin-store`
- [ ] Migrar API keys de `localStorage` a store de Tauri (Ollama, Gemini, Claude, CoinGecko, Etherscan, GitHub)
- [ ] Crear mini panel de Settings (`nw config` o icono) para gestionar keys desde la UI

#### Metricas nativas en Rust
- [ ] Agregar crate `sysinfo` a `Cargo.toml`
- [ ] Crear comando Tauri `get_system_metrics` que devuelva CPU, RAM, discos, red
- [ ] Reemplazar el polling via `run_powershell` en `MetricsPanel` por el nuevo comando nativo
- [ ] Evaluar worker Rust persistente con eventos Tauri (`emit`) en vez de request-response
- [ ] Mantener fallback a mock si no hay Tauri (modo dev en browser)

#### WebSocket mejorado
- [ ] Implementar exponential backoff en la reconexion (actualmente 5 reintentos lineales cada 2s)
- [ ] Agregar indicador visual en TabBar: dot verde = conectado, amarillo = reconectando, rojo = desconectado
- [ ] Auto-reconnect silencioso cuando la ventana recupera el foco (`visibilitychange`)

#### PTY nativo (opcional)
- [ ] Evaluar crate `portable-pty` vs sidecar Node.js actual
- [ ] Si se migra: eliminar dependencia de Node.js, PTY dentro del binario Tauri
- [ ] Mantener soporte multi-shell: PowerShell, WSL, CMD

### FASE 2 — DSL propio en Rust (lenguaje nw)

#### Parser basico
- [ ] Crear modulo `nw-lang/` en `src-tauri/src/` con parser (`pest` o `nom`)
- [ ] Sintaxis base: `nw <comando> [args] [| pipe] [> output]`
- [ ] Bridge: si el parser no reconoce el comando, pasarlo al shell activo

#### Comandos core del DSL
- [ ] `nw proc` — lista procesos (top CPU)
- [ ] `nw proc | filter cpu > 50 | top 10` — pipes con filter y top
- [ ] `nw ports` — puertos activos (migrar de PS)
- [ ] `nw kill <nombre>` — matar proceso
- [ ] `nw find <patron>` — buscar archivos
- [ ] `nw size [n]` — archivos mas grandes
- [ ] `nw dupes [ruta]` — encontrar duplicados
- [ ] `nw hash <archivo>` — hash de archivo
- [ ] `nw diff <a> <b>` — comparar archivos
- [ ] `nw clean [--dry]` — limpiar logs/tmp
- [ ] `nw help` — listar todos los comandos con descripcion

#### Variables de entorno NETWATCH
- [ ] `$NW_PROJECTS` — ruta a proyectos
- [ ] `$NW_SERVERS` — lista de servidores SSH guardados
- [ ] `$NW_SHELL` — shell activo (ps, wsl, cmd)
- [ ] Persistir variables en store de Tauri entre sesiones

#### Scripting .nw
- [ ] Soporte para `nw run script.nw`
- [ ] Variables (`let x = ...`), condicionales (`if/else`), loops (`for/each`), funciones (`fn`)

### FASE 3 — Features killer

#### Command Palette (Ctrl+Shift+P)
- [ ] Overlay modal tipo VS Code con busqueda fuzzy
- [ ] Indexar: comandos nw, historial, snippets, SSH servers, repos, Docker, K8s
- [ ] Resultados agrupados por categoria con iconos
- [ ] Enter ejecuta, Esc cierra

#### Output inteligente
- [ ] Detectar stdout JSON valido y renderizar como tabla/arbol colapsable
- [ ] Detectar errores comunes (npm, git, docker, python) y sugerir fix inline (pattern matching)
- [ ] `nw fix` despues de un error para pedir fix a AI

#### Clipboard manager
- [ ] `nw clip` — ultimos 20 items copiados
- [ ] `nw clip <n>` — pegar item N
- [ ] `nw clip search <texto>` — buscar en historial
- [ ] Shortcut `Alt+V` para overlay
- [ ] Persistir entre sesiones

#### Contexto de proyecto automatico
- [ ] Detectar tipo de proyecto al cambiar directorio (package.json, Cargo.toml, docker-compose.yml, etc.)
- [ ] Mostrar runtime, version, scripts, rama git, estado dirty/clean en TabBar
- [ ] Sugerir comandos relevantes en Command Palette segun contexto

#### Grabacion de sesiones
- [ ] `nw rec start [nombre]` / `nw rec stop`
- [ ] `nw rec list` / `nw rec play <nombre>`
- [ ] `nw rec export <nombre>` — exportar como markdown o asciinema

#### Snippets con templates
- [ ] Variables de template: `{{name}}`, `{{port}}`, `{{date}}`
- [ ] `nw snip run deploy --name=api --port=3000`
- [ ] `nw snip edit <nombre>` — editor inline
- [ ] Exportables como `.nw` o JSON

### FASE 4 — Dojo integrado (training mode)

- [ ] Tab especial "DOJO" con UI propia
- [ ] Quiz interactivo (PowerShell, Linux, redes, Docker, K8s, git)
- [ ] Modo tatami — sandbox con misiones guiadas
- [ ] Modo rosetta — equivalencias entre shells (PS vs bash vs cmd)
- [ ] Modo forja — escribir scripts con validacion automatica
- [ ] Progreso persistente: racha diaria, puntos, nivel
- [ ] Dashboard visual de progreso
- [ ] Banco de preguntas ampliable (JSON o SQLite)
- [ ] Tab "NOTEBOOK" — celdas de codigo + markdown
- [ ] Output inline debajo de cada celda
- [ ] Guardar/cargar notebooks como `.nw-notebook`

### FASE 5 — Ecosistema

#### Plugins
- [ ] Estructura: `manifest.json` + archivos `.nw` o `.js`
- [ ] `nw plugin install/remove/list`
- [ ] Plugins registran comandos y opcionalmente paneles custom
- [ ] Repositorio en `~/.netwatch/plugins/`

#### Profiles exportables
- [ ] `nw profile export` — genera `.nw-profile`
- [ ] `nw profile import <archivo>`

#### Sync entre instancias
- [ ] `nw sync push` / `nw sync pull`
- [ ] Via git repo privado, rsync, o mini server

#### Theme engine
- [ ] Archivos `.nw-theme` (JSON con paleta, fuente, opacidad, efectos)
- [ ] `nw theme list/set/create`
- [ ] Themes: cyberpunk-2077, ghost-in-shell, matrix, blade-runner, minimal-dark
- [ ] Hot-reload sin reiniciar

#### Multi-plataforma
- [ ] Build Linux funcional
- [ ] Metricas WMI → equivalentes Linux con `sysinfo`
- [ ] Build macOS si hay demanda