// Insumos e inventario (M4-ADM-02..04). CONFIDENCIAL: costos solo para ADMIN.
// El stock y el costo promedio (CPP) los calcula la base a partir de los
// movimientos; aquí solo se registran movimientos.

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { rpc } from "../../lib/rpc";
import { fetchKardex, fetchMaterials } from "../../lib/queries";
import { toAppError } from "../../lib/errors";
import type { InventoryTx, Material, MaterialUnit } from "../../lib/types";
import { MATERIAL_UNIT_LABEL, TX_LABEL } from "../../lib/types";
import { useSettingsStore } from "../../store/settings";
import { compareQty, formatQty, isNegative, parseQuantity } from "../../utils/quantity";
import { formatDateTime } from "../../utils/dates";
import { Button, EmptyState, ErrorPanel, Modal, SelectField, Spinner, TextAreaField, TextField } from "../../components/ui";

type Movement = "restock" | "waste" | "adjust" | "cost";

const MOVEMENT_TITLE: Record<Movement, string> = {
  restock: "Reabastecer",
  waste: "Registrar merma",
  adjust: "Conteo físico",
  cost: "Corregir costo promedio",
};

function lowStock(m: Material): boolean {
  return m.min_stock !== null && compareQty(m.current_stock, m.min_stock) <= 0;
}

export function MaterialsPage() {
  const [rows, setRows] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ACTIVE" | "LOW" | "ALL">("ACTIVE");
  const [editing, setEditing] = useState<Material | "new" | null>(null);
  const [moving, setMoving] = useState<{ material: Material; kind: Movement } | null>(null);
  const [kardexOf, setKardexOf] = useState<Material | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await fetchMaterials(false));
      setError(null);
    } catch (err) {
      setError(toAppError(err).userText);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () =>
      rows.filter((m) =>
        filter === "ALL" ? true : filter === "LOW" ? m.is_active && lowStock(m) : m.is_active,
      ),
    [rows, filter],
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink-strong">Insumos e inventario</h1>
          <p className="text-sm text-ink-muted">
            El costo unitario es el promedio ponderado de las compras. Existencias y costo cambian solo con movimientos.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>+ Insumo</Button>
      </div>

      <div className="w-56">
        <SelectField label="Mostrar" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="ACTIVE">Activos</option>
          <option value="LOW">Bajo stock mínimo</option>
          <option value="ALL">Todos</option>
        </SelectField>
      </div>

      {error && <ErrorPanel message={error} onRetry={() => void load()} />}
      {loading ? (
        <Spinner label="Cargando…" />
      ) : visible.length === 0 ? (
        <EmptyState>
          {rows.length === 0
            ? "Aún no hay insumos. Registre los materiales que usa el taller (lona, vinil, tinta, papel…)."
            : "Sin insumos con este filtro."}
        </EmptyState>
      ) : (
        <table className="w-full rounded-md border border-line bg-surface-0 text-sm" data-testid="materials-table">
          <thead className="text-left text-ink-muted">
            <tr>
              <th className="p-3">SKU</th>
              <th className="p-3">Insumo</th>
              <th className="p-3 text-right">Existencia</th>
              <th className="p-3 text-right">Mínimo</th>
              <th className="p-3 text-right">Costo unitario</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => {
              const low = lowStock(m);
              const negative = isNegative(m.current_stock);
              return (
                <tr key={m.id} className="border-t border-line align-top">
                  <td className="p-3 tabular">{m.sku}</td>
                  <td className="p-3">
                    <span className="font-semibold text-ink-strong">{m.name}</span>
                    {!m.is_active && <span className="ml-2 text-xs text-ink-muted">(inactivo)</span>}
                  </td>
                  <td className="p-3 text-right tabular">
                    <span className={negative || low ? "font-bold text-blocked-ink" : "text-ink-strong"}>
                      {(negative || low) && "[!] "}
                      {formatQty(m.current_stock)} {MATERIAL_UNIT_LABEL[m.unit]}
                    </span>
                    {negative && <span className="block text-xs text-blocked-ink">Negativo: registre un conteo</span>}
                  </td>
                  <td className="p-3 text-right tabular text-ink-muted">
                    {m.min_stock ? `${formatQty(m.min_stock)} ${MATERIAL_UNIT_LABEL[m.unit]}` : "—"}
                  </td>
                  <td className="p-3 text-right tabular">
                    ${m.unit_cost} <span className="text-xs text-ink-muted">/ {MATERIAL_UNIT_LABEL[m.unit]}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button variant="secondary" onClick={() => setMoving({ material: m, kind: "restock" })} disabled={!m.is_active}>
                        Reabastecer
                      </Button>
                      <Button variant="ghost" onClick={() => setMoving({ material: m, kind: "waste" })} disabled={!m.is_active}>
                        Merma
                      </Button>
                      <Button variant="ghost" onClick={() => setMoving({ material: m, kind: "adjust" })}>
                        Conteo
                      </Button>
                      <Button variant="ghost" onClick={() => setKardexOf(m)}>
                        Movimientos
                      </Button>
                      <Button variant="ghost" onClick={() => setEditing(m)}>
                        Editar
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {editing && (
        <Modal title={editing === "new" ? "Insumo nuevo" : "Editar insumo"} onClose={() => setEditing(null)}>
          <MaterialForm
            material={editing === "new" ? undefined : editing}
            onCancel={() => setEditing(null)}
            onCorrectCost={(m) => {
              setEditing(null);
              setMoving({ material: m, kind: "cost" });
            }}
            onSaved={() => {
              setEditing(null);
              void load();
            }}
          />
        </Modal>
      )}
      {moving && (
        <MovementModal
          material={moving.material}
          kind={moving.kind}
          onClose={() => setMoving(null)}
          onDone={() => {
            setMoving(null);
            void load();
          }}
        />
      )}
      {kardexOf && <KardexModal material={kardexOf} onClose={() => setKardexOf(null)} />}
    </div>
  );
}

function MaterialForm({
  material,
  onSaved,
  onCancel,
  onCorrectCost,
}: {
  material?: Material;
  onSaved: () => void;
  onCancel: () => void;
  onCorrectCost: (m: Material) => void;
}) {
  const [sku, setSku] = useState(material?.sku ?? "");
  const [name, setName] = useState(material?.name ?? "");
  const [unit, setUnit] = useState<MaterialUnit>(material?.unit ?? "M2");
  const [minStock, setMinStock] = useState(material?.min_stock ?? "");
  const [active, setActive] = useState(material?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    if (!sku.trim() || !name.trim()) return setError("SKU y nombre son obligatorios.");
    const min = minStock.trim() ? parseQuantity(minStock, { allowZero: true, label: "El stock mínimo" }) : null;
    if (min && !min.ok) return setError(min.error);

    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await rpc.upsertMaterial({
        id: material?.id,
        sku: sku.trim(),
        name: name.trim(),
        unit,
        min_stock: min && min.ok ? min.value : null,
        is_active: active,
      });
      toast.success("Insumo guardado.");
      onSaved();
    } catch (err) {
      const appError = toAppError(err);
      setError(appError.code === "DUPLICATE" ? "Ya existe un insumo con ese SKU." : appError.userText);
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" data-testid="material-form">
      <div className="grid grid-cols-2 gap-4">
        <TextField label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} disabled={saving} required />
        <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} required />
        <SelectField
          label="Unidad"
          value={unit}
          onChange={(e) => setUnit(e.target.value as MaterialUnit)}
          disabled={saving}
          hint={material ? "No se puede cambiar si el insumo ya tiene movimientos." : "Unidad en la que se compra y se consume."}
        >
          {(Object.keys(MATERIAL_UNIT_LABEL) as MaterialUnit[]).map((u) => (
            <option key={u} value={u}>
              {MATERIAL_UNIT_LABEL[u]}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Stock mínimo (alerta)"
          inputMode="decimal"
          value={minStock}
          onChange={(e) => setMinStock(e.target.value)}
          hint="Vacío = sin alerta."
          disabled={saving}
        />
      </div>
      {!material && (
        <p className="text-xs text-ink-muted">
          El insumo nace con existencia 0 y costo 0. Registre después el reabasto con la cantidad y el costo de compra.
        </p>
      )}
      {material && (
        <>
          <label className="flex items-center gap-2 text-sm text-ink-strong">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={saving} />
            Insumo activo (un insumo inactivo no se puede agregar a recetas nuevas)
          </label>
          <div>
            <Button variant="ghost" onClick={() => onCorrectCost(material)} disabled={saving}>
              Corregir costo promedio…
            </Button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-blocked-ink">
          [!] {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end md:gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          Guardar
        </Button>
      </div>
    </form>
  );
}

function MovementModal({
  material,
  kind,
  onClose,
  onDone,
}: {
  material: Material;
  kind: Movement;
  onClose: () => void;
  onDone: () => void;
}) {
  const key = useRef(crypto.randomUUID()); // misma clave en cada reintento
  const inFlight = useRef(false);
  const unit = MATERIAL_UNIT_LABEL[material.unit];
  const [qty, setQty] = useState(kind === "adjust" ? material.current_stock.replace(/^-.*/, "0") : "");
  const [cost, setCost] = useState(kind === "cost" ? material.unit_cost : "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    setError(null);

    let result: Material & { duplicate?: boolean };
    const q = kind === "cost" ? null : parseQuantity(qty, { allowZero: kind === "adjust" });
    if (q && !q.ok) return setError(q.error);
    const needsReason = kind !== "restock";
    if (needsReason && reason.trim().length < 3) return setError("Escriba el motivo.");
    let c: string | null = null;
    if (kind === "restock" || kind === "cost") {
      const parsed = parseQuantity(cost, { allowZero: true, label: "El costo" });
      if (!parsed.ok) return setError(parsed.error);
      c = parsed.value;
    }

    inFlight.current = true;
    setSaving(true);
    try {
      const qv = q && q.ok ? q.value : "0";
      if (kind === "restock") result = await rpc.restockMaterial(material.id, qv, c!, key.current, reason.trim() || undefined);
      else if (kind === "waste") result = await rpc.registerWaste(material.id, qv, reason.trim(), null, key.current);
      else if (kind === "adjust") result = await rpc.adjustStock(material.id, qv, reason.trim(), key.current);
      else result = await rpc.setMaterialCost(material.id, c!, reason.trim());
      toast.success(
        result.duplicate
          ? "El movimiento ya estaba registrado (no se duplicó)."
          : `Listo. Existencia: ${formatQty(result.current_stock)} ${unit} · costo $${result.unit_cost}`,
      );
      onDone();
    } catch (err) {
      const appError = toAppError(err);
      if (appError.isNetwork) setUncertain(true);
      else setError(appError.userText);
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <Modal title={`${MOVEMENT_TITLE[kind]} · ${material.name}`} onClose={onClose} locked={saving}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" data-testid="movement-form">
        <p className="rounded-md bg-surface-1 p-3 text-sm text-ink-base tabular">
          Existencia actual: <strong>{formatQty(material.current_stock)} {unit}</strong> · Costo promedio: ${material.unit_cost}
        </p>
        {kind === "restock" && (
          <>
            <TextField label={`Cantidad comprada (${unit})`} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} disabled={saving} required />
            <TextField
              label={`Costo de compra por ${unit}`}
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              hint="Por unidad, no el total de la factura. El sistema recalcula el costo promedio."
              disabled={saving}
              required
            />
            <TextField label="Nota (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} disabled={saving} placeholder="Proveedor, factura…" />
          </>
        )}
        {kind === "waste" && (
          <>
            <TextField label={`Cantidad desperdiciada (${unit})`} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} disabled={saving} required />
            <TextAreaField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} disabled={saving} placeholder="Corte mal hecho, impresión defectuosa…" required />
            <p className="text-xs text-ink-muted">
              Es la merma real adicional a la que ya considera la receta. Aparece en el reporte de mermas.
            </p>
          </>
        )}
        {kind === "adjust" && (
          <>
            <TextField label={`Cantidad contada físicamente (${unit})`} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} disabled={saving} required />
            <TextAreaField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} disabled={saving} placeholder="Inventario mensual…" required />
          </>
        )}
        {kind === "cost" && (
          <>
            <TextField label={`Costo promedio correcto por ${unit}`} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} disabled={saving} required />
            <TextAreaField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} disabled={saving} required />
            <p className="text-xs text-ink-muted">No altera el costo de pedidos que ya entraron a producción.</p>
          </>
        )}
        {uncertain && (
          <p role="alert" className="rounded-md border-2 border-warning-line bg-warning p-3 text-sm text-warning-ink">
            Se perdió la conexión antes de confirmar. Reintentar es seguro: no se duplicará el movimiento.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm font-semibold text-blocked-ink">
            [!] {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end md:gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {uncertain ? "Reintentar (seguro)" : "Registrar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function KardexModal({ material, onClose }: { material: Material; onClose: () => void }) {
  const timezone = useSettingsStore((s) => s.timezone);
  const [rows, setRows] = useState<InventoryTx[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKardex(material.id)
      .then(setRows)
      .catch((err) => setError(toAppError(err).userText));
  }, [material.id]);

  return (
    <Modal title={`Movimientos · ${material.name}`} onClose={onClose}>
      {error ? (
        <ErrorPanel message={error} />
      ) : !rows ? (
        <Spinner label="Cargando…" />
      ) : rows.length === 0 ? (
        <EmptyState>Sin movimientos.</EmptyState>
      ) : (
        <table className="w-full text-sm tabular">
          <thead className="text-left text-ink-muted">
            <tr>
              <th className="py-1">Fecha</th>
              <th className="py-1">Tipo</th>
              <th className="py-1 text-right">Cantidad</th>
              <th className="py-1 text-right">Costo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-line align-top">
                <td className="py-2">{formatDateTime(t.created_at, timezone)}</td>
                <td className="py-2">
                  {TX_LABEL[t.type]}
                  {t.order && <span className="block text-xs text-ink-muted">Pedido {t.order.folio}</span>}
                  {t.reason && <span className="block text-xs text-ink-muted">{t.reason}</span>}
                  {t.author && <span className="block text-xs text-ink-muted">{t.author.full_name}</span>}
                </td>
                <td className={`py-2 text-right ${isNegative(t.quantity) ? "text-blocked-ink" : "text-ink-strong"}`}>
                  {isNegative(t.quantity) ? "" : "+"}
                  {formatQty(t.quantity)}
                </td>
                <td className="py-2 text-right">{t.unit_cost ? `$${t.unit_cost}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}

