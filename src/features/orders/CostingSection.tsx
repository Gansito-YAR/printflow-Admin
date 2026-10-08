// Costos y utilidad del pedido (M4-ADM-07). Plegado por defecto: el panel
// puede estar a la vista del cliente en mostrador (M4-D-12).
//   U = P_venta − (C_p + C_extra)   — BRD §6. Lo calcula la base.

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { rpc } from "../../lib/rpc";
import { toAppError } from "../../lib/errors";
import type { OrderCosting, QuoteItemInput } from "../../lib/types";
import { formatMoney, parseAmountInput } from "../../utils/money";
import { formatPct, formatQty, isNegative } from "../../utils/quantity";
import { formatDateTime } from "../../utils/dates";
import { Button, ErrorPanel, Modal, Spinner, TextField } from "../../components/ui";

export function ProfitSummary({ costing }: { costing: OrderCosting }) {
  return (
    <div className="grid grid-cols-2 gap-1 text-sm tabular" data-testid="profit-summary">
      <span>Venta</span>
      <span className="text-right">{formatMoney(costing.sales)}</span>
      <span>Costo de producción</span>
      <span className="text-right">− {formatMoney(costing.production_cost)}</span>
      <span>Gastos extra</span>
      <span className="text-right">− {formatMoney(costing.extra_cost)}</span>
      <span className="border-t border-line pt-1 font-bold text-ink-strong">Utilidad neta</span>
      <span
        className={`border-t border-line pt-1 text-right font-bold ${isNegative(costing.profit) ? "text-blocked-ink" : "text-ink-strong"}`}
        data-testid="profit-value"
      >
        {formatMoney(costing.profit)}
      </span>
      <span className="text-ink-muted">Margen</span>
      <span className="text-right text-ink-muted">{formatPct(costing.margin_pct)}</span>
      {costing.incomplete_cost && (
        <p className="col-span-2 mt-1 text-xs font-semibold text-warning-ink">
          [!] Costo incompleto: hay productos sin receta. La utilidad real es menor.
        </p>
      )}
    </div>
  );
}

export function CostingSection({ orderId, timezone }: { orderId: string; timezone: string }) {
  const [open, setOpen] = useState(false);
  const [costing, setCosting] = useState<OrderCosting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [voiding, setVoiding] = useState<{ id: string; concept: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setCosting(await rpc.getOrderCosting(orderId));
      setError(null);
    } catch (err) {
      setError(toAppError(err).userText);
    }
  }, [orderId]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) void load();
  }

  return (
    <section className="rounded-md border border-line bg-surface-0 p-6" aria-label="Costos y utilidad">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink-strong">Costos y utilidad</h2>
        <Button variant="secondary" onClick={toggle} aria-expanded={open} data-testid="toggle-costing">
          {open ? "Ocultar" : "Mostrar (confidencial)"}
        </Button>
      </div>
      {open && (
        <div className="mt-4 flex flex-col gap-4">
          {error ? (
            <ErrorPanel message={error} onRetry={() => void load()} />
          ) : !costing ? (
            <Spinner label="Calculando…" />
          ) : (
            <>
              <p className="text-xs text-ink-muted">
                {costing.is_estimate
                  ? "ESTIMADO con los costos vigentes. Se congela al iniciar producción."
                  : `CONGELADO el ${formatDateTime(costing.frozen_at, timezone)}. Cambios de precio de insumos ya no lo afectan.`}
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-3">
                  {costing.lines.map((l) => (
                    <div key={l.line_no} className="rounded-md border border-line p-3 text-sm tabular">
                      <p className="font-semibold text-ink-strong">{l.description}</p>
                      {l.materials.map((m) => (
                        <p key={m.raw_material_id} className="flex justify-between text-xs text-ink-base">
                          <span>
                            {m.name}: {formatQty(m.consumed_qty)} × ${m.unit_cost}
                          </span>
                          <span>{formatMoney(m.material_cost)}</span>
                        </p>
                      ))}
                      {!l.has_recipe && <p className="text-xs font-semibold text-warning-ink">Sin receta</p>}
                      <p className="flex justify-between text-xs text-ink-base">
                        <span>Costo fijo</span>
                        <span>{formatMoney(l.fixed_cost)}</span>
                      </p>
                      <p className="mt-1 flex justify-between border-t border-line pt-1 text-xs font-semibold">
                        <span>Costo de producción · venta {formatMoney(l.sale)}</span>
                        <span>{formatMoney(l.production_cost)}</span>
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-4">
                  <ProfitSummary costing={costing} />
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-ink-strong">Gastos extra</h3>
                      <Button variant="secondary" onClick={() => setAdding(true)}>
                        + Gasto extra
                      </Button>
                    </div>
                    {(costing.extras ?? []).length === 0 ? (
                      <p className="text-xs text-ink-muted">Viáticos de instalación, diseño, material extraordinario…</p>
                    ) : (
                      <ul className="flex flex-col gap-1 text-sm tabular">
                        {costing.extras!.map((e) => (
                          <li key={e.id} className={`flex items-start justify-between gap-2 border-b border-line pb-1 ${e.voided ? "text-ink-muted line-through" : ""}`}>
                            <span>
                              {e.concept}
                              <span className="block text-xs no-underline">
                                {formatDateTime(e.created_at, timezone)} · {e.created_by ?? ""}
                                {e.voided && ` · Anulado: ${e.void_reason}`}
                              </span>
                            </span>
                            <span className="flex items-center gap-2">
                              {formatMoney(e.amount)}
                              {!e.voided && (
                                <Button variant="ghost" onClick={() => setVoiding({ id: e.id, concept: e.concept })}>
                                  Anular
                                </Button>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {adding && (
        <ExtraCostModal
          orderId={orderId}
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            void load();
          }}
        />
      )}
      {voiding && (
        <VoidModal
          extra={voiding}
          onClose={() => setVoiding(null)}
          onDone={() => {
            setVoiding(null);
            void load();
          }}
        />
      )}
    </section>
  );
}

function ExtraCostModal({ orderId, onClose, onDone }: { orderId: string; onClose: () => void; onDone: () => void }) {
  const key = useRef(crypto.randomUUID());
  const inFlight = useRef(false);
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    if (!concept.trim()) return setError("Escriba el concepto.");
    const a = parseAmountInput(amount);
    if (!a.ok) return setError(a.error);
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      const r = await rpc.addExtraCost(orderId, concept.trim(), a.value, key.current);
      toast.success(r.duplicate ? "El gasto ya estaba registrado." : "Gasto registrado.");
      onDone();
    } catch (err) {
      setError(toAppError(err).userText);
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <Modal title="Gasto extra del pedido" onClose={onClose} locked={saving}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" data-testid="extra-cost-form">
        <TextField label="Concepto" value={concept} onChange={(e) => setConcept(e.target.value)} maxLength={120} disabled={saving} required />
        <TextField label="Monto" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={saving} required />
        {error && (
          <p role="alert" className="text-sm font-semibold text-blocked-ink">
            [!] {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Registrar gasto
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function VoidModal({ extra, onClose, onDone }: { extra: { id: string; concept: string }; onClose: () => void; onDone: () => void }) {
  const inFlight = useRef(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    if (reason.trim().length < 3) return setError("Escriba el motivo.");
    inFlight.current = true;
    setSaving(true);
    try {
      await rpc.voidExtraCost(extra.id, reason.trim());
      toast.success("Gasto anulado.");
      onDone();
    } catch (err) {
      setError(toAppError(err).userText);
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <Modal title={`Anular gasto · ${extra.concept}`} onClose={onClose} locked={saving}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} disabled={saving} required />
        {error && (
          <p role="alert" className="text-sm font-semibold text-blocked-ink">
            [!] {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Volver
          </Button>
          <Button type="submit" variant="danger" loading={saving}>
            Anular
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Utilidad estimada de una cotización (M4-ADM-06). Solo se consulta al abrirla. */
export function EstimatePanel({ customerId, items }: { customerId: string; items: QuoteItemInput[] }) {
  const [open, setOpen] = useState(false);
  const [costing, setCosting] = useState<OrderCosting | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCosting(null);
    setError(null);
    rpc
      .estimateCosting(customerId, items)
      .then((c) => !cancelled && setCosting(c))
      .catch((err) => !cancelled && setError(toAppError(err).userText));
    return () => {
      cancelled = true;
    };
  }, [open, customerId, items]);

  return (
    <div className="rounded-md border border-line p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-sm font-semibold text-brand-accent underline"
        data-testid="toggle-estimate"
      >
        {open ? "Ocultar utilidad estimada" : "Ver utilidad estimada (confidencial)"}
      </button>
      {open && (
        <div className="mt-2">
          {error ? (
            <p className="text-sm font-semibold text-blocked-ink">[!] {error}</p>
          ) : !costing ? (
            <Spinner label="Calculando…" />
          ) : (
            <ProfitSummary costing={costing} />
          )}
        </div>
      )}
    </div>
  );
}
