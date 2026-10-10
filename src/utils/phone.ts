// Teléfonos internacionales (Plan Correcciones v2, C4).
// Se guardan en E.164 SIN "+", solo dígitos (p. ej. "526671234567"): es la llave
// con la que n8n identificará al cliente de WhatsApp. Ese formato NO cambia.

import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from "libphonenumber-js/min";
import examples from "libphonenumber-js/examples.mobile.json";

export type { CountryCode };

export const DEFAULT_COUNTRY: CountryCode = "MX";

/** Primero México y los países con más clientes probables; después, el resto por nombre. */
const PRIORITY: CountryCode[] = ["MX", "US", "CA", "GT", "CO", "ES"];

export interface CountryOption {
  code: CountryCode;
  name: string;
  dial: string; // "52"
}

let cache: { priority: CountryOption[]; rest: CountryOption[] } | null = null;

export function countryOptions(): { priority: CountryOption[]; rest: CountryOption[] } {
  if (cache) return cache;
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(["es"], { type: "region" });
  } catch {
    names = null;
  }
  const opt = (code: CountryCode): CountryOption => ({
    code,
    name: names?.of(code) ?? code,
    dial: getCountryCallingCode(code),
  });
  const priority = PRIORITY.map(opt);
  const rest = getCountries()
    .filter((c) => !PRIORITY.includes(c))
    .map(opt)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  cache = { priority, rest };
  return cache;
}

/** Dígitos que espera el número nacional del país (según su número de ejemplo). */
export function expectedLength(country: CountryCode): number | null {
  const ex = getExampleNumber(country, examples);
  return ex ? String(ex.nationalNumber).length : null;
}

/** Ejemplo con formato para el placeholder: "222 123 4567". */
export function examplePlaceholder(country: CountryCode): string {
  return getExampleNumber(country, examples)?.formatNational() ?? "";
}

/** Formatea mientras se escribe (sin la lada del país). */
export function formatAsYouType(national: string, country: CountryCode): string {
  const digits = national.replace(/\D/g, "");
  if (!digits) return "";
  return new AsYouType(country).input(digits);
}

/**
 * Detecta un número pegado completo ("+52 1 667…", "0052…", "+1 (555)…").
 * Devuelve país y número nacional, o null si no trae lada internacional.
 */
export function splitInternational(raw: string): { country: CountryCode; national: string } | null {
  const trimmed = raw.trim();
  const intl = trimmed.startsWith("+") ? trimmed : trimmed.startsWith("00") ? `+${trimmed.slice(2)}` : null;
  if (!intl) return null;
  const parsed = parsePhoneNumberFromString(intl);
  if (!parsed?.country) return null;
  return { country: parsed.country, national: String(parsed.nationalNumber) };
}

export type PhoneCheck =
  | { ok: true; e164: string }
  | { ok: false; reason: "EMPTY" | "TOO_SHORT" | "TOO_LONG" | "INVALID"; missing?: number };

/** Valida el número nacional para el país elegido y lo devuelve en E.164 sin "+". */
export function checkPhone(national: string, country: CountryCode): PhoneCheck {
  const digits = national.replace(/\D/g, "");
  if (!digits) return { ok: false, reason: "EMPTY" };
  const lengthProblem = validatePhoneNumberLength(digits, country);
  if (lengthProblem === "TOO_SHORT") {
    const expected = expectedLength(country);
    return { ok: false, reason: "TOO_SHORT", missing: expected ? Math.max(1, expected - digits.length) : undefined };
  }
  if (lengthProblem === "TOO_LONG") return { ok: false, reason: "TOO_LONG" };
  const parsed = parsePhoneNumberFromString(digits, country);
  if (!parsed || !parsed.isValid()) return { ok: false, reason: "INVALID" };
  return { ok: true, e164: parsed.number.slice(1) };
}

/** Mensaje en lenguaje claro para cada problema. */
export function phoneMessage(check: PhoneCheck): string | null {
  if (check.ok) return null;
  switch (check.reason) {
    case "EMPTY":
      return "Escriba el número.";
    case "TOO_SHORT":
      return check.missing ? `Faltan ${check.missing} ${check.missing === 1 ? "dígito" : "dígitos"}.` : "Faltan dígitos.";
    case "TOO_LONG":
      return "Sobran dígitos para ese país. Revise la lada seleccionada.";
    case "INVALID":
      return "El número no existe para ese país. Revise la lada o los primeros dígitos.";
  }
}

/** Separa un teléfono guardado ("526671234567") en país + número nacional. */
export function splitStored(stored: string): { country: CountryCode; national: string } {
  const parsed = stored ? parsePhoneNumberFromString(`+${stored.replace(/\D/g, "")}`) : undefined;
  if (parsed?.country) return { country: parsed.country, national: String(parsed.nationalNumber) };
  return { country: DEFAULT_COUNTRY, national: stored.replace(/\D/g, "") };
}

/** Para mostrar: "526671234567" → "+52 667 123 4567". Si no se reconoce, devuelve el original. */
export function formatPhone(stored: string | null | undefined): string {
  if (!stored) return "—";
  const parsed = parsePhoneNumberFromString(`+${stored.replace(/\D/g, "")}`);
  return parsed ? parsed.formatInternational() : stored;
}

/**
 * Compatibilidad: normaliza texto libre a E.164 sin "+".
 * Con lada internacional ("+", "00") la respeta; si no, usa el país dado (México por defecto).
 */
export function normalizePhone(raw: string, country: CountryCode = DEFAULT_COUNTRY): string | null {
  const split = splitInternational(raw);
  const check = split ? checkPhone(split.national, split.country) : checkPhone(raw, country);
  return check.ok ? check.e164 : null;
}
