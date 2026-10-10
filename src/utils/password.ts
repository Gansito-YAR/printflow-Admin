// Contraseñas para cuentas creadas desde el panel (Plan Correcciones v2, C7).
// La genera el navegador con crypto.getRandomValues; nunca sale de aquí salvo
// hacia la RPC que la cifra con bcrypt.

// Sin caracteres que se confunden al dictarla o leerla en un papel (0/O, 1/l/I).
const LOWER = "abcdefghjkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
const DIGITS = "23456789";

function pick(set: string, n: number): string {
  const buf = new Uint32Array(n);
  crypto.getRandomValues(buf);
  return Array.from(buf, (v) => set[v % set.length]).join("");
}

/** Tres bloques de 4 legibles: "Kq7m-Xp3r-Za9t" (≈ 70 bits). Siempre tiene mayúscula, minúscula y número. */
export function generatePassword(): string {
  const block = () => pick(UPPER, 1) + pick(LOWER, 2) + pick(DIGITS, 1);
  const shuffle = (s: string) => {
    const a = s.split("");
    const r = new Uint32Array(a.length);
    crypto.getRandomValues(r);
    for (let i = a.length - 1; i > 0; i--) {
      const j = r[i]! % (i + 1);
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a.join("");
  };
  return [block(), block(), block()].map(shuffle).join("-");
}

export type PasswordProblem = string | null;

/** Mismas reglas que el servidor (private.assert_valid_password), con mensaje claro. */
export function passwordProblem(p: string): PasswordProblem {
  if (p.length < 8) return `Faltan ${8 - p.length} caracteres (mínimo 8).`;
  if (new TextEncoder().encode(p).length > 72) return "Máximo 72 caracteres.";
  if (/^\s|\s$/.test(p)) return "No puede empezar ni terminar con espacios.";
  return null;
}

/** Nivel orientativo para el indicador; el mínimo real lo impone el servidor. */
export function passwordStrength(p: string): "débil" | "aceptable" | "fuerte" {
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
  if (p.length >= 12 && kinds >= 3) return "fuerte";
  if (p.length >= 8 && kinds >= 2) return "aceptable";
  return "débil";
}
