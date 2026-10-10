// Alta y edición de clientes. Se usa en /clientes y en el alta rápida del pedido.

import { useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabaseClient";
import { toAppError } from "../../lib/errors";
import type { Customer, PricingTier } from "../../lib/types";
import { TIER_LABEL } from "../../lib/types";
import { Button, SelectField, TextAreaField, TextField } from "../../components/ui";
import { PhoneField, type PhoneValue } from "../../components/PhoneField";
import { checkPhone, phoneMessage, splitStored, DEFAULT_COUNTRY } from "../../utils/phone";

// El teléfono se guarda en E.164 sin "+" (llave de n8n); ver utils/phone.ts.
export { normalizePhone } from "../../utils/phone";

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
  const [phone, setPhone] = useState<PhoneValue>(() =>
    customer ? splitStored(customer.phone_number) : { country: DEFAULT_COUNTRY, national: "" },
  );
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

    const check = checkPhone(phone.national, phone.country);
    const normalized = check.ok ? check.e164 : null;
    const next: typeof errors = {};
    if (!check.ok) next.phone = phoneMessage(check) ?? "Teléfono inválido.";
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
      if (appError.code === "DUPLICATE") {
        // Se dice con quién choca, junto al campo, para no duplicar al cliente.
        const { data: existing } = await supabase.from("customers").select("full_name").eq("phone_number", normalized).maybeSingle();
        setErrors({
          phone: existing
            ? `Este teléfono ya está registrado a nombre de «${(existing as { full_name: string }).full_name}».`
            : "Ya existe un cliente con ese teléfono.",
        });
      } else {
        setErrors({ server: appError.userText });
      }
      return;
    }
    toast.success(customer ? "Cliente actualizado." : "Cliente registrado.");
    onSaved(result.data as Customer);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" data-testid="customer-form">
      <PhoneField
        label="Teléfono (WhatsApp)"
        value={phone}
        onChange={(v) => {
          setPhone(v);
          if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
        }}
        error={errors.phone}
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
        <label className="flex min-h-11 items-center gap-3 text-sm text-ink-strong md:min-h-0 md:gap-2">
          <input type="checkbox" className="h-5 w-5 shrink-0" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={saving} />
          Cliente activo (un cliente inactivo no puede recibir pedidos nuevos; conserva su historial)
        </label>
      )}
      {errors.server && (
        <p role="alert" className="text-sm font-semibold text-blocked-ink">
          [!] {errors.server}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end md:gap-3">
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
