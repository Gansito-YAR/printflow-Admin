// Centro de notificaciones (Plan Correcciones v2, C6).
// Tres tipos, del más urgente al menos:
//   1. Faltante en producción: el pedido ya consumió insumo que no había.
//      Persiste hasta que un reabasto devuelve el stock a >= 0.
//   2. Faltante previsto: los pedidos pendientes de anticipo van a exceder el stock.
//   3. Stock bajo: insumos en o por debajo de su mínimo.
// "Marcar como vista" solo quita la alerta del contador; no la resuelve.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Eye, PackageMinus, TrendingDown, type LucideIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useNotificationsStore } from "../../store/notifications";
import { useSettingsStore } from "../../store/settings";
import { MATERIAL_UNIT_LABEL, STATUS_LABEL } from "../../lib/types";
import { formatQty } from "../../utils/quantity";
import { formatDateTime } from "../../utils/dates";
import { toAppError } from "../../lib/errors";
import { Button, EmptyState, ErrorPanel, Spinner } from "../../components/ui";

type Tab = "active" | "resolved";

function Section({
  icon: Icon,
  title,
  description,
  tone,
  count,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone: "blocked" | "warning" | "neutral";
  count: number;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "blocked" ? "text-blocked-ink" : tone === "warning" ? "text-warning-ink" : "text-ink-strong";
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <div>
        <h2 className={`flex items-center gap-2 text-base font-bold ${toneClass}`}>
          <Icon size={18} aria-hidden />
          {title} <span className="tabular text-ink-muted">({count})</span>
        </h2>
        <p className="text-sm text-ink-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function NotificationsPage() {
  const { data, loaded, error, refresh, acknowledge } = useNotificationsStore();
  const timezone = useSettingsStore((s) => s.timezone);
  const [tab, setTab] = useState<Tab>("active");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const open = data.shortages.filter((s) => !s.resolved_at);
  const resolved = data.shortages.filter((s) => s.resolved_at);

  async function onAcknowledge(id: string) {
    setBusy(id);
    try {
      await acknowledge(id);
    } catch (err) {
      toast.error(toAppError(err).userText);
    } finally {
      setBusy(null);
    }
  }

  const unit = (u: keyof typeof MATERIAL_UNIT_LABEL) => MATERIAL_UNIT_LABEL[u] ?? u;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-display font-normal tracking-wide text-ink-strong">Notificaciones</h1>
        <p className="text-sm text-ink-muted">Insumos insuficientes y stock bajo. Se actualiza solo.</p>
      </div>

      <div role="tablist" aria-label="Notificaciones" className="flex gap-2">
        {(["active", "resolved"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-10 rounded-full border-2 px-4 text-sm font-semibold ${
              tab === t ? "border-primary bg-primary text-primary-ink" : "border-line bg-surface-0 text-ink-strong"
            }`}
          >
            {t === "active" ? "Activas" : "Resueltas (30 días)"}
          </button>
        ))}
      </div>

      {error && <ErrorPanel message="No se pudieron cargar las notificaciones." onRetry={() => void refresh()} />}
      {!loaded ? (
        <Spinner label="Cargando…" />
      ) : tab === "resolved" ? (
        resolved.length === 0 ? (
          <EmptyState>Sin faltantes resueltos en los últimos 30 días.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="resolved-list">
            {resolved.map((s) => (
              <li key={s.id} className="flex flex-col gap-1 rounded-md border border-line bg-surface-0 p-3 text-sm">
                <span className="inline-flex items-center gap-1.5 font-semibold text-cleared-ink">
                  <CheckCircle2 size={16} aria-hidden /> Resuelto · {s.material}
                </span>
                <span className="text-ink-base">
                  Pedido{" "}
                  <Link to={`/pedidos/${s.folio}`} className="font-semibold text-brand-accent underline">
                    {s.folio}
                  </Link>{" "}
                  · faltaron {formatQty(s.shortage)} {unit(s.unit)} · resuelto {formatDateTime(s.resolved_at, timezone)}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : open.length + data.forecast.length + data.low_stock.length === 0 ? (
        <EmptyState>
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 size={18} aria-hidden /> Todo en orden: no hay faltantes ni insumos bajo el mínimo.
          </span>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {open.length > 0 && (
            <Section
              icon={AlertTriangle}
              title="Faltante en producción"
              description="Estos pedidos pasaron a producción sin insumo suficiente. El aviso se quita solo al reabastecer."
              tone="blocked"
              count={open.length}
            >
              <ul className="flex flex-col gap-2" data-testid="shortage-list">
                {open.map((s) => (
                  <li
                    key={s.id}
                    className={`flex flex-col gap-3 rounded-md border-2 bg-surface-0 p-4 sm:flex-row sm:items-center ${
                      s.acknowledged ? "border-line" : "border-blocked-line"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                      <span className="font-semibold text-ink-strong">
                        <Link to={`/pedidos/${s.folio}`} className="text-brand-accent underline">
                          {s.folio}
                        </Link>{" "}
                        · {s.customer} <span className="text-ink-muted">({STATUS_LABEL[s.order_status]})</span>
                      </span>
                      <span className="text-blocked-ink">
                        {s.material}: faltaron <strong className="tabular">{formatQty(s.shortage)} {unit(s.unit)}</strong>
                      </span>
                      <span className="text-xs text-ink-muted">
                        Stock actual: <span className="tabular">{formatQty(s.current_stock)} {unit(s.unit)}</span> ·{" "}
                        {formatDateTime(s.created_at, timezone)}
                        {s.acknowledged && " · vista"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Link
                        to="/insumos"
                        className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-ink"
                      >
                        Reabastecer
                      </Link>
                      {!s.acknowledged && (
                        <Button variant="secondary" loading={busy === s.id} onClick={() => void onAcknowledge(s.id)}>
                          <span className="inline-flex items-center gap-1.5">
                            <Eye size={16} aria-hidden /> Marcar como vista
                          </span>
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {data.forecast.length > 0 && (
            <Section
              icon={TrendingDown}
              title="Faltante previsto"
              description="Sumando los pedidos pendientes de anticipo, estos insumos no alcanzan. Conviene comprar antes de pasarlos a producción."
              tone="warning"
              count={data.forecast.length}
            >
              <ul className="flex flex-col gap-2" data-testid="forecast-list">
                {data.forecast.map((f) => (
                  <li key={f.material_id} className="flex flex-col gap-1 rounded-md border border-warning-line bg-surface-0 p-4 text-sm">
                    <span className="font-semibold text-ink-strong">{f.material}</span>
                    <span className="text-warning-ink">
                      Se necesitan <strong className="tabular">{formatQty(f.required)}</strong>, hay{" "}
                      <strong className="tabular">{formatQty(f.available)}</strong> → faltan{" "}
                      <strong className="tabular">
                        {formatQty(f.shortage)} {unit(f.unit)}
                      </strong>
                    </span>
                    <span className="text-xs text-ink-muted">
                      Pedidos:{" "}
                      {f.orders.map((o, i) => (
                        <span key={o.order_id}>
                          {i > 0 && ", "}
                          <Link to={`/pedidos/${o.folio}`} className="font-semibold text-brand-accent underline">
                            {o.folio}
                          </Link>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {data.low_stock.length > 0 && (
            <Section
              icon={PackageMinus}
              title="Stock bajo"
              description="Insumos en o por debajo de su stock mínimo."
              tone="neutral"
              count={data.low_stock.length}
            >
              <ul className="flex flex-col gap-2" data-testid="low-stock-list">
                {data.low_stock.map((m) => (
                  <li key={m.material_id} className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface-0 p-3 text-sm">
                    <span className="font-semibold text-ink-strong">{m.material}</span>
                    <span className="tabular text-ink-base">
                      {formatQty(m.current_stock)} / mín. {formatQty(m.min_stock)} {unit(m.unit)}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
