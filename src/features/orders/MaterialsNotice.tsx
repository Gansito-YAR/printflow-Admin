// Aviso informativo al capturar un pedido (Plan Correcciones v2, C6).
// Compara lo que pedirían estas partidas contra el inventario de hoy. NO bloquea:
// los insumos se descuentan hasta que el pedido pasa a producción.

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { rpc } from "../../lib/rpc";
import { MATERIAL_UNIT_LABEL, type MaterialNeed, type QuoteLine } from "../../lib/types";
import { compareQty, formatQty } from "../../utils/quantity";

export function MaterialsNotice({ lines }: { lines: QuoteLine[] }) {
  const [short, setShort] = useState<MaterialNeed[]>([]);

  useEffect(() => {
    let cancelled = false;
    const items = lines.map((l) => ({ product_id: l.product_id, billable_qty: l.billable_qty }));
    rpc
      .previewMaterials({ items })
      .then((r) => {
        if (!cancelled) setShort(r.materials.filter((m) => compareQty(m.shortage, "0") > 0));
      })
      .catch(() => {
        if (!cancelled) setShort([]);
      });
    return () => {
      cancelled = true;
    };
  }, [lines]);

  if (short.length === 0) return null;
  return (
    <div role="status" className="flex flex-col gap-1 rounded-md border border-warning-line bg-warning p-3 text-sm text-warning-ink" data-testid="materials-notice">
      <p className="flex items-center gap-1.5 font-semibold">
        <Info size={16} aria-hidden /> Con el inventario de hoy no alcanzan estos insumos:
      </p>
      <ul className="list-disc pl-6">
        {short.map((m) => {
          const unit = MATERIAL_UNIT_LABEL[m.unit] ?? m.unit;
          return (
            <li key={m.raw_material_id}>
              <strong>{m.name}</strong>: hay <span className="tabular">{formatQty(m.available)}</span> {unit}, se
              requieren <span className="tabular">{formatQty(m.required)}</span> {unit}
            </li>
          );
        })}
      </ul>
      <p className="text-xs">
        Puede guardar el pedido. Al pasarlo a producción se le pedirá confirmar si sigue faltando.
      </p>
    </div>
  );
}
