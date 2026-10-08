// Selección de cliente para el pedido: búsqueda por nombre o teléfono, con alta
// rápida en el mismo flujo si no existe.

import { useEffect, useState } from "react";
import type { Customer } from "../../lib/types";
import { TIER_LABEL } from "../../lib/types";
import { searchCustomers } from "../../lib/queries";
import { Button, Modal, Spinner, TextField } from "../../components/ui";
import { CustomerForm } from "../customers/CustomerForm";

export function CustomerPicker({
  value,
  onChange,
  disabled,
}: {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  disabled?: boolean;
}) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (value || term.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const found = await searchCustomers(term);
        if (!cancelled) setResults(found);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [term, value]);

  if (value) {
    return (
      <div className="flex flex-col gap-3 rounded-md border-2 border-line-strong bg-surface-0 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-ink-strong">{value.full_name}</p>
          <p className="text-sm text-ink-muted">
            {value.phone_number} · Tarifa {TIER_LABEL[value.pricing_tier]}
          </p>
        </div>
        <Button variant="secondary" onClick={() => onChange(null)} disabled={disabled}>
          Cambiar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
        <div className="flex-1">
          <TextField
            label="Buscar cliente"
            placeholder="Nombre o teléfono (mínimo 2 caracteres)"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            disabled={disabled}
            data-testid="input-customer-search"
          />
        </div>
        <Button variant="secondary" onClick={() => setCreating(true)} disabled={disabled}>
          + Cliente nuevo
        </Button>
      </div>

      {searching && <Spinner label="Buscando…" />}
      {!searching && term.trim().length >= 2 && results.length === 0 && (
        <p className="text-sm text-ink-muted">Sin coincidencias. Puede registrarlo como cliente nuevo.</p>
      )}
      {results.length > 0 && (
        <ul className="divide-y divide-line rounded-md border border-line bg-surface-0" role="listbox">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onChange(c)}
                className="flex min-h-11 w-full flex-col items-start justify-between gap-0.5 px-4 py-2 text-left hover:bg-surface-2 sm:flex-row sm:items-center"
              >
                <span className="font-semibold text-ink-strong">{c.full_name}</span>
                <span className="text-sm text-ink-muted">
                  {c.phone_number} · {TIER_LABEL[c.pricing_tier]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <Modal title="Cliente nuevo" onClose={() => setCreating(false)}>
          <CustomerForm
            onCancel={() => setCreating(false)}
            onSaved={(c) => {
              setCreating(false);
              onChange(c);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
