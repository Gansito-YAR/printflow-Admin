// Receta del producto (M4-ADM-05), versión por prioridad (migración 0023).
// Cada insumo lleva una PRIORIDAD:
//   Obligatorio → el producto siempre lo usa.
//   Opcional    → alternativa: se usa si no hay otro o si el cliente lo pide.
// La cantidad por unidad y la merma ya no se capturan aquí: se calcularán
// después con las medidas del insumo y del producto. Mientras tanto la base no
// costea ni descuenta inventario por estos renglones y el producto cuenta como
// "costo incompleto" en los reportes.
// Si una receta anterior trae cantidad, se conserva intacta al guardar.

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { rpc } from "../../lib/rpc";
import { fetchMaterials } from "../../lib/queries";
import { toAppError } from "../../lib/errors";
import type { Material, Product, ProductSimulation, RecipeLineInput, RecipePriority } from "../../lib/types";
import { MATERIAL_UNIT_LABEL, RECIPE_PRIORITY_LABEL, UNIT_LABEL } from "../../lib/types";
import { formatMoney } from "../../utils/money";
import { formatPct, isNegative } from "../../utils/quantity";
import { Button, ErrorPanel, Modal, Spinner } from "../../components/ui";
import { InfoTip } from "../../components/InfoTip";

interface Row {
  key: string;
  raw_material_id: string;
  priority: RecipePriority;
  /** Solo si la receta anterior ya la tenía: se reenvía sin cambios. */
  quantity_required: string | null;
  waste_margin_pct: string | null;
}

const PRIORITY_HELP =
  "Obligatorio: el producto siempre lleva este insumo. Opcional: es una alternativa; se usa si no hay otro o si el cliente lo pide.";

export function RecipeModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [sim, setSim] = useState<ProductSimulation | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const inFlight = useRef(false);

  const loadSim = useCallback(async () => {
    const s = await rpc.simulateProductCost(product.id);
    setSim(s);
    return s;
  }, [product.id]);

  useEffect(() => {
    Promise.all([fetchMaterials(false), loadSim()])
      .then(([mats, s]) => {
        setMaterials(mats);
        setRows(
          s.materials.map((m) => ({
            key: crypto.randomUUID(),
            raw_material_id: m.raw_material_id,
            priority: m.priority ?? "REQUIRED",
            quantity_required: m.quantity_required ?? null,
            waste_margin_pct: m.quantity_required ? m.waste_margin_pct : null,
          })),
        );
      })
      .catch((err) => setLoadError(toAppError(err).userText));
  }, [loadSim]);

  function update(key: string, patch: Partial<Row>) {
    setDirty(true);
    setRows((prev) => prev?.map((r) => (r.key === key ? { ...r, ...patch } : r)) ?? prev);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current || !rows) return;
    const items: RecipeLineInput[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      if (!r.raw_material_id) return setError("Seleccione el insumo de cada renglón o quite el renglón.");
      if (seen.has(r.raw_material_id)) return setError("Un insumo aparece dos veces.");
      seen.add(r.raw_material_id);
      items.push({
        raw_material_id: r.raw_material_id,
        priority: r.priority,
        ...(r.quantity_required ? { quantity_required: r.quantity_required, waste_margin_pct: r.waste_margin_pct ?? "0" } : {}),
      });
    }

    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await rpc.setRecipe(product.id, items);
      await loadSim();
      setDirty(false);
      toast.success("Receta guardada.");
    } catch (err) {
      setError(toAppError(err).userText);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <Modal title={`Receta y costo · ${product.name}`} onClose={onClose} locked={saving}>
      {loadError ? (
        <ErrorPanel message={loadError} />
      ) : !rows ? (
        <Spinner label="Cargando…" />
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" data-testid="recipe-form">
          <p className="text-sm text-ink-base">
            Insumos con los que se fabrica este producto. Marque como <strong>obligatorio</strong> el que siempre lleva y como{" "}
            <strong>opcional</strong> las alternativas (si no hay otro o si el cliente lo pide).
          </p>
          {materials.length === 0 && (
            <p className="text-sm font-semibold text-warning-ink">Primero registre insumos en la sección Insumos.</p>
          )}
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-6 items-end gap-2 rounded-md border border-line p-2 sm:grid-cols-12" data-testid="recipe-row">
              <label className="order-1 col-span-5 flex flex-col gap-1 text-xs font-semibold text-ink-strong sm:order-none sm:col-span-7">
                Insumo
                <select
                  value={r.raw_material_id}
                  onChange={(e) => update(r.key, { raw_material_id: e.target.value })}
                  disabled={saving}
                  className="min-h-11 w-full rounded-md border border-line bg-surface-0 px-2 text-base font-normal md:min-h-10 md:text-sm"
                >
                  <option value="">Seleccione…</option>
                  {materials
                    .filter((m) => (m.is_active && !m.archived_at) || m.id === r.raw_material_id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (${m.unit_cost}/{MATERIAL_UNIT_LABEL[m.unit]})
                      </option>
                    ))}
                </select>
              </label>
              <label className="order-3 col-span-5 flex flex-col gap-1 text-xs font-semibold text-ink-strong sm:order-none sm:col-span-4">
                <span className="flex items-center gap-1">
                  Prioridad <InfoTip text={PRIORITY_HELP} label="Prioridad" />
                </span>
                <select
                  value={r.priority}
                  onChange={(e) => update(r.key, { priority: e.target.value as RecipePriority })}
                  disabled={saving}
                  className="min-h-11 w-full rounded-md border border-line bg-surface-0 px-2 text-base font-normal md:min-h-10 md:text-sm"
                  data-testid="recipe-priority"
                >
                  {(Object.keys(RECIPE_PRIORITY_LABEL) as RecipePriority[]).map((p) => (
                    <option key={p} value={p}>
                      {RECIPE_PRIORITY_LABEL[p]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="order-2 col-span-1 flex justify-end sm:order-none">
                <Button
                  variant="ghost"
                  aria-label="Quitar insumo"
                  disabled={saving}
                  onClick={() => {
                    setDirty(true);
                    setRows((prev) => prev?.filter((x) => x.key !== r.key) ?? prev);
                  }}
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
          <div>
            <Button
              variant="secondary"
              disabled={saving || materials.length === 0}
              onClick={() => {
                setDirty(true);
                setRows((prev) => [
                  ...(prev ?? []),
                  { key: crypto.randomUUID(), raw_material_id: "", priority: "REQUIRED", quantity_required: null, waste_margin_pct: null },
                ]);
              }}
            >
              + Insumo
            </Button>
          </div>

          {sim && (
            <section className="rounded-md bg-surface-1 p-4 text-sm tabular" aria-label="Costo del producto" data-testid="recipe-simulation">
              <h3 className="mb-2 font-bold text-ink-strong">
                Costo por {UNIT_LABEL[product.pricing_unit]} {dirty && <span className="text-xs font-normal text-warning-ink">(guarde para recalcular)</span>}
              </h3>
              {sim.has_recipe ? (
                <>
                  <div className="grid grid-cols-2 gap-1">
                    <span>Materiales</span>
                    <span className="text-right">${sim.material_cost}</span>
                    <span className="font-semibold text-ink-strong">Costo de producción</span>
                    <span className="text-right font-semibold text-ink-strong">${sim.unit_cost}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-1 border-t border-line pt-2 text-xs sm:text-sm">
                    <span className="text-ink-muted">Precio</span>
                    <span className="text-right text-ink-muted">Venta</span>
                    <span className="text-right text-ink-muted">Utilidad</span>
                    <span className="text-right text-ink-muted">Margen</span>
                    {(
                      [
                        ["Menudeo", sim.retail_price, sim.retail_profit, sim.retail_margin_pct],
                        ["Mayoreo", sim.wholesale_price, sim.wholesale_profit, sim.wholesale_margin_pct],
                      ] as const
                    ).map(([label, price, profit, pct]) => (
                      <div key={label} className="contents">
                        <span>{label}</span>
                        <span className="text-right">{formatMoney(price)}</span>
                        <span className={`text-right font-semibold ${isNegative(profit) ? "text-blocked-ink" : "text-ink-strong"}`}>
                          {isNegative(profit) && "[!] "}
                          {formatMoney(profit)}
                        </span>
                        <span className="text-right">{formatPct(pct)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-ink-base" data-testid="recipe-cost-pending">
                  {(sim.material_count ?? sim.materials.length) > 0
                    ? "El costo de materiales se calculará automáticamente con las medidas del insumo y del producto. Mientras tanto, los reportes marcan este producto como costo incompleto."
                    : "Agregue los insumos con los que se fabrica. Mientras no tenga receta, los reportes marcan este producto como costo incompleto."}
                </p>
              )}
            </section>
          )}

          {error && (
            <p role="alert" className="text-sm font-semibold text-blocked-ink">
              [!] {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end md:gap-3">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cerrar
            </Button>
            <Button type="submit" loading={saving} disabled={!dirty}>
              Guardar receta
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
