// Alta y edición de clientes. Se usa en /clientes y en el alta rápida del pedido.

import { useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabaseClient";
import { toAppError } from "../../lib/errors";
import type { Customer, PricingTier } from "../../lib/types";
import { TIER_LABEL } from "../../lib/types";
import { Button, SelectField, TextAreaField, TextField } from "../../components/ui";

/**
 * Normaliza a E.164 sin "+": solo dígitos. Un número mexicano de 10 dígitos
 * recibe el prefijo 52. Es la llave con la que n8n identificará al cliente.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const full = digits.length === 10 ? `52${digits}` : digits;
  return /^\d{10,15}$/.test(full) ? full : null;
}

const CUSTOMER_SELECT = "id, phone_number, full_name, pricing_tier, is_active, notes, created_at";

export function CustomerForm({
  customer,
  onSaved,
  onCancel,
}: {
  customer?: Customer;
  onSaved: (customer: Customer) => void;
  onCancel?: () => void;
}) {
  const [phone, setPhone] = useState(customer?.phone_number ?? "");
  const [name, setName] = useState(customer?.full_name ?? "");
  const [tier, setTier] = useState<PricingTier>(customer?.pricing_tier ?? "RETAIL");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [active, setActive] = useState(customer?.is_active ?? true);
  const [errors, setErrors] = useState<{ phone?: string; name?: string; server?: string }>({});
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    e.stopPropagation(); // puede vivir dentro de otro formulario
    if (inFlight.current) return;

    const normalized = normalizePhone(phone);
    const next: typeof errors = {};
    if (!normalized) next.phone = "Teléfono inválido: 10 dígitos (México) o el número completo con lada internacional.";
    if (!name.trim()) next.name = "El nombre es obligatorio.";
    setErrors(next);
    if (next.phone || next.name || !normalized) return;

    inFlight.current = true;
    setSaving(true);
    const payload = {
      phone_number: normalized,
      full_name: name.trim(),
      pricing_tier: tier,
      notes: notes.trim() || null,
      ...(customer ? { is_active: active } : {}),
    };
    const result = customer
      ? await supabase.from("customers").update(payload).eq("id", customer.id).select(CUSTOMER_SELECT).single()
      : await supabase.from("customers").insert(payload).select(CUSTOMER_SELECT).single();
    inFlight.current = false;
    setSaving(false);

    if (result.error) {
      const appError = toAppError(result.error);
      setErrors({
        server: appError.code === "DUPLICATE" ? "Ya existe un cliente con ese teléfono." : appError.userText,
      });
      return;
    }
    toast.success(customer ? "Cliente actualizado." : "Cliente registrado.");
    onSaved(result.data as Customer);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" data-testid="customer-form">
      <TextField
        label="Teléfono (WhatsApp)"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={errors.phone}
        hint="10 dígitos; se guarda con lada 52."
        disabled={saving}
        required
      />
      <TextField
        label="Nombre o razón social"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        maxLength={150}
        disabled={saving}
        required
      />
      <SelectField
        label="Tarifa"
        value={tier}
        onChange={(e) => setTier(e.target.value as PricingTier)}
        hint="Mayoreo aplica precio de mayoreo en todos sus pedidos (BRD regla 1)."
        disabled={saving}
      >
        {(Object.keys(TIER_LABEL) as PricingTier[]).map((t) => (
          <option key={t} value={t}>
            {TIER_LABEL[t]}
          </option>
        ))}
      </SelectField>
      <TextAreaField label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={saving} />
      {customer && (
        <label className="flex items-center gap-2 text-sm text-ink-strong">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={saving} />
          Cliente activo (un cliente inactivo no puede recibir pedidos nuevos; conserva su historial)
        </label>
      )}
      {errors.server && (
        <p role="alert" className="text-sm font-semibold text-blocked-ink">
          [!] {errors.server}
        </p>
      )}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={saving} loadingLabel="Guardando…">
          {customer ? "Guardar cambios" : "Registrar cliente"}
        </Button>
      </div>
    </form>
  );
}
