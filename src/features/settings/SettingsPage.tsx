// Configuración del negocio (D-07, D-08, M4-D-07). Solo ADMIN (RLS).

import { useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { toAppError } from "../../lib/errors";
import { useSettingsStore } from "../../store/settings";
import { parseQuantity } from "../../utils/quantity";
import { Button, SelectField, TextField } from "../../components/ui";

const TIMEZONES = ["America/Mexico_City", "America/Monterrey", "America/Mazatlan", "America/Hermosillo", "America/Tijuana", "America/Cancun"];

export function SettingsPage() {
  const settings = useSettingsStore();
  const [deposit, setDeposit] = useState(settings.deposit_pct);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [negative, setNegative] = useState(settings.allow_negative_stock);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    const d = parseQuantity(deposit, { decimals: 2, allowZero: true, label: "El anticipo" });
    if (!d.ok) return setError(d.error);
    if (Number(d.value) > 100) return setError("El anticipo no puede ser mayor a 100 %.");
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await settings.save({ deposit_pct: d.value, timezone, allow_negative_stock: negative });
      toast.success("Configuración guardada.");
    } catch (err) {
      setError(toAppError(err).userText);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto flex max-w-2xl flex-col gap-6" data-testid="settings-form">
      <div>
        <h1 className="text-xl font-bold text-ink-strong">Configuración</h1>
        <p className="text-sm text-ink-muted">Reglas del negocio que aplica la base de datos a todos los pedidos.</p>
      </div>
      <section className="flex flex-col gap-4 rounded-md border border-line bg-surface-0 p-6">
        <TextField
          label="Anticipo mínimo para iniciar producción (%)"
          inputMode="decimal"
          value={deposit}
          onChange={(e) => setDeposit(e.target.value)}
          hint="BRD: 50 % por defecto. Aplica a los pedidos que pasen a producción desde ahora."
          disabled={saving}
        />
        <SelectField
          label="Zona horaria operativa"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          hint="Define 'hoy', 'mañana' y 'vencido' en el tablero y en la ruta del instalador."
          disabled={saving}
        >
          {(TIMEZONES.includes(settings.timezone) ? TIMEZONES : [settings.timezone, ...TIMEZONES]).map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </SelectField>
        <label className="flex items-start gap-2 text-sm text-ink-strong">
          <input type="checkbox" className="mt-1" checked={negative} onChange={(e) => setNegative(e.target.checked)} disabled={saving} />
          <span>
            Permitir producir aunque el inventario quede en negativo
            <span className="block text-xs text-ink-muted">
              Recomendado mientras el inventario físico no esté capturado. Si se desactiva, un pedido sin insumos
              suficientes no puede pasar a producción.
            </span>
          </span>
        </label>
      </section>
      {error && (
        <p role="alert" className="text-sm font-semibold text-blocked-ink">
          [!] {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" loading={saving}>
          Guardar configuración
        </Button>
      </div>
    </form>
  );
}
