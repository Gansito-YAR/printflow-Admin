# Asignación Fase 1 — FARIDE · Landing Page (Maquetado UI/UX sin color)

| Campo | Detalle |
|---|---|
| Proyecto | **PrintFlow AI** — Imprenta Escalante |
| Módulo | Fase 8 del SRS — Landing Page Pública (Top of Funnel) |
| Responsable | **Faride** — Frontend / UI-UX |
| Aprueba | **Isaías** — Líder Técnico |
| Repositorio | `printflow-landing` |
| Duración | **Máximo 5 días hábiles** |
| Entregable | Landing maquetada, responsiva, **en escala de grises**, desplegada en preview |
| Documentos fuente | `Wireframe Spec-Kit - Etapa 1 - PrintFlow AI - V2 Final.md` §1 y §4 · `Arquitectura y Documentacion SRS` Fase 8 · `Brief de Prototipado UI_UX` §3 |

---

## 1. Contexto del proyecto (léelo completo, es lo que tu IA necesita saber)

**Imprenta Escalante** es una imprenta y centro de diseño publicitario: lonas, viniles, papelería comercial (tarjetas, flyers, folletos) y promocionales. Atiende menudeo y mayoreo. El dueño hace absolutamente todo (vende, cotiza, diseña, opera las máquinas, cobra) y tiene 2 trabajadores que salen a instalar.

**El problema que resuelve tu módulo:** los clientes escriben por WhatsApp y el dueño tarda de 1 a 4 horas en responder porque está operando una máquina. Se pierde entre el **20% y el 30% de las cotizaciones** por tardanza. En impresión rápida, si no respondes en 10 minutos el cliente se va con otro proveedor local.

**PrintFlow AI** es el sistema completo que estamos construyendo. Tiene 4 piezas:

1. **Landing Page pública** ← *esto es lo tuyo*
2. **Chatbot de IA en WhatsApp** (N8N + LLM) — atiende y cotiza en menos de 5 segundos
3. **Panel Administrativo POS** (web) — el dueño gestiona pedidos, cobros y fechas
4. **App móvil PWA** (Emir) — los instaladores escanean un QR y el sistema les impide entregar si el cliente debe dinero

**Tu misión concreta:** la Landing es la *boca del embudo*. Su única conversión válida es **abrir una conversación prellenada en WhatsApp**. No vende en línea, no registra pedidos, no guarda datos. Un visitante llega, entiende qué hace la imprenta, y hace clic en un botón que le abre WhatsApp con un mensaje ya escrito. Ese mensaje es lo que despierta al bot con el contexto correcto.

---

## 2. Reparto del equipo (para que sepas a quién preguntarle qué)

| Persona | Responsabilidad |
|---|---|
| **Isaías** | Líder técnico. Planeación, Panel Administrativo POS y **base de datos / API**. Aprueba tu entrega. |
| **Faride** | **Landing Page** (diseño + maquetado). |
| **Emir** | App móvil PWA de instaladores. Apoyo posterior al POS. |
| **Andri** | Analista de negocio / enlace con el cliente. Textos reales, fotos y número de WhatsApp oficial salen de aquí. |

**Regla:** si una duda es de *contenido o negocio* → Andri. Si es de *técnica, alcance o arquitectura* → Isaías. No inventes reglas de negocio ni promesas comerciales.

---

## 3. Alcance EXACTO de esta Fase 1

### ✅ SÍ entra

- Estructura HTML semántica completa de todas las secciones de la landing.
- Layout responsivo real: **desktop 1440 y mobile 360** (con QA en 320, 390, 430, 1280, 1920).
- **Escala de grises únicamente.** Cero color de marca.
- Cajas placeholder en lugar de imágenes reales.
- Deep links a WhatsApp funcionando (son `<a href>`, no requieren backend).
- Estados de los botones/enlaces: `Default`, `Hover`, `Focus`, `Disabled`, `Error`.
- Accesibilidad base: orden de foco, labels, contraste, navegación por teclado.
- Deploy a un preview público (Cloudflare Pages o Vercel).

### ❌ NO entra (no lo hagas todavía)

- **Colores de marca, gradientes, sombras decorativas, fotografías reales, iconografía propietaria, tipografías de marca.** Eso es Etapa 2 y se aprueba aparte.
- Animaciones, parallax, scroll reveal, librerías de animación.
- Formularios de contacto, newsletter, captura de correo o teléfono. **La landing no captura datos personales de nadie.**
- Cualquier llamada a un servidor: `fetch`, XHR, Server Actions, webhooks, Supabase. **Cero.**
- Blog, precios publicados, carrito, login, panel de cliente.
- Google Analytics / Meta Pixel (se integra después, cuando Andri entregue las cuentas).
- Contenido legal definitivo (aviso de privacidad, términos). Deja el enlace con texto placeholder.

---

## 4. Stack tecnológico obligatorio

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | **Astro** (última versión estable) | La landing es 100% estática. Astro genera HTML puro, carga en menos de 1 segundo y no arrastra runtime de JS. Los archivos `.astro` son básicamente HTML + CSS, más simple que React para este caso. |
| Estilos | **Tailwind CSS** | Consistencia con el resto del proyecto y control fino del grid de 8 puntos. |
| Lenguaje | **TypeScript** | Para el catálogo de servicios tipado. |
| Node | **Node 20 LTS** | |
| Gestor | **npm** | Uniforme para todo el equipo. |
| Hosting | **Cloudflare Pages** o **Vercel** (Free Tier) | Deploy estático, CDN global, HTTPS automático, costo $0. |

**Inicialización:**

```bash
npm create astro@latest printflow-landing -- --template minimal --typescript strict --no-install --no-git
```

```bash
cd printflow-landing && npm install && npx astro add tailwind
```

> **Si prefieres React + Vite en lugar de Astro, pídeselo a Isaías antes de empezar.** No lo cambies por tu cuenta: el deploy y el CI están planeados sobre Astro.

---

## 5. Repositorio y forma de trabajo

- Repo: **`printflow-landing`** (repo independiente, no compartido con las otras apps).
- Rama principal: `main`. **Nunca commitees directo a `main`.**
- Trabaja en ramas: `feat/hero`, `feat/catalogo`, `feat/trust`, `feat/footer`, `chore/setup`.
- Commits en español, formato: `feat: maqueta seccion hero desktop y mobile`.
- Abre **Pull Request a `main`** y asigna a Isaías como revisor. Nada entra sin revisión.
- `.env` **jamás** se sube al repo. Añade `.gitignore` desde el commit inicial.

---

## 6. Sistema visual sin color (esto es lo más importante de la fase)

No estás eligiendo estética. Estás construyendo **estructura**. Cuando llegue la identidad visual, solo se cambian variables CSS y nada del maquetado se rehace.

### 6.1 Tokens de color — crea `src/styles/tokens.css`

```css
:root {
  /* Superficies — se reemplazarán por la paleta de marca en Etapa 2 */
  --surface-0: #ffffff;   /* fondo de página */
  --surface-1: #f5f5f5;   /* tarjetas, bloques */
  --surface-2: #e0e0e0;   /* placeholders de imagen */
  --surface-3: #bdbdbd;   /* tramas, separadores fuertes */

  /* Tinta */
  --ink-strong: #111111;  /* títulos */
  --ink-base:   #333333;  /* cuerpo */
  --ink-muted:  #757575;  /* secundario, deshabilitado */

  /* Bordes */
  --border-hairline: #d4d4d4;
  --border-strong:   #111111;
}
```

**Regla dura:** ningún componente usa un color literal. Todo pasa por estas variables. Si necesitas un tono nuevo, agrégalo aquí, nunca inline.

### 6.2 Grid de 8 puntos

Todo espaciado es múltiplo de 8. Excepciones permitidas: bordes de 1/2/4 px y el ancho resultante de las columnas.

| Token | Valor | Uso |
|---|---:|---|
| `space-1` | 8 px | separación icono ↔ etiqueta |
| `space-2` | 16 px | padding mobile, controles relacionados |
| `space-3` | 24 px | gutter desktop |
| `space-4` | 32 px | padding de bloques |
| `space-6` | 48 px | separación de secciones (mobile) |
| `space-8` | 64 px | separación de secciones (desktop) |
| `space-10` | 80 px | separación excepcional |

**Desktop 1440:** 12 columnas · márgenes laterales 48 px · gutter 24 px · contenedor máximo **1344 px** · header 72 px.
**Mobile 360:** 4 columnas · márgenes 16 px · gutter 16 px · header 56 px.
**Ritmo vertical entre secciones:** 64–80 px desktop, 48–64 px mobile.

### 6.3 Placeholders obligatorios

| Elemento | Cómo se representa |
|---|---|
| Logo | Caja gris con texto `[LOGO PLACEHOLDER — NO ASSET REAL]` |
| Foto de servicio | Caja gris relación **4:3** con texto `[IMAGEN SERVICIO 4:3 — PLACEHOLDER]` |
| Icono | Nombre entre corchetes: `[WA]`, `[CHECK]`, `[ARROW]` |
| Tipografía | Solo `system-ui`. Nada de Google Fonts todavía. |

### 6.4 Jerarquía sin color

Como no puedes usar color para diferenciar, la jerarquía se construye con: **tamaño de texto, peso, grosor de borde (1/2/4 px), tono de gris y espaciado**. Un botón primario y uno secundario deben distinguirse aunque los imprimas en blanco y negro.

---

## 7. Estructura de carpetas

```
printflow-landing/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Hero.astro
│   │   ├── WhatsAppFab.astro
│   │   ├── ServiceCard.astro
│   │   ├── ServicesGrid.astro
│   │   ├── TrustPolicy.astro
│   │   ├── ProcessSteps.astro
│   │   ├── Footer.astro
│   │   └── ui/
│   │       ├── Button.astro          # variantes: primary | secondary | disabled
│   │       └── PlaceholderBox.astro  # caja gris con label y aspect-ratio
│   ├── data/
│   │   └── services.ts               # catálogo + allowlist de service_id
│   ├── lib/
│   │   └── whatsapp.ts               # constructor de deep links
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   └── index.astro
│   └── styles/
│       ├── tokens.css
│       └── global.css
├── .env.example
├── astro.config.mjs
├── tailwind.config.mjs
└── README.md
```

---

## 8. Secciones a construir

> Cada sección debe existir en **desktop y mobile**. Usa `data-testid` en todo control interactivo (lo pide el checklist de aprobación).

### 8.1 Header público

- Desktop 72 px de alto, mobile 56 px.
- Izquierda: `[LOGO PLACEHOLDER]`. Derecha: enlace ancla "Servicios" y CTA "Cotizar por WhatsApp".
- En mobile puede colapsar a logo + CTA compacto. **No hagas menú hamburguesa**: no hay suficientes enlaces que justifiquen esa complejidad.

### 8.2 Hero — `data-testid="hero"`

**Desktop:** texto en columnas 1–7, placeholder visual en columnas 8–12.
**Mobile:** H1 → texto de apoyo → CTA → placeholder visual (el placeholder **va debajo del CTA**, nunca antes).

- **H1:** *"Cotiza tus impresos por WhatsApp y da seguimiento a tu pedido"*
- **Apoyo:** *"Lonas, viniles, papelería comercial y promocionales para menudeo y mayoreo."*
- **CTA principal:** "Cotizar por WhatsApp" — ancho mínimo 240 px desktop / ancho completo mobile, **alto 56 px**. `data-testid="cta-hero-whatsapp"`
- **CTA secundario opcional:** "Ver servicios" (ancla interna `#servicios`). Debe verse claramente subordinado al principal.

### 8.3 FAB flotante de WhatsApp — `data-testid="fab-whatsapp"`

Este componente tiene reglas muy específicas porque no debe estorbar nunca:

```css
/* mobile */ position: fixed; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom));
/* desktop */ right: 24px; bottom: 24px;
```

1. Hitbox **56×56 px**. Contenido: `[WA]` (no el logo real de WhatsApp todavía).
2. `aria-label="Cotizar por WhatsApp"`.
3. **Caja de exclusión de 72×72 px** en la esquina inferior derecha: ningún texto, CTA ni dato puede quedar debajo del FAB.
4. Se ancla al **viewport**, no a una columna. Nunca provoca reflow ni reduce el ancho de las columnas.
5. Cada sección lleva padding inferior suficiente para que su contenido pase por encima de la caja de exclusión al hacer scroll.
6. **Footer:** mínimo **96 px** de padding inferior. Si el bloque legal ocupa ese espacio, oculta el FAB mientras colisione.
7. **Teclado virtual:** si hay un input enfocado y el viewport se reduce, el FAB se oculta. (Hoy no hay inputs, pero deja la regla implementada para evitar regresiones.)
8. **Capas:** contenido normal < FAB < diálogo bloqueante. El FAB nunca tapa un modal legal.
9. **QA obligatorio a 320, 360, 390 y 430 px** y a **zoom 200%**: el hitbox respeta los 16 px del borde y no se recorta. Si a zoom 200% colisiona, se oculta el FAB y permanece el CTA inline.

### 8.4 Catálogo de servicios — `data-testid="servicios"`

- **Desktop:** 3 tarjetas por fila (4 columnas cada una), gap 24 px.
- **Mobile:** 1 tarjeta por fila (columnas 1–4), gap 16 px.
- Cada tarjeta: `[IMAGEN 4:3 PLACEHOLDER]` + nombre + descripción de **exactamente dos líneas** + botón "Cotizar [servicio]".
- Categorías (salen del BRD, no las cambies):
  1. **Gran formato** — lonas, viniles
  2. **Papelería comercial** — tarjetas de presentación, flyers, folletos
  3. **Promocionales**
- **Empty state:** si el catálogo viniera vacío → *"El catálogo no está disponible. Cotiza directamente por WhatsApp"* + CTA genérico. El catálogo va embebido en el build, así que este estado es defensivo.

### 8.5 Sección de confianza — `data-testid="trust"`

**Bloque de política de anticipos.** Texto textual, no lo reformules:

> "Los pedidos personalizados requieren un anticipo del 50% para iniciar producción. El saldo restante debe quedar liquidado antes de la entrega."

**Proceso de 3 pasos:**

1. **Cotiza por WhatsApp.** Comparte medidas y cantidad.
2. **Confirma y abona.** Envías tu comprobante; se valida el pago y el pedido pasa a producción.
3. **Recibe con saldo liquidado.** Se registra la fecha pactada y la entrega se autoriza solo con saldo $0.

- Desktop: 3 pasos horizontales, 4 columnas cada uno, conectores lineales en gris.
- Mobile: secuencia vertical, conectores verticales, números `01 / 02 / 03` en cajas grises.
- Después del paso 3: CTA "Iniciar cotización por WhatsApp".
- **Prohibido:** sellos de garantía, testimonios, logos de clientes, certificaciones. Nada de eso existe en las fuentes y sería inventar.

### 8.6 Footer

- Logo placeholder, dirección placeholder, horario placeholder, enlaces legales placeholder.
- **Padding inferior mínimo 96 px** por el FAB.

---

## 9. Deep links a WhatsApp (el corazón técnico de tu módulo)

La landing no habla con ningún servidor. El clic solo pide navegación a `wa.me`. Meta recibe el mensaje **cuando el usuario lo envía dentro de WhatsApp**, no antes.

### 9.1 `src/data/services.ts`

```ts
export type ServiceId = 'gran-formato' | 'papeleria' | 'promocionales';

export interface Service {
  id: ServiceId;
  label: string;
  description: string;
}

// Allowlist estática. Ningún service_id fuera de esta lista puede entrar a un enlace.
export const SERVICES: readonly Service[] = [
  { id: 'gran-formato',  label: 'Gran formato',        description: 'Lonas y viniles impresos...' },
  { id: 'papeleria',     label: 'Papelería comercial', description: 'Tarjetas, flyers y folletos...' },
  { id: 'promocionales', label: 'Promocionales',       description: 'Artículos publicitarios...' },
] as const;
```

### 9.2 `src/lib/whatsapp.ts`

```ts
import type { ServiceId } from '../data/services';

type Placement = 'hero' | 'catalog' | 'fab' | 'trust';

const WHATSAPP_E164 = import.meta.env.PUBLIC_WHATSAPP_E164 ?? '';

export function isWhatsappConfigured(): boolean {
  return /^[0-9]{10,15}$/.test(WHATSAPP_E164);
}

export function buildWhatsappHref(
  serviceLabel: string,
  serviceId: ServiceId | 'general',
  placement: Placement,
): string | null {
  if (!isWhatsappConfigured()) return null;

  const message =
    `Hola, vengo del sitio de Imprenta Escalante.\n` +
    `Quiero cotizar: ${serviceLabel}.\n` +
    `Referencia: source=landing;service_id=${serviceId};placement=${placement}.`;

  return `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(message)}`;
}
```

### 9.3 Reglas duras de los enlaces

- El número va en **`.env` como `PUBLIC_WHATSAPP_E164`**, solo dígitos con código de país, sin `+`. **Jamás hardcodees un número personal ni el de nadie del equipo.** Mientras Andri no entregue el oficial, deja `.env` vacío y verifica que se active el estado *Disabled*.
- Usa `<a href>` real. **Nunca** `fetch`, `onClick` con `window.location`, XHR ni nada que dependa de JS. Con JavaScript desactivado los enlaces deben seguir funcionando.
- Desktop: `target="_blank" rel="noopener noreferrer"`. Mobile: navegación directa permitida.
- `service_id` solo puede venir de la allowlist. **Nunca** insertes texto libre del DOM dentro del enlace.
- El mensaje prellenado debe ser **breve y determinista**. No metas el catálogo completo en la URL.
- La landing **nunca** dice "tu cotización fue enviada". No existe ese estado.

### 9.4 Estados de CTA y FAB

| Estado | CTA principal | FAB |
|---|---|---|
| Default | Borde 2 px, label completo | Caja 56 px con `[WA]` |
| Hover | Relleno gris claro + subrayado del label | Relleno gris claro + tooltip textual |
| Focus | Contorno exterior 2 px con offset 2 px, visible por teclado | Igual |
| Disabled | Solo si falta número en configuración → mostrar "Contacto no disponible" | `display: none` si la configuración es inválida (para no abrir un enlace roto) |
| Loading | No hay request; transición breve "Abriendo WhatsApp…" tras activación | Igual; bloquea doble activación durante la navegación |
| Error | Si la navegación se bloquea → mostrar enlace copiable + mensaje | Se expande a un panel con enlace copiable. **Sin llamar a ningún backend.** |

---

## 10. Criterios de aceptación (Isaías revisa exactamente esto)

Marca cada casilla antes de pedir revisión:

- [ ] Todas las secciones existen en desktop 1440 y mobile 360.
- [ ] Ningún color fuera de `tokens.css`. Búsqueda de hex literales en componentes = 0 resultados.
- [ ] Todo espaciado es múltiplo de 8 (salvo bordes 1/2/4 px).
- [ ] El FAB respeta la caja de exclusión de 72×72 y no tapa contenido a **320, 360, 390, 430 px** ni a zoom 200%.
- [ ] Footer con ≥96 px de padding inferior.
- [ ] Los 5 enlaces de WhatsApp (hero, 3 tarjetas, trust) generan la URL exacta del formato §9.2, verificada copiando el `href` del DOM.
- [ ] Con `PUBLIC_WHATSAPP_E164` vacío, todos los CTA muestran estado Disabled coherente y el FAB no se renderiza.
- [ ] **Con JavaScript desactivado en el navegador, los enlaces siguen funcionando.**
- [ ] Navegación completa por teclado: `Tab` recorre header → hero CTA → tarjetas → trust → footer en orden lógico, con foco visible siempre.
- [ ] Cada control interactivo tiene `data-testid`.
- [ ] Cero imágenes reales, cero fotos, cero tipografía de marca, cero PII, cero datos de clientes reales.
- [ ] `npm run build` pasa sin errores ni warnings de TypeScript.
- [ ] Desplegado en preview y el enlace está en el PR.

---

## 11. Contexto para tu asistente de IA

Crea un archivo `AGENTS.md` (o `CLAUDE.md`) en la raíz del repo con **exactamente** este contenido. Así tu IA no te propone cosas fuera de alcance:

```markdown
# Contexto del proyecto — printflow-landing

## Qué es
Landing page pública de PrintFlow AI, sistema de la Imprenta Escalante.
Sitio 100% estático. Su única conversión es abrir WhatsApp con un mensaje prellenado.

## Stack
Astro + Tailwind CSS + TypeScript. Node 20. Deploy estático (Cloudflare Pages / Vercel).

## Fase actual: maquetado estructural SIN color
Estamos construyendo únicamente estructura y layout. La identidad visual llega después.

## Reglas duras — NUNCA las rompas
1. Sin backend. Prohibido fetch, XHR, Server Actions, webhooks, Supabase, cualquier request.
2. Sin base de datos, sin autenticación, sin formularios, sin captura de datos personales.
3. Cero color de marca. Todos los colores salen de variables en src/styles/tokens.css
   (escala de grises). Prohibido escribir un hex literal en un componente.
4. Sin fotografías reales ni iconografía propietaria. Solo cajas placeholder con label.
5. Sin Google Fonts. Solo system-ui.
6. Sin animaciones, parallax ni librerías de animación.
7. Todo espaciado es múltiplo de 8 px. Excepción: bordes de 1, 2 o 4 px.
8. Los enlaces a WhatsApp son <a href> reales. Deben funcionar con JavaScript desactivado.
9. El número de WhatsApp viene de import.meta.env.PUBLIC_WHATSAPP_E164. Nunca hardcodear
   un número. Si no está configurado, los CTA quedan Disabled y el FAB no se renderiza.
10. El service_id de un deep link solo puede venir de la allowlist en src/data/services.ts.
    Nunca insertar texto libre del DOM en una URL.
11. La landing nunca afirma que un pedido o cotización fue creado.
12. No inventar testimonios, sellos, certificaciones, precios ni clientes.
13. Todo control interactivo lleva un data-testid estable.
14. Accesibilidad: foco visible, orden de tabulación lógico, aria-label en el FAB,
    significado nunca dependiente solo del color.

## Grid
Desktop 1440: 12 columnas, márgenes 48px, gutter 24px, contenedor máx 1344px, header 72px.
Mobile 360: 4 columnas, márgenes 16px, gutter 16px, header 56px.
Ritmo entre secciones: 64-80px desktop, 48-64px mobile.

## Secciones
Header · Hero (+ FAB flotante de WhatsApp) · Catálogo de 3 servicios · Trust factors
(política de anticipo 50% + proceso de 3 pasos) · Footer.

## Formato del deep link
https://wa.me/<E164_SIN_MAS>?text=<MENSAJE_URL_ENCODED>
Mensaje:
  Hola, vengo del sitio de Imprenta Escalante.
  Quiero cotizar: [SERVICE_LABEL].
  Referencia: source=landing;service_id=[SERVICE_ID];placement=[hero|catalog|fab|trust].
```

---

## 12. Plan de los 5 días

| Día | Objetivo |
|---|---|
| **1** | Repo, Astro + Tailwind, `tokens.css`, `BaseLayout`, `Button`, `PlaceholderBox`, `AGENTS.md`. PR de setup. |
| **2** | Header + Hero (desktop y mobile) + FAB con todas sus reglas de posición y exclusión. |
| **3** | Catálogo de servicios + `services.ts` + `whatsapp.ts` + estados de los enlaces. |
| **4** | Trust factors (política + 3 pasos) + Footer. |
| **5** | QA de anchos (320/360/390/430/1280/1440/1920), zoom 200%, teclado, JS desactivado, build, deploy y PR final. |

**Bloqueos conocidos:** el número oficial de WhatsApp lo entrega Andri. **No te detengas por eso** — desarrolla con `.env` vacío y valida el estado Disabled, que también es un entregable.

---

## 13. Qué sigue después de esta fase

Etapa 2 (no la empieces todavía): identidad visual real, tipografía, fotos de producto que consiga Andri, textos definitivos, analítica de conversión sin PII, y medición de la tasa clic-a-WhatsApp.
