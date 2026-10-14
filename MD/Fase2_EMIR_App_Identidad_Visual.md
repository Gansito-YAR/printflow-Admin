# Fase 2 — EMIR · App Móvil: Identidad Visual, Logos y Modo Claro/Oscuro

| Campo | Detalle |
|---|---|
| Proyecto | **PrintFlow AI** — Imprenta Escalante |
| Módulo | Fase 4 del SRS — PWA móvil de los auxiliares de instalación |
| Responsable | **Emir** — Full Stack |
| Aprueba | **Isaías** — Líder Técnico |
| Repositorio | `printflow-app` |
| Estructura del trabajo | **Apartado A (correcciones) + Apartado B (7 etapas visuales), en ese orden** |
| Documentos previos | `Fase1_EMIR_App_Movil_UI.md` y `Fase1.5_EMIR_Correcciones_Prototipo.md` — siguen vigentes en todo lo que no contradiga este |
| Fuente de identidad visual | https://www.facebook.com/share/1c7HvhuMmG/ |
| Objetivo | Prototipo **visualmente terminado y profesional**, listo para presentarle avances al dueño de la imprenta |

---

## 1. Qué cambia respecto a las fases anteriores

En la Fase 1 construiste la **estructura**: las 5 pantallas, el grid de 8 puntos, los estados y —lo más importante— el candado de entrega. En la Fase 1.5 lo hiciste **alcanzable** con el modo demo. Los dos trabajos están bien hechos y **no se rehacen**.

Este documento tiene **dos apartados, y van en orden**:

- **Apartado A — Mejoras y Correcciones.** Detalles que salieron de la auditoría de tu Fase 1.5. Son rápidos y van primero.
- **Apartado B — Fase Visual.** Lo que ya habíamos planificado, en 7 etapas:
  1. **Color de marca** de Imprenta Escalante
  2. **Logos e iconos reales**, incluidos los de la PWA instalada en el celular
  3. **Modo claro / oscuro** con cambio de tono

Al terminar esta fase, esto se le enseña al **dueño de la imprenta** como avance de su proyecto. Ya no puede verse como una maqueta de laboratorio: tiene que verse como una aplicación terminada. Sigue siendo un prototipo por dentro —datos simulados, sin backend, sin cámara real— pero **por fuera tiene que parecer producto**.

> **Regla que rige toda esta fase:** la estructura y la lógica no se tocan. El grid de 8 puntos, el layout de las 5 pantallas, `evaluateDeliveryGuard`, el contrato de datos, el modo demo y los `data-testid` se quedan **exactamente como están**. Si una decisión visual te obliga a cambiar alguna de esas cosas, párate y pregúntame antes.

---

## 2. Regla permanente de verificación — aplica a TODAS las etapas

> **Al terminar cada etapa, antes de pasar a la siguiente, revisa el estado real de tu código contra lo que la etapa pedía.** Si encuentras algo que no quedó como se esperaba, algo que se rompió sin querer, un comportamiento inesperado o algo que se te pasó, **corrígelo en ese momento**. No lo dejes para el final ni lo reportes como "pendiente".

No des una etapa por terminada porque escribiste el código: dala por terminada cuando **la abriste en el celular, la recorriste y confirmaste que hace lo que debía hacer**. Cada etapa de abajo termina con un bloque **"Verificación de cierre"**. Es parte del trabajo, no un extra.

En esta fase la verificación es doble, porque hay dos temas: **cada pantalla debe revisarse en modo claro Y en modo oscuro.** Un color que funciona en claro y se vuelve ilegible en oscuro es un defecto, no un detalle.

---

# APARTADO A — Mejoras y Correcciones

> ## ⛔ Esto va PRIMERO
>
> **Corrige todo este apartado antes de tocar una sola línea de color, logos o imágenes.** La Fase Visual (Etapas 1 a 7) no arranca hasta que este bloque esté cerrado y verificado.
>
> La razón es práctica: varias de estas correcciones tocan archivos que también vas a tocar en la fase visual (`App.tsx`, `ScannerScreen`, la pantalla de bloqueo, `contracts.ts`). Si las dejas para después, vas a estar arreglando lógica con color encima, y cada bug será el doble de difícil de aislar. Además, **la corrección A.6 se va a rehacer sola** cuando apliques la paleta: hazla ahora y verifícala otra vez en la Etapa 4.

## A.0 · De dónde salen estas correcciones

Hice una auditoría completa de tu entrega de la Fase 1.5: leí el código fuente, ejecuté el prototipo, verifiqué las 27 filas de la matriz una por una, corrí `npm test` y `npm run build`, y analicé el bundle de producción.

**El veredicto fue CONFORME.** Las 4 tareas están implementadas, las 27 filas son alcanzables, el modo demo sobrevive al build de producción —que era el error que motivó toda la Fase 1.5— y el candado funciona correctamente en los cinco escenarios. En varios puntos entregaste de más: diez interruptores en lugar de nueve, y la ventana de lectura viva de 60 segundos que ni siquiera te pedí.

Lo que sigue son **10 correcciones y 3 mejoras de arquitectura**. Ninguna invalida tu entrega. La mayoría son de veinte minutos. Dos son importantes y te explico exactamente por qué.

El reporte completo está en `Auditoria_EMIR_Fase1.5.md` si quieres el detalle de cómo se detectó cada una.

---

## A.1 · [ALTO] La app se puede quedar bloqueada sin salida

### Qué pasa

1. Inicias sesión → `/demo` → activas **"Simular sin conexión"**
2. Pulsas **"Cerrar sesión"**
3. En el login, el botón "Iniciar sesión" está deshabilitado porque estás offline — eso es correcto
4. Pulsas el enlace **"[DEMO] Ir al panel de demostración"** para apagar el interruptor
5. **El enlace no lleva a ningún lado.** Rebota al login

Quedas atrapado: no puedes entrar porque estás "offline", y no puedes llegar al panel para desactivarlo porque no tienes sesión. La única salida es recargar la página —el store no persiste, así que se limpia— pero nadie lo sabe.

### Por qué importa

Esto puede pasar **en plena demostración al dueño de la imprenta**. Basta que alguien toque ese interruptor y cierre sesión para que la app parezca rota justo cuando le estás enseñando el proyecto al cliente.

Y hay un detalle que hace peor el problema: **el enlace muerto lo pusiste tú en la pantalla de login.** Un botón que no hace nada se lee como un bug, no como una restricción de seguridad.

### La causa

En `src/App.tsx`, la ruta `/demo` está envuelta en `<Protected>`:

```tsx
<Route
  path="/demo"
  element={
    <Protected>          {/* ← esto sobra */}
      <AppShell>
        <DemoScreen />
      </AppShell>
    </Protected>
  }
/>
```

### Corrección

Saca `/demo` del `<Protected>`. Debe ser pública mientras exista el modo demo. **Las demás rutas siguen protegidas exactamente igual.**

```tsx
<Route
  path="/demo"
  element={
    <AppShell>
      <DemoScreen />
    </AppShell>
  }
/>
```

Verifica después que `AppShell` no reviente sin sesión: el `ConnectionIndicator`, el `BottomNav` y el `SessionExpiredModal` deben tolerar `session === null`. El modal ya lo hace (`if (!session) return null`); revisa los otros dos.

---

## A.2 · [ALTO] La ventana de "lectura viva" de 60 segundos nunca se aplica

### Qué pasa

Tu `deliveryGuard.ts` define la regla correctamente:

```ts
const READ_FRESHNESS_MS = 60_000;
// ...
if (nowMs - readAtMs > READ_FRESHNESS_MS) return "DENY_INDETERMINATE";
```

**Pero nada vuelve a ejecutar el guard con el paso del tiempo.** En `DeliveryResultScreen`, el `now` se calcula durante el render:

```ts
const decision = evaluateDeliveryGuard({ …, now: new Date().toISOString() });
```

Y ese componente solo se re-renderiza cuando cambia su estado o el del store. El `tick` de un segundo que tienes en `AppShell` **no llega hasta ahí**, porque `children` es una prop referencialmente estable y React se salta el subárbol.

### La prueba

Abrí la pantalla de autorización con F1 y esperé sin tocar nada:

```json
{ "segundosTranscurridos": 80, "botonSigueEnDOM": true, "botonHabilitado": true }
```

**80 segundos después, con una regla de 60, el botón seguía activo.**

### Por qué importa

Un instalador abre la pantalla verde, se guarda el celular en el bolsillo, atiende otra cosa, y diez minutos más tarde el botón "Confirmar entrega física" sigue ahí y sigue funcionando — con un saldo que el sistema leyó hace diez minutos y que pudo haber cambiado en ese rato.

Es exactamente el escenario que tu regla de los 60 segundos existía para prevenir. La lógica está bien pensada; solo le falta estar conectada al reloj.

### Corrección

Agrega un temporizador dentro de `DeliveryResultScreen` que fuerce la re-evaluación mientras el panel esté montado:

```ts
// Re-evaluar el guard periódicamente para que la ventana de lectura viva
// (READ_FRESHNESS_MS) se aplique realmente con el paso del tiempo.
const [, forceTick] = useState(0);

useEffect(() => {
  const id = setInterval(() => forceTick((t) => t + 1), 5000);
  return () => clearInterval(id);
}, []);
```

Cinco segundos es suficiente: la ventana es de sesenta, así que el peor retraso en detectar el vencimiento son cinco segundos.

**Importante:** cuando la lectura venza, el guard devolverá `DENY_INDETERMINATE` y se montará `ValidationUnavailablePanel`. Revisa que ese panel ofrezca una acción clara para recuperarse — un botón **"Volver a escanear"**— porque el instalador va a llegar ahí sin haber hecho nada, y necesita entender qué pasó y qué hacer.

Considera darle a ese caso un mensaje propio, distinto del genérico: algo como *"La validación caducó por seguridad. Vuelva a escanear el código."* No es lo mismo un saldo que no se pudo leer que una lectura que envejeció.

**No toques `evaluateDeliveryGuard`.** La función está bien. Lo que falta es que alguien le vuelva a preguntar.

---

## A.3 · [MEDIO] El modo demo no es borrable en un commit

### Qué pasa

El criterio §10 de la Fase 1.5 decía: *"La lógica de demo está aislada en su propio slice de Zustand y en su propia carpeta, borrable en un commit."*

`src/store/demo.ts` está importado por **cuatro archivos fuera del dominio de demo**:

| Archivo | Qué usa |
|---|---|
| `src/store/session.ts` | `getEffectiveOnline()` lee `useDemoStore.getState().offline` |
| `src/components/layout/AppShell.tsx` | Lee `updateAvailable` para el `UpdateToast` |
| `src/components/feedback/SessionExpiredModal.tsx` | Llama a `setSessionExpired(false)` |
| `src/features/scanner/ScannerScreen.tsx` | Lee `supportsTorch` y `cameraPermissionDenied` |

Borrar `src/features/demo/` y `src/store/demo.ts` rompe el build en cuatro puntos, y uno de ellos es **el store de sesión**, que es el núcleo de la aplicación.

### Por qué importa

Cuando conectemos la API real, retirar el modo demo debería ser un `git rm` de dos rutas. Tal como está, es una cirugía sobre código de producción con riesgo de romper `session.ts`.

### Corrección — invierte la dependencia

Hoy los stores de producción **leen** del demo. Debe ser al revés: el demo **escribe** en los stores de producción.

**Antes** (`session.ts` depende de `demo.ts`):

```ts
getEffectiveOnline: () => {
  const demoOffline = useDemoStore.getState().offline;   // ← acoplamiento
  if (demoOffline) return false;
  return get().isOnline;
}
```

**Después** (`session.ts` no sabe que el demo existe):

```ts
// session.ts — limpio, sin imports de demo
isOnline: navigator.onLine,
setOnline: (online) => set({ isOnline: online }),
```

```ts
// demo.ts — el demo empuja el valor hacia adentro
setOffline: (v) => {
  set({ offline: v });
  useSessionStore.getState().setOnline(!v);
}
```

Aplica el mismo criterio a los otros tres:

- **`supportsTorch` y `cameraPermissionDenied`** → muévelos a un slice propio del escáner (o a estado local de `ScannerScreen` con setters expuestos). El demo los escribe; el escáner solo los lee de su propia fuente.
- **`updateAvailable`** → un slice de aplicación. En producción lo va a escribir el Service Worker, no el demo. Deja el consumidor listo para eso.
- **`SessionExpiredModal`** → que no llame a `setSessionExpired(false)`. Que solo haga `logout()` y navegue; el demo se encarga de limpiar su propio interruptor.

### Cómo verificarlo

La prueba es objetiva: **borra temporalmente `src/features/demo/` y `src/store/demo.ts`, corre `npm run build`, y confirma que compila.** Si compila, está bien aislado. Después restauras con `git checkout`.

*(Sí vas a tener que quitar la ruta `/demo` de `App.tsx` en esa prueba — eso es normal y esperado, es una línea.)*

---

## A.4 · [MEDIO] La UI decide el flujo leyendo texto en español

### Qué pasa

En `ClearancePanel.tsx`:

```ts
} else if (res.reason.includes("ya había sido registrada")) {
  setState("already-registered");
}
```

El contrato declara `reason: string` — una cadena pensada para **mostrarse al usuario**. La estás usando como **código de error** para decidir qué pantalla renderizar.

### Por qué importa

El día que la API real responda `"La entrega ya fue registrada"`, o `"Order already delivered"`, o cualquier variante de redacción, **esta rama deja de dispararse en silencio** y el caso cae en el error genérico.

El instalador vería *"No se pudo confirmar la entrega. Reconsulte el estado."* cuando en realidad el pedido **ya estaba entregado** — y probablemente lo intentaría otra vez.

Los mensajes para humanos cambian: los reescribe alguien de negocio, se traducen, se corrigen faltas de ortografía. Un código de máquina no cambia. Nunca ates lógica a un texto que alguien más puede editar sin saber que rompe algo.

### Corrección

En `src/data/contracts.ts`:

```ts
/** Código legible por máquina del fallo al confirmar entrega */
export type ConfirmFailureCode =
  | "ALREADY_DELIVERED"
  | "REJECTED_BY_RULE"
  | "UNKNOWN";

export type ConfirmDeliveryResult =
  | { ok: true; deliveredAt: string }
  | { ok: false; code: ConfirmFailureCode; reason: string };
```

En `mockGateway.ts`:

```ts
if (this.confirmMode === "ERROR") {
  return { ok: false, code: "REJECTED_BY_RULE", reason: "Entrega rechazada por el sistema" };
}
if (this.confirmMode === "ALREADY_REGISTERED") {
  return { ok: false, code: "ALREADY_DELIVERED", reason: "La entrega ya había sido registrada" };
}
```

En `ClearancePanel.tsx`:

```ts
} else if (res.code === "ALREADY_DELIVERED") {
  setState("already-registered");
}
```

`reason` se queda, pero **solo para mostrar**. La lógica se apoya en `code`.

> **Este cambio toca `contracts.ts`, que normalmente requiere mi aprobación. Te la doy por escrito aquí: adelante.**

---

## A.5 · [MEDIO] Un fallo de red se le reporta al instalador como "Código QR no reconocido"

### Qué pasa

En `ScannerScreen.handleManualScan`:

```ts
const outcome = await gateway.scanOrder(manualToken.trim());
if (outcome.kind === "FOUND") {
  navigate(`/resultado/${manualToken.trim()}`);
} else {
  setError(true);   // ← NOT_FOUND, INVALID_PAYLOAD y NETWORK_ERROR caen todos aquí
}
```

Tu contrato distingue bien cuatro resultados. La UI los aplasta en dos, y `NETWORK_ERROR` termina mostrando **"Código QR no reconocido"**.

### Por qué importa

Un instalador en una zona sin señal escanea una remisión perfectamente válida y la app le dice que el código no sirve. **Va a pensar que el papel del cliente está mal**, no que su teléfono perdió cobertura. Va a llamar al dueño a reportar un problema que no existe.

Hoy el caso está tapado porque el botón se deshabilita cuando `isOnline` es falso. **Pero con la API real la red falla estando `navigator.onLine` en `true`**: portales cautivos del wifi de un cliente, zonas muertas, timeouts, errores 500 del servidor. Ahí el bug se hace visible, justo cuando ya no lo estamos mirando.

### Corrección

Separa los casos y da mensajes distintos:

```ts
type ScanError = "NOT_RECOGNIZED" | "NETWORK";
const [scanError, setScanError] = useState<ScanError | null>(null);

// ...
if (outcome.kind === "FOUND") {
  navigate(`/resultado/${token}`);
} else if (outcome.kind === "NETWORK_ERROR") {
  setScanError("NETWORK");
} else {
  setScanError("NOT_RECOGNIZED");   // NOT_FOUND e INVALID_PAYLOAD
}
```

| Caso | Mensaje | Acción |
|---|---|---|
| `NOT_FOUND` / `INVALID_PAYLOAD` | "Código QR no reconocido" | "Escanear de nuevo" |
| `NETWORK_ERROR` | **"Sin conexión al validar. Intente de nuevo."** | "Reintentar" |

Conserva el `data-testid="qr-not-recognized"` para el primer caso (la matriz de verificación lo usa) y agrega uno nuevo para el segundo, por ejemplo `data-testid="scan-network-error"`.

**Aplica el mismo criterio en `DeliveryResultScreen`**, que hoy tiene el mismo colapso: `if (notFound || !order)` muestra "Código QR no reconocido" para cualquier resultado que no sea `FOUND`.

---

## A.6 · [MEDIO] Contraste insuficiente en la pantalla de bloqueo

### Qué pasa

Las etiquetas `Cliente`, `Producto` y `Saldo pendiente` usan `--ink-muted` (#757575) a 14 px, y quedan encima de la trama diagonal hecha con `--surface-3` (#bdbdbd). Lo medí:

| Fondo | Contraste | Mínimo AA | |
|---|---:|---:|---|
| Sobre blanco | 4.61:1 | 4.5:1 | pasa raspando |
| **Sobre las franjas grises** | **2.45:1** | 4.5:1 | **falla** |

### Por qué importa

Es **la pantalla que se lee de pie en la calle, a pleno sol, con el celular sucio y con prisa**. Es el peor escenario de legibilidad de toda la aplicación, y es donde se está fallando.

### Corrección

Dos opciones, cualquiera sirve:

1. Subir esas etiquetas a `--ink-base` (#333333) como mínimo, o directamente a `--ink-strong`
2. Quitar la trama detrás del bloque de texto y dejarla solo en el marco del panel

**Mídelo con herramienta, no a ojo.** Y ojo: esta corrección la vas a rehacer en la Etapa 4 cuando apliques color de marca. Hazla ahora igual —para no arrastrar el defecto— y **vuelve a medirla** cuando el panel tenga su color definitivo.

---

## A.7 · [MEDIO] El botón "Actualizar" de Mi Ruta no tiene nombre accesible

`button-refresh` contiene únicamente el carácter `↻`, sin `aria-label` ni `title`. Un lector de pantalla lo anuncia como "botón" a secas.

Es el **único** control de toda la app con este problema — todo lo demás está bien nombrado, lo cual dice que fue un descuido puntual y no un criterio.

### Corrección

```tsx
<button data-testid="button-refresh" aria-label="Actualizar ruta" …>
```

Y ya que estás ahí: verifica que su hitbox llegue a 48×48 px. Lo medí en **48×60**, así que cumple, pero confírmalo si lo tocas.

---

## A.8 · [BAJO] Falta la prueba positiva del candado

`tests/delivery-guard.test.tsx` cubre los tres casos negativos (F2, F3, F4) y los cubre bien. **No hay ninguna prueba de que el botón SÍ aparezca con F1.**

### Por qué importa

Un cambio que rompiera el renderizado del `ClearancePanel` —dejando la app permanentemente **incapaz de entregar nada**— pasaría los tres tests actuales sin problema.

Tu suite verifica que el candado **cierra**. No verifica que **abre**. Una cerradura que nunca abre también está rota, solo que falla del otro lado.

### Corrección

Agrega estas tres pruebas al mismo archivo:

```ts
it("F1: liquidado (balanceDue '0.00') → delivery-confirm SÍ existe en DOM", …)
it("F5: en producción → se monta NotDeliverablePanel y no hay botón", …)
it("lectura vencida (readAt hace 90s) → DENY, el botón no existe", …)
```

La tercera es la prueba de regresión de A.2: garantiza que si alguien quita el temporizador, el test lo cacha.

---

## A.9 · [BAJO] Warnings de `act()` en las pruebas

La suite emite advertencias de React sobre actualizaciones de estado no envueltas en `act(...)`, provenientes de `DeliveryResultScreen`.

No fallan, pero ensucian la salida. Y el día que aparezca un warning que sí importe, va a quedar enterrado entre estos.

### Corrección

Envuelve las actualizaciones asíncronas o usa `waitFor` / `findBy*` en lugar de `getBy*` tras un `await`. El objetivo es que `npm test` salga **limpio**.

---

## A.10 · [BAJO] `tsconfig.tsbuildinfo` está versionado

Es un artefacto de compilación incremental de TypeScript. Agrégalo a `.gitignore` y sácalo del control de versiones:

```
tsconfig.tsbuildinfo
*.tsbuildinfo
```

---

## A.11 · Mejoras de arquitectura recomendadas

Estas **no son defectos** y no incumplen nada de lo encargado. Las anoto porque conviene resolverlas ahora, mientras cuestan poco, en lugar de durante la integración con la API.

**Si vas justo de tiempo, prioriza A.1 a A.10 y avísame; estas tres las podemos mover a la fase de integración.**

### M-01 · Doble llamada a `scanOrder` por cada escaneo

`ScannerScreen` llama a `scanOrder` para decidir si navega, y acto seguido `DeliveryResultScreen` vuelve a llamar a `scanOrder` con el mismo token. Son **dos viajes de red por un solo escaneo**.

Con el mock (500–800 ms cada uno) son 1–1.6 segundos antes de que el instalador vea nada. Con la API real se suma latencia móvil, y se abre una ventana en la que las dos lecturas podrían no coincidir.

La segunda lectura es la correcta y se queda: es la lectura viva que autoriza. **La primera es la que sobra.** Que el escáner navegue directo y que la pantalla de resultado maneje también `NOT_FOUND` — cosa que ya hace, porque ya renderiza `qr-not-recognized`.

*(Si haces esto, coordínalo con A.5: los mensajes de error de red y de código no reconocido se concentran en la pantalla de resultado.)*

### M-02 · Estado duplicado entre el store de demo y el gateway

`MockGateway` mantiene copias privadas de `isOnline`, `confirmMode`, `routeMode` y `sessionExpired`, y `DemoScreen` las sincroniza a mano llamando a `gateway.setX(...)` en cada handler y en un `useEffect`.

Son **dos fuentes de verdad para el mismo dato**, unidas por sincronización manual. Si alguien agrega un interruptor y olvida una línea de sincronización, el panel muestra un estado y el gateway se comporta según otro. Ese tipo de bug es de los más caros de diagnosticar porque todo *parece* correcto.

**Alternativa:** que el gateway lea el store directamente, o que reciba un proveedor de configuración por inyección. Una sola fuente de verdad.

### M-03 · `key={tick}` remonta el modal de sesión cada segundo

`<SessionExpiredModal key={tick} />` fuerza un desmontaje y montaje completos una vez por segundo. Funciona, y es barato porque el modal devuelve `null` casi siempre — pero es un patrón que confunde a quien lo lee después: expresa *"recalcula esto"* mediante *"destruye y reconstruye esto"*.

Un `useEffect` con `setInterval` dentro del propio modal, o mejor un hook `useSessionExpiry()`, dice lo mismo sin el remonte.

**Y hay un beneficio directo:** ese mismo hook es justo lo que necesitas para A.2. Si extraes `useSessionExpiry()` y creas un `useNow(intervalMs)` genérico, resuelves M-03 y A.2 con la misma pieza.

---

## ✅ Verificación de cierre — Apartado A

No pases a la Etapa 1 sin marcar todas estas casillas:

**Funcional**

- [ ] `/demo` abre **sin sesión iniciada**, y el enlace del login funciona
- [ ] Ya no es posible dejar la app bloqueada: offline + cerrar sesión sigue teniendo salida
- [ ] Se alcanzan las filas 3 y 24 de la matriz de la Fase 1.5
- [ ] En la pantalla de autorización, **el botón desaparece pasados los 60 segundos** y aparece un panel con acción de recuperación
- [ ] `NETWORK_ERROR` muestra un mensaje de red, no "Código QR no reconocido"
- [ ] `ALREADY_DELIVERED` se detecta por `code`, no por el texto del mensaje

**Arquitectura**

- [ ] Borrando `src/features/demo/` y `src/store/demo.ts`, **el proyecto compila** (salvo la ruta en `App.tsx`)
- [ ] `session.ts` no importa nada de `demo`
- [ ] `contracts.ts` incluye `ConfirmFailureCode`

**Calidad**

- [ ] Las etiquetas de la pantalla de bloqueo miden **≥4.5:1 contra el peor fondo**, medido con herramienta
- [ ] `button-refresh` tiene `aria-label`; ningún control queda sin nombre accesible
- [ ] Existen las pruebas positivas: F1 renderiza el botón, F5 no, lectura vencida no
- [ ] `npm test` pasa **limpio**, sin warnings de `act()`
- [ ] `npm run build` limpio
- [ ] `tsconfig.tsbuildinfo` ignorado

**Y lo que no puede haberse roto**

- [ ] `evaluateDeliveryGuard` sigue **sin modificar**
- [ ] Las 27 filas de la matriz siguen siendo alcanzables
- [ ] El modo demo sigue presente en el build de producción
- [ ] "Mi Ruta" sigue sin un solo signo de pesos

---

> ### Hasta aquí las correcciones.
>
> **A partir de la Etapa 1 empieza el trabajo de la Fase Visual: color, logos, imágenes y modo claro/oscuro.** Todo lo que sigue asume que este apartado ya está cerrado.

---

# APARTADO B — Fase Visual

## ETAPA 1 — Extraer la identidad visual de la fuente

La identidad de la imprenta está aquí:

**https://www.facebook.com/share/1c7HvhuMmG/**

De ahí sacas **los colores, el logotipo y las imágenes** que vas a usar. Antes de tocar código, haz este trabajo de extracción y déjalo documentado.

### 1.1 · Qué tienes que sacar

1. **El logotipo**, en la mejor resolución que encuentres.
2. **Los colores de marca.** Sácalos del logotipo y de los materiales gráficos que publiquen, no de las fotos de producto. Necesitas mínimo: un color principal, uno secundario o de acento, y los neutros.
3. **Imágenes de referencia** que te sirvan para entender el tono de la marca.

### 1.2 · Reglas al extraer

- **Solo material de la propia imprenta.** No tomes fotos de terceros, stock ajeno ni imágenes que aparezcan en la página pero no sean suyas.
- **Nada de incrustar contenido de Facebook en la app.** No embebas publicaciones, no cargues imágenes desde el dominio de Facebook, no metas píxeles ni scripts de seguimiento. Descarga los archivos y guárdalos en el repositorio.
- **Si el logotipo que consigues es de baja resolución o viene con el fondo quemado**, no lo uses así y no intentes "arreglarlo" a mano. **Pídele a Andri el archivo original** (idealmente vectorial: `.svg`, `.ai` o `.pdf`). Un logo pixelado en la pantalla de inicio arruina la percepción de todo el prototipo, y esto se le va a enseñar al dueño.
- **No inventes la marca.** Si algo no está claro —qué naranja exacto, cuál es el logo oficial— pregunta antes de decidir por tu cuenta.

### 1.3 · Entregable de esta etapa

Un archivo `docs/identidad-visual.md` en tu repo con:

- La paleta extraída, con su valor hexadecimal y para qué la vas a usar
- De dónde sacaste cada color (del logo, de un banner, etc.)
- Los assets descargados, con su resolución y formato
- Qué le vas a pedir a Andri, si algo te falta

Este archivo es tu justificación. Cuando yo revise y pregunte "¿por qué este azul?", la respuesta tiene que estar escrita ahí.

### ✅ Verificación de cierre — Etapa 1

- [ ] Existe `docs/identidad-visual.md` con la paleta documentada y su origen
- [ ] Los assets están descargados dentro del repositorio, no enlazados a Facebook
- [ ] El logotipo tiene resolución suficiente, o ya le pediste el original a Andri
- [ ] Cero scripts, píxeles o recursos externos de Facebook en el proyecto

---

## ETAPA 2 — Arquitectura de tokens en tres capas

Aquí está la decisión técnica más importante de la fase. **Léela completa antes de escribir una línea**, porque si la arquitectura queda mal, el modo oscuro de la Etapa 3 se vuelve un infierno.

Hoy tu `tokens.css` tiene **una sola capa**: nombres semánticos con valores grises fijos. Eso funcionaba sin color y sin temas. Con dos temas ya no alcanza.

### 2.1 · Las tres capas

**Capa 1 — Primitivas.** La paleta cruda de la marca, sin significado asignado. **No cambia entre temas.** Nombres neutros por familia e intensidad:

```css
:root {
  /* Ejemplo de NOMENCLATURA. Los valores salen de tu Etapa 1. */
  --brand-50:  …;
  --brand-100: …;
  --brand-500: …;   /* tono principal de la marca */
  --brand-700: …;
  --brand-900: …;

  --neutral-0:   …;   /* blanco */
  --neutral-50:  …;
  --neutral-100: …;
  --neutral-300: …;
  --neutral-600: …;
  --neutral-800: …;
  --neutral-900: …;   /* negro */

  /* Colores de estado — ver reglas de la Etapa 4 */
  --danger-500:  …;
  --danger-700:  …;
  --success-500: …;
  --success-700: …;
  --warning-500: …;
}
```

**Capa 2 — Semánticas por tema.** Los nombres que **ya usan tus componentes**, ahora definidos dos veces: una por tema.

```css
/* Tema claro — por defecto */
:root,
:root[data-theme="light"] {
  --surface-0: var(--neutral-0);
  --surface-1: var(--neutral-50);
  --surface-2: var(--neutral-100);
  --surface-3: var(--neutral-300);

  --ink-strong: var(--neutral-900);
  --ink-base:   var(--neutral-800);
  --ink-muted:  var(--neutral-600);

  --border-hairline: …;
  --border-strong:   …;
  --overlay-backdrop: …;

  /* Estados */
  --state-blocked-bg:     …;
  --state-blocked-ink:    …;
  --state-blocked-border: …;
  --state-cleared-bg:     …;
  --state-cleared-ink:    …;
  --state-cleared-border: …;

  /* Acciones */
  --action-primary-bg:   var(--brand-500);
  --action-primary-ink:  …;
  --action-danger-bg:    …;
  --action-disabled-bg:  …;
  --action-disabled-ink: …;
}

/* Tema oscuro — MISMOS nombres, distintos valores */
:root[data-theme="dark"] {
  --surface-0: var(--neutral-900);
  --surface-1: var(--neutral-800);
  /* …y así con todos. */
}
```

**Capa 3 — Los componentes.** No cambian **nada**. Siguen diciendo `var(--surface-0)` y `var(--ink-strong)` exactamente como hoy.

### 2.2 · Por qué esta arquitectura y no otra

Si tus componentes apuntaran directo a `--brand-500`, para hacer el modo oscuro tendrías que ir componente por componente metiendo condicionales. Con esta separación, **el tema entero cambia con un atributo en `<html>`** y ni un solo componente se entera.

Además: el día que el dueño diga *"ese azul está muy fuerte"*, cambias **un valor en la capa 1** y los dos temas se reajustan solos con coherencia.

### 2.3 · Reglas duras de los tokens

1. **Ningún componente escribe un color literal ni menciona una primitiva.** Solo tokens semánticos. Esta regla ya la cumples al 100% hoy — no la pierdas.
2. **Todo token semántico debe existir en los dos temas.** Si defines uno solo en claro, en oscuro va a heredar el valor equivocado o quedar indefinido. Haz una lista y márcala.
3. **Los tokens de espaciado, layout e hitbox (`--space-*`, `--header-height`, `--hitbox-min`, `--button-height`) NO cambian entre temas.** Esos viven en `:root` y punto.
4. **No borres tokens existentes ni les cambies el nombre.** Si necesitas uno nuevo, agrégalo.

### ✅ Verificación de cierre — Etapa 2

- [ ] `tokens.css` tiene las tres capas separadas y comentadas
- [ ] Todos los tokens semánticos están definidos en claro **y** en oscuro
- [ ] Ningún componente menciona un hexadecimal ni una primitiva `--brand-*` / `--neutral-*`
- [ ] Los tokens de espaciado y layout siguen intactos
- [ ] Cambiando `data-theme` a mano en el inspector, la app entera cambia de tema

---

## ETAPA 3 — Modo claro / oscuro

Este es el requisito nuevo. Y no es decorativo: **es funcional para el trabajo real de los instaladores.**

Ellos usan esta app en dos escenarios opuestos: **de día, a pleno sol**, donde el modo claro con alto contraste se lee mucho mejor; y **de noche o dentro de una bodega**, donde una pantalla blanca al 100% de brillo te deja ciego y consume más batería. Poder cambiar entre los dos es una ventaja operativa concreta, y es un buen detalle para enseñarle al cliente.

### 3.1 · Los tres estados

El selector tiene **tres** opciones, no dos:

| Estado | Comportamiento |
|---|---|
| `light` | Fuerza tema claro |
| `dark` | Fuerza tema oscuro |
| `system` | Sigue la preferencia del sistema operativo vía `prefers-color-scheme` |

**El valor por defecto es `system`.** Un usuario que ya tiene su celular en modo oscuro debe abrir la app y verla oscura, sin configurar nada.

### 3.2 · Implementación

- El tema se aplica con un atributo en el elemento raíz: `document.documentElement.setAttribute('data-theme', 'dark')`.
- En modo `system`, **no** se estampa el atributo; el CSS resuelve con `@media (prefers-color-scheme: dark)`. Estructura el CSS para que el `[data-theme]` explícito **gane** sobre la media query en ambos sentidos.
- Escucha los cambios de `prefers-color-scheme` en vivo: si el usuario está en `system` y su celular cambia a oscuro al anochecer, la app debe seguirlo sin recargar.

### 3.3 · Persistencia y el problema del parpadeo

La preferencia se guarda en **`localStorage`**.

**Cuidado con esto:** si aplicas el tema desde React, la app pinta primero en claro y después salta a oscuro. Ese destello blanco de medio segundo se ve barato y es justo lo que arruina la sensación de "producto terminado".

**Solución:** un script inline pequeño en `index.html`, **dentro del `<head>` y antes de que cargue el bundle**, que lea `localStorage` y estampe `data-theme` antes del primer pintado. Envuélvelo en `try/catch`: en navegación privada `localStorage` puede lanzar excepción, y si eso tumba el script la app entera se queda en blanco.

### 3.4 · La barra de estado del celular

Esto se olvida siempre y se nota muchísimo en una PWA instalada.

- El `<meta name="theme-color">` de `index.html` está hoy fijo en `#111111`. **Debe actualizarse al cambiar de tema**, porque es el color de la barra de estado del sistema cuando la app corre en `standalone`.
- Declara las dos variantes con `media="(prefers-color-scheme: light)"` y `media="(prefers-color-scheme: dark)"`, y además actualízalo por JavaScript cuando el usuario elija explícitamente.
- Si la barra de estado se queda oscura con la app en claro, se ve como un error de la aplicación.

### 3.5 · Dónde va el control

En el **header**, junto al indicador de conexión. Requisitos:

- `data-testid="theme-toggle"`
- Hitbox mínimo **48×48 px**
- **Nombre accesible obligatorio** (`aria-label`), y que diga el estado actual — no solo un icono mudo
- No debe empujar ni desalinear el logo, el botón `[DEMO]` ni el indicador de conexión

### 3.6 · Lo que NO debe pasar

- **El tema NO vive en el store `demo`.** Es una preferencia real del usuario que sobrevive a producción; el store `demo` se borra completo cuando conectemos la API. Ponlo en su propio slice o en el de sesión.
- **El tema NO afecta ninguna decisión de negocio.** `evaluateDeliveryGuard` no sabe ni debe saber qué tema está activo.
- **El tema NO altera el layout.** Cambian colores. No cambian tamaños, posiciones, espaciados ni qué elementos existen en el DOM.

### ✅ Verificación de cierre — Etapa 3

- [ ] Los tres estados funcionan: claro, oscuro y sistema
- [ ] Por defecto es `system` y respeta la preferencia del celular
- [ ] La preferencia persiste al cerrar y reabrir la app
- [ ] **No hay parpadeo** al cargar en modo oscuro
- [ ] `localStorage` bloqueado (navegación privada) **no rompe la app**
- [ ] El `theme-color` de la barra de estado cambia con el tema
- [ ] Cambiar de tema en vivo (ajustes del sistema) se refleja sin recargar, estando en `system`
- [ ] El control tiene `aria-label` y hitbox ≥48×48
- [ ] El tema no está en el store `demo`

---

## ETAPA 4 — Aplicar color a las pantallas

Ahora sí, el color entra a la interfaz. Y aquí está **la regla más delicada de toda la fase**.

### 4.1 · Las pantallas "Roja" y "Verde" — lee esto dos veces

Desde el Spec-Kit, las pantallas de bloqueo y autorización se llaman *"Alerta Roja"* y *"Alerta Verde"*. Hasta ahora eran nombres nada más, porque no tenías color. **Ya lo tienes, y ahora sí puedes usar rojo y verde de verdad.**

Pero:

> **El color se AGREGA como refuerzo. NUNCA sustituye a la redundancia estructural que ya construiste.**

La trama diagonal, el borde de 4 px, el borde doble, el icono `[LOCK]` / `[CHECK]` y las etiquetas en mayúsculas **se quedan todos**. No quites ni una sola de esas señales porque "ya se entiende con el color".

**Por qué esto no es negociable:** alrededor del **8% de los hombres** tiene alguna deficiencia en la percepción del color, y la confusión más común es exactamente **rojo–verde**. Los dos instaladores de esta imprenta son hombres. Si uno de ellos no distingue bien esos tonos y la única señal fuera el color, entregaría material sin cobrar — que es literalmente el problema que esta app existe para resolver.

Y aparte del daltonismo: a pleno sol, con la pantalla al máximo y reflejos, un fondo rojo y uno verde se parecen muchísimo más de lo que se parecen en tu monitor.

**Prueba de fuego, igual que en la Fase 1:** pon la pantalla en escala de grises (los ajustes de accesibilidad de Android traen esa opción). Si sigues distinguiendo bloqueo de autorización sin dudar, está bien hecho.

### 4.2 · Qué debe recibir color

Recorre las pantallas una por una y decide conscientemente cada superficie:

| Pantalla | Qué colorear |
|---|---|
| **Login** | Fondo, campos, botón principal, bloque `[MODO DEMO]` |
| **Escáner** | Header, marco de cámara, retícula, botón de linterna, botón Validar, overlay offline |
| **Bloqueo** | Rojo de marca como refuerzo, sobre la trama y el borde de 4 px que ya existen |
| **Autorización** | Verde de marca como refuerzo, sobre el borde doble que ya existe |
| **Validación no disponible / No entregable** | Un tratamiento **neutro y distinto** de los dos anteriores. Que no se confunda con autorización |
| **Mi Ruta** | Tarjetas, semáforo (vencido / mañana / en tiempo), filtros, botón Actualizar |
| **Globales** | Banner offline, toast de actualización, modal de sesión vencida, ErrorBoundary, navegación inferior |
| **`/demo`** | También se colorea. Se la vamos a enseñar al cliente; no puede verse como una pantalla de depuración abandonada |

**No dejes ninguna pantalla en gris por olvido.** Un gris de la Fase 1 que sobrevive se lee como un bug frente al dueño.

### 4.3 · Contraste — verificado, no estimado

Cada combinación de texto y fondo, **en los dos temas**, debe cumplir WCAG AA:

- **4.5:1** para texto normal
- **3:1** para texto grande (≥24 px, o ≥19 px en negrita) y para bordes de controles

Documenta las mediciones críticas: el saldo pendiente, las etiquetas de la pantalla de bloqueo (que hoy fallan, ver Etapa 0.3), el botón de confirmar entrega, el semáforo de Mi Ruta y el texto del banner offline.

**Mídelo con herramienta.** El modo oscuro es donde más se falla: un texto gris que se ve bien sobre blanco casi siempre se vuelve ilegible sobre negro.

### 4.4 · El botón de confirmar entrega

Es el control más importante de la aplicación. Con color debe verse **inequívocamente accionable y distinto de todo lo demás**. Conserva sus 60 px de hitbox y sus 64 px de alto visual, y asegúrate de que sus estados `Disabled` y `Loading` sigan siendo claramente distinguibles del estado normal en ambos temas.

### ✅ Verificación de cierre — Etapa 4

- [ ] Las 5 pantallas + `/demo` + los globales tienen color, en los dos temas
- [ ] **La redundancia estructural sigue intacta**: trama, bordes, iconos y etiquetas
- [ ] Con la pantalla en escala de grises se sigue distinguiendo bloqueo de autorización
- [ ] Contraste AA verificado y documentado en los dos temas
- [ ] Los paneles de "validación no disponible" y "no entregable" no se confunden con autorización
- [ ] No queda ninguna pantalla ni estado en gris de la Fase 1

---

## ETAPA 5 — Logos, iconos y PWA instalable

Esta etapa es la que más impacta la percepción de "producto terminado", porque es lo que el dueño ve **antes de abrir la app**.

### 5.1 · El logo dentro de la app

- Sustituye el placeholder `[LOGO]` del header por el logotipo real. **SVG de preferencia**: escala perfecto y pesa nada.
- El logo debe verse bien en **los dos temas**. Si el logo es oscuro y el tema oscuro lo traga, necesitas una variante clara. Resuélvelo con `currentColor`, con dos archivos, o con un filtro — pero resuélvelo.
- Conserva su `data-testid` y su texto alternativo.
- En la pantalla de login, el logo es el elemento de marca principal. Dale el espacio que merece.

### 5.2 · Iconos de la PWA

Hoy `public/manifest-icons/` tiene `icon-192.png` y `icon-512.png` como marcadores. Genera los reales:

- **192×192** y **512×512** con `purpose: "any"`
- **512×512 con `purpose: "maskable"`** — es un archivo aparte, con la marca dentro de la zona segura central (~80% del lienzo). Sin este, Android recorta el logo de formas impredecibles y se ve amateur.
- **`apple-touch-icon`** de 180×180 para iPhone
- **Favicon**

### 5.3 · Manifest

En `vite.config.ts`, los valores provisionales tienen que salir:

```ts
background_color: "#ffffff",   // ← provisional, reemplázalo
theme_color: "#111111",        // ← provisional, reemplázalo
```

- `theme_color` y `background_color` con los colores reales de la marca
- Revisa `name` y `short_name`: son el texto bajo el icono en la pantalla de inicio. `short_name` debe caber sin cortarse
- `description` con algo presentable

### 5.4 · La prueba que sí importa

**Instala la PWA en un celular real** desde el preview y verifica:

- El icono en la pantalla de inicio se ve nítido y no recortado
- La pantalla de arranque (splash) usa los colores correctos
- Abre en `standalone`, sin barra de direcciones
- La barra de estado tiene el color correcto en los dos temas
- El nombre bajo el icono se lee completo

Un emulador de navegador **no** te muestra esto. Tiene que ser un celular.

### ✅ Verificación de cierre — Etapa 5

- [ ] Cero placeholders `[LOGO]` en toda la app
- [ ] El logo se ve correctamente en tema claro y oscuro
- [ ] Iconos 192, 512, 512-maskable, apple-touch-icon y favicon generados
- [ ] `theme_color` y `background_color` con valores reales
- [ ] Instalada en un celular real: icono nítido, splash correcto, standalone, barra de estado bien

---

## ETAPA 6 — Tipografía y refinamiento visual

### 6.1 · Tipografía

1. Si la marca tiene una tipografía, úsala en títulos. Si no, quédate con `system-ui` — es rápida, legible y no es una mala decisión.
2. Si cargas una fuente: `font-display: swap`, **stack de respaldo real**, y solo los pesos que uses. Cada peso extra es peso de descarga en la red móvil de un instalador.
3. **Tokeniza la escala tipográfica** (`--text-h1`, `--text-body`, `--text-small`) en lugar de tamaños sueltos por componente.
4. **El saldo pendiente y el estado de autorización no bajan de tamaño.** Son los datos que se leen a un brazo de distancia y con prisa.

### 6.2 · Refinamiento

1. **Radios de esquina:** decide uno y tokenízalo (`--radius-sm`, `--radius-md`). Un solo sistema para toda la app.
2. **Elevación:** tokeniza las sombras. En tema oscuro las sombras casi no se ven — ahí la jerarquía se comunica con diferencias de superficie (`--surface-1` sobre `--surface-0`), no con sombra. Es un error clásico: no lo cometas.
3. **Transiciones:** 150–250 ms, solo en interacción y en el cambio de tema. **Nada de animaciones de entrada ni de scroll.**
4. **Respeta `prefers-reduced-motion`.**
5. **La transición entre temas debe ser suave**, pero sin animar el layout: solo colores.

### ✅ Verificación de cierre — Etapa 6

- [ ] Escala tipográfica tokenizada; con la fuente bloqueada la app sigue legible
- [ ] Radios y sombras tokenizados, con un solo criterio
- [ ] En tema oscuro la jerarquía se lee sin depender de sombras
- [ ] Transiciones ≤250 ms y `prefers-reduced-motion` respetado
- [ ] El cambio de tema no provoca saltos de layout

---

## ETAPA 7 — QA final y preparación para la presentación

**Esta etapa decide si se le enseña al cliente o no. No se recorta.**

### 7.1 · Matriz de estados × temas

Vuelve a recorrer **las 27 filas de la matriz de la Fase 1.5**, ahora **en los dos temas**. Entrégame la tabla marcada con dos columnas: claro y oscuro.

No es opcional y no es burocracia: es donde vas a encontrar el texto que quedó ilegible en oscuro, el borde que desapareció y el icono que se perdió contra el fondo.

### 7.2 · Anchos

Verifica **320, 360, 390 y 430 px** en portrait, en ambos temas. Ningún desbordamiento, ningún texto cortado, ningún control fuera de alcance del pulgar.

### 7.3 · Accesibilidad

- Contraste AA verificado en toda la app, en los dos temas
- Todos los controles con nombre accesible (incluido el nuevo `theme-toggle` y el `button-refresh` de la Etapa 0)
- El significado nunca depende solo del color
- Hitbox de confirmar entrega ≥60×60

### 7.4 · Lo que no puede haberse roto

- [ ] `evaluateDeliveryGuard` **sin modificar** — lo voy a comparar contra el bundle
- [ ] Las 3 pruebas negativas de Vitest siguen pasando
- [ ] `delivery-confirm` sigue sin instanciarse bajo cualquier `DENY`, en ambos temas
- [ ] "Mi Ruta" sigue sin un solo signo de pesos
- [ ] El modo demo sigue en el build de producción
- [ ] Los `data-testid` siguen todos presentes

### 7.5 · Auditoría final de código

Revisa tu repositorio como si fueras yo:

- [ ] Ningún hexadecimal ni `rgb()` fuera de la capa de primitivas de `tokens.css`
- [ ] Ningún token semántico definido en un solo tema
- [ ] Ningún `console.log` ni `TODO` sin resolver
- [ ] Ningún componente muerto ni import sin usar
- [ ] `npm run build` y `npm test` sin errores ni warnings

**Si encuentras algo que no quedó como se esperaba, corrígelo ahora.** No lo entregues con una nota de "pendiente".

### 7.6 · Preparar la demostración

Esto se le va a enseñar al dueño de la imprenta. Prepáralo:

- **Deploy en preview público** con URL compartible
- **Pruébalo en un celular real**, instalado como PWA. Los emuladores mienten sobre la safe area, la barra de estado y el teclado
- **Deja el modo demo en un estado limpio de arranque**: sin interruptores activados de una sesión anterior
- **Recorre tú mismo el flujo completo** como si fueras el dueño: entro → escaneo un pedido con deuda → veo que la app me lo impide → escaneo uno liquidado → confirmo la entrega. Ese es el recorrido que vende el proyecto. Que no tenga ni un tropiezo
- Ten a la mano el cambio de tema para mostrarlo: es un detalle que impresiona y se explica solo

### ✅ Verificación de cierre — Etapa 7

- [ ] Matriz de 27 filas × 2 temas, entregada y marcada
- [ ] 4 anchos verificados en ambos temas
- [ ] Accesibilidad y contraste completos
- [ ] Nada de la Fase 1/1.5 se rompió
- [ ] Auditoría de código limpia
- [ ] Preview desplegado, instalado y probado en un celular real
- [ ] Recorriste el flujo de demostración de punta a punta sin tropiezos

---

## 3. Lo que NO se toca en esta fase

1. `evaluateDeliveryGuard` y toda la lógica de autorización
2. El contrato de datos en `src/data/contracts.ts`
3. El grid de 8 puntos, las alturas de header y navegación, y el hitbox de 60 px
4. La estructura y el flujo de las 5 pantallas
5. El modo demo y sus interruptores
6. Los `data-testid`
7. La ausencia de backend: cero `fetch`, cero Supabase, cero cámara real
8. La redundancia estructural que comunica criticidad sin color

---

## 4. Cómo entregar

En el Pull Request incluye:

1. La URL del preview desplegado
2. `docs/identidad-visual.md` con la paleta y su origen
3. La matriz de 27 filas × 2 temas, marcada
4. Capturas de las 5 pantallas en ambos temas
5. Una foto o captura de la PWA instalada en un celular real
6. La lista de verificación de cierre de cada etapa
7. Cualquier decisión visual que se desvíe de lo que dice este documento, con su razón

Dudas de **marca, logotipo, colores oficiales o fotos** → Andri.
Dudas de **arquitectura, alcance, contratos o reglas de negocio** → Isaías.

---

## 5. Contexto para tu asistente de IA

Agrega esta sección a tu `AGENTS.md`:

```markdown
## Fase 2 — Correcciones + identidad visual, logos y modo claro/oscuro

El prototipo se le presenta al dueño de la imprenta como avance del proyecto.
Debe verse como una aplicación terminada y profesional, aunque por dentro siga
usando datos simulados.

## ORDEN OBLIGATORIO
Primero el Apartado A (correcciones de la auditoría de Fase 1.5), después el
Apartado B (color, logos, imágenes y temas). No empezar con color sin haber
cerrado y verificado el Apartado A.

Correcciones del Apartado A, resumidas:
- /demo debe ser una ruta PÚBLICA (hoy está tras <Protected> y deja la app
  bloqueada si se activa "sin conexión" y se cierra sesión).
- DeliveryResultScreen necesita un temporizador que re-evalúe el guard cada ~5s,
  para que la ventana de lectura viva de 60s se aplique realmente con el tiempo.
  NO modificar evaluateDeliveryGuard: la función está bien.
- El modo demo debe quedar borrable en un commit: invertir la dependencia para
  que demo ESCRIBA en los stores de producción, en lugar de que session.ts,
  AppShell, SessionExpiredModal y ScannerScreen LEAN del store de demo.
- ConfirmDeliveryResult necesita un campo `code` legible por máquina. Prohibido
  ramificar con res.reason.includes("texto en español").
- NETWORK_ERROR no puede mostrarse como "Código QR no reconocido": necesita su
  propio mensaje, en ScannerScreen y en DeliveryResultScreen.
- Contraste ≥4.5:1 en las etiquetas de la pantalla de bloqueo (hoy 2.45:1 sobre
  la trama diagonal).
- button-refresh necesita aria-label.
- Agregar pruebas positivas del candado: F1 renderiza el botón, F5 no, y una
  lectura vencida tampoco.
- npm test debe salir limpio, sin warnings de act().
- tsconfig.tsbuildinfo va a .gitignore.

## LA ESTRUCTURA Y LA LÓGICA NO SE TOCAN
No modificar: evaluateDeliveryGuard, src/data/contracts.ts, el grid de 8 puntos,
las alturas de header y navegación, el hitbox de 60px del botón de entrega, el
flujo de las 5 pantallas, el modo demo ni los data-testid.
Si una decisión visual exige cambiar algo de eso, detenerse y preguntar.

## Reglas duras

### Tokens
1. tokens.css tiene TRES capas: primitivas (--brand-*, --neutral-*, --danger-*,
   --success-*), semánticas definidas por tema, y componentes que solo usan
   semánticas.
2. Prohibido un hexadecimal, rgb() o una primitiva dentro de un componente.
3. TODO token semántico debe existir en tema claro Y en tema oscuro.
4. Los tokens de espaciado, layout e hitbox no cambian entre temas.
5. No borrar ni renombrar tokens existentes.

### Temas
6. Tres estados: light, dark y system. Por defecto system.
7. El tema se aplica con data-theme en el elemento raíz. En system no se estampa
   el atributo y resuelve @media (prefers-color-scheme).
8. La preferencia se guarda en localStorage, leída por un script inline en el
   <head> ANTES del primer pintado, para evitar el parpadeo. Envuelto en try/catch:
   localStorage puede lanzar excepción en navegación privada.
9. El <meta name="theme-color"> se actualiza con el tema (es la barra de estado
   del sistema en una PWA standalone).
10. El tema NO vive en el store demo. No afecta ninguna decisión de negocio.
    No altera el layout: cambian colores, no tamaños ni posiciones.

### Color y criticidad
11. El color se AGREGA como refuerzo. NUNCA sustituye la redundancia estructural.
    La trama diagonal, los bordes de 4px, el borde doble, los iconos y las
    etiquetas en mayúsculas se conservan todos.
12. Razón: ~8% de los hombres confunde rojo y verde, y los dos instaladores son
    hombres. Además, a pleno sol el rojo y el verde se parecen mucho.
    Prueba: en escala de grises se debe seguir distinguiendo bloqueo de autorización.
13. Contraste WCAG AA en AMBOS temas: 4.5:1 texto normal, 3:1 texto grande y
    bordes de control. Medido con herramienta, nunca estimado.
14. En tema oscuro la jerarquía se comunica con diferencias de superficie, no con
    sombras.

### Assets
15. Los colores, logos e imágenes salen de la fuente que indicó Isaías. Se
    descargan al repositorio: prohibido enlazar, embeber o cargar nada desde
    Facebook, y prohibido incluir sus scripts o píxeles de seguimiento.
16. El logo debe funcionar en los dos temas.
17. La PWA necesita iconos 192, 512, 512-maskable (marca dentro del 80% central),
    apple-touch-icon 180 y favicon. theme_color y background_color reales.

### Alcance
18. Sigue sin backend: cero fetch, cero Supabase, cero cámara real.
19. El modo demo debe seguir presente en el build de producción y también se colorea.

### Verificación
20. Al terminar cada etapa: abrir la app en el celular, recorrerla EN LOS DOS TEMAS
    y confirmar que hace lo que debía. Si algo quedó mal, incompleto o inesperado,
    corregirlo en ese momento.
21. Antes de entregar: recorrer las 27 filas de la matriz de la Fase 1.5 en ambos
    temas, y verificar que las 3 pruebas negativas del candado siguen pasando.
```

---

## 6. Resumen de la secuencia

Las etapas son **secuenciales**. No arranques una sin haber marcado la verificación de cierre de la anterior: cada una se apoya en la anterior, y saltártelas te obliga a rehacer trabajo.

### Apartado A — primero, sin excepción

| Orden | Bloque | Resultado esperado |
|---:|---|---|
| 1 | **A.1 – A.2** (altos) | Sin bloqueo sin salida; la ventana de 60 s se aplica de verdad |
| 2 | **A.3 – A.5** (medios de arquitectura) | Demo aislado y borrable; error por `code`, no por texto; fallo de red con su propio mensaje |
| 3 | **A.6 – A.7** (medios de calidad) | Contraste ≥4.5:1 en el bloqueo; `button-refresh` con nombre accesible |
| 4 | **A.8 – A.10** (bajos) | Pruebas positivas del candado; `npm test` limpio; `.gitignore` al día |
| 5 | **A.11** (opcional) | M-01, M-02 y M-03 — avísame si las mueves a integración |

### Apartado B — Fase Visual

| Orden | Etapa | Resultado esperado |
|---:|---|---|
| 6 | **1 — Extracción de identidad** | Paleta y assets documentados en `docs/identidad-visual.md` |
| 7 | **2 — Tokens en tres capas** | `tokens.css` reestructurado, tema conmutable por atributo |
| 8 | **3 — Modo claro/oscuro** | Tres estados, sin parpadeo, barra de estado correcta |
| 9 | **4 — Color en las pantallas** | Todo coloreado, redundancia intacta, contraste AA en ambos temas |
| 10 | **5 — Logos e iconos PWA** | Cero placeholders, instalable con icono nítido |
| 11 | **6 — Tipografía y refinamiento** | Escala, radios y elevación tokenizados |
| 12 | **7 — QA final** | Matriz 27×2 temas, celular real, preview listo para el cliente |

**Dos puntos de control obligatorios conmigo:**

1. **Al cerrar el Apartado A.** Avísame y lo reviso antes de que empieces con el color. Es rápido y evita que arrastres algo.
2. **Al terminar la Etapa 3.** No sigas a la Etapa 5 sin que yo vea la paleta aplicada y el cambio de tema funcionando: si algo de la identidad hay que ajustar, prefiero decírtelo antes de que generes todos los iconos de la PWA.

El plazo de entrega te lo doy por separado.

---

## 7. Nota final

Tu Fase 1.5 quedó bien. Corrí el prototipo completo y lo verifiqué: el candado funciona correctamente en los cinco escenarios, el modo demo sobrevive al build de producción —que era el error de la entrega anterior—, "Mi Ruta" ya no pierde pedidos sin fecha, y no hay un solo color literal fuera de `tokens.css`. La base está sólida, y por eso esta fase se trata de vestirla, no de rehacerla.

Lo que viene ahora es distinto de lo que has hecho hasta hoy: **hasta aquí construiste para que funcionara; ahora construyes para que convenza.** El dueño de la imprenta no va a leer tu `deliveryGuard`. Va a ver una pantalla y decidir si esto se ve como algo por lo que vale la pena pagar.

Que se vea como un producto terminado.
