"use client";

import { useEffect, useState } from "react";
import { applyTheme, getStoredTheme, setTheme, type Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀" },
  { value: "dark", label: "Dark", icon: "☾" },
  { value: "system", label: "System", icon: "◐" },
];

export function AppearancePanel() {
  const [theme, setLocalTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = getStoredTheme();
    setLocalTheme(stored);
    applyTheme(stored);
  }, []);

  function choose(next: Theme) {
    setLocalTheme(next);
    setTheme(next);
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
      <p className="mt-1 text-sm text-foreground-muted">
        Choose light or dark shades of blue, or follow your system setting. Applies immediately on this device.
      </p>

      <div role="radiogroup" aria-label="Theme" className="mt-4 grid grid-cols-3 gap-2 sm:max-w-sm">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={theme === opt.value}
            onClick={() => choose(opt.value)}
            className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
              theme === opt.value
                ? "border-primary-400 bg-primary-50 text-primary-700"
                : "border-border text-foreground-muted hover:border-primary-200 hover:text-foreground"
            }`}
          >
            <span aria-hidden="true" className="text-lg">
              {opt.icon}
            </span>
            {opt.label}
          </button>
        ))}
      </div>
    </section>
  );
}
