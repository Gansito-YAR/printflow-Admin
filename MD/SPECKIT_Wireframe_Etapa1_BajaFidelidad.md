# Documento de Especificaciones de Prototipado — Wireframe Spec-Kit

**Proyecto:** PrintFlow AI — Sistema Integrado POS, PWA e Inteligencia Artificial para Imprenta Escalante  
**Etapa:** 1 — Baja Fidelidad (Wireframes Estructurales en Escala de Grises)  
**Clasificación:** Confidencial — Contiene lógica financiera y reglas de restricción de despacho  
**Preparado por:** Dirección UX/UI & Product Management  
**Fecha de Emisión:** 02 de Agosto de 2026  
**Versión:** v1.0  

---

| Campo | Detalle |
|---|---|
| **Documentos Fuente Analizados** | BRD v1.2 (Andri, 20/Jul/2026), SRS Fases 1-7 (Arquitectura y Documentación), Propuesta de Infraestructura y Costos (Ago/2026) |
| **Asignación de Equipo** | **Emir** (Full Stack): Panel Web POS (Fase 3) + PWA Móvil (Fase 4). **Faride** (Frontend/UI): Landing Page Pública (Fase 8) |
| **Herramienta de Wireframing** | Figma o Penpot (sin plugins de color corporativo habilitados) |
| **Revisión y Aprobación** | Isaias (Líder Técnico) mediante Checklist de §5 |

---

## 1. Parámetros del Spec-Kit y Reglas de Handoff

### 1.1. Sistema de Grilla (Grid System)

Todo wireframe producido bajo este Spec-Kit se construirá sobre un sistema de **8pt grid** (múltiplos de 8 píxeles para todos los valores de espaciado, padding, margin y dimensiones de componentes).

| Plataforma | Columnas | Gutter | Margen Lateral | Breakpoint de Referencia |
|---|---|---|---|---|
| **Escritorio (POS Web)** | 12 columnas | 24px (3 × 8pt) | 32px (4 × 8pt) por lado | ≥ 1280px de ancho |
| **Tablet (Fallback POS)** | 8 columnas | 16px (2 × 8pt) | 24px (3 × 8pt) por lado | ≥ 768px, < 1280px |
| **Móvil (PWA Instaladores)** | 4 columnas | 16px (2 × 8pt) | 16px (2 × 8pt) por lado | < 768px — forzar `orientation: portrait` según SRS §Fase 4, 1.1 |
| **Landing Page Desktop** | 12 columnas | 24px (3 × 8pt) | Máximo `max-width: 1200px`, centrado | ≥ 1024px |
| **Landing Page Mobile** | 4 columnas | 16px (2 × 8pt) | 16px (2 × 8pt) por lado | < 768px |

**Regla de Unidad Mínima:** Ningún valor dimensional en los wireframes puede ser inferior a 8px ni ser un número que no sea múltiplo de 8 (excepto bordes de 1px, 2px o 4px que se documentan explícitamente como excepciones en los componentes que los requieran).

### 1.2. Escala de Grises Obligatoria (Zero-Style Enforcement)

En esta etapa queda **estrictamente prohibido** el uso de:
- Colores de marca, HEX corporativos o valores HSL con saturación > 0.
- Tipografías de marca. Se usará la familia genérica `sans-serif` del sistema operativo en todos los wireframes.
- Imágenes reales, logotipos o fotografías de producto. Todo recurso visual se representará como un **rectángulo con aspa diagonal** (placeholder estándar de wireframing).

**Paleta de Grises Autorizada:**

| Token | Valor HEX | Uso |
|---|---|---|
| `$gray-000` | `#FFFFFF` | Fondos de contenido, modales |
| `$gray-100` | `#F5F5F5` | Fondos de sección, canvas alternos |
| `$gray-200` | `#E0E0E0` | Bordes de inputs en estado Default, divisores |
| `$gray-300` | `#BDBDBD` | Placeholder text, iconos deshabilitados |
| `$gray-400` | `#9E9E9E` | Labels secundarios, texto de ayuda |
| `$gray-600` | `#616161` | Texto de cuerpo, labels de inputs |
| `$gray-800` | `#424242` | Títulos, encabezados de sección |
| `$gray-900` | `#212121` | Texto de alta jerarquía, valores financieros |
| `$gray-950` | `#000000` | Bordes de estado "Vencido" (sustituto de rojo), fondos de alerta crítica |

**Regla de Semaforización en Baja Fidelidad:** Dado que no existe color, la semaforización de fechas pactadas (definida en el BRD §4, Criterio 2 y en el SRS §Fase 3, 3.2) se representará mediante pesos de borde:

| Estado Semáforo (Alta Fidelidad) | Representación Baja Fidelidad | Grosor de Borde |
|---|---|---|
| 🔴 Rojo — Vencido / Vence hoy | Borde negro sólido grueso + ícono `⚠` | `4px solid $gray-950` |
| 🟡 Amarillo — Vence mañana | Borde gris medio punteado + ícono `⏰` | `2px dashed $gray-600` |
| 🟢 Verde — Tiempo suficiente | Borde gris claro fino | `1px solid $gray-200` |

### 1.3. Nomenclatura de Componentes (Naming Convention)

Todo componente en el archivo de diseño seguirá la convención de naming BEM adaptada para Figma/Penpot:

```
[Plataforma]/[Módulo]/[Componente]--[Variante]--[Estado]
```

**Ejemplos concretos:**

| Componente | Nombre en Figma |
|---|---|
| Botón de registrar abono (normal) | `Web/POS/Button--Primary--Default` |
| Botón de registrar abono (cargando) | `Web/POS/Button--Primary--Loading` |
| Tarjeta Kanban con borde vencido | `Web/Kanban/Card--Order--Overdue` |
| Escáner QR placeholder de cámara | `Mobile/Scanner/CameraViewfinder--Default` |
| Input de monto con error | `Web/POS/Input--Currency--Error` |
| Botón de entrega (NO debe existir en pantalla roja) | `Mobile/Dispatch/Button--Deliver--RESTRICTED` |

### 1.4. Estados Obligatorios por Componente Interactivo

Para todo botón, input o control interactivo referenciado en las secciones §2, §3 y §4 de este documento, se especificarán explícitamente los siguientes **cinco estados**:

| Estado | Representación Visual (Baja Fidelidad) | Descripción Funcional |
|---|---|---|
| **Default** | Relleno `$gray-600`, texto `$gray-000` | El componente está disponible para interacción |
| **Hover** | Relleno `$gray-800`, texto `$gray-000`, cursor pointer | El puntero (o dedo en móvil con `:active`) está sobre el componente |
| **Focused** | Borde `2px solid $gray-950` alrededor del componente | El componente tiene el foco del teclado (accesibilidad) |
| **Disabled** | Relleno `$gray-200`, texto `$gray-400`, cursor not-allowed | El componente está inhabilitado por lógica de negocio |
| **Loading** | Relleno `$gray-300`, texto reemplazado por spinner circular de 16×16px | Petición en curso hacia Supabase — prevención de doble clic (SRS §Fase 3, 4.1) |

**Estado adicional para Inputs:**

| Estado | Representación |
|---|---|
| **Error** | Borde `2px solid $gray-950` + mensaje de error debajo en `$gray-900` con ícono `✕` |
| **Success** | Borde `2px solid $gray-600` + ícono `✓` en `$gray-600` |

### 1.5. Edge Cases y Empty States Globales

Cada pantalla documentada en §2, §3 y §4 incluirá como frame adicional obligatorio su estado en las siguientes condiciones:

| Condición | Elemento UI Obligatorio |
|---|---|
| **Empty State (0 datos)** | Ilustración placeholder (aspa) + Texto explicativo centrado + CTA contextual si aplica. Ejemplo: "No hay pedidos asignados a tu ruta hoy." |
| **Error de Red / Offline** | Banner superior sticky de 48px de alto, fondo `$gray-950`, texto `$gray-000`: "Sin conexión a Internet. Los datos mostrados pueden no estar actualizados." En PWA, es bloqueante para operaciones de escritura (SRS §Fase 4, 1.2: NetworkOnly para consultas QR). |
| **Error del Servidor (500)** | Modal centrado con ícono de error, texto: "Error al comunicarse con el servidor. Reporte a soporte técnico." + Botón "Reintentar" |
| **QR Inválido (404)** | Pantalla específica: "Código QR no reconocido. Este código no pertenece a Imprenta Escalante." (SRS §Fase 4, 6) |
| **Sesión Expirada** | Lock Screen superpuesta, fondo blur `$gray-100` 50% opacidad, input de contraseña centrado (SRS §Fase 3, 2: timeout 30 min en POS; SRS §Fase 4, 5.1: TTL 12h en PWA) |
| **Error Boundary (Crash)** | Pantalla completa blanca, ícono de error genérico, "Ocurrió un error. Reinicie la aplicación e informe a Sistemas" + Botón "Recargar" (SRS §Fase 4, 6) |

### 1.6. Criterios de Aprobación para Junta Directiva

Los wireframes estructurales producidos bajo este Spec-Kit **NO serán aprobados** para avanzar a la fase de Alta Fidelidad y Color a menos que cumplan **todos** los siguientes criterios de gate:

1. **Completitud de Pantallas:** Todas las pantallas listadas en §2 (PWA: 5 pantallas + componentes globales), §3 (POS: 4 pantallas + componentes globales) y §4 (Landing: 3 secciones × 2 breakpoints) están presentes como frames en el archivo de diseño.

2. **Cobertura de Estados:** Cada componente interactivo crítico tiene diseñados como mínimo sus 5 estados (Default, Hover, Focused, Disabled, Loading) según §1.4.

3. **Cobertura de Edge Cases:** Cada pantalla tiene su frame de Empty State y su frame de Error de Red, como mínimo, según §1.5.

4. **Conformidad con Reglas de Negocio:** Las restricciones de renderizado condicional (ausencia del botón de entrega en Pantalla Roja, bloqueo de botón de guardado sin justificación en Panel Supervisor, cero datos financieros en vista de Instalador) son demostrables inspeccionando los frames.

5. **Conformidad con Grilla:** Muestreo aleatorio de 3 pantallas verificando que todos los espaciados sean múltiplos de 8px.

---

## 2. Tareas de Emir: Especificaciones de PWA Móvil (Fase 4)

> **Referencia de Arquitectura:** SRS §Fase 4 — Arquitectura Móvil y PWA (Auxiliares de Instalación).  
> **Grilla:** 4 columnas, gutter 16px, margen lateral 16px.  
> **Orientación:** Portrait obligatorio (`orientation: "portrait"` en manifest.json — SRS §Fase 4, 1.1).  
> **Display:** Standalone — sin barra de direcciones del navegador (`display: "standalone"` — SRS §Fase 4, 1.1).  
> **Actor Principal:** Auxiliar de Instalación (Rol: `INSTALLER` — SRS §Fase 1, 1.1; BRD §6, Actor 2).  
> **Nivel Tecnológico del Actor:** Bajo (BRD §6). Todo elemento UI debe ser explícito y autoexplicativo.

---

### Pantalla 1: Login & Token Expiration Warning

**Propósito Funcional:** Autenticación del Instalador con credenciales provistas por el Administrador. El token JWT resultante tendrá un TTL agresivo de **12 horas** (SRS §Fase 4, 5.1) para mitigar el riesgo de acceso perpetuo en caso de pérdida o robo del dispositivo.

#### Layout (4 columnas)

```
┌──────────────────────────────┐
│       Status Bar (OS)        │  ← Controlada por el SO, no por la PWA
├──────────────────────────────┤
│                              │
│    ┌────────────────────┐    │
│    │    [LOGO PLACEHOLDER]│   │  ← Rectángulo con aspa, 120×120px
│    │    (Centered)       │    │     centrado en columnas 2-3
│    └────────────────────┘    │
│                              │  ← Spacer: 48px (6 × 8pt)
│    ┌────────────────────┐    │
│    │ Correo electrónico  │    │  ← Input span 4 cols, height 48px
│    └────────────────────┘    │
│                              │  ← Spacer: 16px (2 × 8pt)
│    ┌────────────────────┐    │
│    │ Contraseña     [👁]  │    │  ← Input span 4 cols + toggle visibility
│    └────────────────────┘    │
│                              │  ← Spacer: 32px (4 × 8pt)
│    ┌────────────────────┐    │
│    │   INICIAR SESIÓN    │    │  ← Button span 4 cols, height 56px (7 × 8pt)
│    └────────────────────┘    │
│                              │
│    Texto: "v1.0.0"           │  ← Versión en $gray-400, 12px, centrado
│                              │
└──────────────────────────────┘
```

#### Componentes UI y Estados

**Input `email`:**

| Estado | Comportamiento |
|---|---|
| Default | Borde `$gray-200`, placeholder "correo@ejemplo.com" en `$gray-300` |
| Focused | Borde `$gray-950` 2px |
| Error | Borde `$gray-950` 2px + mensaje inferior: "Formato de correo inválido" |
| Disabled | Solo durante Loading del botón de submit |

**Input `password`:**

| Estado | Comportamiento |
|---|---|
| Default | Borde `$gray-200`, placeholder "••••••••", tipo `password` |
| Focused | Borde `$gray-950` 2px |
| Toggle Visibility | Ícono de ojo (placeholder) en posición absolute right:16px — alterna `type` entre `password` y `text` |

**Button `Iniciar Sesión`:**

| Estado | Comportamiento |
|---|---|
| Default | Relleno `$gray-600`, texto "INICIAR SESIÓN" en `$gray-000`, `font-weight: bold` |
| Hover/Active | Relleno `$gray-800` |
| Disabled | Relleno `$gray-200`, texto `$gray-400` — se activa cuando algún input está vacío |
| Loading | Relleno `$gray-300`, texto reemplazado por spinner 16×16px — petición `supabase.auth.signInWithPassword()` en curso (SRS §Fase 3, 2) |
| Error (post-submit) | El botón regresa a Default. Aparece un Toast inferior: "Credenciales incorrectas. Verifique su correo y contraseña." |

#### Lógica de Renderizado y Reglas de Negocio

- **Validación Pre-Submit:** El botón `Iniciar Sesión` permanece `Disabled` hasta que ambos inputs contengan al menos 1 carácter. No se realiza validación de formato hasta el evento `onSubmit`.
- **Post-Login Exitoso:** Redirección automática a → Pantalla 2 (Escáner QR).
- **Token Expiration (12h):** Cuando `Date.now() >= tokenIssuedAt + (12 * 60 * 60 * 1000)`, la aplicación debe renderizar la Pantalla de Login automáticamente con un Toast informativo: "Su sesión ha expirado. Inicie sesión nuevamente." Este comportamiento se evalúa en cada navegación de ruta dentro de la PWA.
- **Conexión Supabase:** La llamada a `signInWithPassword()` requiere conectividad de red. Si el dispositivo está offline, mostrar banner de error de red definido en §1.5 en lugar de iniciar la petición.

#### Edge Cases

| Caso | Comportamiento UI |
|---|---|
| Dispositivo Offline al intentar login | Banner superior `$gray-950`: "Sin conexión a Internet". Botón permanece en Default (no Loading). |
| Credenciales correctas pero rol `ADMIN` | Login exitoso. La PWA filtra las vistas — el Admin verá las mismas pantallas que el Installer en la PWA móvil (sin funcionalidad de excepción). Las funciones de Admin solo existen en el POS Web. |
| 5 intentos fallidos consecutivos | No se implementa bloqueo en frontend — Supabase Auth maneja rate-limiting nativamente. Mostrar Toast genérico en cada fallo. |
| Campo de contraseña con pegado desde portapapeles | Permitido. No restringir `paste` en el input. |

---

### Pantalla 2: Escáner QR (Hardware UI)

**Propósito Funcional:** Interfaz primaria de interacción del Instalador. Utiliza la cámara trasera del dispositivo (`facingMode: "environment"` — SRS §Fase 4, 2.1) para decodificar el UUID embebido en el QR de la Nota de Remisión PDF (generado en el POS, SRS §Fase 3, 5.2). La lectura exitosa dispara una consulta `NetworkOnly` a Supabase para evaluar `balance_due`.

#### Layout (4 columnas)

```
┌──────────────────────────────┐
│  [≡]   ESCÁNER     [⚡ Torch]│  ← Header: 56px height. Hamburger left,
│                              │     título centrado, torch button right
├──────────────────────────────┤
│                              │
│  ┌──────────────────────────┐│
│  │                          ││
│  │                          ││
│  │   ┌──────────────┐      ││  ← Camera Viewfinder: 
│  │   │  [CAMERA      │      ││     Placeholder gris $gray-100
│  │   │   PREVIEW]    │      ││     con borde punteado $gray-300
│  │   │              │      ││     Aspect ratio 1:1
│  │   │   ┌────────┐ │      ││     Cuadro de enfoque (scan area)
│  │   │   │ TARGET │ │      ││     centrado, 200×200px, borde
│  │   │   │  AREA  │ │      ││     blanco de 2px con esquinas
│  │   │   └────────┘ │      ││     redondeadas
│  │   │              │      ││
│  │   └──────────────┘      ││
│  │                          ││
│  └──────────────────────────┘│
│                              │  ← Spacer: 24px
│  ┌──────────────────────────┐│
│  │ "Escanee el código de la ││  ← Instrucción: texto centrado
│  │  remisión del pedido"    ││     $gray-600, 14px
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │ [📋] MI RUTA (3 pedidos) ││  ← Botón secundario: acceso a
│  └──────────────────────────┘│     Pantalla 5. Height 48px.
│                              │     Span 4 cols. $gray-200 bg
└──────────────────────────────┘
│     [NAV: Escáner | Mi Ruta] │  ← Bottom Nav: 56px, 2 tabs
└──────────────────────────────┘
```

#### Componentes UI y Estados

**Botón Torch (Linterna):**

| Estado | Comportamiento |
|---|---|
| Default (Off) | Ícono rayo `⚡` en `$gray-400`, sin relleno de fondo |
| Active (On) | Ícono rayo en `$gray-000`, fondo circular `$gray-600` de 40×40px |
| Unsupported | Si `navigator.mediaDevices` no soporta torch: el botón se oculta (`display: none`). SRS §Fase 4, 6 indica que no todos los navegadores soportan torch. |

**Camera Viewfinder:**

| Estado | Comportamiento |
|---|---|
| Permissions Pending | Placeholder gris `$gray-100` con texto: "Toque para activar la cámara" y botón CTA |
| Permissions Denied | Placeholder `$gray-100` con instrucciones: "Permiso de cámara denegado. Abra Configuración > [Nombre del navegador] > Permisos > Cámara y habilítela." + ícono de engranaje placeholder. (SRS §Fase 4, 2.1: instrucciones claras de reactivación) |
| Active (Streaming) | Feed de cámara en vivo con cuadro de enfoque blanco centrado |
| Scan Detected | Feedback táctil `navigator.vibrate(200)` (SRS §Fase 4, 2.1). Cuadro de enfoque cambia a borde `$gray-950` 4px por 300ms. Transición automática a Pantalla 3 o 4. |

**Bottom Navigation:**

| Tab | Estado |
|---|---|
| "Escáner" | Active: texto `$gray-950`, borde superior 2px `$gray-950`. Inactive: `$gray-400` |
| "Mi Ruta" | Active/Inactive inverso. Badge numérico con conteo de pedidos `READY_FOR_DELIVERY` |

#### Lógica de Renderizado (Conexión Supabase)

1. QR decodificado → se extrae el UUID (`qr_code_hash`).
2. Petición: `supabase.from('orders').select('balance_due, status, customer:customers(full_name), notes').eq('qr_code_hash', scannedUUID)` (SRS §Fase 4, 2.2).
3. **Estrategia de red: `NetworkOnly`** (SRS §Fase 4, 1.2). No se cachea el resultado. Si no hay conexión, error bloqueante.
4. Si `response.data === null` → Pantalla de Error QR 404 (§1.5).
5. Si `balance_due > 0` → Pantalla 3 (Alerta Roja).
6. Si `balance_due === 0` → Pantalla 4 (Alerta Verde).

#### Edge Cases

| Caso | Comportamiento UI |
|---|---|
| Sin conexión a Internet durante escaneo | Se intercepta el error antes de la petición. Modal bloqueante: "Sin conexión. Muévase a un área con cobertura para validar la entrega." (Cita textual SRS §Fase 4, 1.2). No se permite continuar. |
| QR de otro sistema (no UUID válido) | Validación de formato UUID en frontend. Si falla regex, mostrar error 404 sin petición a Supabase. |
| Cámara bloqueada por otra app | La API `getUserMedia()` arrojará `NotReadableError`. Mostrar: "La cámara está siendo usada por otra aplicación. Ciérrela e intente nuevamente." |
| Poca iluminación | Texto dinámico debajo del viewfinder: "¿Poca luz? Active la linterna ⚡" — solo se muestra si torch está disponible y apagada. |

---

### Pantalla 3: Alerta Roja (Strict Lock — Saldo > 0)

**Propósito Funcional:** Interfaz de bloqueo absoluto. Implementa la "Regla de Oro" del BRD §7, Regla 3 y el Trigger 2 del SRS §Fase 1, 4: **Si `balance_due > 0`, el estado del pedido NO puede cambiar a `DELIVERED`**. La interfaz es la capa visual de esta restricción transaccional.

> [!CAUTION]
> **RESTRICCIÓN CRÍTICA DE DOM (BRD §4, Criterio 1; SRS §Fase 4, 3.1):**
> El botón "Confirmar Entrega Física" **NO DEBE EXISTIR en el DOM** de esta pantalla. No se trata de `disabled`, `opacity: 0`, `visibility: hidden` o `pointer-events: none`. El componente React **NO se renderiza condicionalmente**: `{balance_due === 0 && <DeliverButton />}`. Si `balance_due > 0`, el JSX del botón no existe en el Virtual DOM ni en el DOM real. Esto previene la manipulación del HTML por DevTools.

#### Layout (4 columnas)

```
┌──────────────────────────────┐
│         [← Regresar]        │  ← Header: 56px. Solo botón de retroceso.
│                              │     Fondo $gray-950 (representa rojo)
├──────────────────────────────┤
│ ████████████████████████████ │  ← Fondo completo: $gray-950
│                              │     (representa rojo intenso en
│    ┌────────────────────┐    │      alta fidelidad)
│    │                    │    │
│    │    ⛔ BLOQUEADO     │    │  ← Ícono STOP: 80×80px centrado
│    │                    │    │     Texto "BLOQUEADO" en $gray-000
│    └────────────────────┘    │     24px bold
│                              │  ← Spacer: 32px
│    ┌────────────────────┐    │
│    │ Cliente:           │    │  ← Label $gray-300, Value $gray-000
│    │ Juan Pérez López   │    │     18px, span 4 cols
│    ├────────────────────┤    │
│    │ Producto:          │    │
│    │ Lona 2×3m          │    │
│    ├────────────────────┤    │
│    │                    │    │
│    │ SALDO PENDIENTE:   │    │  ← Texto en $gray-000
│    │ $1,250.00          │    │     32px bold, monospaced
│    │                    │    │     Span 4 cols, centrado
│    └────────────────────┘    │
│                              │  ← Spacer: 32px
│    ┌────────────────────┐    │
│    │ "El sistema impide │    │  ← Mensaje: $gray-300, 14px
│    │  la entrega de     │    │     centrado, padding 16px
│    │  este material.    │    │
│    │  Solicite al       │    │
│    │  cliente liquidar  │    │
│    │  el adeudo."       │    │
│    └────────────────────┘    │
│                              │
│    ┌────────────────────┐    │
│    │   ← REGRESAR       │    │  ← Botón ÚNICO: height 56px
│    └────────────────────┘    │     $gray-000 bg, $gray-950 text
│                              │     Span 4 cols. ESTE ES EL ÚNICO
│ ████████████████████████████ │     BOTÓN EN ESTA PANTALLA.
└──────────────────────────────┘
```

#### Restricción DOM — Verificación de Ausencia

Para la revisión del wireframe, Emir debe demostrar la restricción mediante la siguiente anotación en el frame de Figma/Penpot:

```
SPEC-NOTE: En esta pantalla el componente 
Mobile/Dispatch/Button--Deliver NO EXISTE.
React: {balance_due === 0 && <DeliverButton />}
Cuando balance_due > 0, el JSX no evalúa el branch.
El botón no se renderiza. No hay display:none. 
No hay visibility:hidden. NO EXISTE EN EL DOM.

Fundamento: BRD §7 Regla 3 — "el botón de confirmación 
en el POS o módulo móvil estará deshabilitado"
CORRECCIÓN DE IMPLEMENTACIÓN: "deshabilitado" se 
interpreta como "no renderizado" para máxima seguridad,
ya que el SRS §Fase 4, 3.1 especifica explícitamente:
"Ni siquiera debe estar disabled; no debe renderizarse 
en el DOM para evitar que un empleado lo fuerce 
manipulando el HTML".
```

#### Componentes UI y Estados

**Botón `Regresar`:**

| Estado | Comportamiento |
|---|---|
| Default | Fondo `$gray-000`, texto "← REGRESAR" en `$gray-950`, span 4 cols, height 56px |
| Hover/Active | Fondo `$gray-200` |
| Acción | Navega de vuelta a Pantalla 2 (Escáner QR). Limpia el resultado del escaneo anterior. |

**No existen más componentes interactivos en esta pantalla.**

#### Edge Cases

| Caso | Comportamiento UI |
|---|---|
| El admin registra el pago mientras el instalador ve esta pantalla | La pantalla NO se actualiza en tiempo real (es un estado snapshot, no una suscripción). El instalador debe regresar y re-escanear el QR para obtener el estado actualizado. Esto es intencional: la lectura viva de saldo es exclusiva del momento del escaneo. |
| Balance due negativo (error de DB) | Tratar como `> 0` por precaución. Mostrar alerta roja. Agregar texto adicional: "Error de saldo detectado. Contacte al administrador." |

---

### Pantalla 4: Alerta Verde (Clearance — Saldo = 0)

**Propósito Funcional:** Pantalla de autorización de despacho. Solo se renderiza cuando `balance_due === 0` (SRS §Fase 4, 3.2). Contiene el único mecanismo en la PWA para cambiar el `status` de una orden a `DELIVERED`.

#### Layout (4 columnas)

```
┌──────────────────────────────┐
│         [← Regresar]        │  ← Header: 56px. Fondo $gray-100
│                              │     (representa verde en HiFi)
├──────────────────────────────┤
│                              │  ← Fondo: $gray-100
│    ┌────────────────────┐    │
│    │                    │    │
│    │    ✅ AUTORIZADO   │    │  ← Ícono CHECK: 80×80px centrado
│    │                    │    │     Texto "AUTORIZADO" $gray-800
│    └────────────────────┘    │     24px bold
│                              │  ← Spacer: 32px
│    ┌────────────────────┐    │
│    │ PAGO CONFIRMADO    │    │  ← Texto $gray-800, 16px bold
│    │ Saldo: $0.00       │    │     Valor $gray-950, 28px monospaced
│    ├────────────────────┤    │
│    │ Cliente:           │    │  ← $gray-600 label, $gray-900 value
│    │ Juan Pérez López   │    │
│    ├────────────────────┤    │
│    │ Producto:          │    │
│    │ Lona 2×3m          │    │
│    └────────────────────┘    │
│                              │  ← Spacer: 48px
│ ┌──────────────────────────┐ │
│ │                          │ │  ← BOTÓN DE ENTREGA:
│ │   CONFIRMAR ENTREGA      │ │     Span 4 cols completo
│ │       FÍSICA             │ │     Height: 72px (9 × 8pt)
│ │                          │ │     Hitbox mínimo: 60×60px
│ └──────────────────────────┘ │     (SRS §Fase 4, 3.2 y Brief §1)
│                              │     Padding interno: 16px vertical
│    Texto: "Esta acción no   │  ← Warning text: $gray-400, 12px
│    se puede deshacer"       │     centrado
└──────────────────────────────┘
```

#### Hitbox del Botón de Confirmación

> **Referencia:** SRS §Fase 4, 3.2 — "botón grande, amigable para dedos (Hitbox de mínimo 60×60px)".  
> **Referencia:** Brief §1 — "Hitbox mínimo de 60x60px".

| Propiedad | Valor |
|---|---|
| Width | 100% del contenedor (span 4 cols menos margins = mínimo 288px en pantallas de 320px) |
| Height | 72px (9 × 8pt) — excede el mínimo de 60px para asegurar accesibilidad táctil |
| Min Touch Target | 60×60px (cumple WCAG 2.5.5 Level AAA para tamaño de objetivo táctil) |
| Border Radius | 8px (1 × 8pt) |
| Relleno | `$gray-600` |
| Texto | "CONFIRMAR ENTREGA FÍSICA" en `$gray-000`, 18px bold, centrado |

#### Componentes UI y Estados del Botón de Entrega

| Estado | Representación | Trigger |
|---|---|---|
| **Default** | Relleno `$gray-600`, texto `$gray-000` "CONFIRMAR ENTREGA FÍSICA" | Pantalla cargada con `balance_due === 0` |
| **Hover/Active** | Relleno `$gray-800` | Toque del instalador |
| **Loading** | Relleno `$gray-300`, spinner 24×24px centrado reemplazando texto. **Botón `disabled={true}`** inmediatamente al primer toque. (SRS §Fase 3, 4.1 — anti-doble clic aplica en toda la plataforma) | Petición `UPDATE orders SET status = 'DELIVERED' WHERE id = {uuid}` en curso |
| **Success** | La petición retorna 200. Feedback: `navigator.vibrate([100, 50, 100])`. Transición a pantalla de confirmación temporal (2s) con ícono ✓ grande, luego redirige a Pantalla 2. | Supabase confirma el UPDATE |
| **Error** | El botón regresa a Default. Toast inferior: "Error al registrar la entrega. Reintente." Esto puede ocurrir si el Trigger 2 de PostgreSQL (SRS §Fase 1, 4) rechaza la transacción por una condición de carrera. | Supabase devuelve error 500 / RAISE EXCEPTION |

#### Lógica de Renderizado Condicional

```
// Pseudocódigo React — Archivo DeliveryScreen.tsx
function DeliveryScreen({ orderData }) {
  // REGLA ABSOLUTA: El botón SOLO existe si balance_due === 0
  // SRS §Fase 4, 3.1: "no debe renderizarse en el DOM"
  // SRS §Fase 4, 3.2: "Se renderiza un botón grande"
  
  if (orderData.balance_due > 0) {
    return <RedLockScreen orderData={orderData} />;  // Pantalla 3
  }
  
  if (orderData.balance_due === 0) {
    return <GreenClearanceScreen orderData={orderData} />;  // Esta pantalla
    // El JSX de GreenClearanceScreen CONTIENE <DeliverButton />
  }
}
```

---

### Pantalla 5: Kanban Móvil "Mi Ruta"

**Propósito Funcional:** Vista de cola de trabajo del Instalador. Muestra las órdenes con `status = 'READY_FOR_DELIVERY'` ordenadas por `promised_date ASC` (SRS §Fase 4, 4). Implementa semaforización por fecha y **restricción estricta de confidencialidad financiera** mediante RLS.

> [!IMPORTANT]
> **RESTRICCIÓN RLS (SRS §Fase 1, 3 — Tabla `payments`):**
> El rol `INSTALLER` tiene `SELECT` bloqueado en la tabla `payments`. El rol `INSTALLER` puede leer la tabla `orders` pero la consulta de la PWA **NO debe solicitar** los campos `total_price`, `balance_due` ni realizar JOINs a `payments`. La vista "Mi Ruta" renderiza exclusivamente: nombre del producto/descripción (`notes`), nombre del cliente (`customers.full_name`) y `promised_date`.

#### Layout (4 columnas)

```
┌──────────────────────────────┐
│  [←]    MI RUTA    [🔄 Sync] │  ← Header: 56px. Botón refresh derecho.
├──────────────────────────────┤
│                              │
│  Hoy: Martes 02 Agosto 2026 │  ← Fecha actual, $gray-600, 14px
│                              │
│  ┌──────────────────────────┐│  ← CARD 1 (Borde $gray-950, 4px
│  │ ⚠ VENCE HOY             ││     = semáforo ROJO/VENCIDO)
│  │ ─────────────────────── ││
│  │ Lona Retroiluminada 3×2 ││  ← Producto: $gray-900, 16px bold
│  │ Cliente: Agencia MKT    ││  ← Cliente: $gray-600, 14px
│  │ Entrega: 02/08/2026     ││  ← Fecha: $gray-900, 14px
│  │                  [📍→]   ││  ← Botón: "Ver dirección" (opcional)
│  └──────────────────────────┘│
│                              │  ← Spacer: 16px entre cards
│  ┌──────────────────────────┐│  ← CARD 2 (Borde $gray-600, 2px
│  │ ⏰ VENCE MAÑANA          ││     dashed = semáforo AMARILLO)
│  │ ─────────────────────── ││
│  │ Vinilo Corte 50cm       ││
│  │ Cliente: Carlos Rivas   ││
│  │ Entrega: 03/08/2026     ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│  ← CARD 3 (Borde $gray-200, 1px
│  │ Lona Mate 4×6m          ││     solid = semáforo VERDE)
│  │ Cliente: Farmacia Norte ││
│  │ Entrega: 05/08/2026     ││
│  └──────────────────────────┘│
│                              │
├──────────────────────────────┤
│     [Escáner]  |  [Mi Ruta]  │  ← Bottom Nav: 56px
└──────────────────────────────┘
```

#### Componentes: Tarjeta de Orden (Card)

**Datos renderizados por tarjeta:**

| Campo | Fuente en DB | Visible |
|---|---|---|
| Producto/Descripción | `orders.notes` o futuro campo `product_name` | ✅ Sí |
| Nombre del Cliente | `customers.full_name` (JOIN) | ✅ Sí |
| Fecha de Entrega | `orders.promised_date` | ✅ Sí |
| Etiqueta de Semáforo | Calculada en frontend con `date-fns` | ✅ Sí |
| **Precio Total** | `orders.total_price` | ❌ **NO. Campo no solicitado en la query.** |
| **Saldo Pendiente** | `orders.balance_due` | ❌ **NO. Campo no solicitado en la query.** |
| **Historial de Pagos** | `payments.*` | ❌ **NO. Tabla bloqueada por RLS para INSTALLER.** |

**Semaforización de tarjeta (mismos criterios que §1.2):**

| Condición (`promised_date` vs `now()`) | Borde | Etiqueta |
|---|---|---|
| `isPast(promisedDate)` OR `isToday(promisedDate)` | `4px solid $gray-950` | "⚠ VENCE HOY" o "⚠ VENCIDO" |
| `isTomorrow(promisedDate)` | `2px dashed $gray-600` | "⏰ VENCE MAÑANA" |
| `differenceInDays(promisedDate, today) >= 2` | `1px solid $gray-200` | Sin etiqueta (implícito: sin urgencia) |

#### Edge Cases

| Caso | Comportamiento UI |
|---|---|
| **Empty State: 0 pedidos asignados** | Centro de pantalla: Ícono de caja vacía (placeholder), texto "No hay pedidos listos para entrega en tu ruta." Subtexto: "Los pedidos aparecerán aquí cuando estén marcados como 'Listo para Entrega' en el taller." |
| **Offline** | Banner superior sticky `$gray-950`: "Sin conexión. No se pueden actualizar las entregas pendientes." Las tarjetas previamente cargadas permanecen visibles (leídas del estado de React/Zustand) pero el botón de sincronización (`🔄`) se deshabilita. **No se permite escanear QR offline.** |
| **Más de 20 pedidos** | Scroll nativo del contenedor. No paginación. Las tarjetas urgentes (vencidas/hoy) siempre están arriba por el `ORDER BY promised_date ASC`. |

### Componentes Globales PWA (Pop-ups y Overlays)

Los siguientes componentes son transversales y deben diseñarse como frames independientes en el archivo de diseño:

#### Toast de Actualización Forzada (Service Worker)

> **Ref:** SRS §Fase 4, 5.2

```
┌──────────────────────────────┐
│ ███████████████████████████  │  ← Banner inferior sticky
│ "Actualización crítica       │     Height: 56px
│  requerida. Presione aquí    │     Fondo: $gray-950
│  para reiniciar."     [→]    │     Texto: $gray-000, 14px
│ ███████████████████████████  │     CTA: ícono flecha derecha
└──────────────────────────────┘     z-index: máximo
```

- **Comportamiento:** Aparece cuando el Service Worker detecta nueva versión de `index.html`. No se puede descartar (no hay botón de cerrar). El tap en el banner ejecuta `window.location.reload(true)`.

#### Error Boundary Global

> **Ref:** SRS §Fase 4, 6

```
┌──────────────────────────────┐
│                              │
│      ┌──────────────┐        │
│      │  [⚠ ÍCONO]   │        │  ← Pantalla completa blanca
│      │   ERROR       │        │     Ícono de error 64×64px
│      └──────────────┘        │     centrado
│                              │
│  "Ocurrió un error.          │  ← Texto: $gray-800, 16px
│   Reinicie la aplicación     │     centrado
│   e informe a Sistemas."    │
│                              │
│  ┌────────────────────┐      │
│  │     RECARGAR        │      │  ← Botón: 56px height, span 4 cols
│  └────────────────────┘      │     $gray-600 bg, $gray-000 text
│                              │     onClick: location.reload()
└──────────────────────────────┘
```

#### Banner Offline

```
┌──────────────────────────────┐
│ ██ SIN CONEXIÓN A INTERNET ██│  ← Banner superior sticky
└──────────────────────────────┘     Height: 40px. $gray-950 bg.
                                     Texto $gray-000, 12px bold.
                                     Visible SOLO cuando
                                     navigator.onLine === false.
```

---

## 3. Tareas de Emir: Especificaciones del Panel Web POS (Fase 3)

> **Referencia de Arquitectura:** SRS §Fase 3 — Arquitectura Frontend Panel Administrativo (POS).  
> **Grilla:** 12 columnas, gutter 24px, margen lateral 32px.  
> **Breakpoint de diseño:** 1280px de ancho.  
> **Actor Principal:** Administrador / Dueño (Rol: `ADMIN` — SRS §Fase 1, 1.1; BRD §6, Actor 1).  
> **Layout Base:** Sidebar (columnas 1-2, ancho fijo 240px) + Header (64px height) + Content Area (columnas 3-12).

### Layout Maestro (Shell de Aplicación)

```
┌─────────┬────────────────────────────────────────────────────┐
│         │  [LOGO]  PrintFlow AI          🔔 (3)   [Admin ▼] │ ← Header: 64px
│ SIDEBAR │────────────────────────────────────────────────────│    Ancho: 100%
│  240px  │                                                    │    Notificaciones
│         │                                                    │    + Avatar
│ ──────  │                                                    │
│ ■ Kanban│              CONTENT AREA                          │ ← Content:
│ ▫ Caja  │            (Cols 3-12 del grid)                    │    Padding 32px
│ ▫ PDF   │                                                    │
│ ▫ Inven.│                                                    │
│ ▫ Super.│                                                    │
│         │                                                    │
│         │                                                    │
│ ──────  │                                                    │
│         │                                                    │
│ ──────  │                                                    │
│ 🟢 Live │                                                    │ ← Indicador WS
│ v1.0.0  │                                                    │    (ver abajo)
└─────────┴────────────────────────────────────────────────────┘
```

**Indicador de Conexión WebSockets (Sidebar, esquina inferior):**

> **Ref:** SRS §Fase 3, 3.1 — Supabase Realtime. El Kanban debe reflejar cambios al milisegundo sin F5.

| Estado | Representación (Baja Fidelidad) | Significado |
|---|---|---|
| **Conectado** | Círculo relleno `$gray-600` 8×8px + texto "En Vivo" en `$gray-600` | WebSocket Supabase Realtime activo. Datos en tiempo real. |
| **Reconectando** | Círculo relleno `$gray-400` 8×8px parpadeando + texto "Reconectando..." en `$gray-400` | La conexión se perdió. Supabase JS Client intentando reconexión automática. |
| **Desconectado** | Círculo relleno `$gray-950` 8×8px + texto "Sin conexión" en `$gray-950` | No hay WebSocket activo. Los datos pueden estar desactualizados. Banner de alerta en Content Area. |

---

### Pantalla 1: Dashboard Kanban (Real-time)

**Propósito Funcional:** Corazón operativo del taller. Tablero de producción con columnas por estado de pedido. Suscripción en tiempo real a la tabla `orders` mediante Supabase Realtime (SRS §Fase 3, 3.1). La semaforización por `promised_date` guía la priorización visual.

#### Layout (Columnas 3-12 del grid maestro = 10 columnas útiles)

```
┌────────────────────────────────────────────────────────────┐
│  TABLERO DE PRODUCCIÓN               [+ Nuevo Pedido] 🔍  │ ← Title bar + acciones
├──────────────┬──────────────┬──────────────┬───────────────┤
│ PENDIENTE    │ EN PRODUCCIÓN│ LISTO        │ ENTREGADO     │ ← 4 columnas Kanban
│ DEP. (3)     │ (5)          │ ENTREGA (2)  │ HOY (4)       │    (~2.5 cols grid c/u)
│──────────────│──────────────│──────────────│───────────────│
│┌────────────┐│┌────────────┐│┌────────────┐│┌─────────────┐│
││ ████ VENCIDO│││            │││ ⚠ HOY      │││ ✓ Entregado ││ ← Cards apiladas
││ ──────────  │││ Lona 3×2m  │││ ──────────  │││ ──────────  ││    verticalmente
││ Vinilo 1×1  │││ Carlos R.  │││ Banner 5×3 │││ Lona 2×3m  ││    con scroll
││ Ana López   │││ $1,500.00  │││ Farm. Norte│││ Juan Pérez  ││    independiente
││ $500.00     │││ Entrega:   │││ $0.00      │││ $0.00       ││    por columna
││ Saldo: $250 │││ 04/08/2026 │││ ──────────  │││             ││
││             │││            │││ [Imprimir  │││             ││
│└────────────┘│└────────────┘││  PDF 🖨]    │││             ││
│              │              │└────────────┘│└─────────────┘│
│┌────────────┐│┌────────────┐│              │               │
││ ⏰ MAÑANA   │││            ││              │               │
││ ──────────  │││ Tarjetas   ││              │               │
││ Flyer A4    │││ Present.   ││              │               │
││ Corp. XYZ   │││ María G.   ││              │               │
││ $800.00     │││ $2,000.00  ││              │               │
││ Saldo: $400 │││ Entrega:   ││              │               │
│└────────────┘││ 03/08/2026 ││              │               │
│              │└────────────┘│              │               │
└──────────────┴──────────────┴──────────────┴───────────────┘
```

#### Columnas Kanban

| Columna | Mapeo a `orders.status` (SRS §Fase 1, 1.3) | Datos en Tarjeta |
|---|---|---|
| PENDIENTE DEPÓSITO | `PENDING_DEPOSIT` | Producto, Cliente, Total, Saldo, Fecha |
| EN PRODUCCIÓN | `IN_PRODUCTION` | Producto, Cliente, Total, Saldo, Fecha |
| LISTO PARA ENTREGA | `READY_FOR_DELIVERY` | Producto, Cliente, Total, Saldo, Fecha, Botón "Imprimir PDF" |
| ENTREGADO (HOY) | `DELIVERED` (filtrado `WHERE delivered_at::date = CURRENT_DATE`) | Producto, Cliente, confirmación ✓ |

#### Tarjeta de Pedido (Kanban Card) — Anatomía

```
┌─────────────────────────────┐  ← Borde según semáforo (§1.2)
│ [Etiqueta Semáforo]         │     Ej: "⚠ VENCIDO" con borde
│ ────────────────────────── │     $gray-950 4px
│ Producto: Lona 2×3m        │  ← $gray-800, 14px bold
│ Cliente: Juan Pérez        │  ← $gray-600, 12px
│ Total: $1,500.00           │  ← $gray-900, 14px monospaced
│ Saldo: $750.00             │  ← $gray-950, 16px bold monospaced
│ Entrega: 02/08/2026 14:00  │  ← $gray-800, 12px
│                [$ Cobrar]   │  ← CTA: abre Modal de Transacción
└─────────────────────────────┘     (Pantalla 2)
```

**Interacción de la tarjeta:**

| Acción | Resultado |
|---|---|
| Clic en la tarjeta completa | Abre panel lateral de detalle del pedido (Slide-over derecho, 400px ancho) |
| Clic en botón "$ Cobrar" | Abre Modal de Transacción (Pantalla 2) precargado con `order_id` |
| Clic en "Imprimir PDF" (solo en columna LISTO) | Genera y descarga PDF de Nota de Remisión (Pantalla 3) |

#### Semaforización Estructural

La comparación temporal se ejecuta en el frontend usando `date-fns` o `dayjs` (SRS §Fase 3, 3.2):

```javascript
// Pseudocódigo de clasificación
const now = new Date();
if (isPast(promisedDate) || isToday(promisedDate)) {
  return 'OVERDUE';   // Borde 4px solid $gray-950
}
if (isTomorrow(promisedDate)) {
  return 'WARNING';   // Borde 2px dashed $gray-600
}
return 'NORMAL';      // Borde 1px solid $gray-200
```

#### Edge Cases

| Caso | Comportamiento UI |
|---|---|
| **Empty State (0 pedidos en una columna)** | Dentro de la columna: área gris `$gray-100` con texto centrado "Sin pedidos" en `$gray-400`. La columna mantiene su ancho y header. |
| **Empty State (0 pedidos en TODAS las columnas)** | Content Area central: Ilustración placeholder + "No hay pedidos registrados. Los pedidos aparecerán aquí cuando se creen desde el POS o el Bot de WhatsApp." |
| **WebSocket desconectado** | Indicador en sidebar cambia a "Sin conexión" (ver Layout Maestro). Banner amarillo en la parte superior del Content Area: "⚠ Los datos pueden no estar actualizados. Reconectando..." con spinner. |
| **Más de 50 tarjetas en una columna** | Scroll vertical independiente por columna. No se pagina. Performance controlada por virtualización de lista (`react-window` o similar). |
| **Nueva orden inyectada por Bot WhatsApp** | La tarjeta aparece animadamente (fade-in 200ms) en la columna `PENDING_DEPOSIT` sin recargar la página (SRS §Fase 3, 3.1). |

---

### Pantalla 2: Modal de Transacción (Caja)

**Propósito Funcional:** Interfaz de registro de abonos/pagos. El dueño ingresa el monto recibido y el método de pago. La petición inserta un registro en `payments` (SRS §Fase 1, 1.4 — tabla append-only). El Trigger 1 de PostgreSQL recalcula `balance_due` automáticamente (SRS §Fase 1, 4). El frontend **solo envía el pago, no calcula saldos**.

> [!WARNING]
> **ANTI-DOBLE CLIC (SRS §Fase 3, 4.1):**
> Al hacer clic en el botón de submit, el estado cambia **inmediatamente** a `disabled={true}` + spinner. El botón solo se rehabilita si Supabase devuelve error. Si retorna 200 OK, el modal se cierra. No existe escenario donde el botón esté habilitado mientras una petición está en vuelo.

#### Layout (Modal centrado, ancho 480px = 60 × 8pt)

```
┌────────────────────────────────────────────┐
│  REGISTRAR ABONO                     [✕]   │ ← Header modal: 56px
│                                            │    Título + botón cerrar
├────────────────────────────────────────────┤
│                                            │
│  Pedido: ORD-2026-0847                     │ ← $gray-600, 12px
│  Cliente: Juan Pérez López                 │ ← $gray-800, 16px bold
│  Producto: Lona Retroiluminada 3×2m        │ ← $gray-600, 14px
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  Total del Pedido:      $1,500.00    │  │ ← $gray-900, 16px monospaced
│  │  Abonos Previos:        - $750.00    │  │ ← $gray-600, 14px monospaced
│  │  ──────────────────────────────────  │  │
│  │  SALDO ACTUAL:          $750.00      │  │ ← $gray-950, 20px bold mono
│  └──────────────────────────────────────┘  │
│                                            │ ← Spacer: 24px
│  Monto a Abonar *                          │ ← Label: $gray-600, 12px
│  ┌──────────────────────────────────────┐  │
│  │  $  [________________]               │  │ ← Input numérico, height 48px
│  └──────────────────────────────────────┘  │    Prefijo "$" fijo
│                                            │
│  Método de Pago *                          │ ← Label: $gray-600, 12px
│  ┌──────────────────────────────────────┐  │
│  │  [Seleccione...]              [▼]    │  │ ← Select dropdown, height 48px
│  └──────────────────────────────────────┘  │    Opciones: EFECTIVO,
│     ○ Efectivo                             │    TRANSFERENCIA, TARJETA
│     ○ Transferencia                        │    (SRS §Fase 1, 1.4:
│     ○ Tarjeta                              │     payment_method Enum)
│                                            │ ← Spacer: 32px
│  ┌──────────────────────────────────────┐  │
│  │       REGISTRAR ABONO                │  │ ← Botón submit: height 48px
│  └──────────────────────────────────────┘  │    Span completo del modal
│                                            │    ESTADOS DETALLADOS ABAJO
│  Nota: El saldo se actualizará             │
│  automáticamente tras el registro.         │ ← Info: $gray-400, 11px
└────────────────────────────────────────────┘
```

#### Overlay del Modal

- **Fondo:** Overlay `$gray-950` con opacidad 50% cubriendo toda la pantalla detrás del modal.
- **Cierre:** Clic en `[✕]`, tecla `Escape`, o clic fuera del modal (en el overlay). **Ninguna** de estas acciones cierra el modal si el botón está en estado Loading (petición en vuelo).
- **Posición:** Centrado vertical y horizontalmente. `z-index` superior a todos los demás elementos.

#### Estados del Botón "Registrar Abono" (Especificación Estricta Anti-Doble Clic)

| Estado | Relleno | Texto | Ícono | `disabled` | Condición de Activación |
|---|---|---|---|---|---|
| **Default** | `$gray-600` | "REGISTRAR ABONO" | Ninguno | `false` | Monto > 0 AND Método seleccionado |
| **Hover** | `$gray-800` | "REGISTRAR ABONO" | Ninguno | `false` | Cursor sobre el botón |
| **Disabled (Pre-validación)** | `$gray-200` | "REGISTRAR ABONO" en `$gray-400` | Ninguno | `true` | Monto vacío/0 OR Método no seleccionado |
| **Loading (Anti-doble clic)** | `$gray-300` | "PROCESANDO..." en `$gray-400` | Spinner 16×16px `$gray-600` | `true` | Inmediatamente después del primer clic. `onClick` deshabilitado. Petición `INSERT INTO payments` en vuelo. |
| **Error (Post-submit)** | Regresa a Default | "REGISTRAR ABONO" | Ninguno | `false` | Supabase devolvió error. Toast rojo: "Error al procesar el pago. Reintente." |

**Flujo temporal del anti-doble clic:**

```
t=0ms     Usuario hace clic en "REGISTRAR ABONO"
t=1ms     Estado → Loading. disabled={true}. Spinner visible.
t=1ms     Petición HTTP: supabase.from('payments').insert({...})
          El usuario NO PUEDE hacer otro clic.
t=~200ms  Supabase responde:
          - Si 200 OK: Toast verde "Abono registrado correctamente". 
            Modal se cierra. Kanban se actualiza vía WebSocket.
          - Si Error: Estado → Default (re-habilitado). Toast rojo.
```

#### Validaciones de Input

**Input `monto`:**

| Validación | Regla | Mensaje de Error |
|---|---|---|
| Campo vacío | Botón Disabled | (Sin mensaje, botón simplemente gris) |
| Valor ≤ 0 | Botón Disabled + borde error en input | "El monto debe ser mayor a $0" |
| Valor > `balance_due` | **Permitido** con advertencia amarilla | "⚠ El monto excede el saldo. Se generará un crédito a favor." |
| Caracteres no numéricos | Input `type="number"`, no permite letras nativamente | — |

**Select `método de pago`:**

| Validación | Regla | Mensaje de Error |
|---|---|---|
| Sin selección | Botón Disabled | (Sin mensaje) |

---

### Pantalla 3: Layout del Ticket PDF (Nota de Remisión)

**Propósito Funcional:** Documento generado en el navegador mediante `@react-pdf/renderer` o `jspdf` (SRS §Fase 3, 5.1). Se renderiza en formato Carta (Letter: 215.9mm × 279.4mm). Contiene el QR con el `qr_code_hash` UUID que los instaladores escanearán en campo.

> **Ref:** SRS §Fase 3, 5.2 para la estructura. BRD §5 para los datos obligatorios.

#### Layout del PDF (Grid sobre formato Carta)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────────┐                                           │
│  │ [LOGO        │   IMPRENTA ESCALANTE                      │ ← Header
│  │  PLACEHOLDER]│   Nota de Remisión                        │    Logo: 80×80px
│  │  80×80px     │   Folio: REM-2026-0847                    │    placeholder aspa
│  └──────────────┘   Fecha emisión: 02/08/2026               │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │         FECHA PACTADA DE ENTREGA: 05/08/2026 14:00     ││ ← PROMINENTE
│  │                                                         ││    $gray-950
│  └─────────────────────────────────────────────────────────┘│    24px BOLD
│                                                             │    Borde 2px
│  Cliente: Juan Pérez López          Tel: 614-555-1234       │    Centro
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────┬────────────────────────┬──────────┬───────────────┐│ ← Tabla de
│  │Cant.│ Descripción            │P. Unit.  │ Importe       ││    productos
│  ├─────┼────────────────────────┼──────────┼───────────────┤│    Grid: 4 cols
│  │  1  │ Lona Retroiluminada    │$1,500.00 │   $1,500.00   ││    de tabla
│  │     │ 3×2m, terminado mate   │          │               ││
│  ├─────┼────────────────────────┼──────────┼───────────────┤│
│  │  2  │ Bastidor metálico      │  $250.00 │     $500.00   ││
│  │     │ para instalación       │          │               ││
│  ├─────┴────────────────────────┴──────────┼───────────────┤│
│  │                              SUBTOTAL:  │   $2,000.00   ││ ← Pie Financiero
│  │                      ANTICIPOS (-):     │   - $1,000.00 ││    monospaced
│  │                              ────────── │  ────────────  ││
│  │                  ██ SALDO PENDIENTE: ██  │  $1,000.00    ││ ← SALDO en
│  └─────────────────────────────────────────┴───────────────┘│    $gray-950
│                                                             │    BOLD, 18px
│  Observaciones:                                             │    borde grueso
│  Instalación incluida. Contactar al llegar al sitio.        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                           ┌───────────────┐ │
│  Método de pago de anticipos:             │ ┌───────────┐ │ │ ← QR Code
│  • Pago 1: $1,000 (Transferencia)         │ │           │ │ │    Posición:
│    02/08/2026 10:30 - Registró: Admin     │ │  [QR CODE]│ │ │    ESQUINA
│                                           │ │  120×120  │ │ │    INFERIOR
│                                           │ │  px       │ │ │    DERECHA
│                                           │ └───────────┘ │ │    (SRS §Fase
│                                           │  Escanee para │ │     3, 5.2)
│                                           │  verificar    │ │
│                                           └───────────────┘ │
│                                                             │
│  Este documento no es un comprobante fiscal.                │ ← Disclaimer
│  Generado por PrintFlow AI © 2026                           │    $gray-400, 8px
└─────────────────────────────────────────────────────────────┘
```

#### Payload del QR

> **Ref:** SRS §Fase 3, 5.2 — "El payload NO debe ser una simple URL, sino el hash UUID".

```json
{
  "order_hash": "550e8400-e29b-41d4-a716-446655440000"
}
```

**El QR codifica el `qr_code_hash`** (campo de `orders`, SRS §Fase 1, 1.3), NO el `id` real del pedido. Esto previene la enumeración de recursos (SRS §Fase 1, 1: "UUIDs para prevenir enumeración").

| Propiedad del QR | Valor |
|---|---|
| Tamaño de renderizado | 120×120px (15 × 8pt) |
| Error Correction Level | `M` (Medium, 15% de daño tolerable — considerando impresiones en lona que pueden rayarse) |
| Posición en la página | Esquina inferior derecha, margen 24px desde el borde derecho y 24px desde el borde inferior |
| Librería | `qrcode.react` (SRS §Fase 3, 5.1) |

#### Datos Obligatorios en el PDF (Audit Trail de Pagos)

El pie financiero incluye el desglose de **todos los abonos** registrados en `payments` para ese `order_id` (SRS §Fase 1, 1.4). Cada línea de abono muestra:
- Monto (`amount`)
- Método de pago (`payment_method`)
- Fecha y hora (`created_at`)
- Nombre del empleado que registró (`users.full_name` vía `registered_by`)

Esto constituye la Bitácora de Eventos (Audit Trail) requerida en el BRD §8.

---

### Pantalla 4: Panel de Excepciones (Modo Supervisor)

**Propósito Funcional:** Funciones de override exclusivas del Administrador. Permite bypassear las reglas de negocio estrictas en situaciones excepcionales, registrando una bitácora de auditoría para cada excepción.

> **Ref:** SRS §Fase 3, 6 — "Solo la cuenta de Andri/Dueño tiene acceso".  
> **Ref:** BRD §6, Actor 1 — "único perfil facultado para autorizar la entrega excepcional".

#### Acceso y Seguridad

- Esta pantalla está detrás de un `<ProtectedRoute requiredRole="ADMIN">` (SRS §Fase 3, 2).
- Si un usuario con rol `INSTALLER` intenta navegar a la ruta `/admin/excepciones` manualmente, se redirecciona a "Acceso Denegado" (SRS §Fase 3, 2).
- El acceso requiere **re-autenticación** o confirmación adicional (SRS §Fase 3, 6: "requiera re-autenticar o confirmar la acción").

#### Layout (Columnas 3-12 del grid maestro)

```
┌────────────────────────────────────────────────────────────┐
│  MODO SUPERVISOR — Acciones Avanzadas          [🔒 ADMIN]  │
│  ⚠ Todas las acciones quedan registradas en bitácora       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────────────────────────────────────────────────┐│
│  │ 1. FORZAR ENTREGA (CLIENTE CON CRÉDITO)               ││
│  │ ──────────────────────────────────────────────────── ││
│  │ Seleccionar Pedido: [Dropdown de órdenes con saldo>0 ▼]│
│  │                                                        ││
│  │ Justificación *:                                       ││
│  │ ┌────────────────────────────────────────────────────┐ ││
│  │ │                                                    │ ││ ← Textarea
│  │ │  [____________________________________]            │ ││    min-height:
│  │ │                                                    │ ││    96px (12×8pt)
│  │ └────────────────────────────────────────────────────┘ ││
│  │  Caracteres: 0/500  (Mínimo: 10 caracteres)           ││
│  │                                                        ││
│  │  ┌─────────────────────────────────────┐               ││
│  │  │  AUTORIZAR ENTREGA EXCEPCIONAL      │               ││ ← Botón: DISABLED
│  │  └─────────────────────────────────────┘               ││    hasta que
│  └────────────────────────────────────────────────────────┘│    textarea.length>=10
│                                                            │
│  ┌────────────────────────────────────────────────────────┐│
│  │ 2. MODIFICAR FECHA PACTADA DE ENTREGA                 ││
│  │ ──────────────────────────────────────────────────── ││
│  │ Seleccionar Pedido: [Dropdown ▼]                       ││
│  │ Fecha actual: 05/08/2026 14:00                         ││
│  │                                                        ││
│  │ Nueva Fecha *:                                         ││
│  │ ┌────────────────────────────────────────────────────┐ ││
│  │ │  [Datetime Picker: dd/mm/yyyy HH:mm]               │ ││ ← Input datetime
│  │ └────────────────────────────────────────────────────┘ ││    height 48px
│  │                                                        ││
│  │ Razón del Cambio *:                                    ││
│  │ ┌────────────────────────────────────────────────────┐ ││
│  │ │  [____________________________________]            │ ││ ← Textarea
│  │ │                                                    │ ││    OBLIGATORIO
│  │ └────────────────────────────────────────────────────┘ ││    (BRD §7 R.4;
│  │  Caracteres: 0/500  (Mínimo: 10 caracteres)           ││     SRS §Fase 3,6)
│  │                                                        ││
│  │  ┌─────────────────────────────────────┐               ││
│  │  │  GUARDAR NUEVA FECHA                │               ││ ← Botón: DISABLED
│  │  └─────────────────────────────────────┘               ││    si textarea vacío
│  └────────────────────────────────────────────────────────┘│    O datetime vacío
│                                                            │
│  ┌────────────────────────────────────────────────────────┐│
│  │ 3. INICIAR PRODUCCIÓN SIN ANTICIPO DEL 50%            ││
│  │ ──────────────────────────────────────────────────── ││
│  │ Seleccionar Pedido: [Dropdown de órdenes PENDING ▼]    ││
│  │                                                        ││
│  │ Justificación *:                                       ││
│  │ ┌────────────────────────────────────────────────────┐ ││
│  │ │  [____________________________________]            │ ││ ← Textarea
│  │ └────────────────────────────────────────────────────┘ ││    obligatorio
│  │  Caracteres: 0/500  (Mínimo: 10 caracteres)           ││
│  │                                                        ││
│  │  ┌─────────────────────────────────────┐               ││
│  │  │  FORZAR INICIO DE PRODUCCIÓN        │               ││ ← Botón: DISABLED
│  │  └─────────────────────────────────────┘               ││    hasta justificación
│  └────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
```

#### Regla de Validación del Botón de Guardado

> **Ref:** SRS §Fase 3, 6, Punto 4 — "obliga al dueño a llenar un campo de texto obligatorio llamado 'Razón del Cambio' antes de habilitar el botón de Guardar".

**Regla universal para los 3 bloques de excepción:**

```
Button.disabled = (textarea.value.trim().length < 10)
```

| Propiedad del Textarea | Valor |
|---|---|
| Longitud mínima | 10 caracteres (para evitar justificaciones vacías como "ok" o "sí") |
| Longitud máxima | 500 caracteres |
| Placeholder | "Describa la razón por la que esta excepción es necesaria..." |
| Contador de caracteres | Visible debajo del textarea, formato "X/500" |

**Estados del botón de cada bloque:**

| Estado | Condición | Apariencia |
|---|---|---|
| Disabled | `textarea.length < 10` OR campos requeridos vacíos | `$gray-200` bg, `$gray-400` text, `cursor: not-allowed` |
| Default | Todos los campos válidos | `$gray-600` bg, `$gray-000` text |
| Loading | Petición en vuelo | `$gray-300` bg, spinner, `disabled={true}` |
| Success | Petición exitosa | Toast verde: "Excepción registrada en bitácora." Modal de confirmación: "¿Está seguro? Esta acción quedará registrada." → Confirmar / Cancelar |

#### Confirmación Doble (Safety Net)

Antes de ejecutar cualquier excepción, se muestra un **modal de confirmación**:

```
┌────────────────────────────────────────┐
│  ⚠ CONFIRMAR ACCIÓN DE SUPERVISOR     │
│                                        │
│  Está a punto de: [Descripción]        │
│  Pedido: ORD-2026-0847                 │
│  Justificación: [Texto ingresado]      │
│                                        │
│  Esta acción quedará registrada en     │
│  la bitácora de auditoría.             │
│                                        │
│  ┌──────────┐    ┌──────────────────┐  │
│  │ CANCELAR │    │ CONFIRMAR ACCIÓN │  │
│  └──────────┘    └──────────────────┘  │
└────────────────────────────────────────┘
```

### Componentes Globales POS Web

#### Toast de Notificación

> **Ref:** SRS §Fase 3, 7 — `react-hot-toast`

```
Esquina superior derecha, ancho 320px (40 × 8pt):

┌────────────────────────────────────┐
│ ✓ Abono registrado correctamente   │ ← Éxito: borde izquierdo
│   Saldo actualizado: $250.00       │    4px $gray-600
│                            [✕]     │    Auto-dismiss: 4 segundos
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ ✕ Error al procesar el pago        │ ← Error: borde izquierdo
│   Reintente o contacte a soporte   │    4px $gray-950
│                            [✕]     │    Auto-dismiss: 8 segundos
└────────────────────────────────────┘
```

#### Lock Screen (Inactividad 30 min)

> **Ref:** SRS §Fase 3, 2 — timeout de inactividad

```
┌────────────────────────────────────────────────────────────┐
│ ██████████████████████████████████████████████████████████ │
│ ██                                                     ██ │
│ ██    🔒 Sesión pausada por inactividad                ██ │
│ ██                                                     ██ │
│ ██    Ingrese su contraseña para continuar:             ██ │
│ ██    ┌────────────────────────────────┐                ██ │
│ ██    │ [••••••••]                     │                ██ │
│ ██    └────────────────────────────────┘                ██ │
│ ██    ┌────────────────────────────────┐                ██ │
│ ██    │     DESBLOQUEAR                │                ██ │
│ ██    └────────────────────────────────┘                ██ │
│ ██                                                     ██ │
│ ██████████████████████████████████████████████████████████ │
└────────────────────────────────────────────────────────────┘
Overlay: $gray-950 al 70% de opacidad. z-index máximo.
No se puede cerrar con Escape ni clic fuera.
```

---

## 4. Tareas de Faride: Especificaciones de Landing Page (Fase 8)

> **Referencia:** SRS §Fase 3 (Landing mencionada como módulo público), BRD §5 (Módulo 1: Sitio Web Público), Brief §3.  
> **Grilla Desktop:** 12 columnas, gutter 24px, max-width 1200px, centrado.  
> **Grilla Mobile:** 4 columnas, gutter 16px, margen 16px.  
> **Actor:** Visitante anónimo (cliente potencial).  
> **Objetivo de Conversión:** Transicionar el tráfico hacia WhatsApp (wa.me) para interacción con el Chatbot N8N. **Cero carga en el servidor.**

> [!IMPORTANT]
> **REGLA TÉCNICA PARA FARIDE — Tráfico Outbound sin Carga en Servidor:**
> Todo CTA (botón, enlace, FAB) que conduzca a WhatsApp debe implementarse como un enlace `<a href="https://wa.me/521XXXXXXXXXX?text=..." target="_blank" rel="noopener noreferrer">`. Esto genera una navegación directa del navegador del visitante a la API de WhatsApp. **No se ejecuta ninguna petición al servidor propio, no se consume ancho de banda del VPS, y no se dispara ningún endpoint de N8N desde la Landing.** La única conexión con N8N se produce cuando el mensaje llega a WhatsApp y Meta dispara el Webhook (SRS §Fase 2, 1.1). El hosting de la Landing es gratuito en Vercel/Cloudflare (Propuesta de Infraestructura §3: Frontend $0.00 USD/mes).

---

### Sección 1: Hero con Propuesta de Valor

#### Layout Desktop (12 columnas)

```
┌──────────────────────────────────────────────────────────────────────┐
│  [LOGO PLACEHOLDER]   Imprenta Escalante   [Servicios] [Proceso]   │ ← Navbar: 72px
│                                                          [Cotizar] │    sticky top
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Cols 1-6                              Cols 7-12                    │
│  ┌─────────────────────────┐   ┌──────────────────────────────┐     │
│  │                         │   │                              │     │
│  │  Impresión de Gran      │   │  [IMAGEN PLACEHOLDER]        │     │  ← Hero
│  │  Formato que             │   │   Rectángulo con aspa        │     │     Height:
│  │  Impulsa tu Marca       │   │   480×360px                  │     │     ~600px
│  │                         │   │   (Mockup de lona/vinilo)    │     │
│  │  Lonas, viniles y       │   │                              │     │
│  │  señalización con       │   └──────────────────────────────┘     │
│  │  calidad profesional.   │                                        │
│  │  Cotiza en segundos     │                                        │
│  │  por WhatsApp.          │                                        │
│  │                         │                                        │
│  │  ┌───────────────────┐  │                                        │
│  │  │ 💬 COTIZAR POR    │  │  ← CTA Principal: height 56px         │
│  │  │    WHATSAPP       │  │     span 4 cols, $gray-600 bg          │
│  │  └───────────────────┘  │     $gray-000 text, 16px bold          │
│  │                         │     href="https://wa.me/521XXX         │
│  │  Texto: "Respuesta en   │     ?text=Hola, quiero cotizar"        │
│  │  menos de 5 segundos"   │     target="_blank"                    │
│  │                         │                                        │
│  └─────────────────────────┘                                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### Layout Mobile (4 columnas)

```
┌──────────────────────────────┐
│  [☰]  Imprenta Escalante    │ ← Navbar: 56px. Hamburger menu.
├──────────────────────────────┤
│                              │
│  ┌──────────────────────────┐│
│  │ [IMAGEN PLACEHOLDER]     ││ ← Imagen arriba en mobile
│  │  Span 4 cols, 240px h    ││    (invierte orden vs desktop)
│  └──────────────────────────┘│
│                              │
│  Impresión de Gran Formato   │ ← Título: 24px bold, centrado
│  que Impulsa tu Marca        │
│                              │
│  Lonas, viniles y            │ ← Subtítulo: 14px, centrado
│  señalización...             │    $gray-600
│                              │
│  ┌──────────────────────────┐│
│  │ 💬 COTIZAR POR WHATSAPP  ││ ← CTA: span 4 cols, height 56px
│  └──────────────────────────┘│    mismas propiedades que desktop
│                              │
│  "Respuesta en <5 segundos"  │
│                              │
└──────────────────────────────┘
```

#### Sticky FAB (Floating Action Button)

> **Ref:** Brief §3 — "botón flotante llamativo de 'Cotizar por WhatsApp'".

| Propiedad | Valor |
|---|---|
| Posición | `position: fixed; bottom: 24px; right: 24px;` |
| Dimensiones | 56×56px (7 × 8pt) — mínimo 48×48px táctil |
| Forma | Círculo (`border-radius: 50%`) |
| Relleno | `$gray-600` |
| Ícono | Placeholder de burbuja de chat, 24×24px, `$gray-000` |
| Z-Index | Superior a todo el contenido, inferior solo a modales |
| Visibilidad | `display: none` cuando el Hero CTA está visible en viewport (detectar con `IntersectionObserver`). Se hace visible al hacer scroll pasando el Hero. |
| Hover | Escala `transform: scale(1.1)` con `transition: 200ms ease` |
| Href | Idéntico al CTA principal: `https://wa.me/521XXXXXXXXXX?text=Hola, quiero cotizar` |
| Target | `_blank` con `rel="noopener noreferrer"` |

**Justificación de visibilidad condicional:** Evitar redundancia visual cuando el CTA principal del Hero ya está en pantalla. El FAB solo aparece cuando el usuario ha scrolleado y el CTA del Hero sale del viewport.

---

### Sección 2: Catálogo de Servicios (Tarjetas con Deep Links)

#### Layout Desktop (12 columnas)

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                    NUESTROS SERVICIOS                                 │ ← Título sección
│                                                                      │    $gray-800, 28px bold
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ [IMG PLACEHOLDER] │ [IMG PLACEHOLDER] │ [IMG PLACEHOLDER] │       │ ← Grid: 3 cols
│  │  Span 4 cols  │  │  Span 4 cols  │  │  Span 4 cols  │            │    (4 cols c/u
│  │  200px height │  │  200px height │  │  200px height │            │    del grid 12)
│  │               │  │               │  │               │            │
│  │ LONAS Y       │  │ VINILES Y     │  │ PAPELERÍA     │            │
│  │ GRAN FORMATO  │  │ ROTULACIÓN    │  │ COMERCIAL     │            │
│  │               │  │               │  │               │            │
│  │ Impresión de  │  │ Rotulación de │  │ Tarjetas,     │            │
│  │ lonas hasta   │  │ vehículos,    │  │ flyers,       │            │
│  │ 5m de ancho.  │  │ aparadores... │  │ folletos...   │            │
│  │               │  │               │  │               │            │
│  │ ┌────────────┐│  │ ┌────────────┐│  │ ┌────────────┐│            │
│  │ │COTIZAR LONA││  │ │COTIZAR     ││  │ │COTIZAR     ││            │
│  │ │    💬      ││  │ │ VINIL  💬  ││  │ │ TARJETAS💬 ││            │
│  │ └────────────┘│  │ └────────────┘│  │ └────────────┘│            │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### Deep Links Parametrizados a WhatsApp

Cada botón de tarjeta de servicio tiene un `href` con `text` pre-parametrizado para que cuando el mensaje llegue al Chatbot N8N, el sistema pueda inferir la intención del cliente:

| Servicio | URL del Botón |
|---|---|
| Lonas y Gran Formato | `https://wa.me/521XXXXXXXXXX?text=Hola, me interesa cotizar una lona de gran formato` |
| Viniles y Rotulación | `https://wa.me/521XXXXXXXXXX?text=Hola, me interesa cotizar rotulación de vinil` |
| Papelería Comercial | `https://wa.me/521XXXXXXXXXX?text=Hola, me interesa cotizar tarjetas de presentación` |

> **Regla técnica:** Estos links utilizan la API pública de WhatsApp (`wa.me`). Al hacer clic, el navegador del visitante abre WhatsApp (web o app) directamente. **No se genera ninguna petición HTTP al servidor propio, no se consume ancho de banda del VPS, y no se dispara ningún endpoint de N8N desde la Landing.** La única conexión con N8N se produce cuando el mensaje llega a WhatsApp y Meta dispara el Webhook (SRS §Fase 2, 1.1). Cero carga en servidor = $0.00 en costos de hosting por la Landing (Propuesta de Infraestructura §3: Frontend).

#### Layout Mobile (4 columnas) — Tarjetas Apiladas

Las 3 tarjetas se apilan verticalmente (span 4 cols cada una) con 16px de separación entre ellas. El orden se mantiene.

---

### Sección 3: Trust Factors (Proceso de 3 Pasos + Política de Anticipos)

**Propósito:** Reducir la ansiedad de compra del visitante explicando el proceso y la política de anticipos (BRD §7, Regla 2: anticipo del 50%).

#### Layout Desktop (12 columnas)

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                    CÓMO FUNCIONA                                     │ ← Título, centrado
│                    (Fácil y Seguro)                                   │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │     ①        │  │     ②        │  │     ③        │               │ ← Grid: 3 cols
│  │  [ÍCONO      │  │  [ÍCONO      │  │  [ÍCONO      │               │
│  │  PLACEHOLDER]│  │  PLACEHOLDER]│  │  PLACEHOLDER]│               │
│  │  64×64px     │  │  64×64px     │  │  64×64px     │               │
│  │              │  │              │  │              │               │
│  │ ESCRIBE AL   │  │ APRUEBA TU   │  │ RECOGE EN    │               │
│  │ BOT          │  │ DISEÑO       │  │ TIENDA       │               │
│  │              │  │              │  │              │               │
│  │ Envía un     │  │ Te enviamos  │  │ Tu pedido    │               │
│  │ mensaje por  │  │ la prueba de │  │ estará listo │               │
│  │ WhatsApp y   │  │ diseño.      │  │ en la fecha  │               │
│  │ recibe tu    │  │ Apruébala y  │  │ pactada. Solo│               │
│  │ cotización   │  │ envía tu     │  │ escanea y    │               │
│  │ en segundos. │  │ anticipo     │  │ retíralo.    │               │
│  │              │  │ (50%).       │  │              │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 🔒 POLÍTICA DE ANTICIPOS                                      │  │ ← Trust panel
│  │                                                                │  │    Fondo $gray-100
│  │ Para iniciar la producción de tu pedido personalizado,         │  │    Borde $gray-200
│  │ solicitamos un anticipo del 50% del valor total.               │  │    Padding 24px
│  │ El saldo restante se liquida al momento de la entrega.         │  │    $gray-600 text
│  │                                                                │  │
│  │ Tu pago queda registrado digitalmente con un código QR         │  │    Referencia directa
│  │ único en tu nota de remisión. Transparencia total.             │  │    a BRD §7, Regla 2
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │          💬 ¿LISTO? COTIZA AHORA POR WHATSAPP            │       │ ← CTA Final
│  └──────────────────────────────────────────────────────────┘       │    $gray-600 bg
│                                                                      │    span 8 cols, center
│                                                                      │    height 56px
└──────────────────────────────────────────────────────────────────────┘
```

#### Footer

```
┌──────────────────────────────────────────────────────────────────────┐
│  Imprenta Escalante © 2026        │  Horario: L-V 9:00-18:00       │
│  Dirección: [Placeholder]         │  Sábados: 9:00-14:00           │
│  Tel: [Placeholder]               │                                 │
│                                   │  [Aviso de Privacidad]          │
└──────────────────────────────────────────────────────────────────────┘
```

#### Edge Cases de Landing

| Caso | Comportamiento UI |
|---|---|
| WhatsApp no instalado en dispositivo | El link `wa.me` redirige al usuario a la web de WhatsApp automáticamente (comportamiento nativo de la API de Meta). No requiere código adicional. |
| JavaScript deshabilitado | La Landing es HTML estático servido por CDN. Los links `<a href>` funcionan sin JavaScript. Solo el FAB con `IntersectionObserver` no funcionará — se mantiene visible siempre como fallback. |
| SEO / Performance | La Landing es pre-renderizada (SSG) por Vercel/Cloudflare. Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1. Sin llamadas a API. Sin hydration pesada. |

---

## 5. Checklist de Revisión (Junta Directiva)

La siguiente matriz de validación técnica será utilizada por **Isaias (Líder Técnico)** para aprobar los wireframes antes de autorizar el paso a la fase de Alta Fidelidad y Color. **Los 5 puntos deben pasar con "APROBADO"** para proceder.

### Matriz de Validación Técnica

| # | Criterio de Validación | Método de Verificación | Resultado |
|---|---|---|---|
| **1** | **Integridad de la Regla de Oro (BRD §7, Regla 3)** — En los frames de la PWA, la Pantalla 3 (Alerta Roja) NO contiene ningún componente de tipo botón con acción de entrega. El botón "Confirmar Entrega Física" solo existe en el frame de la Pantalla 4 (Alerta Verde). Verificar que la anotación de `SPEC-NOTE` del renderizado condicional esté presente. | Inspección visual directa de los frames de Figma/Penpot. Buscar el componente `Mobile/Dispatch/Button--Deliver` en el árbol de capas de Pantalla 3 — **NO debe existir**. Verificar que existe en Pantalla 4. | ☐ APROBADO / ☐ RECHAZADO |
| **2** | **Confidencialidad Financiera en PWA (SRS §Fase 1, 3 — RLS)** — En el frame de Pantalla 5 (Kanban "Mi Ruta"), NINGUNA tarjeta de pedido muestra campos con signo de pesos ($), valores de `total_price`, `balance_due`, ni cualquier dato de la tabla `payments`. Solo se muestran: producto, cliente y fecha de entrega. | Inspección de cada tarjeta en el frame "Mi Ruta". Verificar ausencia de tokens `$`, campos monetarios o labels como "Saldo", "Total", "Abono". | ☐ APROBADO / ☐ RECHAZADO |
| **3** | **Prevención de Doble Clic en POS (SRS §Fase 3, 4.1)** — El Modal de Transacción (Pantalla 2 del POS) contiene el frame del botón "Registrar Abono" en sus 5 estados: Default, Hover, Disabled (pre-validación), Loading (con spinner y `disabled={true}`), y Error (post-submit). El estado Loading demuestra visualmente que el botón no es clicable durante la petición. | Verificar que existen 5 variantes del componente `Web/POS/Button--Primary` dentro del frame del Modal. El estado Loading debe mostrar spinner, texto "PROCESANDO..." y anotación de `disabled={true}`. | ☐ APROBADO / ☐ RECHAZADO |
| **4** | **Conformidad con Grilla 8pt** — Muestreo aleatorio de 3 pantallas (1 PWA, 1 POS, 1 Landing). Todos los valores de padding, margin, height de componentes y spacing entre elementos son múltiplos exactos de 8px. Tolerancia: 0 (cero desviaciones). | Activar la overlay de grilla 8×8px en Figma/Penpot. Seleccionar 5 elementos aleatorios por pantalla y verificar coordenadas y dimensiones. | ☐ APROBADO / ☐ RECHAZADO |
| **5** | **Cobertura de Edge Cases y Empty States (§1.5)** — Cada una de las pantallas principales (PWA: 5, POS: 4, Landing: 3 secciones) tiene como mínimo un frame alternativo que muestra su estado cuando no hay datos (Empty State) y su estado cuando no hay conexión de red (Offline State). Para la Landing, verificar el fallback del FAB sin JavaScript. | Contar frames de edge cases en el archivo de diseño. Mínimo esperado: (5 pantallas PWA × 2 estados) + (4 pantallas POS × 2 estados) + (1 edge case Landing) = **19 frames de edge case mínimos**. | ☐ APROBADO / ☐ RECHAZADO |

---

### Protocolo de Revisión

1. **Convocatoria:** Isaias agenda la sesión de revisión con Emir y Faride presentes (o en videollamada).
2. **Walkthrough:** Cada diseñador presenta sus pantallas siguiendo el orden de este documento.
3. **Verificación:** Isaias ejecuta la Matriz de los 5 puntos en tiempo real, compartiendo pantalla.
4. **Resultado:**
   - Si los 5 puntos pasan: **Gate aprobado.** Se autoriza la Etapa 2 (Alta Fidelidad con paleta de color corporativa y tipografía de marca).
   - Si 1 o más puntos fallan: **Gate rechazado.** Se documenta la deficiencia, se asigna plazo de corrección (máximo 48 horas), y se reprograma la revisión.
5. **Registro:** El resultado se documenta en el acta de la reunión y se sube al repositorio del proyecto.

---

> **Nota Final del Director UX/UI:**  
> Este documento no es una sugerencia. Es una especificación contractual entre diseño e ingeniería. Cada pixel que no respete la grilla, cada estado de componente que falte, y cada regla de negocio que no se refleje en el wireframe, se convertirá en un bug de producción que le costará dinero real a Imprenta Escalante. Diseñen como si el código ya existiera.

---

**Fin del Documento — Spec-Kit v1.0**  
**Próxima Etapa:** Alta Fidelidad (post-aprobación de Gate) → Color, Tipografía de Marca, Micro-animaciones.
