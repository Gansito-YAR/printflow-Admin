// Llamadas tipadas a las RPC del panel (printflow-api, migración 0009).
// TODA escritura de dinero o estado pasa por aquí (D-01).

import { supabase } from "./supabaseClient";
import { toAppError } from "./errors";
import type { CutPlanLine,
  CreatedOrder,
  Material,
  MaterialUnit,
  MaterialsPreview,
  ExpenseFrequency,
  RecurringExpense,
  Notifications,
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
  UserAccount,
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

  /** Insumos requeridos vs. disponibles: de un pedido guardado o de partidas sin guardar. */
  previewMaterials(source: { orderId: string } | { items: { product_id: string; billable_qty: string }[] }) {
    return call<MaterialsPreview>("preview_materials", {
      p_order_id: "orderId" in source ? source.orderId : null,
      p_items: "items" in source ? source.items : null,
    });
  },

  getNotifications() {
    return call<Notifications>("get_notifications", {});
  },

  acknowledgeInventoryAlert(alertId: string) {
    return call<void>("acknowledge_inventory_alert", { p_alert_id: alertId });
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
  /** Archivar oculta el insumo de listas y selectores; sus recetas siguen igual. */
  setMaterialArchived(id: string, archived: boolean) {
    return call<Material>("set_material_archived", { p_id: id, p_archived: archived });
  },

  /** "Elimina" (oculta) un insumo que no está en recetas vigentes. Nunca se borra de la base. */
  deleteMaterial(id: string) {
    return call<{ result: "REMOVED"; name: string }>("delete_material", { p_id: id });
  },

  setProductArchived(id: string, archived: boolean) {
    return call<void>("set_product_archived", { p_id: id, p_archived: archived });
  },

  /** "Elimina" (oculta) el producto. Nunca se borra: pedidos y cotizaciones lo conservan. */
  deleteProduct(id: string) {
    return call<void>("delete_product", { p_id: id });
  },

  upsertMaterial(m: {
    id?: string;
    sku: string;
    name: string;
    unit: MaterialUnit;
    min_stock: string | null;
    is_active: boolean;
    width_cm?: string | null;
    height_cm?: string | null;
  }) {
    return call<Material>("upsert_material", {
      p_id: m.id ?? null,
      p_sku: m.sku,
      p_name: m.name,
      p_unit: m.unit,
      p_min_stock: m.min_stock,
      p_is_active: m.is_active,
      p_width_cm: m.width_cm ?? null,
      p_height_cm: m.height_cm ?? null,
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
  /** Vista previa de la calculadora de corte (no valida: eso lo hace la cotización). */
  planCuts(items: QuoteItemInput[]) {
    return call<CutPlanLine[]>("plan_cuts", { p_items: items });
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
  // ----- Gastos del negocio -----
  /** Gasto único (sin frecuencia) o continuo. `date`: fecha del gasto, o inicio del continuo. */
  createExpense(e: {
    concept: string;
    amount: string;
    categoryId: string;
    date: string;
    frequency?: ExpenseFrequency | null;
    weekday?: number | null;
    monthDay?: number | null;
    month?: number | null;
    endsOn?: string | null;
    notes?: string | null;
  }) {
    return call<{ kind: "ONE_TIME" | "RECURRING"; id: string; generated?: number }>("create_expense", {
      p_concept: e.concept,
      p_amount: e.amount,
      p_category_id: e.categoryId,
      p_date: e.date,
      p_frequency: e.frequency ?? null,
      p_weekday: e.weekday ?? null,
      p_month_day: e.monthDay ?? null,
      p_month: e.month ?? null,
      p_ends_on: e.endsOn ?? null,
      p_notes: e.notes ?? null,
    });
  },
  /** Cambia un gasto continuo desde el próximo cobro; los cargos ya registrados no cambian. */
  updateRecurringExpense(id: string, e: {
    concept: string;
    amount: string;
    categoryId: string;
    frequency: ExpenseFrequency;
    weekday?: number | null;
    monthDay?: number | null;
    month?: number | null;
    endsOn?: string | null;
  }) {
    return call<void>("update_recurring_expense", {
      p_id: id,
      p_concept: e.concept,
      p_amount: e.amount,
      p_category_id: e.categoryId,
      p_frequency: e.frequency,
      p_weekday: e.weekday ?? null,
      p_month_day: e.monthDay ?? null,
      p_month: e.month ?? null,
      p_ends_on: e.endsOn ?? null,
    });
  },
  setRecurringExpensePaused(id: string, paused: boolean) {
    return call<void>("set_recurring_expense_paused", { p_id: id, p_paused: paused });
  },
  deleteRecurringExpense(id: string) {
    return call<void>("delete_recurring_expense", { p_id: id });
  },
  voidExpense(id: string, reason: string) {
    return call<void>("void_expense", { p_id: id, p_reason: reason });
  },
  previewRecurrence(p: { frequency: ExpenseFrequency; startsOn: string; weekday?: number | null; monthDay?: number | null; month?: number | null; endsOn?: string | null }) {
    return call<string[]>("preview_recurrence", {
      p_frequency: p.frequency,
      p_starts_on: p.startsOn,
      p_weekday: p.weekday ?? null,
      p_month_day: p.monthDay ?? null,
      p_month: p.month ?? null,
      p_ends_on: p.endsOn ?? null,
      p_count: 3,
    });
  },
  listRecurringExpenses() {
    return call<RecurringExpense[]>("list_recurring_expenses", {});
  },
  generateDueExpenses() {
    return call<number>("generate_due_expenses", {});
  },
  acknowledgeExpense(id: string) {
    return call<void>("acknowledge_expense", { p_id: id });
  },

  getWasteReport(from: string, to: string) {
    return call<WasteRow[]>("get_waste_report", { p_from: from, p_to: to });
  },

  adminListUsers() {
    return call<UserAccount[]>("admin_list_users", {});
  },

  /** Crea la cuenta de Auth ya confirmada y el perfil activo (Plan Correcciones v2, C7). */
  adminCreateUser(input: { email: string; fullName: string; role: UserRole; password: string }) {
    return call<{ id: string; email: string; full_name: string; role: UserRole }>("admin_create_user", {
      p_email: input.email,
      p_full_name: input.fullName,
      p_role: input.role,
      p_password: input.password,
    });
  },

  /** Cambia la contraseña y cierra las sesiones abiertas de esa cuenta. */
  adminResetPassword(userId: string, password: string) {
    return call<void>("admin_reset_password", { p_user_id: userId, p_password: password });
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
