// Utilidades de dinero. SOLO formato y validación de entrada.
//
// El panel nunca calcula totales, saldos ni anticipos: eso lo hace la base.
// Todo se maneja como string o como entero de centavos (BigInt), nunca como
// número de punto flotante.

import type { Money } from "../lib/types";

const DECIMAL_RE = /^-?\d+(\.\d+)?$/;

/** "1250.5" → "$1,250.50". Sin pasar por Number: no hay errores de redondeo. */
export function formatMoney(value: Money | null | undefined): string {
  if (value == null || !DECIMAL_RE.test(value)) return "—";
  const negative = value.startsWith("-");
  const [intPart = "0", decPart = ""] = value.replace("-", "").split(".");
  const cents = (decPart + "00").slice(0, 2);
  const grouped = intPart.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${grouped}.${cents}`;
}

/** Convierte un decimal en centavos exactos. null si el formato no es válido. */
export function toCents(value: string): bigint | null {
  if (!DECIMAL_RE.test(value)) return null;
  const negative = value.startsWith("-");
  const [intPart = "0", decPart = ""] = value.replace("-", "").split(".");
  if (decPart.length > 2) return null;
  const cents = BigInt(intPart) * 100n + BigInt((decPart + "00").slice(0, 2));
  return negative ? -cents : cents;
}

export type AmountParse = { ok: true; value: Money } | { ok: false; error: string };

/**
 * Valida lo que el usuario escribe como monto ("$1,250.5", "250", "250.50").
 * Devuelve el decimal normalizado para enviarlo a la RPC.
 */
export function parseAmountInput(raw: string): AmountParse {
  const clean = raw.trim().replace(/[$,\s]/g, "");
  if (clean === "") return { ok: false, error: "Ingrese un monto." };
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) {
    return { ok: false, error: "Monto inválido: use números con máximo dos decimales." };
  }
  const cents = toCents(clean);
  if (cents == null || cents <= 0n) return { ok: false, error: "El monto debe ser mayor a 0." };
  const whole = cents / 100n;
  const frac = (cents % 100n).toString().padStart(2, "0");
  return { ok: true, value: `${whole}.${frac}` };
}

/** a > b, comparando centavos exactos. */
export function isGreater(a: Money, b: Money): boolean {
  const ca = toCents(a);
  const cb = toCents(b);
  return ca != null && cb != null && ca > cb;
}

export function isZero(value: Money): boolean {
  return toCents(value) === 0n;
}
