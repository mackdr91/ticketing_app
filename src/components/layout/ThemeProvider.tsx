/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Dark and Light mode theme provider synchronizing <meta name="color-scheme">, localStorage, and multi-tab storage events.
 */

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type ResolvedTheme = "dark" | "light";

interface ThemeContextValue {
  resolvedTheme: ResolvedTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  resolvedTheme: "dark",
  toggleTheme: () => undefined,
});

function getSystemScheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "dark";
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applySchemeToDom(schemeValue: string): ResolvedTheme {
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="color-scheme"]'
  );
  if (meta) {
    meta.content = schemeValue;
  }

  const resolved: ResolvedTheme =
    schemeValue === "light" || schemeValue === "dark"
      ? schemeValue
      : getSystemScheme();

  document.documentElement.classList.toggle("dark", resolved === "dark");
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("color-scheme");
    } catch {
      stored = null;
    }

    const initialScheme = stored ?? "dark";
    setResolvedTheme(applySchemeToDom(initialScheme));

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "color-scheme") {
        const nextScheme = event.newValue ?? "light dark";
        setResolvedTheme(applySchemeToDom(nextScheme));
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const target: ResolvedTheme = resolvedTheme === "dark" ? "light" : "dark";
    const systemPref = getSystemScheme();

    try {
      // Per modern-web-guidance (dark-mode-toggle): if the target matches the OS preference,
      // remove the stored override rather than invisibly pinning it against future OS changes.
      if (target === systemPref) {
        localStorage.removeItem("color-scheme");
        setResolvedTheme(applySchemeToDom("light dark"));
      } else {
        localStorage.setItem("color-scheme", target);
        setResolvedTheme(applySchemeToDom(target));
      }
    } catch {
      setResolvedTheme(applySchemeToDom(target));
    }
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ resolvedTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
