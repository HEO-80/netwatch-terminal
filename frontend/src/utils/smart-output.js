const ERROR_PATTERNS = [
  {
    regex: /npm ERR! code ENOENT/i,
    tool: "npm",
    suggestion: "Asegúrate de que el archivo package.json existe. Ejecuta: npm init -y",
  },
  {
    regex: /npm ERR! code EACCES/i,
    tool: "npm",
    suggestion: "Permisos insuficientes. Prueba con: npm config set prefix ~/.npm-global",
  },
  {
    regex: /npm ERR! peer dep/i,
    tool: "npm",
    suggestion: "Conflicto de peer dependencies. Prueba: npm install --legacy-peer-deps",
  },
  {
    regex: /npm ERR! code E404/i,
    tool: "npm",
    suggestion: "Paquete no encontrado. Verifica el nombre del paquete.",
  },
  {
    regex: /Module not found: Can't resolve '([^']+)'/i,
    tool: "webpack/vite",
    suggestion: (m) => `Módulo '${m[1]}' no encontrado. Instálalo: npm install ${m[1]}`,
  },
  {
    regex: /EADDRINUSE.*:(\d+)/i,
    tool: "node",
    suggestion: (m) => `Puerto ${m[1]} en uso. Libéralo: nw kill <proceso> o usa otro puerto.`,
  },
  {
    regex: /fatal: not a git repository/i,
    tool: "git",
    suggestion: "No estás en un repositorio git. Ejecuta: git init",
  },
  {
    regex: /error: failed to push some refs/i,
    tool: "git",
    suggestion: "Push rechazado. Primero haz pull: git pull --rebase origin <rama>",
  },
  {
    regex: /CONFLICT \(content\): Merge conflict in (.+)/i,
    tool: "git",
    suggestion: (m) => `Conflicto en ${m[1]}. Resuelve manualmente y ejecuta: git add ${m[1]}`,
  },
  {
    regex: /error: Your local changes.*would be overwritten/i,
    tool: "git",
    suggestion: "Tienes cambios sin commitear. Ejecuta: git stash, luego tu comando, y git stash pop",
  },
  {
    regex: /docker: Error response from daemon/i,
    tool: "docker",
    suggestion: "Error de Docker. ¿Está Docker Desktop arrancado?",
  },
  {
    regex: /docker.*image.*not found/i,
    tool: "docker",
    suggestion: "Imagen no encontrada. Ejecuta: docker pull <imagen>",
  },
  {
    regex: /SyntaxError: Unexpected token/i,
    tool: "javascript",
    suggestion: "Error de sintaxis JS. Revisa la línea indicada — falta un cierre, coma o punto y coma.",
  },
  {
    regex: /ModuleNotFoundError: No module named '([^']+)'/i,
    tool: "python",
    suggestion: (m) => `Módulo Python '${m[1]}' no instalado. Ejecuta: pip install ${m[1]}`,
  },
  {
    regex: /IndentationError/i,
    tool: "python",
    suggestion: "Error de indentación Python. Usa espacios consistentes (4 por nivel).",
  },
  {
    regex: /PermissionError.*denied/i,
    tool: "python",
    suggestion: "Permisos insuficientes. Ejecuta como admin o cambia los permisos del archivo.",
  },
  {
    regex: /cargo.*error\[E0432\].*unresolved import/i,
    tool: "rust",
    suggestion: "Import no resuelto en Rust. Verifica que el crate esté en Cargo.toml.",
  },
  {
    regex: /cargo.*error\[E0308\].*mismatched types/i,
    tool: "rust",
    suggestion: "Tipos no coinciden. Revisa los tipos de la función y la variable.",
  },
];

export function detectErrors(text) {
  const results = [];
  for (const pattern of ERROR_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match) {
      const suggestion = typeof pattern.suggestion === "function"
        ? pattern.suggestion(match)
        : pattern.suggestion;
      results.push({ tool: pattern.tool, suggestion, match: match[0] });
    }
  }
  return results;
}

export function tryParseJson(text) {
  const trimmed = text.trim();
  if ((!trimmed.startsWith("{") && !trimmed.startsWith("[")) || trimmed.length < 5) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

export function formatJsonAnsi(obj, indent = 0) {
  const pad = "  ".repeat(indent);
  const pad1 = "  ".repeat(indent + 1);

  if (obj === null) return `\x1b[35mnull\x1b[0m`;
  if (typeof obj === "boolean") return `\x1b[35m${obj}\x1b[0m`;
  if (typeof obj === "number") return `\x1b[36m${obj}\x1b[0m`;
  if (typeof obj === "string") return `\x1b[32m"${obj}"\x1b[0m`;

  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    const items = obj.map(v => `${pad1}${formatJsonAnsi(v, indent + 1)}`);
    return `[\r\n${items.join(",\r\n")}\r\n${pad}]`;
  }

  const keys = Object.keys(obj);
  if (keys.length === 0) return "{}";
  const entries = keys.map(k => `${pad1}\x1b[33m"${k}"\x1b[0m: ${formatJsonAnsi(obj[k], indent + 1)}`);
  return `{\r\n${entries.join(",\r\n")}\r\n${pad}}`;
}

export function formatAsTable(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  if (typeof arr[0] !== "object" || arr[0] === null) return null;

  const keys = Object.keys(arr[0]);
  if (keys.length === 0 || keys.length > 10) return null;

  const widths = {};
  keys.forEach(k => widths[k] = k.length);
  arr.forEach(row => {
    keys.forEach(k => {
      const val = String(row[k] ?? "");
      if (val.length > widths[k]) widths[k] = Math.min(val.length, 30);
    });
  });

  const header = keys.map(k => `\x1b[33m${k.padEnd(widths[k])}\x1b[0m`).join("  ");
  const sep = keys.map(k => "─".repeat(widths[k])).join("──");
  const rows = arr.slice(0, 50).map(row =>
    keys.map(k => {
      const val = String(row[k] ?? "").slice(0, 30);
      return `\x1b[37m${val.padEnd(widths[k])}\x1b[0m`;
    }).join("  ")
  );

  let result = `  ${header}\r\n  \x1b[38;5;237m${sep}\x1b[0m\r\n`;
  rows.forEach(r => result += `  ${r}\r\n`);
  if (arr.length > 50) result += `  \x1b[38;5;237m... y ${arr.length - 50} más\x1b[0m\r\n`;
  return result;
}
