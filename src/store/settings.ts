// Configuración del negocio: zona horaria operativa y anticipo mínimo (D-07, D-08).

import { create } from "zustand";
import { supabase } from "../lib/supabaseClient";
import type { BusinessSettings } from "../lib/types";

interface SettingsState extends BusinessSettings {
  loaded: boolean;
  load: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  deposit_pct: "50",
  timezone: "America/Mexico_City",
  loaded: false,
  async load() {
    const { data } = await supabase
      .from("business_settings")
      .select("deposit_pct::text, timezone")
      .maybeSingle();
    if (data) set({ ...(data as BusinessSettings), loaded: true });
  },
}));
