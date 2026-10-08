// Cantidades de insumos (hasta 4 decimales) y porcentajes. Igual que el dinero:
// se validan como texto y se comparan en enteros BigInt, nunca en flotante.

export type QtyParse = { ok: true; value: string } | { ok: false; error: string };

export function parseQuantity(
  raw: string,
  { decimals = 4, allowZero = false, label = "La cantidad" }: { decimals?: number; allowZero?: boolean; label?: string } = {},
): QtyParse {
  const clean = raw.trim().replace(/[,\s]/g, "");
  if (clean === "") return { ok: false, error: `${label} es obligatoria.` };
  const re = new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`);
  if (!re.test(clean)) return { ok: false, error: `${label} debe ser un número con máximo ${decimals} decimales.` };
  const scaled = toScaled(clean, decimals);
  if (scaled === null || (!allowZero && scaled === 0n)) return { ok: false, error: `${label} debe ser mayor a 0.` };
  return { ok: true, value: clean };
}

/** "1.5" con 4 decimales → 15000n. null si el formato no es válido. */
export function toScaled(value: string, decimals = 4): bigint | null {
  if (!/^-?\d+(\.\d+)?$/.test(value)) return null;
  const negative = value.startsWith("-");
  const [i = "0", d = ""] = value.replace("-", "").split(".");
  if (d.length > decimals) return null;
  const v = BigInt(i) * 10n ** BigInt(decimals) + BigInt((d + "0".repeat(decimals)).slice(0, decimals));
  return negative ? -v : v;
}

export function compareQty(a: string, b: string): number {
  const x = toScaled(a) ?? 0n;
  const y = toScaled(b) ?? 0n;
  return x === y ? 0 : x > y ? 1 : -1;
}

/** "6.8040" → "6.804"; "20.0000" → "20". Solo formato. */
export function formatQty(value: string | null | undefined): string {
  if (value == null || !/^-?\d+(\.\d+)?$/.test(value)) return "—";
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}

/** Porcentaje "89.00" → "89.00 %"; null → "—". */
export function formatPct(value: string | null | undefined): string {
  return value == null ? "—" : `${value} %`;
}

export function isNegative(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().startsWith("-") && (toScaled(value) ?? 0n) < 0n;
}
