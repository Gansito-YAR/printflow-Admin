// Dashboard Kanban (SRS Fase 3 §3, Spec-Kit §3.1).

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { OrderStatus, OrderSummary } from "../../lib/types";
import { STATUS_LABEL } from "../../lib/types";
import { STATUS_ICON, statusVars } from "../../components/status";

function LaneIcon({ status }: { status: OrderStatus }) {
  const Icon = STATUS_ICON[status];
  return <Icon size={16} aria-hidden />;
}
import { useSettingsStore } from "../../store/settings";
import { urgencyOf } from "../../utils/dates";
import { EmptyState, ErrorPanel, SelectField, Spinner, TextField } from "../../components/ui";
import { FilterBar } from "../../components/FilterBar";
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
  // Celular (RSP-11): un carril a la vez, elegido con pestañas.
  const [mobileLane, setMobileLane] = useState<OrderStatus>("IN_PRODUCTION");

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
      <div className="flex flex-wrap items-center justify-between gap-2 md:gap-4">
        <div>
          <h1 className="text-xl font-display font-normal tracking-wide text-ink-strong md:text-2xl">Tablero de producción</h1>
          <p className="text-sm text-ink-muted">Ordenado por fecha pactada de entrega.</p>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionIndicator status={rtStatus} onReconnect={reconnect} />
          <Link
            to="/pedidos/nuevo"
            className="hidden min-h-10 items-center rounded-md border-2 border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-ink md:inline-flex"
          >
            + Nuevo pedido
          </Link>
        </div>
      </div>

      {/* Celular: acción principal flotante */}
      <Link
        to="/pedidos/nuevo"
        aria-label="Nuevo pedido"
        className="fixed bottom-4 right-4 z-30 flex h-14 items-center gap-2 rounded-full border-2 border-primary bg-primary px-5 text-sm font-bold text-primary-ink shadow-[var(--shadow-2)] md:hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        data-testid="fab-new-order"
      >
        + Nuevo pedido
      </Link>

      <FilterBar active={(search.trim() ? 1 : 0) + (urgencyFilter !== "ALL" ? 1 : 0)}>
        <div className="lg:w-72!">
          <TextField enterKeyHint="search" autoComplete="off"
            label="Buscar"
            placeholder="Folio, cliente o teléfono"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-orders"
          />
        </div>
        <div>
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
      </FilterBar>

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
        <>
        {/* Celular: pestañas por estado con contador */}
        <div role="tablist" aria-label="Estados" className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 md:hidden">
          {LANES.map((status) => {
            const n = byLane.get(status)?.length ?? 0;
            const active = status === mobileLane;
            return (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMobileLane(status)}
                className={`min-h-11 shrink-0 rounded-full border-2 px-4 text-sm font-semibold ${
                  active ? "border-primary bg-primary text-primary-ink" : "border-line bg-surface-0 text-ink-strong"
                }`}
                data-testid={`lane-tab-${status}`}
              >
                {STATUS_LABEL[status]} <span className="tabular">({n})</span>
              </button>
            );
          })}
        </div>
        {/* Celular: un carril. Tablet: carriles deslizables. Escritorio: 4 columnas. */}
        <div className="flex min-h-0 flex-1 gap-4 md:snap-x md:snap-mandatory md:overflow-x-auto lg:grid lg:min-w-[992px] lg:grid-cols-4 lg:overflow-visible">
          {LANES.map((status) => {
            const lane = byLane.get(status) ?? [];
            const collapsed = status === "DELIVERED" && !showDelivered;
            // Aunque el carril de entregados esté colapsado, los adeudos nunca se esconden.
            const shown = collapsed ? lane.filter((o) => o.delivery_override && o.balance_due !== "0.00") : lane;
            return (
              <section
                key={status}
                aria-label={STATUS_LABEL[status]}
                className={`min-h-0 w-full shrink-0 flex-col rounded-md bg-surface-2 md:flex md:w-[46%] md:snap-start lg:w-auto lg:min-w-[248px] ${
                  status === mobileLane ? "flex" : "hidden"
                }`}
              >
                <header
                  className="flex items-center justify-between rounded-t-md border-t-4 px-3 py-2"
                  style={{ borderTopColor: statusVars(status).line }}
                >
                  <h2 className="flex items-center gap-1.5 text-sm font-bold" style={{ color: statusVars(status).ink }}>
                    <LaneIcon status={status} />
                    {STATUS_LABEL[status]}
                  </h2>
                  <span className="rounded-sm bg-surface-0 px-2 text-xs font-bold text-ink-strong tabular">{lane.length}</span>
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
        </>
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
