import { describe, expect, it } from "vitest";
import { longDate, scheduleText } from "./ExpensesTab";

describe("gastos: textos para el cliente", () => {
  it("frecuencia en palabras", () => {
    expect(scheduleText({ frequency: "MONTHLY", weekday: null, month_day: 5, month_of_year: null })).toBe("Mensual, día 5");
    expect(scheduleText({ frequency: "WEEKLY", weekday: 5, month_day: null, month_of_year: null })).toBe("Semanal, cada viernes");
    expect(scheduleText({ frequency: "BIWEEKLY", weekday: null, month_day: null, month_of_year: null })).toBe("Quincenal, días 15 y último");
    expect(scheduleText({ frequency: "YEARLY", weekday: null, month_day: 15, month_of_year: 3 })).toBe("Anual, 15 de marzo");
  });
  it("fecha larga sin desfase de zona horaria", () => {
    expect(longDate("2026-11-05")).toBe("5 de noviembre de 2026");
  });
});
