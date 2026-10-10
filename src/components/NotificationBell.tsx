// Campana del encabezado (Plan Correcciones v2, C6).
// Rojo si hay faltantes en producción sin resolver; ámbar si solo hay previstos o
// stock bajo. Siempre con número e icono: el color nunca es la única señal.

import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { hasOpenShortage, unseenCount, useNotificationsStore } from "../store/notifications";

export function NotificationBell() {
  const data = useNotificationsStore((s) => s.data);
  const count = unseenCount(data);
  const urgent = hasOpenShortage(data);

  return (
    <Link
      to="/notificaciones"
      aria-label={count > 0 ? `Notificaciones: ${count} pendiente${count === 1 ? "" : "s"}` : "Notificaciones"}
      title="Notificaciones"
      className="relative flex min-h-10 min-w-10 items-center justify-center rounded-md border border-line text-ink-strong hover:bg-surface-2"
      data-testid="notification-bell"
    >
      <Bell size={18} aria-hidden />
      {count > 0 && (
        <span
          aria-hidden
          className={`absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface-0 px-1 text-[11px] font-bold tabular ${
            urgent ? "bg-blocked-line text-surface-0" : "bg-warning-line text-primary-ink"
          }`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
