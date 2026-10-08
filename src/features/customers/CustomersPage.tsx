// Catálogo de clientes (ADM-08). Sin borrado: un cliente se desactiva (soft delete).

import { useEffect, useState } from "react";
import type { Customer } from "../../lib/types";
import { TIER_LABEL } from "../../lib/types";
import { searchCustomers } from "../../lib/queries";
import { toAppError } from "../../lib/errors";
import { Button, EmptyState, ErrorPanel, Modal, Spinner, TextField } from "../../components/ui";
import { CustomerForm } from "./CustomerForm";

export function CustomersPage() {
  const [term, setTerm] = useState("");
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Customer | "new" | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const found = await searchCustomers(term, false);
        if (!cancelled) {
          setRows(found);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(toAppError(err).userText);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [term, version]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink-strong">Clientes</h1>
          <p className="text-sm text-ink-muted">Se muestran hasta 50 resultados.</p>
        </div>
        <Button onClick={() => setEditing("new")}>+ Cliente nuevo</Button>
      </div>
      <div className="w-80">
        <TextField label="Buscar" placeholder="Nombre o teléfono" value={term} onChange={(e) => setTerm(e.target.value)} />
      </div>
      {error && <ErrorPanel message={error} onRetry={() => setVersion((v) => v + 1)} />}
      {loading ? (
        <Spinner label="Cargando…" />
      ) : rows.length === 0 ? (
        <EmptyState>Sin clientes.</EmptyState>
      ) : (
        <table className="w-full rounded-md border border-line bg-surface-0 text-sm">
          <thead className="text-left text-ink-muted">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">Teléfono</th>
              <th className="p-3">Tarifa</th>
              <th className="p-3">Estado</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="p-3 font-semibold text-ink-strong">{c.full_name}</td>
                <td className="p-3 tabular">{c.phone_number}</td>
                <td className="p-3">{TIER_LABEL[c.pricing_tier]}</td>
                <td className="p-3">{c.is_active ? "Activo" : "Inactivo"}</td>
                <td className="p-3 text-right">
                  <Button variant="ghost" onClick={() => setEditing(c)}>
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editing && (
        <Modal title={editing === "new" ? "Cliente nuevo" : "Editar cliente"} onClose={() => setEditing(null)}>
          <CustomerForm
            customer={editing === "new" ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              setVersion((v) => v + 1);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
