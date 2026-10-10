// Detalle de pedido (ADM-05): partidas, abonos, bitácora y acciones.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchOrderDetail } from "../../lib/queries";
import { rpc } from "../../lib/rpc";
import { toAppError } from "../../lib/errors";
import type { OrderDetail, OrderStatus } from "../../lib/types";
import { COST_EVENTS, EVENT_LABEL, itemQuantityLabel, METHOD_LABEL, STATUS_LABEL, TIER_LABEL } from "../../lib/types";
import { useSettingsStore } from "../../store/settings";
import { formatMoney, isZero } from "../../utils/money";
import { formatDateLong, formatDateTime } from "../../utils/dates";
import { Button, EmptyState, ErrorPanel, Spinner, StatusBadge } from "../../components/ui";
import { PaymentModal } from "../pos/PaymentModal";
import { RemissionButton } from "../pdf/RemissionButton";
import { AdvancedActions } from "../supervisor/AdvancedActions";
import { DataList } from "../../components/DataList";
import { StickyActions } from "../../components/StickyActions";
import { CostingSection } from "./CostingSection";
import { formatPhone } from "../../utils/phone";

const NEXT: Partial<Record<OrderStatus, "IN_PRODUCTION" | "READY_FOR_DELIVERY">> = {
  PENDING_DEPOSIT: "IN_PRODUCTION",
  IN_PRODUCTION: "READY_FOR_DELIVERY",
};

function eventValue(v: string | null): string {
  if (!v) return "";
  return v in STATUS_LABEL ? STATUS_LABEL[v as OrderStatus] : v;
}

export function OrderDetailPage() {
  const { folio = "" } = useParams();
  const timezone = useSettingsStore((s) => s.timezone);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    try {
      setOrder(await fetchOrderDetail(folio));
      setError(null);
    } catch (err) {
      setError(toAppError(err).userText);
    } finally {
      setLoading(false);
    }
  }, [folio]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  async function advance(to: "IN_PRODUCTION" | "READY_FOR_DELIVERY") {
    if (!order || inFlight.current) return;
    inFlight.current = true;
    setAdvancing(true);
    try {
      await rpc.advanceOrderStatus(order.id, to);
      toast.success(`Pedido en "${STATUS_LABEL[to]}".`);
      await load();
    } catch (err) {
      toast.error(toAppError(err).userText);
    } finally {
      inFlight.current = false;
      setAdvancing(false);
    }
  }

  if (loading) return <Spinner label="Cargando pedido…" />;
  if (error) return <ErrorPanel message={error} onRetry={() => void load()} />;
  if (!order)
    return (
      <EmptyState>
        No existe el pedido {folio}. <Link to="/" className="font-semibold underline">Volver al tablero</Link>
      </EmptyState>
    );

  const next = NEXT[order.status];
  const onCredit = order.status === "DELIVERED" && order.delivery_override;
  const closed = (order.status === "DELIVERED" && !order.delivery_override) || order.status === "CANCELLED";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 pb-6 md:gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="min-w-0">
          <Link to="/" className="inline-flex min-h-11 items-center text-sm text-brand-accent underline md:min-h-0">
            ← Tablero
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-display font-normal tracking-wide text-ink-strong md:gap-3">
            {order.folio} <StatusBadge status={order.status} />
          </h1>
          <p className="break-words text-sm text-ink-muted">
            {order.customer?.full_name} · {formatPhone(order.customer?.phone_number)}
            {order.customer && ` · Tarifa ${TIER_LABEL[order.customer.pricing_tier]}`}
          </p>
          <p className="text-sm text-ink-base">Entrega pactada: {formatDateLong(order.promised_date, timezone)}</p>
          {order.production_override && (
            <p className="text-sm font-semibold text-warning-ink">Producción autorizada sin anticipo.</p>
          )}
          {onCredit && !isZero(order.balance_due) && (
            <p className="text-sm font-bold text-blocked-ink" data-testid="credit-banner">
              [!] Entregado con adeudo (cliente con crédito): saldo por cobrar {formatMoney(order.balance_due)}.
            </p>
          )}
          {onCredit && isZero(order.balance_due) && (
            <p className="text-sm font-semibold text-cleared-ink">Entregado con crédito: adeudo liquidado.</p>
          )}
          <a href="#bitacora" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent underline md:min-h-0">
            Ver bitácora del pedido ↓
          </a>
        </div>
        <div className="flex items-center justify-between gap-1 rounded-md border border-line bg-surface-0 p-3 tabular md:flex-col md:items-end md:border-0 md:bg-transparent md:p-0">
          <span className="text-sm text-ink-muted md:order-first">Total {formatMoney(order.total_price)}</span>
          <span className="hidden text-sm font-semibold text-ink-strong md:inline">Saldo</span>
          <span className="text-3xl font-bold text-ink-strong" data-testid="detail-balance">
            {formatMoney(order.balance_due)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:gap-3">
        {!closed && !isZero(order.balance_due) && (
          <Button onClick={() => setPaying(true)} className="hidden lg:inline-flex" data-testid="button-open-payment">
            Registrar abono
          </Button>
        )}
        {next && (
          <Button variant="secondary" onClick={() => void advance(next)} loading={advancing}>
            Pasar a “{STATUS_LABEL[next]}”
          </Button>
        )}
        {order.status !== "CANCELLED" && <RemissionButton order={order} timezone={timezone} />}
      </div>
      {order.status === "READY_FOR_DELIVERY" && (
        <p className="text-sm text-ink-muted">
          La entrega la confirma el instalador escaneando el QR de la remisión
          {isZero(order.balance_due) ? "." : "; antes debe liquidarse el saldo."}
        </p>
      )}

      <section className="rounded-md border border-line bg-surface-0 p-4 md:p-6">
        <h2 className="mb-3 font-bold text-ink-strong">Partidas</h2>
        <DataList
          label="Partidas"
          rows={order.items}
          rowKey={(it) => String(it.line_no)}
          columns={[
            {
              key: "desc",
              header: "Descripción",
              primary: true,
              render: (it) => (
                <>
                  {it.description} <span className="text-xs font-normal text-ink-muted">({TIER_LABEL[it.applied_tier]})</span>
                </>
              ),
            },
            { key: "qty", header: "Cantidad", align: "right", render: (it) => itemQuantityLabel(it) },
            { key: "price", header: "P. unitario", align: "right", render: (it) => formatMoney(it.unit_price) },
            {
              key: "total",
              header: "Importe",
              align: "right",
              render: (it) => <span className="font-semibold">{formatMoney(it.line_total)}</span>,
            },
          ]}
        />
        {order.notes && <p className="mt-3 text-sm text-ink-base">Notas: {order.notes}</p>}
      </section>

      <div>
        <section className="rounded-md border border-line bg-surface-0 p-4 md:p-6">
          <h2 className="mb-3 font-bold text-ink-strong">Abonos</h2>
          {order.payments.length === 0 ? (
            <p className="text-sm text-ink-muted">Sin abonos.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm tabular">
              {order.payments.map((p) => (
                <li key={p.id} className="flex justify-between border-b border-line pb-2">
                  <span>
                    {formatDateTime(p.created_at, timezone)} · {METHOD_LABEL[p.payment_method]}
                    <span className="block text-xs text-ink-muted">{p.registered_by?.full_name ?? ""}</span>
                  </span>
                  <span className="font-semibold">{formatMoney(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>

      <section id="bitacora" aria-label="Bitácora del pedido" className="scroll-mt-4 rounded-md border-2 border-line-strong bg-surface-0 p-4 md:p-6">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-ink-strong">Bitácora del pedido</h2>
          <Link to="/bitacora" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent underline md:min-h-0">
            Ver bitácora general
          </Link>
        </div>
        <p className="mb-3 text-xs text-ink-muted">
          Todo lo que se hizo con este pedido: quién, cuándo y por qué. No se puede editar ni borrar.
        </p>
        <ol className="flex flex-col gap-2 text-sm" data-testid="order-log">
          {order.events.map((ev) => (
            <li key={ev.id} className="grid grid-cols-1 gap-1 border-b border-line pb-2 md:grid-cols-[11rem_1fr] md:gap-3">
              <span className="tabular text-xs text-ink-muted">
                {formatDateTime(ev.created_at, timezone)}
                <span className="block">{ev.actor?.full_name ?? "Sistema"}</span>
              </span>
              <span>
                <span className="font-semibold text-ink-strong">{EVENT_LABEL[ev.event_type]}</span>
                {ev.event_type === "PAYMENT_REGISTERED" ? (
                  <span className="tabular text-ink-base">
                    {" "}
                    · {formatMoney(ev.amount)} · saldo restante {formatMoney(ev.to_value)}
                  </span>
                ) : ev.event_type === "DELIVERY_OVERRIDE" ? (
                  <span className="tabular text-ink-base"> · saldo por cobrar {formatMoney(ev.amount)}</span>
                ) : COST_EVENTS.has(ev.event_type) ? (
                  ev.to_value && ev.event_type !== "MATERIALS_RETURNED" && <span className="text-ink-base"> · {ev.to_value}</span>
                ) : (
                  <>
                    {(ev.from_value || ev.to_value) && (
                      <span className="text-ink-base">
                        {" "}
                        {ev.event_type === "PROMISED_DATE_CHANGED"
                          ? `${formatDateTime(ev.from_value, timezone)} → ${formatDateTime(ev.to_value, timezone)}`
                          : `${ev.from_value ? `${eventValue(ev.from_value)} → ` : "→ "}${eventValue(ev.to_value)}`}
                      </span>
                    )}
                    {ev.amount && <span className="tabular"> · {formatMoney(ev.amount)}</span>}
                  </>
                )}
                {ev.reason && <span className="block text-ink-base">Motivo: {ev.reason}</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <CostingSection key={`${order.id}-${order.status}`} orderId={order.id} timezone={timezone} />

      <AdvancedActions order={order} timezone={timezone} onDone={() => void load()} />

      {!closed && !isZero(order.balance_due) && (
        <div className="lg:hidden">
          <StickyActions
            summary={
              <span className="tabular">
                Saldo <strong className="text-lg text-ink-strong">{formatMoney(order.balance_due)}</strong>
              </span>
            }
          >
            <Button onClick={() => setPaying(true)} data-testid="button-open-payment-mobile">
              Registrar abono
            </Button>
          </StickyActions>
        </div>
      )}

      {paying && (
        <PaymentModal
          order={{
            id: order.id,
            folio: order.folio,
            customerName: order.customer?.full_name ?? "",
            totalPrice: order.total_price,
            balanceDue: order.balance_due,
          }}
          onClose={() => setPaying(false)}
          onPaid={() => void load()}
        />
      )}
    </div>
  );
}
