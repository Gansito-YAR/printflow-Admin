// Plan Correcciones v2, C4: teléfonos internacionales.
// El formato guardado (E.164 sin "+") no cambia: es la llave de n8n.
import { describe, expect, it } from "vitest";
import { checkPhone, formatAsYouType, formatPhone, normalizePhone, phoneMessage, splitInternational, splitStored } from "./phone";

describe("checkPhone", () => {
  it("México: 10 dígitos → 52 + número", () => {
    expect(checkPhone("6671234567", "MX")).toEqual({ ok: true, e164: "526671234567" });
  });
  it("EE. UU.: 10 dígitos → 1 + número", () => {
    expect(checkPhone("2015550123", "US")).toEqual({ ok: true, e164: "12015550123" });
  });
  it("faltan dígitos: dice cuántos", () => {
    const c = checkPhone("66712345", "MX");
    expect(c.ok).toBe(false);
    expect(phoneMessage(c)).toBe("Faltan 2 dígitos.");
  });
  it("sobran dígitos para el país", () => {
    expect(checkPhone("667123456789012", "MX")).toMatchObject({ ok: false, reason: "TOO_LONG" });
  });
  it("vacío", () => {
    expect(checkPhone("", "MX")).toMatchObject({ ok: false, reason: "EMPTY" });
  });
});

describe("splitInternational (pegar el número completo)", () => {
  it("+52 con espacios", () => {
    expect(splitInternational("+52 667 123 4567")).toEqual({ country: "MX", national: "6671234567" });
  });
  it("prefijo 00", () => {
    expect(splitInternational("0052 6671234567")).toEqual({ country: "MX", national: "6671234567" });
  });
  it("+1 con paréntesis y guion", () => {
    expect(splitInternational("+1 (201) 555-0123")).toEqual({ country: "US", national: "2015550123" });
  });
  it("sin lada internacional: null", () => {
    expect(splitInternational("6671234567")).toBeNull();
  });
});

describe("guardado y edición", () => {
  it("un teléfono guardado se separa en país + número", () => {
    expect(splitStored("526671234567")).toEqual({ country: "MX", national: "6671234567" });
    expect(splitStored("12015550123")).toEqual({ country: "US", national: "2015550123" });
  });
  it("se muestra con formato internacional", () => {
    expect(formatPhone("526671234567")).toBe("+52 667 123 4567");
    expect(formatPhone(null)).toBe("—");
  });
  it("formato mientras se escribe", () => {
    expect(formatAsYouType("667123", "MX")).toBe("667 123");
  });
  it("normalizePhone conserva el comportamiento anterior (México por defecto)", () => {
    expect(normalizePhone("(667) 123-4567")).toBe("526671234567");
    expect(normalizePhone("+52 667 123 4567")).toBe("526671234567");
    expect(normalizePhone("123")).toBeNull();
  });
});
