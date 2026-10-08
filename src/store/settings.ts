// Configuración del negocio: anticipo mínimo (D-07), zona horaria operativa
// (D-08) y stock negativo permitido (M4-D-07).

import { create } from "zustand";
import { supabase } from "../lib/supabaseClient";
import { toAppError } from "../lib/errors";
import type { BusinessSettings } from "../lib/types";

interface SettingsState extends BusinessSettings {
  loaded: boolean;
  load: () => Promise<void>;
  /** RLS: solo un ADMIN puede escribir. La base valida rango y zona horaria. */
  save: (changes: BusinessSettings) => Promise<void>;
}

const SELECT = "deposit_pct::text, timezone, allow_negative_stock";

export const useSettingsStore = create<SettingsState>((set) => ({
  deposit_pct: "50",
  timezone: "America/Mexico_City",
  allow_negative_stock: true,
  loaded: false,
  async load() {
    const { data } = await supabase.from("business_settings").select(SELECT).maybeSingle();
    if (data) set({ ...(data as BusinessSettings), loaded: true });
  },
  async save(changes) {
    const { data, error } = await supabase
      .from("business_settings")
      .update(changes)
      .eq("id", true)
      .select(SELECT)
      .single();
    if (error) throw toAppError(error);
    set({ ...(data as BusinessSettings), loaded: true });
  },
}));
