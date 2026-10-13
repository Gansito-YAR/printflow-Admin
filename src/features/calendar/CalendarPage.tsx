// Calendario de entregas (solicitud del cliente, 13/10/2026).
// Todas las entregas por su FECHA PACTADA, en la zona horaria del negocio.
//   - Vista Mes: cuadrícula lunes–domingo; cada día muestra sus pedidos con el
//     color de su estado. Al tocar un día se ve el detalle a la derecha (o abajo).
//   - Vista Lista: agenda día por día; es la vista por defecto en el celular.
// Los pedidos atrasados (fecha pasada y sin entregar) se marcan en rojo con icono.
// No incluye cancelados.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TZDate } from "@date-fns/tz";
import { addDays, addMonths, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, List, RefreshCw } from "lucide-react";
import { fetchOrdersByPromisedDate } from "../../lib/queries";
import { toAppError } from "../../lib/errors";
import { STATUS_LABEL, type OrderStatus, type OrderSummary } from "../../lib/types";
import { useSettingsStore } from "../../store/settings";
import { formatMoney, isZero } from "../../utils/money";
import { Button, ErrorPanel, SelectField, Spinner, StatusBadge } from "../../components/ui";
import { InfoTip } from "../../components/InfoTip";
import { STATUS_ICON, statusVars } from "../../components/status";
import { itemsSummary } from "../kanban/OrderCard";

type View = "month" | "list";
type Filter = "PENDING" | "ALL" | "DELIVERED";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MAX_CHIPS = 3;

/** "2026-10-13" del instante en la zona del negocio. */
function dayKey(iso: string, tz: string): string {
  return format(new TZDate(new Date(iso).getTime(), tz), "yyyy-MM-dd");
}

function isLate(o: OrderSummary): boolean {
  return o.status !== "DELIVERED" && new Date(o.promised_date).getTime() < Date.now();
}

function OrderChip({ order, tz }: { order: OrderSummary; tz: string }) {
  const v = statusVars(order.status);
  const late = isLate(order);
  const Icon = late ? AlertTriangle : STATUS_ICON[order.status];
  return (
    <Link
      to={`/pedidos/${order.folio}`}
      title={`${order.folio} · ${order.customer?.full_name ?? ""} · ${STATUS_LABEL[order.status]}${late ? " · ATRASADO" : ""}`}
      className="flex min-w-0 items-center gap-1 truncate rounded-sm border-l-[3px] px-1.5 py-0.5 text-[11px] font-semibold leading-tight hover:brightness-95"
      style={{
        backgroundColor: late ? "var(--state-blocked-bg)" : v.bg,
        color: late ? "var(--state-blocked-ink)" : v.ink,
        borderLeftColor: late ? "var(--state-blocked-border)" : v.line,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Icon size={11} aria-hidden className="shrink-0" />
      <span className="tabular shrink-0">{format(new TZDate(new Date(order.promised_date).getTime(), tz), "HH:mm")}</span>
      <span className="truncate">{order.customer?.full_name ?? order.folio}</span>
    </Link>
  );
}

function DayDetail({ dateKey, orders, tz }: { dateKey: string; orders: OrderSummary[]; tz: string }) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const title = format(new Date(y!, m! - 1, d!), "EEEE d 'de' MMMM", { locale: es });
  return (
    <section aria-label={`Entregas del ${title}`} className="flex flex-col gap-3 rounded-md border border-line bg-surface-0 p-4">
      <div>
        <h2 className="text-base font-bold capitalize text-ink-strong">{title}</h2>
        <p className="text-xs text-ink-muted">
          {orders.length === 0 ? "Sin entregas este día." : `${orders.length} entrega${orders.length === 1 ? "" : "s"}`}
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {orders.map((o) => {
          const late = isLate(o);
          return (
            <li key={o.id}>
              <Link
                to={`/pedidos/${o.folio}`}
                className={`flex flex-col gap-1 rounded-md border p-3 hover:bg-surface-2 ${late ? "border-2 border-blocked-line" : "border-line"}`}
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-ink-strong">
                    <span className="tabular">{format(new TZDate(new Date(o.promised_date).getTime(), tz), "HH:mm")}</span> ·{" "}
                    {o.customer?.full_name ?? "Cliente no disponible"}
                  </span>
                  <StatusBadge status={o.status} />
                </span>
                <span className="text-sm text-ink-base">{itemsSummary(o.items)}</span>
                <span className="flex flex-wrap items-center gap-x-3 text-xs text-ink-muted">
                  <span className="font-mono">{o.folio}</span>
                  <span className={isZero(o.balance_due) ? "text-cleared-ink" : "font-semibold text-blocked-ink"}>
                    {isZero(o.balance_due) ? "Pagado" : `Saldo ${formatMoney(o.balance_due)}`}
                  </span>
                  {late && (
                    <span className="inline-flex items-center gap-1 font-bold text-blocked-ink">
                      <AlertTriangle size={12} aria-hidden /> Atrasado
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function CalendarPage() {
  const tz = useSettingsStore((s) => s.timezone);
  const todayKey = dayKey(new Date().toISOString(), tz);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [view, setView] = useState<View>(() => (typeof window !== "undefined" && window.innerWidth < 768 ? "list" : "month"));
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [selected, setSelected] = useState<string>(todayKey);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rango visible: semanas completas que cubren el mes (lunes a domingo).
  const gridStart = useMemo(() => startOfWeek(month, { weekStartsOn: 1 }), [month]);
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Un día de margen en cada extremo cubre la diferencia de zona horaria.
      const from = addDays(gridStart, -1).toISOString();
      const to = addDays(gridStart, 43).toISOString();
      setOrders(await fetchOrdersByPromisedDate(from, to));
      setError(null);
    } catch (err) {
      setError(toAppError(err).userText);
    } finally {
      setLoading(false);
    }
  }, [gridStart]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () =>
      orders.filter((o) => (filter === "ALL" ? true : filter === "DELIVERED" ? o.status === "DELIVERED" : o.status !== "DELIVERED")),
    [orders, filter],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, OrderSummary[]>();
    for (const o of visible) {
      const k = dayKey(o.promised_date, tz);
      map.set(k, [...(map.get(k) ?? []), o]);
    }
    return map;
  }, [visible, tz]);

  const monthOrders = visible.filter((o) => dayKey(o.promised_date, tz).startsWith(format(month, "yyyy-MM")));
  const lateCount = monthOrders.filter(isLate).length;
  const listDays = [...byDay.keys()].filter((k) => k.startsWith(format(month, "yyyy-MM"))).sort();

  function goMonth(delta: number) {
    const next = addMonths(month, delta);
    setMonth(next);
    setSelected(format(next, "yyyy-MM") === todayKey.slice(0, 7) ? todayKey : format(next, "yyyy-MM-01"));
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-display font-normal tracking-wide text-ink-strong">Calendario de entregas</h1>
        <p className="text-sm text-ink-muted">Todos los pedidos por su fecha pactada de entrega. Toque un día o un pedido para ver más.</p>
      </div>

      {/* Barra: mes, navegación, vista y filtro */}
      <div className="flex flex-col gap-3 rounded-md border border-line bg-surface-0 p-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => goMonth(-1)} aria-label="Mes anterior" title="Mes anterior">
            <ChevronLeft size={18} aria-hidden />
          </Button>
          <h2 className="min-w-44 text-center text-lg font-bold capitalize text-ink-strong" aria-live="polite">
            {format(month, "MMMM yyyy", { locale: es })}
          </h2>
          <Button variant="secondary" onClick={() => goMonth(1)} aria-label="Mes siguiente" title="Mes siguiente">
            <ChevronRight size={18} aria-hidden />
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setMonth(startOfMonth(new Date()));
              setSelected(todayKey);
            }}
            title="Volver al mes actual"
          >
            Hoy
          </Button>
          <Button variant="ghost" onClick={() => void load()} aria-label="Actualizar" title="Actualizar">
            <RefreshCw size={16} aria-hidden />
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div role="tablist" aria-label="Vista" className="flex gap-1 rounded-md border border-line p-1">
            {(
              [
                ["month", "Mes", CalendarDays],
                ["list", "Lista", List],
              ] as const
            ).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded px-3 text-sm font-semibold ${
                  view === v ? "bg-primary text-primary-ink" : "text-ink-strong hover:bg-surface-2"
                }`}
              >
                <Icon size={15} aria-hidden /> {label}
              </button>
            ))}
          </div>
          <div className="w-52">
            <SelectField label="Mostrar" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}
              help="Por entregar: lo que falta entregar. Entregados: lo ya entregado. Todos: ambos.">
              <option value="PENDING">Por entregar</option>
              <option value="DELIVERED">Entregados</option>
              <option value="ALL">Todos</option>
            </SelectField>
          </div>
        </div>
      </div>

      {/* Resumen del mes + leyenda */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="text-ink-base">
          <strong className="tabular text-ink-strong">{monthOrders.length}</strong> entrega{monthOrders.length === 1 ? "" : "s"} este mes
        </span>
        {lateCount > 0 && (
          <span className="inline-flex items-center gap-1 font-semibold text-blocked-ink">
            <AlertTriangle size={14} aria-hidden /> {lateCount} atrasada{lateCount === 1 ? "" : "s"}
          </span>
        )}
        <span className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
          {(["PENDING_DEPOSIT", "IN_PRODUCTION", "READY_FOR_DELIVERY", "DELIVERED"] as OrderStatus[]).map((st) => (
            <span key={st} className="inline-flex items-center gap-1">
              <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: statusVars(st).line }} />
              {STATUS_LABEL[st]}
            </span>
          ))}
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "var(--state-blocked-border)" }} />
            Atrasado
          </span>
          <InfoTip text="Cada color es el estado del pedido. En rojo con ⚠ los que ya pasaron su fecha y no se han entregado." />
        </span>
      </div>

      {error && <ErrorPanel message={error} onRetry={() => void load()} />}
      {loading && orders.length === 0 ? (
        <Spinner label="Cargando calendario…" />
      ) : view === "month" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-x-auto rounded-md border border-line bg-surface-0" data-testid="calendar-month">
            <div className="grid min-w-[700px] grid-cols-7">
              {WEEKDAYS.map((w) => (
                <div key={w} className="border-b border-line bg-surface-2 px-2 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-ink-muted">
                  {w}
                </div>
              ))}
              {days.map((d) => {
                const k = format(d, "yyyy-MM-dd");
                const list = byDay.get(k) ?? [];
                const inMonth = isSameMonth(d, month);
                const isToday = k === todayKey;
                const isSel = k === selected;
                const anyLate = list.some(isLate);
                return (
                  <div
                    key={k}
                    role="button"
                    tabIndex={0}
                    aria-label={`${format(d, "d 'de' MMMM", { locale: es })}: ${list.length} entrega${list.length === 1 ? "" : "s"}`}
                    aria-pressed={isSel}
                    onClick={() => setSelected(k)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(k);
                      }
                    }}
                    className={`flex min-h-28 cursor-pointer flex-col gap-1 border-b border-r border-line p-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-bg)] ${
                      inMonth ? "bg-surface-0" : "bg-surface-1 opacity-60"
                    } ${isSel ? "ring-2 ring-inset ring-[var(--brand-bg)]" : ""}`}
                  >
                    <span className="flex items-center justify-between">
                      <span
                        className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold tabular ${
                          isToday ? "bg-primary text-primary-ink" : "text-ink-strong"
                        }`}
                      >
                        {format(d, "d")}
                      </span>
                      {list.length > 0 && (
                        <span className={`text-[10px] font-bold ${anyLate ? "text-blocked-ink" : "text-ink-muted"}`}>
                          {list.length}
                        </span>
                      )}
                    </span>
                    {list.slice(0, MAX_CHIPS).map((o) => (
                      <OrderChip key={o.id} order={o} tz={tz} />
                    ))}
                    {list.length > MAX_CHIPS && (
                      <span className="text-[11px] font-semibold text-brand-accent">+{list.length - MAX_CHIPS} más</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <DayDetail dateKey={selected} orders={byDay.get(selected) ?? []} tz={tz} />
        </div>
      ) : listDays.length === 0 ? (
        <p className="rounded-md border-2 border-dashed border-line bg-surface-0 p-6 text-center text-sm text-ink-muted">
          Sin entregas en {format(month, "MMMM", { locale: es })} con este filtro.
        </p>
      ) : (
        <div className="flex flex-col gap-3" data-testid="calendar-list">
          {listDays.map((k) => (
            <DayDetail key={k} dateKey={k} orders={byDay.get(k) ?? []} tz={tz} />
          ))}
        </div>
      )}
    </div>
  );
}
