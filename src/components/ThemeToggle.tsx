// Selector de tema del encabezado: cicla Sistema → Claro → Oscuro.
// Icono + nombre accesible con el estado actual (nunca solo icono).

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useThemeStore, type ThemePreference } from "../store/theme";

const ORDER: ThemePreference[] = ["system", "light", "dark"];
const LABEL: Record<ThemePreference, string> = { system: "Sistema", light: "Claro", dark: "Oscuro" };
const ICON: Record<ThemePreference, LucideIcon> = { system: Monitor, light: Sun, dark: Moon };

export function ThemeToggle() {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const Icon = ICON[preference];
  const next = ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length] ?? "system";

  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={`Tema: ${LABEL[preference]}. Cambiar a ${LABEL[next]}`}
      title={`Tema: ${LABEL[preference]}`}
      className="flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-md border border-line px-2.5 text-sm font-semibold text-ink-strong hover:bg-surface-2"
      data-testid="theme-toggle"
    >
      <Icon size={18} aria-hidden />
      <span className="hidden xl:inline">{LABEL[preference]}</span>
    </button>
  );
}
