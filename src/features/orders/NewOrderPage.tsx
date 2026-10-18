// Alta manual de pedidos (ADM-04). Sustituye al chatbot en el MVP.
//
// REGLA: el panel nunca suma. Cada cambio pide la cotización a la base
// (`quote_order`), que aplica menudeo/mayoreo y calcula total y anticipo con la
// misma lógica que usará `create_order` (y n8n en el futuro).

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { rpc } from "../../lib/rpc";
import { fetchProductMaterialOptions, fetchProducts } from "../../lib/queries";
import { groupByCategory } from "../../utils/categories";
import { toAppError } from "../../lib/errors";
import type { CutPlanLine, Customer, Product, ProductMaterialOption, Quote, QuoteItemInput } from "../../lib/types";
import { TIER_LABEL, UNIT_LABEL, productUnitLabel } from "../../lib/types";
import { useSettingsStore } from "../../store/settings";
import { formatMoney } from "../../utils/money";
import { fromDateTimeLocal, toDateTimeLocal } from "../../utils/dates";
import { Button, ErrorPanel, Spinner, TextAreaField, TextField } from "../../components/ui";
import { CustomerPicker } from "./CustomerPicker";
import { StickyActions } from "../../components/StickyActions";
import { EstimatePanel } from "./CostingSection";
import { MaterialsNotice } from "./MaterialsNotice";
import { CutPending, CutPreview } from "./CutPreview";

/** Deja solo el número: "10cm" → "10", "10,5 cm" → "10.5". El "cm" va fijo en el campo. */
function onlyNumber(raw: string): string {
  const s = raw.replace(",", ".").replace(/[^0-9.]/g, "");
  const [int = "", ...dec] = s.split(".");
  return dec.length ? `${int}.${dec.join("").slice(0, 2)}` : int;
}

interface Row {
  key: string;
  productId: string;
  quantity: string;
  width: string;
  height: string;
  /** Insumos opcionales elegidos por el cliente (si el producto los tiene). */
  materialIds: string[];
  /** Calculadora de corte: base, altura, separación y orilla (cm). */
  cutW: string;
  cutH: string;
  cutGap: string;
  cutMargin: string;
}

const emptyRow = (): Row => ({
  key: crypto.randomUUID(), productId: "", quantity: "1", width: "", height: "", materialIds: [],
  cutW: "", cutH: "", cutGap: "0", cutMargin: "0",
});
const INTEGER = /^\d+$/;
const NON_NEGATIVE = /^\d+(\.\d{1,2})?$/;

/** ¿La partida usa algún insumo cortable (obligatorio o elegido)? Solo en productos que no son por m². */
function usesCut(row: Row, product: Product | undefined, options: Map<string, ProductMaterialOption[]>): boolean {
  if (!product || product.pricing_unit === "M2") return false;
  return (options.get(product.id) ?? []).some(
    (o) => o.cuttable && (o.priority === "REQUIRED" || row.materialIds.includes(o.raw_material_id)),
  );
}

/** Campos de corte de la fila, si están completos y bien escritos. */
function cutFields(row: Row): Pick<QuoteItemInput, "cut_width_cm" | "cut_height_cm" | "cut_gap_cm" | "cut_margin_cm"> | null {
  const gap = row.cutGap.trim() || "0";
  const margin = row.cutMargin.trim() || "0";
  if (!POSITIVE.test(row.cutW) || !POSITIVE.test(row.cutH) || Number(row.cutW) <= 0 || Number(row.cutH) <= 0) return null;
  if (!NON_NEGATIVE.test(gap) || !NON_NEGATIVE.test(margin)) return null;
  return { cut_width_cm: row.cutW, cut_height_cm: row.cutH, cut_gap_cm: gap, cut_margin_cm: margin };
}

const POSITIVE = /^\d+(\.\d{1,2})?$/;

/** Convierte las filas en partidas solo si TODAS están completas y bien formadas. */
function toItems(
  rows: Row[],
  products: Map<string, Product>,
  optionals: Map<string, ProductMaterialOption[]>,
  allOptions: Map<string, ProductMaterialOption[]>,
): QuoteItemInput[] | null {
  const items: QuoteItemInput[] = [];
  for (const r of rows) {
    const product = products.get(r.productId);
    if (!product || !POSITIVE.test(r.quantity) || Number(r.quantity) <= 0) return null;
    // Con materiales a elegir, la partida no está completa hasta elegir al menos uno.
    const hasOptionals = (optionals.get(product.id)?.length ?? 0) > 0;
    if (hasOptionals && r.materialIds.length === 0) return null;
    const mats = hasOptionals ? { material_ids: r.materialIds } : {};
    if (product.pricing_unit === "M2") {
      if (!POSITIVE.test(r.width) || !POSITIVE.test(r.height) || Number(r.width) <= 0 || Number(r.height) <= 0) return null;
      items.push({ product_id: product.id, quantity: r.quantity, width_m: r.width, height_m: r.height, ...mats });
    } else if (usesCut(r, product, allOptions)) {
      // Corte: piezas enteras y medidas completas.
      const cut = cutFields(r);
      if (!INTEGER.test(r.quantity) || !cut) return null;
      items.push({ product_id: product.id, quantity: r.quantity, ...mats, ...cut });
    } else {
      items.push({ product_id: product.id, quantity: r.quantity, ...mats });
    }
  }
  return items.length ? items : null;
}

export function NewOrderPage() {
  const navigate = useNavigate();
  const timezone = useSettingsStore((s) => s.timezone);

  const [products, setProducts] = useState<Product[]>([]);
  const [materialOptions, setMaterialOptions] = useState<ProductMaterialOption[]>([]);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const leadDays = useSettingsStore((s) => s.default_lead_days);
  // Fecha sugerida: hoy + días configurados, a la misma hora (siempre editable).
  const [promised, setPromised] = useState(() =>
    toDateTimeLocal(new Date(Date.now() + leadDays * 24 * 60 * 60 * 1000).toISOString(), timezone),
  );
  // La configuración puede llegar después del primer render (recarga de página):
  // mientras la persona no haya tocado la fecha, se ajusta a los días configurados.
  const promisedTouched = useRef(false);
  useEffect(() => {
    if (promisedTouched.current) return;
    setPromised(toDateTimeLocal(new Date(Date.now() + leadDays * 24 * 60 * 60 * 1000).toISOString(), timezone));
  }, [leadDays, timezone]);
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    Promise.all([fetchProducts(true), fetchProductMaterialOptions()])
      .then(([prods, opts]) => {
        setProducts(prods);
        setMaterialOptions(opts);
      })
      .catch((err) => setProductsError(toAppError(err).userText));
  }, []);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const byCategory = useMemo(() => groupByCategory(products), [products]);

  // Por producto: insumos opcionales (se eligen) y obligatorios (van siempre).
  const optionalsByProduct = useMemo(() => {
    const m = new Map<string, ProductMaterialOption[]>();
    for (const o of materialOptions) if (o.priority === "OPTIONAL") m.set(o.product_id, [...(m.get(o.product_id) ?? []), o]);
    return m;
  }, [materialOptions]);
  const requiredByProduct = useMemo(() => {
    const m = new Map<string, ProductMaterialOption[]>();
    for (const o of materialOptions) if (o.priority === "REQUIRED") m.set(o.product_id, [...(m.get(o.product_id) ?? []), o]);
    return m;
  }, [materialOptions]);

  const optionsByProduct = useMemo(() => {
    const m = new Map<string, ProductMaterialOption[]>();
    for (const o of materialOptions) m.set(o.product_id, [...(m.get(o.product_id) ?? []), o]);
    return m;
  }, [materialOptions]);

  const items = useMemo(
    () => toItems(rows, productMap, optionalsByProduct, optionsByProduct),
    [rows, productMap, optionalsByProduct, optionsByProduct],
  );

  // Calculadora de corte en vivo, por fila (no espera a que todo el pedido esté completo).
  const cutInputs = useMemo(
    () =>
      rows.map((r) => {
        const p = productMap.get(r.productId);
        const cut = usesCut(r, p, optionsByProduct) ? cutFields(r) : null;
        if (!p || !cut || !INTEGER.test(r.quantity) || Number(r.quantity) <= 0) return null;
        return { product_id: p.id, quantity: r.quantity, material_ids: r.materialIds, ...cut } as QuoteItemInput;
      }),
    [rows, productMap, optionsByProduct],
  );
  const cutKey = JSON.stringify(cutInputs);
  const [cutPlans, setCutPlans] = useState<(CutPlanLine | null)[]>([]);
  useEffect(() => {
    const valid = cutInputs.map((c, i) => (c ? { c, i } : null)).filter(Boolean) as { c: QuoteItemInput; i: number }[];
    if (valid.length === 0) {
      setCutPlans([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const res = await rpc.planCuts(valid.map((v) => v.c));
        if (cancelled) return;
        const byRow: (CutPlanLine | null)[] = cutInputs.map(() => null);
        valid.forEach((v, k) => (byRow[v.i] = res[k] ?? null));
        setCutPlans(byRow);
      } catch {
        if (!cancelled) setCutPlans([]);
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cutKey]);

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
        // Otro producto = otros materiales posibles.
        if (patch.productId !== undefined && patch.productId !== r.productId) next.materialIds = [];
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
                    {byCategory.map(({ name: cat, products: list }) => (
                      <optgroup key={cat} label={cat}>
                        {list.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({productUnitLabel(p)})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                {product && product.pricing_unit !== "M2" ? (
                  <label className="order-3 col-span-2 flex flex-col gap-1 text-sm font-semibold text-ink-strong md:order-none">
                    {usesCut(row, product, optionsByProduct) ? "Cantidad (piezas)" : product.pricing_unit === "PACKAGE" ? "Paquetes" : "Cantidad"}
                    <input
                      inputMode="numeric"
                      value={row.quantity}
                      onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                      disabled={submitting}
                      className="min-h-11 w-full rounded-md border border-line bg-surface-0 px-3 text-base font-normal md:min-h-10 md:text-sm"
                      data-testid="row-quantity"
                    />
                  </label>
                ) : (
                  <div className="hidden md:col-span-2 md:block" />
                )}
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
                {product && (optionalsByProduct.get(product.id)?.length ?? 0) > 0 && (
                  <fieldset className="order-4 col-span-6 flex flex-col gap-1.5 md:order-none md:col-span-12" data-testid="material-choice">
                    <legend className="text-sm font-semibold text-ink-strong">
                      Material <span aria-hidden className="text-brand-accent">*</span>
                      <span className="ml-2 text-xs font-normal text-ink-muted">Elija uno o varios, según lo que pida el cliente.</span>
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {optionalsByProduct.get(product.id)!.map((o) => {
                        const on = row.materialIds.includes(o.raw_material_id);
                        return (
                          <button
                            key={o.raw_material_id}
                            type="button"
                            aria-pressed={on}
                            disabled={submitting}
                            onClick={() =>
                              updateRow(row.key, {
                                materialIds: on
                                  ? row.materialIds.filter((id) => id !== o.raw_material_id)
                                  : [...row.materialIds, o.raw_material_id],
                              })
                            }
                            className={`min-h-11 rounded-full border-2 px-4 text-sm font-semibold md:min-h-9 ${
                              on ? "border-primary bg-primary text-primary-ink" : "border-line bg-surface-0 text-ink-strong hover:border-line-strong"
                            }`}
                          >
                            {on && "✓ "}
                            {o.name}
                          </button>
                        );
                      })}
                    </div>
                    {row.materialIds.length === 0 && <p className="text-xs text-warning-ink">Falta elegir el material.</p>}
                    {(requiredByProduct.get(product.id)?.length ?? 0) > 0 && (
                      <p className="text-xs text-ink-muted">Incluye siempre: {requiredByProduct.get(product.id)!.map((o) => o.name).join(", ")}.</p>
                    )}
                  </fieldset>
                )}
                {usesCut(row, product, optionsByProduct) && (
                  <fieldset className="order-4 col-span-6 grid grid-cols-2 gap-2 md:order-none md:col-span-12 md:grid-cols-4 md:gap-3" data-testid="cut-fields">
                    <legend className="mb-1 text-sm font-semibold text-ink-strong">
                      Medida de la pieza a imprimir
                      <span className="ml-2 text-xs font-normal text-ink-muted">El sistema calcula los pliegos y la merma.</span>
                    </legend>
                    {(
                      [
                        ["cutW", "Base (cm)", true],
                        ["cutH", "Altura (cm)", true],
                        ["cutGap", "Separación entre cortes (cm)", false],
                        ["cutMargin", "Orilla del pliego (cm)", false],
                      ] as const
                    ).map(([field, label, required]) => (
                      <label key={field} className="flex flex-col gap-1 text-sm font-semibold text-ink-strong">
                        <span>
                          {label.replace(" (cm)", "")}
                          {required && <span aria-hidden className="text-brand-accent"> *</span>}
                        </span>
                        <span className="relative">
                          <input
                            inputMode="decimal"
                            value={row[field]}
                            onChange={(e) => updateRow(row.key, { [field]: onlyNumber(e.target.value) } as Partial<Row>)}
                            disabled={submitting}
                            required={required}
                            placeholder={required ? "Ej. 33.02" : "0"}
                            className="min-h-11 w-full rounded-md border border-line bg-surface-0 py-2 pl-3 pr-11 text-base font-normal tabular md:min-h-10 md:text-sm"
                            data-testid={`row-${field}`}
                          />
                          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-normal text-ink-muted">
                            cm
                          </span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                )}
                {usesCut(row, product, optionsByProduct) &&
                  (cutInputs[index] && cutPlans[index] ? (
                    <CutPreview materials={cutPlans[index]!.materials} />
                  ) : (
                    <CutPending
                      materials={(optionsByProduct.get(product!.id) ?? []).filter(
                        (o) => o.cuttable && (o.priority === "REQUIRED" || row.materialIds.includes(o.raw_material_id)),
                      )}
                    />
                  ))}
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
            label="Fecha pactada de entrega" help="Fecha y hora prometida al cliente. Después solo se cambia con motivo."
            type="datetime-local"
            min={minDate}
            value={promised}
            onChange={(e) => {
              promisedTouched.current = true;
              setPromised(e.target.value);
            }}
            error={dateError}
            hint={`Hora de ${timezone}. Una vez guardada solo se cambia con motivo, en Acciones avanzadas.`}
            disabled={submitting}
            data-testid="input-promised-date"
            required
          />
          <TextAreaField
            label="Notas" help="Indicaciones de diseño o instalación. Salen en la remisión."
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
          {quote && !quoting && <MaterialsNotice lines={quote.items} />}
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
