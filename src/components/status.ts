// Identidad visual de cada estado del pedido (Plan Correcciones v2, C3).
// Color + icono + texto: el color nunca es la única señal.

import { Ban, CheckCircle2, Clock, PackageCheck, Printer, type LucideIcon } from "lucide-react";
import type { OrderStatus } from "../lib/types";

const KEY: Record<OrderStatus, string> = {
  PENDING_DEPOSIT: "pending",
  IN_PRODUCTION: "production",
  READY_FOR_DELIVERY: "ready",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

export const STATUS_ICON: Record<OrderStatus, LucideIcon> = {
  PENDING_DEPOSIT: Clock,
  IN_PRODUCTION: Printer,
  READY_FOR_DELIVERY: PackageCheck,
  DELIVERED: CheckCircle2,
  CANCELLED: Ban,
};

/** Variables CSS del estado (definidas por tema en tokens.css). */
export function statusVars(status: OrderStatus): { bg: string; ink: string; line: string } {
  const k = KEY[status];
  return { bg: `var(--status-${k}-bg)`, ink: `var(--status-${k}-ink)`, line: `var(--status-${k}-line)` };
}
