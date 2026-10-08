// Reporte de utilidad y mermas (M4-ADM-09, M4-ADM-10). CONFIDENCIAL.
// Todas las cifras vienen calculadas de la base; el CSV las exporta tal cual.

import { useCallback, useEffect, useState } from "react";
import { TZDate } from "@date-fns/tz";
import { endOfMonth, format, startOfMonth, startOfYear, subMonths } from "date-fns";
import { rpc } from "../../lib/rpc";
import { toAppError } from "../../lib/errors";
import type { ProfitReport, ReportBasis, ReportGroup, WasteRow } from "../../lib/types";
import { CATEGORY_LABEL, MATERIAL_UNIT_LABEL, type ProductCategory } from "../../lib/types";
import { useSettingsStore } from "../../store/settings";
import { formatMoney } from "../../utils/money";
import { formatPct, formatQty, isNegative } from "../../utils/quantity";
import { Button, EmptyState, ErrorPanel, SelectField, Spinner, TextField } from "../../components/ui";

const GROUP_LABEL: Record<ReportGroup, string> = {
  ORDER: "Pedido",
  CUSTOMER: "Cliente",
  MONTH: "Mes",
  PRODUCT: "Producto",
  CATEGORY: "Categoría",
};

type Preset = "THIS_MONTH" | "LAST_MONTH" | "YEAR" | "CUSTOM";

function presetRange(p: Preset, tz: string): [string, string] {
  const now = new TZDate(Date.now(), tz);
  const d = (x: Date) => format(x, "yyyy-MM-dd");
  if (p === "LAST_MONTH") {
    const m = subMonths(now, 1);
    return [d(startOfMonth(m)), d(endOfMonth(m))];
  }
  if (p === "YEAR") return [d(startOfYear(now)), d(now)];
  return [d(startOfMonth(now)), d(now)];
}

function csvCell(v: string | number | boolean | null): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(name: string, header: string[], rows: (string | number | boolean | null)[][]) {
  // BOM para que Excel abra los acentos correctamente.
  const body = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function ProfitPage() {
  const timezone = useSettingsStore((s) => s.timezone);
  const [tab, setTab] = useState<"PROFIT" | "WASTE">("PROFIT");
  const [preset, setPreset] = useState<Preset>("THIS_MONTH");
  const [[from, to], setRange] = useState<[string, string]>(() => presetRange("THIS_MONTH", timezone));
  const [basis, setBasis] = useState<ReportBasis>("DELIVERED");
  const [group, setGroup] = useState<ReportGroup>("ORDER");
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [waste, setWaste] = useState<WasteRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "PROFIT") setReport(await rpc.getProfitReport(from, to, basis, group));
      else setWaste(await rpc.getWasteReport(from, to));
    } catch (err) {
      setError(toAppError(err).userText);
    } finally {
      setLoading(false);
    }
  }, [tab, from, to, basis, group]);

  useEffect(() => {
    void load();
  }, [load]);

  const label = (key: string, l: string) =>
    group === "CATEGORY" ? (CATEGORY_LABEL[key as ProductCategory] ?? l) : l;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink-strong">Utilidad y mermas</h1>
          <p className="text-sm text-ink-muted">
            Utilidad neta = venta − (costo de producción + gastos extra). Confidencial.
          </p>
        </div>
        <div className="flex gap-2" role="tablist">
          <Button variant={tab === "PROFIT" ? "primary" : "secondary"} onClick={() => setTab("PROFIT")} role="tab" aria-selected={tab === "PROFIT"}>
            Utilidad
          </Button>
          <Button variant={tab === "WASTE" ? "primary" : "secondary"} onClick={() => setTab("WASTE")} role="tab" aria-selected={tab === "WASTE"}>
            Mermas
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-md border border-line bg-surface-0 p-3">
        <div className="w-44">
          <SelectField
            label="Periodo"
            value={preset}
            onChange={(e) => {
              const p = e.target.value as Preset;
              setPreset(p);
              if (p !== "CUSTOM") setRange(presetRange(p, timezone));
            }}
          >
            <option value="THIS_MONTH">Este mes</option>
            <option value="LAST_MONTH">Mes anterior</option>
            <option value="YEAR">Este año</option>
            <option value="CUSTOM">Personalizado</option>
          </SelectField>
        </div>
        <div className="w-40">
          <TextField label="Desde" type="date" value={from} onChange={(e) => (setPreset("CUSTOM"), setRange([e.target.value, to]))} />
        </div>
        <div className="w-40">
          <TextField label="Hasta" type="date" value={to} onChange={(e) => (setPreset("CUSTOM"), setRange([from, e.target.value]))} />
        </div>
        {tab === "PROFIT" && (
          <>
            <div className="w-48">
              <SelectField label="Fecha de" value={basis} onChange={(e) => setBasis(e.target.value as ReportBasis)}>
                <option value="DELIVERED">Entrega (vendido)</option>
                <option value="CREATED">Registro del pedido</option>
              </SelectField>
            </div>
            <div className="w-40">
              <SelectField label="Agrupar por" value={group} onChange={(e) => setGroup(e.target.value as ReportGroup)}>
                {(Object.keys(GROUP_LABEL) as ReportGroup[]).map((g) => (
                  <option key={g} value={g}>
                    {GROUP_LABEL[g]}
                  </option>
                ))}
              </SelectField>
            </div>
          </>
        )}
      </div>

      {error && <ErrorPanel message={error} onRetry={() => void load()} />}
      {loading && <Spinner label="Calculando…" />}

      {!loading && tab === "PROFIT" && report && (
        <>
          <div className="grid grid-cols-5 gap-3 tabular" data-testid="profit-totals">
            {(
              [
                ["Venta", formatMoney(report.totals.sales)],
                ["Costo de producción", formatMoney(report.totals.production_cost)],
                ["Gastos extra", formatMoney(report.totals.extra_cost)],
                ["Utilidad neta", formatMoney(report.totals.profit)],
                ["Margen", formatPct(report.totals.margin_pct)],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-md border border-line bg-surface-0 p-4">
                <p className="text-xs text-ink-muted">{k}</p>
                <p className={`text-xl font-bold ${k === "Utilidad neta" && isNegative(report.totals.profit) ? "text-blocked-ink" : "text-ink-strong"}`}>{v}</p>
              </div>
            ))}
          </div>
          {(group === "PRODUCT" || group === "CATEGORY") && (
            <p className="text-xs text-ink-muted">
              Por producto o categoría no se incluyen los gastos extra: son del pedido completo y no se reparten.
            </p>
          )}
          {report.rows.length === 0 ? (
            <EmptyState>
              Sin pedidos {basis === "DELIVERED" ? "entregados" : "registrados"} en el periodo.
            </EmptyState>
          ) : (
            <>
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() =>
                    downloadCsv(
                      `utilidad_${from}_${to}_${group.toLowerCase()}.csv`,
                      [GROUP_LABEL[group], "Pedidos", "Venta", "Costo de producción", "Gastos extra", "Utilidad", "Margen %", "Costo incompleto"],
                      report.rows.map((r) => [label(r.key, r.label), r.orders, r.sales, r.production_cost, r.extra_cost, r.profit, r.margin_pct, r.incomplete_cost ? "Sí" : "No"]),
                    )
                  }
                >
                  Exportar CSV
                </Button>
              </div>
              <table className="w-full rounded-md border border-line bg-surface-0 text-sm tabular" data-testid="profit-table">
                <thead className="text-left text-ink-muted">
                  <tr>
                    <th className="p-3">{GROUP_LABEL[group]}</th>
                    <th className="p-3 text-right">Pedidos</th>
                    <th className="p-3 text-right">Venta</th>
                    <th className="p-3 text-right">Costo prod.</th>
                    <th className="p-3 text-right">Gastos extra</th>
                    <th className="p-3 text-right">Utilidad</th>
                    <th className="p-3 text-right">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => (
                    <tr key={r.key} className="border-t border-line">
                      <td className="p-3">
                        {label(r.key, r.label)}
                        {r.incomplete_cost && <span className="block text-xs font-semibold text-warning-ink">[!] Costo incompleto</span>}
                      </td>
                      <td className="p-3 text-right">{r.orders}</td>
                      <td className="p-3 text-right">{formatMoney(r.sales)}</td>
                      <td className="p-3 text-right">{formatMoney(r.production_cost)}</td>
                      <td className="p-3 text-right">{formatMoney(r.extra_cost)}</td>
                      <td className={`p-3 text-right font-semibold ${isNegative(r.profit) ? "text-blocked-ink" : "text-ink-strong"}`}>{formatMoney(r.profit)}</td>
                      <td className="p-3 text-right">{formatPct(r.margin_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.rows.some((r) => r.incomplete_cost) && (
                <p className="text-xs text-warning-ink">
                  &quot;Costo incompleto&quot;: productos sin receta o pedidos que entraron a producción antes del módulo de
                  costos. Su utilidad real es menor a la mostrada.
                </p>
              )}
            </>
          )}
        </>
      )}

      {!loading && tab === "WASTE" && waste && (
        waste.length === 0 ? (
          <EmptyState>Sin consumos ni mermas en el periodo.</EmptyState>
        ) : (
          <>
            <p className="text-sm text-ink-muted">
              Merma teórica: la que ya consideran las recetas de los pedidos producidos. Merma real: desperdicio adicional
              registrado. Si la real es alta, conviene revisar el % de merma de las recetas.
            </p>
            <div className="flex justify-end">
              <Button
                variant="secondary"
                onClick={() =>
                  downloadCsv(
                    `mermas_${from}_${to}.csv`,
                    ["Insumo", "Unidad", "Merma teórica", "Costo teórico", "Merma real", "Costo real"],
                    waste.map((w) => [w.name, MATERIAL_UNIT_LABEL[w.unit], w.theoretical_qty, w.theoretical_cost, w.real_qty, w.real_cost]),
                  )
                }
              >
                Exportar CSV
              </Button>
            </div>
            <table className="w-full rounded-md border border-line bg-surface-0 text-sm tabular" data-testid="waste-table">
              <thead className="text-left text-ink-muted">
                <tr>
                  <th className="p-3">Insumo</th>
                  <th className="p-3 text-right">Merma teórica</th>
                  <th className="p-3 text-right">Costo</th>
                  <th className="p-3 text-right">Merma real</th>
                  <th className="p-3 text-right">Costo</th>
                </tr>
              </thead>
              <tbody>
                {waste.map((w) => (
                  <tr key={w.raw_material_id} className="border-t border-line">
                    <td className="p-3 font-semibold text-ink-strong">{w.name}</td>
                    <td className="p-3 text-right">{formatQty(w.theoretical_qty)} {MATERIAL_UNIT_LABEL[w.unit]}</td>
                    <td className="p-3 text-right">{formatMoney(w.theoretical_cost)}</td>
                    <td className="p-3 text-right">{formatQty(w.real_qty)} {MATERIAL_UNIT_LABEL[w.unit]}</td>
                    <td className="p-3 text-right">{formatMoney(w.real_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )
      )}
    </div>
  );
}
