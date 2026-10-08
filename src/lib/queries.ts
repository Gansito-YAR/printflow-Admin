// Consultas de lectura. RLS garantiza que solo un ADMIN activo ve estas filas.
//
// Todo campo de dinero se pide con `::text`: PostgREST serializa `numeric` como
// número JSON, y el panel trabaja el dinero como string decimal exacto.

import { supabase } from "./supabaseClient";
import { toAppError } from "./errors";
import type { Customer, OrderDetail, OrderSummary, Product, Profile } from "./types";

export const ORDER_SUMMARY_SELECT =
  "id, folio, status, promised_date, total_price::text, balance_due::text, " +
  "customer:customers(full_name, phone_number), items:order_items(description, line_no)";

const ORDER_DETAIL_SELECT =
  "id, folio, status, promised_date, total_price::text, balance_due::text, notes, " +
  "qr_code_hash, production_override, created_at, delivered_at, " +
  "customer:customers(id, full_name, phone_number, pricing_tier), " +
  "items:order_items(line_no, description, pricing_unit, quantity::text, width_m::text, " +
  "height_m::text, applied_tier, unit_price::text, line_total::text), " +
  "payments(id, amount::text, payment_method, created_at, registered_by:profiles(full_name)), " +
  "events:order_events(id, event_type, from_value, to_value, amount::text, reason, created_at, " +
  "actor:profiles(full_name))";

const PRODUCT_SELECT =
  "id, sku, name, category, pricing_unit, retail_price::text, wholesale_price::text, " +
  "wholesale_min_qty::text, is_active";

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
    .or(`status.neq.DELIVERED,delivered_at.gte.${since}`)
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

export async function fetchProducts(onlyActive = false): Promise<Product[]> {
  let query = supabase.from("products").select(PRODUCT_SELECT).order("category").order("name");
  if (onlyActive) query = query.eq("is_active", true);
  return unwrap<Product[]>(await query);
}

export async function searchCustomers(term: string, onlyActive = true): Promise<Customer[]> {
  let query = supabase.from("customers").select(CUSTOMER_SELECT).order("full_name").limit(50);
  const clean = term.trim().replace(/[%,()]/g, "");
  if (clean) query = query.or(`full_name.ilike.%${clean}%,phone_number.ilike.%${clean}%`);
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
