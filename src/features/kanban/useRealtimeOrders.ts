// Kanban en tiempo real (SRS Fase 3 §3.1, Spec-Kit §3.1).
//
// - Carga inicial completa.
// - Suscripción a cambios de `orders` vía Supabase Realtime (respeta RLS).
// - Ante cada evento se vuelve a leer ESE pedido con la consulta normal, así el
//   dinero llega como texto exacto y nunca se confía en el payload del evento.
// - Tras cada reconexión se recarga todo: cubre los eventos perdidos.

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import { fetchKanbanOrders, fetchOrderSummary } from "../../lib/queries";
import { toAppError } from "../../lib/errors";
import type { OrderSummary } from "../../lib/types";

export type RealtimeStatus = "connecting" | "connected" | "disconnected" | "error";

function byPromisedDate(a: OrderSummary, b: OrderSummary) {
  return a.promised_date.localeCompare(b.promised_date);
}

export function useRealtimeOrders() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rtStatus, setRtStatus] = useState<RealtimeStatus>("connecting");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const everConnected = useRef(false);

  const loadAll = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchKanbanOrders();
      setOrders(data.sort(byPromisedDate));
    } catch (err) {
      setError(toAppError(err).userText);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshOne = useCallback(async (id: string) => {
    try {
      const order = await fetchOrderSummary(id);
      setOrders((prev) => {
        const rest = prev.filter((o) => o.id !== id);
        if (!order || order.status === "CANCELLED") return rest;
        return [...rest, order].sort(byPromisedDate);
      });
    } catch {
      // Si falla la lectura puntual, la próxima recarga completa lo corrige.
    }
  }, []);

  const subscribe = useCallback(() => {
    if (channelRef.current) void supabase.removeChannel(channelRef.current);
    setRtStatus("connecting");
    const channel = supabase
      .channel("orders-kanban")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        const row = (payload.new ?? payload.old) as { id?: string } | null;
        if (row?.id) void refreshOne(row.id);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRtStatus("connected");
          if (everConnected.current) void loadAll(); // reconexión: recuperar lo perdido
          everConnected.current = true;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRtStatus("error");
        } else if (status === "CLOSED") {
          setRtStatus("disconnected");
        }
      });
    channelRef.current = channel;
  }, [loadAll, refreshOne]);

  useEffect(() => {
    void loadAll();
    subscribe();
    return () => {
      if (channelRef.current) void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [loadAll, subscribe]);

  const reconnect = useCallback(() => {
    subscribe();
    void loadAll();
  }, [subscribe, loadAll]);

  return { orders, loading, error, rtStatus, reload: loadAll, reconnect, refreshOne };
}
