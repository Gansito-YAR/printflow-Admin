// Campo de teléfono con lada internacional (Plan Correcciones v2, C4).
// - Selector de país compacto ("MX +52"); México por defecto.
// - Formato por país mientras se escribe y teclado numérico.
// - Si se pega un número completo (+52…, 0052…, +1…) separa la lada sola.
// - Validación en vivo con mensajes claros y vista previa de cómo se guarda.

import { useId, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import {
  checkPhone,
  countryOptions,
  examplePlaceholder,
  formatAsYouType,
  formatPhone,
  phoneMessage,
  splitInternational,
  type CountryCode,
} from "../utils/phone";

export interface PhoneValue {
  country: CountryCode;
  national: string; // solo dígitos
}

export function PhoneField({
  label,
  value,
  onChange,
  error,
  disabled,
  required,
}: {
  label: string;
  value: PhoneValue;
  onChange: (value: PhoneValue) => void;
  error?: string | null;
  disabled?: boolean;
  required?: boolean;
}) {
  const id = useId();
  const statusId = `${id}-status`;
  const [touched, setTouched] = useState(false);
  const { priority, rest } = useMemo(() => countryOptions(), []);
  const current = [...priority, ...rest].find((c) => c.code === value.country);

  const check = checkPhone(value.national, value.country);
  const liveMessage = touched || value.national.length > 0 ? phoneMessage(check) : null;
  // El error del envío manda; si no, el aviso en vivo (sin marcar en rojo mientras escribe).
  const shownError = error ?? null;
  const invalid = Boolean(shownError);

  function onInput(raw: string) {
    const split = splitInternational(raw);
    if (split) {
      onChange({ country: split.country, national: split.national });
      return;
    }
    let digits = raw.replace(/\D/g, "");
    // Borrar un separador del formato ("(", ")", espacio, guion) no quita dígitos y el
    // formato lo volvería a poner: en ese caso se borra el dígito anterior.
    const shown = formatAsYouType(value.national, value.country);
    if (raw.length < shown.length && digits === value.national) digits = digits.slice(0, -1);
    onChange({ country: value.country, national: digits.slice(0, 15) });
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-ink-strong">
        {label}
        {required && <span aria-hidden className="text-brand-accent"> *</span>}
      </label>
      <div className="flex gap-2">
        {/* Selector nativo (accesible y cómodo en celular) con vista compacta encima. */}
        <div
          className={`relative flex min-h-11 shrink-0 items-center gap-1 rounded-md border bg-surface-0 px-3 text-base text-ink-strong focus-within:border-line-strong md:min-h-10 md:text-sm ${
            invalid ? "border-2 border-blocked-line" : "border-line"
          } ${disabled ? "bg-surface-2 text-ink-muted" : ""}`}
        >
          <span className="font-semibold">{value.country}</span>
          <span className="tabular text-ink-base">+{current?.dial}</span>
          <ChevronDown size={16} aria-hidden className="text-ink-muted" />
          <select
            aria-label="País y lada"
            value={value.country}
            onChange={(e) => onChange({ country: e.target.value as CountryCode, national: value.national })}
            disabled={disabled}
            className="absolute inset-0 cursor-pointer opacity-0"
            data-testid="phone-country"
          >
            <optgroup label="Frecuentes">
              {priority.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} (+{c.dial})
                </option>
              ))}
            </optgroup>
            <optgroup label="Todos los países">
              {rest.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} (+{c.dial})
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={formatAsYouType(value.national, value.country)}
          onChange={(e) => onInput(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={examplePlaceholder(value.country)}
          disabled={disabled}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={statusId}
          className={`min-h-11 w-full min-w-0 rounded-md border bg-surface-0 px-3 py-2 text-base tabular text-ink-strong outline-none focus:border-line-strong disabled:bg-surface-2 disabled:text-ink-muted md:min-h-10 md:text-sm ${
            invalid ? "border-2 border-blocked-line" : "border-line"
          }`}
          data-testid="phone-input"
        />
      </div>
      <p id={statusId} aria-live="polite" className="min-h-4 text-xs">
        {shownError ? (
          <span role="alert" className="font-semibold text-blocked-ink">
            [!] {shownError}
          </span>
        ) : check.ok ? (
          <span className="inline-flex items-center gap-1 font-semibold text-cleared-ink" data-testid="phone-preview">
            <CheckCircle2 size={14} aria-hidden />
            Se guardará como {formatPhone(check.e164)}
          </span>
        ) : liveMessage && touched ? (
          <span className="text-warning-ink">{liveMessage}</span>
        ) : (
          <span className="text-ink-muted">
            {liveMessage ?? "Número de WhatsApp. Puede pegarlo completo con la lada (+52…)."}
          </span>
        )}
      </p>
    </div>
  );
}
