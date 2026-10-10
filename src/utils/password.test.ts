import { describe, expect, it } from "vitest";
import { generatePassword, passwordProblem, passwordStrength } from "./password";

describe("generatePassword", () => {
  it("tres bloques legibles con mayúscula, minúscula y número, y pasa las reglas del servidor", () => {
    for (let i = 0; i < 50; i++) {
      const p = generatePassword();
      expect(p).toMatch(/^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/\d/);
      expect(p).not.toMatch(/[0O1lI]/);
      expect(passwordProblem(p)).toBeNull();
      expect(passwordStrength(p)).toBe("fuerte");
    }
  });
  it("no repite contraseñas", () => {
    const set = new Set(Array.from({ length: 200 }, generatePassword));
    expect(set.size).toBe(200);
  });
});

describe("passwordProblem (mismas reglas que el servidor)", () => {
  it("mínimo 8 caracteres, dice cuántos faltan", () => {
    expect(passwordProblem("abc")).toBe("Faltan 5 caracteres (mínimo 8).");
  });
  it("sin espacios al inicio o al final", () => {
    expect(passwordProblem(" Segura#2026")).toMatch(/espacios/);
  });
  it("válida", () => {
    expect(passwordProblem("Segura#2026")).toBeNull();
  });
});
