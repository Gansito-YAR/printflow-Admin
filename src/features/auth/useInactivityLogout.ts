// Cierre de sesión tras N minutos sin actividad (SRS Fase 3 §2; N en Configuración, 30 por defecto).
// Al cerrar sesión se desmonta todo: modales y borradores financieros
// desaparecen de memoria (Spec-Kit §3.0).

import { useEffect } from "react";
import { useAuthStore } from "../../store/auth";

export const INACTIVITY_MS = 30 * 60 * 1000;
const EVENTS = ["mousemove", "mousedown", "keydown", "wheel", "touchstart"] as const;

export function useInactivityLogout(enabled: boolean, timeoutMs = INACTIVITY_MS) {
  const signOut = useAuthStore((s) => s.signOut);

  useEffect(() => {
    if (!enabled) return;
    let timer = window.setTimeout(expire, timeoutMs);

    function expire() {
      const min = Math.round(timeoutMs / 60000);
      void signOut(`Sesión cerrada por inactividad (${min} minutos). Inicie sesión nuevamente.`);
    }
    function reset() {
      window.clearTimeout(timer);
      timer = window.setTimeout(expire, timeoutMs);
    }

    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [enabled, timeoutMs, signOut]);
}
