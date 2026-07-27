"use client";

import * as React from "react";

export type Theme = "light" | "dark" | "system";
export type Resolved = "light" | "dark";

export const STORAGE_KEY = "cv-theme";

/** Dark-primary for the app shell, per docs/DESIGN.md section 1. */
const DEFAULT: Theme = "dark";

/**
 * Runs before first paint so the page never flashes the wrong palette. Kept as
 * a string because it has to be inlined into <head> ahead of hydration - see
 * ThemeScript below.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)})||${JSON.stringify(DEFAULT)};var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;document.documentElement.setAttribute("data-theme",r);document.documentElement.style.colorScheme=r;}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}

type ThemeContext = {
  theme: Theme;
  resolved: Resolved;
  setTheme: (theme: Theme) => void;
};

const Ctx = React.createContext<ThemeContext | null>(null);

function systemPrefers(): Resolved {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function apply(resolved: Resolved) {
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Server render always assumes the default; themeScript has already corrected
  // the DOM by the time this hydrates, so nothing repaints.
  const [theme, setThemeState] = React.useState<Theme>(DEFAULT);
  const [resolved, setResolved] = React.useState<Resolved>(
    DEFAULT === "system" ? "light" : DEFAULT,
  );

  // Layout effect, not effect: this must land before the browser paints, or
  // the very first frame reads the wrong `resolved` value (e.g. the wrong
  // Sun/Moon icon) even though themeScript already set the DOM attribute
  // correctly ahead of hydration.
  React.useLayoutEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const next = stored ?? DEFAULT;
    setThemeState(next);
    setResolved(next === "system" ? systemPrefers() : next);
  }, []);

  // Only the system setting tracks the OS; an explicit choice stays put.
  React.useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = systemPrefers();
      setResolved(next);
      apply(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = React.useCallback((next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
    const r = next === "system" ? systemPrefers() : next;
    setResolved(r);
    apply(r);
  }, []);

  const value = React.useMemo(
    () => ({ theme, resolved, setTheme }),
    [theme, resolved, setTheme],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
