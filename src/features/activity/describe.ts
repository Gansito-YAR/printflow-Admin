// Texto de la bitácora general: convierte cada registro de activity_log
// (vista de la base) en un título y líneas de detalle legibles.

import type { InventoryTxType, MaterialUnit, OrderEventType, OrderStatus } from "../../lib/types";
import {
  EVENT_LABEL,
  MATERIAL_UNIT_LABEL,
  STATUS_LABEL,
  TIER_LABEL,
  TX_LABEL,
  COST_EVENTS,
} from "../../lib/types";
import { formatMoney } from "../../utils/money";
import { formatQty } from "../../utils/quantity";
import { formatDateTime } from "../../utils/dates";

export type ActivityCategory = "PEDIDO" | "INVENTARIO" | "CLIENTE" | "PRODUCTO" | "INSUMO" | "CONFIGURACION" | "USUARIO";

export const CATEGORY_LABEL_ACTIVITY: Record<ActivityCategory, string> = {
  PEDIDO: "Pedidos y cobros",
  INVENTARIO: "Inventario",
  CLIENTE: "Clientes",
  PRODUCTO: "Productos y recetas",
  INSUMO: "Insumos",
  CONFIGURACION: "Configuración",
  USUARIO: "Usuarios",
};

export interface ActivityRow {
  id: string;
  created_at: string;
  actor_id: string | null;
  category: ActivityCategory;
  action: string;
  entity: string | null;
  reason: string | null;
  amount: string | null;
  detail: Record<string, unknown> | null;
}

const FIELD_LABEL: Record<string, string> = {
  phone_number: "Teléfono",
  full_name: "Nombre",
  name: "Nombre",
  sku: "SKU",
  pricing_tier: "Tarifa",
  is_active: "Activo",
  notes: "Notas",
  category: "Categoría",
  category_id: "Categoría",
  password: "Contraseña",
  pricing_unit: "Unidad de cobro",
  retail_price: "Precio menudeo",
  wholesale_price: "Precio mayoreo",
  wholesale_min_qty: "Mínimo de mayoreo",
  fixed_cost: "Costo fijo",
  unit: "Unidad",
  min_stock: "Stock mínimo",
  deposit_pct: "Anticipo mínimo (%)",
  timezone: "Zona horaria",
  allow_negative_stock: "Permitir stock negativo",
  role: "Rol",
  insumos: "Insumos en la receta",
};

const MONEY_FIELDS = new Set(["retail_price", "wholesale_price", "fixed_cost"]);

function fieldValue(key: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (key === "pricing_tier") return TIER_LABEL[v as keyof typeof TIER_LABEL] ?? String(v);
  if (key === "role") return v === "ADMIN" ? "Administrador" : v === "INSTALLER" ? "Instalador" : String(v);
  if (MONEY_FIELDS.has(key)) return formatMoney(String(v));
  return String(v);
}

export interface Described {
  title: string;
  lines: string[];
}

export function describe(row: ActivityRow, timezone = "America/Mexico_City"): Described {
  const d = row.detail ?? {};
  const lines: string[] = [];
  const add = (s: string | null | undefined) => s && lines.push(s);

  if (row.category === "PEDIDO") {
    const ev = row.action as OrderEventType;
    const title = EVENT_LABEL[ev] ?? row.action;
    const from = d.from as string | null;
    const to = d.to as string | null;
    if (ev === "PAYMENT_REGISTERED") add(`Abono de ${formatMoney(row.amount)} · saldo restante ${formatMoney(to)}`);
    else if (ev === "DELIVERY_OVERRIDE") add(`Saldo por cobrar: ${formatMoney(row.amount)}`);
    else if (COST_EVENTS.has(ev)) {
      if (ev === "EXTRA_COST_ADDED" || ev === "EXTRA_COST_VOIDED") add(to);
    } else if (from || to) {
      const label = (x: string | null) =>
        ev === "PROMISED_DATE_CHANGED"
          ? formatDateTime(x, timezone)
          : x && x in STATUS_LABEL
            ? STATUS_LABEL[x as OrderStatus]
            : (x ?? "");
      add(`${from ? `${label(from)} → ` : ""}${label(to)}`);
      if (row.amount) add(`Total ${formatMoney(row.amount)}`);
    }
    if (row.reason) add(`Motivo: ${row.reason}`);
    return { title, lines };
  }

  if (row.category === "INVENTARIO") {
    if (row.action === "COST_CORRECTION") {
      add(`Costo promedio: $${d.previous as string} → $${row.amount}`);
      if (row.reason) add(`Motivo: ${row.reason}`);
      return { title: "Costo promedio corregido", lines };
    }
    const unit = MATERIAL_UNIT_LABEL[d.unit as MaterialUnit] ?? "";
    const qty = row.amount ?? "0";
    add(`${qty.startsWith("-") ? "" : "+"}${formatQty(qty)} ${unit}${d.unit_cost ? ` · a $${d.unit_cost as string}` : ""}`);
    if (d.folio) add(`Pedido ${d.folio as string}`);
    if (row.reason) add(`Motivo: ${row.reason}`);
    return { title: TX_LABEL[row.action as InventoryTxType] ?? row.action, lines };
  }

  // Catálogos y configuración
  const changes = (d.changes ?? null) as Record<string, { old: unknown; new: unknown }> | null;
  const noun: Record<string, string> = {
    CLIENTE: "Cliente",
    PRODUCTO: "Producto",
    INSUMO: "Insumo",
    CONFIGURACION: "Configuración",
    USUARIO: "Usuario",
  };
  if (row.action === "RECIPE_CHANGED") {
    add(changes?.insumos ? `Receta guardada con ${String(changes.insumos.new)} insumo(s)` : null);
    return { title: "Receta modificada", lines };
  }
  if (row.action === "INSERT") {
    return { title: `${noun[row.category] ?? "Registro"} creado`, lines };
  }
  for (const [k, v] of Object.entries(changes ?? {})) {
    add(`${FIELD_LABEL[k] ?? k}: ${fieldValue(k, v.old)} → ${fieldValue(k, v.new)}`);
  }
  return { title: `${noun[row.category] ?? "Registro"} modificado`, lines };
}
