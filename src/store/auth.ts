// Sesión del panel (SRS Fase 3 §2).
// Solo un ADMIN activo entra. Cualquier otro perfil cierra sesión de inmediato.

import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import type { Profile } from "../lib/types";

type Status = "loading" | "signedOut" | "ready";

interface AuthState {
  status: Status;
  session: Session | null;
  profile: Profile | null;
  /** Motivo del último cierre de sesión, para mostrarlo en el login. */
  signOutReason: string | null;
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: (reason?: string) => Promise<void>;
}

const GENERIC_LOGIN_ERROR = "Correo o contraseña incorrectos.";
const NOT_ADMIN = "Acceso no autorizado: esta cuenta no es un administrador activo.";

async function loadAdminProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name, is_active, created_at")
    .eq("id", userId)
    .maybeSingle();
  const profile = data as Profile | null;
  return profile && profile.role === "ADMIN" && profile.is_active ? profile : null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  session: null,
  profile: null,
  signOutReason: null,

  init() {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        set({ status: "signedOut", session: null, profile: null });
        return;
      }
      const profile = await loadAdminProfile(session.user.id);
      if (!profile) {
        await get().signOut(NOT_ADMIN);
        return;
      }
      set({ status: "ready", session, profile });
    })();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        set({ status: "signedOut", session: null, profile: null });
      } else if ((event === "TOKEN_REFRESHED" || event === "SIGNED_IN") && session) {
        set({ session });
      }
    });
    return () => data.subscription.unsubscribe();
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new Error(GENERIC_LOGIN_ERROR);
    const profile = await loadAdminProfile(data.session.user.id);
    if (!profile) {
      await supabase.auth.signOut();
      throw new Error(NOT_ADMIN);
    }
    set({ status: "ready", session: data.session, profile, signOutReason: null });
  },

  async signOut(reason) {
    set({ signOutReason: reason ?? null });
    await supabase.auth.signOut();
    set({ status: "signedOut", session: null, profile: null });
  },
}));
