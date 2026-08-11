# Asignación Fase 1 — EMIR · App Móvil del Instalador (Maquetado UI/UX sin color)

| Campo | Detalle |
|---|---|
| Proyecto | **PrintFlow AI** — Imprenta Escalante |
| Módulo | Fase 4 del SRS — PWA móvil para los auxiliares de instalación |
| Responsable | **Emir** — Full Stack |
| Aprueba | **Isaías** — Líder Técnico |
| Repositorio | `printflow-app` |
| Duración | **Máximo 5 días hábiles** |
| Entregable | Las 5 pantallas maquetadas, navegables, **en escala de grises**, con datos falsos, desplegadas en preview |
| Documentos fuente | `Wireframe Spec-Kit - Etapa 1 - PrintFlow AI - V2 Final.md` §1 y §2 · `Arquitectura y Documentacion SRS` Fase 4 · `Brief de Prototipado UI_UX` §1 |

---

## 1. Contexto del proyecto (léelo completo, es lo que tu IA necesita saber)

**Imprenta Escalante** es una imprenta y centro de diseño publicitario: lonas, viniles, papelería comercial y promocionales. El dueño hace todo (vende, cotiza, diseña, opera máquinas, cobra) y tiene **2 trabajadores** cuyo trabajo principal es salir del taller a instalar espectaculares, rotular vehículos y montar lonas.

**El problema que resuelve tu módulo — léelo bien, define todo tu diseño:**

Hoy se entregan pedidos a clientes que **todavía deben dinero**. Pasa porque el dueño está saturado y no verifica si el cliente ya transfirió antes de autorizar la salida del material, y porque el instalador en la calle no tiene forma de saber el saldo. Entre el **5% y el 8% de las ventas anuales** se queda en cartera vencida por esto.

**Tu app es el candado.** Es una PWA que usan los 2 instaladores en su propio celular. Escanean el código QR de la nota de remisión y la app les responde una de dos cosas:

- **Saldo mayor a $0 → PANTALLA DE BLOQUEO.** El botón de "entregar" **no existe**. No está deshabilitado: no está en el DOM.
- **Saldo exactamente $0 → PANTALLA DE AUTORIZACIÓN.** Aparece un botón grande de "Confirmar entrega física".

**PrintFlow AI** completo tiene 4 piezas:

1. **Landing Page pública** (Faride) — capta y manda al chatbot
2. **Chatbot de IA en WhatsApp** (N8N + LLM) — cotiza en menos de 5 segundos
3. **Panel Administrativo POS** (Isaías) — el dueño gestiona pedidos, cobros y fechas
4. **App móvil PWA del instalador** ← *esto es lo tuyo*

---

## 2. Reparto del equipo

| Persona | Responsabilidad |
|---|---|
| **Isaías** | Líder técnico. Planeación, Panel Administrativo POS, **base de datos y API**. Aprueba tu entrega. |
| **Emir** | **App móvil PWA del instalador.** Más adelante, apoyo al POS. |
| **Faride** | Landing Page. |
| **Andri** | Analista de negocio / enlace con el cliente. |

**Regla:** dudas de *contrato de datos, API, permisos o reglas de negocio* → Isaías. Dudas de *operación real de los instaladores* → Andri.

**Sobre tu apoyo al Panel Administrativo:** eso arranca en **Fase 2**, cuando la API y el esquema de base de datos estén listos. En esta fase enfócate 100% en la app móvil. No abras el repo `printflow-admin`.

---

## 3. Alcance EXACTO de esta Fase 1

Estamos maquetando. La API todavía se está construyendo. Tu app va a consumir **datos falsos** a través de una capa que después se cambia por la API real **sin tocar ni una pantalla**.

### ✅ SÍ entra

- Las **5 pantallas** del §2 del Spec-Kit, navegables entre sí.
- Layout mobile portrait real, **frame rector 360×800** (QA en 320, 390 y 430 px de ancho).
- **Escala de grises únicamente.** Cero color.
- Datos falsos servidos por un módulo `mocks/` detrás de una interfaz tipada.
- Estados de cada componente: `Default`, `Disabled`, `Loading`, `Error`, `Empty`, `Offline`.
- **El render condicional del candado bien implementado desde el primer día** (ver §9). Esto no es opcional ni "se arregla después".
- Manifest de PWA e instalabilidad básica.
- Deploy a un preview público.

### ❌ NO entra (no lo hagas todavía)

- **Colores de marca**, tipografía de marca, iconos reales, ilustraciones, animaciones.
- **Cámara real / `html5-qrcode` / `getUserMedia`.** El visor de cámara es una **caja tramada placeholder**. La integración de hardware es Fase 2.
- **Supabase, autenticación real, `@supabase/supabase-js`, cualquier `fetch` a un servidor.** El login valida contra el mock.
- Service Worker con estrategias Workbox (`CacheFirst` / `NetworkOnly`), Realtime, notificaciones push.
- Vibración, linterna, permisos de hardware.
- Tests E2E con Playwright. (Sí escribe las pruebas negativas del candado con Vitest + Testing Library, ver §9.)

---

## 4. Stack tecnológico obligatorio

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | **React 18 + Vite** | Definido en el SRS Fase 4. |
| Lenguaje | **TypeScript** en modo `strict` | El dinero y los estados de autorización necesitan tipado estricto. No negociable. |
| Estilos | **Tailwind CSS** | Control fino del grid de 8 puntos. |
| Ruteo | **React Router v6** | |
| Estado | **Zustand** | Ligero, evita prop drilling. Definido en el SRS. |
| PWA | **vite-plugin-pwa** (solo manifest en esta fase) | Instalable en el celular. Las estrategias de caché son Fase 2. |
| Pruebas | **Vitest + @testing-library/react** | Solo para las pruebas negativas del candado. |
| Node | **Node 20 LTS** · gestor **npm** | |
| Hosting | **Cloudflare Pages** o **Vercel** (Free Tier) | Preview público para revisión. |

**Inicialización:**

```bash
npm create vite@latest printflow-app -- --template react-ts
```

```bash
cd printflow-app && npm install && npm i react-router-dom zustand && npm i -D tailwindcss @tailwindcss/vite vite-plugin-pwa vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Configuración de PWA mínima** en `vite.config.ts`:

```ts
VitePWA({
  registerType: 'prompt',
  manifest: {
    name: 'PrintFlow — Entregas',
    short_name: 'PrintFlow',
    display: 'standalone',
    orientation: 'portrait',   // obligatorio: el escáner no debe rotar
    background_color: '#ffffff',
    theme_color: '#111111',    // provisional; se cambia con la identidad visual
    icons: [/* placeholders monocromáticos */],
  },
})
```

---

## 5. Repositorio y forma de trabajo

- Repo: **`printflow-app`** (independiente).
- Rama principal `main`. **Nunca commits directos a `main`.**
- Ramas: `chore/setup`, `feat/login`, `feat/scanner`, `feat/delivery-guard`, `feat/mi-ruta`, `feat/globales`.
- Commits en español: `feat: pantalla de bloqueo con render condicional del candado`.
- **Pull Request a `main`** con Isaías como revisor.
- `.env` nunca se sube. `.gitignore` desde el commit inicial.

---

## 6. Sistema visual sin color

No estás eligiendo estética, estás construyendo estructura. Cuando llegue la identidad visual solo se cambian variables CSS.

### 6.1 Tokens — crea `src/styles/tokens.css`

```css
:root {
  --surface-0: #ffffff;   /* fondo */
  --surface-1: #f5f5f5;   /* tarjetas */
  --surface-2: #e0e0e0;   /* placeholders */
  --surface-3: #bdbdbd;   /* tramas */

  --ink-strong: #111111;
  --ink-base:   #333333;
  --ink-muted:  #757575;

  --border-hairline: #d4d4d4;
  --border-strong:   #111111;
}
```

**Regla dura:** ningún componente escribe un hex literal. Todo pasa por estas variables.

### 6.2 Grid móvil de 8 puntos

- Frame rector **360×800 portrait**. QA en 320, 390 y 430 px.
- **4 columnas**, márgenes 16 px, gutter 16 px.
- Barra superior **56 px**. Navegación inferior **64 px + `env(safe-area-inset-bottom)`**.
- Acciones primarias: ancho de columnas 1–4, alto visual mínimo **56 px**.
- **El botón de confirmar entrega: hitbox mínimo 60×60 px, alto visual 64 px.** Los instaladores lo usan con las manos sucias, bajo el sol, parados en una escalera.
- Todo espaciado es múltiplo de 8. Excepción: bordes de 1/2/4 px.

### 6.3 Semántica crítica **sin usar color**

Este es el punto que más se equivoca. Las pantallas se llaman "Roja" y "Verde" por trazabilidad histórica, pero **no llevan color**. La criticidad se comunica con redundancia estructural:

| Significado | Representación obligatoria |
|---|---|
| Bloqueado / vencido | Borde continuo negro **4 px** + trama diagonal de 8 px + etiqueta en mayúsculas `ENTREGA BLOQUEADA` / `VENCIDO` |
| Advertencia / vence mañana | Borde discontinuo **2 px** + etiqueta `VENCE MAÑANA` |
| Normal / en tiempo | Borde **1 px** gris medio + etiqueta `EN TIEMPO` |
| Autorizado | Borde doble **4 px** + icono `[CHECK]` + texto `AUTORIZADO` |
| Error | Borde negro 2 px + icono `[!]` + título explícito + acción de recuperación |

**Prueba de fuego:** si imprimes la pantalla en blanco y negro y no se entiende qué pasa, está mal.

### 6.4 Placeholders

| Elemento | Representación |
|---|---|
| Logo | `[LOGO PLACEHOLDER — NO ASSET REAL]`, máximo 40×40 px |
| Cámara | Caja 4:3 tramada con `[CAMERA FEED — NO IMAGE REAL]` |
| Iconos | `[QR]`, `[TORCH]`, `[LOCK]`, `[CHECK]`, `[SHOW]`, `[!]` |
| Cliente | `[CLIENTE DEMO 01]` |
| Dinero | `$500.00 [DATO DEMO]` |
| Producto | `[LONA 2×3 M — DEMO]` |
| Identificador | `[PAYLOAD_OPACO_DE_ORDEN]` — **nunca un UUID que parezca real** |

---

## 7. Estructura de carpetas

```
printflow-app/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx           # variantes + estados Disabled/Loading/Error
│   │   │   ├── Input.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── PlaceholderBox.tsx
│   │   │   └── StatusBadge.tsx      # semáforo estructural sin color
│   │   ├── layout/
│   │   │   ├── AppShell.tsx         # header 56px + bottom nav 64px
│   │   │   ├── ConnectionIndicator.tsx
│   │   │   └── BottomNav.tsx
│   │   └── feedback/
│   │       ├── ErrorBoundary.tsx
│   │       ├── OfflineBanner.tsx
│   │       └── UpdateToast.tsx
│   ├── features/
│   │   ├── auth/LoginScreen.tsx
│   │   ├── scanner/ScannerScreen.tsx
│   │   ├── delivery/
│   │   │   ├── DeliveryResultScreen.tsx     # decide qué panel montar
│   │   │   ├── BlockedDeliveryPanel.tsx     # "Alerta Roja"
│   │   │   ├── ClearancePanel.tsx           # "Alerta Verde"
│   │   │   ├── ValidationUnavailablePanel.tsx
│   │   │   └── deliveryGuard.ts             # ← la función más importante del repo
│   │   └── route/MyRouteScreen.tsx
│   ├── data/
│   │   ├── contracts.ts             # tipos DTO — NO los cambies sin Isaías
│   │   ├── gateway.ts               # interfaz que después implementa la API real
│   │   └── mocks/
│   │       ├── mockGateway.ts
│   │       └── fixtures.ts
│   ├── store/
│   │   └── session.ts               # Zustand: sesión y estado de conexión
│   ├── styles/
│   │   ├── tokens.css
│   │   └── global.css
│   ├── App.tsx
│   └── main.tsx
└── AGENTS.md
```

---

## 8. Contrato de datos (definido por Isaías — respétalo tal cual)

Crea `src/data/contracts.ts` con **exactamente** esto. Cuando la API esté lista, solo se cambia la implementación del gateway; ninguna pantalla se toca.

```ts
/** El dinero SIEMPRE viaja como string decimal de 2 posiciones ("0.00", "1250.50").
 *  Nunca como number: los floats binarios no sirven para decidir si alguien pagó. */
export type Money = string;

export type OrderStatus =
  | 'PENDING_DEPOSIT'
  | 'IN_PRODUCTION'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERED';

/** Resultado de escanear un QR. */
export type ScanOutcome =
  | { kind: 'FOUND'; order: ScannedOrderDTO }
  | { kind: 'NOT_FOUND' }
  | { kind: 'NETWORK_ERROR' }
  | { kind: 'INVALID_PAYLOAD' };

export interface ScannedOrderDTO {
  orderToken: string;        // token opaco, NUNCA el id real del pedido
  customerLabel: string;
  productLabel: string;
  status: OrderStatus;
  balanceDue: Money | null;  // null = indeterminado, NUNCA se interpreta como cero
}

/** Item de "Mi Ruta". Fíjate en lo que NO tiene: ningún campo de dinero. */
export interface RouteItemDTO {
  routeItemToken: string;
  productLabel: string;
  promisedDate: string;      // ISO 8601
}

export interface SessionDTO {
  userToken: string;
  fullName: string;
  role: 'INSTALLER' | 'ADMIN';
  sessionStartedAt: string;      // ISO 8601
  absoluteDeadline: string;      // sessionStartedAt + 12 horas. No es renovable.
}
```

Y `src/data/gateway.ts`:

```ts
export interface PrintflowGateway {
  signIn(email: string, password: string): Promise<SessionDTO>;
  scanOrder(payload: string): Promise<ScanOutcome>;
  confirmDelivery(orderToken: string): Promise<{ ok: true; deliveredAt: string } | { ok: false; reason: string }>;
  getMyRoute(filter: 'today' | 'upcoming'): Promise<RouteItemDTO[]>;
}
```

**Fixtures obligatorios** (necesitas poder llegar a todos los estados desde la UI):

| Caso de prueba | `status` | `balanceDue` | Pantalla esperada |
|---|---|---|---|
| Liquidado y listo | `READY_FOR_DELIVERY` | `"0.00"` | Autorización |
| Con deuda | `READY_FOR_DELIVERY` | `"1250.50"` | Bloqueo |
| Saldo desconocido | `READY_FOR_DELIVERY` | `null` | Validación no disponible |
| Sobrepago (inconsistencia) | `READY_FOR_DELIVERY` | `"-100.00"` | Validación no disponible |
| Aún en producción | `IN_PRODUCTION` | `"0.00"` | Estado no entregable |
| Ya entregado | `DELIVERED` | `"0.00"` | Estado no entregable |
| QR desconocido | — | — | `Código QR no reconocido` |

Agrega en la pantalla del escáner un panel de desarrollo (visible solo con `import.meta.env.DEV`) con un botón por cada fixture. Así puedes navegar a cada estado sin cámara y tu revisión es demostrable.

---

## 9. La regla más importante de todo tu módulo: el candado

Esta parte no admite atajos ni "luego lo arreglo". Es la razón de existir de la app.

### 9.1 La función de decisión

Crea `src/features/delivery/deliveryGuard.ts`:

```ts
export type GuardDecision = 'ALLOW' | 'DENY_DEBT' | 'DENY_INDETERMINATE' | 'DENY_NOT_DELIVERABLE';

export function evaluateDeliveryGuard(input: {
  session: SessionDTO | null;
  isOnline: boolean;
  order: ScannedOrderDTO | null;
  readAt: number;          // timestamp de la lectura
  now: number;
}): GuardDecision {
  // ALLOW requiere que TODO sea verdadero a la vez.
  // Cualquier otra combinación es DENY. El valor por defecto es DENY, siempre.
}
```

**`ALLOW` solo existe si se cumplen simultáneamente:**

1. Sesión válida, rol `INSTALLER`, dentro de las 12 horas absolutas.
2. Hay conexión.
3. La lectura es **viva** (no cacheada, no obsoleta).
4. `status === 'READY_FOR_DELIVERY'`.
5. `balanceDue === "0.00"` **exacto**.

**Todo lo demás es `DENY`.** `null`, `NaN`, negativo, ausencia de fila, error de parseo, timeout, offline, respuesta vieja → **`DENY_INDETERMINATE`**. Un saldo desconocido **nunca** se interpreta como liquidado.

### 9.2 Restricción absoluta del DOM

```
switch (decision) {
  case 'ALLOW':                 montar ClearancePanel con DeliveryConfirmButton
  case 'DENY_DEBT':             montar BlockedDeliveryPanel        — botón NO instanciado
  case 'DENY_INDETERMINATE':    montar ValidationUnavailablePanel  — botón NO instanciado
  case 'DENY_NOT_DELIVERABLE':  montar NotDeliverablePanel         — botón NO instanciado
}
```

**Está prohibido:** construir el botón y luego ocultarlo, `visibility: hidden`, `display: none` sobre un nodo montado, `opacity: 0`, `aria-hidden`, sacarlo del viewport con coordenadas, `pointer-events: none`, o poner un botón `disabled` como sustituto del candado.

Bajo `DENY_*`, **el componente, su listener y la referencia a la mutación no forman parte del árbol renderizado.** Un empleado no debe poder forzar la entrega editando el HTML desde las herramientas de desarrollo del navegador.

> Cuando conectemos la API real, PostgreSQL tiene además un trigger que rechaza cualquier intento de marcar como entregado un pedido con saldo. Tu candado en la UI es la primera barrera, no la única — pero tiene que estar bien hecho.

### 9.3 Pruebas negativas obligatorias (Vitest)

Estas 3 pruebas son un **entregable de la fase**, no opcionales:

```ts
// 1. Con deuda, el botón no existe
expect(screen.queryByRole('button', { name: /confirmar entrega/i })).toBeNull();

// 2. Con deuda, el testid no existe
expect(screen.queryByTestId('delivery-confirm')).toBeNull();

// 3. Con saldo null, tampoco existe
expect(screen.queryByTestId('delivery-confirm')).toBeNull();
```

---

## 10. Las 5 pantallas

> Todo control interactivo lleva `data-testid` estable.

### 10.1 Login — `/login`

- Header informativo 56 px con `[LOGO PLACEHOLDER]` de máximo 40×40.
- Bloque de autenticación en columnas 1–4, inicia a **96 px del borde superior**, padding 16 px, separación vertical 16 px.
- `Input/Email` (label "Correo", teclado email) y `Input/Password` (label "Contraseña", con botón `[SHOW]`), ancho completo, **alto 56 px**.
- `Button/Login` ancho completo, alto 56 px. Habilitado solo con ambos campos sintácticamente válidos.
- **Texto obligatorio bajo el submit:** *"La sesión caduca 12 horas después de iniciar sesión"*.
- **No existe botón de "Extender sesión".** No lo dibujes.
- Errores: **nunca reveles cuál dato falló** ni si la cuenta existe. Un solo mensaje general.
- Sin red: el shell carga, el formulario muestra *"Se requiere conexión para iniciar sesión"* y el submit queda disabled.
- Doble tap debe producir **una sola** llamada.

### 10.2 Escáner — `/escanear`

- Header 56 px: título "Escanear entrega" + `Button/CloseScanner`.
- **Camera viewport:** columnas 1–4, relación **4:3**, mínimo **288 px de alto** en frame 360. Caja tramada con `[CAMERA FEED — NO IMAGE REAL]`.
- **Retícula de lectura:** cuadrado centrado de **224×224 px**, cuatro esquinas de 24 px con grosor 4 px.
- Texto de ayuda 16 px debajo de la cámara: *"Escanee el código de la remisión"*.
- Controles `Button/Torch` y `Button/CameraPermission`, cada uno ≥48×48 px, **sin superponerse al área de cámara**.
  - **`Torch` solo se renderiza si el hardware lo soporta.** En esta fase, como no hay hardware, déjalo detrás de una constante `SUPPORTS_TORCH = false` y documenta que en Fase 2 sale de `track.getCapabilities().torch`. Cuando es `false`: **no se renderiza**, no se deshabilita.
- **Overlay offline:** capa opaca sobre la cámara con el texto exacto: *"Sin conexión. Muévase a un área con cobertura para validar la entrega"*. Bajo este estado **no existe ningún control de entrega**.
- QR no reconocido: *"Código QR no reconocido"* + acción "Escanear de nuevo".
- Panel de desarrollo con los 7 fixtures del §8.

### 10.3 Bloqueo de entrega — "Alerta Roja"

- Contenedor columnas 1–4, **borde continuo negro 4 px + trama diagonal de 8 px**, encabezado `[LOCK] ENTREGA BLOQUEADA`.
- Bloque central de saldo, **alto mínimo 96 px**, con label persistente y el valor completo en tipografía grande. Nunca truncar el saldo.
- Datos visibles: cliente, producto, saldo pendiente.
- Mensaje exacto: *"El sistema impide la entrega. Solicite la liquidación y la aprobación del cobro por el administrador."*
- Acciones: `Button/ScanAnother` ("Volver a escanear") y, solo si hay conexión, `Button/RevalidateBalance` ("Revalidar saldo").
- **No existe acceso a registrar pagos.** El instalador no cobra. Nunca.
- `DeliveryConfirmButton`: **NO RENDER** en todos sus estados.

### 10.4 Autorización de entrega — "Alerta Verde"

- Contenedor columnas 1–4, **borde doble 4 px**, icono `[CHECK]`, título `AUTORIZADO PARA ENTREGA`.
- Mensaje: *"PAGO CONFIRMADO. Saldo: $0.00"*.
- `Button/DeliveryConfirm` — "Confirmar entrega física", columnas 1–4, **alto visual 64 px, hitbox ≥60×60 px**, separación inferior 24 px + safe area. `data-testid="delivery-confirm"`.
- **No se muestra** bitácora de pagos, método de pago, total ni precio unitario.
- Estados:
  - **Loading:** disabled *inmediato* + spinner + "Confirmando entrega…". Una sola mutación. **Nada de éxito optimista.**
  - **Error:** la orden queda sin confirmar, causa genérica, se reconsulta el estado y solo se rehabilita si vuelve a `ALLOW`.
  - **Success:** el botón se **sustituye** por un panel estático "Entrega registrada" + timestamp, y acción "Escanear otro".
- Si otra sesión ya entregó la orden: *"La entrega ya había sido registrada"*. No reintentar.

### 10.5 Mi Ruta — `/mi-ruta`

- Header: título "Mi Ruta", fecha del día e indicador de conexión.
- Filtros permitidos: **`Hoy`** y **`Próximas`**. Ningún filtro financiero.
- Lista de una sola columna. Tarjeta: columnas 1–4, padding 16 px, separación 16 px.
- **Contenido visible exacto: producto y fecha pactada. Nada más.**
- **PROHIBIDO en esta pantalla:** total, saldo, abonos, método de pago, **cualquier signo de pesos**. Es política de confidencialidad: los instaladores no ven el dinero de la imprenta. Tampoco los pidas en el DTO ni los guardes en memoria.
- Orden: `promisedDate` ascendente.
- Semáforo **estructural** (§6.3): hoy/vencido → borde 4 px + trama + `VENCE HOY`/`VENCIDO`; mañana → borde discontinuo 2 px + `VENCE MAÑANA`; después → borde 1 px + `EN TIEMPO`.
- Estados: **Loading** (3 skeleton cards, nunca valores falsos) · **Empty** (`[EMPTY] No hay instalaciones listas para entrega` + "Actualizar") · **Offline** (*"Sin conexión. La ruta no puede actualizarse"*, sin mostrar datos cacheados) · **Error** (`[!] No pudimos cargar Mi Ruta` + "Reintentar") · **Fecha nula** → tarjeta va a "Datos incompletos", **no se inventa una fecha**.

### 10.6 Componentes globales

- **`OfflineBanner`:** banner superior con `SIN CONEXIÓN`. El header lleva permanentemente el indicador `EN LÍNEA / SIN CONEXIÓN`.
- **`UpdateToast`:** banner inferior *"Actualización crítica requerida. Presione aquí para reiniciar"*.
- **`ErrorBoundary` global:** *"Ocurrió un error. Reinicie la aplicación e informe a Sistemas"* + botón de recarga forzada. Nunca una pantalla en blanco.
- **`BottomNav`** de dos destinos: `Escanear` y `Mi Ruta`, 64 px + safe area.
- **El header persistente nunca muestra nombre de cliente ni saldo.**

---

## 11. Criterios de aceptación (Isaías revisa exactamente esto)

- [ ] Las 5 pantallas existen y se navega entre ellas.
- [ ] Ningún color fuera de `tokens.css`. Búsqueda de hex literales en componentes = 0 resultados.
- [ ] Todo espaciado es múltiplo de 8 (salvo bordes 1/2/4 px).
- [ ] El botón de confirmar entrega mide ≥60×60 px de hitbox y 64 px de alto visual.
- [ ] **Con `balanceDue = "1250.50"`, `null` o `"-100.00"`, `queryByTestId('delivery-confirm')` devuelve `null`.** Las 3 pruebas de Vitest pasan.
- [ ] Se puede inspeccionar el DOM en la pantalla de bloqueo y **no aparece ningún nodo de botón de entrega**.
- [ ] "Mi Ruta" no contiene ni un solo signo de pesos, ni en pantalla ni en el objeto de datos.
- [ ] Las pantallas se entienden impresas en blanco y negro (redundancia estructural, no color).
- [ ] Se llega a los 7 fixtures desde el panel de desarrollo.
- [ ] Los 6 estados (`Default`/`Disabled`/`Loading`/`Error`/`Empty`/`Offline`) existen donde aplican.
- [ ] Cada control interactivo tiene `data-testid`.
- [ ] Layout correcto en 320, 360, 390 y 430 px de ancho, portrait.
- [ ] Cero `fetch`, cero Supabase, cero llamadas de red reales.
- [ ] Ningún UUID que parezca real, ningún dato de cliente real.
- [ ] `npm run build` y `npm run test` pasan sin errores.
- [ ] Desplegado en preview y el enlace está en el PR.

---

## 12. Contexto para tu asistente de IA

Crea `AGENTS.md` (o `CLAUDE.md`) en la raíz del repo con **exactamente** este contenido:

```markdown
# Contexto del proyecto — printflow-app

## Qué es
PWA móvil de PrintFlow AI (Imprenta Escalante) para los 2 instaladores.
Escanean el QR de una nota de remisión y la app decide si pueden entregar el producto.
Su razón de existir: impedir que salga material cuyo cliente todavía debe dinero.

## Stack
React 18 + Vite + TypeScript strict + Tailwind + React Router v6 + Zustand.
vite-plugin-pwa (solo manifest). Vitest + Testing Library. Node 20.

## Fase actual: maquetado estructural SIN color y SIN backend
La API todavía se está construyendo. Todos los datos vienen de src/data/mocks/.

## Reglas duras — NUNCA las rompas

### Candado de entrega (lo más importante del repo)
1. El botón "Confirmar entrega física" se renderiza SOLO si evaluateDeliveryGuard
   devuelve ALLOW. En cualquier otro caso el nodo NO SE INSTANCIA.
2. Prohibido: crear el botón y ocultarlo, visibility:hidden, display:none sobre un
   nodo montado, opacity:0, aria-hidden, sacarlo del viewport, pointer-events:none,
   o usar disabled como sustituto del candado.
3. ALLOW requiere TODO a la vez: sesión INSTALLER válida dentro de 12h + online +
   lectura viva + status === 'READY_FOR_DELIVERY' + balanceDue === "0.00" exacto.
4. balanceDue null, NaN, negativo, ausente, con error de parseo, offline u obsoleto
   es INDETERMINADO y se resuelve como DENY. Nunca como liquidado.
5. El valor por defecto de cualquier decisión de autorización es DENY.

### Dinero
6. El dinero viaja como string decimal de 2 posiciones ("0.00"). Nunca como number.
   Prohibido comparar saldos con tolerancias de punto flotante o redondear para decidir.
7. La app NUNCA calcula el saldo. Lo lee. La autoridad es la base de datos.

### Confidencialidad
8. La pantalla "Mi Ruta" no muestra ni solicita total, saldo, abonos, método de pago
   ni ningún signo de pesos. Solo producto y fecha pactada.
9. El header persistente nunca muestra nombre de cliente ni saldo.
10. El instalador nunca registra cobros. No existe esa acción en esta app.

### Visual
11. Cero color de marca. Todos los colores salen de variables en src/styles/tokens.css
    (escala de grises). Prohibido un hex literal en un componente.
12. La criticidad NO se comunica con color, sino con grosor de borde (1/2/4px), trama
    diagonal y etiqueta textual en mayúsculas. Debe entenderse impreso en blanco y negro.
13. Todo espaciado es múltiplo de 8px. Excepción: bordes de 1, 2 o 4 px.
14. Grid móvil: 360x800 portrait, 4 columnas, márgenes 16px, gutter 16px,
    header 56px, bottom nav 64px + safe-area-inset-bottom.
15. Botón de confirmar entrega: hitbox mínimo 60x60px, alto visual 64px.
16. Sin animaciones, sin fotos, sin iconos reales, sin Google Fonts. Solo system-ui
    y placeholders con label entre corchetes.

### Alcance de esta fase
17. Sin Supabase, sin autenticación real, sin fetch, sin llamadas de red.
    Todo pasa por la interfaz PrintflowGateway implementada con mocks.
18. Sin cámara real, sin getUserMedia, sin html5-qrcode. El visor es una caja tramada.
19. Sin Service Worker con estrategias de caché, sin Realtime, sin push, sin vibración.
20. No tocar el repo printflow-admin.

### General
21. TypeScript strict. Prohibido `any` en contratos de datos.
22. Todo control interactivo lleva data-testid estable.
23. Ningún UUID que parezca real, ningún dato de cliente real, ninguna PII.
24. Los tipos de src/data/contracts.ts no se modifican sin aprobación de Isaías.
```

---

## 13. Plan de los 5 días

| Día | Objetivo |
|---|---|
| **1** | Repo, Vite + TS + Tailwind + Router + Zustand, `tokens.css`, `AppShell`, `Button`, `Input`, `PlaceholderBox`, `AGENTS.md`. PR de setup. |
| **2** | `contracts.ts`, `gateway.ts`, mocks con los 7 fixtures, panel de desarrollo, pantalla de Login con todos sus estados. |
| **3** | Pantalla de Escáner (viewport placeholder, retícula, controles, overlay offline, QR no reconocido). |
| **4** | `deliveryGuard.ts` + las 3 pantallas de resultado + **las 3 pruebas negativas de Vitest**. |
| **5** | Mi Ruta con semáforo estructural y sus 5 estados + componentes globales + QA de anchos + build + deploy + PR final. |

Si vas apretado de tiempo, **el día 4 es intocable**. Prefiero que "Mi Ruta" quede a medias antes que un candado mal implementado.

---

## 14. Qué sigue después de esta fase

**Fase 2** (no la empieces todavía): cámara real con `html5-qrcode` + `facingMode: environment`, linterna por capability, vibración de 200 ms, conexión a Supabase con `NetworkOnly` para el saldo, autenticación real con sesión absoluta de 12 horas, Service Worker con Workbox, e identidad visual.

Después de eso arranca tu **apoyo al Panel Administrativo POS** junto con Isaías.

**Nota de arquitectura pendiente:** el contenido exacto del QR (`orderToken` opaco vs. `order_id`) y la vista/RPC que alimenta "Mi Ruta" sin exponer campos financieros son decisiones abiertas que Isaías debe cerrar antes de la Fase 2 (gates `ARQ-01`, `ARQ-02` y `ARQ-05` del Spec-Kit V2). Por eso en esta fase trabajas contra `PrintflowGateway` y no contra Supabase: cuando se cierren esos gates, **solo cambia la implementación del gateway**.
