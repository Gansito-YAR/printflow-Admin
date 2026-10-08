// Traducción de errores de la base a mensajes para el usuario.
//
// REGLA (lección A.4 de la app): se decide por el CÓDIGO estable `PF_*` que
// viene en `message`, nunca leyendo el texto en español. El `details` solo se
// muestra; no se usa para tomar decisiones.

export type ErrorCode =
  | "PF_NOT_FOUND"
  | "PF_FORBIDDEN"
  | "PF_OVERPAYMENT"
  | "PF_ORDER_CLOSED"
  | "PF_DEPOSIT_REQUIRED"
  | "PF_INVALID_TRANSITION"
  | "PF_BALANCE_DUE"
  | "PF_ALREADY_DELIVERED"
  | "PF_REASON_REQUIRED"
  | "PF_REAUTH_REQUIRED"
  | "PF_INVALID_INPUT"
  | "DUPLICATE"
  | "NETWORK"
  | "UNKNOWN";

const MESSAGES: Record<ErrorCode, string> = {
  PF_NOT_FOUND: "No se encontró el registro.",
  PF_FORBIDDEN: "No tiene permiso para esta operación.",
  PF_OVERPAYMENT: "El abono excede el saldo pendiente.",
  PF_ORDER_CLOSED: "El pedido ya está entregado o cancelado.",
  PF_DEPOSIT_REQUIRED: "Falta el anticipo mínimo para iniciar producción.",
  PF_INVALID_TRANSITION: "Ese cambio de estado no está permitido.",
  PF_BALANCE_DUE: "El pedido tiene saldo pendiente.",
  PF_ALREADY_DELIVERED: "La entrega ya había sido registrada.",
  PF_REASON_REQUIRED: "El motivo es obligatorio.",
  PF_REAUTH_REQUIRED: "Confirme su contraseña nuevamente para continuar.",
  PF_INVALID_INPUT: "Revise los datos capturados.",
  DUPLICATE: "Ya existe un registro con esos datos.",
  NETWORK: "Sin conexión con el servidor.",
  UNKNOWN: "Ocurrió un error inesperado.",
};

/** Códigos cuyo `details` es específico y útil para el usuario. */
const SHOW_DETAIL = new Set<ErrorCode>([
  "PF_INVALID_INPUT",
  "PF_OVERPAYMENT",
  "PF_DEPOSIT_REQUIRED",
  "PF_INVALID_TRANSITION",
  "PF_ORDER_CLOSED",
]);

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly detail: string | null;

  constructor(code: ErrorCode, detail: string | null = null) {
    super(MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
    this.detail = detail;
  }

  get isNetwork(): boolean {
    return this.code === "NETWORK";
  }

  /** Texto para mostrar: el detalle si es específico, si no el mensaje general. */
  get userText(): string {
    return SHOW_DETAIL.has(this.code) && this.detail ? this.detail : this.message;
  }
}

interface ErrorLike {
  message?: unknown;
  details?: unknown;
  code?: unknown;
  name?: unknown;
}

const PF_CODES = new Set<string>(
  Object.keys(MESSAGES).filter((c) => c.startsWith("PF_")),
);

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  const e = (err ?? {}) as ErrorLike;
  const message = typeof e.message === "string" ? e.message : "";
  const details = typeof e.details === "string" ? e.details : null;
  const code = typeof e.code === "string" ? e.code : "";

  if (PF_CODES.has(message)) return new AppError(message as ErrorCode, details);

  // Fallo de red: fetch lanza TypeError, supabase-js lo envuelve en el mensaje.
  if (
    err instanceof TypeError ||
    /failed to fetch|networkerror|load failed|network request failed/i.test(message)
  ) {
    return new AppError("NETWORK");
  }

  if (code === "42501") return new AppError("PF_FORBIDDEN");
  if (code === "23505") return new AppError("DUPLICATE", details);

  return new AppError("UNKNOWN", message || null);
}
