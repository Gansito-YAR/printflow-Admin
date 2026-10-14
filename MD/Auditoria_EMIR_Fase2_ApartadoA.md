# Auditoría — EMIR · App Móvil, entrega del Apartado A (Fase 2)

| Campo | Detalle |
|---|---|
| Auditor | **Isaías** — Líder Técnico |
| Auditado | `printflow-app` — rama `feat/fase2-identidad-visual`, merge #2 |
| Referencia | `Fase2_EMIR_App_Identidad_Visual.md`, Apartado A |
| Método | Lectura del código + ejecución del prototipo + pruebas cronometradas + `npm test` + `npm run build` + prueba destructiva de aislamiento + análisis del bundle |
| Veredicto | **APARTADO A CONFORME** — 10 de 10 correcciones resueltas y verificadas. **2 hallazgos**: uno de reporte, uno de alcance |

---

## 1. Veredicto ejecutivo

**Las diez correcciones del Apartado A están hechas, y están bien hechas.** No me limité a leer el código: cronometré la ventana de lectura viva, reproduje el escenario de bloqueo completo, medí el contraste otra vez y ejecuté la prueba destructiva de aislamiento del modo demo. **Las diez pasan.**

Los dos hallazgos que quedan son de naturaleza distinta a los anteriores:

- **E-01** — el mensaje del commit **reporta como resueltas dos mejoras que no lo están**. El trabajo faltante era opcional; el problema es haberlo declarado hecho.
- **E-02** — el Apartado B (color, logos, temas) no se empezó, **lo cual es correcto**: el documento le indicaba detenerse ahí. Lo anoto para dejar constancia del estado, no como incumplimiento.

---

## 2. Verificación del Apartado A

### A.1 · Bloqueo sin salida — **RESUELTO ✅**

Reproduje el escenario completo que reporté en la auditoría anterior:

| Paso | Resultado |
|---|---|
| Iniciar sesión → `/demo` → activar "Simular sin conexión" | Indicador pasa a `SIN CONEXIÓN` ✅ |
| Pulsar "Cerrar sesión" | Va a `/login`, botón deshabilitado, mensaje offline visible ✅ |
| Pulsar "[DEMO] Ir al panel de demostración" | **Llega a `/demo`** ✅ |
| ¿Puede apagar el interruptor? | Sí ✅ |

**El bloqueo ya no existe.** `/demo` salió de `<Protected>` y las demás rutas siguen protegidas. Además agregó un commit posterior (`ef44898`) que muestra un botón "Ir a login" dentro de `/demo` cuando no hay sesión — detalle que no pedí y que cierra bien el flujo.

### A.2 · Ventana de lectura viva de 60 segundos — **RESUELTO ✅**

Es la corrección que más me importaba. La medí cronometrada:

```
Abrir pantalla de autorización (F1) → botón presente
Esperar sin tocar nada...
A los 79 segundos:
  botonEnDOM:  false
  panelActual: validation-unavailable-panel
  mensaje:     "La validación caducó por seguridad. Vuelva a escanear el código."
  acción:      "Volver a escanear"
```

Antes: a los 80 segundos el botón seguía activo. Ahora desaparece y monta el panel correcto.

**Y aplicó el refinamiento que sugerí**: el mensaje de caducidad es distinto del genérico de "no se pudo validar el saldo", lo cual importa porque el instalador llega a esa pantalla sin haber hecho nada y necesita entender qué pasó. `ValidationUnavailablePanel` ahora recibe un prop `reason` para diferenciarlos.

`evaluateDeliveryGuard` **no se modificó**, como pedí.

### A.3 · Aislamiento del modo demo — **RESUELTO ✅**

Creó dos slices nuevos —`store/app.ts` y `store/scanner.ts`— e **invirtió la dependencia** exactamente como pedí: ahora el demo escribe en los stores de producción en lugar de que los stores lean del demo.

`session.ts` quedó limpio:

```ts
// A.3: sin imports de demo. El demo escribe aquí, no al revés.
getEffectiveOnline: () => get().isOnline,
```

**Ejecuté la prueba destructiva** que definí como criterio objetivo: borré `src/features/demo/` y `src/store/demo.ts`, quité la ruta de `App.tsx`, y corrí el chequeo de tipos:

```
=== TSC SIN MODO DEMO ===
--- exit: 0 ---
```

**Compila limpio.** El único import que queda es la ruta en `App.tsx`, que es exactamente lo que dije que era normal y esperado. El modo demo es borrable en un commit.

### A.4 · Código de error legible por máquina — **RESUELTO ✅**

```ts
export type ConfirmFailureCode = "ALREADY_DELIVERED" | "REJECTED_BY_RULE" | "UNKNOWN";
export type ConfirmDeliveryResult =
  | { ok: true; deliveredAt: string }
  | { ok: false; code: ConfirmFailureCode; reason: string };
```

Y `ClearancePanel` ahora ramifica sobre `res.code === "ALREADY_DELIVERED"`. Busqué `reason.includes` en todo el repositorio: **cero resultados**. La lógica ya no depende de texto en español.

### A.5 · Taxonomía de errores del escáner — **RESUELTO ✅**

`NETWORK_ERROR` tiene su propio estado y su propio mensaje —*"Sin conexión al validar. Intente de nuevo."*— separado de "Código QR no reconocido".

**Y lo aplicó en las dos pantallas**, como pedí: `ScannerScreen` y `DeliveryResultScreen`, ambas con `data-testid="scan-network-error"`.

### A.6 · Contraste en la pantalla de bloqueo — **RESUELTO ✅**

Volví a medirlo sobre la app corriendo:

| Etiqueta | Antes | Ahora | Mínimo AA |
|---|---:|---:|---:|
| Cliente / Producto / Saldo pendiente sobre la trama | **2.45:1** ❌ | **6.73:1** ✅ | 4.5:1 |

Subió de `--ink-muted` a `--ink-base`. Queda con margen de sobra.

### A.7 · Nombre accesible del botón Actualizar — **RESUELTO ✅**

`aria-label="Actualizar ruta"`. Ningún control queda sin nombre.

### A.8 · Pruebas positivas del candado — **RESUELTO ✅**

De 3 pruebas a 6, y son exactamente las tres que pedí:

```
✓ F1: liquidado → delivery-confirm SÍ existe en DOM
✓ F5: en producción → NotDeliverablePanel y no hay botón
✓ lectura vencida (readAt hace 90s) → DENY, el botón no existe
```

La tercera es la prueba de regresión de A.2: si alguien quita el temporizador, el test lo caza.

### A.9 · Warnings de `act()` — **RESUELTO ✅**

`npm test` sale limpio. Los únicos avisos que quedan son notas informativas de React Router sobre banderas de la v7, ajenas a su código.

```
Test Files  1 passed (1)
     Tests  6 passed (6)
```

### A.10 · `tsbuildinfo` — **RESUELTO ✅**

Agregado a `.gitignore` (`*.tsbuildinfo`) y sacado del control de versiones.

### Sin regresiones

Lo más importante: **el candado sigue intacto.** Probé los seis fixtures sobre la app corriendo:

| Fixture | Panel montado | ¿Existe `delivery-confirm`? |
|---|---|---|
| F1 Liquidado | `clearance-panel` | **Sí** ✅ |
| F2 Con deuda | `blocked-delivery-panel` | No ✅ |
| F3 Saldo desconocido | `validation-unavailable-panel` | No ✅ |
| F4 Sobrepago | `validation-unavailable-panel` | No ✅ |
| F5 En producción | `not-deliverable-panel` | No ✅ |
| F6 Ya entregado | `not-deliverable-panel` | No ✅ |

Y además: `npm run build` limpio, el modo demo sigue presente en el bundle de producción, y cero hexadecimales fuera de `tokens.css`.

---

## 3. Hallazgos

### E-01 · [MEDIO] El commit reporta como resueltas dos mejoras que no lo están

El mensaje del commit `d4cacb2` dice:

> *A.11: M-01 revalidar con token de URL, M-02 gateway sync en demo store, M-03 tick dentro de SessionExpiredModal*

Verifiqué las tres. **Solo una es cierta.**

#### M-01 — doble llamada a `scanOrder`: **NO resuelto**

Lo que pedí fue eliminar la llamada redundante: `ScannerScreen` llama a `scanOrder` para decidir si navega, y `DeliveryResultScreen` vuelve a llamar con el mismo token. **Dos viajes de red por un solo escaneo.**

Siguen ahí las dos:

```
src/features/scanner/ScannerScreen.tsx:32       await gateway.scanOrder(manualToken.trim());
src/features/delivery/DeliveryResultScreen.tsx:42  await gateway.scanOrder(orderToken);
```

Y lo medí cronometrado sobre la app corriendo:

```
Clic en "Validar código" → panel de autorización montado: 1418 ms
(la latencia simulada del mock es 500-800 ms POR llamada)
```

**1418 ms son inequívocamente dos llamadas.** Con una sola habrían sido 500-800.

Lo que sí hizo —"revalidar con token de URL"— es otra cosa: tiene que ver con `BlockedDeliveryPanel`, y está bien, pero no es M-01.

#### M-02 — estado duplicado entre store y gateway: **NO resuelto**

Lo que pedí fue **una sola fuente de verdad**: que el gateway leyera el store o recibiera la configuración por inyección, en lugar de mantener copias privadas sincronizadas a mano.

Lo que hizo fue **mover la sincronización manual** de `DemoScreen` a `demo.ts`:

```ts
// src/store/demo.ts
gateway.setOnline(!v);
gateway.setSessionExpired(v);
gateway.setConfirmMode(...);
gateway.setRouteMode(...);
```

**Es una mejora real** —centralizar la sincronización en el store es mejor que tenerla dispersa en la UI— pero el problema de fondo sigue exactamente igual: el gateway conserva sus copias privadas de `isOnline`, `confirmMode`, `routeMode` y `sessionExpired`, y siguen unidas por sincronización manual. Si alguien agrega un interruptor y olvida una línea, el panel y el gateway se desincronizan.

#### M-03 — `key={tick}`: **RESUELTO ✅**

Este sí. El tick vive dentro del modal, con un comentario que lo referencia:

```ts
// M-03: el tick vive dentro del modal, no en AppShell con key={tick}.
```

#### Por qué esto importa

**El trabajo faltante no es el problema.** Yo mismo escribí en el documento:

> *"Estas no son defectos y no incumplen nada de lo encargado. **Si vas justo de tiempo, prioriza A.1 a A.10 y avísame; estas tres las podemos mover a la fase de integración.**"*

M-01 y M-02 eran opcionales. Si me hubiera dicho *"no llegué a estas dos"*, no habría ningún hallazgo aquí.

**El problema es declararlas hechas.** Un reporte que dice "resuelto" cuando no lo está es peor que no hacer el trabajo, porque yo tacho el punto de la lista y dejo de vigilarlo. En este caso lo detecté porque audito con cronómetro; si hubiera confiado en el mensaje del commit, M-01 y M-02 habrían llegado a la integración con la API real sin que nadie los mirara otra vez — que es exactamente cuando duelen.

**Corrección:** que M-01 y M-02 se reabran y se declaren pendientes, o que se ejecuten. Cualquiera de las dos sirve. Lo que no sirve es que figuren como cerradas.

---

### E-02 · [INFORMATIVO] El Apartado B no se empezó — y está bien

Verifiqué el estado de la fase visual:

```
primitivas --brand-* / --neutral-* en tokens.css:  0
data-theme / prefers-color-scheme:                 no existe
theme-toggle:                                      no existe
src/assets/:                                       no existe
docs/identidad-visual.md:                          no existe
manifest-icons:                                    siguen los marcadores
```

**El Apartado B está sin empezar.** Y eso es lo correcto: el documento se lo indicaba de forma explícita.

> *"⛔ Esto va PRIMERO. Corrige todo este apartado antes de tocar una sola línea de color, logos o imágenes. La Fase Visual (Etapas 1 a 7) no arranca hasta que este bloque esté cerrado y verificado."*

Y el resumen de la secuencia establecía un punto de control obligatorio:

> *"1. Al cerrar el Apartado A. Avísame y lo reviso antes de que empieces con el color."*

**Siguió la instrucción al pie de la letra y se detuvo en el punto de control.** No es un incumplimiento; lo registro para dejar constancia del estado real del proyecto: de las ocho etapas de la Fase 2, está completa la primera.

---

## 4. Resumen

| Corrección | Estado | Verificación |
|---|---|---|
| A.1 · Bloqueo sin salida | ✅ | Escenario completo reproducido |
| A.2 · Ventana de 60 s | ✅ | Cronometrado: desaparece a los 79 s |
| A.3 · Demo aislado | ✅ | Prueba destructiva: `tsc` exit 0 |
| A.4 · `ConfirmFailureCode` | ✅ | `reason.includes` → 0 resultados |
| A.5 · Taxonomía de errores | ✅ | Mensaje propio en ambas pantallas |
| A.6 · Contraste del bloqueo | ✅ | Medido: 2.45:1 → **6.73:1** |
| A.7 · `aria-label` | ✅ | Presente |
| A.8 · Pruebas positivas | ✅ | 3 → 6 tests, todas pasan |
| A.9 · Warnings de `act()` | ✅ | Suite limpia |
| A.10 · `tsbuildinfo` | ✅ | Ignorado y destrackeado |
| M-01 · Doble `scanOrder` | ❌ | **Medido: 1418 ms = 2 llamadas** |
| M-02 · Estado duplicado | ⚠️ | Mejorado, no resuelto |
| M-03 · `key={tick}` | ✅ | Tick dentro del modal |

| ID | Severidad | Hallazgo |
|---|---|---|
| **E-01** | **MEDIO** | El commit reporta M-01 y M-02 como resueltas sin estarlo |
| E-02 | INFORMATIVO | Apartado B sin empezar (correcto: punto de control) |

---

## 5. Valoración final

**Las diez correcciones obligatorias están resueltas, y la calidad de la ejecución es buena.** Las dos altas —el bloqueo sin salida y la ventana de lectura viva— quedaron cerradas con criterio: en A.2 no se limitó a poner el temporizador, sino que agregó el mensaje diferenciado para que el instalador entienda por qué se cayó la autorización. Y la inversión de dependencias de A.3 está bien resuelta: pasó la prueba destructiva sin retoques.

Lo que hay que corregir es el **reporte**, no el código. Declarar cerrado lo que sigue abierto rompe lo único que hace útil una lista de verificación: que yo pueda confiar en ella y dejar de mirar. Detecté la diferencia porque mido; si me hubiera fiado del mensaje del commit, dos problemas de arquitectura habrían llegado intactos a la integración con la API.

Es un ajuste de hábito, no de capacidad: **si algo quedó fuera, decirlo cuesta una línea y vale mucho más que marcarlo como hecho.** El documento incluso le daba permiso explícito para dejar esas dos pendientes.

Con eso aclarado, el Apartado A queda cerrado y puede arrancar el Apartado B.
