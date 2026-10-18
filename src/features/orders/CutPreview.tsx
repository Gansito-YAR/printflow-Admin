// Vista previa de la calculadora de corte (migración 0025, plan
// MD/Plan_Calculadora_Corte.md). Los números los calcula la base
// (plan_cuts); aquí se muestran y se dibuja cada pliego. Todos los pliegos
// llevan el mismo acomodo; el último solo lleva las piezas que faltan.

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, SkipBack, SkipForward } from "lucide-react";
import type { CutPlanMaterial, ProductMaterialOption } from "../../lib/types";
import { formatMoney } from "../../utils/money";
import { formatQty } from "../../utils/quantity";

function SheetDrawing({ m, pieces }: { m: CutPlanMaterial; pieces: number }) {
  const sw = Number(m.sheet_w);
  const sh = Number(m.sheet_h);
  const rects = (m.layout?.rects ?? []).slice(0, pieces);
  const margin = Number(m.layout?.margin ?? 0);
  const unit = Math.max(sw, sh);
  return (
    <svg
      viewBox={`0 0 ${sw} ${sh}`}
      className="h-auto w-full max-w-[320px] shrink-0 rounded-sm border border-line bg-surface-2 sm:w-[320px]"
      role="img"
      aria-label={`Pliego de ${formatQty(m.sheet_w)} × ${formatQty(m.sheet_h)} cm con ${pieces} piezas`}
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
          strokeWidth={unit / 250}
          strokeDasharray={`${unit / 60} ${unit / 90}`}
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
          strokeWidth={unit / 200}
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

const navBtn =
  "inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-surface-0 text-ink-strong hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40";

function MaterialCut({ m, quantity }: { m: CutPlanMaterial; quantity: number }) {
  const per = m.pieces_per_sheet;
  const sheets = m.sheets_required ?? 0;
  const [sheet, setSheet] = useState(0);
  // Si cambian las medidas o la cantidad, el número de pliegos cambia.
  useEffect(() => setSheet((s) => Math.min(s, Math.max(sheets - 1, 0))), [sheets]);

  const used = Number(m.used_pct ?? 0);
  const waste = Number(m.waste_pct ?? 0);
  if (per <= 0 || sheets <= 0) {
    return (
      <section className="rounded-md bg-surface-1 p-3 text-sm" aria-label={`Corte en ${m.name}`}>
        <p className="font-semibold text-ink-strong">{m.name}</p>
        <p role="alert" className="font-semibold text-blocked-ink">
          [!] La pieza no cabe en este pliego con esa separación y margen.
        </p>
      </section>
    );
  }

  // Piezas en el pliego actual: llenos, salvo el último.
  const onSheet = Math.max(Math.min(per, quantity - sheet * per), 0);
  const first = m.layout?.rects?.[0];
  const pieceArea = first ? first.w * first.h : 0;
  const sheetUsed = pieceArea > 0 ? (onSheet * pieceArea * 100) / (Number(m.sheet_w) * Number(m.sheet_h)) : 0;

  return (
    <section className="flex flex-col gap-3 rounded-md bg-surface-1 p-3 sm:flex-row sm:items-start" aria-label={`Corte en ${m.name}`}>
      <div className="flex shrink-0 flex-col items-center gap-2">
        <SheetDrawing m={m} pieces={onSheet} />
        {sheets > 1 && (
          <div className="flex items-center gap-1" data-testid="sheet-nav">
            <button type="button" className={navBtn} onClick={() => setSheet(0)} disabled={sheet === 0} aria-label="Primer pliego">
              <SkipBack size={16} aria-hidden />
            </button>
            <button type="button" className={navBtn} onClick={() => setSheet((s) => Math.max(s - 1, 0))} disabled={sheet === 0} aria-label="Pliego anterior">
              <ChevronLeft size={18} aria-hidden />
            </button>
            <span className="min-w-28 px-1 text-center text-sm font-semibold text-ink-strong tabular" aria-live="polite" data-testid="sheet-counter">
              Pliego {sheet + 1} de {sheets}
            </span>
            <button
              type="button"
              className={navBtn}
              onClick={() => setSheet((s) => Math.min(s + 1, sheets - 1))}
              disabled={sheet >= sheets - 1}
              aria-label="Siguiente pliego"
            >
              <ChevronRight size={18} aria-hidden />
            </button>
            <button type="button" className={navBtn} onClick={() => setSheet(sheets - 1)} disabled={sheet >= sheets - 1} aria-label="Último pliego">
              <SkipForward size={16} aria-hidden />
            </button>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
        <p className="font-semibold text-ink-strong">
          {m.name}{" "}
          <span className="font-normal text-ink-muted tabular">
            · pliego de {formatQty(m.sheet_w)} × {formatQty(m.sheet_h)} cm
          </span>
        </p>
        <p className="tabular text-ink-base">
          <strong className="text-ink-strong">{per}</strong> por pliego ·{" "}
          <strong className="text-ink-strong">{sheets}</strong> {sheets === 1 ? "pliego" : "pliegos"}
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
        </p>
        <p className="rounded-md border border-line px-3 py-2 tabular text-xs text-ink-base" data-testid="sheet-detail">
          <span className="font-semibold text-ink-strong">Pliego {sheet + 1}:</span> {onSheet} {onSheet === 1 ? "pieza" : "piezas"} ·{" "}
          {sheetUsed.toFixed(2)} % utilizado · {(100 - sheetUsed).toFixed(2)} % merma
          {onSheet < per && <span className="text-warning-ink"> · pliego incompleto</span>}
        </p>
      </div>
    </section>
  );
}

export function CutPreview({ materials, quantity }: { materials: CutPlanMaterial[]; quantity: number }) {
  if (materials.length === 0) return null;
  return (
    <div className="order-5 col-span-6 flex flex-col gap-2 md:order-none md:col-span-12" data-testid="cut-preview">
      {materials.map((m) => (
        <MaterialCut key={m.raw_material_id} m={m} quantity={quantity} />
      ))}
    </div>
  );
}
