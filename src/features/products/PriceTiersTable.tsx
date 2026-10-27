// Precios por cantidad (papelería, migración 0029). El usuario edita MÁXIMO y
// PRECIO de cada fila; el MÍNIMO se calcula (0 en la primera, máximo anterior
// + 1 en las demás). Solo la última fila puede quedar sin máximo. La base
// vuelve a validar todo al guardar (set_price_tiers).

import { Plus, Trash2 } from "lucide-react";

export interface TierRow {
  key: string;
  max: string;
  price: string;
}

export interface TierCheck {
  min: number | null;
  maxError: string | null;
  priceError: string | null;
  priceWarning: string | null;
}

const INT = /^\d+$/;
const MONEY = /^\d+(\.\d{1,2})?$/;

export const newTierRow = (max = "", price = ""): TierRow => ({ key: crypto.randomUUID(), max, price });

/** Valida cada fila y calcula su mínimo. Si una fila anterior está mal, los mínimos siguientes quedan sin calcular. */
export function checkTiers(rows: TierRow[]): TierCheck[] {
  let prevMax: number | null = null;
  let broken = false;
  return rows.map((r, i) => {
    const isLast = i === rows.length - 1;
    const min = broken ? null : prevMax === null ? 0 : prevMax + 1;
    let maxError: string | null = null;
    const max = r.max.trim();
    if (max === "") {
      if (!isLast) maxError = "Solo la última fila puede quedar sin máximo.";
    } else if (!INT.test(max)) {
      maxError = "Escriba un número entero de piezas.";
    } else if (min !== null && Number(max) < Math.max(min, 1)) {
      maxError = `Debe ser al menos ${Math.max(min, 1)}.`;
    }
    const price = r.price.trim();
    let priceError: string | null = null;
    if (price === "") priceError = "Escriba el precio.";
    else if (!MONEY.test(price) || Number(price) <= 0) priceError = "Precio mayor a 0, con máximo dos decimales.";
    let priceWarning: string | null = null;
    if (!priceError && i > 0) {
      const prev = Number(rows[i - 1]!.price);
      if (MONEY.test(rows[i - 1]!.price.trim()) && Number(price) > prev)
        priceWarning = "Es más caro que la fila anterior; normalmente el mayoreo baja el precio.";
    }
    if (maxError || max === "") broken = true;
    else prevMax = Number(max);
    return { min, maxError, priceError, priceWarning };
  });
}

export function tiersAreValid(rows: TierRow[]): boolean {
  return checkTiers(rows).every((c) => !c.maxError && !c.priceError);
}

const input =
  "min-h-11 w-full rounded-md border bg-surface-0 px-3 text-base font-normal tabular md:min-h-10 md:text-sm";

export function PriceTiersTable({
  rows,
  onChange,
  unitWord,
  disabled,
}: {
  rows: TierRow[];
  onChange: (rows: TierRow[]) => void;
  /** "pieza" o "paquete": para los textos. */
  unitWord: string;
  disabled?: boolean;
}) {
  const checks = checkTiers(rows);
  const last = rows[rows.length - 1];
  const lastHasMax = !last || last.max.trim() !== "";
  const canAdd = !disabled && rows.length < 30 && (rows.length === 0 || (lastHasMax && tiersAreValid(rows)));

  const update = (key: string, patch: Partial<TierRow>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <section className="flex flex-col gap-3 rounded-md border border-line p-3 sm:col-span-2" aria-label="Precios por cantidad" data-testid="price-tiers">
      <div>
        <h3 className="font-semibold text-ink-strong">Precios por cantidad</h3>
        <p className="text-xs text-ink-muted">
          El precio de cada {unitWord} depende de cuántas pida el cliente; todas se cobran al precio de su rango. El mínimo se
          calcula solo. Deje vacío el máximo de la última fila para que aplique a cualquier cantidad mayor.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md bg-surface-1 p-3 text-sm text-ink-base" data-testid="price-tiers-empty">
          Sin precios. Agregue al menos una fila para poder activar el producto.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-separate border-spacing-y-1 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-ink-muted">
                <th className="pr-2 font-semibold">Mínimo</th>
                <th className="pr-2 font-semibold">Máximo</th>
                <th className="pr-2 font-semibold">Precio por {unitWord}</th>
                <th className="w-10" aria-label="Quitar" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const c = checks[i]!;
                const isLast = i === rows.length - 1;
                return (
                  <tr key={r.key} data-testid="price-tier-row" className="align-top">
                    <td className="pr-2">
                      <span className="flex min-h-11 items-center rounded-md bg-surface-1 px-3 tabular text-ink-base md:min-h-10" data-testid="tier-min">
                        {c.min ?? "—"}
                      </span>
                    </td>
                    <td className="pr-2">
                      <input
                        inputMode="numeric"
                        aria-label={`Máximo de la fila ${i + 1}`}
                        value={r.max}
                        placeholder={isLast ? "Sin máximo" : ""}
                        onChange={(e) => update(r.key, { max: e.target.value.replace(/[^0-9]/g, "") })}
                        disabled={disabled}
                        aria-invalid={Boolean(c.maxError) || undefined}
                        className={`${input} ${c.maxError ? "border-blocked-line" : "border-line"}`}
                        data-testid="tier-max"
                      />
                      {c.maxError && <span className="mt-1 block text-xs font-semibold text-blocked-ink">{c.maxError}</span>}
                    </td>
                    <td className="pr-2">
                      <span className="relative block">
                        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-muted">$</span>
                        <input
                          inputMode="decimal"
                          aria-label={`Precio de la fila ${i + 1}`}
                          value={r.price}
                          onChange={(e) => update(r.key, { price: e.target.value.replace(",", ".").replace(/[^0-9.]/g, "") })}
                          disabled={disabled}
                          aria-invalid={Boolean(c.priceError) || undefined}
                          className={`${input} pl-7 ${c.priceError ? "border-blocked-line" : "border-line"}`}
                          data-testid="tier-price"
                        />
                      </span>
                      {c.priceError && <span className="mt-1 block text-xs font-semibold text-blocked-ink">{c.priceError}</span>}
                      {c.priceWarning && <span className="mt-1 block text-xs text-warning-ink">{c.priceWarning}</span>}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => onChange(rows.filter((x) => x.key !== r.key))}
                        disabled={disabled}
                        aria-label={`Quitar la fila ${i + 1}`}
                        className="inline-flex h-11 w-10 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-blocked-ink md:h-10"
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onChange([...rows, newTierRow()])}
          disabled={!canAdd}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-line px-3 text-sm font-semibold text-ink-strong hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="tier-add"
        >
          <Plus size={16} aria-hidden /> Agregar fila
        </button>
        {rows.length > 0 && !lastHasMax && (
          <span className="text-xs text-ink-muted">Para agregar otra fila, ponga un máximo a la última.</span>
        )}
      </div>
    </section>
  );
}
