import { useState, useEffect } from "react";

export function useKeyboardNav(panelName, itemCount, focused) {
  const [kbIndex, setKbIndex] = useState(-1);

  useEffect(() => {
    setKbIndex(focused ? 0 : -1);
  }, [focused]);

  useEffect(() => {
    if (!focused || itemCount <= 0) return;
    const onNav = (e) => {
      if (e.detail.panel !== panelName) return;
      setKbIndex(prev => {
        const next = prev + e.detail.dir;
        if (next < 0) return itemCount - 1;
        if (next >= itemCount) return 0;
        return next;
      });
    };
    window.addEventListener("nw-panel-nav", onNav);
    return () => window.removeEventListener("nw-panel-nav", onNav);
  }, [focused, panelName, itemCount]);

  return [kbIndex, setKbIndex];
}

export const KB_HIGHLIGHT = {
  borderLeft: "2px solid rgba(252, 238, 10, 0.5)",
  background: "rgba(252, 238, 10, 0.05)",
};
