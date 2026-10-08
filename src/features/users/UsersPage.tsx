// Usuarios (ADM-10). Las cuentas se crean en el dashboard de Supabase (el
// registro público está desactivado); aquí se asigna rol y se activa/desactiva.
// Un admin no puede editarse a sí mismo (evita quedarse sin acceso).

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchProfiles } from "../../lib/queries";
import { rpc } from "../../lib/rpc";
import { toAppError } from "../../lib/errors";
import type { Profile, UserRole } from "../../lib/types";
import { useAuthStore } from "../../store/auth";
import { useSettingsStore } from "../../store/settings";
import { formatDateTime } from "../../utils/dates";
import { Button, ErrorPanel, Spinner } from "../../components/ui";

const ROLE_LABEL: Record<UserRole, string> = { ADMIN: "Administrador", INSTALLER: "Instalador" };

export function UsersPage() {
  const me = useAuthStore((s) => s.profile?.id);
  const timezone = useSettingsStore((s) => s.timezone);
  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await fetchProfiles());
      setError(null);
    } catch (err) {
      setError(toAppError(err).userText);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function update(user: Profile, changes: { role?: UserRole; is_active?: boolean }) {
    if (busy) return;
    if (changes.role === "ADMIN" && !window.confirm(`¿Dar acceso de administrador a ${user.full_name}?`)) return;
    setBusy(user.id);
    try {
      await rpc.adminUpdateUser(user.id, changes);
      toast.success("Usuario actualizado.");
      await load();
    } catch (err) {
      toast.error(toAppError(err).userText);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-ink-strong">Usuarios</h1>
        <p className="text-sm text-ink-muted">
          Las cuentas nuevas se crean en Supabase (Authentication → Users) y llegan aquí como Instalador inactivo.
        </p>
      </div>
      {error && <ErrorPanel message={error} onRetry={() => void load()} />}
      {loading ? (
        <Spinner label="Cargando…" />
      ) : (
        <table className="w-full rounded-md border border-line bg-surface-0 text-sm">
          <thead className="text-left text-ink-muted">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Alta</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const self = u.id === me;
              return (
                <tr key={u.id} className="border-t border-line">
                  <td className="p-3 font-semibold text-ink-strong">
                    {u.full_name || "(sin nombre)"} {self && <span className="text-xs text-ink-muted">(usted)</span>}
                  </td>
                  <td className="p-3">
                    <select
                      value={u.role}
                      disabled={self || busy !== null}
                      onChange={(e) => void update(u, { role: e.target.value as UserRole })}
                      className="min-h-10 rounded-md border border-line bg-surface-0 px-2"
                      aria-label={`Rol de ${u.full_name}`}
                    >
                      {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">{u.is_active ? "Activo" : "Inactivo"}</td>
                  <td className="p-3 text-ink-muted">{formatDateTime(u.created_at, timezone)}</td>
                  <td className="p-3 text-right">
                    <Button
                      variant={u.is_active ? "secondary" : "primary"}
                      disabled={self || busy !== null}
                      loading={busy === u.id}
                      onClick={() => void update(u, { is_active: !u.is_active })}
                    >
                      {u.is_active ? "Desactivar" : "Activar"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
