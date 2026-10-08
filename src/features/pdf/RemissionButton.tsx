// Genera la remisión bajo demanda. @react-pdf y qrcode se cargan en diferido
// para no inflar el bundle inicial.
//
// Estados: idle → generating → ready (descarga) | error.
// Antes de generar se valida la coherencia del dinero: pagado = total − saldo
// debe coincidir con Σ abonos (en centavos BigInt). Si no, se aborta: un
// documento con cifras inconsistentes no debe salir de la imprenta.

import { useState } from "react";
import toast from "react-hot-toast";
import type { OrderDetail } from "../../lib/types";
import { toCents } from "../../utils/money";
import { Button } from "../../components/ui";

function centsToString(c: bigint): string {
  const neg = c < 0n;
  const abs = neg ? -c : c;
  const s = `${abs / 100n}.${(abs % 100n).toString().padStart(2, "0")}`;
  return neg ? `-${s}` : s;
}

/** Devuelve el monto pagado como string, o null si las cifras no cuadran. */
export function derivePaid(order: Pick<OrderDetail, "total_price" | "balance_due" | "payments">): string | null {
  const total = toCents(order.total_price);
  const balance = toCents(order.balance_due);
  if (total === null || balance === null) return null;
  let sum = 0n;
  for (const p of order.payments) {
    const c = toCents(p.amount);
    if (c === null) return null;
    sum += c;
  }
  const paid = total - balance;
  return paid === sum ? centsToString(paid) : null;
}

export function RemissionButton({ order, timezone }: { order: OrderDetail; timezone: string }) {
  const [state, setState] = useState<"idle" | "generating" | "error">("idle");

  async function generate() {
    if (state === "generating") return;
    const paid = derivePaid(order);
    if (paid === null) {
      setState("error");
      toast.error("Las cifras del pedido no cuadran; recargue la página antes de imprimir.");
      return;
    }
    setState("generating");
    try {
      const [{ pdf }, QR, { RemissionDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("qrcode"),
        import("./RemissionDocument"),
      ]);
      const qrDataUrl = await QR.toDataURL(order.qr_code_hash, { errorCorrectionLevel: "M", margin: 1, width: 480 });
      const blob = await pdf(
        <RemissionDocument
          order={order}
          paid={paid}
          qrDataUrl={qrDataUrl}
          timezone={timezone}
          logoSrc={`${window.location.origin}/brand/logo-full.png`}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Remision_${order.folio}.pdf`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setState("idle");
    } catch {
      setState("error");
      toast.error("No se pudo generar la remisión.");
    }
  }

  return (
    <Button
      variant="secondary"
      onClick={() => void generate()}
      loading={state === "generating"}
      loadingLabel="Generando PDF…"
      data-testid="button-remission"
    >
      {state === "error" ? "Reintentar remisión" : "Descargar remisión (PDF)"}
    </Button>
  );
}
