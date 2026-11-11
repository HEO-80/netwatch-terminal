import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { MODULE_DEFS, loadConfig, saveConfig, getDefaults, applyPreset, isModuleEnabled } from "../config/modules";

const ModuleConfigContext = createContext(null);

export function ModuleConfigProvider({ children }) {
  const [config, setConfig] = useState(() => loadConfig() || getDefaults());

  const toggle = useCallback((moduleKey) => {
    setConfig(prev => {
      const next = { ...prev, [moduleKey]: !prev[moduleKey], _preset: "custom" };
      saveConfig(next);
      return next;
    });
  }, []);

  const setModule = useCallback((moduleKey, enabled) => {
    setConfig(prev => {
      const next = { ...prev, [moduleKey]: enabled, _preset: "custom" };
      saveConfig(next);
      return next;
    });
  }, []);

  const setPreset = useCallback((presetName) => {
    const next = applyPreset(presetName);
    if (next) setConfig(next);
    return !!next;
  }, []);

  const markFirstRunDone = useCallback(() => {
    setConfig(prev => {
      const next = { ...prev, _firstRunDone: true };
      saveConfig(next);
      return next;
    });
  }, []);

  const isEnabled = useCallback((moduleKey) => {
    return isModuleEnabled(config, moduleKey);
  }, [config]);

  const value = useMemo(() => ({
    config,
    isEnabled,
    toggle,
    setModule,
    setPreset,
    markFirstRunDone,
    firstRunDone: !!config._firstRunDone,
    preset: config._preset || "custom",
  }), [config, isEnabled, toggle, setModule, setPreset, markFirstRunDone]);

  return (
    <ModuleConfigContext.Provider value={value}>
      {children}
    </ModuleConfigContext.Provider>
  );
}

export function useModuleConfig() {
  const ctx = useContext(ModuleConfigContext);
  if (!ctx) throw new Error("useModuleConfig must be inside ModuleConfigProvider");
  return ctx;
}
