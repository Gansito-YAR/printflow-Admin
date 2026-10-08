import { formatMoney, isGreater, parseAmountInput, toCents } from "./money";
import { compareQty, formatQty, isNegative, parseQuantity } from "./quantity";
import { fromDateTimeLocal, toDateTimeLocal, urgencyOf } from "./dates";
import { toAppError } from "../lib/errors";
import { normalizePhone } from "../features/customers/CustomerForm";
import { derivePaid } from "../features/pdf/RemissionButton";

const TZ = "America/Mexico_City";

describe("money", () => {
  it("formatea sin redondeo flotante", () => {
    expect(formatMoney("1250.5")).toBe("$1,250.50");
    expect(formatMoney("0.10")).toBe("$0.10");
    expect(formatMoney(null)).toBe("—");
  });
  it("convierte a centavos exactos", () => {
    expect(toCents("0.30")).toBe(30n);
    expect(toCents("1.234")).toBeNull();
  });
  it("valida montos capturados", () => {
    expect(parseAmountInput("$1,250.5")).toEqual({ ok: true, value: "1250.50" });
    expect(parseAmountInput("0").ok).toBe(false);
    expect(parseAmountInput("1.999").ok).toBe(false);
    expect(parseAmountInput("abc").ok).toBe(false);
  });
  it("compara por centavos", () => {
    expect(isGreater("100.01", "100.00")).toBe(true);
    expect(isGreater("100.00", "100.00")).toBe(false);
  });
});

describe("dates (zona operativa)", () => {
  it("interpreta datetime-local en la zona del negocio", () => {
    expect(fromDateTimeLocal("2026-10-10T14:30", TZ)).toBe("2026-10-10T20:30:00.000Z");
    expect(fromDateTimeLocal("basura", TZ)).toBeNull();
    expect(toDateTimeLocal("2026-10-10T20:30:00.000Z", TZ)).toBe("2026-10-10T14:30");
  });
  it("frontera de medianoche: 23:59 local es HOY y 00:01 es MAÑANA", () => {
    const now = new Date("2026-10-10T16:00:00Z"); // 10:00 en CDMX
    expect(urgencyOf("2026-10-11T05:59:00Z", now, TZ)).toBe("TODAY"); // 23:59 del día 10
    expect(urgencyOf("2026-10-11T06:01:00Z", now, TZ)).toBe("TOMORROW"); // 00:01 del día 11
    expect(urgencyOf("2026-10-13T06:01:00Z", now, TZ)).toBe("ON_TIME");
    expect(urgencyOf("2026-10-10T15:00:00Z", now, TZ)).toBe("OVERDUE");
    expect(urgencyOf(null, now, TZ)).toBe("INVALID");
  });
});

describe("errors", () => {
  it("mapea por código PF_, no por texto", () => {
    const e = toAppError({ message: "PF_OVERPAYMENT", details: "Saldo 100.00" });
    expect(e.code).toBe("PF_OVERPAYMENT");
    expect(e.userText).toBe("Saldo 100.00");
  });
  it("detecta red, permisos y duplicados", () => {
    expect(toAppError(new TypeError("Failed to fetch")).isNetwork).toBe(true);
    expect(toAppError({ code: "42501", message: "x" }).code).toBe("PF_FORBIDDEN");
    expect(toAppError({ code: "23505", message: "x" }).code).toBe("DUPLICATE");
    expect(toAppError({ message: "algo raro" }).code).toBe("UNKNOWN");
  });
});

describe("normalizePhone", () => {
  it("agrega lada 52 a 10 dígitos", () => {
    expect(normalizePhone("(667) 123-4567")).toBe("526671234567");
    expect(normalizePhone("+52 667 123 4567")).toBe("526671234567");
    expect(normalizePhone("123")).toBeNull();
  });
});

describe("derivePaid (remisión)", () => {
  const pay = (amount: string) => ({ id: amount, amount, payment_method: "CASH" as const, created_at: "", registered_by: null });
  it("cuadra total − saldo con Σ abonos", () => {
    expect(derivePaid({ total_price: "1000.00", balance_due: "400.00", payments: [pay("500.00"), pay("100.00")] })).toBe("600.00");
  });
  it("aborta si no cuadra", () => {
    expect(derivePaid({ total_price: "1000.00", balance_due: "400.00", payments: [pay("500.00")] })).toBeNull();
  });
});

describe("quantity (insumos)", () => {
  it("valida hasta 4 decimales y rechaza cero", () => {
    expect(parseQuantity("1.0505")).toEqual({ ok: true, value: "1.0505" });
    expect(parseQuantity("1.00005").ok).toBe(false);
    expect(parseQuantity("0").ok).toBe(false);
    expect(parseQuantity("0", { allowZero: true }).ok).toBe(true);
    expect(parseQuantity("abc").ok).toBe(false);
  });
  it("compara sin flotantes y formatea", () => {
    expect(compareQty("6.6", "6.6000")).toBe(0);
    expect(compareQty("7", "6.6")).toBe(1);
    expect(formatQty("6.8040")).toBe("6.804");
    expect(formatQty("20.0000")).toBe("20");
    expect(isNegative("-0.5")).toBe(true);
    expect(isNegative("0.0000")).toBe(false);
  });
});
