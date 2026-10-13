// Gastos del negocio (Plan_Gastos_Negocio.md). CONFIDENCIAL: solo ADMIN.
//   - "+ Gasto": 1) concepto y monto · 2) casilla "gasto continuo" · 3) frecuencia y día.
//   - Gastos continuos: editar (desde el próximo cobro), pausar/reanudar y eliminar.
//   - Historial: todos los cargos del periodo; un cargo solo se anula, con motivo.

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, Pause, Pencil, Play, Plus, Repeat, Trash2 } from "lucide-react";
import { rpc } from "../../lib/rpc";
import { fetchBusinessExpenses, fetchExpenseCategories } from "../../lib/queries";
import { toAppError } from "../../lib/errors";
import {
  FREQUENCY_LABEL,
  type BusinessExpense,
  type ExpenseCategory,
  type ExpenseFrequency,
  type RecurringExpense,
} from "../../lib/types";
import { useSettingsStore } from "../../store/settings";
import { formatMoney, parseAmountInput } from "../../utils/money";
import { Button, EmptyState, ErrorPanel, Modal, SelectField, Spinner, TextAreaField, TextField } from "../../components/ui";
import { InfoTip } from "../../components/InfoTip";
import { TZDate } from "@date-fns/tz";

const WEEKDAYS = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const MONTHS = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "2026-11-05" → "5 de noviembre de 2026" (fecha de calendario, sin zona horaria). */
export function longDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return format(new Date(y!, m! - 1, day!), "d 'de' MMMM 'de' yyyy", { locale: es });
}

/** Frecuencia en palabras: "Mensual, día 5", "Semanal, cada viernes". */
export function scheduleText(r: Pick<RecurringExpense, "frequency" | "weekday" | "month_day" | "month_of_year">): string {
  switch (r.frequency) {
    case "DAILY":
      return "Diario";
    case "WEEKLY":
      return `Semanal, cada ${WEEKDAYS[r.weekday ?? 0]}`;
    case "BIWEEKLY":
      return "Quincenal, días 15 y último";
    case "MONTHLY":
      return `Mensual, día ${r.month_day}`;
    case "BIMONTHLY":
      return `Cada 2 meses, día ${r.month_day}`;
    case "YEARLY":
      return `Anual, ${r.month_day} de ${MONTHS[r.month_of_year ?? 0]}`;
  }
}

// ----- Formulario: nuevo gasto o editar uno continuo -------------------------------
function ExpenseForm({
  categories,
  editing,
  onClose,
  onSaved,
}: {
  categories: ExpenseCategory[];
  editing?: RecurringExpense;
  onClose: () => void;
  onSaved: () => void;
}) {
  const tz = useSettingsStore((s) => s.timezone);
  const today = format(new TZDate(Date.now(), tz), "yyyy-MM-dd");
  const active = categories.filter((c) => c.is_active || c.id === editing?.category_id);

  const [concept, setConcept] = useState(editing?.concept ?? "");
  const [amount, setAmount] = useState(editing?.amount ?? "");
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? active[0]?.id ?? "");
  const [date, setDate] = useState(editing?.starts_on ?? today);
  const [recurring, setRecurring] = useState(Boolean(editing));
  const [frequency, setFrequency] = useState<ExpenseFrequency>(editing?.frequency ?? "MONTHLY");
  const [weekday, setWeekday] = useState(String(editing?.weekday ?? 5));
  const [monthDay, setMonthDay] = useState(String(editing?.month_day ?? Number(today.slice(8, 10))));
  const [month, setMonth] = useState(String(editing?.month_of_year ?? Number(today.slice(5, 7))));
  const [endsOn, setEndsOn] = useState(editing?.ends_on ?? "");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  const schedule = {
    frequency,
    weekday: frequency === "WEEKLY" ? Number(weekday) : null,
    monthDay: ["MONTHLY", "BIMONTHLY", "YEARLY"].includes(frequency) ? Number(monthDay) : null,
    month: frequency === "YEARLY" ? Number(month) : null,
    endsOn: endsOn || null,
  };

  // Vista previa en palabras con las próximas fechas reales (la calcula la base).
  useEffect(() => {
    if (!recurring) return setPreview(null);
    let cancelled = false;
    const t = window.setTimeout(() => {
      rpc
        .previewRecurrence({ ...schedule, startsOn: date })
        .then((d) => !cancelled && setPreview(d))
        .catch(() => !cancelled && setPreview(null));
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurring, frequency, weekday, monthDay, month, endsOn, date]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    if (!concept.trim()) return setError("Escriba el concepto del gasto.");
    const a = parseAmountInput(amount);
    if (!a.ok) return setError(`Monto: ${a.error}`);
    if (!categoryId) return setError("Elija una categoría.");
    if (!recurring && date > today) return setError("Un gasto único no puede tener fecha futura. Marque «gasto continuo» para cobros futuros.");
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await rpc.updateRecurringExpense(editing.id, { concept: concept.trim(), amount: a.value, categoryId, ...schedule });
        toast.success("Gasto continuo actualizado. Aplica desde el próximo cobro.");
      } else {
        const res = await rpc.createExpense({
          concept: concept.trim(),
          amount: a.value,
          categoryId,
          date,
          notes: notes.trim() || null,
          ...(recurring ? schedule : { frequency: null }),
        });
        toast.success(
          res.kind === "ONE_TIME"
            ? "Gasto registrado."
            : res.generated
              ? `Gasto continuo creado. Se registraron ${res.generated} cobro(s) ya vencidos.`
              : "Gasto continuo creado.",
        );
      }
      onSaved();
    } catch (err) {
      setError(toAppError(err).userText);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  const parsedAmount = parseAmountInput(amount);
  const amountText = parsedAmount.ok ? formatMoney(parsedAmount.value) : null;

  return (
    <Modal title={editing ? `Editar gasto continuo · ${editing.concept}` : "Nuevo gasto"} onClose={onClose} locked={saving} testId="expense-form">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {/* 1. Qué y cuánto */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Concepto" value={concept} onChange={(e) => setConcept(e.target.value)} maxLength={120} required disabled={saving}
            help="Para qué fue el gasto. Ej.: Renta del local, Sueldo de Juan, Luz." placeholder="Ej.: Renta del local" />
          <TextField label="Monto" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required disabled={saving}
            help="Cuánto se pagó (o se pagará en cada cobro)." placeholder="0.00" />
        </div>
        <SelectField label="Categoría" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={saving}
          help="Sirve para ver en qué se va el dinero en el reporte.">
          {active.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>

        {/* 2. ¿Es continuo? */}
        {!editing && (
          <label className="flex min-h-11 items-start gap-3 rounded-md border border-line bg-surface-1 p-3 text-sm text-ink-strong">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} disabled={saving}
              data-testid="expense-recurring" />
            <span>
              <span className="font-semibold">Es un gasto continuo</span>
              <span className="block text-xs text-ink-muted">
                Se repite cada cierto tiempo (renta, sueldos, servicios). El sistema lo registrará solo en cada fecha y le avisará en Notificaciones.
              </span>
            </span>
          </label>
        )}

        {!recurring && !editing && (
          <TextField label="Fecha del gasto" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} disabled={saving}
            help="Hoy por defecto. Puede poner una fecha pasada si olvidó capturarlo." />
        )}

        {/* 3. Cada cuánto y desde cuándo */}
        {recurring && (
          <fieldset className="flex flex-col gap-4 rounded-md border border-line p-3">
            <legend className="px-1 text-sm font-semibold text-ink-strong">
              <span className="inline-flex items-center gap-1">
                <Repeat size={15} aria-hidden /> ¿Cada cuánto se cobra?
              </span>
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField label="Frecuencia" value={frequency} onChange={(e) => setFrequency(e.target.value as ExpenseFrequency)} disabled={saving}
                help="Cada cuánto se repite el cobro.">
                {(Object.keys(FREQUENCY_LABEL) as ExpenseFrequency[]).map((f) => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABEL[f]}
                  </option>
                ))}
              </SelectField>
              {frequency === "WEEKLY" && (
                <SelectField label="Día de la semana" value={weekday} onChange={(e) => setWeekday(e.target.value)} disabled={saving}
                  help="Qué día de cada semana se cobra.">
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <option key={d} value={d}>
                      {WEEKDAYS[d]![0]!.toUpperCase() + WEEKDAYS[d]!.slice(1)}
                    </option>
                  ))}
                </SelectField>
              )}
              {frequency === "YEARLY" && (
                <SelectField label="Mes" value={month} onChange={(e) => setMonth(e.target.value)} disabled={saving} help="En qué mes de cada año se cobra.">
                  {MONTHS.slice(1).map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m[0]!.toUpperCase() + m.slice(1)}
                    </option>
                  ))}
                </SelectField>
              )}
              {["MONTHLY", "BIMONTHLY", "YEARLY"].includes(frequency) && (
                <SelectField label="Día del mes" value={monthDay} onChange={(e) => setMonthDay(e.target.value)} disabled={saving}
                  help="Si el mes no tiene ese día (31 en febrero), se cobra el último día del mes.">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      Día {d}
                    </option>
                  ))}
                </SelectField>
              )}
              {!editing && (
                <TextField label="Empieza a cobrarse desde" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={saving}
                  help="Primer día en que puede cobrarse. Si es una fecha pasada, se registran los cobros que ya vencieron." />
              )}
              <TextField label="Termina el (opcional)" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} disabled={saving}
                help="Déjelo vacío si no tiene fin. Ej.: un préstamo que termina en diciembre." />
            </div>
            {preview && (
              <p className="flex items-start gap-2 rounded-md bg-brand-soft p-3 text-sm text-ink-strong" data-testid="expense-preview">
                <CalendarClock size={18} aria-hidden className="mt-0.5 shrink-0 text-brand-accent" />
                <span>
                  {preview.length === 0 ? (
                    "Con estas fechas no habrá más cobros."
                  ) : (
                    <>
                      Se cobrará <strong>{amountText ?? "el monto"}</strong> · {scheduleText({ frequency, weekday: Number(weekday), month_day: Number(monthDay), month_of_year: Number(month) }).toLowerCase()}.
                      <br />
                      Próximos cobros: <strong>{preview.map(longDate).join(" · ")}</strong>
                    </>
                  )}
                  {editing && <span className="block text-xs text-ink-muted">Los cobros ya registrados no cambian.</span>}
                </span>
              </p>
            )}
          </fieldset>
        )}

        {!editing && (
          <TextAreaField label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} disabled={saving}
            help="Proveedor, número de recibo, etc." />
        )}

        {error && (
          <p role="alert" className="text-sm font-semibold text-blocked-ink">
            [!] {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end md:gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} loadingLabel="Guardando…" data-testid="expense-save">
            {editing ? "Guardar cambios" : recurring ? "Crear gasto continuo" : "Registrar gasto"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ----- Anular un cargo -------------------------------------------------------------------
function VoidModal({ expense, onClose, onDone }: { expense: BusinessExpense; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await rpc.voidExpense(expense.id, reason.trim());
      toast.success("Gasto anulado. Ya no cuenta en la utilidad.");
      onDone();
    } catch (err) {
      setError(toAppError(err).userText);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal title={`Anular gasto · ${expense.concept}`} onClose={onClose} locked={saving}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <p className="text-sm text-ink-base">
          {formatMoney(expense.amount)} del {longDate(expense.expense_date)}. Dejará de contar en la utilidad; queda en la bitácora.
        </p>
        <TextField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} error={error} required disabled={saving}
          help="Por qué se anula. Ej.: se capturó dos veces." />
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end md:gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" loading={saving}>
            Anular gasto
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ----- Pestaña ---------------------------------------------------------------------------
export function ExpensesTab({ from, to }: { from: string; to: string }) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [history, setHistory] = useState<BusinessExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<RecurringExpense | "new" | null>(null);
  const [voiding, setVoiding] = useState<BusinessExpense | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await rpc.generateDueExpenses(); // ponerse al día antes de mostrar
      const [cats, rec, hist] = await Promise.all([fetchExpenseCategories(), rpc.listRecurringExpenses(), fetchBusinessExpenses(from, to)]);
      setCategories(cats);
      setRecurring(rec);
      setHistory(hist);
      setError(null);
    } catch (err) {
      setError(toAppError(err).userText);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = useMemo(
    () => history.filter((h) => !h.voided_at).reduce((s, h) => s + Number(h.amount), 0),
    [history],
  );
  const monthlyFixed = useMemo(() => {
    // Aproximación mensual de los gastos continuos activos (para el resumen).
    const factor: Record<ExpenseFrequency, number> = { DAILY: 30, WEEKLY: 52 / 12, BIWEEKLY: 2, MONTHLY: 1, BIMONTHLY: 0.5, YEARLY: 1 / 12 };
    return recurring.filter((r) => !r.paused).reduce((s, r) => s + Number(r.amount) * factor[r.frequency], 0);
  }, [recurring]);

  async function togglePause(r: RecurringExpense) {
    setBusy(r.id);
    try {
      await rpc.setRecurringExpensePaused(r.id, !r.paused);
      toast.success(r.paused ? `«${r.concept}» reanudado. Cobra desde hoy.` : `«${r.concept}» en pausa. No se cobrará hasta reanudarlo.`);
      await load();
    } catch (err) {
      toast.error(toAppError(err).userText);
    } finally {
      setBusy(null);
    }
  }

  async function remove(r: RecurringExpense) {
    if (!window.confirm(`¿Eliminar el gasto continuo «${r.concept}»?\n\nDejará de cobrarse desde hoy. Los ${r.charges} cobros ya registrados se conservan en el historial y en los reportes.`)) return;
    setBusy(r.id);
    try {
      await rpc.deleteRecurringExpense(r.id);
      toast.success(`«${r.concept}» eliminado. Ya no se cobrará.`);
      await load();
    } catch (err) {
      toast.error(toAppError(err).userText);
    } finally {
      setBusy(null);
    }
  }

  if (loading && recurring.length === 0 && history.length === 0) return <Spinner label="Cargando gastos…" />;

  return (
    <div className="flex flex-col gap-5">
      {error && <ErrorPanel message={error} onRetry={() => void load()} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 gap-3 tabular sm:flex sm:gap-6">
          <div>
            <p className="text-xs text-ink-muted">Gastos del periodo</p>
            <p className="text-xl font-bold text-ink-strong">{formatMoney(total.toFixed(2))}</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-xs text-ink-muted">
              Gastos fijos al mes (aprox.) <InfoTip text="Suma de los gastos continuos activos convertida a un mes. Sirve como referencia." />
            </p>
            <p className="text-xl font-bold text-ink-strong">{formatMoney(monthlyFixed.toFixed(2))}</p>
          </div>
        </div>
        <Button onClick={() => setForm("new")} title="Registrar un gasto único o continuo" data-testid="new-expense">
          <span className="inline-flex items-center gap-1.5">
            <Plus size={16} aria-hidden /> Gasto
          </span>
        </Button>
      </div>

      {/* Gastos continuos */}
      <section className="flex flex-col gap-2" aria-label="Gastos continuos">
        <h2 className="flex items-center gap-1 text-base font-bold text-ink-strong">
          Gastos continuos <InfoTip text="Se cobran solos en cada fecha. Editar cambia los próximos cobros; eliminar deja de cobrar desde hoy." />
        </h2>
        {recurring.length === 0 ? (
          <EmptyState>Sin gastos continuos. Use «+ Gasto» y marque «Es un gasto continuo» para renta, sueldos o servicios.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="recurring-list">
            {recurring.map((r) => (
              <li key={r.id} className={`flex flex-col gap-3 rounded-md border bg-surface-0 p-4 md:flex-row md:items-center ${r.paused ? "border-dashed border-line" : "border-line"}`}>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-semibold text-ink-strong">
                    {r.concept} <span className="text-xs font-normal text-ink-muted">· {r.category}</span>
                    {r.paused && <span className="ml-2 rounded-full bg-warning px-2 py-0.5 text-xs font-bold text-warning-ink">En pausa</span>}
                  </span>
                  <span className="text-sm text-ink-base">
                    <strong className="tabular">{formatMoney(r.amount)}</strong> · {scheduleText(r)}
                    {r.ends_on && ` · termina el ${longDate(r.ends_on)}`}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {r.paused ? "No se cobrará hasta reanudarlo." : r.next_charge ? `Próximo cobro: ${longDate(r.next_charge)}` : "Ya no tiene cobros pendientes."}
                    {" · "}
                    {r.charges} cobro{r.charges === 1 ? "" : "s"} registrado{r.charges === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" title="Cambiar monto, concepto o frecuencia desde el próximo cobro" onClick={() => setForm(r)} disabled={busy !== null}>
                    <span className="inline-flex items-center gap-1.5"><Pencil size={15} aria-hidden /> Editar</span>
                  </Button>
                  <Button variant="secondary" title={r.paused ? "Volver a cobrar desde hoy" : "Dejar de cobrar temporalmente"} loading={busy === r.id} onClick={() => void togglePause(r)}>
                    <span className="inline-flex items-center gap-1.5">
                      {r.paused ? <Play size={15} aria-hidden /> : <Pause size={15} aria-hidden />} {r.paused ? "Reanudar" : "Pausar"}
                    </span>
                  </Button>
                  <Button variant="secondary" className="text-blocked-ink" title="Dejar de cobrarlo para siempre. El historial se conserva" onClick={() => void remove(r)} disabled={busy !== null}>
                    <span className="inline-flex items-center gap-1.5"><Trash2 size={15} aria-hidden /> Eliminar</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Historial */}
      <section className="flex flex-col gap-2" aria-label="Historial de gastos">
        <h2 className="flex items-center gap-1 text-base font-bold text-ink-strong">
          Historial del periodo <InfoTip text="Todos los gastos registrados en las fechas elegidas arriba. Un gasto no se edita: se anula con motivo." />
        </h2>
        {history.length === 0 ? (
          <EmptyState>Sin gastos en este periodo.</EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-md border border-line bg-surface-0">
            <table className="w-full text-sm" data-testid="expense-history">
              <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Concepto</th>
                  <th className="hidden px-3 py-2 sm:table-cell">Categoría</th>
                  <th className="px-3 py-2 text-right">Monto</th>
                  <th className="hidden px-3 py-2 md:table-cell">Origen</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className={`border-t border-line ${h.voided_at ? "text-ink-muted line-through" : ""}`}>
                    <td className="whitespace-nowrap px-3 py-2 tabular">{h.expense_date.split("-").reverse().join("/")}</td>
                    <td className="px-3 py-2">
                      {h.concept}
                      <span className="block text-xs text-ink-muted no-underline sm:hidden">{h.category?.name}</span>
                      {h.voided_at && <span className="block text-xs no-underline">Anulado: {h.void_reason}</span>}
                    </td>
                    <td className="hidden px-3 py-2 sm:table-cell">{h.category?.name ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular">{formatMoney(h.amount)}</td>
                    <td className="hidden px-3 py-2 text-xs md:table-cell">{h.recurring_expense_id ? "Automático" : (h.created_by?.full_name ?? "Manual")}</td>
                    <td className="px-3 py-2 text-right">
                      {!h.voided_at && (
                        <Button variant="ghost" title="Anular este gasto (se capturó mal o por error)" onClick={() => setVoiding(h)}>
                          Anular
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {form && (
        <ExpenseForm
          categories={categories}
          editing={form === "new" ? undefined : form}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            void load();
          }}
        />
      )}
      {voiding && (
        <VoidModal
          expense={voiding}
          onClose={() => setVoiding(null)}
          onDone={() => {
            setVoiding(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
