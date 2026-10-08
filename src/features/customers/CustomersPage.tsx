// Catálogo de clientes (ADM-08). Sin borrado: un cliente se desactiva (soft delete).

import { useEffect, useState } from "react";
import type { Customer } from "../../lib/types";
import { TIER_LABEL } from "../../lib/types";
import { searchCustomers } from "../../lib/queries";
import { toAppError } from "../../lib/errors";
import { Button, EmptyState, ErrorPanel, Modal, Spinner, TextField } from "../../components/ui";
import { DataList } from "../../components/DataList";
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink-strong">Clientes</h1>
          <p className="text-sm text-ink-muted">Se muestran hasta 50 resultados.</p>
        </div>
        <Button onClick={() => setEditing("new")}>+ Cliente nuevo</Button>
      </div>
      <div className="w-full sm:w-80">
        <TextField enterKeyHint="search" autoComplete="off" label="Buscar" placeholder="Nombre o teléfono" value={term} onChange={(e) => setTerm(e.target.value)} />
      </div>
      {error && <ErrorPanel message={error} onRetry={() => setVersion((v) => v + 1)} />}
      {loading ? (
        <Spinner label="Cargando…" />
      ) : rows.length === 0 ? (
        <EmptyState>Sin clientes.</EmptyState>
      ) : (
        <DataList
          label="Clientes"
          testId="customers-table"
          rows={rows}
          rowKey={(c) => c.id}
          columns={[
            { key: "name", header: "Nombre", primary: true, render: (c) => <span className="font-semibold text-ink-strong">{c.full_name}</span> },
            { key: "phone", header: "Teléfono", render: (c) => <span className="tabular">{c.phone_number}</span> },
            { key: "tier", header: "Tarifa", render: (c) => TIER_LABEL[c.pricing_tier] },
            { key: "active", header: "Estado", render: (c) => (c.is_active ? "Activo" : "Inactivo") },
          ]}
          actions={(c) => (
            <Button variant="secondary" className="md:border-transparent md:bg-transparent" onClick={() => setEditing(c)}>
              Editar
            </Button>
          )}
        />
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
