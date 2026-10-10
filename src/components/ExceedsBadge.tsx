// Badge "Excede insumos" (Plan Correcciones v2, C6): el pedido pasó a producción con
// faltante y su alerta sigue abierta. Persiste hasta que se reabastece.

import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

export function ExceedsBadge({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/notificaciones"
      title="Este pedido usó insumos que no había. Se quita al reabastecer."
      className={`inline-flex items-center gap-1 rounded-full border-2 border-blocked-line bg-blocked font-sans font-bold tracking-normal text-blocked-ink ${
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      }`}
      data-testid="exceeds-badge"
    >
      <AlertTriangle size={compact ? 11 : 13} aria-hidden />
      Excede insumos
    </Link>
  );
}
