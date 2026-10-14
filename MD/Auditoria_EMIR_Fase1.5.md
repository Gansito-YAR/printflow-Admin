# Auditoría — EMIR · App Móvil, entrega de Fase 1.5

| Campo | Detalle |
|---|---|
| Auditor | **Isaías** — Líder Técnico |
| Auditado | `printflow-app` — entrega de Fase 1.5 |
| Referencia | `Fase1.5_EMIR_Correcciones_Prototipo.md` y `Fase1_EMIR_App_Movil_UI.md` |
| Método | Lectura de código fuente + ejecución del prototipo + verificación de la matriz de 27 filas + `npm test` + `npm run build` + análisis del bundle de producción |
| Veredicto | **CONFORME con 10 hallazgos** — 2 altos, 5 medios, 3 bajos |

---

## 1. Veredicto ejecutivo

**La entrega cumple el encargo de la Fase 1.5.** Las 4 tareas están implementadas, las **27 filas de la matriz de verificación son alcanzables**, el modo demo sobrevive al build de producción —que era el error que motivó toda la fase— y el candado de entrega sigue intacto y correcto en los cinco escenarios.

El trabajo es sólido. Los hallazgos no invalidan la entrega: son deudas que hay que pagar antes de conectar la API, más dos defectos funcionales reales que conviene corregir **antes de enseñarle esto al cliente**.

---

## 2. Conformidad con el encargo

### 2.1 Tareas de la Fase 1.5

| Tarea | Requisito | Estado |
|---|---|---|
| **1** | Pantalla `/demo` con Bloque A (escenarios), B (interruptores) y C (estado actual) | ✅ **Supera lo pedido**: 8 escenarios, **10 interruptores** (se pidieron 9), bloque de estado con sesión, rol, minutos restantes y conexión, y banner `[DEMO]` permanente |
| **2** | Entrada manual de token en el escáner | ✅ Con `input-manual-token`, `button-manual-scan` y texto de ayuda que lista los fixtures |
| **3** | Ampliar el mock gateway | ✅ `confirmMode`, `routeMode`, `sessionExpired` y `setOnline` implementados |
| **4.1** | Botón "Cerrar escáner" | ✅ Con `disabled` durante validación |
| **4.2** | Botón de linterna | ✅ Tras el interruptor `toggle-torch`, encendido por defecto |
| **4.3** | Botón de permiso de cámara | ✅ Tras `toggle-camera-denied`, con guía de recuperación |
| **4.4** | `UpdateToast` | ✅ Con el texto exacto especificado |
| **4.5** | Estado "Datos incompletos" en Mi Ruta | ✅ Agrupado al final, con `SIN FECHA PACTADA`, **en ambos filtros** |
| **4.6** | `button-refresh` sobre la lista con datos | ✅ Visible en la barra de filtros |
| **4.7** | Fecha del día en el header de Mi Ruta | ✅ Formato largo legible |

### 2.2 Matriz de verificación — 27/27 alcanzables

Verifiqué las 27 filas ejecutando el prototipo. **Todas son alcanzables sin DevTools.**

| Filas | Resultado |
|---|---|
| 1–3 · Login (default, error, offline) | ✅ |
| 4–7 · Escáner (listo, offline, permiso denegado, linterna) | ✅ |
| 8–9 · QR no reconocido y payload inválido | ✅ |
| 10–11 · Bloqueo por deuda y revalidar (`Revalidando…` + disabled) | ✅ |
| 12–14 · Autorización, confirmando, entrega registrada | ✅ |
| 15–16 · Error al confirmar y "ya había sido registrada" | ✅ |
| 17–18 · Validación no disponible y no entregable | ✅ |
| 19–23 · Mi Ruta (datos, cargando, vacía, error, datos incompletos) | ✅ |
| 24 · Sesión vencida | ✅ |
| 25–27 · Banner offline, toast de actualización, ErrorBoundary | ✅ |

### 2.3 Criterios de aceptación de la Fase 1.5

| Criterio | Estado |
|---|---|
| `/demo` existe en el build de producción | ✅ Verificado con `grep` sobre `dist/assets/*.js` |
| El escáner acepta token manual y alimenta la misma `scanOrder()` | ✅ |
| `confirmDelivery` puede fallar y devolver "ya registrada" | ✅ |
| Items con `promisedDate: null` agrupados bajo `DATOS INCOMPLETOS` | ✅ |
| `button-refresh` visible sobre la lista | ✅ |
| `UpdateToast`, cerrar escáner, linterna y permiso de cámara existen | ✅ |
| Fecha del día en el header | ✅ |
| **`evaluateDeliveryGuard` sin modificar** | ✅ Comparado; idéntico |
| Las 3 pruebas negativas de Vitest pasan | ✅ 3/3 |
| Cero hexadecimales fuera de `tokens.css` | ✅ 0 resultados |
| **Lógica de demo aislada y borrable en un commit** | ❌ **Ver H-03** |
| `npm run build` y `npm test` pasan | ✅ (con warnings, ver H-09) |

### 2.4 El candado — verificación funcional

Probé los cinco fixtures y medí el DOM directamente:

| Fixture | `status` | `balanceDue` | Panel montado | ¿Existe `delivery-confirm`? |
|---|---|---|---|---|
| F1 | `READY_FOR_DELIVERY` | `"0.00"` | `clearance-panel` | **Sí** ✅ |
| F2 | `READY_FOR_DELIVERY` | `"1250.50"` | `blocked-delivery-panel` | **No** ✅ |
| F3 | `READY_FOR_DELIVERY` | `null` | `validation-unavailable-panel` | **No** ✅ |
| F4 | `READY_FOR_DELIVERY` | `"-100.00"` | `validation-unavailable-panel` | **No** ✅ |
| F5 | `IN_PRODUCTION` | `"0.00"` | `not-deliverable-panel` | **No** ✅ |

La comparación se hace sobre string (`order.balanceDue === "0.00"`), nunca sobre número. El valor por defecto de la función es `DENY`. El botón mide **303×60 px**, cumple el mínimo de 60. Al confirmar con éxito, el botón **se sustituye** por el panel de "entrega registrada" en lugar de deshabilitarse.

**Esta parte está bien hecha y no debe tocarse.**

---

## 3. Hallazgos

### H-01 · [ALTO] La app se puede dejar bloqueada sin salida

**Requisito afectado:** matriz fila 3 y usabilidad del modo demo.

**Reproducción:**
1. Iniciar sesión → `/demo` → activar **"Simular sin conexión"**
2. Pulsar **"Cerrar sesión"**
3. En el login, el botón "Iniciar sesión" está deshabilitado por estar offline — correcto
4. Pulsar el enlace **"[DEMO] Ir al panel de demostración"** para desactivar el interruptor

**Resultado:** el enlace no lleva a ningún lado. La ruta `/demo` está envuelta en `<Protected>` en `src/App.tsx`, así que rebota a `/login` sin sesión.

**Consecuencia:** el usuario queda atrapado. No puede iniciar sesión porque está "offline", y no puede llegar al panel para desactivarlo porque no tiene sesión. **La única salida es recargar la página** —lo cual funciona, porque el store no persiste— pero nadie lo sabe, y el enlace que él mismo puso en el login es un enlace muerto.

**Por qué es alto:** esto puede pasar **durante la demostración al cliente**. Basta que alguien toque ese interruptor y cierre sesión para que la app parezca rota frente al dueño de la imprenta.

**Corrección:** sacar `/demo` del `<Protected>`. Debe ser pública mientras exista el modo demo; las demás rutas siguen protegidas.

---

### H-02 · [ALTO] La ventana de "lectura viva" de 60 segundos no se aplica con el paso del tiempo

**Requisito afectado:** `Fase1.5` §9.1 (`ALLOW` requiere lectura viva) y el invariante 3 del Spec-Kit V2 (*"El resultado de una lectura QR queda invalidado al… superar la vigencia de la operación"*).

`evaluateDeliveryGuard` define correctamente `READ_FRESHNESS_MS = 60_000` y devuelve `DENY_INDETERMINATE` si la lectura es más vieja que eso. **Pero nada vuelve a ejecutar el guard con el paso del tiempo.**

En `DeliveryResultScreen`, el `now` se calcula durante el render:

```ts
const decision = evaluateDeliveryGuard({ …, now: new Date().toISOString() });
```

El guard solo se re-evalúa si algo provoca un re-render. `AppShell` sí tiene un `tick` de un segundo, pero solo re-renderiza el shell y remonta el modal de sesión: **no llega al subárbol de la pantalla de resultado**, porque `children` es una prop referencialmente estable.

**Verificación empírica:** abrí la pantalla de autorización (F1) y esperé **80 segundos** sin tocar nada.

```json
{ "segundosTranscurridos": 80, "botonSigueEnDOM": true, "botonHabilitado": true }
```

**Consecuencia:** un instalador abre la pantalla verde, se guarda el celular, atiende otra cosa, y diez minutos después el botón "Confirmar entrega física" sigue ahí y sigue funcionando — con un saldo que el sistema leyó hace diez minutos y que pudo haber cambiado. Es exactamente el escenario que la regla de los 60 segundos existía para prevenir.

**Corrección:** un temporizador en `DeliveryResultScreen` que fuerce la re-evaluación mientras el panel esté montado (basta un `tick` cada 5–10 segundos), o que invalide el resultado y muestre `ValidationUnavailablePanel` al vencer la ventana. La opción más limpia es la segunda, acompañada de una acción "Volver a escanear".

*(Nota: la caducidad de sesión de 12 horas **sí** está vigilada, mediante el `tick` de `AppShell` que remonta `SessionExpiredModal`. Ese mecanismo funciona.)*

---

### H-03 · [MEDIO] La lógica de demo no está aislada: no es borrable en un commit

**Requisito afectado:** `Fase1.5` §10 — *"La lógica de demo está aislada en su propio slice de Zustand y en su propia carpeta, borrable en un commit."*

`src/store/demo.ts` está importado por **cuatro archivos fuera del dominio de demo**:

| Archivo | Uso |
|---|---|
| `src/store/session.ts` | `getEffectiveOnline()` consulta `useDemoStore.getState().offline` |
| `src/components/layout/AppShell.tsx` | Lee `updateAvailable` para el `UpdateToast` |
| `src/components/feedback/SessionExpiredModal.tsx` | Llama a `setSessionExpired(false)` |
| `src/features/scanner/ScannerScreen.tsx` | Lee `supportsTorch` y `cameraPermissionDenied` |

Borrar `src/features/demo/` y `src/store/demo.ts` rompe el build en cuatro puntos, y uno de ellos es el store de sesión — el núcleo de la aplicación.

**Consecuencia:** cuando conectemos la API real, retirar el modo demo deja de ser un `git rm` y se convierte en una cirugía sobre código de producción, con riesgo de romper `session.ts`.

**Corrección sugerida:** invertir la dependencia. Que los componentes consuman siempre la interfaz estable (`session.isOnline`, `scanner.supportsTorch`) y que el modo demo **escriba** en esos stores en lugar de que los stores **lean** del demo. Así el demo queda como una capa que empuja valores hacia adentro, y quitarla solo elimina la fuente de esos valores sin tocar a los consumidores.

---

### H-04 · [MEDIO] La UI toma decisiones de control de flujo leyendo texto en español

En `ClearancePanel.tsx`:

```ts
} else if (res.reason.includes("ya había sido registrada")) {
  setState("already-registered");
}
```

El contrato declara `ConfirmDeliveryResult = { ok: false; reason: string }` — una cadena libre pensada para mostrarse al usuario. La UI la está usando como **código de error**.

**Consecuencia:** el día que la API real responda "La entrega ya fue registrada", o "Order already delivered", o cualquier variante de redacción, esta rama deja de dispararse **en silencio** y el caso cae en el error genérico. El instalador vería "No se pudo confirmar la entrega. Reconsulte el estado." cuando en realidad el pedido ya estaba entregado — y podría intentarlo otra vez.

**Corrección:** agregar un código legible por máquina al contrato:

```ts
export type ConfirmFailureCode = "ALREADY_DELIVERED" | "REJECTED_BY_RULE" | "UNKNOWN";

export type ConfirmDeliveryResult =
  | { ok: true; deliveredAt: string }
  | { ok: false; code: ConfirmFailureCode; reason: string };
```

La UI ramifica sobre `code`; `reason` queda solo para mostrar. **Este cambio toca `contracts.ts`, así que requiere mi aprobación previa** — la doy por escrito aquí.

---

### H-05 · [MEDIO] Un fallo de red se le reporta al instalador como "Código QR no reconocido"

En `ScannerScreen.handleManualScan`:

```ts
const outcome = await gateway.scanOrder(manualToken.trim());
if (outcome.kind === "FOUND") {
  navigate(...);
} else {
  setError(true);   // ← NOT_FOUND, INVALID_PAYLOAD y NETWORK_ERROR colapsan aquí
}
```

El contrato distingue correctamente cuatro resultados, pero la UI los aplasta en dos. `NETWORK_ERROR` termina mostrando **"Código QR no reconocido"**.

**Consecuencia:** un instalador en una zona sin señal escanea una remisión perfectamente válida y la app le dice que el código no sirve. Va a pensar que el papel del cliente está mal, no que su teléfono perdió cobertura. Es un diagnóstico equivocado en campo.

Hoy el caso está tapado porque el botón se deshabilita cuando `isOnline` es falso. **Pero con la API real la red falla estando `navigator.onLine` en `true`**: portales cautivos, zonas muertas, timeouts, errores 500. Ahí el bug se hace visible.

**Corrección:** separar los mensajes. `NETWORK_ERROR` → *"Sin conexión al validar. Intente de nuevo."* `NOT_FOUND` / `INVALID_PAYLOAD` → *"Código QR no reconocido."*

---

### H-06 · [MEDIO] Contraste insuficiente en la pantalla de bloqueo

Las etiquetas `Cliente`, `Producto` y `Saldo pendiente` usan `--ink-muted` (#757575) a 14 px sobre la trama diagonal hecha con `--surface-3` (#bdbdbd):

| Fondo | Contraste | Mínimo AA |
|---|---:|---:|
| Sobre blanco | 4.61:1 | 4.5:1 |
| **Sobre las franjas grises** | **2.45:1** | 4.5:1 ❌ |

Es la pantalla que se lee **de pie en la calle, a pleno sol, con prisa**. Ahí no se puede fallar contraste.

**Corrección:** subir esas etiquetas a `--ink-base`, o quitar la trama detrás del bloque de texto y dejarla solo en el marco.

---

### H-07 · [MEDIO] El botón "Actualizar" de Mi Ruta no tiene nombre accesible

`button-refresh` contiene únicamente el carácter `↻`, sin `aria-label` ni `title`. Un lector de pantalla lo anuncia como "botón" a secas. Es el **único** control de toda la app sin nombre accesible.

**Corrección:** `aria-label="Actualizar ruta"`.

---

### H-08 · [BAJO] Falta la prueba positiva del candado

`tests/delivery-guard.test.tsx` cubre los tres casos negativos (F2, F3, F4) y los cubre bien. **No hay ninguna prueba de que el botón SÍ aparezca con F1.**

**Consecuencia:** un cambio que rompiera el renderizado del `ClearancePanel` —dejando la app permanentemente incapaz de entregar nada— pasaría los tres tests sin problema. La suite verifica que el candado cierra, pero no que abre.

**Corrección:** agregar un test que monte F1 y afirme `getByTestId('delivery-confirm')`. Y ya que se toca el archivo, valen dos más: `DENY_NOT_DELIVERABLE` con F5, y el caso de lectura vencida de H-02.

---

### H-09 · [BAJO] Warnings de `act()` en la suite de pruebas

Los tests emiten advertencias de React sobre actualizaciones de estado no envueltas en `act(...)` desde `DeliveryResultScreen`. No fallan, pero ensucian la salida y el día que aparezca un problema real va a quedar escondido entre el ruido.

**Corrección:** envolver las actualizaciones asíncronas o usar `waitFor`.

---

### H-10 · [BAJO] `tsconfig.tsbuildinfo` versionado

Es un artefacto de compilación incremental de TypeScript y no está en `.gitignore`. Genera ruido en cada PR.

---

## 4. Mejoras de arquitectura (no son defectos)

Estas no incumplen nada de lo encargado. Las anoto porque conviene resolverlas **antes** de conectar la API, cuando cuesta poco.

### M-01 · Doble llamada a `scanOrder` por cada escaneo

`ScannerScreen` llama a `scanOrder` para decidir si navega, y acto seguido `DeliveryResultScreen` vuelve a llamar a `scanOrder` con el mismo token. Son **dos viajes de red por un solo escaneo**.

Con el mock (500–800 ms cada uno) eso son 1–1.6 segundos antes de que el instalador vea la respuesta. Con la API real se suma latencia móvil, y además se abre una ventana en la que las dos lecturas podrían no coincidir.

La segunda lectura es la correcta y debe quedarse: es la lectura viva que autoriza. **La primera es la que sobra.** Que el escáner navegue directamente y que la pantalla de resultado maneje también el caso `NOT_FOUND` — cosa que ya hace, porque ya renderiza `qr-not-recognized`.

### M-02 · Estado duplicado entre el store de demo y el gateway

`MockGateway` mantiene sus propias copias privadas de `isOnline`, `confirmMode`, `routeMode` y `sessionExpired`, y `DemoScreen` las sincroniza a mano llamando a `gateway.setX(...)` en cada handler y en un `useEffect`.

Son dos fuentes de verdad para el mismo dato, unidas por sincronización manual. Si alguien agrega un interruptor y olvida una línea de sincronización, el panel muestra un estado y el gateway se comporta según otro — y eso es muy difícil de diagnosticar.

**Alternativa:** que el gateway lea el store directamente, o que reciba un proveedor de configuración por inyección. Una sola fuente de verdad.

### M-03 · `key={tick}` remonta el modal de sesión cada segundo

`<SessionExpiredModal key={tick} />` fuerza un desmontaje y montaje completos una vez por segundo. Funciona y es barato porque el modal devuelve `null` casi siempre, pero es un patrón que confunde: expresa "recalcula esto" mediante "destruye y reconstruye esto".

Un `useEffect` con `setInterval` dentro del propio modal, o un hook `useSessionExpiry()`, dice lo mismo sin el remonte. Y de paso ese hook es justo lo que H-02 necesita para la pantalla de resultado.

---

## 5. Resumen y prioridades

| ID | Severidad | Hallazgo |
|---|---|---|
| **H-01** | **ALTO** | La app se puede dejar bloqueada sin salida (offline + logout) |
| **H-02** | **ALTO** | La ventana de lectura viva de 60 s no se aplica con el tiempo |
| H-03 | MEDIO | La lógica de demo no está aislada; no es borrable en un commit |
| H-04 | MEDIO | La UI ramifica sobre el texto del mensaje de error |
| H-05 | MEDIO | Un fallo de red se reporta como "QR no reconocido" |
| H-06 | MEDIO | Contraste 2.45:1 en la pantalla de bloqueo |
| H-07 | MEDIO | `button-refresh` sin nombre accesible |
| H-08 | BAJO | Falta la prueba positiva del candado |
| H-09 | BAJO | Warnings de `act()` |
| H-10 | BAJO | `tsconfig.tsbuildinfo` versionado |

**Orden de corrección recomendado:**

1. **H-01** — es lo único que puede arruinar la demostración al cliente
2. **H-02** — es un agujero en la regla central del producto
3. **H-05** y **H-06** — afectan directamente al instalador en campo
4. **H-03** y **H-04** — pagar antes de conectar la API, no después
5. **H-07**, **H-08**, **H-09**, **H-10** — limpieza
6. **M-01**, **M-02**, **M-03** — cuando haya holgura, idealmente antes de la integración

---

## 6. Valoración final

Emir corrigió lo que se le pidió y en varios puntos entregó de más: diez interruptores en lugar de nueve, la ventana de lectura viva de 60 segundos que nadie le pidió y que conceptualmente es correcta, y un bloque de estado en el panel de demo que facilita mucho diagnosticar por qué la app decide lo que decide.

Los dos hallazgos altos comparten una raíz común, y vale la pena decirlo con claridad: **la lógica está bien pensada, pero no está conectada al paso del tiempo ni a los caminos de escape.** El guard sabe que una lectura caduca, pero nadie le vuelve a preguntar. El modo demo sabe simularlo todo, pero se puede quedar encerrado fuera de sí mismo.

Ninguno de los dos es un error de diseño. Los dos son ese último tramo entre "funciona cuando lo pruebo" y "funciona cuando lo usan". Es justo el tramo que hay que cerrar antes de ponerlo enfrente del dueño de la imprenta.
