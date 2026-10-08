// Componentes base del panel. Solo tokens semánticos; ningún color literal.

import { createPortal } from "react-dom";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import type { OrderStatus } from "../lib/types";
import { STATUS_LABEL } from "../lib/types";
import { URGENCY_LABEL, type Urgency } from "../utils/dates";

// ----- Spinner ---------------------------------------------------------------

export function Spinner({ label }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      {label && <span>{label}</span>}
    </span>
  );
}

// ----- Button ----------------------------------------------------------------

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-primary-ink border-2 border-primary hover:brightness-95",
  secondary: "bg-surface-0 text-ink-strong border-2 border-line-strong hover:bg-surface-2",
  danger: "bg-danger text-danger-ink border-2 border-danger hover:brightness-110",
  ghost: "bg-transparent text-ink-base border-2 border-transparent hover:bg-surface-2",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  loadingLabel?: string;
}

export function Button({
  variant = "primary",
  loading = false,
  loadingLabel,
  disabled,
  children,
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-line disabled:bg-disabled disabled:text-disabled-ink ${VARIANT[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Spinner label={loadingLabel ?? "Procesando…"} /> : children}
    </button>
  );
}

// ----- Campos de formulario -------------------------------------------------

interface FieldShellProps {
  label: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

export function FieldShell({ label, error, hint, required, children }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-ink-strong">
        {label}
        {required && <span aria-hidden className="text-brand-accent"> *</span>}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-semibold text-blocked-ink">
          [!] {error}
        </p>
      )}
    </div>
  );
}

const CONTROL =
  "min-h-10 rounded-md border bg-surface-0 px-3 py-2 text-sm text-ink-strong outline-none " +
  "focus:border-line-strong disabled:bg-surface-2 disabled:text-ink-muted";

function controlClass(invalid: boolean) {
  return `${CONTROL} ${invalid ? "border-2 border-blocked-line" : "border-line"}`;
}

type FieldBase = { label: string; error?: string | null; hint?: string };

export const TextField = forwardRef<HTMLInputElement, FieldBase & InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ label, error, hint, required, className = "", ...rest }, ref) {
    return (
      <FieldShell label={label} error={error} hint={hint} required={required}>
        {({ id, describedBy, invalid }) => (
          <input
            ref={ref}
            id={id}
            required={required}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={`${controlClass(invalid)} ${className}`}
            {...rest}
          />
        )}
      </FieldShell>
    );
  },
);

export function SelectField({
  label,
  error,
  hint,
  required,
  children,
  className = "",
  ...rest
}: FieldBase & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={`${controlClass(invalid)} ${className}`}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  required,
  className = "",
  ...rest
}: FieldBase & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={`${controlClass(invalid)} min-h-20 ${className}`}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

// ----- Modal -----------------------------------------------------------------

interface ModalProps {
  title: string;
  onClose: () => void;
  /** Mientras está bloqueado (p. ej. un cobro en curso) no se puede cerrar. */
  locked?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
}

export function Modal({ title, onClose, locked = false, children, footer, testId }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    return () => previous?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !locked) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, onClose]);

  // Portal a <body>: un modal con formulario nunca queda anidado dentro de otro
  // <form> (HTML no admite formularios anidados y el envío se va al de afuera).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden
        className="absolute inset-0 bg-[var(--overlay-backdrop)] opacity-50"
        onClick={() => !locked && onClose()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={testId}
        className="relative flex max-h-[85vh] w-full max-w-[648px] flex-col rounded-md border-2 border-line-strong bg-surface-0 shadow-[var(--shadow-2)]"
      >
        <header className="flex items-center justify-between border-b border-line px-8 py-4">
          <h2 id={titleId} className="text-lg font-bold text-ink-strong">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            aria-label="Cerrar"
            className="rounded px-2 text-xl text-ink-muted hover:text-ink-strong disabled:opacity-40"
          >
            ×
          </button>
        </header>
        <div className="overflow-y-auto px-8 py-6">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-3 border-t border-line px-8 py-4">{footer}</footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ----- Insignias -------------------------------------------------------------

/** Semáforo con redundancia estructural: borde + etiqueta, no solo color. */
export const URGENCY_CARD: Record<Urgency, string> = {
  OVERDUE: "border-4 border-blocked-line",
  TODAY: "border-4 border-blocked-line",
  TOMORROW: "border-2 border-dashed border-warning-line",
  ON_TIME: "border border-line",
  INVALID: "border-4 border-double border-line-strong",
};

const URGENCY_BADGE: Record<Urgency, string> = {
  OVERDUE: "bg-blocked text-blocked-ink border border-blocked-line",
  TODAY: "bg-blocked text-blocked-ink border border-blocked-line",
  TOMORROW: "bg-warning text-warning-ink border border-dashed border-warning-line",
  ON_TIME: "bg-cleared text-cleared-ink border border-cleared-line",
  INVALID: "bg-surface-2 text-ink-strong border-2 border-double border-line-strong",
};

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return (
    <span
      className={`inline-block rounded-sm px-2 py-0.5 text-[11px] font-bold tracking-wide ${URGENCY_BADGE[urgency]}`}
    >
      {urgency === "INVALID" ? "[!] " : ""}
      {URGENCY_LABEL[urgency]}
    </span>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className="inline-block rounded-sm border border-line bg-surface-2 px-2 py-0.5 text-xs font-semibold text-ink-strong">
      {STATUS_LABEL[status]}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border-2 border-dashed border-line bg-surface-0 p-6 text-center text-sm text-ink-muted">
      {children}
    </div>
  );
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-4 rounded-md border-2 border-blocked-line bg-blocked p-4 text-sm text-blocked-ink">
      <span>
        <strong>[!]</strong> {message}
      </span>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
