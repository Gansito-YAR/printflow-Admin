// Indicador de Realtime con 4 estados (Spec-Kit §3.1). Nunca finge estar al día.

import { Button } from "../../components/ui";
import type { RealtimeStatus } from "./useRealtimeOrders";

const VIEW: Record<RealtimeStatus, { dot: string; label: string }> = {
  connected: { dot: "bg-cleared-line", label: "EN TIEMPO REAL" },
  connecting: { dot: "border-2 border-warning-line animate-pulse", label: "CONECTANDO…" },
  disconnected: { dot: "border-2 border-line-strong", label: "SIN TIEMPO REAL" },
  error: { dot: "bg-blocked-line", label: "[!] ERROR DE CONEXIÓN" },
};

export function ConnectionIndicator({
  status,
  onReconnect,
}: {
  status: RealtimeStatus;
  onReconnect: () => void;
}) {
  const view = VIEW[status];
  return (
    <div className="flex min-w-40 items-center gap-3" data-testid="realtime-indicator" aria-live="polite">
      <span aria-hidden className={`inline-block h-3 w-3 rounded-full ${view.dot}`} />
      <span className="text-xs font-bold tracking-wide text-ink-strong">{view.label}</span>
      {(status === "disconnected" || status === "error") && (
        <Button variant="secondary" onClick={onReconnect} className="min-h-8 px-3 py-1">
          Reconectar
        </Button>
      )}
    </div>
  );
}
