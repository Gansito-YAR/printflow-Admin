// Nota de remisión (Spec-Kit §3.3). Carta, márgenes de 12 mm.
// El QR (payload = qr_code_hash, ARQ-01) va solo en la ÚLTIMA página: es lo
// que escanea el instalador para confirmar la entrega.

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { OrderDetail } from "../../lib/types";
import { METHOD_LABEL, UNIT_LABEL } from "../../lib/types";
import { formatMoney } from "../../utils/money";
import { formatDateLong, formatDateTime } from "../../utils/dates";
import { MM, pdfTheme } from "./pdfTheme";

const QR_BOX = 40 * MM;

const s = StyleSheet.create({
  page: {
    paddingTop: 12 * MM,
    paddingHorizontal: 12 * MM,
    paddingBottom: 12 * MM + QR_BOX + 6 * MM, // espacio reservado para el QR
    fontSize: 9,
    color: pdfTheme.ink,
    fontFamily: "Helvetica",
  },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: pdfTheme.brand, paddingBottom: 6, marginBottom: 10 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  muted: { color: pdfTheme.inkMuted },
  bold: { fontFamily: "Helvetica-Bold" },
  section: { marginBottom: 10 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: pdfTheme.line, paddingVertical: 3 },
  th: { flexDirection: "row", backgroundColor: pdfTheme.surface, paddingVertical: 3, fontFamily: "Helvetica-Bold" },
  cDesc: { flex: 5, paddingHorizontal: 3 },
  cQty: { flex: 1.5, textAlign: "right", paddingHorizontal: 3 },
  cPrice: { flex: 1.5, textAlign: "right", paddingHorizontal: 3 },
  cTotal: { flex: 1.5, textAlign: "right", paddingHorizontal: 3 },
  totals: { alignSelf: "flex-end", width: 200, marginTop: 6 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  qrWrap: { position: "absolute", bottom: 12 * MM, left: 12 * MM, right: 12 * MM, flexDirection: "row", alignItems: "flex-end", gap: 10 },
  qr: { width: QR_BOX, height: QR_BOX },
  footer: { position: "absolute", top: 6 * MM, right: 12 * MM, fontSize: 7, color: pdfTheme.inkMuted },
});

export function RemissionDocument({
  order,
  paid,
  qrDataUrl,
  timezone,
  logoSrc,
}: {
  order: OrderDetail;
  paid: string;
  qrDataUrl: string;
  timezone: string;
  logoSrc: string;
}) {
  return (
    <Document title={`Remisión ${order.folio}`} author="Imprenta Escalante">
      <Page size="LETTER" style={s.page}>
        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        <View style={s.header} fixed>
          <View>
            <Image src={logoSrc} style={{ width: 110, marginBottom: 4 }} />
            <Text style={s.muted}>Imprenta Escalante</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.title}>Nota de remisión</Text>
            <Text style={s.bold}>{order.folio}</Text>
            <Text style={s.muted}>Emitida: {formatDateTime(new Date().toISOString(), timezone)}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text>
            <Text style={s.bold}>Cliente: </Text>
            {order.customer?.full_name ?? "—"} · {order.customer?.phone_number ?? ""}
          </Text>
          <Text>
            <Text style={s.bold}>Entrega pactada: </Text>
            {formatDateLong(order.promised_date, timezone)}
          </Text>
          {order.notes ? (
            <Text>
              <Text style={s.bold}>Notas: </Text>
              {order.notes}
            </Text>
          ) : null}
        </View>

        <View style={s.th} fixed>
          <Text style={s.cDesc}>Descripción</Text>
          <Text style={s.cQty}>Cantidad</Text>
          <Text style={s.cPrice}>P. unitario</Text>
          <Text style={s.cTotal}>Importe</Text>
        </View>
        {order.items.map((it) => (
          <View key={it.line_no} style={s.row} wrap={false}>
            <Text style={s.cDesc}>{it.description}</Text>
            <Text style={s.cQty}>
              {it.quantity} {UNIT_LABEL[it.pricing_unit]}
            </Text>
            <Text style={s.cPrice}>{formatMoney(it.unit_price)}</Text>
            <Text style={s.cTotal}>{formatMoney(it.line_total)}</Text>
          </View>
        ))}

        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}>
            <Text>Total</Text>
            <Text style={s.bold}>{formatMoney(order.total_price)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text>Pagado</Text>
            <Text>{formatMoney(paid)}</Text>
          </View>
          <View style={[s.totalRow, { borderTopWidth: 1, borderTopColor: pdfTheme.ink }]}>
            <Text style={s.bold}>Saldo pendiente</Text>
            <Text style={s.bold}>{formatMoney(order.balance_due)}</Text>
          </View>
        </View>

        {order.payments.length > 0 && (
          <View style={[s.section, { marginTop: 10 }]} wrap={false}>
            <Text style={s.bold}>Abonos</Text>
            {order.payments.map((p) => (
              <Text key={p.id} style={s.muted}>
                {formatDateTime(p.created_at, timezone)} · {METHOD_LABEL[p.payment_method]} · {formatMoney(p.amount)}
              </Text>
            ))}
          </View>
        )}

        <View
          style={s.qrWrap}
          fixed
          // react-pdf entrega totalPages también a View, aunque su tipo no lo declare.
          render={(props) => {
            const { pageNumber, totalPages } = props as unknown as { pageNumber: number; totalPages: number };
            return pageNumber === totalPages ? (
              <>
                <Image src={qrDataUrl} style={s.qr} />
                <View style={{ flex: 1 }}>
                  <Text style={s.bold}>Código de entrega</Text>
                  <Text style={s.muted}>
                    El instalador escanea este código al entregar. La entrega solo se confirma si el saldo es $0.00.
                  </Text>
                </View>
              </>
            ) : null;
          }}
        />
      </Page>
    </Document>
  );
}
