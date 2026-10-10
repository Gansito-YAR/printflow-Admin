// PrintFlow AI (panel) — diagnóstico de la conexión con Supabase.
// Deja en la consola del navegador (F12) la causa REAL de un fallo de login, que la
// pantalla oculta a propósito. Nunca registra contraseñas, tokens ni la llave completa.

interface ErrorLike {
  name?: unknown;
  message?: unknown;
  status?: unknown;
  code?: unknown;
}

function keyKind(key: string): string {
  if (key.startsWith("sb_publishable_")) return "publishable (correcta)";
  if (key.startsWith("sb_secret_")) return "SECRET (¡incorrecta! no debe ir en el navegador)";
  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1]!.replace(/-/g, "+").replace(/_/g, "/"))) as { role?: string };
      if (payload.role === "anon") return "JWT anon (correcta)";
      if (payload.role === "service_role") return "JWT service_role (¡incorrecta! no debe ir en el navegador)";
      return `JWT con rol "${payload.role ?? "?"}"`;
    } catch {
      return "JWT ilegible";
    }
  }
  return "formato desconocido";
}

/** Revisa las variables VITE_SUPABASE_* y avisa de los errores típicos de captura. */
export function checkSupabaseConfig(url: string, key: string): string[] {
  const problems: string[] = [];
  if (url !== url.trim() || key !== key.trim()) problems.push("La URL o la llave tienen espacios o saltos de línea al inicio o al final.");
  if (/^["']|["']$/.test(url.trim()) || /^["']|["']$/.test(key.trim())) problems.push("La URL o la llave están entre comillas; en Render se escriben sin comillas.");
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url.trim())) problems.push("La URL no tiene la forma https://<proyecto>.supabase.co.");
  if (/\/$/.test(url.trim())) problems.push("La URL termina en «/»; quítala.");
  if (/service_role|SECRET/.test(keyKind(key.trim()))) problems.push("La llave NO es la pública (anon/publishable).");
  return problems;
}

let reported = false;

/** Una sola vez por carga: muestra qué configuración quedó compilada en este despliegue. */
export function reportSupabaseConfig(url: string, key: string): void {
  if (reported) return;
  reported = true;
  let host = "(ilegible)";
  try {
    host = new URL(url.trim()).host;
  } catch {
    // se informa abajo como problema de URL
  }
  console.info(`[supabase] host=${host} · llave: ${keyKind(key.trim())}, ${key.trim().length} caracteres`);
  for (const p of checkSupabaseConfig(url, key)) console.error(`[supabase] CONFIGURACIÓN: ${p}`);
}

/** Registra un fallo de login con el paso en el que ocurrió. */
export function logAuthFailure(step: string, err: unknown): void {
  const e = (err ?? {}) as ErrorLike;
  console.error(
    `[login] falló en «${step}» → name=${String(e.name ?? "-")} status=${String(e.status ?? "-")} code=${String(e.code ?? "-")} message=${String(e.message ?? err)}`,
  );
}
