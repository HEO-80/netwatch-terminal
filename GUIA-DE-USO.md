# NETWATCH Terminal v3 — Guia de Uso

> Terminal cyberpunk con DSL propio, paneles modulares y herramientas integradas.
> Stack: Tauri v2 (Rust) + React + Vite + xterm.js

---

## Indice

1. [Arranque y navegacion](#arranque-y-navegacion)
2. [Atajos de teclado](#atajos-de-teclado)
3. [Paneles laterales](#paneles-laterales)
4. [Temas de color](#temas-de-color)
5. [Comandos NW (JavaScript)](#comandos-nw-javascript)
6. [Comandos NW nativos (Rust DSL)](#comandos-nw-nativos-rust-dsl)
7. [Command Palette](#command-palette)
8. [Dojo (entrenamiento)](#dojo-entrenamiento)
9. [Notebook](#notebook)
10. [Plugins y ecosistema](#plugins-y-ecosistema)

---

## Arranque y navegacion

Al abrir NETWATCH se muestra una animacion de boot y se carga el **Dashboard** como tab principal. Desde ahi puedes:

- Hacer click en **"Launch Terminal"** para abrir un terminal PowerShell
- Los tabs aparecen en la barra superior (Dashboard, PowerShell, WSL, CMD, Dojo, Notebook)
- Los tabs se pueden **reordenar arrastrando** con drag & drop
- Los tabs se cierran con la **X** o con `Alt+W`

### Tipos de tab

| Tab        | Descripcion                              |
|------------|------------------------------------------|
| Dashboard  | Panel principal con info del sistema     |
| PowerShell | Terminal PowerShell interactiva          |
| WSL        | Terminal Windows Subsystem for Linux     |
| CMD        | Terminal CMD clasica                     |
| DOJO       | Entrenamiento interactivo (quiz/rosetta) |
| NOTEBOOK   | Celdas de codigo ejecutables + markdown  |

---

## Atajos de teclado

| Atajo            | Accion                                    |
|------------------|-------------------------------------------|
| `Ctrl+Shift+P`  | Abrir/cerrar **Command Palette**          |
| `Alt+T`          | Nueva tab PowerShell                      |
| `Alt+W`          | Cerrar tab activa                         |
| `Alt+D`          | Ir al Dashboard                           |
| `Alt+1..9`       | Cambiar a tab N                           |
| `Alt+P`          | Ciclar panel derecho (Crypto/Tasks/Git/Logs/Notes/Settings/cerrado) |
| `Alt+A`          | Toggle panel AI                           |
| `Alt+M`          | Toggle panel Metricas                     |
| `Alt+I`          | Toggle panel Infra                        |
| `Alt+V`          | Abrir clipboard manager                   |

---

## Paneles laterales

Los paneles se abren con `Alt+P` (cicla entre ellos) o desde la barra de chips arrastrables.

### Panel CRYPTO (SidePanel)
Precios de BTC/ETH en tiempo real via CoinGecko. Solo hace fetch cuando esta visible.

### Panel TASKS
Kanban vertical con 3 columnas: Pendiente / En curso / Hecho.
Las tareas se pueden **arrastrar entre columnas** con drag & drop (ademas de los botones ▸/◂).

```
nw task                    → listar todas las tareas
nw task add <texto>        → crear tarea nueva
nw task done <n>           → marcar tarea N como completada
nw task start <n>          → poner tarea N en curso
nw task rm <n>             → eliminar tarea N
nw task clear              → limpiar tareas completadas
```

### Panel GIT
Muestra rama actual, commits ahead/behind, archivos staged/modified, stash y ultimo commit. Se refresca cada 10s y al recuperar foco.

**Botones rapidos:** COMMIT (con input inline), PUSH, PULL, STASH, POP

**Diff inline:** Haz click en cualquier archivo para ver el diff coloreado (+verde/-rojo/@cyan).

### Panel LOGS
Stream en vivo de Windows Event Logs (System + Application).
- Filtros por severidad: Error, Warning, Info, Debug (con contadores)
- Busqueda en tiempo real con debounce 300ms
- Auto-scroll con deteccion de scroll manual
- Botones: Pause/Resume, Limpiar, Refresh

### Panel NOTES
Notas rapidas persistentes con pin/unpin.

```
nw note                    → listar notas
nw note add <texto>        → guardar nota rapida
nw note <texto>            → guardar nota (atajo sin "add")
nw note rm <n>             → eliminar nota N
nw note pin <n>            → fijar/desfijar nota (las fijadas van arriba)
nw note export             → exportar todas las notas como markdown al portapapeles
nw note clear              → borrar todas las notas
```

### Panel SETTINGS
Gestionar API keys almacenadas de forma segura (tauri-plugin-store con fallback a localStorage):
- Gemini API key
- Claude API key
- GitHub token y username

### Panel AI
Asistente de IA con soporte para Ollama (local) y Gemini/Claude (API).

### Panel METRICS
Metricas nativas del sistema via Rust (sysinfo): CPU, RAM, disco, red, uptime. Fallback a mock en modo dev.

### Panel INFRA
Info de infraestructura: puertos activos, procesos, Docker.

---

## Temas de color

NETWATCH incluye 5 temas built-in, todos manteniendo la estetica cyberpunk:

| Tema       | Color   | Alias                         |
|------------|---------|-------------------------------|
| Cyberpunk 2077 | Cyan    | `cyan`, `cyberpunk`, `2077`   |
| Blade Runner   | Rojo    | `red`, `blade-runner`, `blade`|
| Deus Ex        | Amarillo| `yellow`, `deus-ex`, `deus`   |
| Matrix         | Verde   | `green`, `matrix`             |
| Ghost in Shell | Magenta | `magenta`, `ghost`, `gits`    |

### Uso

```
nw theme                   → ver todos los temas disponibles (built-in + custom)
nw theme cyan              → cambiar a Cyberpunk 2077
nw theme matrix            → cambiar a Matrix (verde)
nw theme blade-runner      → cambiar a Blade Runner (rojo)
```

### Temas custom

```
nw theme create <nombre> <accent-hex> [corner-hex] [prop=valor...]
nw theme edit <nombre>     → ver todas las propiedades del tema
nw theme save <nombre>     → exportar como .nw-theme (JSON al portapapeles)
nw theme load              → importar .nw-theme desde portapapeles
nw theme delete <nombre>   → eliminar tema custom
```

Ejemplo basico:
```
nw theme create neon #FF00FF #00FF00
nw theme neon              → aplicar tema
```

Ejemplo con propiedades extendidas:
```
nw theme create synthwave #FF6EC7 #7B2FBE bg=#1a0030 surface=#2a0045 opacity=0.95
nw theme edit synthwave    → ver propiedades
nw theme save synthwave    → exportar JSON al portapapeles
```

Propiedades de un `.nw-theme`:

| Propiedad | Descripcion                    | Ejemplo      |
|-----------|--------------------------------|--------------|
| accent    | Color principal de la interfaz | `#FF00FF`    |
| glow      | Color del glow/sombra          | `#FF00FF33`  |
| corner    | Color de las esquinas          | `#7B2FBE`    |
| border    | Color de bordes                | `#FF00FF44`  |
| bg        | Color de fondo principal       | `#1a0030`    |
| surface   | Color de superficies/paneles   | `#2a0045`    |
| text      | Color de texto base            | `#E8E8E8`    |
| font      | Fuente monospace               | `"JetBrains Mono"` |
| opacity   | Opacidad general (0-1)         | `0.95`       |

Para compartir un tema: `nw theme save <nombre>`, enviar el JSON, el otro usuario lo pega en el portapapeles y ejecuta `nw theme load`.

El cambio es instantaneo (hot-switch via CSS custom properties), sin recargar la app.

---

## Comandos NW (JavaScript)

Todos los comandos empiezan con `nw`. Escribe `nw help` para ver la lista completa.

### Sistema

```
nw help                    → mostrar ayuda completa
nw status                  → resumen: CPU, RAM, OS, puertos activos, repos con cambios
nw config                  → abrir panel de Settings / API keys
nw ctx                     → contexto del proyecto actual (stack, git, scripts npm)
```

### Crypto & Git

```
nw eth                     → precios BTC/ETH + cambio 24h
nw eth <wallet>            → balance de wallet Ethereum
nw repos                   → listar repos git: rama, estado, commits ahead
nw ssh                     → listar servidores SSH guardados
nw ssh <n>                 → conectar al servidor N
nw ssh add user@host:port nombre  → guardar nuevo servidor
```

### Deploy

```
nw deploy                  → detectar proyecto y mostrar opciones de deploy
nw deploy <n>              → lanzar opcion N (Tauri build, Vercel, Docker, npm, git push...)
```

### AI

```
nw ai <pregunta>           → preguntar a Claude AI (necesita API key en Settings)
```

### Output inteligente

```
nw json <comando>          → ejecutar comando y formatear JSON como arbol coloreado
nw json table <comando>    → renderizar JSON array como tabla con headers
nw fix                     → analizar ultimo output en busca de errores conocidos y sugerir fix
```

El sistema detecta 15+ patrones de error de: npm, webpack/vite, node, git, docker, JavaScript, Python, Rust.

### Clipboard manager

```
nw clip                    → ver ultimos 20 items del clipboard
nw clip <n>                → copiar item N al portapapeles del sistema
nw clip add <texto>        → guardar texto manualmente en el clipboard
nw clip search <texto>     → buscar en el historial de clipboard
nw clip clear              → vaciar el clipboard
```

Atajo: `Alt+V` abre el clipboard en la terminal activa.

### Grabacion de sesiones

```
nw rec start [nombre]      → empezar a grabar input/output
nw rec stop                → parar y guardar la grabacion
nw rec list                → listar sesiones grabadas
nw rec play <nombre>       → reproducir grabacion con timestamps
nw rec export <nombre>     → exportar como markdown al portapapeles
nw rec del <nombre>        → eliminar grabacion
```

### Snippets (con templates)

```
nw snip ls                 → listar snippets guardados
nw snip add <id> <cmd>     → guardar snippet (soporta variables {{var}})
nw snip run <id> [--var=valor]  → ejecutar snippet expandiendo variables
nw snip edit <id>          → ver snippet y sus variables
nw snip del <id>           → eliminar snippet
nw snip export             → exportar snippets como JSON al portapapeles
nw snip import             → importar snippets desde portapapeles
```

Variables built-in: `{{date}}`, `{{time}}`, `{{user}}`, `{{ts}}`

Ejemplo:
```
nw snip add deploy-api docker build -t {{name}}:{{tag}} . && docker push {{name}}:{{tag}}
nw snip run deploy-api --name=myapp --tag=v1.2
```

### Monitoring

```
nw tail <archivo>          → ver ultimas 20 lineas (errores en rojo, warnings en amarillo)
nw tail <archivo> <n>      → ver ultimas N lineas
nw tail -f <archivo>       → seguir archivo en tiempo real (Ctrl+C para detener)
nw docker ps               → listar contenedores Docker activos
nw docker logs <nombre>    → ultimas 30 lineas de logs del contenedor
nw docker logs <nombre> <n> → ultimas N lineas
nw docker follow <nombre>  → seguir logs en tiempo real
```

---

## Comandos NW nativos (Rust DSL)

Estos comandos corren directamente en Rust, sin pasar por PowerShell. Son mas rapidos (marcados con ⚡).

```
nw proc                    → lista procesos (top CPU) ⚡
nw proc | filter cpu > 50 | top 10  → pipes con filter y top ⚡
nw ports                   → puertos TCP escuchando ⚡
nw kill <nombre|pid>       → matar proceso ⚡
nw find <patron>           → buscar archivos ⚡
nw size [n]                → archivos mas grandes ⚡
nw dupes [ruta]            → encontrar archivos duplicados ⚡
nw hash <archivo>          → SHA-256 de un archivo ⚡
nw diff <a> <b>            → comparar dos archivos linea a linea ⚡
nw clean [--dry]           → limpiar logs/tmp/bak (dry-run por defecto) ⚡
nw env list                → listar variables NETWATCH ⚡
nw env set <clave> <valor> → establecer variable ⚡
nw env get <clave>         → obtener variable ⚡
nw env del <clave>         → eliminar variable ⚡
nw run <script.nw>         → ejecutar script .nw ⚡
```

### Scripting .nw

Puedes crear scripts `.nw` con:
- Variables: `let x = "valor"`
- Condicionales: `if condicion ... else ... end`
- Loops: `for item in lista ... end`
- Sustitucion: `$variable` dentro de comandos

Ejemplo (`deploy.nw`):
```
let project = "netwatch"
let tag = "latest"
nw clean --dry
echo "Building $project:$tag..."
```

Ejecutar: `nw run deploy.nw`

---

## Command Palette

Abre con `Ctrl+Shift+P`. Busqueda fuzzy sobre todos los comandos disponibles.

### Categorias

| Categoria   | Que incluye                                    |
|-------------|------------------------------------------------|
| NW COMMANDS | Comandos generales (help, status, config, theme, dojo, notebook) |
| RUST DSL ⚡ | Comandos nativos Rust (proc, ports, kill, find...) |
| TASKS & NOTES | Gestion de tareas y notas                   |
| CRYPTO & GIT | Precios crypto, repos, SSH, deploy           |
| AI & OUTPUT | Claude AI, formateo JSON, fix de errores      |
| TOOLS       | Contexto, clipboard, grabaciones, tail, docker |
| SNIPPETS    | Gestion de snippets con templates              |
| QUICK RUN   | Scripts npm del proyecto + comandos git comunes |
| ECOSYSTEM   | Plugins, profiles, sync                        |

La categoria **QUICK RUN** es contextual: muestra los scripts npm detectados del proyecto actual (despues de ejecutar `nw ctx` una vez) y comandos git frecuentes.

---

## Dojo (entrenamiento)

Abre con `nw dojo` o desde el Command Palette. Es un tab completo con 3 modos:

### Quiz
Preguntas interactivas sobre PowerShell, Linux, redes, Docker, K8s y git. 25+ preguntas organizadas por categoria.

- Selecciona una respuesta, gana **10 XP** por acierto
- **Bonus por racha**: respuestas consecutivas correctas dan XP extra
- Filtro por categoria con botones en la parte superior

### Rosetta
Tabla de equivalencias entre shells: 15 acciones comunes mostrando el comando en PowerShell, Bash y CMD lado a lado.

### Progreso
Dashboard visual con:
- Nivel actual y barra de XP
- Estadisticas: total respondidas, aciertos, racha maxima
- Desglose por categoria con barras de progreso
- Boton para resetear progreso

El progreso se guarda en localStorage y persiste entre sesiones.

---

## Notebook

Abre con `nw notebook` o desde el Command Palette. Notebooks con celdas ejecutables.

### Crear notebook
1. Escribe un nombre y pulsa "+ NUEVO"
2. Se abre el editor con una celda de codigo vacia

### Tipos de celda
- **CODE** — codigo PowerShell ejecutable (boton ▸ para ejecutar)
- **MD** — texto markdown (notas, documentacion)

### Acciones
| Boton    | Accion                           |
|----------|----------------------------------|
| ▸ RUN ALL | Ejecutar todas las celdas de codigo en orden |
| SAVE     | Guardar notebook                 |
| + CODE   | Anadir celda de codigo           |
| + MD     | Anadir celda de markdown         |
| ⇄        | Cambiar tipo de celda (code/md)  |
| ×        | Eliminar celda                   |
| ◂        | Volver a la lista de notebooks   |

El output de cada celda aparece inline debajo. Los notebooks se guardan en localStorage.

---

## Plugins y ecosistema

### Plugins

```
nw plugin                  → listar plugins instalados
nw plugin install <nombre> → instalar plugin (busca en ~/.netwatch/plugins/)
nw plugin remove <nombre>  → eliminar plugin
```

Estructura de un plugin:
```
~/.netwatch/plugins/mi-plugin/
  manifest.json            → { "name": "mi-plugin", "version": "1.0", "commands": ["cmd1"] }
  index.js                 → logica del plugin
```

### Profiles (exportar/importar config)

```
nw profile export          → copia toda la config al portapapeles como JSON
nw profile import          → instrucciones para importar
nw profile load <json>     → importar config desde JSON
```

El profile incluye: tema, orden de paneles, snippets, plugins, notas, tareas, clipboard, progreso del dojo.

### Sync entre maquinas

```
nw sync setup <ruta-o-url> → configurar repo git para sincronizar
nw sync push               → guardar config en el repo de sync
nw sync pull               → cargar config desde el repo
```

Ejemplo:
```
nw sync setup ~/netwatch-sync
nw sync push               → guarda tema, snippets, plugins en el repo
```

En otra maquina:
```
nw sync setup ~/netwatch-sync
nw sync pull               → carga la config sincronizada
```

---

## Persistencia

Todo se guarda automaticamente en localStorage (con migracion a tauri-plugin-store para API keys):

| Dato              | Clave localStorage        |
|-------------------|---------------------------|
| Tema activo       | `nw-theme`                |
| Temas custom      | `nw-custom-themes`        |
| Orden de paneles  | `nw-panel-order`          |
| Tareas            | `nw-tasks`                |
| Notas             | `nw-notes`                |
| Clipboard         | `nw-clipboard`            |
| Snippets          | `nw-snippets`             |
| Grabaciones       | `nw-recordings`           |
| Plugins           | `nw-plugins`              |
| Progreso Dojo     | `nw-dojo-progress`        |
| Notebooks         | `nw-notebooks`            |
| Variables NW      | `~/.netwatch/env.json`    |
| Servidores SSH    | `nw-ssh-servers`          |
| Scripts detectados| `nw-ctx-scripts`          |
| Repo de sync      | `nw-sync-repo`            |

---

## Tips

- **PowerShell, git, npm, yarn** — funcionan normalmente en la terminal, no necesitan prefijo `nw`
- **Pipes nativos**: `nw proc | filter cpu > 50 | top 5` — funciona con los comandos Rust
- Los paneles son **lazy**: solo hacen fetch/render cuando estan visibles
- Los paneles se pueden **reordenar** arrastrando los chips en la barra superior
- Todos los componentes usan `React.memo` para evitar re-renders innecesarios
- La busqueda en Logs tiene **debounce de 300ms** para mejor rendimiento
