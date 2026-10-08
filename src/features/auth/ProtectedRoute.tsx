// Ruta protegida (SRS Fase 3 §2): solo ADMIN activo. Mientras no hay sesión
// válida, NO se monta ningún componente financiero.

import { useEffect, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { useSettingsStore } from "../../store/settings";
import { Spinner } from "../../components/ui";
import { useInactivityLogout } from "./useInactivityLogout";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const loadSettings = useSettingsStore((s) => s.load);

  useInactivityLogout(status === "ready");

  useEffect(() => {
    if (status === "ready") void loadSettings();
  }, [status, loadSettings]);

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center text-ink-muted">
        <Spinner label="Cargando…" />
      </div>
    );
  }
  if (status !== "ready") return <Navigate to="/login" replace />;
  return <>{children}</>;
}
