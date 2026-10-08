// Detalle de pedido (ADM-05): partidas, abonos, bitácora y acciones.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchOrderDetail } from "../../lib/queries";
import { rpc } from "../../lib/rpc";
import { toAppError } from "../../lib/errors";
import type { OrderDetail, OrderStatus } from "../../lib/types";
import { COST_EVENTS, EVENT_LABEL, METHOD_LABEL, STATUS_LABEL, TIER_LABEL, UNIT_LABEL } from "../../lib/types";
import { useSettingsStore } from "../../store/settings";
import { formatMoney, isZero } from "../../utils/money";
import { formatDateLong, formatDateTime } from "../../utils/dates";
import { Button, EmptyState, ErrorPanel, Spinner, StatusBadge } from "../../components/ui";
import { PaymentModal } from "../pos/PaymentModal";
import { RemissionButton } from "../pdf/RemissionButton";
import { AdvancedActions } from "../supervisor/AdvancedActions";

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
  const closed = order.status === "DELIVERED" || order.status === "CANCELLED";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/" className="text-sm text-brand-accent underline">
            ← Tablero
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-xl font-bold text-ink-strong">
            {order.folio} <StatusBadge status={order.status} />
          </h1>
          <p className="text-sm text-ink-muted">
            {order.customer?.full_name} · {order.customer?.phone_number}
            {order.customer && ` · Tarifa ${TIER_LABEL[order.customer.pricing_tier]}`}
          </p>
          <p className="text-sm text-ink-base">Entrega pactada: {formatDateLong(order.promised_date, timezone)}</p>
          {order.production_override && (
            <p className="text-sm font-semibold text-warning-ink">Producción autorizada sin anticipo.</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 tabular">
          <span className="text-sm text-ink-muted">Total {formatMoney(order.total_price)}</span>
          <span className="text-sm font-semibold text-ink-strong">Saldo</span>
          <span className="text-3xl font-bold text-ink-strong" data-testid="detail-balance">
            {formatMoney(order.balance_due)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {!closed && !isZero(order.balance_due) && (
          <Button onClick={() => setPaying(true)} data-testid="button-open-payment">
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

      <section className="rounded-md border border-line bg-surface-0 p-6">
        <h2 className="mb-3 font-bold text-ink-strong">Partidas</h2>
        <table className="w-full text-sm tabular">
          <thead className="text-left text-ink-muted">
            <tr>
              <th className="py-1">Descripción</th>
              <th className="py-1 text-right">Cantidad</th>
              <th className="py-1 text-right">P. unitario</th>
              <th className="py-1 text-right">Importe</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.line_no} className="border-t border-line">
                <td className="py-2">
                  {it.description} <span className="text-xs text-ink-muted">({TIER_LABEL[it.applied_tier]})</span>
                </td>
                <td className="py-2 text-right">
                  {it.quantity} {UNIT_LABEL[it.pricing_unit]}
                </td>
                <td className="py-2 text-right">{formatMoney(it.unit_price)}</td>
                <td className="py-2 text-right font-semibold">{formatMoney(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {order.notes && <p className="mt-3 text-sm text-ink-base">Notas: {order.notes}</p>}
      </section>

      <div className="grid grid-cols-2 gap-6">
        <section className="rounded-md border border-line bg-surface-0 p-6">
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

        <section className="rounded-md border border-line bg-surface-0 p-6">
          <h2 className="mb-3 font-bold text-ink-strong">Bitácora</h2>
          <ol className="flex flex-col gap-2 text-sm">
            {order.events.map((ev) => (
              <li key={ev.id} className="border-b border-line pb-2">
                <span className="font-semibold text-ink-strong">{EVENT_LABEL[ev.event_type]}</span>
                {(ev.from_value || ev.to_value) && (
                  <span className="text-ink-base">
                    {" "}
                    {eventValue(ev.from_value)} → {eventValue(ev.to_value)}
                  </span>
                )}
                {ev.amount && !COST_EVENTS.has(ev.event_type) && <span className="tabular"> · {formatMoney(ev.amount)}</span>}
                {ev.reason && <span className="block text-ink-base">Motivo: {ev.reason}</span>}
                <span className="block text-xs text-ink-muted">
                  {formatDateTime(ev.created_at, timezone)} · {ev.actor?.full_name ?? "Sistema"}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <AdvancedActions order={order} timezone={timezone} onDone={() => void load()} />

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
