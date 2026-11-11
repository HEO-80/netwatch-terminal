import { useState, useEffect, useCallback } from "react";

export const THEMES = {
  cyan:    { accent: "#00F0FF", glow: "rgba(0,240,255,0.15)", corner: "#D9027D", label: "CYAN" },
  red:     { accent: "#ff0033", glow: "rgba(255,0,51,0.15)",  corner: "#ff0033", label: "RED" },
  yellow:  { accent: "#FCEE0A", glow: "rgba(252,238,10,0.15)", corner: "#FCEE0A", label: "YELLOW" },
  green:   { accent: "#39FF14", glow: "rgba(57,255,20,0.15)", corner: "#39FF14", label: "GREEN" },
  magenta: { accent: "#D9027D", glow: "rgba(217,2,125,0.15)", corner: "#D9027D", label: "MAGENTA" },
};

const THEME_NAMES = Object.keys(THEMES);

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("nw-theme") || "cyan"; }
    catch { return "cyan"; }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("nw-theme", theme); } catch {}
  }, [theme]);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail && THEMES[e.detail]) setTheme(e.detail);
    };
    window.addEventListener("nw-theme-change", handler);
    return () => window.removeEventListener("nw-theme-change", handler);
  }, []);

  const cycle = useCallback(() => {
    setTheme(prev => {
      const idx = THEME_NAMES.indexOf(prev);
      return THEME_NAMES[(idx + 1) % THEME_NAMES.length];
    });
  }, []);

  return { theme, setTheme, cycle, ...THEMES[theme] };
}
