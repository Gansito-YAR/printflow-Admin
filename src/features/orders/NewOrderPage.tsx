// Alta manual de pedidos (ADM-04). Sustituye al chatbot en el MVP.
//
// REGLA: el panel nunca suma. Cada cambio pide la cotización a la base
// (`quote_order`), que aplica menudeo/mayoreo y calcula total y anticipo con la
// misma lógica que usará `create_order` (y n8n en el futuro).

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { rpc } from "../../lib/rpc";
import { fetchProducts } from "../../lib/queries";
import { toAppError } from "../../lib/errors";
import type { Customer, Product, ProductCategory, Quote, QuoteItemInput } from "../../lib/types";
import { CATEGORY_LABEL, TIER_LABEL, UNIT_LABEL } from "../../lib/types";
import { useSettingsStore } from "../../store/settings";
import { formatMoney } from "../../utils/money";
import { fromDateTimeLocal, toDateTimeLocal } from "../../utils/dates";
import { Button, ErrorPanel, Spinner, TextAreaField, TextField } from "../../components/ui";
import { CustomerPicker } from "./CustomerPicker";
import { StickyActions } from "../../components/StickyActions";
import { EstimatePanel } from "./CostingSection";

interface Row {
  key: string;
  productId: string;
  quantity: string;
  width: string;
  height: string;
}

const emptyRow = (): Row => ({ key: crypto.randomUUID(), productId: "", quantity: "1", width: "", height: "" });

const POSITIVE = /^\d+(\.\d{1,2})?$/;

/** Convierte las filas en partidas solo si TODAS están completas y bien formadas. */
function toItems(rows: Row[], products: Map<string, Product>): QuoteItemInput[] | null {
  const items: QuoteItemInput[] = [];
  for (const r of rows) {
    const product = products.get(r.productId);
    if (!product || !POSITIVE.test(r.quantity) || Number(r.quantity) <= 0) return null;
    if (product.pricing_unit === "M2") {
      if (!POSITIVE.test(r.width) || !POSITIVE.test(r.height) || Number(r.width) <= 0 || Number(r.height) <= 0) return null;
      items.push({ product_id: product.id, quantity: r.quantity, width_m: r.width, height_m: r.height });
    } else {
      items.push({ product_id: product.id, quantity: r.quantity });
    }
  }
  return items.length ? items : null;
}

export function NewOrderPage() {
  const navigate = useNavigate();
  const timezone = useSettingsStore((s) => s.timezone);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [promised, setPromised] = useState("");
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    fetchProducts(true)
      .then(setProducts)
      .catch((err) => setProductsError(toAppError(err).userText));
  }, []);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const byCategory = useMemo(() => {
    const groups = new Map<ProductCategory, Product[]>();
    for (const p of products) groups.set(p.category, [...(groups.get(p.category) ?? []), p]);
    return groups;
  }, [products]);

  const items = useMemo(() => toItems(rows, productMap), [rows, productMap]);

  // Cotización en vivo, con espera de 350 ms entre cambios.
  useEffect(() => {
    if (!customer || !items) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    const timer = window.setTimeout(async () => {
      try {
        const q = await rpc.quoteOrder(customer.id, items);
        if (!cancelled) {
          setQuote(q);
          setQuoteError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(toAppError(err).userText);
        }
      } finally {
        if (!cancelled) setQuoting(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [customer, items]);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, ...patch };
        if (patch.productId !== undefined && productMap.get(patch.productId)?.pricing_unit !== "M2") {
          next.width = "";
          next.height = "";
        }
        return next;
      }),
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    setSubmitError(null);

    const promisedIso = promised ? fromDateTimeLocal(promised, timezone) : null;
    const dateErr = !promisedIso
      ? "La fecha pactada de entrega es obligatoria."
      : new Date(promisedIso).getTime() <= Date.now()
        ? "La fecha pactada debe ser futura."
        : null;
    setDateError(dateErr);
    if (!customer || !items || !quote || dateErr || !promisedIso) return;

    inFlight.current = true;
    setSubmitting(true);
    try {
      const created = await rpc.createOrder(customer.id, items, promisedIso, notes.trim());
      toast.success(`Pedido ${created.folio} creado.`);
      navigate(`/pedidos/${created.folio}`, { state: { justCreated: true } });
    } catch (err) {
      setSubmitError(toAppError(err).userText);
      toast.error("No se pudo crear el pedido.");
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const minDate = toDateTimeLocal(new Date().toISOString(), timezone);
  const canSubmit = Boolean(customer && items && quote && promised && !quoting);

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto flex max-w-5xl flex-col gap-4 md:gap-6" data-testid="new-order-form">
      <div>
        <h1 className="text-2xl font-display font-normal tracking-wide text-ink-strong">Nuevo pedido</h1>
        <p className="text-sm text-ink-muted">
          Captura de mostrador. Los precios y el anticipo los calcula el sistema con la lista oficial.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-md border border-line bg-surface-0 p-4 md:p-6">
        <h2 className="font-bold text-ink-strong">1. Cliente</h2>
        <CustomerPicker value={customer} onChange={setCustomer} disabled={submitting} />
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-line bg-surface-0 p-4 md:p-6">
        <h2 className="font-bold text-ink-strong">2. Partidas</h2>
        {productsError && <ErrorPanel message={productsError} />}
        <div className="flex flex-col gap-3">
          {rows.map((row, index) => {
            const product = productMap.get(row.productId);
            const line = quote?.items[index];
            return (
              <div
                key={row.key}
                className="grid grid-cols-6 items-end gap-2 rounded-md border border-line p-3 md:grid-cols-12 md:gap-3"
                data-testid="order-row"
              >
                <label className="order-1 col-span-5 flex flex-col gap-1 text-sm font-semibold text-ink-strong md:order-none">
                  Producto
                  <select
                    value={row.productId}
                    onChange={(e) => updateRow(row.key, { productId: e.target.value })}
                    disabled={submitting}
                    className="min-h-11 w-full rounded-md border border-line bg-surface-0 px-3 text-base font-normal md:min-h-10 md:text-sm"
                  >
                    <option value="">Seleccione…</option>
                    {[...byCategory.entries()].map(([cat, list]) => (
                      <optgroup key={cat} label={CATEGORY_LABEL[cat]}>
                        {list.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({UNIT_LABEL[p.pricing_unit]})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label className="order-3 col-span-2 flex flex-col gap-1 text-sm font-semibold text-ink-strong md:order-none">
                  Cantidad
                  <input
                    inputMode="decimal"
                    value={row.quantity}
                    onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                    disabled={submitting}
                    className="min-h-11 w-full rounded-md border border-line bg-surface-0 px-3 text-base font-normal md:min-h-10 md:text-sm"
                  />
                </label>
                {product?.pricing_unit === "M2" ? (
                  <>
                    <label className="order-3 col-span-2 flex flex-col gap-1 text-sm font-semibold text-ink-strong md:order-none">
                      Ancho (m)
                      <input
                        inputMode="decimal"
                        value={row.width}
                        onChange={(e) => updateRow(row.key, { width: e.target.value })}
                        disabled={submitting}
                        className="min-h-11 w-full rounded-md border border-line bg-surface-0 px-3 text-base font-normal md:min-h-10 md:text-sm"
                      />
                    </label>
                    <label className="order-3 col-span-2 flex flex-col gap-1 text-sm font-semibold text-ink-strong md:order-none">
                      Alto (m)
                      <input
                        inputMode="decimal"
                        value={row.height}
                        onChange={(e) => updateRow(row.key, { height: e.target.value })}
                        disabled={submitting}
                        className="min-h-11 w-full rounded-md border border-line bg-surface-0 px-3 text-base font-normal md:min-h-10 md:text-sm"
                      />
                    </label>
                  </>
                ) : (
                  <div className="order-3 col-span-4 hidden md:order-none md:block" />
                )}
                <div className="order-2 col-span-1 flex justify-end md:order-none">
                  <Button
                    variant="ghost"
                    onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== row.key) : prev))}
                    disabled={submitting || rows.length === 1}
                    aria-label="Quitar partida"
                  >
                    ×
                  </Button>
                </div>
                {line && (
                  <p className="order-4 col-span-6 text-xs text-ink-muted tabular md:order-none md:col-span-12">
                    {line.description} · {TIER_LABEL[line.applied_tier]} · {formatMoney(line.unit_price)} ×{" "}
                    {line.billable_qty} {UNIT_LABEL[line.pricing_unit]} ={" "}
                    <strong className="text-ink-strong">{formatMoney(line.line_total)}</strong>
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div>
          <Button variant="secondary" onClick={() => setRows((prev) => [...prev, emptyRow()])} disabled={submitting}>
            + Agregar partida
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 rounded-md border border-line bg-surface-0 p-4 md:grid-cols-2 md:gap-6 md:p-6">
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-ink-strong">3. Entrega</h2>
          <TextField
            label="Fecha pactada de entrega"
            type="datetime-local"
            min={minDate}
            value={promised}
            onChange={(e) => setPromised(e.target.value)}
            error={dateError}
            hint={`Hora de ${timezone}. Una vez guardada solo se cambia con motivo, en Acciones avanzadas.`}
            disabled={submitting}
            data-testid="input-promised-date"
            required
          />
          <TextAreaField
            label="Notas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            placeholder="Indicaciones de diseño, instalación, etc."
          />
        </div>

        <div className="flex flex-col gap-3 rounded-md bg-surface-1 p-4" aria-live="polite">
          <h2 className="font-bold text-ink-strong">Resumen</h2>
          {!customer ? (
            <p className="text-sm text-ink-muted">Seleccione un cliente para cotizar.</p>
          ) : !items ? (
            <p className="text-sm text-ink-muted">Complete las partidas para ver el total.</p>
          ) : quoting ? (
            <Spinner label="Calculando…" />
          ) : quoteError ? (
            <p role="alert" className="text-sm font-semibold text-blocked-ink">
              [!] {quoteError}
            </p>
          ) : quote ? (
            <div className="grid grid-cols-2 gap-2 tabular">
              <span className="text-ink-base">Total</span>
              <span className="text-right text-2xl font-bold text-ink-strong" data-testid="quote-total">
                {formatMoney(quote.total)}
              </span>
              <span className="text-ink-base">Anticipo mínimo ({Number(quote.deposit_pct)} %)</span>
              <span className="text-right font-semibold text-ink-strong">{formatMoney(quote.deposit_required)}</span>
            </div>
          ) : null}
          {customer && items && quote && !quoting && <EstimatePanel customerId={customer.id} items={items} />}
          <p className="text-xs text-ink-muted">
            El pedido nace como &quot;Pendiente de anticipo&quot;. No pasa a producción sin el anticipo mínimo o una
            autorización del administrador.
          </p>
        </div>
      </section>

      {submitError && <ErrorPanel message={submitError} />}

      <StickyActions
        summary={
          quote ? (
            <span className="tabular lg:hidden">
              Total <strong className="text-lg text-ink-strong">{formatMoney(quote.total)}</strong>
            </span>
          ) : null
        }
      >
        <Button variant="secondary" onClick={() => navigate("/")} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!canSubmit}
          loading={submitting}
          loadingLabel="Creando pedido…"
          data-testid="button-create-order"
        >
          Crear pedido
        </Button>
      </StickyActions>
    </form>
  );
}
