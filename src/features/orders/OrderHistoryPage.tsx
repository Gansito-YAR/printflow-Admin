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
import { FilterBar } from "../../components/FilterBar";
import { DataList } from "../../components/DataList";
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
      <FilterBar active={[term.trim(), status !== "ALL", from, to].filter(Boolean).length}>
        <div>
          <TextField enterKeyHint="search" autoComplete="off" autoCapitalize="characters" label="Folio" placeholder="PF-…" value={term} onChange={(e) => resetPage(setTerm)(e.target.value)} />
        </div>
        <div>
          <SelectField label="Estado" value={status} onChange={(e) => resetPage(setStatus)(e.target.value as OrderStatus | "ALL")}>
            <option value="ALL">Todos</option>
            {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </SelectField>
        </div>
        <div>
          <TextField label="Registrado desde" type="date" value={from} onChange={(e) => resetPage(setFrom)(e.target.value)} />
        </div>
        <div>
          <TextField label="Hasta" type="date" value={to} onChange={(e) => resetPage(setTo)(e.target.value)} />
        </div>
      </FilterBar>
      {error && <ErrorPanel message={error} onRetry={() => setVersion((v) => v + 1)} />}
      {loading ? (
        <Spinner label="Cargando…" />
      ) : rows.length === 0 ? (
        <EmptyState>Sin pedidos con estos filtros.</EmptyState>
      ) : (
        <>
          <DataList
            label="Pedidos"
            testId="history-table"
            rows={rows}
            rowKey={(o) => o.id}
            columns={[
              {
                key: "folio",
                header: "Folio",
                primary: true,
                render: (o) => (
                  <span className="flex flex-wrap items-center gap-2">
                    <Link to={`/pedidos/${o.folio}`} className="inline-flex min-h-11 items-center font-semibold text-brand-accent underline md:min-h-0">
                      {o.folio}
                    </Link>
                    <span className="md:hidden">
                      <StatusBadge status={o.status} />
                    </span>
                  </span>
                ),
              },
              { key: "customer", header: "Cliente", render: (o) => o.customer?.full_name ?? "—" },
              { key: "work", header: "Trabajo", hideOnTablet: true, render: (o) => <span className="text-ink-base">{itemsSummary(o.items)}</span> },
              { key: "status", header: "Estado", hideOnMobile: true, render: (o) => <StatusBadge status={o.status} /> },
              { key: "created", header: "Registrado", render: (o) => <span className="tabular text-ink-muted">{formatDateTime(o.created_at, timezone)}</span> },
              { key: "total", header: "Total", align: "right", render: (o) => <span className="tabular">{formatMoney(o.total_price)}</span> },
              { key: "balance", header: "Saldo", align: "right", render: (o) => <span className="tabular font-semibold">{formatMoney(o.balance_due)}</span> },
            ]}
          />
          <div className="flex flex-col gap-2 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
            <span>
              {count} pedido{count === 1 ? "" : "s"} · página {page + 1} de {pages}
            </span>
            <div className="grid grid-cols-2 gap-2 sm:flex">
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
