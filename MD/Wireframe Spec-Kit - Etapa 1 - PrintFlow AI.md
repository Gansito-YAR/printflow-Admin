# PrintFlow AI — Documento de Especificaciones de Prototipado

## Wireframe Spec-Kit · Etapa 1 · Baja Fidelidad

| Campo | Definición |
|---|---|
| Proyecto | PrintFlow AI — Imprenta Escalante |
| Artefacto | Especificación normativa para wireframes estructurales |
| Estado | Listo para revisión de Junta Directiva; sujeto a los gates de arquitectura `ARQ-01` a `ARQ-04` |
| Alcance | Panel Web POS (Fase 3), PWA móvil (Fase 4) y Landing Page pública (Fase 8) |
| Responsable de implementación Fases 3–4 | **EMIR — Full Stack** |
| Responsable de implementación Fase 8 | **FARIDE — Frontend/UI** |
| Aprobador técnico | **ISAIAS — Líder Técnico** |
| Sistema visual permitido | Escala de grises exclusivamente; sin identidad visual final |

> **Carácter normativo.** En este documento, **DEBE / NO DEBE** identifica una condición obligatoria; **DEBERÍA** identifica una recomendación que requiere justificación escrita si se omite; **PUEDE** identifica una opción. Ningún wireframe aprobado autoriza a relajar constraints, triggers, RLS o roles de PostgreSQL/Supabase.

## Registro de fuentes y trazabilidad

Las referencias entre corchetes remiten a las siguientes reglas fuente. Los números de línea corresponden a los archivos Markdown analizados en el workspace.

| ID | Fuente y ubicación | Regla que gobierna este Spec-Kit |
|---|---|---|
| `BRD-01` | `Documento de Visión, Alcance y Requerimientos de Negocio_Imprenta_YAR.md`, §4, líneas 117–129 | Bloqueo físico de despacho cuando el saldo es mayor a $0; agenda ordenada por fecha pactada y semáforo temporal. |
| `BRD-02` | Mismo archivo, §5, líneas 145–167 | Landing hacia WhatsApp; POS con abonos secuenciales; nota PDF con total, abonos, saldo, fecha y QR; escáner valida saldo exactamente $0. |
| `BRD-03` | Mismo archivo, §6, líneas 179–199 | ADMIN con acceso total y excepción; INSTALLER consulta cola y escanea, pero no despacha con adeudo. |
| `BRD-04` | Mismo archivo, §7, líneas 203–245 | Anticipo para entrar a producción; saldo como total menos suma de abonos; bloqueo de entrega; fecha pactada obligatoria y reprogramable solo por ADMIN con razón auditada. |
| `BRD-05` | Mismo archivo, §8–9, líneas 270–292 | PWA móvil; pagos reflejados en tiempo real; audit trail; verificación bancaria manual; supuesto operativo de cámara e internet móvil. |
| `SRS-DB-01` | `Arquitectura y Documentacion SRS del Proyecto IMPRENTA.md`, Fase 1 §1, líneas 35–71 | Campos de `orders` y `payments`; `balance_due` cacheado por trigger; `qr_code_hash` evita exponer el ID real; pagos append-only. |
| `SRS-RLS-01` | Mismo archivo, Fase 1 §3, líneas 107–127 | `payments`: SELECT/INSERT solo ADMIN. `orders`: lectura ADMIN/INSTALLER; INSTALLER solo actualiza `status` a `DELIVERED`, sujeto a trigger. |
| `SRS-DB-02` | Mismo archivo, Fase 1 §4–5, líneas 129–161 | Saldo recalculado tras insertar pago; trigger rechaza `DELIVERED` con `balance_due > 0`; concurrencia protegida mediante transacción y bloqueo de fila. |
| `SRS-POS-01` | Mismo archivo, Fase 3 §2–4, líneas 351–401 | Login Supabase, ruta ADMIN, timeout POS 30 min, Kanban Realtime, semáforo por fecha y submit de abono con disabled + spinner anti-doble clic. |
| `SRS-POS-02` | Mismo archivo, Fase 3 §5–7, líneas 403–449 | Estructura PDF y QR; acciones avanzadas de supervisor; justificación obligatoria al cambiar fecha; ErrorBoundary, feedback y saneamiento de inputs. |
| `SRS-PWA-01` | Mismo archivo, Fase 4 §1–2, líneas 451–499 | PWA portrait; App Shell `CacheFirst`; consulta QR `NetworkOnly`; cámara trasera, permisos, vibración y lectura del payload. |
| `SRS-PWA-02` | Mismo archivo, Fase 4 §3–4, líneas 501–549 | Dos estados mutuamente excluyentes: bloqueo con saldo positivo sin botón en DOM; autorización con saldo 0 y hitbox ≥60×60; “Mi Ruta” por fecha, sin importes. |
| `SRS-PWA-03` | Mismo archivo, Fase 4 §5–6, líneas 551–577 | JWT de 12 horas; rol INSTALLER; actualización forzada; QR inválido; torch condicionado por soporte; ErrorBoundary móvil. |
| `SRS-QA-01` | Mismo archivo, Fase 6 §1.3, líneas 759–773 | E2E debe comprobar anti-doble clic y ausencia/presencia del control de entrega según saldo. |
| `INFRA-01` | `Propuesta de Infraestructura y Costos Operativos IMPRENTA.md`, §2–3, líneas 24–101 | Subdominios separados; POS/PWA como React estático en Vercel o Cloudflare Pages con SSL/CDN, sin servidor de render continuo. |
| `INFRA-02` | Mismo archivo, §3, líneas 57–72 | Supabase contiene finanzas, pedidos y bloqueos; Plan Pro recomendado por disponibilidad y PITR. |

### Precedencia y conflictos que no se pueden resolver en la capa visual

1. **Asignación actual de equipo.** Este Spec-Kit adopta la asignación de este encargo: Emir implementa Fases 3 y 4; Faride implementa Fase 8. Esta asignación reemplaza únicamente la asignación histórica de responsables del SRS; no altera requisitos funcionales, RLS ni reglas de base de datos.
2. **`ARQ-01 — Identidad del QR`.** `orders.qr_code_hash` se define como hash público que evita exponer `orders.id` (`SRS-DB-01`), pero la plantilla PDF y el escáner describen un payload `order_id`/UUID (`SRS-POS-02`, `SRS-PWA-01`). Hasta que Isaias apruebe un ADR, el wireframe rotulará el contenido como `[PAYLOAD_OPACO_DE_ORDEN]`. No se mostrará un UUID real ni se asumirá que el cliente consulta `orders.id` directamente. La decisión recomendada es resolver un `qr_code_hash` mediante una función/RPC segura que devuelva solo el DTO autorizado.
3. **`ARQ-02 — Confidencialidad por columna`.** La RLS documentada permite a INSTALLER leer filas de `orders`, tabla que contiene `total_price` y `balance_due`; RLS no demuestra por sí sola ocultamiento de columnas. “Mi Ruta” no debe solicitar, almacenar ni renderizar datos financieros. Antes de implementación se requiere una vista/RPC con `SELECT` explícito de campos permitidos o privilegios de columna equivalentes. `display: none` no es una barrera de seguridad.
4. **`ARQ-03 — Excepción de supervisor`.** El BRD permite una excepción del ADMIN y el SRS dibuja “Forzar Entrega”, pero el trigger descrito rechaza incondicionalmente todo `DELIVERED` con saldo positivo (`BRD-03`, `SRS-DB-02`, `SRS-POS-02`). El wireframe incluye la intención y la auditoría, pero la acción permanecerá marcada **“Contrato backend pendiente”** hasta existir una RPC transaccional, autorizada y auditable o hasta que el BRD retire la excepción. Nunca se implementará un bypass solo en cliente.
5. **`ARQ-04 — Sobrepago`.** El modelo permite insertar abonos y recalcula el saldo, pero las fuentes no documentan `CHECK`, trigger o RPC que impida que un abono exceda `balance_due`. El wireframe previene el sobrepago y lo marca como error; Isaias debe decidir el control equivalente en PostgreSQL antes de liberar Caja. La validación de React no es suficiente para proteger dinero.

# 1. Parámetros del Spec-Kit y Reglas de Handoff

## 1.1 Objetivo y límites de Etapa 1

La baja fidelidad valida jerarquía, secuencia, permisos, estados y consecuencias. No valida marca ni estética. Cada frame debe poder contestar, sin explicación verbal del diseñador: quién actúa, qué datos puede ver, qué acción está disponible, qué condición la habilita, qué ocurre durante la espera y cómo se recupera el usuario de un fallo.

Queda prohibido en esta etapa:

- Colores de marca, gradientes, sombras decorativas, fotografías, ilustraciones finales o iconografía propietaria.
- Tipografías de marca o decisiones de personalidad tipográfica. Se usará únicamente `[SYSTEM UI]` como marcador funcional.
- Usar rojo/amarillo/verde como único portador de significado. Los nombres semánticos “Alerta Roja” y “Alerta Verde” se conservan por trazabilidad, pero se representan con escala de grises, texto, patrón y grosor.
- Copiar datos reales de clientes, teléfonos, montos, comprobantes o UUID. Todos los datos son sintéticos y marcados como placeholders.
- Dibujar una acción que la base de datos o el rol no autoriza, aunque aparezca deshabilitada, salvo que el frame documente explícitamente un estado bloqueado requerido.
- Considerar ocultamiento CSS como autorización. Una acción prohibida debe omitirse del árbol de componentes/DOM y la operación debe ser rechazada en servidor.

## 1.2 Sistema de grilla de 8 puntos

### Tokens espaciales

| Token | Valor | Uso permitido |
|---|---:|---|
| `space-0` | 0 px | Ausencia deliberada de separación. |
| `space-1` | 8 px | Separación interna mínima entre icono y etiqueta. |
| `space-2` | 16 px | Padding móvil y separación entre controles relacionados. |
| `space-3` | 24 px | Gutter de escritorio y separación entre bloques. |
| `space-4` | 32 px | Padding de panel/modales. |
| `space-5` | 40 px | Separación de secciones compactas. |
| `space-6` | 48 px | Separación de secciones principales. |
| `space-8` | 64 px | Ritmo vertical amplio de Landing. |
| `space-10` | 80 px | Separación excepcional de secciones de adquisición. |

No se aceptan valores arbitrarios fuera de múltiplos de 8, excepto: bordes de 1/2/4 px; dimensiones físicas del PDF; y ancho de columnas resultante de la grilla.

### Escritorio — 12 columnas

- Frame rector: 1440 px. QA responsivo adicional: 1280 px y 1920 px.
- Márgenes laterales: 48 px en 1440; contenedor máximo 1344 px.
- Doce columnas fluidas; gutter 24 px.
- Sidebar POS: columnas 1–2. Área principal: columnas 3–12. En vista sin sidebar, contenido: columnas 1–12.
- Header operativo: 64 px de alto. Barra de filtros: mínimo 56 px. Contenido inicia con 24 px de separación.
- Modales: 6 columnas (aprox. 648 px en frame rector), centrados; máximo 80% del alto del viewport; contenido con scroll interno y acciones siempre visibles al pie.

### Móvil — 4 columnas

- Frame rector: 360×800 px en orientación portrait. QA adicional: 320, 390 y 430 px de ancho.
- Márgenes: 16 px; cuatro columnas fluidas; gutter 16 px.
- Contenido principal: columnas 1–4. Ningún control crítico se presenta en dos columnas si reduce su hitbox o claridad.
- Barra superior: 56 px. Navegación inferior, si aplica: 64 px más `env(safe-area-inset-bottom)`.
- Acciones primarias: ancho de columnas 1–4; alto visual mínimo 56 px. En entrega física, el hitbox obligatorio es ≥60×60 px (`SRS-PWA-02`).
- El frame documentará safe areas superior e inferior; el FAB nunca invade la navegación del sistema.

## 1.3 Sistema monocromático y semántica estructural

| Token | Valor de referencia | Uso en wireframe |
|---|---|---|
| `gray-000` | `#FFFFFF` | Fondo base y superficies. |
| `gray-100` | `#F2F2F2` | Superficie secundaria/skeleton. |
| `gray-300` | `#C8C8C8` | Bordes pasivos y disabled. |
| `gray-500` | `#808080` | Texto auxiliar y controles secundarios. |
| `gray-700` | `#3F3F3F` | Texto principal y bordes activos. |
| `gray-900` | `#111111` | Máximo énfasis, bloqueo y acciones primarias. |

La aprobación no depende de estos hexadecimales; sirven para impedir color accidental. Toda criticidad debe tener redundancia:

- **Vencido / bloqueado:** borde continuo 4 px `gray-900` + trama diagonal + etiqueta textual en mayúsculas.
- **Vence mañana / advertencia:** borde 2 px discontinuo + etiqueta “VENCE MAÑANA”.
- **Normal / tiempo suficiente:** borde 1 px `gray-500` + etiqueta “EN TIEMPO”.
- **Autorizado:** borde doble 4 px + icono geométrico placeholder `[CHECK]` + texto “AUTORIZADO”.
- **Error:** borde 2 px `gray-900`, icono `[!]`, título explícito y acción de recuperación. Nunca solo un cambio de tono.

## 1.4 Placeholders y contenido de prueba

| Tipo | Sintaxis obligatoria | Ejemplo |
|---|---|---|
| Imagen/logo | Caja con relación de aspecto y etiqueta | `[LOGO PLACEHOLDER — NO ASSET REAL]` |
| Cámara | Superficie 4:3 tramada | `[CAMERA FEED — HARDWARE]` |
| Icono | Nombre entre corchetes | `[QR]`, `[TORCH]`, `[LOCK]` |
| Cliente | Dato sintético | `[CLIENTE DEMO 01]` |
| Dinero | Valor de prueba marcado | `$500.00 [DATO DEMO]` |
| Identificador | Token opaco, nunca UUID real | `[PAYLOAD_OPACO_DE_ORDEN]` |
| Producto | Descripción sintética | `[LONA 2×3 M — DEMO]` |
| Contenido faltante | Etiqueta y dimensión | `[IMAGEN SERVICIO 4:3 — PLACEHOLDER]` |

Los wireframes deben incluir variantes con texto largo (cliente de 150 caracteres según esquema), importes grandes, fecha/hora, y nombres de producto en dos líneas. El truncamiento visual debe conservar acceso al valor completo mediante expansión o detalle; nunca debe truncar saldo, estado o fecha pactada.

## 1.5 Nomenclatura de archivos, frames y componentes

- Archivo: `PF_[FASE]_[SUPERFICIE]_WF_vNN`.
- Frame: `PF/[Fase]/[Viewport]/[Flujo]/[Pantalla]/[Estado]`.
- Componente: `PF/[Surface]/[Component]/[Variant]/[State]`.
- Ejemplos: `PF/PWA/Button/DeliveryConfirm/Loading`, `PF/POS/Input/PaymentAmount/Error`, `PF/Landing/Card/Service/Default`.
- Estados válidos: `Default`, `Hover`, `Focus`, `Disabled`, `Loading`, `Error`, `Empty`, `Offline`, `Success`. Aunque Hover no exista en hardware táctil, debe documentarse como “no aplicable en touch; equivalente de puntero en desktop”.
- Propiedades booleanas: `isOnline`, `isSubmitting`, `isAuthorized`, `isExpired`, `hasCameraPermission`, `supportsTorch`, `hasData`.
- Propiedades de rol: `role=ADMIN|INSTALLER`. No se admite inferir permisos desde rutas, labels o elementos ocultos.

## 1.6 Contrato global de estados de componentes

Este contrato se hereda por todos los botones e inputs críticos. Cada pantalla agrega condiciones particulares.

### Botones críticos

| Estado | Representación y conducta obligatoria |
|---|---|
| Default | Borde 2 px, etiqueta verbal inequívoca, hitbox ≥48×48 px; para entrega ≥60×60 px. Acción disponible solo si precondiciones locales y de rol son verdaderas. |
| Hover | Escritorio/puntero: cambio de relleno `gray-000 → gray-100` y subrayado de etiqueta. En touch: N/A; no se simula hover persistente. |
| Focus | Contorno exterior 2 px con offset 2 px, visible por teclado. No se reemplaza por Hover. |
| Disabled | `disabled` nativo, `aria-disabled=true` cuando corresponda, borde/texto `gray-300`, sin eventos. Debe existir una razón visible. No se usa Disabled para acciones que el rol jamás posee: esas son `display: none`/no render. |
| Loading | Disabled inmediato, spinner monocromo de 16–24 px, etiqueta en verbo progresivo (“Registrando…”, “Validando…”). No crea una segunda petición. |
| Error | Se rehabilita solo si es seguro reintentar; conserva los valores del formulario; mensaje adyacente con causa recuperable y `role=alert`. |

### Inputs críticos

| Estado | Representación y conducta obligatoria |
|---|---|
| Default | Label persistente fuera del campo, borde 1 px, placeholder no sustituye label. |
| Hover | Borde 2 px en puntero; sin cambio de layout. |
| Focus | Borde 2 px + contorno exterior; ayuda y formato esperado visibles. |
| Disabled | Fondo `gray-100`, borde `gray-300`, valor legible, excluido de edición; razón visible. |
| Loading | El input queda bloqueado mientras la transacción dependiente está en curso; skeleton solo en lectura, nunca sobre un valor introducido. |
| Error | Borde 2 px, prefijo `[!]`, mensaje específico debajo; `aria-invalid=true` y vínculo `aria-describedby`. |

## 1.7 Reglas globales de datos, rendering y seguridad

1. La UI nunca calcula ni persiste el saldo como fuente de verdad. Inserta el pago; PostgreSQL recalcula `balance_due` (`SRS-DB-02`).
2. Las consultas de validación de entrega son `NetworkOnly`; sin red no hay autorización de salida (`SRS-PWA-01`). El App Shell puede cargar offline, los datos de saldo no.
3. El resultado de una lectura QR queda invalidado al salir del frame, perder conexión, vencer la sesión o completar la entrega. No se reutiliza una autorización cacheada.
4. Los elementos financieros dependen de `role=ADMIN`, excepto el saldo puntual que el SRS exige en la pantalla de bloqueo/autorización del escáner. “Mi Ruta” jamás recibe importes.
5. Todo `UPDATE status='DELIVERED'` depende de la respuesta de Supabase. Un cambio optimista no puede mostrar “entregado” antes del commit.
6. Errores de trigger/RLS no se traducen como éxito. Se presenta estado Error y se vuelve a consultar la orden antes de permitir reintento.
7. Cualquier texto proveniente de `notes`, cliente o producto se renderiza como texto escapado; no se inyecta HTML (`SRS-POS-02`).
8. Las acciones exclusivas de ADMIN no se montan para INSTALLER. La protección visual se acompaña de Protected Route y política/RPC de servidor.

## 1.8 Criterios de handoff y aprobación estructural

Un flujo solo se entrega a desarrollo si incluye:

- Frame base, estados Default/Loading/Error/Empty/Offline relevantes y anotaciones de 8pt grid.
- Matriz “dato → fuente Supabase → rol → condición de render → fallback”.
- Nombre exacto del componente, evento emitido, estado local y resultado esperado de Supabase.
- Anotación explícita `DOM: OMIT` para controles prohibidos y `DOM: DISABLED` para controles temporalmente indisponibles.
- Caso de red lenta, desconexión, sesión expirada, respuesta vacía, error RLS y conflicto concurrente.
- Criterios de aceptación observables y al menos un selector estable (`data-testid`) por control crítico.
- Revisión de accesibilidad: orden de foco, labels, mensajes `aria-live`, objetivo táctil y semántica no dependiente del color.
- Cero assets reales y cero decisiones de alta fidelidad.

# 2. Tareas de Emir: Especificaciones de PWA Móvil (Fase 4)

## 2.0 Arquitectura compartida de la PWA

- Shell portrait de cuatro columnas, disponible offline mediante `CacheFirst`; rutas de datos QR siempre `NetworkOnly` (`SRS-PWA-01`).
- Header de 56 px: nombre de vista, indicador `EN LÍNEA / SIN CONEXIÓN`, menú de sesión. No se muestran nombre de cliente ni saldo en el header persistente.
- Navegación inferior de dos destinos: `Escanear` y `Mi Ruta`. Oculta durante cámara activa si invade el viewport; el control “Cerrar escáner” permanece en header.
- Rol requerido: `INSTALLER`. Un `ADMIN` puede entrar solo si el producto decide reutilizar la PWA; no hereda controles de supervisor dentro del flujo móvil.
- Consulta de escaneo: mediante el contrato que resuelva `ARQ-01`; respuesta mínima: `status`, `balance_due` para el resultado de validación y campos de identificación estrictamente necesarios. No consultar `payments` (`SRS-RLS-01`).

## 2.1 Pantalla 1 — Login y advertencia de expiración de token (12 horas)

### Layout y grilla

- Frame `PF/F4/Mobile/Auth/Login/Default`.
- Header informativo: columnas 1–4, 56 px; `[LOGO PLACEHOLDER]` máximo 40×40.
- Bloque de autenticación: columnas 1–4, comienza a 96 px del borde superior, padding 16 px, separación vertical 16 px.
- Campos: correo y contraseña a ancho completo, alto 56 px. Botón “Iniciar sesión” a ancho completo, alto 56 px.
- Mensaje de seguridad de turno: bloque de texto bajo el submit: “La sesión caduca 12 horas después de iniciar sesión”. Fuente: TTL agresivo del SRS (`SRS-PWA-03`).

### Componentes y estados

| Componente | Default | Hover | Disabled | Loading | Error |
|---|---|---|---|---|---|
| `Input/Email` | Label “Correo”, teclado email, autocomplete username | Borde reforzado si hay puntero | Durante submit | Conserva valor y queda bloqueado | “Ingrese un correo válido” o error de autenticación general sin revelar existencia de cuenta |
| `Input/Password` | Label “Contraseña”, contenido oculto, autocomplete current-password | Borde reforzado | Durante submit | Bloqueado | “La contraseña es obligatoria”; credenciales inválidas se anuncian en bloque general |
| `Button/Login` | Habilitado solo con ambos campos sintácticamente válidos | Relleno gris claro | Campos inválidos, submit activo o usuario inactivo | `Iniciando sesión…` + spinner; una sola llamada | Recupera Default tras error; foco va al resumen de error |
| `Button/ShowPassword` | Icono `[SHOW]`, label accesible | Gray-100 | Durante submit | N/A | No altera el mensaje del campo |

### Lógica Supabase y rendering condicional

1. Enviar `supabase.auth.signInWithPassword()`; no almacenar credenciales en estado persistente (`SRS-POS-01` aplica al mismo proveedor de Auth).
2. Tras sesión válida, consultar perfil `users`; si `is_active=false` o el rol no permite la PWA, cerrar sesión y mostrar “Acceso no autorizado”.
3. Registrar `expires_at` del JWT. La expiración dura 12 horas (`SRS-PWA-03`).
4. **Decisión de UX de prototipo:** mostrar banner persistente cuando resten ≤30 minutos. El umbral no es regla de negocio y debe quedar configurable; el TTL de 12 horas sí es obligatorio.
5. A `expires_at`, limpiar estado sensible, detener cámara, invalidar cualquier resultado de QR y redirigir a Login con mensaje “Sesión vencida. Inicie sesión nuevamente”.
6. El botón “Extender sesión” **no se renderiza**: el SRS exige volver a iniciar sesión al siguiente turno.

### Edge cases

- Sin red: el shell carga; el formulario muestra “Se requiere conexión para iniciar sesión”; submit disabled.
- Credenciales inválidas: no indicar cuál dato falló.
- Token vence durante un escaneo: cancelar consulta/acción, desmontar confirmación y volver a Login.
- Reloj local incorrecto: la autoridad es la expiración/validación del servidor, no solo el timer del dispositivo.

### Criterios verificables

- E2E confirma una sola solicitud pese a doble tap.
- A las 12 horas la PWA no conserva acceso ni autorización escaneada.
- INSTALLER inactivo o no autorizado no llega al escáner.

## 2.2 Pantalla 2 — Escáner QR y controles de hardware

### Layout y grilla

- Frame `PF/F4/Mobile/Scanner/Ready/Default`.
- Header: columnas 1–4, 56 px; título “Escanear entrega” y cierre.
- Camera viewport: columnas 1–4, relación 4:3, mínimo 288 px de alto en frame 360; placeholder tramado `[CAMERA FEED — NO IMAGE REAL]`.
- Retícula de lectura: cuadrado centrado, 224×224 px en 360; cuatro esquinas de 24 px, grosor 4 px. No implica área real del decoder.
- Ayuda: columnas 1–4, 16 px debajo de cámara.
- Controles: `Torch` y `Reintentar permiso`, cada uno ≥48×48 px; no se superponen al área de cámara.

### Componentes y estados

| Componente | Default | Hover | Disabled | Loading | Error |
|---|---|---|---|---|---|
| `Button/Torch` | `[TORCH] Linterna apagada`; solo si hardware reporta soporte | Gray-100 | Cámara no activa o capability temporalmente no disponible | `Cambiando…`, bloqueado | “No fue posible controlar la linterna” y vuelve a estado seguro |
| `Button/CameraPermission` | “Abrir ajustes de cámara” tras denegación | Gray-100 | Mientras se consulta permiso | Spinner + “Comprobando…” | Instrucciones específicas del navegador; no bucle automático de prompts |
| `Button/CloseScanner` | Cierra stream y vuelve a ruta | Gray-100 | Durante commit de entrega | N/A | Si falla el cierre lógico, detener tracks de hardware de todas formas |
| `Scanner/Decoder` | Escucha un QR por vez | N/A | Mientras valida payload | Overlay “Validando código…”; stream puede pausarse | QR inválido, no reconocido, red o sesión; ofrece “Escanear de nuevo” |

### Hardware y flujo

1. Solicitar cámara solo por una acción o entrada clara a la vista. Usar lente trasera `facingMode: environment` (`SRS-PWA-01`).
2. Si permiso es `denied`, desmontar el viewport real; mostrar placeholder y guía para ajustes. No repetir el prompt en cada render.
3. `Torch` se renderiza solo si `track.getCapabilities().torch === true`; si no existe soporte, `DOM: OMIT` (`SRS-PWA-03`).
4. Al detectar un código, vibrar 200 ms cuando `navigator.vibrate` exista; la vibración es feedback complementario (`SRS-PWA-01`).
5. Bloquear lecturas subsecuentes mientras se valida la primera. Normalizar el payload según el contrato `ARQ-01`; no aceptar URLs arbitrarias ni ejecutar contenido del QR.
6. Realizar consulta viva `NetworkOnly`. Nunca resolver el saldo desde Cache Storage, IndexedDB ni Zustand persistido.

### Edge cases y empty states

- Sin internet: overlay opaco sobre cámara; mensaje exacto del SRS: “Sin conexión. Muévase a un área con cobertura para validar la entrega”; no existe control de entrega (`SRS-PWA-01`).
- QR no reconocido/404: “Código QR no reconocido”; acción “Escanear de nuevo” (`SRS-PWA-03`).
- Poca luz: mostrar Torch solo si soportado; texto “Limpie la lente o acerque el código”.
- Cámara ocupada por otra app: error recuperable y botón “Reintentar cámara”.
- Payload repetido: ignorar duplicados hasta que el usuario cierre el resultado.
- Respuesta tardía tras abandonar la vista: cancelar o ignorar por `requestId`; nunca montar un resultado obsoleto.

## 2.3 Pantalla 3 — Alerta Roja / Strict Lock

### Condición de entrada

Se monta únicamente tras una lectura viva y autorizada que devuelva `balance_due > 0`. Esta pantalla materializa la Regla de Oro del BRD y el trigger de PostgreSQL (`BRD-01`, `BRD-04`, `SRS-DB-02`, `SRS-PWA-02`).

### Layout monocromático

- Frame `PF/F4/Mobile/Delivery/Blocked/Default`.
- Contenedor de columnas 1–4, borde continuo 4 px `gray-900`, trama diagonal 8 px y encabezado `[LOCK] ENTREGA BLOQUEADA`.
- Saldo: bloque central de alto mínimo 96 px, label persistente y valor completo. Aunque el estado se denomine “Rojo”, no se utiliza color.
- Mensaje operativo: “El sistema impide la entrega. Solicite la liquidación y la aprobación del cobro por el administrador.”
- Acciones disponibles: “Volver a escanear” y, si está en línea, “Revalidar saldo”. No existe acceso a registrar pagos.

### Restricción absoluta del DOM

```text
if balance_due > 0:
    render(BlockedDeliveryPanel)
    omit(DeliveryConfirmButton)     // no hidden, no disabled: no se instancia
    omit(SupervisorOverrideButton)  // INSTALLER nunca recibe esta acción
```

Está prohibido usar `visibility:hidden`, opacidad 0, desplazar fuera del viewport o dejar un handler accesible. El componente, su listener y su mutación deben estar ausentes. El backend conserva el trigger como última barrera. La prueba E2E debe buscar el selector y obtener cero nodos (`SRS-QA-01`).

### Componentes y estados críticos

| Componente | Default | Hover | Disabled | Loading | Error |
|---|---|---|---|---|---|
| `Button/RevalidateBalance` | Disponible online | Gray-100 | Offline o consulta activa | `Revalidando…` + spinner | Conserva pantalla bloqueada; nunca degrada a autorizado |
| `Button/ScanAnother` | Vuelve al escáner y descarta resultado | Gray-100 | Durante consulta/commit | `Cerrando…` si requiere detener operación | Mantiene bloqueo y permite recarga segura |
| `DeliveryConfirmButton` | **NO RENDER** | **NO RENDER** | **NO RENDER** | **NO RENDER** | **NO RENDER** |

### Edge cases

- `balance_due=null`, NaN o tipo inesperado: tratar como indeterminado, nunca como cero; pantalla “No se pudo validar el saldo”, sin entrega.
- `balance_due<0`: no asumir autorización; es una inconsistencia financiera (posible sobrepago) y se bloquea para revisión ADMIN.
- Cambio en Realtime a $0: no transformar automáticamente el panel en autorizado; ejecutar reconsulta `NetworkOnly` y montar Pantalla 4 solo con respuesta vigente.
- Error 500 del trigger: mostrar “Entrega rechazada por el sistema”; no revelar stack ni SQL.

## 2.4 Pantalla 4 — Alerta Verde / Clearance

### Condición de entrada

Se monta solo si una consulta viva devuelve simultáneamente: sesión INSTALLER válida, conexión disponible, `balance_due === 0` y orden en estado entregable. Para este Spec-Kit, “entregable” significa `READY_FOR_DELIVERY`; si negocio desea entregar desde otro estado, requiere cambio explícito del contrato.

### Layout monocromático

- Frame `PF/F4/Mobile/Delivery/Cleared/Default`.
- Contenedor columnas 1–4, borde doble 4 px, icono `[CHECK]`, título “AUTORIZADO PARA ENTREGA”.
- Mensaje: “PAGO CONFIRMADO. Saldo: $0.00” (`SRS-PWA-02`).
- Botón `Confirmar entrega física`: columnas 1–4, alto visual 64 px; hitbox mínimo 60×60 px, separación inferior 24 px más safe area.
- No se muestra bitácora de pagos, método, total ni precio.

### Estados de confirmación

| Estado | Especificación |
|---|---|
| Default | Etiqueta “Confirmar entrega física”; habilitado bajo las cuatro precondiciones. |
| Hover | Gray-100 y subrayado en puntero; N/A en touch. |
| Disabled | Conexión perdida, token cercano a invalidación efectiva, estado ya cambiado o request en vuelo. Motivo visible. |
| Loading | Disabled inmediato, spinner y “Confirmando entrega…”. Enviar un solo `UPDATE status='DELIVERED'`; no mostrar éxito optimista. |
| Error | Mantener la orden sin confirmación visual; mostrar causa genérica, volver a consultar saldo/estado y habilitar reintento solo tras respuesta válida. |
| Success | Sustituir el botón por panel estático “Entrega registrada” + timestamp del servidor; acción “Escanear otro”. |

### Concurrencia y seguridad

- La UI no confía en el saldo leído antes de la pulsación como autorización definitiva. El trigger valida durante el `UPDATE` (`SRS-DB-02`).
- Si pago y entrega coinciden, aceptar solo el resultado comprometido de PostgreSQL; el row-level locking resuelve el orden (`SRS-DB-02`).
- Si otra sesión ya entregó la orden, mostrar “La entrega ya había sido registrada”; no reintentar mutation.
- El resultado exitoso desaparece de “Mi Ruta” por Realtime o reconsulta, sin F5.

## 2.5 Pantalla 5 — Kanban móvil “Mi Ruta”

### Layout y contenido permitido

- Frame `PF/F4/Mobile/Route/List/Default`.
- Header: título “Mi Ruta”, fecha del día e indicador de conexión.
- Filtros permitidos: `Hoy` y `Próximas`, sin filtros financieros.
- Lista de una sola columna. Tarjeta: columnas 1–4, padding 16 px, separación 16 px.
- **Contenido visible exacto por instrucción de alcance:** producto y fecha pactada. Cliente, dirección, total, saldo, abonos y método de pago no se renderizan.
- Orden: `promised_date ASC`; fuente: órdenes `READY_FOR_DELIVERY` (`SRS-PWA-02`).

### Contrato de datos mínimo

```text
RouteOrderDTO = {
  route_item_token,   // opaco; no ID enumerado
  product_label,
  promised_date
}
```

La consulta no usa `SELECT *`. Debe consumir la vista/RPC aprobada en `ARQ-02`. En memoria y telemetría tampoco se guardan importes. El hecho de no dibujar dinero no corrige una respuesta excesiva del servidor.

### Semáforo estructural sin color

- Hoy o vencido: borde 4 px + trama diagonal + `VENCE HOY` o `VENCIDO` (`BRD-01`).
- Mañana: borde discontinuo 2 px + `VENCE MAÑANA`.
- Pasado mañana o posterior: borde 1 px + `EN TIEMPO`.
- Orden temporal prevalece sobre estilo; tarjetas críticas van primero si comparten el mismo filtro.

### Estados y edge cases

| Estado | Representación |
|---|---|
| Loading | Tres skeleton cards monocromáticas; no valores falsos. |
| Empty | `[EMPTY] No hay instalaciones listas para entrega` + acción “Actualizar”. |
| Offline sin snapshot autorizado | “Sin conexión. La ruta no puede actualizarse”; no mostrar datos sensibles cacheados. |
| Error de red | Panel `[!] No pudimos cargar Mi Ruta`; botón “Reintentar”. |
| Realtime desconectado | Lista permanece marcada “Datos no actualizados”; reconsulta manual. |
| Fecha nula | La orden va a “Datos incompletos”; no se inventa fecha. Es inconsistencia porque `promised_date` es obligatoria (`BRD-04`). |

`Button/RefreshRoute` implementa Default, Hover, Disabled offline, Loading con spinner y Error con reintento. Ninguna tarjeta contiene control de cobro o excepción.

# 3. Tareas de Emir: Especificaciones del Panel Web POS (Fase 3)

## 3.0 Shell administrativo común

- Grid de 12 columnas. Sidebar columnas 1–2; header y contenido columnas 3–12.
- Ruta protegida `requiredRole="ADMIN"`; INSTALLER enviado a “Acceso denegado” y sin montaje de componentes financieros (`SRS-POS-01`).
- Timeout de inactividad de 30 minutos en POS; al vencer, cerrar sesión, cerrar modales y borrar borradores financieros de memoria (`SRS-POS-01`).
- Supabase Realtime alimenta el Kanban; operaciones de caja esperan confirmación de base de datos.
- ErrorBoundary global reemplaza el área dañada con mensaje y acción de recarga; nunca una pantalla blanca (`SRS-POS-02`).

## 3.1 Pantalla 1 — Dashboard Kanban

### Layout de 12 columnas

- Header operativo: columnas 3–12, 64 px. Incluye título, búsqueda, conexión Realtime y sesión.
- Filtros: columnas 3–12, 56 px. Fecha, estado y búsqueda; ningún filtro modifica datos.
- Tablero: columnas 3–12. Cuatro carriles horizontales según enum: `PENDING_DEPOSIT`, `IN_PRODUCTION`, `READY_FOR_DELIVERY`, `DELIVERED`. Por defecto, `DELIVERED` puede colapsarse porque el SRS indica que la tarjeta desaparece del Kanban activo tras entrega (`SRS-POS-01`).
- Cada carril: mínimo 248 px; scroll horizontal desde 1280 si el ancho no permite legibilidad. Tarjetas con padding 16 px, gap 16 px.
- Dentro de cada carril: `promised_date ASC`; no ordenar por llegada si contradice la fecha pactada.

### Tarjeta de pedido

Muestra identificador humano no enumerante, cliente, producto/resumen, fecha/hora pactada, estado y saldo solo porque el usuario es ADMIN. Acciones primarias: abrir detalle y registrar abono. Cambiar fecha y forzar reglas viven exclusivamente en Acciones Avanzadas.

### Semaforización estructural en grises

| Condición | Representación obligatoria | Label |
|---|---|---|
| `isPast(promisedDate)` | Borde continuo negro 4 px + trama diagonal en cabecera | `VENCIDO` |
| `isToday(promisedDate)` | Borde continuo negro 4 px + barra superior sólida | `VENCE HOY` |
| `isTomorrow(promisedDate)` | Borde discontinuo 2 px | `VENCE MAÑANA` |
| Posterior | Borde 1 px gris medio | `EN TIEMPO` |
| Fecha inválida/nula | Borde doble 4 px + `[!]` | `FECHA INVÁLIDA` |

La frontera de día debe calcularse en la zona horaria operativa configurada, no en UTC visual. El SRS prescribe comparación con fecha actual y las categorías (`SRS-POS-01`); la zona horaria debe quedar como configuración técnica aprobada.

### Indicador WebSocket/Realtime

Ubicación: extremo derecho del header, mínimo 160×40 px.

| Estado | Forma | Conducta |
|---|---|---|
| Connected | Círculo sólido + “EN TIEMPO REAL” | Sin acción. |
| Connecting | Círculo con anillo + “CONECTANDO…” | Spinner; filtros disponibles. |
| Disconnected | Círculo vacío + “SIN TIEMPO REAL” | Banner persistente; botón “Reconectar”. No fingir actualización. |
| Error | `[!]` + “ERROR DE CONEXIÓN” | Reintento exponencial y acción manual; Sentry/log técnico sin datos financieros. |

Las tarjetas nuevas aparecen y las entregadas salen sin F5 (`SRS-POS-01`). Tras reconexión se ejecuta una consulta completa para cubrir eventos perdidos.

### Controles críticos

| Control | Default | Hover | Disabled | Loading | Error |
|---|---|---|---|---|---|
| `Input/SearchOrders` | Label persistente, búsqueda por texto | Borde 2 px | Durante cierre de sesión | Indicador inline si consulta remota | Mensaje sin borrar término |
| `Input/DateFilter` | Fecha local, opción “Todas” | Borde 2 px | Fuente no disponible | Skeleton del filtro | “No se pudo aplicar” |
| `Button/RegisterPayment` | Solo ADMIN y orden no entregada | Gray-100 | Orden entregada o modal activo | “Abriendo…” si carga detalle | Toast/panel y conserva tarjeta |
| `Button/ReconnectRealtime` | Solo desconectado | Gray-100 | Conectando | Spinner | Permanece visible |

### Empty y error states

- Carril vacío: caja `[EMPTY] Sin pedidos en este estado`; conserva encabezado y conteo 0.
- Tablero sin órdenes: mensaje global y acción “Crear/ingresar pedido” solo si esa función forma parte del alcance implementado; si no, “No hay pedidos activos”.
- Error parcial de un carril: no derriba el tablero; muestra bloque de error dentro del carril.
- Campo nulo inesperado: ErrorBoundary local; jamás ocultar silenciosamente una tarjeta con fecha crítica (`SRS-POS-02`).

## 3.2 Pantalla 2 — Modal de Transacción (Caja)

### Layout

- Modal de 6 columnas, máximo 648 px, padding 32 px.
- Header fijo: “Registrar abono” + identificador de orden.
- Resumen de solo lectura: total, abonos acumulados y saldo actual. La lista completa de pagos es ADMIN-only (`SRS-RLS-01`).
- Formulario: `Monto` numérico/decimal y `Método de pago` con CASH, TRANSFER, CARD; botón primario “Registrar abono” y secundario “Cancelar” (`SRS-DB-01`, `SRS-POS-01`).
- Footer de acciones sticky dentro del modal.

### Validación

- `amount` obligatorio, decimal monetario, >0, máximo dos decimales.
- `payment_method` obligatorio y limitado al enum documentado.
- **Gate financiero:** el esquema no documenta constraint contra sobrepago. El wireframe bloquea `amount > balance_due` como prevención visible, pero Isaias debe aprobar un constraint/RPC equivalente; de otro modo el trigger podría producir saldo negativo. Esta decisión se registra como `ARQ-04`.
- El frontend no envía `balance_due`; solo inserta el pago. El trigger calcula el nuevo saldo (`SRS-POS-01`, `SRS-DB-02`).
- No existe edición o borrado de pagos: `payments` es append-only (`SRS-DB-01`).

### Estados de componentes

| Control | Default | Hover | Disabled | Loading | Error |
|---|---|---|---|---|---|
| `Input/PaymentAmount` | Label “Monto del abono”, prefijo `$`, ayuda de saldo | Borde 2 px | Submit activo o saldo indeterminado | Bloqueado; conserva valor | Vacío, ≤0, formato inválido o sobrepago; mensaje específico |
| `Select/PaymentMethod` | Placeholder “Seleccione método” | Borde 2 px | Submit activo | Bloqueado | “Seleccione efectivo, transferencia o tarjeta” |
| `Button/SubmitPayment` | Habilitado si formulario válido y sesión ADMIN | Gray-100 | Inválido, offline, request activo | **Disabled inmediato + spinner + “Registrando abono…”** | Se rehabilita solo tras respuesta de error; conserva datos |
| `Button/Cancel` | Cierra sin mutar | Gray-100 | Desde el envío hasta respuesta | No muestra spinner | Si la transacción es incierta, no cerrar; solicitar verificación |

### Contrato anti-doble clic

En el mismo tick del primer submit: establecer `isSubmitting=true`, deshabilitar controles y usar una guard clause que rechace eventos posteriores. Una respuesta 200 cierra el modal y muestra confirmación; un error lo reabre al estado editable. El botón nunca se habilita por timeout arbitrario (`SRS-POS-01`, `SRS-QA-01`). Se recomienda idempotency key/RPC en backend; el bloqueo cliente no reemplaza integridad transaccional.

### Edge cases

- Red cae después de enviar: estado “Resultado incierto”; consultar pagos/orden antes de reintentar para evitar duplicado.
- Saldo cambia por otra sesión mientras modal está abierto: antes de insertar, refrescar/validar en RPC; si ya es 0, cerrar sin pago.
- Supabase rechaza por RLS: “Sesión sin permiso”; cerrar sesión si el rol cambió.
- Transferencia no comprobada: UI recuerda que la verificación es manual por ADMIN; no presume validación SPEI (`BRD-05`).

## 3.3 Pantalla 3 — Layout del Ticket PDF

### Geometría exacta

- Formato: Carta vertical, 216×279 mm. Origen `(0,0)` en esquina superior izquierda.
- Safe margin: 12 mm en los cuatro lados. Área útil: 192×255 mm.
- Grilla de impresión: 12 columnas; gutter 4 mm; ancho de columna 12.33 mm.
- Todo elemento vectorial/textual es negro, blanco o gris. En wireframe, el logo es un rectángulo rotulado; no se inserta asset real.

### Zonas

1. **Header, y=12–48 mm.** Logo placeholder `x=12, y=12, w=44, h=20`. Datos de emisión `x=152, y=12, w=52`. Banda de fecha pactada `x=12, y=36, w=192, h=12`, con texto completo “FECHA PACTADA DE ENTREGA: [DD/MM/AAAA HH:MM]” (`BRD-02`, `SRS-POS-02`).
2. **Datos de orden, y=56–80 mm.** Dos bloques de seis columnas: identificación y cliente. Los saltos de línea crecen hacia abajo; no se usa altura fija si el nombre envuelve.
3. **Tabla de productos, y≥88 mm.** Columnas: descripción 96 mm, cantidad 24 mm, precio unitario 32 mm, importe 40 mm. Header repetible, bordes 1 px, filas expansibles. No cortar una fila entre páginas.
4. **Resumen financiero.** Anclado después de la tabla, no en coordenada rígida: subtotal, abonos registrados y saldo pendiente, alineados a la derecha. El saldo usa borde 4 px y label en mayúsculas; no depende de rojo (`BRD-02`, `SRS-POS-02`).
5. **Zona QR fija en última página.** Caja total `x=164, y=227, w=40, h=40 mm`; QR visual `x=168, y=231, w=32, h=32 mm`, dejando quiet zone de 4 mm. Esquina inferior derecha dentro del safe margin. Label bajo/sobre QR: “ESCANEAR PARA VALIDAR ENTREGA”. Ningún texto o total invade esta caja.

### Payload QR

El prototipo muestra `[PAYLOAD_OPACO_DE_ORDEN]`. No usa URL y no expone PII. La semántica final queda bloqueada por `ARQ-01`. El generador debe validar que el token corresponda a la orden y que el QR tenga contraste negro/blanco suficiente; no aplicar tramas dentro del código.

### Estados de generación

| Control | Default | Hover | Disabled | Loading | Error |
|---|---|---|---|---|---|
| `Button/GeneratePDF` | ADMIN, orden cargada | Gray-100 | Datos requeridos incompletos | Spinner + “Generando PDF…” | “No se pudo generar”; no descargar archivo parcial |
| `Button/DownloadPDF` | Disponible tras generación válida | Gray-100 | Sin blob válido | “Preparando…” | Revoca blob corrupto y ofrece regenerar |

### Casos de borde y aceptación

- Sin abonos: mostrar “Anticipos registrados: $0.00”; no omitir la fila.
- Saldo $0: conservar el campo “SALDO PENDIENTE: $0.00”.
- Tabla multipágina: repetir header y reservar la zona QR solo en la última página.
- Producto largo: wrap; nunca solapar cantidad/precios.
- Falla del QR: cancelar PDF y mostrar Error. No producir una remisión que no pueda validarse.
- Prueba: escaneo a 100% de impresión, 80% y fotografía inclinada; el contenido debe resolver al mismo token.

## 3.4 Pantalla 4 — Panel de Excepciones / Modo Supervisor

### Acceso y layout

- `PF/F3/Desktop/Supervisor/Advanced/Closed`: botón “Acciones avanzadas” solo para `role=ADMIN`.
- Para INSTALLER: ruta, botón y componentes son `DOM: OMIT`; un acceso manual recibe “Acceso denegado” (`SRS-POS-01`, `SRS-RLS-01`).
- Apertura requiere reautenticación/confirmación. Panel lateral de columnas 8–12 o modal de 6 columnas; nunca mezclado con acciones ordinarias (`SRS-POS-02`).
- Cada excepción muestra impacto, actor, timestamp y necesidad de auditoría antes del CTA.

### Excepción A — Modificar fecha pactada

- `Input/PromisedDate`: datetime obligatorio; valor actual visible y no editable hasta reautenticar.
- `Textarea/ChangeReason`: label “Razón del cambio”, contador, sin placeholder como única instrucción. Validación `trim().length > 0`.
- `Button/SaveDateChange`: **Disabled** mientras razón esté vacía, solo espacios, fecha inválida/no modificada, reautenticación incompleta, offline o submit activo (`BRD-04`, `SRS-POS-02`).

| Control | Default | Hover | Disabled | Loading | Error |
|---|---|---|---|---|---|
| `Input/PromisedDate` | Fecha/hora editable tras auth | Borde 2 px | Sin auth o submit | Bloqueado | “Seleccione una fecha válida” |
| `Textarea/ChangeReason` | Vacío, label y obligación visibles | Borde 2 px | Sin auth o submit | Bloqueado, conserva texto | “La justificación es obligatoria”; solo espacios no cuentan |
| `Button/SaveDateChange` | Activo solo con formulario válido | Gray-100 | Condiciones anteriores | Spinner + “Guardando…” | Rehabilita; no borra justificación |

El éxito muestra fecha anterior, nueva, razón y usuario, confirmando bitácora.

### Excepción B — Iniciar producción sin anticipo

- CTA “Autorizar inicio sin anticipo mínimo”.
- Requiere reautenticación y justificación escrita aunque el SRS solo explicita razón para fecha; la necesidad de autorización manual firmada proviene del BRD (`BRD-04`). El mecanismo de firma debe definirse antes de implementación.
- No altera el saldo ni crea un pago ficticio.

### Excepción C — Forzar entrega con saldo

- Estado visible en wireframe, pero CTA rotulado `BLOQUEADO — CONTRATO BACKEND PENDIENTE (ARQ-03)`.
- No se habilita mediante frontend ni service role expuesta. Si se aprueba, debe ejecutarse en backend transaccional, verificar ADMIN reautenticado, requerir justificación, registrar saldo, actor, fecha y razón, y devolver resultado auditable.
- El flujo jamás aparece en PWA INSTALLER.

### Inventario de controles críticos del modo supervisor

| Control | Default | Hover | Disabled | Loading | Error |
|---|---|---|---|---|---|
| `Button/AdvancedActions` | Visible solo a ADMIN; abre la barrera de reautenticación | Gray-100 | Sesión expirada o panel ya abierto | “Abriendo…” si consulta políticas | No abre el panel; muestra error de autorización |
| `Input/ReauthPassword` | Label persistente, valor oculto | Borde 2 px | Verificación activa | Bloqueado; conserva foco lógico | Mensaje genérico “No fue posible confirmar identidad” |
| `Button/ConfirmReauth` | Habilitado con credencial no vacía | Gray-100 | Vacío o request activo | Spinner + “Confirmando…” | Rehabilita con límite de intentos definido por Auth |
| `Button/AuthorizeProductionOverride` | Solo ADMIN reautenticado y formulario de justificación válido | Gray-100 | Sin firma/justificación, offline o request activo | Disabled + “Autorizando…” | No cambia estado; conserva evidencia introducida |
| `Button/ForceDeliveryOverride` | **Bloqueado por `ARQ-03` hasta contrato backend** | N/A mientras esté bloqueado | Siempre en esta versión del Spec-Kit | Solo existirá tras cierre de `ARQ-03` | Cualquier rechazo mantiene la orden no entregada |

### Estados generales y fallos

- Reautenticando: todos los campos disabled y spinner.
- Credencial incorrecta: panel permanece bloqueado; no filtra información adicional.
- Sesión vence con formulario abierto: borrar credenciales, conservar justificación solo en memoria temporal no sensible y exigir nuevo login.
- Error de red: no encolar overrides offline.
- Error de auditoría: la mutación se considera fallida; una excepción sin bitácora no puede ser éxito.

# 4. Tareas de Faride: Especificaciones de Landing Page (Fase 8)

## 4.0 Objetivo y arquitectura Top-of-Funnel

La Landing es pública y estática. Su única conversión primaria es abrir una conversación prellenada en WhatsApp; no registra pedidos, pagos ni datos personales en el servidor web. El catálogo visual y el inicio del flujo a WhatsApp pertenecen al alcance del BRD (`BRD-02`). El hosting estático mediante CDN permite esta transición sin carga en N8N, Supabase ni un servidor propio hasta que el usuario envía el mensaje dentro de WhatsApp (`INFRA-01`).

### Layout responsivo

- Desktop 1440: 12 columnas, márgenes 48 px, gutters 24 px; contenido máximo 1344 px.
- Mobile 360: 4 columnas, márgenes 16 px, gutters 16 px.
- Ritmo vertical: 64–80 px entre secciones en desktop; 48–64 px en mobile.
- Header público: 72 px desktop, 56 px mobile. Logo como placeholder.
- Todos los visuales de servicio son cajas grises 4:3 con label; no imágenes reales.

## 4.1 Sección 1 — Hero con propuesta de valor

### Desktop

- Texto: columnas 1–7. Placeholder de servicio: columnas 8–12.
- H1 funcional propuesto: “Cotiza tus impresos por WhatsApp y da seguimiento a tu pedido”.
- Soporte: “Lonas, viniles, papelería comercial y promocionales para menudeo y mayoreo.” La oferta corresponde al contexto del BRD.
- CTA principal: “Cotizar por WhatsApp”, ancho mínimo 240 px, alto 56 px.
- CTA secundario opcional: “Ver servicios”, ancla interna; no compite con WhatsApp.

### Mobile

- H1, soporte y CTA: columnas 1–4, orden vertical.
- Placeholder visual debajo del CTA, no antes.
- CTA ancho completo, alto 56 px.

### Sticky FAB

- Componente `PF/Landing/Button/WhatsAppFAB/*`.
- Posición: `position: fixed; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom));` en mobile; `right: 24px; bottom: 24px;` en desktop.
- Hitbox 56×56 px; label accesible “Cotizar por WhatsApp”. En wireframe usa `[WA]`, no logo real.
- Debe quedar por encima del contenido, pero por debajo de diálogos de consentimiento o sistema. No tapa CTAs, precio, navegación ni último renglón del footer; reservar padding inferior ≥96 px.
- Se oculta (`display:none`) si un modal legal bloqueante está abierto. No depende de estado de Supabase ni rol.

### Estados de CTA y FAB

| Estado | CTA principal | FAB |
|---|---|---|
| Default | Borde 2 px, label completo | Círculo/cuadrado 56 px con `[WA]` |
| Hover | Gray-100 + subrayado | Gray-100 + tooltip textual |
| Disabled | Solo si falta número de destino en configuración; mostrar “Contacto no disponible” | `display:none` si configuración inválida, para no abrir enlace roto |
| Loading | No hay request al servidor; transición breve “Abriendo WhatsApp…” tras activación | Igual; bloquear doble activación durante navegación |
| Error | Si navegación es bloqueada, mostrar link copiable y mensaje | Expandir panel con link copiable, sin enviar datos a backend |

## 4.2 Sección 2 — Catálogo de Servicios y deep links

### Estructura

- Desktop: tres tarjetas por fila, cuatro columnas cada una; gap 24 px.
- Mobile: una tarjeta, columnas 1–4; gap 16 px.
- Cada tarjeta: `[IMAGEN 4:3 PLACEHOLDER]`, nombre, descripción de dos líneas y botón “Cotizar [servicio]”.
- Categorías derivadas del BRD: gran formato (lonas/viniles), papelería comercial (tarjetas/flyers/folletos) y promocionales (`BRD-02` y contexto del BRD).
- Empty state de catálogo: “El catálogo no está disponible. Cotiza directamente por WhatsApp” + CTA genérico. Como la página es estática, el catálogo base debe estar embebido en build.

### Parametrización exacta del enlace

Formato:

```text
https://wa.me/<NUMERO_E164_SIN_SIGNO_MAS>?text=<MENSAJE_URL_ENCODED>
```

Mensaje fuente por tarjeta:

```text
Hola, vengo del sitio de Imprenta Escalante.
Quiero cotizar: [SERVICE_LABEL].
Referencia: source=landing;service_id=[SERVICE_ID];placement=[hero|catalog|fab].
```

Implementación de referencia:

```ts
const base = `https://wa.me/${WHATSAPP_E164}`;
const message = `Hola, vengo del sitio de Imprenta Escalante.\nQuiero cotizar: ${serviceLabel}.\nReferencia: source=landing;service_id=${serviceId};placement=${placement}.`;
const href = `${base}?text=${encodeURIComponent(message)}`;
```

Reglas:

- `WHATSAPP_E164` se inyecta en build, solo dígitos, país incluido; nunca hardcodear un número personal.
- `SERVICE_ID` proviene de una allowlist estática; no insertar texto libre del DOM en el enlace.
- Usar `<a href>` real. No `fetch`, XHR, Server Action, webhook de N8N ni escritura en Supabase.
- En desktop puede abrir nueva pestaña con `target="_blank" rel="noopener noreferrer"`; en móvil se permite navegación directa a app/web de WhatsApp.
- El click solo solicita navegación a `wa.me`. Meta recibe el mensaje cuando el usuario confirma/envía en WhatsApp. La Landing no afirma que el pedido ya fue creado.
- Si se requiere analítica, usar un evento cliente no bloqueante y sin PII; la navegación no depende de que ese evento termine. No se incluyen teléfonos o texto del usuario en telemetría.

### Estados del botón de tarjeta

Default: enlace válido y label específico. Hover: tratamiento gris y subrayado. Disabled: configuración o `service_id` inválido. Loading: máximo durante el intento de navegación, sin spinner de red prolongado. Error: muestra URL genérica copiable. No existe estado de “cotización enviada” en la Landing.

## 4.3 Sección 3 — Trust Factors

### Política de anticipos

Bloque de confianza, no promesa financiera ambigua:

> “Los pedidos personalizados requieren un anticipo del 50% para iniciar producción. El saldo restante debe quedar liquidado antes de la entrega.”

El 50% está explícito en el flujo y prompt del SRS; la entrega con saldo cero está exigida por el BRD (`BRD-04`, `SRS-PWA-02`). El wireframe no ofrece excepciones de crédito al público ni promete validación automática de transferencias, porque la verificación es manual (`BRD-05`).

### Proceso de tres pasos

1. **Cotiza por WhatsApp.** El usuario abre el deep link del servicio y comparte medidas/cantidad.
2. **Confirma y abona.** Tras aceptar la cotización, envía comprobante; el ADMIN valida el pago y el pedido puede pasar a producción bajo la política de anticipo.
3. **Recibe con saldo liquidado.** La fecha pactada se registra y la entrega se autoriza solo con saldo $0.

### Layout

- Desktop: tres pasos, cuatro columnas cada uno, conectores lineales en gris.
- Mobile: secuencia vertical de columnas 1–4; conectores verticales; números `01/02/03` en cajas grises.
- Tras el paso 3, CTA “Iniciar cotización por WhatsApp”.
- No usar sellos, testimonios, clientes o certificaciones no presentes en las fuentes.

### Edge cases y accesibilidad

- WhatsApp no instalado: `wa.me` abre versión web; si navegación falla, mostrar enlace copiable.
- JavaScript desactivado: anchors preconstruidos siguen funcionando.
- Texto grande/zoom 200%: FAB no cubre contenido; tarjetas pasan a una columna.
- URL excesiva: mantener mensaje prellenado breve y determinista; no incluir catálogo completo.
- Número no configurado: todos los enlaces WhatsApp se deshabilitan/omiten de forma coherente y se muestra contacto no disponible; no inventar un destino.

# 5. Checklist de Revisión — Junta Directiva

Isaias aprueba con evidencia, no por apreciación estética. Cualquier “No” detiene el paso a alta fidelidad y color.

| # | Gate técnico | Evidencia que debe presentar el equipo | Criterio de aprobación de Isaias | Resultado |
|---:|---|---|---|---|
| 1 | **Integridad financiera y candado de entrega** | Frames de saldo `>0`, `=0`, `<0`, nulo, offline y concurrencia; árbol del DOM; test E2E con selector estable; referencia al trigger. | Con deuda, `DeliveryConfirmButton` tiene cero nodos en DOM; sin red no hay autorización; con $0 el submit espera commit; PostgreSQL sigue siendo autoridad. `ARQ-03/04` resueltos o formalmente fuera de release. | ☐ Sí ☐ No |
| 2 | **RBAC, RLS y minimización de datos** | Matriz dato/rol/consulta; SQL o contrato de vista/RPC para “Mi Ruta”; rutas protegidas; prueba INSTALLER contra `payments` y campos financieros. | INSTALLER no puede leer pagos ni recibir total/saldo en “Mi Ruta”; ADMIN-only no se monta para INSTALLER. `ARQ-02` cerrado con control servidor, no CSS. | ☐ Sí ☐ No |
| 3 | **Estados, fallos y recuperación** | Component set completo Default/Hover/Focus/Disabled/Loading/Error; frames Empty/Offline; red lenta, token 12 h, permiso de cámara y QR inválido. | Ninguna acción crítica carece de espera, fallo y recuperación; pago bloquea doble clic; scanner `NetworkOnly`; sesión expirada invalida resultados. | ☐ Sí ☐ No |
| 4 | **Grilla, accesibilidad y baja fidelidad** | Overlay 8pt; 12 columnas desktop y 4 mobile; mediciones de hitbox; orden de foco y labels; inventario de placeholders. | Espaciado salvo excepciones usa múltiplos de 8; entrega ≥60×60; significado redundante sin color; cero marca, fotos, tipografía final o PII. | ☐ Sí ☐ No |
| 5 | **Contratos de integración y trazabilidad** | Mapa evento → Supabase/wa.me → respuesta; payload QR; estados Realtime; ticket PDF medido; links Landing verificados; matriz de referencias fuente. | `ARQ-01` resuelto; QR no expone ID indebido; PDF escaneable; WebSocket reconcilia tras reconexión; WhatsApp usa enlace directo sin backend; cada regla crítica remite a BRD/SRS/infra. | ☐ Sí ☐ No |

## Acta mínima de aprobación

| Campo | Registro |
|---|---|
| Versión revisada | `PF_SPEC_KIT_v__` |
| Prototipo vinculado | `[URL/ID DEL ARCHIVO DE WIREFRAME]` |
| Gates `ARQ-01` a `ARQ-04` | `[CERRADOS / PENDIENTES]` |
| Resultado | `[APROBADO / RECHAZADO]` |
| Observaciones obligatorias si se rechaza | `[TEXTO]` |
| Aprobador | Isaias — Líder Técnico |
| Fecha y firma | `[DD/MM/AAAA — FIRMA]` |

> **Regla de salida:** solo el resultado **APROBADO**, con los cinco gates en “Sí” y sin contradicciones de arquitectura abiertas que afecten seguridad o dinero, permite comenzar alta fidelidad. La aprobación visual no sustituye pruebas de DB, RLS, concurrencia ni E2E.
