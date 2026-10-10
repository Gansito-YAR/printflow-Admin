// Centro de notificaciones (Plan Correcciones v2, C6).
// Una sola fuente para la campana, la página Notificaciones y el badge
// "Excede insumos" de los pedidos. Se refresca:
//   - al iniciar sesión y al navegar (barato: una RPC),
//   - en vivo cuando cambia inventory_alerts (Supabase Realtime),
//   - cada 5 minutos como respaldo (faltantes previstos y stock bajo no emiten evento).

import { create } from "zustand";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { rpc } from "../lib/rpc";
import type { Notifications } from "../lib/types";

const EMPTY: Notifications = { shortages: [], forecast: [], low_stock: [] };
const POLL_MS = 5 * 60 * 1000;

interface NotificationsState {
  data: Notifications;
  loaded: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  acknowledge: (alertId: string) => Promise<void>;
  start: () => () => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  data: EMPTY,
  loaded: false,
  error: false,

  refresh: async () => {
    try {
      const data = await rpc.getNotifications();
      set({ data: { ...EMPTY, ...data }, loaded: true, error: false });
    } catch {
      set({ error: true, loaded: true });
    }
  },

  acknowledge: async (alertId) => {
    await rpc.acknowledgeInventoryAlert(alertId);
    await get().refresh();
  },

  start: () => {
    void get().refresh();
    let channel: RealtimeChannel | null = supabase
      .channel("inventory-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_alerts" }, () => void get().refresh())
      .subscribe();
    const timer = window.setInterval(() => void get().refresh(), POLL_MS);
    return () => {
      window.clearInterval(timer);
      if (channel) void supabase.removeChannel(channel);
      channel = null;
    };
  },
}));

/** Alertas que cuentan en la campana: faltantes abiertos no vistos + previstos + stock bajo. */
export function unseenCount(d: Notifications): number {
  const openUnseen = d.shortages.filter((s) => !s.resolved_at && !s.acknowledged).length;
  return openUnseen + d.forecast.length + d.low_stock.length;
}

/** ¿Hay algún faltante en producción sin resolver? (define el tono de la campana). */
export function hasOpenShortage(d: Notifications): boolean {
  return d.shortages.some((s) => !s.resolved_at);
}

/** Pedidos con faltante abierto → badge "Excede insumos". */
export function useOrdersExceeding(): Set<string> {
  const shortages = useNotificationsStore((s) => s.data.shortages);
  return new Set(shortages.filter((s) => !s.resolved_at).map((s) => s.order_id));
}
