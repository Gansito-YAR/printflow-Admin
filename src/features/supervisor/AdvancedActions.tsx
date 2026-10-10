// Acciones avanzadas (SRS Fase 3 §6, Spec-Kit §3.4). Requieren reautenticar.
// Toda acción exige motivo y queda en la bitácora del pedido.
// "Autorizar entrega con saldo" (BRD §6 Actor 1, SRS Fase 3 §6.3): además de la
// contraseña de esta pantalla, el SERVIDOR exige un login de menos de 5 minutos.

import { useShortageGuard } from "../orders/useShortageGuard";
import { useEffect, useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { rpc } from "../../lib/rpc";
import { toAppError } from "../../lib/errors";
import { formatMoney, isZero } from "../../utils/money";
import type { OrderDetail } from "../../lib/types";
import { fromDateTimeLocal, toDateTimeLocal } from "../../utils/dates";
import { fetchOrderConsumption, type ConsumedMaterial } from "../../lib/queries";
import { MATERIAL_UNIT_LABEL, type MaterialUnit } from "../../lib/types";
import { compareQty, formatQty, parseQuantity } from "../../utils/quantity";
import { Button, Modal, TextAreaField, TextField } from "../../components/ui";
import { ReauthForm } from "../auth/ReauthForm";

type Action = "reschedule" | "override" | "cancel" | "force";

const ACTION_TITLE: Record<Action, string> = {
  reschedule: "Reprogramar fecha pactada",
  override: "Iniciar producción sin anticipo",
  cancel: "Cancelar pedido",
  force: "Autorizar entrega con saldo pendiente",
};

export function AdvancedActions({
  order,
  timezone,
  onDone,
}: {
  order: OrderDetail;
  timezone: string;
  onDone: () => void;
}) {
  const [action, setAction] = useState<Action | null>(null);
  const closed = order.status === "DELIVERED" || order.status === "CANCELLED";
  // RSP-07: el motivo de un botón deshabilitado se muestra como texto (no hay "hover" en celular).
  const forceHint =
    order.status !== "READY_FOR_DELIVERY"
      ? "Forzar entrega solo aplica a pedidos listos para entrega."
      : isZero(order.balance_due)
        ? "El pedido está liquidado: lo entrega el instalador escaneando el QR."
        : null;

  return (
    <section className="flex flex-col gap-3 rounded-md border border-line bg-surface-0 p-4 md:p-6" aria-label="Acciones avanzadas">
      <h2 className="font-bold text-ink-strong">Acciones avanzadas</h2>
      <p className="text-xs text-ink-muted">Requieren confirmar su contraseña y un motivo. Quedan en la bitácora.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:gap-3">
        <Button variant="secondary" onClick={() => setAction("reschedule")} disabled={closed}>
          Reprogramar fecha
        </Button>
        <Button variant="secondary" onClick={() => setAction("override")} disabled={order.status !== "PENDING_DEPOSIT"}>
          Producción sin anticipo
        </Button>
        <Button variant="danger" onClick={() => setAction("cancel")} disabled={closed}>
          Cancelar pedido
        </Button>
        <Button
          variant="danger"
          onClick={() => setAction("force")}
          disabled={order.status !== "READY_FOR_DELIVERY" || isZero(order.balance_due)}
          aria-describedby={forceHint ? "force-hint" : undefined}
          data-testid="button-force-delivery"
        >
          Forzar entrega (cliente con crédito)
        </Button>
      </div>
      {forceHint && (
        <p id="force-hint" className="text-xs text-ink-muted">
          {forceHint}
        </p>
      )}
      <p className="text-xs text-ink-muted">
        Forzar entrega es la única forma de entregar con saldo pendiente: el saldo queda por cobrar y la autorización
        queda en la bitácora con su motivo.
      </p>
      {action && (
        <ActionModal
          action={action}
          order={order}
          timezone={timezone}
          onClose={() => setAction(null)}
          onDone={() => {
            setAction(null);
            onDone();
          }}
        />
      )}
    </section>
  );
}

function ActionModal({
  action,
  order,
  timezone,
  onClose,
  onDone,
}: {
  action: Action;
  order: OrderDetail;
  timezone: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { confirmProduction, modal: shortageModal } = useShortageGuard();
  const [verified, setVerified] = useState(false);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(toDateTimeLocal(order.promised_date, timezone));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  // M4-D-08: al cancelar un pedido que ya consumió insumos, ¿se recuperó material?
  const consumedStatus = order.status === "IN_PRODUCTION" || order.status === "READY_FOR_DELIVERY";
  const [consumed, setConsumed] = useState<ConsumedMaterial[]>([]);
  const [returns, setReturns] = useState<Record<string, string>>({});

  useEffect(() => {
    if (action !== "cancel" || !consumedStatus) return;
    fetchOrderConsumption(order.id)
      .then(setConsumed)
      .catch(() => setConsumed([]));
  }, [action, consumedStatus, order.id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    if (reason.trim().length < 5) {
      setError("Escriba un motivo de al menos 5 caracteres.");
      return;
    }
    let iso: string | null = null;
    if (action === "reschedule") {
      iso = fromDateTimeLocal(date, timezone);
      if (!iso) {
        setError("Fecha inválida.");
        return;
      }
    }
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      if (action === "reschedule" && iso) await rpc.rescheduleOrder(order.id, iso, reason.trim());
      if (action === "override") {
        // C6: producción sin anticipo también descuenta insumos.
        if (!(await confirmProduction(order.id))) {
          inFlight.current = false;
          setSaving(false);
          return;
        }
        await rpc.startProductionOverride(order.id, reason.trim());
      }
      if (action === "force") await rpc.forceDelivery(order.id, reason.trim());
      if (action === "cancel") {
        const list: { raw_material_id: string; qty: string }[] = [];
        for (const c of consumed) {
          const raw = (returns[c.raw_material_id] ?? "").trim();
          if (!raw || raw === "0") continue;
          const q = parseQuantity(raw, { label: `Reintegro de ${c.name}` });
          if (!q.ok) throw new Error(q.error);
          if (compareQty(q.value, c.consumed) > 0) throw new Error(`No puede reintegrar más de ${formatQty(c.consumed)} de ${c.name}.`);
          list.push({ raw_material_id: c.raw_material_id, qty: q.value });
        }
        await rpc.cancelOrder(order.id, reason.trim(), list);
      }
      toast.success("Acción registrada.");
      onDone();
    } catch (err) {
      if (err instanceof Error && err.name === "Error") {
        setError(err.message);
      } else {
        const appError = toAppError(err);
        // La autorización se venció (más de 5 min desde la contraseña): pedirla de nuevo.
        if (appError.code === "PF_REAUTH_REQUIRED") setVerified(false);
        setError(appError.userText);
      }
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <>
    <Modal title={`${ACTION_TITLE[action]} · ${order.folio}`} onClose={onClose} locked={saving}>
      {!verified ? (
        <>
          {error && (
            <p role="alert" className="mb-3 text-sm font-semibold text-blocked-ink">
              [!] {error}
            </p>
          )}
          <ReauthForm
            onConfirmed={() => {
              setError(null);
              setVerified(true);
            }}
          />
        </>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {action === "reschedule" && (
            <TextField
              label="Nueva fecha pactada"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              hint={`Hora de ${timezone}.`}
              disabled={saving}
              required
            />
          )}
          {action === "cancel" && (
            <p className="rounded-md border-2 border-blocked-line bg-blocked p-3 text-sm text-blocked-ink">
              Cancelar es definitivo. Los abonos registrados se conservan en el historial.
            </p>
          )}
          {action === "force" && (
            <div
              className="flex flex-col gap-1 rounded-md border-2 border-blocked-line bg-blocked p-3 text-sm text-blocked-ink"
              data-testid="force-warning"
            >
              <p className="font-bold">Esta acción entrega el pedido sin cobrar el saldo.</p>
              <p>
                Saldo que queda por cobrar: <strong className="tabular">{formatMoney(order.balance_due)}</strong>. El
                pedido pasa a &quot;Entregado&quot; y el adeudo seguirá visible en el tablero hasta que se liquide. No se
                puede deshacer.
              </p>
            </div>
          )}
          {action === "cancel" && consumed.length > 0 && (
            <fieldset className="flex flex-col gap-2 rounded-md border border-line p-3" data-testid="returns-fieldset">
              <legend className="px-1 text-sm font-semibold text-ink-strong">¿Se recuperó material? (opcional)</legend>
              <p className="text-xs text-ink-muted">
                Indique cuánto vuelve al inventario. Deje 0 si el material ya se cortó o imprimió.
              </p>
              {consumed.map((c) => (
                <TextField
                  key={c.raw_material_id}
                  label={`${c.name} (consumido ${formatQty(c.consumed)} ${MATERIAL_UNIT_LABEL[c.unit as MaterialUnit] ?? c.unit})`}
                  inputMode="decimal"
                  value={returns[c.raw_material_id] ?? "0"}
                  onChange={(e) => setReturns((r) => ({ ...r, [c.raw_material_id]: e.target.value }))}
                  disabled={saving}
                />
              ))}
            </fieldset>
          )}
          <TextAreaField
            label="Motivo"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={saving}
            required
          />
          {error && (
            <p role="alert" className="text-sm font-semibold text-blocked-ink">
              [!] {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end md:gap-3">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Volver
            </Button>
            <Button type="submit" variant={action === "cancel" || action === "force" ? "danger" : "primary"} loading={saving}>
              Confirmar
            </Button>
          </div>
        </form>
      )}
    </Modal>
    {shortageModal}
    </>
  );
}
