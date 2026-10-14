# Fase 1.5 — EMIR · Corrección del prototipo y activación del Modo Demo

| Campo | Detalle |
|---|---|
| Proyecto | **PrintFlow AI** — Imprenta Escalante |
| Documento | Addendum correctivo a `Fase1_EMIR_App_Movil_UI.md` |
| Responsable | **Emir** |
| Solicita y aprueba | **Isaías** — Líder Técnico |
| Repositorio | `printflow-app` |
| Prototipo revisado | https://printflow-app-prototipo.vercel.app |
| Duración | **3 días hábiles** |
| Objetivo | Que **todos** los estados de la app sean alcanzables y probables desde un celular, sin DevTools y sin backend |

---

## 1. Por qué existe este documento

Revisé el prototipo desplegado: la interfaz, el bundle de JavaScript compilado y el CSS. El resultado es este:

**Tu código está bien. Tu entrega no.** Construiste alrededor de 20 estados de interfaz y **solo 6 se pueden alcanzar** desde el prototipo. Las cuatro pantallas más importantes del proyecto —Bloqueo, Autorización, Validación no disponible y Estado no entregable— existen en el bundle, funcionan, y **nadie puede verlas**.

La causa: en el documento original te pedí que el panel de fixtures fuera visible *"solo con `import.meta.env.DEV`"*. Lo seguiste al pie de la letra. En el build de producción de Vercel `DEV` es `false`, así que Vite eliminó ese panel del bundle — encontré el `&&!1` en el código minificado donde estaba.

**Esa línea la escribí yo y estuvo mal. Es un error mío y lo corrijo en el documento base.** Pero quiero ser claro en la parte que sí te toca: desplegaste el prototipo y no verificaste que se pudiera llegar a la pantalla de bloqueo de entrega, que es la razón por la que esta app existe. Antes de pedir revisión, recorre tu propio entregable como si fueras el usuario.

---

## 2. Lo que hiciste bien — no lo toques

Esto lo verifiqué en el código, no de vista. Es trabajo sólido y quiero que se conserve tal cual:

1. **`tokens.css` está clavado.** Los únicos valores hexadecimales en todo el CSS compilado son las 9 definiciones de token. Cero color literal en componentes. Disciplina perfecta.
2. **El candado (`evaluateDeliveryGuard`) está correcto.** Compara `balanceDue === "0.00"` **como string**, nunca como número. `null` → `DENY`, negativo → `DENY`, estado distinto de `READY_FOR_DELIVERY` → `DENY`, offline → `DENY`, sesión vencida → `DENY`. El valor por defecto es `DENY`.
3. **La ventana de 60 segundos de lectura viva.** Eso no te lo pedí; lo agregaste por criterio propio y es exactamente lo correcto. Que una autorización caduque sola a los 60 segundos es justo el comportamiento que necesitamos.
4. **"Mi Ruta" no tiene ni un signo de pesos**, ni en pantalla ni en el objeto de datos.
5. **El semáforo estructural sin color funciona:** trama diagonal + borde 4 px para vencido, `2px dashed` para mañana, `1px` para en tiempo.
6. **46 `data-testid`** distribuidos correctamente.
7. **El login no revela cuál campo falló.** Mensaje genérico. Correcto.
8. **El panel de éxito sustituye al botón** en lugar de deshabilitarlo. Correcto.

**Ninguna de las tareas de abajo debe romper nada de esto.** Si una corrección te obliga a tocar `evaluateDeliveryGuard`, párate y pregúntame antes.

---

## 3. El objetivo cambió — léelo con cuidado

En el documento original te pedí un *panel de desarrollo*. Lo que en realidad necesitamos es otra cosa:

> **Un prototipo funcional de frontend, completo y navegable, que cualquier persona del equipo pueda recorrer desde su celular, sin herramientas de desarrollador y sin que exista el backend.**

La razón es estratégica: quiero validar el flujo completo con Andri y con el dueño de la imprenta **antes** de escribir una sola tabla en Supabase. Si el flujo está mal pensado, prefiero descubrirlo ahora que después de construir la base de datos. Tu frontend es la herramienta con la que vamos a probar el diseño del sistema.

Eso significa que el modo demo **no es código desechable**. Es un entregable de primera clase, vive en producción, y se retira hasta que la API real esté conectada.

---

## 4. TAREA 1 — Pantalla de Modo Demo (`/demo`)

Crea una ruta **`/demo`**, accesible en producción, enlazada desde un botón discreto `[DEMO]` en el header de la app.

### 4.1 Qué debe contener

**Bloque A — Escenarios de escaneo.** Un botón por cada fixture. Cada botón navega directo a la pantalla de resultado correspondiente, como si acabaras de escanear ese QR.

| Botón | Fixture | Pantalla que debe abrir |
|---|---|---|
| `F1 · Liquidado y listo` | `F1-LIQUIDADO` | Autorización (Alerta Verde) |
| `F2 · Con deuda` | `F2-CON-DEUDA` | Bloqueo (Alerta Roja) |
| `F3 · Saldo desconocido` | `F3-SALDO-DESCONOCIDO` | Validación no disponible |
| `F4 · Sobrepago` | `F4-SOBREPAGO` | Validación no disponible |
| `F5 · En producción` | `F5-EN-PRODUCCION` | Estado no entregable |
| `F6 · Ya entregado` | `F6-YA-ENTREGADO` | Estado no entregable |
| `F7 · QR desconocido` | `F7-QR-DESCONOCIDO` | Código QR no reconocido |
| `F8 · Payload inválido` | `TEXTO-BASURA-123` | Código QR no reconocido |

**Bloque B — Interruptores de estado global.** Switches que se quedan activos hasta que los apagues:

| Interruptor | `data-testid` | Qué provoca |
|---|---|---|
| `Simular sin conexión` | `toggle-offline` | Fuerza `isOnline = false` en el store y en el mock. Debe activar el `OfflineBanner`, el overlay del escáner, el estado offline de Mi Ruta y bloquear el login |
| `Simular sesión vencida` | `toggle-session-expired` | Pone `absoluteDeadline` en el pasado. Debe disparar el `session-expired-modal` y expulsar al login |
| `Confirmar entrega falla` | `toggle-confirm-error` | `confirmDelivery` devuelve error → estado `delivery-error` |
| `Entrega ya registrada` | `toggle-confirm-already` | `confirmDelivery` devuelve el caso "ya había sido registrada" |
| `Mi Ruta vacía` | `toggle-route-empty` | `getMyRoute` devuelve `[]` → estado `route-empty` |
| `Mi Ruta con error` | `toggle-route-error` | `getMyRoute` lanza error → estado `route-error` |
| `Forzar error de React` | `toggle-crash` | Lanza una excepción para poder ver el `ErrorBoundary` |

**Bloque C — Estado actual.** Un recuadro de solo lectura que muestre: sesión activa sí/no, rol, minutos restantes de la sesión absoluta, y conexión. Sirve para que quien prueba entienda por qué la app está decidiendo lo que decide.

### 4.2 Reglas de la pantalla `/demo`

- **NO** debe estar detrás de `import.meta.env.DEV`. Debe existir en el build de producción.
- Debe llevar un banner permanente arriba: `[DEMO] Datos simulados. Este modo se retira al conectar la API.`
- Se implementa con la misma disciplina que el resto: escala de grises, tokens, grid de 8, `data-testid` en cada control.
- Los interruptores viven en el store de Zustand, en un slice separado llamado `demo`. **No mezcles esa lógica con `session`.**
- Cuando conectemos la API real, esta pantalla y su slice se borran en un solo commit. Manténla aislada para que eso sea trivial.

---

## 5. TAREA 2 — Entrada manual de token en el escáner

Hoy la pantalla del escáner es una caja tramada sin salida. Agrégale, **debajo** del visor de cámara:

- Un campo de texto con label "Código de la remisión" — `data-testid="input-manual-token"`
- Un botón "Validar código" — `data-testid="button-manual-scan"`, ancho completo, alto 56 px
- Bajo el campo, un texto de ayuda: `Modo demo: escriba F1-LIQUIDADO, F2-CON-DEUDA, F3-SALDO-DESCONOCIDO, F4-SOBREPAGO, F5-EN-PRODUCCION, F6-YA-ENTREGADO o F7-QR-DESCONOCIDO`

Ese input alimenta exactamente la misma función `scanOrder(payload)` que después alimentará la cámara. **La fuente del string cambia en Fase 2; toda la lógica río abajo se queda igual.** Esa es la idea: que el día que conectemos la cámara no toquemos nada más.

Estados obligatorios del botón: `Disabled` con campo vacío u offline, `Loading` con spinner y "Validando código…", `Error` con mensaje inline.

---

## 6. TAREA 3 — Ampliar el mock gateway

Tu `confirmDelivery` actual siempre devuelve éxito. Eso deja dos estados que ya construiste como **código muerto e inalcanzable**. Reescribe el mock así:

```ts
type ConfirmMode = 'OK' | 'ERROR' | 'ALREADY_REGISTERED';
type RouteMode   = 'NORMAL' | 'EMPTY' | 'ERROR';

class MockGateway implements PrintflowGateway {
  private isOnline = true;
  private confirmMode: ConfirmMode = 'OK';
  private routeMode: RouteMode = 'NORMAL';
  private sessionExpired = false;

  // setters usados exclusivamente por la pantalla /demo
  setOnline(v: boolean) { this.isOnline = v; }
  setConfirmMode(m: ConfirmMode) { this.confirmMode = m; }
  setRouteMode(m: RouteMode) { this.routeMode = m; }
  setSessionExpired(v: boolean) { this.sessionExpired = v; }

  async confirmDelivery(orderToken: string) {
    await latency();
    if (!this.isOnline) throw new Error('NETWORK_ERROR');
    if (this.confirmMode === 'ERROR') {
      return { ok: false as const, reason: 'Entrega rechazada por el sistema' };
    }
    if (this.confirmMode === 'ALREADY_REGISTERED') {
      return { ok: false as const, reason: 'La entrega ya había sido registrada' };
    }
    return { ok: true as const, deliveredAt: new Date().toISOString() };
  }

  async getMyRoute(filter: 'today' | 'upcoming') {
    await latency();
    if (!this.isOnline) throw new Error('NETWORK_ERROR');
    if (this.routeMode === 'ERROR') throw new Error('ROUTE_ERROR');
    if (this.routeMode === 'EMPTY') return [];
    // ...filtrado normal, PERO ver Tarea 4.5 sobre promisedDate === null
  }
}
```

Cuando `signIn` se ejecute con `sessionExpired = true`, devuelve una sesión cuyo `absoluteDeadline` ya pasó, para poder ver el modal de sesión vencida.

---

## 7. TAREA 4 — Interfaces que faltan

Estas simplemente no existen en el bundle. Constrúyelas.

### 4.1 Botón "Cerrar escáner" — `button-close-scanner`

En el header de la pantalla del escáner, a la derecha del título "Escanear entrega". Al pulsarlo vuelve a "Mi Ruta". Estado `Disabled` mientras haya una validación en curso.

### 4.2 Botón de linterna — `button-torch`

El documento original decía `DOM: OMIT` si el hardware no lo soporta, y en tu build `SUPPORTS_TORCH` es siempre `false`, así que nunca se renderiza. **Para el prototipo lo necesito visible**, porque tengo que validar que el layout no se rompa cuando aparezca en Fase 2.

Solución: que la constante se lea desde el slice `demo` con un interruptor `Simular soporte de linterna` (por defecto **encendido** en modo demo). Etiqueta `[TORCH] Linterna apagada` / `[TORCH] Linterna encendida`, ≥48×48 px, sin superponerse al área de cámara.

### 4.3 Botón de permiso de cámara — `button-camera-permission`

"Abrir ajustes de cámara". Se muestra bajo un interruptor `Simular permiso denegado` en `/demo`. Cuando está activo: el visor se sustituye por un placeholder con guía de recuperación, y aparece este botón.

### 4.4 `UpdateToast` — `update-toast`

**No existe en el bundle.** Constrúyelo: banner inferior, fondo `--ink-strong`, texto en `--surface-0`:

> `Actualización crítica requerida. Presione aquí para reiniciar`

Con un botón de recarga forzada. Actívalo desde un interruptor `Simular nueva versión` en `/demo`.

### 4.5 Estado "Datos incompletos" en Mi Ruta

**Esto es un incumplimiento del documento original, no un faltante menor.** El fixture `R6` tiene `promisedDate: null` y tu filtrado lo descarta de `today` y de `upcoming`, así que **desaparece en silencio**. El documento decía: *"Fecha nula → la orden va a 'Datos incompletos'; no se inventa fecha."*

Un pedido que se te desaparece de la ruta es peor que un pedido con fecha rara: el instalador nunca sabrá que existe. Corrígelo así:

- Los items con `promisedDate === null` se agrupan **al final de la lista**, en ambos filtros, bajo un encabezado `DATOS INCOMPLETOS`.
- La tarjeta usa la variante `error` del `StatusBadge` con la etiqueta `SIN FECHA PACTADA`.
- No se inventa ninguna fecha ni se muestra "—" como si fuera un dato válido.

### 4.6 Botón "Actualizar" siempre visible en Mi Ruta — `button-refresh`

Hoy solo aparece en los estados vacío y de error. Debe estar **también sobre la lista con datos**, en la barra de filtros. Con sus estados `Disabled` offline, `Loading` con spinner y "Actualizando…", y `Error` con reintento.

### 4.7 Fecha del día en el header de Mi Ruta

El documento pedía: *"Header: título 'Mi Ruta', fecha del día e indicador de conexión."* Falta la fecha. Agrégala en formato largo legible.

---

## 8. Matriz de verificación — esto es lo que voy a revisar

**Tu entrega no se aprueba hasta que yo pueda llegar a cada una de estas 24 filas desde un celular, sin DevTools.** Entrégame esta tabla llena, con la ruta de clics exacta de cada una.

| # | Estado | `data-testid` | Cómo llegar |
|---:|---|---|---|
| 1 | Login por defecto | `login-screen` | Abrir la app |
| 2 | Login con error de credenciales | `login-error` | Correo válido + contraseña incorrecta |
| 3 | Login sin conexión | `offline-login-message` | `/demo` → Simular sin conexión → cerrar sesión |
| 4 | Escáner listo | `scanner-screen` | Iniciar sesión |
| 5 | Escáner sin conexión | `scanner-offline-overlay` | `/demo` → Simular sin conexión |
| 6 | Permiso de cámara denegado | `button-camera-permission` | `/demo` → Simular permiso denegado |
| 7 | Linterna visible | `button-torch` | `/demo` → Simular soporte de linterna |
| 8 | QR no reconocido | `qr-not-recognized` | Escáner → escribir `F7-QR-DESCONOCIDO` |
| 9 | Payload inválido | `qr-not-recognized` | Escáner → escribir `BASURA-123` |
| 10 | **Bloqueo por deuda** | `blocked-delivery-panel` | `/demo` → `F2` |
| 11 | Revalidar saldo cargando | `button-revalidate` | Desde el bloqueo, pulsar Revalidar |
| 12 | **Autorización de entrega** | `clearance-panel` | `/demo` → `F1` |
| 13 | Confirmando entrega | `delivery-confirm` en Loading | Desde autorización, pulsar Confirmar |
| 14 | Entrega registrada | `delivery-success` | Esperar la respuesta |
| 15 | Error al confirmar | `delivery-error` | `/demo` → Confirmar entrega falla → `F1` → Confirmar |
| 16 | Ya había sido registrada | `delivery-already-registered` | `/demo` → Entrega ya registrada → `F1` → Confirmar |
| 17 | Validación no disponible | `validation-unavailable-panel` | `/demo` → `F3` |
| 18 | Estado no entregable | `not-deliverable-panel` | `/demo` → `F5` |
| 19 | Mi Ruta con datos | `route-list` | Navegación inferior → Mi Ruta |
| 20 | Mi Ruta cargando | `route-loading` | Pulsar Actualizar |
| 21 | Mi Ruta vacía | `route-empty` | `/demo` → Mi Ruta vacía |
| 22 | Mi Ruta con error | `route-error` | `/demo` → Mi Ruta con error |
| 23 | Datos incompletos | tarjeta `SIN FECHA PACTADA` | Mi Ruta, al final de la lista |
| 24 | Sesión vencida | `session-expired-modal` | `/demo` → Simular sesión vencida |
| 25 | Banner sin conexión | `offline-banner` | `/demo` → Simular sin conexión |
| 26 | Toast de actualización | `update-toast` | `/demo` → Simular nueva versión |
| 27 | ErrorBoundary | `error-boundary` | `/demo` → Forzar error de React |

---

## 9. Reglas que NO se tocan

Estas siguen vigentes íntegras desde el documento original. El modo demo **no es excusa para relajarlas**:

1. **`evaluateDeliveryGuard` no se modifica.** Si un interruptor de demo te obliga a tocarla, párate y pregúntame. Los interruptores cambian los *datos de entrada*, nunca la lógica de decisión.
2. **`delivery-confirm` sigue sin instanciarse bajo cualquier `DENY`.** Ni siquiera en modo demo. Ni siquiera "para poder verlo". Si quiero ver el botón, uso el fixture `F1`.
3. **El dinero sigue siendo string decimal.** Ninguna comparación con `Number()`, ningún redondeo.
4. **"Mi Ruta" sigue sin un solo signo de pesos**, incluido el nuevo estado de datos incompletos.
5. **Cero color.** Todo por `tokens.css`. La pantalla `/demo` también.
6. **Sin cámara real, sin Supabase, sin `fetch`.** Sigue siendo Fase 1.
7. **Todo espaciado múltiplo de 8.**

---

## 10. Criterios de aceptación

- [ ] Las 27 filas de la matriz §8 son alcanzables desde un celular, sin DevTools, y me entregas la tabla con la ruta de clics.
- [ ] `/demo` existe en el build de producción de Vercel.
- [ ] El escáner acepta un token escrito a mano y alimenta la misma `scanOrder()`.
- [ ] `confirmDelivery` puede fallar y puede devolver "ya registrada".
- [ ] Los items con `promisedDate: null` aparecen agrupados bajo `DATOS INCOMPLETOS` en ambos filtros.
- [ ] `button-refresh` está visible sobre la lista con datos.
- [ ] `UpdateToast`, `button-close-scanner`, `button-torch` y `button-camera-permission` existen y se ven.
- [ ] La fecha del día está en el header de Mi Ruta.
- [ ] `evaluateDeliveryGuard` **no cambió** — lo voy a comparar contra el bundle actual.
- [ ] Las 3 pruebas negativas de Vitest siguen pasando.
- [ ] Cero hex fuera de `tokens.css` (lo verifico sobre el CSS compilado, como esta vez).
- [ ] La lógica de demo está aislada en su propio slice de Zustand y en su propia carpeta, borrable en un commit.
- [ ] `npm run build` y `npm run test` pasan.

---

## 11. Actualiza tu `AGENTS.md`

Agrega esta sección al archivo que ya tienes:

```markdown
## Modo Demo (Fase 1.5)

El prototipo debe ser completamente navegable en PRODUCCIÓN, sin backend y sin DevTools.

1. La pantalla /demo NO va detrás de import.meta.env.DEV. Debe existir en el build
   de producción. Ningún estado de la app puede ser inalcanzable desde la interfaz.
2. Toda la lógica de demo vive en un slice de Zustand llamado `demo` y en su propia
   carpeta src/features/demo/. Debe poder borrarse en un solo commit.
3. Los interruptores de demo cambian los DATOS DE ENTRADA del gateway.
   NUNCA modifican evaluateDeliveryGuard ni ninguna regla de autorización.
4. El botón delivery-confirm sigue sin instanciarse bajo cualquier DENY,
   también en modo demo. No existe un interruptor para forzarlo a aparecer.
5. El escáner acepta un token escrito a mano que alimenta la misma scanOrder(payload)
   que después alimentará la cámara. La lógica río abajo no cambia en Fase 2.
6. Los pedidos con promisedDate null NUNCA se filtran fuera de la lista.
   Se agrupan al final bajo el encabezado DATOS INCOMPLETOS con la etiqueta
   SIN FECHA PACTADA. No se inventa una fecha ni se muestra un guion como dato válido.
7. Antes de dar por entregado: recorrer las 27 filas de la matriz de verificación
   en un celular real. Si un estado no es alcanzable, no está terminado.
```

---

## 12. Plan de los 3 días

| Día | Objetivo |
|---|---|
| **1** | Slice `demo` en Zustand + pantalla `/demo` con los 8 escenarios y los 9 interruptores + banner de modo demo. Ampliar el mock gateway (`confirmMode`, `routeMode`, `sessionExpired`, `setOnline`). |
| **2** | Entrada manual de token en el escáner + `button-close-scanner` + `button-torch` + `button-camera-permission` + `UpdateToast`. |
| **3** | Estado `DATOS INCOMPLETOS` en Mi Ruta + `button-refresh` sobre la lista + fecha del día en el header. Recorrer las 27 filas en tu celular, llenar la matriz, build, deploy y PR. |

---

## 13. Cómo entregar

En el Pull Request incluye:

1. El enlace del preview de Vercel.
2. **La tabla de la §8 completa**, con la ruta de clics de cada fila.
3. Las credenciales de demo escritas visiblemente (hoy están enterradas en el bundle: `instalador@imprenta.com` / `demo1234`). **Ponlas también como texto de ayuda en la propia pantalla de login en modo demo** — si Andri o el dueño van a probar esto, no pueden adivinarlas.
4. Confirmación de que `npm run test` pasa.

Cualquier duda de contrato de datos o de reglas de autorización, pregúntame antes de improvisar. Las de operación real de los instaladores, a Andri.

---

## 14. Nota final

El trabajo técnico de fondo está bien hecho, y la parte que no se podía negociar —el candado de entrega— la resolviste correctamente e incluso mejor de lo que pedí. El problema fue de entrega, no de código: construiste un prototipo que no se podía prototipar.

Después de esta fase, el frontend queda listo para sentarnos con Andri y el dueño de la imprenta a recorrer el flujo completo antes de que exista una sola tabla en Supabase. Ese es exactamente el objetivo.
