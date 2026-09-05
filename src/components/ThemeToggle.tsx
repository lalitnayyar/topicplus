"use client";

import { useEffect, useState } from "react";
import { applyTheme, getStoredTheme, setTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setLocalTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = getStoredTheme();
    setLocalTheme(stored);
    applyTheme(stored);

    function onExternalChange(e: Event) {
      setLocalTheme((e as CustomEvent<Theme>).detail);
    }
    window.addEventListener("tp-theme-change", onExternalChange);
    return () => window.removeEventListener("tp-theme-change", onExternalChange);
  }, []);

  function cycle() {
    const order: Theme[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setLocalTheme(next);
    setTheme(next);
  }

  const label = theme === "system" ? "System theme" : theme === "light" ? "Light theme" : "Dark theme";
  const icon = theme === "system" ? "◐" : theme === "light" ? "☀" : "☾";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${label}. Click to change.`}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground-muted hover:text-primary-600 hover:border-primary-300 transition-colors"
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
