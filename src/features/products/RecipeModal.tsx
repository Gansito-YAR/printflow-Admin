// Receta del producto y simulador de costo/margen (M4-ADM-05).
//   C_p = Σ (C_insumo · Q · (1 + M)) + C_fijo     — BRD §5
// Q es por UNIDAD FACTURABLE: por m² en productos por m², por pieza en los demás.
// El simulador lo calcula la base (simulate_product_cost) con los costos vigentes.

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { rpc } from "../../lib/rpc";
import { fetchMaterials } from "../../lib/queries";
import { toAppError } from "../../lib/errors";
import type { Material, Product, ProductSimulation } from "../../lib/types";
import { MATERIAL_UNIT_LABEL, UNIT_LABEL } from "../../lib/types";
import { formatMoney } from "../../utils/money";
import { formatPct, isNegative, parseQuantity } from "../../utils/quantity";
import { Button, ErrorPanel, Modal, Spinner } from "../../components/ui";

interface Row {
  key: string;
  raw_material_id: string;
  quantity_required: string;
  waste_margin_pct: string;
}

export function RecipeModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [sim, setSim] = useState<ProductSimulation | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const inFlight = useRef(false);
  const per = product.pricing_unit === "M2" ? "por m² vendido" : "por pieza vendida";

  const loadSim = useCallback(async () => {
    const s = await rpc.simulateProductCost(product.id);
    setSim(s);
    return s;
  }, [product.id]);

  useEffect(() => {
    Promise.all([fetchMaterials(true), loadSim()])
      .then(([mats, s]) => {
        setMaterials(mats);
        setRows(
          s.materials.map((m) => ({
            key: crypto.randomUUID(),
            raw_material_id: m.raw_material_id,
            quantity_required: m.quantity_required,
            waste_margin_pct: m.waste_margin_pct,
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
    const items = [];
    const seen = new Set<string>();
    for (const r of rows) {
      if (!r.raw_material_id) return setError("Seleccione el insumo de cada renglón o quite el renglón.");
      if (seen.has(r.raw_material_id)) return setError("Un insumo aparece dos veces.");
      seen.add(r.raw_material_id);
      const q = parseQuantity(r.quantity_required, { label: "La cantidad" });
      if (!q.ok) return setError(q.error);
      const m = parseQuantity(r.waste_margin_pct || "0", { decimals: 2, allowZero: true, label: "La merma" });
      if (!m.ok) return setError(m.error);
      if (Number(m.value) >= 100) return setError("La merma debe ser menor a 100 %.");
      items.push({ raw_material_id: r.raw_material_id, quantity_required: q.value, waste_margin_pct: m.value });
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

  const unitOf = (id: string) => {
    const m = materials.find((x) => x.id === id);
    return m ? MATERIAL_UNIT_LABEL[m.unit] : "";
  };

  return (
    <Modal title={`Receta y costo · ${product.name}`} onClose={onClose} locked={saving}>
      {loadError ? (
        <ErrorPanel message={loadError} />
      ) : !rows ? (
        <Spinner label="Cargando…" />
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" data-testid="recipe-form">
          <p className="text-sm text-ink-base">
            Insumos que consume <strong>1 {UNIT_LABEL[product.pricing_unit]}</strong> de este producto. La merma es el
            porcentaje adicional que se pierde al producirlo.
          </p>
          {materials.length === 0 && (
            <p className="text-sm font-semibold text-warning-ink">Primero registre insumos en la sección Insumos.</p>
          )}
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-6 items-end gap-2 rounded-md border border-line p-2 sm:grid-cols-12" data-testid="recipe-row">
              <label className="order-1 col-span-5 flex flex-col gap-1 text-xs font-semibold text-ink-strong sm:order-none">
                Insumo
                <select
                  value={r.raw_material_id}
                  onChange={(e) => update(r.key, { raw_material_id: e.target.value })}
                  disabled={saving}
                  className="min-h-11 w-full rounded-md border border-line bg-surface-0 px-2 text-base font-normal md:min-h-10 md:text-sm"
                >
                  <option value="">Seleccione…</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (${m.unit_cost}/{MATERIAL_UNIT_LABEL[m.unit]})
                    </option>
                  ))}
                </select>
              </label>
              <label className="order-3 col-span-3 flex flex-col gap-1 text-xs font-semibold text-ink-strong sm:order-none">
                Cantidad {unitOf(r.raw_material_id) && `(${unitOf(r.raw_material_id)})`} {per}
                <input
                  inputMode="decimal"
                  value={r.quantity_required}
                  onChange={(e) => update(r.key, { quantity_required: e.target.value })}
                  disabled={saving}
                  className="min-h-11 w-full rounded-md border border-line bg-surface-0 px-2 text-base font-normal md:min-h-10 md:text-sm"
                />
              </label>
              <label className="order-3 col-span-3 flex flex-col gap-1 text-xs font-semibold text-ink-strong sm:order-none">
                Merma %
                <input
                  inputMode="decimal"
                  value={r.waste_margin_pct}
                  onChange={(e) => update(r.key, { waste_margin_pct: e.target.value })}
                  disabled={saving}
                  className="min-h-11 w-full rounded-md border border-line bg-surface-0 px-2 text-base font-normal md:min-h-10 md:text-sm"
                />
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
                  { key: crypto.randomUUID(), raw_material_id: "", quantity_required: "", waste_margin_pct: "0" },
                ]);
              }}
            >
              + Insumo
            </Button>
          </div>

          {sim && (
            <section className="rounded-md bg-surface-1 p-4 text-sm tabular" aria-label="Simulador de costo" data-testid="recipe-simulation">
              <h3 className="mb-2 font-bold text-ink-strong">
                Costo por {UNIT_LABEL[product.pricing_unit]} {dirty && <span className="text-xs font-normal text-warning-ink">(guarde para recalcular)</span>}
              </h3>
              <div className="grid grid-cols-2 gap-1">
                <span>Materiales (con merma)</span>
                <span className="text-right">${sim.material_cost}</span>
                <span>Costo fijo</span>
                <span className="text-right">${sim.fixed_cost}</span>
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
              {!sim.has_recipe && (
                <p className="mt-2 text-xs font-semibold text-warning-ink">
                  Sin receta: el costo solo incluye el costo fijo y los reportes lo marcarán como incompleto.
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
