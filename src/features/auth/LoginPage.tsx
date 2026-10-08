import { useRef, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { Button, TextField } from "../../components/ui";

export function LoginPage() {
  const status = useAuthStore((s) => s.status);
  const signIn = useAuthStore((s) => s.signIn);
  const reason = useAuthStore((s) => s.signOutReason);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  if (status === "ready") return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return; // una sola petición aunque haya doble clic
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible iniciar sesión.");
      setPassword("");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const canSubmit = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length > 0;

  return (
    <main className="flex min-h-full items-center justify-center bg-surface-1 p-6">
      <form
        onSubmit={onSubmit}
        noValidate
        data-testid="login-form"
        className="flex w-full max-w-sm flex-col gap-5 rounded-md border-2 border-line bg-surface-0 p-8"
      >
        <div className="flex flex-col items-center gap-3">
          <img src="/brand/logo-full.png" alt="Imprenta Escalante" className="h-14 w-auto" />
          <h1 className="text-lg font-bold text-ink-strong">Panel administrativo</h1>
        </div>

        {reason && !error && (
          <p role="status" className="rounded-md border border-warning-line bg-warning p-3 text-sm text-warning-ink">
            {reason}
          </p>
        )}

        <TextField
          label="Correo"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          data-testid="input-email"
          required
        />
        <TextField
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
          data-testid="input-password"
          required
        />

        {error && (
          <p role="alert" data-testid="login-error" className="text-sm font-semibold text-blocked-ink">
            [!] {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={!canSubmit}
          loading={submitting}
          loadingLabel="Iniciando sesión…"
          data-testid="button-login"
        >
          Iniciar sesión
        </Button>
      </form>
    </main>
  );
}
