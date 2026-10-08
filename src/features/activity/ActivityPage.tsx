// Bitácora general: todo lo que se hace en el sistema, en un solo lugar.
// Une pedidos y cobros, inventario, y los cambios de clientes, productos,
// recetas, insumos, configuración y usuarios. Solo lectura, ordenada del más
// reciente al más antiguo. No se puede editar ni borrar (la base lo impide).

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { fetchProfiles } from "../../lib/queries";
import { toAppError } from "../../lib/errors";
import type { Profile } from "../../lib/types";
import { useSettingsStore } from "../../store/settings";
import { formatDateTime, fromDateTimeLocal } from "../../utils/dates";
import { Button, EmptyState, ErrorPanel, SelectField, Spinner, TextField } from "../../components/ui";
import { CATEGORY_LABEL_ACTIVITY, describe, type ActivityCategory, type ActivityRow } from "./describe";

const PAGE_SIZE = 50;

export function ActivityPage() {
  const timezone = useSettingsStore((s) => s.timezone);
  const [category, setCategory] = useState<ActivityCategory | "ALL">("ALL");
  const [actor, setActor] = useState("ALL");
  const [term, setTerm] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [count, setCount] = useState(0);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    fetchProfiles()
      .then(setProfiles)
      .catch(() => setProfiles([]));
  }, []);
  const names = useMemo(() => new Map(profiles.map((p) => [p.id, p.full_name])), [profiles]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        let query = supabase
          .from("activity_log")
          .select("id, created_at, actor_id, category, action, entity, reason, amount, detail", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
        if (category !== "ALL") query = query.eq("category", category);
        if (actor !== "ALL") query = query.eq("actor_id", actor);
        const clean = term.trim().replace(/[%,()]/g, "");
        if (clean) query = query.ilike("entity", `%${clean}%`);
        // Fechas en la zona operativa; "hasta" incluye todo ese día.
        const fromIso = from ? fromDateTimeLocal(`${from}T00:00`, timezone) : null;
        const toIso = to ? fromDateTimeLocal(`${to}T00:00`, timezone) : null;
        if (fromIso) query = query.gte("created_at", fromIso);
        if (toIso) query = query.lt("created_at", new Date(new Date(toIso).getTime() + 24 * 3600 * 1000).toISOString());
        const result = await query;
        if (result.error) throw toAppError(result.error);
        if (!cancelled) {
          setRows(result.data as unknown as ActivityRow[]);
          setCount(result.count ?? 0);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(toAppError(err).userText);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [category, actor, term, from, to, page, timezone, version]);

  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const reset = <T,>(fn: (v: T) => void) => (v: T) => {
    setPage(0);
    fn(v);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-ink-strong">Bitácora general</h1>
        <p className="text-sm text-ink-muted">
          Registro de todas las acciones del sistema: quién, cuándo y qué cambió. Solo lectura: no se puede editar ni borrar.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-md border border-line bg-surface-0 p-3">
        <div className="w-52">
          <SelectField label="Tipo" value={category} onChange={(e) => reset(setCategory)(e.target.value as ActivityCategory | "ALL")}>
            <option value="ALL">Todo</option>
            {(Object.keys(CATEGORY_LABEL_ACTIVITY) as ActivityCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL_ACTIVITY[c]}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-52">
          <SelectField label="Usuario" value={actor} onChange={(e) => reset(setActor)(e.target.value)}>
            <option value="ALL">Todos</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name || "(sin nombre)"}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-48">
          <TextField label="Folio o nombre" placeholder="PF-… / Lona…" value={term} onChange={(e) => reset(setTerm)(e.target.value)} />
        </div>
        <div className="w-40">
          <TextField label="Desde" type="date" value={from} onChange={(e) => reset(setFrom)(e.target.value)} />
        </div>
        <div className="w-40">
          <TextField label="Hasta" type="date" value={to} onChange={(e) => reset(setTo)(e.target.value)} />
        </div>
      </div>

      {error && <ErrorPanel message={error} onRetry={() => setVersion((v) => v + 1)} />}
      {loading ? (
        <Spinner label="Cargando…" />
      ) : rows.length === 0 ? (
        <EmptyState>Sin registros con estos filtros.</EmptyState>
      ) : (
        <>
          <ol className="flex flex-col rounded-md border border-line bg-surface-0" data-testid="activity-list">
            {rows.map((r) => {
              const d = describe(r, timezone);
              const isOrder = r.category === "PEDIDO" && r.entity;
              return (
                <li key={r.id} className="grid grid-cols-[11rem_9rem_1fr] gap-3 border-b border-line p-3 last:border-b-0">
                  <span className="tabular text-xs text-ink-muted">
                    {formatDateTime(r.created_at, timezone)}
                    <span className="block">{r.actor_id ? (names.get(r.actor_id) ?? "Usuario") : "Sistema"}</span>
                  </span>
                  <span className="text-xs font-semibold text-ink-base">
                    {CATEGORY_LABEL_ACTIVITY[r.category] ?? r.category}
                  </span>
                  <span className="text-sm">
                    <span className="font-semibold text-ink-strong">{d.title}</span>
                    {r.entity && (
                      <span className="text-ink-base">
                        {" · "}
                        {isOrder ? (
                          <Link to={`/pedidos/${r.entity}`} className="font-mono font-semibold text-brand-accent underline">
                            {r.entity}
                          </Link>
                        ) : (
                          r.entity
                        )}
                      </span>
                    )}
                    {d.lines.map((l, i) => (
                      <span key={i} className="block text-ink-base">
                        {l}
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="flex items-center justify-between text-sm text-ink-muted">
            <span>
              {count} registro{count === 1 ? "" : "s"} · página {page + 1} de {pages}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
                Anterior
              </Button>
              <Button variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= pages}>
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
