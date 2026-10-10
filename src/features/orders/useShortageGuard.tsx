// Confirmación antes de pasar un pedido a producción (Plan Correcciones v2, C6, decisión D3).
// Al iniciar producción se descuentan los insumos. Si alguno no alcanza:
//   - con inventario negativo permitido: se muestra el faltante y se puede continuar;
//     el servidor abre la alerta y lo registra en la bitácora;
//   - sin él: solo se informa (el servidor rechazaría el cambio).
// Si la consulta previa falla, NO se bloquea el flujo: el servidor sigue aplicando sus reglas.

import { useCallback, useRef, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { rpc } from "../../lib/rpc";
import { MATERIAL_UNIT_LABEL, type MaterialsPreview } from "../../lib/types";
import { compareQty, formatQty } from "../../utils/quantity";
import { Button, Modal } from "../../components/ui";

export function useShortageGuard(): { confirmProduction: (orderId: string) => Promise<boolean>; modal: ReactNode } {
  const [preview, setPreview] = useState<MaterialsPreview | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const finish = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setPreview(null);
  }, []);

  const confirmProduction = useCallback(async (orderId: string) => {
    let result: MaterialsPreview;
    try {
      result = await rpc.previewMaterials({ orderId });
    } catch {
      return true;
    }
    const short = result.materials.filter((m) => compareQty(m.shortage, "0") > 0);
    if (short.length === 0) return true;
    setPreview({ ...result, materials: short });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const modal = preview ? (
    <Modal title="Insumos insuficientes" onClose={() => finish(false)} testId="shortage-modal">
      <div className="flex flex-col gap-4">
        <p className="flex items-start gap-2 rounded-md border-2 border-blocked-line bg-blocked p-3 text-sm font-semibold text-blocked-ink">
          <AlertTriangle size={18} aria-hidden className="mt-0.5 shrink-0" />
          {preview.allow_negative_stock
            ? "Al pasar a producción se descuentan estos insumos y no alcanzan. Puede continuar: el inventario quedará en negativo y el pedido aparecerá en Notificaciones hasta que se reabastezca."
            : "No hay insumo suficiente y la configuración no permite inventario negativo. Reabastezca antes de pasar este pedido a producción."}
        </p>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-ink-strong">
              <tr>
                <th className="px-3 py-2">Insumo</th>
                <th className="px-3 py-2 text-right">Requerido</th>
                <th className="px-3 py-2 text-right">Disponible</th>
                <th className="px-3 py-2 text-right">Faltante</th>
              </tr>
            </thead>
            <tbody>
              {preview.materials.map((m) => (
                <tr key={m.raw_material_id} className="border-t border-line">
                  <td className="px-3 py-2 font-semibold text-ink-strong">{m.name}</td>
                  <td className="tabular px-3 py-2 text-right">{formatQty(m.required)}</td>
                  <td className="tabular px-3 py-2 text-right">{formatQty(m.available)}</td>
                  <td className="tabular px-3 py-2 text-right font-bold text-blocked-ink">
                    {formatQty(m.shortage)} {MATERIAL_UNIT_LABEL[m.unit] ?? m.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end md:gap-3">
          <Button variant="secondary" onClick={() => finish(false)} data-testid="shortage-cancel">
            Cancelar
          </Button>
          {preview.allow_negative_stock && (
            <Button onClick={() => finish(true)} data-testid="shortage-continue">
              Continuar de todos modos
            </Button>
          )}
        </div>
      </div>
    </Modal>
  ) : null;

  return { confirmProduction, modal };
}
