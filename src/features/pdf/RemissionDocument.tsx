// Nota de remisión (Spec-Kit Pantalla 3, SRS Fase 3 §5.2, BRD §5). Carta, 12 mm.
//
//  · Encabezado con logo, folio y fecha de emisión.
//  · FECHA PACTADA DE ENTREGA en recuadro prominente.
//  · Tabla Cant. / Descripción / P. Unit. / Importe.
//  · Pie financiero: subtotal, anticipos y SALDO PENDIENTE (rojo, negritas).
//  · Abonos con quién los registró (audit trail, BRD §8).
//  · QR en la esquina inferior derecha de la ÚLTIMA página (payload = qr_code_hash,
//    ARQ-01): es lo que escanea el instalador para confirmar la entrega.

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { OrderDetail } from "../../lib/types";
import { METHOD_LABEL, itemQuantityLabel } from "../../lib/types";
import { formatMoney, isZero } from "../../utils/money";
import { formatDateTime } from "../../utils/dates";
import { MM, pdfTheme } from "./pdfTheme";

const QR_BOX = 40 * MM;

const s = StyleSheet.create({
  page: {
    paddingTop: 12 * MM,
    paddingHorizontal: 12 * MM,
    paddingBottom: 12 * MM + QR_BOX + 8 * MM, // espacio reservado para el QR y el aviso
    fontSize: 9,
    color: pdfTheme.ink,
    fontFamily: "Helvetica",
  },
  header: { flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: pdfTheme.brand, paddingBottom: 8, marginBottom: 10 },
  logo: { width: 80, height: 80 },
  headerText: { marginLeft: 12, flex: 1 },
  company: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  docTitle: { fontSize: 11, marginTop: 2 },
  folio: { fontFamily: "Helvetica-Bold", fontSize: 12, marginTop: 4 },
  muted: { color: pdfTheme.inkMuted },
  bold: { fontFamily: "Helvetica-Bold" },
  dateBox: { borderWidth: 2, borderColor: pdfTheme.ink, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 10, alignItems: "center" },
  dateLabel: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  dateValue: { fontSize: 19, fontFamily: "Helvetica-Bold", marginTop: 2 },
  customer: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 8, marginBottom: 8, borderBottomWidth: 0.5, borderBottomColor: pdfTheme.line, fontSize: 10 },
  th: { flexDirection: "row", backgroundColor: pdfTheme.surface, paddingVertical: 4, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: pdfTheme.line, paddingVertical: 4 },
  cQty: { width: 62, paddingHorizontal: 4 },
  cDesc: { flex: 1, paddingHorizontal: 4 },
  cPrice: { width: 70, textAlign: "right", paddingHorizontal: 4 },
  cTotal: { width: 78, textAlign: "right", paddingHorizontal: 4 },
  totals: { alignSelf: "flex-end", width: 235, marginTop: 8 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, fontSize: 10 },
  balanceBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4, borderWidth: 2.5, borderColor: pdfTheme.danger, backgroundColor: pdfTheme.dangerSoft, paddingVertical: 5, paddingHorizontal: 8 },
  balanceBoxPaid: { borderColor: pdfTheme.cleared, backgroundColor: "#ECFDF3" },
  balanceLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", color: pdfTheme.danger },
  balanceValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: pdfTheme.danger },
  notes: { marginTop: 12 },
  payments: { marginTop: 10, width: 330 },
  qrBlock: { position: "absolute", bottom: 12 * MM + 6, right: 12 * MM, width: QR_BOX + 8, alignItems: "center" },
  qr: { width: QR_BOX, height: QR_BOX },
  qrCaption: { fontSize: 7.5, color: pdfTheme.inkMuted, marginTop: 2, textAlign: "center" },
  qrCode: { fontSize: 7, fontFamily: "Courier", color: pdfTheme.ink, textAlign: "center" },
  disclaimer: { position: "absolute", bottom: 12 * MM - 4, left: 12 * MM, right: 12 * MM, fontSize: 7.5, color: pdfTheme.inkFaint },
  pageNo: { position: "absolute", top: 6 * MM, right: 12 * MM, fontSize: 7, color: pdfTheme.inkMuted },
});

/** El código (UUID) en dos líneas legibles, cortando en un guion: "94c86068-b5eb-468c-" / "baa1-b5c879fef5d5". */
export function qrCodeLines(code: string): [string, string] {
  const cut = code.indexOf("-", 14);
  return cut > 0 ? [code.slice(0, cut + 1), code.slice(cut + 1)] : [code, ""];
}

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
  const settled = isZero(order.balance_due);

  return (
    <Document title={`Remisión ${order.folio}`} author="Imprenta Escalante">
      <Page size="LETTER" style={s.page}>
        <Text style={s.pageNo} fixed render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />

        <View style={s.header} fixed>
          <Image src={logoSrc} style={s.logo} />
          <View style={s.headerText}>
            <Text style={s.company}>IMPRENTA ESCALANTE</Text>
            <Text style={s.docTitle}>Nota de remisión</Text>
            <Text style={s.folio}>Folio: {order.folio}</Text>
            <Text style={s.muted}>Fecha de emisión: {formatDateTime(new Date().toISOString(), timezone)}</Text>
          </View>
        </View>

        <View style={s.dateBox} wrap={false}>
          <Text style={s.dateLabel}>FECHA PACTADA DE ENTREGA</Text>
          <Text style={s.dateValue}>{formatDateTime(order.promised_date, timezone)}</Text>
        </View>

        <View style={s.customer} wrap={false}>
          <Text>
            <Text style={s.bold}>Cliente: </Text>
            {order.customer?.full_name ?? "—"}
          </Text>
          <Text>
            <Text style={s.bold}>Tel: </Text>
            {order.customer?.phone_number ?? "—"}
          </Text>
        </View>

        <View style={s.th} fixed>
          <Text style={s.cQty}>Cant.</Text>
          <Text style={s.cDesc}>Descripción</Text>
          <Text style={s.cPrice}>P. Unit.</Text>
          <Text style={s.cTotal}>Importe</Text>
        </View>
        {order.items.map((it) => (
          <View key={it.line_no} style={s.row} wrap={false}>
            <Text style={s.cQty}>{itemQuantityLabel(it)}</Text>
            <Text style={s.cDesc}>{it.description}</Text>
            <Text style={s.cPrice}>{formatMoney(it.unit_price)}</Text>
            <Text style={s.cTotal}>{formatMoney(it.line_total)}</Text>
          </View>
        ))}

        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}>
            <Text>SUBTOTAL:</Text>
            <Text>{formatMoney(order.total_price)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text>ANTICIPOS (-):</Text>
            <Text>- {formatMoney(paid)}</Text>
          </View>
          <View style={[s.balanceBox, settled ? s.balanceBoxPaid : {}]}>
            <Text style={[s.balanceLabel, settled ? { color: pdfTheme.cleared } : {}]}>SALDO PENDIENTE:</Text>
            <Text style={[s.balanceValue, settled ? { color: pdfTheme.cleared } : {}]}>{formatMoney(order.balance_due)}</Text>
          </View>
        </View>

        {order.notes ? (
          <View style={s.notes} wrap={false}>
            <Text style={s.bold}>Observaciones:</Text>
            <Text>{order.notes}</Text>
          </View>
        ) : null}

        <View style={s.payments} wrap={false}>
          <Text style={s.bold}>Abonos registrados:</Text>
          {order.payments.length === 0 ? (
            <Text style={s.muted}>Sin abonos.</Text>
          ) : (
            order.payments.map((p, i) => (
              <Text key={p.id} style={s.muted}>
                • Pago {i + 1}: {formatMoney(p.amount)} ({METHOD_LABEL[p.payment_method]}) · {formatDateTime(p.created_at, timezone)}
                {p.registered_by ? ` · Registró: ${p.registered_by.full_name}` : ""}
              </Text>
            ))
          )}
        </View>

        <View
          style={s.qrBlock}
          fixed
          // react-pdf entrega totalPages también a View, aunque su tipo no lo declare.
          render={(props) => {
            const { pageNumber, totalPages } = props as unknown as { pageNumber: number; totalPages: number };
            return pageNumber === totalPages ? (
              <>
                <Image src={qrDataUrl} style={s.qr} />
                <Text style={s.qrCaption}>Escanee para verificar la entrega</Text>
                {/* Respaldo si la cámara no lee: el instalador escribe este código en la app. */}
                <Text style={s.qrCode}>{qrCodeLines(order.qr_code_hash)[0]}</Text>
                <Text style={s.qrCode}>{qrCodeLines(order.qr_code_hash)[1]}</Text>
              </>
            ) : null;
          }}
        />

        <Text style={s.disclaimer} fixed>
          Este documento no es un comprobante fiscal. La entrega solo se confirma con saldo $0.00. Generado por PrintFlow AI © 2026
        </Text>
      </Page>
    </Document>
  );
}
