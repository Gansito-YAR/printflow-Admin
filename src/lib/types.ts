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
/** Categoría administrable (Plan Correcciones v2, C5). Se desactiva, no se borra. */
export interface ProductCategory {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}
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
  | "MATERIALS_RETURNED"
  | "DELIVERY_OVERRIDE"
  | "RECIPE_CHANGED"
  | "STOCK_SHORTAGE";

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
  allow_negative_stock: boolean;
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
  category_id: string;
  category: Pick<ProductCategory, "id" | "name" | "sort_order"> | null;
  pricing_unit: PricingUnit;
  retail_price: Money;
  wholesale_price: Money;
  wholesale_min_qty: string | null;
  is_active: boolean;
  /** C_fijo por unidad facturable (Módulo 4). */
  fixed_cost: string;
}

/** Pedido tal como lo muestra el Kanban. */
export interface OrderSummary {
  id: string;
  folio: string;
  status: OrderStatus;
  promised_date: string;
  total_price: Money;
  balance_due: Money;
  /** true = entregado con saldo, autorizado por un ADMIN (cliente con crédito). */
  delivery_override: boolean;
  customer: { full_name: string; phone_number: string } | null;
  items: { description: string; line_no: number }[];
}

export interface OrderItem {
  line_no: number;
  description: string;
  pricing_unit: PricingUnit;
  quantity: string;
  /** m² cobrados (cantidad × ancho × alto) o piezas. */
  billable_qty: string;
  width_m: string | null;
  height_m: string | null;
  applied_tier: PricingTier;
  unit_price: Money;
  line_total: Money;
}

/** "6 m²" o "6 m² (2 piezas)" para M2; "3 piezas" para UNIT. */
export function itemQuantityLabel(it: Pick<OrderItem, "pricing_unit" | "quantity" | "billable_qty">): string {
  const trim = (v: string) => (v.includes(".") ? v.replace(/\.?0+$/, "") : v);
  const pieces = trim(it.quantity);
  const piecesLabel = `${pieces} ${pieces === "1" ? "pieza" : "piezas"}`;
  if (it.pricing_unit === "M2") return pieces === "1" ? `${trim(it.billable_qty)} m²` : `${trim(it.billable_qty)} m² (${piecesLabel})`;
  return piecesLabel;
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
  delivery_override: boolean;
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

// ----- Insumos insuficientes y notificaciones (Plan Correcciones v2, C6) -----

/** Requerimiento de un insumo frente a lo disponible. Cantidades como texto (numeric). */
export interface MaterialNeed {
  raw_material_id: string;
  name: string;
  unit: MaterialUnit;
  required: string;
  available: string;
  shortage: string; // "0" si alcanza
}

export interface MaterialsPreview {
  allow_negative_stock: boolean;
  materials: MaterialNeed[];
}

export interface ShortageAlert {
  id: string;
  order_id: string;
  folio: string;
  order_status: OrderStatus;
  customer: string;
  material_id: string;
  material: string;
  unit: MaterialUnit;
  shortage: string;
  current_stock: string;
  created_at: string;
  acknowledged: boolean;
  resolved_at: string | null;
}

export interface ForecastShortage {
  material_id: string;
  material: string;
  unit: MaterialUnit;
  required: string;
  available: string;
  shortage: string;
  orders: { order_id: string; folio: string }[];
}

export interface LowStockAlert {
  material_id: string;
  material: string;
  unit: MaterialUnit;
  current_stock: string;
  min_stock: string;
}

export interface Notifications {
  shortages: ShortageAlert[];
  forecast: ForecastShortage[];
  low_stock: LowStockAlert[];
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
  DELIVERY_OVERRIDE: "Entrega autorizada con saldo pendiente",
  RECIPE_CHANGED: "Receta modificada",
  STOCK_SHORTAGE: "Producción con insumos insuficientes",
};

// ----- Módulo 4: costos, inventario y mermas (CONFIDENCIAL: solo ADMIN) -----

export type MaterialUnit = "M2" | "ML" | "UNIT" | "LT" | "KG";
export type InventoryTxType = "RESTOCK" | "PRODUCTION_USAGE" | "PRODUCTION_RETURN" | "WASTE" | "ADJUSTMENT";

export const MATERIAL_UNIT_LABEL: Record<MaterialUnit, string> = {
  M2: "m²",
  ML: "m lineal",
  UNIT: "pieza",
  LT: "litro",
  KG: "kg",
};

export const TX_LABEL: Record<InventoryTxType, string> = {
  RESTOCK: "Reabasto",
  PRODUCTION_USAGE: "Consumo de producción",
  PRODUCTION_RETURN: "Reintegro por cancelación",
  WASTE: "Merma",
  ADJUSTMENT: "Ajuste por conteo",
};

export interface Material {
  id: string;
  sku: string;
  name: string;
  unit: MaterialUnit;
  unit_cost: string;
  current_stock: string;
  min_stock: string | null;
  is_active: boolean;
  inventory_value?: Money;
}

export interface InventoryTx {
  id: number;
  type: InventoryTxType;
  quantity: string;
  unit_cost: string | null;
  reason: string | null;
  created_at: string;
  order: { folio: string } | null;
  author: { full_name: string } | null;
}

export interface RecipeLineInput {
  raw_material_id: string;
  quantity_required: string;
  waste_margin_pct: string;
}

export interface ProductSimulation {
  materials: {
    raw_material_id: string;
    name: string;
    unit: MaterialUnit;
    quantity_required: string;
    waste_margin_pct: string;
    unit_cost: string;
    cost: string;
  }[];
  has_recipe: boolean;
  material_cost: string;
  fixed_cost: string;
  unit_cost: string;
  retail_price: Money;
  wholesale_price: Money;
  retail_profit: Money;
  wholesale_profit: Money;
  retail_margin_pct: string | null;
  wholesale_margin_pct: string | null;
}

export interface CostingLine {
  line_no: number;
  description: string;
  sale: Money;
  material_cost: Money;
  fixed_cost: Money;
  production_cost: Money;
  has_recipe: boolean;
  materials: { raw_material_id: string; name: string; consumed_qty: string; unit_cost: string; material_cost: Money }[];
}

export interface ExtraCost {
  id: string;
  concept: string;
  amount: Money;
  created_at: string;
  voided: boolean;
  void_reason: string | null;
  created_by: string | null;
}

export interface OrderCosting {
  is_estimate: boolean;
  lines: CostingLine[];
  sales: Money;
  production_cost: Money;
  extra_cost: Money;
  profit: Money;
  margin_pct: string | null;
  incomplete_cost: boolean;
  extras?: ExtraCost[];
  frozen_at?: string | null;
}

export type ReportBasis = "DELIVERED" | "CREATED";
export type ReportGroup = "ORDER" | "CUSTOMER" | "MONTH" | "PRODUCT" | "CATEGORY";

export interface ProfitRow {
  key: string;
  label: string;
  orders: number;
  sales: Money;
  production_cost: Money;
  extra_cost: Money;
  profit: Money;
  margin_pct: string | null;
  incomplete_cost: boolean;
}

export interface ProfitReport {
  rows: ProfitRow[];
  totals: Omit<ProfitRow, "key" | "label" | "incomplete_cost">;
}

export interface WasteRow {
  raw_material_id: string;
  name: string;
  unit: MaterialUnit;
  theoretical_qty: string;
  theoretical_cost: Money;
  real_qty: string;
  real_cost: Money;
}
