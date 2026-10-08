// Reautenticación para las acciones avanzadas (SRS Fase 3 §6, Spec-Kit §3.4).
// Verifica la contraseña del ADMIN actual. El mensaje de error es genérico.

import { useRef, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuthStore } from "../../store/auth";
import { Button, TextField } from "../../components/ui";

export function ReauthForm({ onConfirmed }: { onConfirmed: () => void }) {
  const email = useAuthStore((s) => s.session?.user.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const inFlight = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current || !password) return;
    inFlight.current = true;
    setChecking(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setPassword(""); // la credencial no se conserva en memoria
    inFlight.current = false;
    setChecking(false);
    if (authError) setError("No fue posible confirmar su identidad.");
    else onConfirmed();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" data-testid="reauth-form">
      <p className="text-sm text-ink-base">
        Estas acciones quedan registradas en la bitácora con su usuario. Confirme su contraseña para continuar.
      </p>
      <TextField
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={checking}
        error={error}
        data-testid="input-reauth-password"
        required
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={!password} loading={checking} loadingLabel="Confirmando…">
          Confirmar
        </Button>
      </div>
    </form>
  );
}
