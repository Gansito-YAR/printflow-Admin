import { Link } from "react-router-dom";
import type { OrderSummary } from "../../lib/types";
import { formatMoney, isZero } from "../../utils/money";
import { formatDateTime, urgencyOf } from "../../utils/dates";
import { Button, URGENCY_CARD, UrgencyBadge } from "../../components/ui";

export function itemsSummary(items: OrderSummary["items"]): string {
  const sorted = [...items].sort((a, b) => a.line_no - b.line_no);
  const first = sorted[0];
  if (!first) return "Sin partidas";
  return sorted.length > 1 ? `${first.description} y ${sorted.length - 1} más` : first.description;
}

export function OrderCard({
  order,
  timezone,
  now,
  onRegisterPayment,
}: {
  order: OrderSummary;
  timezone: string;
  now: Date;
  onRegisterPayment: (order: OrderSummary) => void;
}) {
  const delivered = order.status === "DELIVERED";
  const urgency = delivered ? null : urgencyOf(order.promised_date, now, timezone);
  const paid = isZero(order.balance_due);
  const onCredit = delivered && order.delivery_override && !paid;

  return (
    <article
      data-testid="order-card"
      className={`flex flex-col gap-2 rounded-md bg-surface-0 p-4 ${urgency ? URGENCY_CARD[urgency] : "border border-line"}`}
    >
      {urgency === "OVERDUE" && <div aria-hidden className="trama -mx-4 -mt-4 mb-1 h-2 rounded-t-md" />}
      {urgency === "TODAY" && <div aria-hidden className="-mx-4 -mt-4 mb-1 h-2 rounded-t-md bg-blocked-line" />}

      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-bold text-ink-muted">{order.folio}</span>
        {urgency && <UrgencyBadge urgency={urgency} />}
        {onCredit && (
          <span
            className="rounded-sm border-2 border-blocked-line bg-blocked px-1.5 py-0.5 text-[10px] font-bold text-blocked-ink"
            data-testid="credit-badge"
          >
            [!] ENTREGADO CON ADEUDO
          </span>
        )}
      </div>

      <div>
        <p className="font-semibold text-ink-strong">{order.customer?.full_name ?? "Cliente no disponible"}</p>
        <p className="line-clamp-2 text-sm text-ink-base">{itemsSummary(order.items)}</p>
      </div>

      <p className="text-xs text-ink-muted">
        Entrega: <span className="font-semibold text-ink-strong">{formatDateTime(order.promised_date, timezone)}</span>
      </p>

      <div className="flex items-end justify-between gap-2 border-t border-line pt-2">
        <div className="tabular">
          <p className="text-xs text-ink-muted">Saldo</p>
          <p className={`text-lg font-bold ${paid ? "text-cleared-ink" : onCredit ? "text-blocked-ink" : "text-ink-strong"}`}>
            {formatMoney(order.balance_due)}
          </p>
          <p className="text-xs text-ink-muted">de {formatMoney(order.total_price)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {(!delivered || onCredit) && !paid && (
            <Button
              variant="primary"
              className="min-h-8 px-3 py-1 text-xs"
              onClick={() => onRegisterPayment(order)}
              data-testid="button-register-payment"
            >
              Registrar abono
            </Button>
          )}
          <Link
            to={`/pedidos/${order.folio}`}
            className="text-xs font-semibold text-brand-accent underline underline-offset-2"
          >
            Ver detalle
          </Link>
        </div>
      </div>
    </article>
  );
}
