// Tipos del dominio, alineados con printflow-api (supabase/migrations).
//
// REGLA: el dinero viaja SIEMPRE como string decimal ("1250.50"). Las consultas
// lo piden con `::text` y las RPC ya lo devuelven así. El panel nunca hace
// aritmética de dinero: muestra lo que calcula la base.

export type Money = string;

export type OrderStatus =
  | "PENDING_DEPOSIT"
  | "IN_PRODUCTION"
  | "READY_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentMethod = "CASH" | "TRANSFER" | "CARD";
export type PricingTier = "RETAIL" | "WHOLESALE";
export type PricingUnit = "UNIT" | "M2";
export type ProductCategory = "GRAN_FORMATO" | "PAPELERIA" | "PROMOCIONALES";
export type UserRole = "ADMIN" | "INSTALLER";

export type OrderEventType =
  | "CREATED"
  | "PAYMENT_REGISTERED"
  | "STATUS_CHANGED"
  | "PRODUCTION_OVERRIDE"
  | "PROMISED_DATE_CHANGED"
  | "DELIVERED"
  | "CANCELLED"
  | "COSTS_FROZEN"
  | "EXTRA_COST_ADDED"
  | "EXTRA_COST_VOIDED"
  | "MATERIALS_RETURNED";

/** Eventos cuyo monto es un costo (confidencial): la bitácora no lo muestra. */
export const COST_EVENTS: ReadonlySet<OrderEventType> = new Set([
  "COSTS_FROZEN",
  "EXTRA_COST_ADDED",
  "EXTRA_COST_VOIDED",
  "MATERIALS_RETURNED",
]);

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface BusinessSettings {
  deposit_pct: string;
  timezone: string;
}

export interface Customer {
  id: string;
  phone_number: string;
  full_name: string;
  pricing_tier: PricingTier;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  pricing_unit: PricingUnit;
  retail_price: Money;
  wholesale_price: Money;
  wholesale_min_qty: string | null;
  is_active: boolean;
}

/** Pedido tal como lo muestra el Kanban. */
export interface OrderSummary {
  id: string;
  folio: string;
  status: OrderStatus;
  promised_date: string;
  total_price: Money;
  balance_due: Money;
  customer: { full_name: string; phone_number: string } | null;
  items: { description: string; line_no: number }[];
}

export interface OrderItem {
  line_no: number;
  description: string;
  pricing_unit: PricingUnit;
  quantity: string;
  width_m: string | null;
  height_m: string | null;
  applied_tier: PricingTier;
  unit_price: Money;
  line_total: Money;
}

export interface Payment {
  id: string;
  amount: Money;
  payment_method: PaymentMethod;
  created_at: string;
  registered_by: { full_name: string } | null;
}

export interface OrderEvent {
  id: number;
  event_type: OrderEventType;
  from_value: string | null;
  to_value: string | null;
  amount: Money | null;
  reason: string | null;
  created_at: string;
  actor: { full_name: string } | null;
}

export interface OrderDetail {
  id: string;
  folio: string;
  status: OrderStatus;
  promised_date: string;
  total_price: Money;
  balance_due: Money;
  notes: string | null;
  qr_code_hash: string;
  production_override: boolean;
  created_at: string;
  delivered_at: string | null;
  customer: Pick<Customer, "id" | "full_name" | "phone_number" | "pricing_tier"> | null;
  items: OrderItem[];
  payments: Payment[];
  events: OrderEvent[];
}

// ----- RPC -----------------------------------------------------------------

export interface QuoteItemInput {
  product_id: string;
  quantity: number | string;
  width_m?: number | string;
  height_m?: number | string;
}

export interface QuoteLine {
  line_no: number;
  product_id: string;
  description: string;
  pricing_unit: PricingUnit;
  quantity: string;
  width_m: string | null;
  height_m: string | null;
  billable_qty: string;
  applied_tier: PricingTier;
  unit_price: Money;
  line_total: Money;
}

export interface Quote {
  items: QuoteLine[];
  total: Money;
  deposit_pct: string;
  deposit_required: Money;
}

export interface CreatedOrder {
  id: string;
  folio: string;
  qr_code_hash: string;
  status: OrderStatus;
  total_price: Money;
  balance_due: Money;
  deposit_required: Money;
}

export interface PaymentResult {
  payment_id: string;
  balance_due: Money;
  duplicate: boolean;
}

// ----- Etiquetas para la interfaz -----------------------------------------

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_DEPOSIT: "Pendiente de anticipo",
  IN_PRODUCTION: "En producción",
  READY_FOR_DELIVERY: "Listo para entrega",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
};

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  GRAN_FORMATO: "Gran formato",
  PAPELERIA: "Papelería comercial",
  PROMOCIONALES: "Promocionales",
};

export const TIER_LABEL: Record<PricingTier, string> = {
  RETAIL: "Menudeo",
  WHOLESALE: "Mayoreo",
};

export const UNIT_LABEL: Record<PricingUnit, string> = {
  UNIT: "Pieza",
  M2: "m²",
};

export const EVENT_LABEL: Record<OrderEventType, string> = {
  CREATED: "Pedido creado",
  PAYMENT_REGISTERED: "Abono registrado",
  STATUS_CHANGED: "Cambio de estado",
  PRODUCTION_OVERRIDE: "Producción sin anticipo (autorizada)",
  PROMISED_DATE_CHANGED: "Fecha pactada reprogramada",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  COSTS_FROZEN: "Costos de producción congelados",
  EXTRA_COST_ADDED: "Gasto extra registrado",
  EXTRA_COST_VOIDED: "Gasto extra anulado",
  MATERIALS_RETURNED: "Material reintegrado al inventario",
};
