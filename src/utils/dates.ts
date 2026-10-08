// Fechas en la ZONA HORARIA OPERATIVA del negocio (business_settings.timezone),
// no en la del navegador ni en UTC (Spec-Kit §3.1, D-08).

import { TZDate } from "@date-fns/tz";
import { differenceInCalendarDays, format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Semáforo de la fecha pactada (BRD criterio 2, SRS Fase 3 §3.2):
 *   OVERDUE  → la hora pactada ya pasó
 *   TODAY    → vence hoy (más tarde)
 *   TOMORROW → vence mañana
 *   ON_TIME  → pasado mañana o después
 *   INVALID  → sin fecha o fecha ilegible (nunca se inventa una categoría)
 */
export type Urgency = "OVERDUE" | "TODAY" | "TOMORROW" | "ON_TIME" | "INVALID";

export function urgencyOf(iso: string | null | undefined, now: Date, timezone: string): Urgency {
  if (!iso) return "INVALID";
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return "INVALID";
  if (due.getTime() < now.getTime()) return "OVERDUE";

  const days = differenceInCalendarDays(
    new TZDate(due.getTime(), timezone),
    new TZDate(now.getTime(), timezone),
  );
  if (days <= 0) return "TODAY";
  if (days === 1) return "TOMORROW";
  return "ON_TIME";
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  OVERDUE: "VENCIDO",
  TODAY: "VENCE HOY",
  TOMORROW: "VENCE MAÑANA",
  ON_TIME: "EN TIEMPO",
  INVALID: "FECHA INVÁLIDA",
};

/** "08/10/2026 14:30" en la zona operativa. */
export function formatDateTime(iso: string | null | undefined, timezone: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(new TZDate(d.getTime(), timezone), "dd/MM/yyyy HH:mm");
}

/** "miércoles 8 de octubre, 14:30" en la zona operativa. */
export function formatDateLong(iso: string | null | undefined, timezone: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(new TZDate(d.getTime(), timezone), "EEEE d 'de' MMMM, HH:mm", { locale: es });
}

/**
 * Valor para <input type="datetime-local"> ("2026-10-08T14:30"), expresado en
 * la zona operativa aunque el navegador esté en otra.
 */
export function toDateTimeLocal(iso: string, timezone: string): string {
  return format(new TZDate(new Date(iso).getTime(), timezone), "yyyy-MM-dd'T'HH:mm");
}

/**
 * Interpreta "2026-10-08T14:30" como hora de la zona operativa y devuelve el
 * instante en ISO UTC para la base. null si el texto no es válido.
 */
export function fromDateTimeLocal(value: string, timezone: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const date = new TZDate(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), 0, timezone);
  return Number.isNaN(date.getTime()) ? null : new Date(date.getTime()).toISOString();
}
