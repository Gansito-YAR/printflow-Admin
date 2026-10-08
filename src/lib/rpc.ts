// Llamadas tipadas a las RPC del panel (printflow-api, migración 0009).
// TODA escritura de dinero o estado pasa por aquí (D-01).

import { supabase } from "./supabaseClient";
import { toAppError } from "./errors";
import type {
  CreatedOrder,
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

  cancelOrder(orderId: string, reason: string) {
    return call<{ status: OrderStatus }>("cancel_order", { p_order_id: orderId, p_reason: reason });
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
