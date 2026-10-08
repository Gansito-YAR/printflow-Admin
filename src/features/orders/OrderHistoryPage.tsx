// Pedidos: listado completo de todos los estados, incluidos cancelados y entregados
// antiguos que el tablero ya no muestra.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchOrderHistory, HISTORY_PAGE_SIZE, type OrderHistoryRow } from "../../lib/queries";
import { toAppError } from "../../lib/errors";
import type { OrderStatus } from "../../lib/types";
import { STATUS_LABEL } from "../../lib/types";
import { useSettingsStore } from "../../store/settings";
import { formatMoney } from "../../utils/money";
import { formatDateTime, fromDateTimeLocal } from "../../utils/dates";
import { Button, EmptyState, ErrorPanel, SelectField, Spinner, StatusBadge, TextField } from "../../components/ui";
import { itemsSummary } from "../kanban/OrderCard";

export function OrderHistoryPage() {
  const timezone = useSettingsStore((s) => s.timezone);
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
  const [term, setTerm] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<OrderHistoryRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        // Rango de fechas en la zona operativa; "hasta" incluye todo ese día.
        const fromIso = from ? fromDateTimeLocal(`${from}T00:00`, timezone) : null;
        const toIso = to ? fromDateTimeLocal(`${to}T00:00`, timezone) : null;
        const toExclusive = toIso ? new Date(new Date(toIso).getTime() + 24 * 3600 * 1000).toISOString() : null;
        const r = await fetchOrderHistory({ status, term, from: fromIso, to: toExclusive, page });
        if (!cancelled) {
          setRows(r.rows);
          setCount(r.count);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(toAppError(err).userText);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [status, term, from, to, page, timezone, version]);

  const pages = Math.max(1, Math.ceil(count / HISTORY_PAGE_SIZE));
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    setPage(0);
    fn(v);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-ink-strong">Pedidos</h1>
        <p className="text-sm text-ink-muted">Todos los pedidos de todos los estados, del más reciente al más antiguo.</p>
      </div>
      <div className="flex flex-wrap items-end gap-4 rounded-md border border-line bg-surface-0 p-3">
        <div className="w-48">
          <TextField label="Folio" placeholder="PF-…" value={term} onChange={(e) => resetPage(setTerm)(e.target.value)} />
        </div>
        <div className="w-52">
          <SelectField label="Estado" value={status} onChange={(e) => resetPage(setStatus)(e.target.value as OrderStatus | "ALL")}>
            <option value="ALL">Todos</option>
            {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-40">
          <TextField label="Registrado desde" type="date" value={from} onChange={(e) => resetPage(setFrom)(e.target.value)} />
        </div>
        <div className="w-40">
          <TextField label="Hasta" type="date" value={to} onChange={(e) => resetPage(setTo)(e.target.value)} />
        </div>
      </div>
      {error && <ErrorPanel message={error} onRetry={() => setVersion((v) => v + 1)} />}
      {loading ? (
        <Spinner label="Cargando…" />
      ) : rows.length === 0 ? (
        <EmptyState>Sin pedidos con estos filtros.</EmptyState>
      ) : (
        <>
          <table className="w-full rounded-md border border-line bg-surface-0 text-sm" data-testid="history-table">
            <thead className="text-left text-ink-muted">
              <tr>
                <th className="p-3">Folio</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Trabajo</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Registrado</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="p-3">
                    <Link to={`/pedidos/${o.folio}`} className="font-semibold text-brand-accent underline">
                      {o.folio}
                    </Link>
                  </td>
                  <td className="p-3">{o.customer?.full_name ?? "—"}</td>
                  <td className="p-3 text-ink-base">{itemsSummary(o.items)}</td>
                  <td className="p-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="p-3 tabular text-ink-muted">{formatDateTime(o.created_at, timezone)}</td>
                  <td className="p-3 text-right tabular">{formatMoney(o.total_price)}</td>
                  <td className="p-3 text-right tabular font-semibold">{formatMoney(o.balance_due)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between text-sm text-ink-muted">
            <span>
              {count} pedido{count === 1 ? "" : "s"} · página {page + 1} de {pages}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
                Anterior
              </Button>
              <Button variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= pages}>
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
