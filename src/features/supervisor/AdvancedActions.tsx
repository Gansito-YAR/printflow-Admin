// Acciones avanzadas (SRS Fase 3 §6, Spec-Kit §3.4). Requieren reautenticar.
// Toda acción exige motivo y queda en la bitácora del pedido.
// "Forzar entrega" NO existe (ARQ-03): se muestra deshabilitada y explicada.

import { useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { rpc } from "../../lib/rpc";
import { toAppError } from "../../lib/errors";
import type { OrderDetail } from "../../lib/types";
import { fromDateTimeLocal, toDateTimeLocal } from "../../utils/dates";
import { Button, Modal, TextAreaField, TextField } from "../../components/ui";
import { ReauthForm } from "../auth/ReauthForm";

type Action = "reschedule" | "override" | "cancel";

const ACTION_TITLE: Record<Action, string> = {
  reschedule: "Reprogramar fecha pactada",
  override: "Iniciar producción sin anticipo",
  cancel: "Cancelar pedido",
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

  return (
    <section className="flex flex-col gap-3 rounded-md border border-line bg-surface-0 p-6" aria-label="Acciones avanzadas">
      <h2 className="font-bold text-ink-strong">Acciones avanzadas</h2>
      <p className="text-xs text-ink-muted">Requieren confirmar su contraseña y un motivo. Quedan en la bitácora.</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => setAction("reschedule")} disabled={closed}>
          Reprogramar fecha
        </Button>
        <Button variant="secondary" onClick={() => setAction("override")} disabled={order.status !== "PENDING_DEPOSIT"}>
          Producción sin anticipo
        </Button>
        <Button variant="danger" onClick={() => setAction("cancel")} disabled={closed}>
          Cancelar pedido
        </Button>
        <Button variant="secondary" disabled title="La entrega solo se confirma con saldo $0.00 escaneando el QR.">
          Forzar entrega (no disponible)
        </Button>
      </div>
      <p className="text-xs text-ink-muted">
        Forzar entrega no existe por diseño: ningún pedido se entrega con saldo pendiente.
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
  const [verified, setVerified] = useState(false);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(toDateTimeLocal(order.promised_date, timezone));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

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
      if (action === "override") await rpc.startProductionOverride(order.id, reason.trim());
      if (action === "cancel") await rpc.cancelOrder(order.id, reason.trim());
      toast.success("Acción registrada.");
      onDone();
    } catch (err) {
      setError(toAppError(err).userText);
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <Modal title={`${ACTION_TITLE[action]} · ${order.folio}`} onClose={onClose} locked={saving}>
      {!verified ? (
        <ReauthForm onConfirmed={() => setVerified(true)} />
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
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Volver
            </Button>
            <Button type="submit" variant={action === "cancel" ? "danger" : "primary"} loading={saving}>
              Confirmar
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
