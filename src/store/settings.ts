// Configuración del negocio: reglas (anticipo, zona horaria, stock negativo),
// datos para la remisión, días sugeridos de entrega, tablero y seguridad.

import { create } from "zustand";
import { supabase } from "../lib/supabaseClient";
import { toAppError } from "../lib/errors";
import type { BusinessSettings } from "../lib/types";

interface SettingsState extends BusinessSettings {
  loaded: boolean;
  load: () => Promise<void>;
  /** RLS: solo un ADMIN puede escribir. La base valida rango y zona horaria. */
  save: (changes: Partial<BusinessSettings>) => Promise<void>;
}

const SELECT =
  "deposit_pct::text, timezone, allow_negative_stock, business_name, business_phone, business_email, " +
  "business_address, business_rfc, remission_footer, default_lead_days, kanban_delivered_days, inactivity_minutes, " +
  "landing_whatsapp_e164, business_hours, landing_maps_url, landing_instagram_url, landing_facebook_url, landing_announcement";

export const useSettingsStore = create<SettingsState>((set) => ({
  deposit_pct: "50",
  timezone: "America/Mexico_City",
  allow_negative_stock: true,
  business_name: "Imprenta Escalante",
  business_phone: null,
  business_email: null,
  business_address: null,
  business_rfc: null,
  remission_footer: null,
  default_lead_days: 3,
  kanban_delivered_days: 7,
  inactivity_minutes: 30,
  landing_whatsapp_e164: null,
  business_hours: null,
  landing_maps_url: null,
  landing_instagram_url: null,
  landing_facebook_url: null,
  landing_announcement: null,
  loaded: false,
  async load() {
    const { data } = await supabase.from("business_settings").select(SELECT).maybeSingle();
    if (data) set({ ...(data as unknown as BusinessSettings), loaded: true });
  },
  async save(changes) {
    const { data, error } = await supabase
      .from("business_settings")
      .update(changes)
      .eq("id", true)
      .select(SELECT)
      .single();
    if (error) throw toAppError(error);
    set({ ...(data as unknown as BusinessSettings), loaded: true });
  },
}));
