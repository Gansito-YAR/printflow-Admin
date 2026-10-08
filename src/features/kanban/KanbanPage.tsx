// Dashboard Kanban (SRS Fase 3 §3, Spec-Kit §3.1).

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { OrderStatus, OrderSummary } from "../../lib/types";
import { STATUS_LABEL } from "../../lib/types";
import { useSettingsStore } from "../../store/settings";
import { urgencyOf } from "../../utils/dates";
import { EmptyState, ErrorPanel, SelectField, Spinner, TextField } from "../../components/ui";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { PaymentModal } from "../pos/PaymentModal";
import { ConnectionIndicator } from "./ConnectionIndicator";
import { OrderCard } from "./OrderCard";
import { useRealtimeOrders } from "./useRealtimeOrders";

const LANES: OrderStatus[] = ["PENDING_DEPOSIT", "IN_PRODUCTION", "READY_FOR_DELIVERY", "DELIVERED"];

type UrgencyFilter = "ALL" | "CRITICAL" | "TOMORROW";

function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function KanbanPage() {
  const timezone = useSettingsStore((s) => s.timezone);
  const { orders, loading, error, rtStatus, reload, reconnect, refreshOne } = useRealtimeOrders();
  const now = useNow();

  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("ALL");
  const [showDelivered, setShowDelivered] = useState(false);
  const [paying, setPaying] = useState<OrderSummary | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (term) {
        const haystack = `${o.folio} ${o.customer?.full_name ?? ""} ${o.customer?.phone_number ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (urgencyFilter !== "ALL" && o.status !== "DELIVERED") {
        const u = urgencyOf(o.promised_date, now, timezone);
        if (urgencyFilter === "CRITICAL" && u !== "OVERDUE" && u !== "TODAY") return false;
        if (urgencyFilter === "TOMORROW" && u !== "TOMORROW") return false;
      }
      return true;
    });
  }, [orders, search, urgencyFilter, now, timezone]);

  const byLane = useMemo(() => {
    const map = new Map<OrderStatus, OrderSummary[]>(LANES.map((s) => [s, []]));
    for (const o of filtered) map.get(o.status)?.push(o);
    return map;
  }, [filtered]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink-strong">Tablero de producción</h1>
          <p className="text-sm text-ink-muted">Ordenado por fecha pactada de entrega.</p>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionIndicator status={rtStatus} onReconnect={reconnect} />
          <Link
            to="/pedidos/nuevo"
            className="rounded-md border-2 border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-ink"
          >
            + Nuevo pedido
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-md border border-line bg-surface-0 p-3">
        <div className="w-72">
          <TextField
            label="Buscar"
            placeholder="Folio, cliente o teléfono"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-orders"
          />
        </div>
        <div className="w-56">
          <SelectField
            label="Fecha pactada"
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value as UrgencyFilter)}
          >
            <option value="ALL">Todas</option>
            <option value="CRITICAL">Vencidos y de hoy</option>
            <option value="TOMORROW">Vencen mañana</option>
          </SelectField>
        </div>
      </div>

      {error && <ErrorPanel message={error} onRetry={() => void reload()} />}

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-ink-muted">
          <Spinner label="Cargando pedidos…" />
        </div>
      ) : orders.length === 0 && !error ? (
        <EmptyState>
          No hay pedidos activos.{" "}
          <Link to="/pedidos/nuevo" className="font-semibold text-brand-accent underline">
            Registrar un pedido
          </Link>
        </EmptyState>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-4 gap-4 overflow-x-auto" style={{ minWidth: 4 * 248 }}>
          {LANES.map((status) => {
            const lane = byLane.get(status) ?? [];
            const collapsed = status === "DELIVERED" && !showDelivered;
            // Aunque el carril de entregados esté colapsado, los adeudos nunca se esconden.
            const shown = collapsed ? lane.filter((o) => o.delivery_override && o.balance_due !== "0.00") : lane;
            return (
              <section
                key={status}
                aria-label={STATUS_LABEL[status]}
                className="flex min-h-0 min-w-[248px] flex-col rounded-md bg-surface-2"
              >
                <header className="flex items-center justify-between px-3 py-2">
                  <h2 className="text-sm font-bold text-ink-strong">{STATUS_LABEL[status]}</h2>
                  <span className="rounded-sm bg-surface-0 px-2 text-xs font-bold text-ink-strong">{lane.length}</span>
                </header>
                <ErrorBoundary message="Error cargando este carril.">
                  <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 pt-0">
                    {status === "DELIVERED" && (
                      <button
                        type="button"
                        onClick={() => setShowDelivered((v) => !v)}
                        className="text-left text-xs font-semibold text-brand-accent underline"
                      >
                        {collapsed ? "Mostrar entregados (últimos 7 días)" : "Ocultar entregados"}
                      </button>
                    )}
                    {!collapsed && lane.length === 0 && <EmptyState>[EMPTY] Sin pedidos en este estado</EmptyState>}
                    {shown.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        timezone={timezone}
                        now={now}
                        onRegisterPayment={setPaying}
                      />
                    ))}
                  </div>
                </ErrorBoundary>
              </section>
            );
          })}
        </div>
      )}

      {paying && (
        <PaymentModal
          order={{
            id: paying.id,
            folio: paying.folio,
            customerName: paying.customer?.full_name ?? "",
            totalPrice: paying.total_price,
            balanceDue: paying.balance_due,
          }}
          onClose={() => setPaying(null)}
          onPaid={() => void refreshOne(paying.id)}
        />
      )}
    </div>
  );
}
