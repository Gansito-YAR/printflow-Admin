// Consultas de lectura. RLS garantiza que solo un ADMIN activo ve estas filas.
//
// Todo campo de dinero se pide con `::text`: PostgREST serializa `numeric` como
// número JSON, y el panel trabaja el dinero como string decimal exacto.

import { supabase } from "./supabaseClient";
import { toAppError } from "./errors";
import type {
  Customer,
  InventoryTx,
  Material,
  OrderDetail,
  OrderStatus,
  OrderSummary,
  Product,
  ProductCategory,
  Profile,
} from "./types";

export const ORDER_SUMMARY_SELECT =
  "id, folio, status, promised_date, total_price::text, balance_due::text, delivery_override, " +
  "customer:customers(full_name, phone_number), items:order_items(description, line_no)";

const ORDER_DETAIL_SELECT =
  "id, folio, status, promised_date, total_price::text, balance_due::text, notes, " +
  "qr_code_hash, production_override, delivery_override, created_at, delivered_at, " +
  "customer:customers(id, full_name, phone_number, pricing_tier), " +
  "items:order_items(line_no, description, pricing_unit, quantity::text, billable_qty::text, width_m::text, " +
  "height_m::text, applied_tier, unit_price::text, line_total::text), " +
  "payments(id, amount::text, payment_method, created_at, registered_by:profiles(full_name)), " +
  "events:order_events(id, event_type, from_value, to_value, amount::text, reason, created_at, " +
  "actor:profiles(full_name))";

const PRODUCT_SELECT =
  "id, sku, name, category_id, category:product_categories(id, name, sort_order), pricing_unit, retail_price::text, wholesale_price::text, " +
  "wholesale_min_qty::text, is_active, fixed_cost::text";

const CUSTOMER_SELECT = "id, phone_number, full_name, pricing_tier, is_active, notes, created_at";

function unwrap<T>(result: { data: unknown; error: unknown }): T {
  if (result.error) throw toAppError(result.error);
  return result.data as T;
}

/** Pedidos del Kanban: activos + entregados de los últimos 7 días. Sin cancelados. */
export async function fetchKanbanOrders(): Promise<OrderSummary[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const result = await supabase
    .from("orders")
    .select(ORDER_SUMMARY_SELECT)
    .neq("status", "CANCELLED")
    // Entregados de la última semana, y SIEMPRE los entregados con crédito mientras deban.
    .or(`status.neq.DELIVERED,delivered_at.gte.${since},and(delivery_override.eq.true,balance_due.gt.0)`)
    .order("promised_date", { ascending: true });
  return unwrap<OrderSummary[]>(result);
}

export async function fetchOrderSummary(id: string): Promise<OrderSummary | null> {
  const result = await supabase.from("orders").select(ORDER_SUMMARY_SELECT).eq("id", id).maybeSingle();
  return unwrap<OrderSummary | null>(result);
}

export async function fetchOrderDetail(folio: string): Promise<OrderDetail | null> {
  const result = await supabase.from("orders").select(ORDER_DETAIL_SELECT).eq("folio", folio).maybeSingle();
  const order = unwrap<OrderDetail | null>(result);
  if (!order) return null;
  order.items.sort((a, b) => a.line_no - b.line_no);
  order.payments.sort((a, b) => a.created_at.localeCompare(b.created_at));
  order.events.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
  return order;
}

export async function fetchCategories(onlyActive = false): Promise<ProductCategory[]> {
  let query = supabase.from("product_categories").select("id, name, sort_order, is_active").order("sort_order").order("name");
  if (onlyActive) query = query.eq("is_active", true);
  return unwrap<ProductCategory[]>(await query);
}

export async function fetchProducts(onlyActive = false): Promise<Product[]> {
  let query = supabase.from("products").select(PRODUCT_SELECT).order("name");
  if (onlyActive) query = query.eq("is_active", true);
  return unwrap<Product[]>(await query);
}

export async function searchCustomers(term: string, onlyActive = true): Promise<Customer[]> {
  let query = supabase.from("customers").select(CUSTOMER_SELECT).order("full_name").limit(50);
  const clean = term.trim().replace(/[%,()]/g, "");
  // El teléfono se guarda solo con dígitos: "+52 667 123" busca "52667123".
  const digits = clean.replace(/\D/g, "");
  const phoneTerm = digits.length >= 3 ? digits : clean;
  if (clean) query = query.or(`full_name.ilike.%${clean}%,phone_number.ilike.%${phoneTerm}%`);
  if (onlyActive) query = query.eq("is_active", true);
  return unwrap<Customer[]>(await query);
}

export async function fetchProfiles(): Promise<Profile[]> {
  const result = await supabase
    .from("profiles")
    .select("id, role, full_name, is_active, created_at")
    .order("created_at");
  return unwrap<Profile[]>(result);
}

// ----- Historial de pedidos -------------------------------------------------

export interface OrderHistoryFilter {
  status: OrderStatus | "ALL";
  term: string;
  from: string | null; // ISO UTC, inclusivo
  to: string | null; // ISO UTC, exclusivo
  page: number;
}

export const HISTORY_PAGE_SIZE = 50;

export type OrderHistoryRow = OrderSummary & { created_at: string; delivered_at: string | null };

export async function fetchOrderHistory(f: OrderHistoryFilter): Promise<{ rows: OrderHistoryRow[]; count: number }> {
  let query = supabase
    .from("orders")
    .select(ORDER_SUMMARY_SELECT + ", created_at, delivered_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(f.page * HISTORY_PAGE_SIZE, f.page * HISTORY_PAGE_SIZE + HISTORY_PAGE_SIZE - 1);
  if (f.status !== "ALL") query = query.eq("status", f.status);
  if (f.from) query = query.gte("created_at", f.from);
  if (f.to) query = query.lt("created_at", f.to);
  const clean = f.term.trim().replace(/[%,()]/g, "");
  if (clean) query = query.ilike("folio", `%${clean}%`);
  const result = await query;
  if (result.error) throw toAppError(result.error);
  return { rows: result.data as unknown as OrderHistoryRow[], count: result.count ?? 0 };
}

// ----- Módulo 4 --------------------------------------------------------------

const MATERIAL_SELECT =
  "id, sku, name, unit, unit_cost::text, current_stock::text, min_stock::text, is_active";

export async function fetchMaterials(onlyActive = false): Promise<Material[]> {
  let query = supabase.from("raw_materials").select(MATERIAL_SELECT).order("name");
  if (onlyActive) query = query.eq("is_active", true);
  return unwrap<Material[]>(await query);
}

export async function fetchKardex(materialId: string): Promise<InventoryTx[]> {
  const result = await supabase
    .from("inventory_transactions")
    .select(
      "id, type, quantity::text, unit_cost::text, reason, created_at, " +
        "order:orders(folio), author:profiles(full_name)",
    )
    .eq("raw_material_id", materialId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(200);
  return unwrap<InventoryTx[]>(result);
}

export async function fetchLowStockCount(): Promise<number> {
  const result = await supabase.from("low_stock_materials").select("id", { count: "exact", head: true });
  if (result.error) throw toAppError(result.error);
  return result.count ?? 0;
}

export interface ConsumedMaterial {
  raw_material_id: string;
  name: string;
  unit: string;
  /** Consumido neto (consumo − reintegros), 4 decimales. */
  consumed: string;
}

/** Insumos consumidos por un pedido, para ofrecer el reintegro al cancelar. */
export async function fetchOrderConsumption(orderId: string): Promise<ConsumedMaterial[]> {
  const result = await supabase
    .from("inventory_transactions")
    .select("raw_material_id, quantity::text, material:raw_materials(name, unit)")
    .eq("order_id", orderId)
    .in("type", ["PRODUCTION_USAGE", "PRODUCTION_RETURN"]);
  const rows = unwrap<
    { raw_material_id: string; quantity: string; material: { name: string; unit: string } | null }[]
  >(result);
  // Suma exacta en diezmilésimas con BigInt (sin punto flotante).
  const map = new Map<string, { name: string; unit: string; net: bigint }>();
  for (const r of rows) {
    const negative = r.quantity.startsWith("-");
    const [i = "0", d = ""] = r.quantity.replace("-", "").split(".");
    const v = BigInt(i) * 10000n + BigInt((d + "0000").slice(0, 4));
    const cur = map.get(r.raw_material_id) ?? { name: r.material?.name ?? "", unit: r.material?.unit ?? "", net: 0n };
    cur.net += negative ? v : -v; // el consumo es negativo en el kardex
    map.set(r.raw_material_id, cur);
  }
  return [...map.entries()]
    .filter(([, m]) => m.net > 0n)
    .map(([id, m]) => ({
      raw_material_id: id,
      name: m.name,
      unit: m.unit,
      consumed: `${m.net / 10000n}.${(m.net % 10000n).toString().padStart(4, "0")}`,
    }));
}
