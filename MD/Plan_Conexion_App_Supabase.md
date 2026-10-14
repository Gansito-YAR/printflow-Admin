# Plan de Implementación — Conexión de la App del Instalador a Supabase (hasta producción)

| Campo | Detalle |
|---|---|
| Proyecto | **PrintFlow AI** — Imprenta Escalante |
| Repositorio | `printflow-app` (github.com/Gansito-YAR/printflow-app) — PWA del instalador, de Emir |
| Responsable | **Isaías** (implementación). **Emir** revisa cada PR antes del merge |
| Base | Continúa `Plan_Implementacion_BD_Panel_App.md` §3 (APP-01..04) e §5 (INT-01..08). Lo amplía con lo que cambió desde entonces: estado `CANCELLED`, entrega con crédito, panel terminado y responsive |
| Alcance | Desde conectar la app a datos reales hasta tenerla **instalada en los teléfonos de los instaladores, escaneando remisiones impresas**, con el flujo completo verificado junto con el panel |
| Fuera de alcance | Chatbot de WhatsApp/n8n (fase futura) |

> **Regla de oro (Constitution Principle I, intocable).** El botón de confirmar entrega **solo existe en el DOM** si `evaluateDeliveryGuard` devuelve `ALLOW`: sesión de INSTALLER vigente + en línea + lectura de menos de 60 s + `READY_FOR_DELIVERY` + `balanceDue === "0.00"` exacto. Ningún error, formato raro o respuesta inesperada puede terminar en `ALLOW`. La base de datos aplica la misma regla (T3), así que aunque la app fallara, una entrega con saldo no se guarda.

---

## 0. Situación actual

### Lo que ya existe y no se toca
| Pieza | Estado |
|---|---|
| RPC `get_delivery_info(p_qr)` | Aplicada y probada (06: 32 verificaciones). Devuelve `order_token`, `customer_label`, `product_label`, `status` y `balance_due` como **texto** |
| RPC `confirm_delivery(p_qr)` | Devuelve `{ok, delivered_at}` o `{ok:false, code, reason}`, igual que `ConfirmDeliveryResult` |
| RPC `get_my_route(p_filter)` | `route_token`, `product_label`, `promised_date`. **Sin dinero** |
| Turno de 12 h | Lo aplica la base con la marca `amr` del JWT (verificado en DB-13: sobrevive al refresh del token) |
| RLS del instalador | 0 filas en todas las tablas; solo usa sus 3 RPC |
| `evaluateDeliveryGuard` y sus 6 pruebas | Correctos. **No se modifican** |
| Interfaz `PrintflowGateway` | 4 métodos: `signIn`, `scanOrder`, `confirmDelivery`, `getMyRoute`. Es la única costura entre la app y el servidor |
| Cuenta de prueba | `gansito…@gmail.com`: INSTALLER activo (credenciales en `API/.env`, nunca en el repo) |

### Lo que falta
| # | Hueco | Dónde |
|---|---|---|
| 1 | 7 archivos importan `mocks/mockGateway` directamente | Login, Scanner, Result, Blocked, Clearance, MyRoute y `store/demo` |
| 2 | No existe ninguna implementación real del gateway ni dependencia de Supabase | `package.json` solo tiene react, router y zustand |
| 3 | La sesión vive solo en memoria: al recargar, el instalador vuelve al login | `store/session.ts` |
| 4 | `OrderStatus` no tiene `CANCELLED` | `contracts.ts` |
| 5 | **M-01:** cada escaneo llama dos veces a `scanOrder` (Scanner y Result). Con red real son 2 viajes al servidor | `ScannerScreen.tsx`, `DeliveryResultScreen.tsx` |
| 6 | **M-02:** el estado de demo y el del gateway se sincronizan a mano | `store/demo.ts` |
| 7 | Cámara real: hoy es un marcador con entrada manual del código | `ScannerScreen.tsx` |
| 8 | El Service Worker no tiene regla explícita para no guardar respuestas de la API | `vite.config.ts` |
| 9 | Iconos reales de la PWA y `apple-touch-icon` (pendientes E-01 y E-02 de Emir) | `public/manifest-icons/` |
| 10 | No hay despliegue con HTTPS (la cámara del celular lo exige) | Hosting |

---

## 1. Decisiones

| ID | Decisión | Motivo |
|---|---|---|
| **APP-D-01** | El origen de datos se elige con `VITE_DATA_SOURCE` = `mock` (por defecto) o `supabase`. En `mock`, la app se comporta **exactamente igual que hoy**, con su `/demo` | Emir sigue trabajando lo visual sin red; las pruebas del candado no cambian |
| **APP-D-02** | Con `supabase` no se registra la ruta `/demo` ni se muestra el botón `[DEMO]` | El modo demo manipula estados; en producción no debe existir |
| **APP-D-03** | **Contrato:** se agrega `CANCELLED` a `OrderStatus` y su etiqueta "Cancelado". Aprobado por Isaías (regla del encabezado de `contracts.ts`) | La base ya puede devolverlo; hoy no rompe nada porque el guard lo trata como no entregable, pero no tiene texto |
| **APP-D-04** | El payload del QR es el `qr_code_hash` (UUID crudo, ARQ-01). Si no es un UUID válido → `INVALID_PAYLOAD` **sin llamar al servidor** | Evita viajes inútiles y no da pistas a quien pruebe códigos |
| **APP-D-05** | `balanceDue` se valida con `^-?\d+\.\d{2}$`. Si no cumple (número, vacío, otro formato) → `null` → `DENY_INDETERMINATE` | Defensa en profundidad: un cambio accidental en la API no puede abrir el candado |
| **APP-D-06** | **Mapa de errores cerrado:** red caída o timeout → `NETWORK_ERROR`; `PF_FORBIDDEN` → sesión revocada (cierre + modal); cualquier otra cosa → `UNKNOWN`. **Nunca** se traduce un error en autorización | Lección A.5 del prototipo |
| **APP-D-07** | Timeout de **10 s** por llamada (AbortController). Pasado ese tiempo → `NETWORK_ERROR` | En la calle con 3G no se puede quedar el spinner infinito |
| **APP-D-08** | `sessionStartedAt` = marca `amr` del JWT (método `password`); `absoluteDeadline` = esa marca + 12 h. Se lee del token, no del reloj del teléfono | Es la misma marca que usa la base; un reloj del celular adelantado o atrasado no cambia el turno |
| **APP-D-09** | La sesión de Supabase persiste (localStorage del cliente de Supabase), así que **recargar no cierra sesión**. Al arrancar se rehidrata: token + perfil + turno. Si el turno venció o el perfil ya no es INSTALLER activo → cierre | Un instalador en la calle no puede perder la sesión por cerrar el navegador |
| **APP-D-10** | **Nada de dinero ni datos del pedido se guarda localmente**: ni localStorage ni la caché del Service Worker. La API de Supabase va como `NetworkOnly` en Workbox | SRS Fase 4 §1.2: el saldo siempre debe ser el del servidor en ese momento |
| **APP-D-11** | **M-01 corregido:** el escáner solo valida el formato y navega; la consulta se hace **una vez**, en la pantalla de resultado. "Re-validar" vuelve a consultar | Mitad de latencia y de consumo de datos |
| **APP-D-12** | Confirmar entrega es seguro de reintentar: si la red cae después de que el servidor la registró, el reintento devuelve `ALREADY_DELIVERED`, que se muestra como "La entrega ya quedó registrada" (éxito, no error) | Igual que la idempotencia de los abonos en el panel |
| **APP-D-13** | **Cámara:** librería `qr-scanner` (usa `BarcodeDetector` nativo cuando existe y un worker como respaldo; funciona en iOS Safari y Android Chrome). Se carga en diferido. La entrada manual del código **se conserva** como respaldo | Ligera y sin dependencias; la entrada manual salva el caso de cámara dañada o QR maltratado |
| **APP-D-14** | Pantalla "No entregable" con **motivo según el estado**: en producción, pendiente de anticipo, cancelado o ya entregado | Hoy es un mensaje genérico; el instalador necesita saber qué decirle al cliente |
| **APP-D-15** | Trabajo en la rama `feat/conexion-supabase`, un PR por fase (o por bloque de fases). Emir revisa antes de cada merge a `main` | Convención del plan maestro §7 |

---

## 2. Fases

### Fase 0 — Preparación

| Tarea | Detalle | Hecho cuando |
|---|---|---|
| **APP-00a** | Rama `feat/conexion-supabase` desde `main` actualizado. Revisar que las ramas viejas de Emir (`feat/fase15…`, `feat/fase2…`) ya están integradas para no chocar | Rama creada |
| **APP-00b** | Instalar `@supabase/supabase-js@2.117` (la misma versión del panel) | `npm ls` la muestra |
| **APP-00c** | `.env.example` con `VITE_DATA_SOURCE=mock`, `VITE_SUPABASE_URL=` y `VITE_SUPABASE_ANON_KEY=`. `.env` local con los valores de `API/.env`, gitignored. **Nunca** la `service_role` | `.env` fuera del repo |
| **APP-00d** | **Escenarios de prueba** en la base de desarrollo. Script `API/scripts/escenarios_app.sql` que crea pedidos marcados `[PRUEBA APP]` en cada estado de la matriz §4, e imprime sus QR (UUID). Se ejecuta una vez, con aviso, porque los pedidos no se pueden borrar (solo cancelar) | Lista de QR por escenario |

### Fase 1 — Contrato y selector (APP-01)

| Tarea | Archivo | Detalle |
|---|---|---|
| **APP-01a** | `src/data/contracts.ts` | `OrderStatus` += `"CANCELLED"` (APP-D-03) |
| **APP-01b** | `src/components/ui/StatusBadge.tsx` | Etiqueta y estilo de "Cancelado" (bloqueado, con texto; no depende del color) |
| **APP-01c** | `src/data/index.ts` (nuevo) | `export const dataSource = import.meta.env.VITE_DATA_SOURCE === "supabase" ? "supabase" : "mock"` y `export const gateway: PrintflowGateway`, que carga `SupabaseGateway` o `MockGateway` |
| **APP-01d** | Login, Scanner, Result, Blocked, Clearance y MyRoute | Cambiar `import { gateway } from "../../data/mocks/mockGateway"` por `from "../../data"`. `store/demo.ts` **sigue** con el mock (usa sus setters) |
| **APP-01e** | `App.tsx`, `LoginScreen.tsx` | `/demo` y el enlace `[DEMO]` solo si `dataSource === "mock"` (APP-D-02). En el login, la pista de credenciales mock solo en modo mock |
| **APP-01f** | `src/vite-env.d.ts` | Tipos de `import.meta.env` (`VITE_DATA_SOURCE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) |

**Criterio:** con `mock`, la app es idéntica a hoy y pasan las 6 pruebas del candado. Con `supabase` y sin variables, la app muestra un error claro de configuración en lugar de una pantalla en blanco.

### Fase 2 — `SupabaseGateway` (APP-02)

Archivos nuevos en `src/data/supabase/`:

| Archivo | Contenido |
|---|---|
| `client.ts` | `createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })`. Lanza un error explícito si faltan las variables |
| `jwt.ts` | `loginTimestamp(accessToken)`: decodifica el payload (base64url) y devuelve la marca `amr` de método `password` en ISO, o `null` |
| `errors.ts` | `classify(err)` → `"NETWORK" \| "FORBIDDEN" \| "UNKNOWN"` según APP-D-06. Clase `SessionRevokedError` |
| `withTimeout.ts` | Envuelve cada llamada con AbortController a 10 s (APP-D-07) |
| `supabaseGateway.ts` | La clase `SupabaseGateway implements PrintflowGateway` |

**Mapeo por método:**

| Método | Llamada | Resultado |
|---|---|---|
| `signIn(email, password)` | `auth.signInWithPassword` → `select role, full_name, is_active from profiles where id = uid` (RLS: el instalador ve su perfil) | Si no es INSTALLER activo → `auth.signOut()` + `Error("Credenciales inválidas")` (mensaje genérico, sin revelar el motivo). `SessionDTO`: `userToken` = id de usuario, `fullName`, `role`, `sessionStartedAt` = amr, `absoluteDeadline` = amr + 12 h. Sin amr → cierre y error genérico. Red caída → `Error("NETWORK_ERROR")` (lo que ya espera el login) |
| `scanOrder(payload)` | Validación UUID → `rpc("get_delivery_info", { p_qr })` | No-UUID → `INVALID_PAYLOAD` sin red. 0 filas → `NOT_FOUND`. 1 fila → `FOUND` con `orderToken` = `order_token`, `customerLabel`, `productLabel`, `status`, `balanceDue` validado (APP-D-05). Red → `NETWORK_ERROR`. `PF_FORBIDDEN` → `SessionRevokedError`. Otro → `NETWORK_ERROR` (el usuario reintenta; nunca autoriza) |
| `confirmDelivery(orderToken)` | `rpc("confirm_delivery", { p_qr: orderToken })` | El JSON ya tiene la forma del contrato. Se valida: `ok === true` con `delivered_at` → éxito; `ok === false` con `code` conocido → ese código; cualquier otra forma → `{ok:false, code:"UNKNOWN"}`. Red → excepción (la UI ofrece reintentar, APP-D-12) |
| `getMyRoute(filter)` | `rpc("get_my_route", { p_filter })` | `routeItemToken` = `route_token`, `productLabel`, `promisedDate` (ISO o `null`). La base ya filtra hoy/próximas en la zona operativa y ordena |

### Fase 3 — Sesión (APP-03)

| Tarea | Detalle |
|---|---|
| **APP-03a** `store/session.ts` | Nuevo estado `status: "checking" \| "ready"` y `revokedReason: "EXPIRED" \| "REVOKED" \| null`. `logout()` también llama a `gateway.signOut?.()` (método opcional que el mock ignora) |
| **APP-03b** Rehidratación | Al arrancar en modo supabase: `getSession()` → si hay token: amr + perfil → si es válido, `login(session)`; si no, `signOut`. Mientras tanto, `Protected` muestra un spinner (no redirige al login en falso) |
| **APP-03c** Escucha de Auth | `onAuthStateChange`: `SIGNED_OUT` → `logout()`; `TOKEN_REFRESHED` → recalcular `absoluteDeadline` con el amr (no debe cambiar; si cambiara, gana el amr) |
| **APP-03d** Sesión revocada por el servidor | Cualquier `SessionRevokedError` (turno vencido en la base, cuenta desactivada desde el panel) → `logout` + `revokedReason = "REVOKED"` → `SessionExpiredModal` con el texto "Su sesión fue cerrada. Inicie sesión de nuevo". Hoy el modal solo reacciona al reloj; se amplía para ambos motivos |
| **APP-03e** Sin datos en local | Verificar que ningún `ScannedOrderDTO` se guarda en un store persistente. Los stores de Zustand no usan `persist` |
| **APP-03f** Service Worker | `VitePWA.workbox.runtimeCaching`: `urlPattern: /\.supabase\.co\//` con `handler: "NetworkOnly"`. `navigateFallbackDenylist: [/^\/rest\//, /^\/auth\//]` (APP-D-10) |

### Fase 4 — Flujo de escaneo y entrega

| Tarea | Archivo | Detalle |
|---|---|---|
| **APP-04a** M-01 | `ScannerScreen.tsx` | Solo valida el formato (UUID en modo supabase; en mock, los tokens de fixtures) y navega a `/resultado/:token`. **Sin llamar** a `scanOrder` |
| **APP-04b** | `DeliveryResultScreen.tsx` | Única consulta. Maneja `SessionRevokedError`. Mantiene el tick de 5 s para la lectura viva |
| **APP-04c** APP-D-14 | `NotDeliverablePanel.tsx` | Recibe `status` y muestra el motivo: pendiente de anticipo ("Aún no ha pagado el anticipo; no se produjo"), en producción ("Todavía en taller"), cancelado ("Pedido cancelado: no entregar"), entregado ("Este pedido ya fue entregado") |
| **APP-04d** | `BlockedDeliveryPanel.tsx` | "Re-validar" consulta de nuevo (para cuando el cliente paga en ese momento y el admin registra el abono en el panel). Guarda contra doble toque |
| **APP-04e** APP-D-12 | `ClearancePanel.tsx` | Guarda síncrona contra doble toque en "Confirmar entrega". Si la red falla: "No se pudo confirmar. Reintentar (seguro)". `ALREADY_DELIVERED` tras un reintento = éxito |
| **APP-04f** | `DeliveryResultScreen.tsx` | `replace` en la navegación al resultado, para que "atrás" vuelva al escáner y no repita la lectura vieja |
| **APP-04g** M-02 | `store/demo.ts` | Queda solo para el mock. Documentar que es descartable al quitar el modo demo |

### Fase 5 — Pruebas de la conexión (APP-04 del plan maestro)

| Tarea | Tipo | Casos |
|---|---|---|
| **APP-05a** | Unitarias de `SupabaseGateway` (cliente de Supabase simulado) | signIn: INSTALLER ok; ADMIN → rechazo genérico; inactivo → rechazo; sin amr → rechazo; red. scanOrder: no-UUID no llama a la red; 0 filas; 1 fila; `balance_due` numérico → `null`; `"1,250.50"` → `null`; `PF_FORBIDDEN` → `SessionRevokedError`; timeout → `NETWORK_ERROR`. confirmDelivery: ok; `ALREADY_DELIVERED`; forma desconocida → `UNKNOWN`. getMyRoute: mapeo y `null` |
| **APP-05b** | `jwt.ts` | amr válido; sin amr; token mal formado → `null` |
| **APP-05c** | Pantallas (mock) | Escáner sin doble consulta (cuenta de llamadas = 1); motivo por estado en "No entregable"; Clearance con doble toque = 1 llamada; reintento tras red |
| **APP-05d** | Candado | Las 6 pruebas actuales intactas + "status CANCELLED → no hay botón" |
| **APP-05e** | Integración real (manual, guiada) | La matriz §4 completa contra la base de desarrollo, con la cuenta de instalador de prueba |
| **APP-05f** | Base de datos | Las 270 verificaciones existentes siguen en verde (sin cambios de esquema en esta fase) |

### Fase 6 — Cámara real

| Tarea | Detalle |
|---|---|
| **APP-06a** | Dependencia `qr-scanner`, importada en diferido solo en la pantalla del escáner |
| **APP-06b** | Componente `CameraScanner`: pide permiso, abre la cámara trasera (`facingMode: environment`), dibuja dentro de la retícula existente, detiene la cámara al salir de la pantalla o al leer un código |
| **APP-06c** | Permiso denegado → la pantalla existente "Permiso de cámara denegado" (`useScannerStore.cameraPermissionDenied`), con instrucciones reales por sistema (Android/iOS) en lugar de enlazar a `/demo` |
| **APP-06d** | Linterna: solo si `track.getCapabilities().torch` existe (`supportsTorch`); si no, el botón no aparece |
| **APP-06e** | Al leer: vibración corta (`navigator.vibrate`, si existe) y navegación al resultado. Lecturas repetidas del mismo código en 2 s se ignoran |
| **APP-06f** | Entrada manual del código como respaldo, plegada bajo "¿No lee el código?" |
| **APP-06g** | Requiere HTTPS: en desarrollo, `vite --host` con certificado local o probar desde el despliegue de Fase 7 |

### Fase 7 — PWA y despliegue

| Tarea | Detalle |
|---|---|
| **APP-07a** | Iconos reales 192/512 + variante `maskable` + `apple-touch-icon` 180×180 a partir del logo (pendientes E-01/E-02). Si Emir no los entrega, se generan aquí |
| **APP-07b** | Despliegue de `printflow-app` (con `VITE_DATA_SOURCE=supabase`) y de `printflow-admin` en Vercel o Cloudflare Pages, con HTTPS y variables configuradas en el hosting (INT-01) |
| **APP-07c** | Reescritura de rutas SPA (todas las rutas → `index.html`) y encabezados: `Cache-Control: no-store` para `index.html`, caché larga para assets con hash |
| **APP-07d** | Aviso de actualización (`UpdateToast`) conectado al Service Worker real (`registerType: "prompt"` ya está) |
| **APP-07e** | CI con GitHub Actions en ambos repos: `npm ci` → `typecheck` → `test` → `build` en cada PR (INT-02) |
| **APP-07f** | Supabase: confirmar que el registro público sigue desactivado y que no hace falta configurar URLs de redirección (solo se usa contraseña) |

### Fase 8 — Prueba de campo y aceptación

| Tarea | Detalle |
|---|---|
| **APP-08a** | Instalar la PWA en al menos un Android y un iPhone: icono nítido, modo `standalone`, orientación vertical y tema en claro y oscuro (E-04) |
| **APP-08b** | **Flujo dorado E2E** (INT-03), cronometrado: crear pedido en el panel → anticipo → producción → listo → imprimir remisión → **escanear el papel con la cámara** → pantalla roja → el admin cobra el saldo en el panel → "Re-validar" → pantalla verde → confirmar → la tarjeta pasa a "Entregado" en el tablero del panel **en tiempo real** |
| **APP-08c** | Prueba física de la remisión (INT-05): impresa en papel y en condiciones reales (luz de día, papel arrugado, pantalla del teléfono con brillo bajo) |
| **APP-08d** | Concurrencia en staging (INT-04): abono y entrega simultáneos; la entrega espera al abono |
| **APP-08e** | Turno de 12 h en real: con un login viejo (o adelantando la marca en una cuenta de prueba), la app debe cerrar la sesión al primer intento |
| **APP-08f** | UAT con Andri y el dueño (INT-08) |

---

## 3. Contrato de errores (resumen para la UI)

| Origen | Señal | La app muestra |
|---|---|---|
| Sin conexión / timeout de 10 s | `NETWORK_ERROR` o excepción de red | Aviso de sin conexión y "Reintentar" |
| Código no UUID | `INVALID_PAYLOAD` | "Código QR no reconocido" (sin llamar al servidor) |
| UUID que no existe | `NOT_FOUND` | "Código QR no reconocido" |
| Turno vencido o cuenta desactivada | `PF_FORBIDDEN` → `SessionRevokedError` | Modal de sesión cerrada → login |
| Saldo con formato inesperado | `balanceDue: null` | "Validación no disponible" (DENY_INDETERMINATE) |
| Confirmación ya registrada | `ALREADY_DELIVERED` | "La entrega ya quedó registrada" |
| Rechazo por regla (saldo > 0 al confirmar) | `REJECTED_BY_RULE` | Pantalla roja con el motivo |
| Cualquier otra cosa | `UNKNOWN` | Mensaje genérico y reintentar. **Nunca** verde |

---

## 4. Matriz de escenarios (prueba real, Fase 5 y Fase 8)

| # | Escenario | Preparación | Resultado esperado |
|---|---|---|---|
| 1 | Liquidado y listo | Pedido READY con saldo 0 | **Verde**; confirmar → "Entregado"; el panel lo mueve a Entregado en vivo |
| 2 | Con saldo | READY con saldo > 0 | **Rojo** con el saldo y el cliente; **no existe** el botón de confirmar |
| 3 | Pago en el momento | Escenario 2 + el admin registra el abono en el panel | "Re-validar" → verde |
| 4 | En producción | IN_PRODUCTION | No entregable: "Todavía en taller" |
| 5 | Pendiente de anticipo | PENDING_DEPOSIT | No entregable: "Aún no ha pagado el anticipo" |
| 6 | Cancelado | CANCELLED | No entregable: "Pedido cancelado: no entregar" |
| 7 | Ya entregado | DELIVERED | No entregable: "Este pedido ya fue entregado" |
| 8 | Entregado con crédito | DELIVERED + delivery_override | Igual que 7 |
| 9 | QR inexistente | UUID válido que no existe | "Código QR no reconocido" |
| 10 | Código basura | Texto que no es UUID | "No reconocido" **sin** llamada de red (se verifica en las herramientas de red) |
| 11 | Sin red | Modo avión al escanear | Aviso de sin conexión; nunca verde |
| 12 | Lectura vieja | Escenario 1, esperar > 60 s sin re-validar | Se oculta el botón: "Validación vencida, re-escanee" |
| 13 | Doble toque al confirmar | Escenario 1, tocar rápido dos veces | Una sola entrega en la bitácora |
| 14 | Red cae al confirmar | Escenario 1, cortar la red justo al confirmar y reintentar | "Ya quedó registrada"; una sola entrega |
| 15 | Turno vencido | Sesión con login de hace más de 12 h | Modal de sesión cerrada al primer intento |
| 16 | Instalador desactivado | El admin lo desactiva en Usuarios mientras está en la calle | Al siguiente escaneo: modal de sesión cerrada |
| 17 | Cuenta de admin en la app | Iniciar sesión con la cuenta del dueño | Rechazo genérico |
| 18 | Mi Ruta | Pedidos listos de hoy y próximos | Lista correcta, **sin ningún dato de dinero** |
| 19 | Recarga | Recargar la app con sesión vigente | Sigue dentro, sin volver al login |
| 20 | Modo mock | `VITE_DATA_SOURCE=mock` | Todo igual que hoy, con `/demo` |

---

## 5. Orden de ejecución

```
F0 Preparación → F1 Contrato y selector → F2 Gateway → F3 Sesión → F4 Flujo
      → F5 Pruebas (unitarias + matriz real)          ← PR 1 (conexión funcional, entrada manual)
      → F6 Cámara                                       ← PR 2
      → F7 PWA y despliegue                             ← PR 3 + despliegue del panel
      → F8 Campo y aceptación
```

**Primer hito demostrable (fin de F5):** escanear con la entrada manual el QR de una remisión real y que la app muestre rojo o verde con datos de la base, y que una entrega aparezca al instante en el tablero del panel.

---

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| Cambio del contrato (`CANCELLED`) choca con trabajo local de Emir | Avisarle antes de abrir el PR; el cambio es aditivo y el compilador señala cualquier etiqueta faltante |
| El Service Worker sirve una versión vieja de la app | `registerType: "prompt"` + `UpdateToast`; `index.html` sin caché |
| iOS Safari y la cámara | `qr-scanner` soporta iOS ≥ 11 vía worker; la entrada manual como respaldo; prueba real en iPhone (APP-08a) |
| Reloj del teléfono desfasado | El turno se calcula con la marca del servidor (amr) y lo aplica la base (APP-D-08) |
| Mala señal en la calle | Timeout de 10 s, aviso claro y reintento; el candado nunca se abre sin una lectura de menos de 60 s |
| El instalador comparte su teléfono o su sesión | Turno de 12 h no renovable; el admin puede desactivarlo desde el panel y la siguiente acción lo saca (escenario 16) |
| Datos de prueba en la base de desarrollo | Marcados `[PRUEBA APP]`; al terminar se cancelan. En producción (INT-06) se arranca sin seed |
