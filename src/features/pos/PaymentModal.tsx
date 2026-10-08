// Modal de cobro (SRS Fase 3 §4, Spec-Kit §3.2).
//
// Contrato anti doble clic: en el MISMO tick del primer envío se bloquea con
// una guarda síncrona (ref), no solo con estado de React.
//
// Idempotencia: la clave se genera al ABRIR el modal y se reutiliza en cada
// reintento. Si la red cae después de enviar ("resultado incierto"), reintentar
// es seguro: la base reconoce la clave y no duplica el cobro.

import { useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { rpc } from "../../lib/rpc";
import { toAppError } from "../../lib/errors";
import type { Money, PaymentMethod } from "../../lib/types";
import { METHOD_LABEL } from "../../lib/types";
import { formatMoney, isGreater, parseAmountInput } from "../../utils/money";
import { Button, Modal, SelectField, TextField } from "../../components/ui";

export interface PaymentTarget {
  id: string;
  folio: string;
  customerName: string;
  totalPrice: Money;
  balanceDue: Money;
}

export function PaymentModal({
  order,
  onClose,
  onPaid,
}: {
  order: PaymentTarget;
  onClose: () => void;
  onPaid: (newBalance: Money) => void;
}) {
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const inFlight = useRef(false);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [methodError, setMethodError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return; // guarda síncrona: un solo envío

    const parsed = parseAmountInput(amount);
    const amountErr = !parsed.ok
      ? parsed.error
      : isGreater(parsed.value, order.balanceDue)
        ? `El abono excede el saldo pendiente de ${formatMoney(order.balanceDue)}.`
        : null;
    const methodErr = method ? null : "Seleccione efectivo, transferencia o tarjeta.";
    setAmountError(amountErr);
    setMethodError(methodErr);
    if (amountErr || methodErr || !parsed.ok || !method) return;

    inFlight.current = true;
    setSubmitting(true);
    setServerError(null);
    try {
      const result = await rpc.registerPayment(order.id, parsed.value, method, idempotencyKey.current);
      toast.success(
        result.duplicate
          ? "El abono ya estaba registrado (no se duplicó)."
          : `Abono registrado correctamente. Saldo: ${formatMoney(result.balance_due)}`,
      );
      onPaid(result.balance_due);
      onClose();
    } catch (err) {
      const appError = toAppError(err);
      if (appError.isNetwork) {
        setUncertain(true);
        setServerError(null);
      } else {
        setServerError(appError.userText);
        toast.error("Error al procesar el pago.");
      }
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={`Registrar abono · ${order.folio}`}
      onClose={onClose}
      locked={submitting}
      testId="payment-modal"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="payment-form"
            loading={submitting}
            loadingLabel="Registrando abono…"
            data-testid="button-submit-payment"
          >
            {uncertain ? "Reintentar (seguro)" : "Registrar abono"}
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <div className="rounded-md border border-line bg-surface-1 p-4">
          <p className="text-sm text-ink-muted">{order.customerName}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 tabular">
            <span className="text-sm text-ink-muted">Total del pedido</span>
            <span className="text-right text-sm font-semibold text-ink-strong">{formatMoney(order.totalPrice)}</span>
            <span className="text-sm font-semibold text-ink-strong">Saldo actual</span>
            <span className="text-right text-2xl font-bold text-ink-strong" data-testid="current-balance">
              {formatMoney(order.balanceDue)}
            </span>
          </div>
        </div>

        <TextField
          label="Monto del abono"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={submitting}
          error={amountError}
          hint={`Máximo ${formatMoney(order.balanceDue)}`}
          data-testid="input-payment-amount"
          required
        />

        <SelectField
          label="Método de pago"
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod | "")}
          disabled={submitting}
          error={methodError}
          data-testid="select-payment-method"
          required
        >
          <option value="">Seleccione método</option>
          {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
            <option key={m} value={m}>
              {METHOD_LABEL[m]}
            </option>
          ))}
        </SelectField>

        <p className="rounded-md border border-line bg-surface-1 p-3 text-xs text-ink-base">
          Las transferencias se verifican manualmente antes de registrarlas: el sistema no valida pagos SPEI.
        </p>

        {uncertain && (
          <p role="alert" className="rounded-md border-2 border-warning-line bg-warning p-3 text-sm text-warning-ink">
            <strong>Resultado incierto:</strong> se perdió la conexión antes de confirmar el abono. Reintentar es
            seguro: el sistema reconoce este intento y no duplicará el cobro.
          </p>
        )}

        {serverError && (
          <p role="alert" data-testid="payment-error" className="text-sm font-semibold text-blocked-ink">
            [!] {serverError}
          </p>
        )}
      </form>
    </Modal>
  );
}
