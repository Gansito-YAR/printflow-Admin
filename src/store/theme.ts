// Tema del panel: sistema / claro / oscuro (Plan Correcciones v2, C1).
// Persiste en localStorage. El script en línea de index.html aplica el tema
// antes del primer pintado; este store lo mantiene sincronizado después.

import { create } from "zustand";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "printflow-admin-theme";

function read(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    // localStorage bloqueado (navegación privada): se usa el del sistema
  }
  return "system";
}

function apply(pref: ThemePreference): void {
  const root = document.documentElement;
  if (pref === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", pref);
}

interface ThemeState {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: read(),
  setPreference: (preference) => {
    apply(preference);
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // sin persistencia: dura hasta recargar
    }
    set({ preference });
  },
}));

/** Tema efectivo en este momento (para librerías que no leen CSS, p. ej. toasts). */
export function useResolvedTheme(): "light" | "dark" {
  const preference = useThemeStore((s) => s.preference);
  if (preference !== "system") return preference;
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
