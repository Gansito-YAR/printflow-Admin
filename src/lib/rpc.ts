// Llamadas tipadas a las RPC del panel (printflow-api, migración 0009).
// TODA escritura de dinero o estado pasa por aquí (D-01).

import { supabase } from "./supabaseClient";
import { toAppError } from "./errors";
import type {
  CreatedOrder,
  Material,
  MaterialUnit,
  OrderCosting,
  ProductSimulation,
  ProfitReport,
  RecipeLineInput,
  ReportBasis,
  ReportGroup,
  WasteRow,
  Money,
  OrderStatus,
  PaymentMethod,
  PaymentResult,
  Profile,
  Quote,
  QuoteItemInput,
  UserRole,
} from "./types";

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  let result;
  try {
    result = await supabase.rpc(fn, args);
  } catch (err) {
    throw toAppError(err);
  }
  if (result.error) throw toAppError(result.error);
  return result.data as T;
}

export const rpc = {
  quoteOrder(customerId: string, items: QuoteItemInput[]) {
    return call<Quote>("quote_order", { p_customer_id: customerId, p_items: items });
  },

  createOrder(customerId: string, items: QuoteItemInput[], promisedDate: string, notes: string) {
    return call<CreatedOrder>("create_order", {
      p_customer_id: customerId,
      p_items: items,
      p_promised_date: promisedDate,
      p_notes: notes,
    });
  },

  /**
   * Abono idempotente: reintentar con la MISMA clave nunca duplica el cobro.
   * El monto viaja como string para evitar errores de punto flotante.
   */
  registerPayment(orderId: string, amount: Money, method: PaymentMethod, idempotencyKey: string) {
    return call<PaymentResult>("register_payment", {
      p_order_id: orderId,
      p_amount: amount,
      p_method: method,
      p_idempotency_key: idempotencyKey,
    });
  },

  advanceOrderStatus(orderId: string, to: Extract<OrderStatus, "IN_PRODUCTION" | "READY_FOR_DELIVERY">) {
    return call<{ status: OrderStatus }>("advance_order_status", { p_order_id: orderId, p_to: to });
  },

  startProductionOverride(orderId: string, reason: string) {
    return call<{ status: OrderStatus }>("start_production_override", {
      p_order_id: orderId,
      p_reason: reason,
    });
  },

  rescheduleOrder(orderId: string, newDate: string, reason: string) {
    return call<{ promised_date: string; previous_date: string }>("reschedule_order", {
      p_order_id: orderId,
      p_new_date: newDate,
      p_reason: reason,
    });
  },

  /** returns: material recuperado al cancelar un pedido ya en producción (M4-D-08). */
  cancelOrder(orderId: string, reason: string, returns?: { raw_material_id: string; qty: string }[]) {
    return call<{ status: OrderStatus; returned: number }>("cancel_order", {
      p_order_id: orderId,
      p_reason: reason,
      p_returns: returns && returns.length ? returns : null,
    });
  },

  /** Entrega con saldo (cliente con crédito). El servidor exige haber reautenticado hace < 5 min. */
  forceDelivery(orderId: string, reason: string) {
    return call<{ status: OrderStatus; balance_due: Money }>("force_delivery", {
      p_order_id: orderId,
      p_reason: reason,
    });
  },

  // ----- Módulo 4 (costos, inventario y mermas) -----
  upsertMaterial(m: {
    id?: string;
    sku: string;
    name: string;
    unit: MaterialUnit;
    min_stock: string | null;
    is_active: boolean;
  }) {
    return call<Material>("upsert_material", {
      p_id: m.id ?? null,
      p_sku: m.sku,
      p_name: m.name,
      p_unit: m.unit,
      p_min_stock: m.min_stock,
      p_is_active: m.is_active,
    });
  },
  restockMaterial(id: string, qty: string, unitCost: string, key: string, note?: string) {
    return call<Material & { duplicate: boolean }>("restock_material", {
      p_id: id,
      p_qty: qty,
      p_unit_cost: unitCost,
      p_idempotency_key: key,
      p_note: note ?? null,
    });
  },
  registerWaste(id: string, qty: string, reason: string, orderId: string | null, key: string) {
    return call<Material & { duplicate: boolean }>("register_waste", {
      p_id: id,
      p_qty: qty,
      p_reason: reason,
      p_order_id: orderId,
      p_idempotency_key: key,
    });
  },
  adjustStock(id: string, newStock: string, reason: string, key: string) {
    return call<Material & { duplicate: boolean }>("adjust_stock", {
      p_id: id,
      p_new_stock: newStock,
      p_reason: reason,
      p_idempotency_key: key,
    });
  },
  setMaterialCost(id: string, unitCost: string, reason: string) {
    return call<Material>("set_material_cost", { p_id: id, p_unit_cost: unitCost, p_reason: reason });
  },
  setRecipe(productId: string, items: RecipeLineInput[]) {
    return call<{ items: number }>("set_recipe", { p_product_id: productId, p_items: items });
  },
  simulateProductCost(productId: string) {
    return call<ProductSimulation>("simulate_product_cost", { p_product_id: productId });
  },
  estimateCosting(customerId: string, items: QuoteItemInput[]) {
    return call<OrderCosting>("estimate_costing", { p_customer_id: customerId, p_items: items });
  },
  getOrderCosting(orderId: string) {
    return call<OrderCosting>("get_order_costing", { p_order_id: orderId });
  },
  addExtraCost(orderId: string, concept: string, amount: Money, key: string) {
    return call<{ id: string; duplicate: boolean }>("add_extra_cost", {
      p_order_id: orderId,
      p_concept: concept,
      p_amount: amount,
      p_idempotency_key: key,
    });
  },
  voidExtraCost(id: string, reason: string) {
    return call<{ id: string }>("void_extra_cost", { p_id: id, p_reason: reason });
  },
  getProfitReport(from: string, to: string, basis: ReportBasis, group: ReportGroup) {
    return call<ProfitReport>("get_profit_report", { p_from: from, p_to: to, p_basis: basis, p_group: group });
  },
  getWasteReport(from: string, to: string) {
    return call<WasteRow[]>("get_waste_report", { p_from: from, p_to: to });
  },

  adminUpdateUser(
    userId: string,
    changes: { role?: UserRole; is_active?: boolean; full_name?: string },
  ) {
    return call<Profile>("admin_update_user", {
      p_user_id: userId,
      p_role: changes.role ?? null,
      p_is_active: changes.is_active ?? null,
      p_full_name: changes.full_name ?? null,
    });
  },
};
