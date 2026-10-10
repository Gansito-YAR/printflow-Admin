// Alta de usuarios y restablecimiento de contraseña (Plan Correcciones v2, C7, decisión D2).
// El administrador define la contraseña (o la genera). Se muestra UNA sola vez,
// con botón de copiar, para dársela a la persona.

import { useRef, useState, type FormEvent } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, ShieldAlert, Wand2 } from "lucide-react";
import toast from "react-hot-toast";
import { rpc } from "../../lib/rpc";
import { toAppError } from "../../lib/errors";
import type { UserAccount, UserRole } from "../../lib/types";
import { Button, FieldShell, Modal, SelectField, TextField } from "../../components/ui";
import { generatePassword, passwordProblem, passwordStrength } from "../../utils/password";

const ROLE_LABEL: Record<UserRole, string> = { ADMIN: "Administrador", INSTALLER: "Instalador" };

// ----- Campo de contraseña con mostrar/ocultar y generador --------------------
function PasswordField({
  value,
  onChange,
  error,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const strength = value ? passwordStrength(value) : null;
  const tone = strength === "fuerte" ? "text-cleared-ink" : strength === "aceptable" ? "text-warning-ink" : "text-blocked-ink";
  return (
    <FieldShell label="Contraseña" error={error} required>
      {({ id, describedBy, invalid }) => (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <input
                id={id}
                type={visible ? "text" : "password"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoComplete="new-password"
                spellCheck={false}
                disabled={disabled}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                className={`min-h-11 w-full rounded-md border bg-surface-0 py-2 pl-3 pr-11 font-mono text-base text-ink-strong outline-none focus:border-line-strong md:min-h-10 md:text-sm ${
                  invalid ? "border-2 border-blocked-line" : "border-line"
                }`}
                data-testid="user-password"
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded text-ink-muted hover:text-ink-strong"
              >
                {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
              </button>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                onChange(generatePassword());
                setVisible(true);
              }}
              disabled={disabled}
              data-testid="generate-password"
            >
              <span className="inline-flex items-center gap-1.5">
                <Wand2 size={16} aria-hidden /> Generar
              </span>
            </Button>
          </div>
          {strength && !error && (
            <p className={`text-xs font-semibold ${tone}`}>
              Seguridad: {strength}
              {passwordProblem(value) ? ` · ${passwordProblem(value)}` : ""}
            </p>
          )}
        </div>
      )}
    </FieldShell>
  );
}

// ----- Tarjeta con las credenciales (se muestra una sola vez) ------------------
function CopyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("No se pudo copiar. Selecciónelo y cópielo a mano.");
    }
  }
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-muted">{label}</p>
        <p className={`break-all text-base font-semibold text-ink-strong ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={`Copiar ${label.toLowerCase()}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line text-ink-strong hover:bg-surface-2"
      >
        {copied ? <Check size={18} aria-hidden className="text-cleared-ink" /> : <Copy size={18} aria-hidden />}
      </button>
    </div>
  );
}

function CredentialsCard({ email, password, onClose, intro }: { email: string; password: string; onClose: () => void; intro: string }) {
  return (
    <div className="flex flex-col gap-4" data-testid="credentials-card">
      <p className="text-sm text-ink-base">{intro}</p>
      <div className="flex flex-col gap-3 rounded-md border border-line bg-surface-1 p-4">
        <CopyRow label="Correo" value={email} />
        <CopyRow label="Contraseña" value={password} mono />
      </div>
      <p className="flex items-start gap-2 rounded-md border border-warning-line bg-warning p-3 text-sm font-semibold text-warning-ink">
        <ShieldAlert size={18} aria-hidden className="mt-0.5 shrink-0" />
        Esta contraseña no se volverá a mostrar. Entréguela en persona; no la envíe por un chat grupal.
      </p>
      <div className="flex justify-end">
        <Button onClick={onClose}>Listo</Button>
      </div>
    </div>
  );
}

// ----- Alta ---------------------------------------------------------------------
export function NewUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("INSTALLER");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; server?: string }>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ email: string; password: string } | null>(null);
  const inFlight = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    const next: typeof errors = {};
    if (!fullName.trim()) next.name = "Escriba el nombre completo.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = "Escriba un correo válido.";
    const pw = passwordProblem(password);
    if (pw) next.password = pw;
    setErrors(next);
    if (Object.keys(next).length) return;
    if (role === "ADMIN" && !window.confirm(`¿Crear a ${fullName.trim()} como ADMINISTRADOR? Tendrá acceso a todo el panel, incluido dinero y costos.`)) return;

    inFlight.current = true;
    setSaving(true);
    try {
      const res = await rpc.adminCreateUser({ email: email.trim(), fullName: fullName.trim(), role, password });
      setDone({ email: res.email, password });
      onCreated();
    } catch (err) {
      const appError = toAppError(err);
      const text = appError.userText;
      if (/correo/i.test(text)) setErrors({ email: text });
      else if (/contraseña/i.test(text)) setErrors({ password: text });
      else setErrors({ server: text });
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <Modal title={done ? "Usuario creado" : "Nuevo usuario"} onClose={onClose} locked={saving} testId="new-user-modal">
      {done ? (
        <CredentialsCard
          email={done.email}
          password={done.password}
          onClose={onClose}
          intro={`La cuenta está activa. ${ROLE_LABEL[role]} puede entrar desde ya con estos datos:`}
        />
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" data-testid="new-user-form">
          <TextField
            label="Nombre completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errors.name}
            maxLength={100}
            autoComplete="off"
            disabled={saving}
            required
          />
          <TextField
            label="Correo"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            hint="Con este correo inicia sesión."
            disabled={saving}
            required
          />
          <SelectField
            label="Rol"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            hint={role === "INSTALLER" ? "Solo la app de entregas: escanear y ver su ruta. No ve dinero." : "Acceso completo al panel."}
            disabled={saving}
          >
            <option value="INSTALLER">Instalador</option>
            <option value="ADMIN">Administrador</option>
          </SelectField>
          <PasswordField value={password} onChange={setPassword} error={errors.password} disabled={saving} />
          {errors.server && (
            <p role="alert" className="text-sm font-semibold text-blocked-ink">
              [!] {errors.server}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end md:gap-3">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving} loadingLabel="Creando…" data-testid="create-user">
              Crear usuario
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ----- Restablecer contraseña ----------------------------------------------------
export function ResetPasswordModal({ user, onClose }: { user: UserAccount; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const inFlight = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    inFlight.current = true;
    setSaving(true);
    try {
      await rpc.adminResetPassword(user.id, password);
      setDone(true);
    } catch (err) {
      setError(toAppError(err).userText);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <Modal title={`Restablecer contraseña · ${user.full_name}`} onClose={onClose} locked={saving} testId="reset-password-modal">
      {done ? (
        <CredentialsCard
          email={user.email ?? "(sin correo)"}
          password={password}
          onClose={onClose}
          intro="Contraseña cambiada. Se cerraron sus sesiones abiertas: tendrá que entrar de nuevo con estos datos."
        />
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <p className="flex items-start gap-2 text-sm text-ink-base">
            <KeyRound size={18} aria-hidden className="mt-0.5 shrink-0 text-ink-muted" />
            La contraseña actual dejará de funcionar y se cerrarán las sesiones abiertas de {user.full_name} (por ejemplo,
            en un teléfono perdido).
          </p>
          <PasswordField
            value={password}
            onChange={(v) => {
              setPassword(v);
              setError(null);
            }}
            error={error}
            disabled={saving}
          />
          <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end md:gap-3">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving} loadingLabel="Guardando…" data-testid="reset-password-submit">
              Cambiar contraseña
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
