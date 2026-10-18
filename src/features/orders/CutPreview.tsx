// Vista previa de la calculadora de corte (migración 0025, plan
// MD/Plan_Calculadora_Corte.md). Los números los calcula la base
// (plan_cuts); aquí solo se muestran y se dibuja el acomodo de un pliego.

import type { CutPlanMaterial, ProductMaterialOption } from "../../lib/types";
import { formatMoney } from "../../utils/money";
import { formatQty } from "../../utils/quantity";

function SheetDrawing({ m }: { m: CutPlanMaterial }) {
  const sw = Number(m.sheet_w);
  const sh = Number(m.sheet_h);
  const rects = m.layout?.rects ?? [];
  const margin = Number(m.layout?.margin ?? 0);
  return (
    <svg
      viewBox={`0 0 ${sw} ${sh}`}
      className="h-auto w-full max-w-[320px] shrink-0 rounded-sm border border-line bg-surface-2 sm:w-[320px]"
      role="img"
      aria-label={`Acomodo en un pliego de ${formatQty(m.sheet_w)} × ${formatQty(m.sheet_h)} cm: ${m.pieces_per_sheet} piezas`}
      preserveAspectRatio="xMidYMid meet"
    >
      {margin > 0 && (
        <rect
          x={margin}
          y={margin}
          width={Math.max(sw - 2 * margin, 0)}
          height={Math.max(sh - 2 * margin, 0)}
          fill="none"
          className="stroke-line-strong"
          strokeWidth={Math.max(sw, sh) / 250}
          strokeDasharray={`${Math.max(sw, sh) / 60} ${Math.max(sw, sh) / 90}`}
        />
      )}
      {rects.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          className="fill-primary stroke-surface-0"
          fillOpacity={0.85}
          strokeWidth={Math.max(sw, sh) / 200}
        />
      ))}
    </svg>
  );
}

/** Antes de tener las medidas: el pliego vacío de cada material y qué falta escribir. */
export function CutPending({ materials }: { materials: ProductMaterialOption[] }) {
  if (materials.length === 0) return null;
  return (
    <div className="order-5 col-span-6 flex flex-wrap gap-3 md:order-none md:col-span-12" data-testid="cut-pending">
      {materials.map((o) => (
        <div key={o.raw_material_id} className="flex items-center gap-3 rounded-md bg-surface-1 p-3 text-sm">
          <svg viewBox={`0 0 ${o.sheet_w ?? 1} ${o.sheet_h ?? 1}`} className="h-16 w-auto rounded-sm border border-dashed border-line-strong bg-surface-2" aria-hidden="true" />
          <span className="flex flex-col">
            <span className="font-semibold text-ink-strong">{o.name}</span>
            <span className="tabular text-xs text-ink-muted">
              Pliego de {formatQty(String(o.sheet_w ?? ""))} × {formatQty(String(o.sheet_h ?? ""))} cm
            </span>
            <span className="text-xs text-ink-muted">Escriba base, altura y cantidad para ver el acomodo.</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function CutPreview({ materials }: { materials: CutPlanMaterial[] }) {
  if (materials.length === 0) return null;
  return (
    <div className="order-5 col-span-6 flex flex-col gap-2 md:order-none md:col-span-12" data-testid="cut-preview">
      {materials.map((m) => {
        const used = Number(m.used_pct ?? 0);
        const waste = Number(m.waste_pct ?? 0);
        const fits = m.pieces_per_sheet > 0;
        return (
          <section
            key={m.raw_material_id}
            className="flex flex-col gap-3 rounded-md bg-surface-1 p-3 sm:flex-row sm:items-start"
            aria-label={`Corte en ${m.name}`}
          >
            <SheetDrawing m={m} />
            <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
              <p className="font-semibold text-ink-strong">
                {m.name}{" "}
                <span className="font-normal text-ink-muted tabular">
                  · pliego de {formatQty(m.sheet_w)} × {formatQty(m.sheet_h)} cm
                </span>
              </p>
              {fits ? (
                <>
                  <p className="tabular text-ink-base">
                    <strong className="text-ink-strong">{m.pieces_per_sheet}</strong> por pliego ·{" "}
                    <strong className="text-ink-strong">{m.sheets_required}</strong> {m.sheets_required === 1 ? "pliego" : "pliegos"}
                    {m.material_cost && <> · {formatMoney(m.material_cost)} de material</>}
                  </p>
                  <div className="flex h-7 overflow-hidden rounded-md text-xs font-semibold tabular" aria-hidden="true">
                    <div className="flex items-center justify-center bg-primary text-primary-ink" style={{ width: `${used}%` }}>
                      {used >= 18 && `${used.toFixed(2)} %`}
                    </div>
                    <div className="flex flex-1 items-center justify-center bg-blocked-line text-surface-0">
                      {waste >= 12 && `${waste.toFixed(2)} %`}
                    </div>
                  </div>
                  <p className="tabular text-xs text-ink-muted">
                    <span className="font-semibold text-ink-strong">{used.toFixed(2)} % utilizado</span> ·{" "}
                    <span className="font-semibold text-blocked-ink">{waste.toFixed(2)} % merma</span> en el pedido completo
                    {m.used_pct_sheet && <> (un pliego lleno: {Number(m.used_pct_sheet).toFixed(2)} %)</>}
                  </p>
                </>
              ) : (
                <p role="alert" className="font-semibold text-blocked-ink">
                  [!] La pieza no cabe en este pliego con esa separación y orilla.
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
