import { describe as suite, expect, it } from "vitest";
import { describe as describeRow, type ActivityRow } from "./describe";

const row = (p: Partial<ActivityRow>): ActivityRow => ({
  id: "1",
  created_at: "2026-10-08T00:00:00Z",
  actor_id: null,
  category: "PEDIDO",
  action: "CREATED",
  entity: "PF-1",
  reason: null,
  amount: null,
  detail: null,
  ...p,
});

suite("describe (bitácora general)", () => {
  it("abono: monto y saldo restante", () => {
    const d = describeRow(row({ action: "PAYMENT_REGISTERED", amount: "360.00", detail: { from: null, to: "360.00" } }));
    expect(d.title).toBe("Abono registrado");
    expect(d.lines[0]).toBe("Abono de $360.00 · saldo restante $360.00");
  });
  it("entrega autorizada: saldo por cobrar y motivo", () => {
    const d = describeRow(row({ action: "DELIVERY_OVERRIDE", amount: "360.00", reason: "crédito" }));
    expect(d.title).toBe("Entrega autorizada con saldo pendiente");
    expect(d.lines).toEqual(["Saldo por cobrar: $360.00", "Motivo: crédito"]);
  });
  it("los eventos de costo no muestran montos", () => {
    const d = describeRow(row({ action: "COSTS_FROZEN", amount: "79.20" }));
    expect(d.lines).toEqual([]);
  });
  it("cambio ccambio de estado con etiquetas en español", () => {
    const d = describeRow(row({ action: "STATUS_CHANGED", detail: { from: "PENDING_DEPOSIT", to: "IN_PRODUCTION" } }));
    expect(d.lines[0]).toBe("Pendiente de anticipo → En producción");
  });
  it("inventario: signo, unidad y costo", () => {
    const d = describeRow(row({ category: "INVENTARIO", action: "PRODUCTION_USAGE", amount: "-6.6000", detail: { unit: "M2", unit_cost: "12.0000", folio: "PF-1" } }));
    expect(d.title).toBe("Consumo de producción");
    expect(d.lines[0]).toBe("-6.6 m² · a $12.0000");
    expect(d.lines[1]).toBe("Pedido PF-1");
  });
  it("catálogos: campos con valor anterior y nuevo", () => {
    const d = describeRow(
      row({
        category: "PRODUCTO",
        action: "UPDATE",
        detail: { changes: { retail_price: { old: "120.00", new: "130.00" }, is_active: { old: true, new: false } } },
      }),
    );
    expect(d.title).toBe("Producto modificado");
    expect(d.lines).toEqual(["Precio menudeo: $120.00 → $130.00", "Activo: Sí → No"]);
  });
  it("alta de cliente", () => {
    expect(describeRow(row({ category: "CLIENTE", action: "INSERT", entity: "Ana" })).title).toBe("Cliente creado");
  });
});

it("reprogramación: fechas en la zona operativa, no ISO", () => {
  const d = describeRow(
    row({ action: "PROMISED_DATE_CHANGED", detail: { from: "2026-10-15T18:00:00+00:00", to: "2026-10-16T18:00:00+00:00" } }),
    "America/Mexico_City",
  );
  expect(d.lines[0]).toBe("15/10/2026 12:00 → 16/10/2026 12:00");
});
