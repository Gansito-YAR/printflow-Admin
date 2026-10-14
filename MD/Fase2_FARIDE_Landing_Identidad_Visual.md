# Fase 2 — FARIDE · Landing Page: Identidad Visual y Prototipo para Cliente

| Campo | Detalle |
|---|---|
| Proyecto | **PrintFlow AI** — Imprenta Escalante |
| Módulo | Fase 8 del SRS — Landing Page Pública |
| Responsable | **Faride** — Frontend / UI-UX |
| Aprueba | **Isaías** — Líder Técnico |
| Repositorio | `printflow-landing` |
| Estructura del trabajo | **6 etapas secuenciales con punto de control intermedio** |
| Plazo | **Lo define Isaías por separado** |
| Documento previo | `Fase1_FARIDE_Landing_UI.md` — sigue vigente en todo lo que no contradiga este |
| Objetivo | Landing con identidad visual completa, **presentable al dueño de la imprenta** |

---

## 1. Qué cambia respecto a la Fase 1

En la Fase 1 construiste la **estructura**: layout, grid de 8 puntos, jerarquía, estados y accesibilidad, todo en escala de grises. Ese trabajo está bien hecho y **no se rehace**.

En la Fase 2 le pones la **piel**: color de marca, tipografía, fotografías reales e iconografía. Ya tienes los colores, las imágenes y las referencias de diseño, así que las decisiones estéticas son tuyas — yo no te voy a decir qué paleta usar.

Lo que sí voy a exigir es el **método**, porque de eso depende que el sitio siga siendo rápido, accesible y mantenible cuando le metas color y fotos.

> **Regla que rige toda esta fase:** la estructura no se toca. El grid de 8 puntos, el layout de 12/4 columnas, las alturas de header, las reglas del FAB, el formato de los deep links, la copy y los `data-testid` se quedan **exactamente como están**. Si una decisión visual te obliga a mover la estructura, párate y pregúntame antes de cambiarla.

Al final de esta fase, el prototipo se le enseña al cliente. Eso significa que ya no puede tener nada roto, ni placeholders visibles, ni estados a medias.

---

## 2. Regla permanente de verificación — aplica a TODAS las etapas

Esto es nuevo y es obligatorio de aquí en adelante:

> **Al terminar cada etapa, antes de pasar a la siguiente, revisa el estado real de tu código contra lo que la etapa pedía.** Si encuentras algo que no quedó como se esperaba, algo que se rompió sin querer, un comportamiento inesperado o algo que simplemente se te pasó, **corrígelo en ese momento**. No lo dejes para el final ni lo reportes como "pendiente".

No des una etapa por terminada porque escribiste el código: dala por terminada cuando **la abriste en el navegador, la recorriste y confirmaste que hace lo que debía hacer**. En la Fase 1 se entregó un build donde el FAB no aparecía y ningún enlace de WhatsApp funcionaba; eso no se detectó porque nadie recorrió el resultado final. No vuelve a pasar.

Cada etapa de abajo termina con un bloque **"Verificación de cierre"**. Es parte del trabajo, no un extra.

### Herramienta para hacerlo fácil

Para que no tengas que revisar todo esto a mano, te preparé un **prompt de auditoría** listo para pegar en tu asistente de IA: `Prompt_Auditoria_FARIDE.md`.

Cómo se usa:

1. Abre tu asistente con el repositorio `printflow-landing` cargado.
2. Adjunta a la conversación `Fase1_FARIDE_Landing_UI.md` y este documento.
3. Pega el prompt completo.
4. Cuando te pregunte qué etapa cerraste, dile cuál — la auditoría se ajusta sola a las filas que apliquen.

El prompt contiene una **matriz de 60 requisitos verificables** derivada de tu documento de Fase 1 (estructura del repo, tokens, secciones, las 9 reglas del FAB, deep links, accesibilidad, alcance y rendimiento), los comandos exactos para comprobarlos, y un formato de reporte con clasificación de severidad.

**Corre esa auditoría al cerrar cada etapa y adjunta el reporte en el PR.** Es lo que voy a leer para aprobarte o devolverte el trabajo.

---

## ETAPA 0 — Cierre de deudas de la Fase 1

**Es lo primero. No empieces con color hasta terminar esta etapa.**

Revisé tu entrega de la Fase 1 y encontré cosas pendientes. Ciérralas primero, porque si les pones color encima se vuelven más difíciles de arreglar.

### 0.1 Entregar el repositorio, no el build

Lo que se entregó fue la carpeta `dist/`: `index.html`, `_astro/index.[hash].css` y `favicon.svg`. Eso es la salida de `npm run build`, no el código.

Sin el repositorio no puedo revisar componentes, ni correr el build, ni verificar TypeScript, ni abrir un Pull Request. **De aquí en adelante siempre se entrega el repo con un PR, nunca una carpeta compilada.**

### 0.2 Archivos que faltan en la raíz

Los pedía la §7 y la §11 de tu documento de Fase 1:

- `package.json`, `astro.config.mjs`, `tailwind.config` y `tsconfig.json` versionados
- **`.gitignore`** — con `node_modules/`, `dist/`, `.env`
- **`.env.example`** — con `PUBLIC_WHATSAPP_E164=` vacío y un comentario explicando el formato
- **`AGENTS.md`** — con el bloque de contexto (actualizado, ver §9 de este documento)
- **`README.md`** — cómo instalar, cómo correr, cómo construir, qué variables de entorno necesita

### 0.3 Verificar la estructura de componentes

Tu documento de Fase 1 especificaba una estructura de carpetas concreta en la §7. Compárala con lo que tienes hoy y ajústala si hace falta:

```
src/
├── components/
│   ├── Header.astro
│   ├── Hero.astro
│   ├── WhatsAppFab.astro
│   ├── ServiceCard.astro
│   ├── ServicesGrid.astro
│   ├── TrustPolicy.astro
│   ├── ProcessSteps.astro
│   ├── Footer.astro
│   └── ui/
│       ├── Button.astro
│       └── PlaceholderBox.astro
├── data/services.ts
├── lib/whatsapp.ts
├── layouts/BaseLayout.astro
├── pages/index.astro
└── styles/tokens.css
```

**Un archivo, una responsabilidad.** Si tienes secciones enteras escritas dentro de `index.astro`, sepáralas ahora. `index.astro` debe leerse como un índice: importar componentes y ordenarlos, nada más.

Para que quede claro por qué insisto en esto y no en otra cosa: **no quiero que apliques Clean Architecture aquí.** Esta landing no tiene lógica de negocio, ni estado, ni backend, ni base de datos — no hay nada que aislar en una capa de dominio, y montar esas carpetas alrededor de una función que construye una URL sería puro ruido. Lo que sí quiero es exactamente lo de arriba: componentes separados, `lib/` para la lógica de enlaces y `data/` para el catálogo tipado.

### 0.4 Terminar el mapeo de tokens en Tailwind

Hiciste bien la mitad: mapeaste el espaciado (`px-space-2`, `h-space-7`, `max-w-container` son utilidades tuyas). Pero los colores los estás aplicando con `style="color: var(--ink-base)"` **inline en cada elemento**.

Termina el trabajo: mapea también los colores en la configuración de Tailwind para poder escribir `text-ink-base` o `bg-surface-1` como clase.

Esto no es cosmético. Con los colores inline, cuando en la Etapa 1 cambies la paleta vas a tener que tocar decenas de atributos `style` a mano, y algún elemento se te va a quedar en gris. Con los colores mapeados, cambias `tokens.css` y **todo el sitio se actualiza solo**. Es literalmente lo que hace posible la Etapa 1.

**Objetivo: cero atributos `style=` con color en los componentes.**

### 0.5 Hacer verificables los deep links

En el build entregado, `PUBLIC_WHATSAPP_E164` estaba vacío. Como tu especificación indica, eso disparó el estado *Disabled* en los 5 CTA y ocultó el FAB. Técnicamente correcto — pero significa que **nadie ha podido verificar nunca el corazón de tu módulo**: el formato de la URL, el `encodeURIComponent`, el `service_id`, el `placement`, ni el FAB completo.

Configura un número de prueba (el tuyo, o uno de mensajería que tengas a mano) en `.env` local y verifica **copiando el `href` real del DOM** que produce exactamente:

```
https://wa.me/<E164_SIN_MAS>?text=Hola%2C%20vengo%20del%20sitio%20de%20Imprenta%20Escalante.%0AQuiero%20cotizar%3A%20...
```

**El estado Disabled sigue siendo un entregable**: debes poder demostrar los dos, con número y sin número.

### 0.6 Estado Empty del catálogo

Tu documento lo pedía (§8.4) y no hay evidencia de que exista: *"El catálogo no está disponible. Cotiza directamente por WhatsApp"* + CTA genérico. Impleméntalo y déjalo demostrable.

### ✅ Verificación de cierre — Etapa 0

- [ ] El repo completo está en GitHub con un PR abierto hacia `main`
- [ ] Existen `.gitignore`, `.env.example`, `AGENTS.md` y `README.md`
- [ ] `index.astro` solo importa y ordena componentes
- [ ] Búsqueda de `style="` con color en `src/components/` → **0 resultados**
- [ ] Con número configurado: los 5 CTA generan la URL correcta y el FAB aparece
- [ ] Con número vacío: los 5 CTA muestran "Contacto no disponible" y el FAB no se renderiza
- [ ] `npm run build` pasa sin errores ni warnings de TypeScript

---

## ETAPA 1 — Sistema de color de marca

Aquí entra tu paleta. Tú decides los colores; yo defino cómo se organizan.

### 1.1 Arquitectura de dos capas — obligatoria

No sustituyas los grises por colores de marca directamente. Organiza `tokens.css` en **dos capas**:

**Capa 1 — Primitivas.** Tu paleta cruda, sin significado asignado. Nombres neutros por familia e intensidad:

```css
:root {
  /* Ejemplo de NOMENCLATURA, no de valores. Los valores son tuyos. */
  --brand-50:  …;
  --brand-100: …;
  --brand-500: …;   /* el tono principal de la marca */
  --brand-700: …;
  --brand-900: …;

  --neutral-0:   …;
  --neutral-100: …;
  --neutral-500: …;
  --neutral-900: …;

  --accent-500: …;  /* si tu diseño usa un color de acento */
}
```

**Capa 2 — Semánticas.** Los nombres que ya usan tus componentes, ahora apuntando a primitivas:

```css
:root {
  --surface-0: var(--neutral-0);
  --surface-1: var(--neutral-100);
  --surface-2: …;
  --surface-3: …;

  --ink-strong: var(--neutral-900);
  --ink-base:   …;
  --ink-muted:  …;
  --ink-onBrand: …;   /* texto encima del color de marca */

  --border-hairline: …;
  --border-strong:   …;

  /* Nuevos para la acción principal */
  --action-primary-bg:       var(--brand-500);
  --action-primary-text:     var(--ink-onBrand);
  --action-primary-bg-hover: var(--brand-700);
  --action-primary-border:   …;

  --action-disabled-bg:     …;
  --action-disabled-text:   …;
  --action-disabled-border: …;
}
```

**Por qué esta separación importa:** tus componentes nunca mencionan `--brand-500`. Solo dicen `--action-primary-bg`. El día que el dueño diga *"el verde está muy fuerte"*, cambias **un valor en la capa 1** y el sitio entero se reajusta con coherencia. Si los componentes apuntaran directo a la primitiva, tendrías que cazar cada uso a mano.

### 1.2 Reglas duras del color

1. **Ningún componente escribe un color literal ni una primitiva.** Solo tokens semánticos, y a través de clases de Tailwind (Etapa 0.4).
2. **Contraste mínimo WCAG AA:** 4.5:1 para texto normal, 3:1 para texto grande (≥24 px o ≥19 px en negrita) y para bordes de controles. **Verifícalo con una herramienta, no a ojo.** Es una imprenta: el dueño y sus clientes van a abrir esto bajo el sol, en pantallas baratas.
3. **El color no puede ser el único portador de significado.** El CTA deshabilitado debe seguir diciendo "Contacto no disponible" y conservando su borde punteado, no solo verse más pálido. Un usuario con daltonismo debe entender la página completa.
4. **El foco visible se conserva y debe contrastar contra su fondo.** Si tu color de marca es oscuro y el contorno de foco también, el foco desaparece. Ajústalo por token.
5. **No inventes tokens fuera de `tokens.css`.** Si necesitas un color nuevo, se agrega ahí con nombre semántico.

### 1.3 Qué debe recibir color

Recorre el sitio completo y decide conscientemente cada superficie. Como mínimo: header, hero, tarjetas de servicio, bloque de política de anticipos, los tres pasos y sus conectores, footer, CTA principal, CTA secundario, FAB, y todos los estados (`Hover`, `Focus`, `Disabled`, `Error`).

**No dejes ningún elemento en gris por olvido.** Un gris que sobrevive de la Fase 1 se va a ver como un bug frente al cliente.

### ✅ Verificación de cierre — Etapa 1

- [ ] `tokens.css` tiene las dos capas separadas y comentadas
- [ ] Ningún componente menciona un hex, un `rgb()` ni una primitiva `--brand-*`
- [ ] Contraste AA verificado y anotado para: texto de cuerpo, títulos, CTA principal, CTA deshabilitado, texto del footer y texto sobre el color de marca
- [ ] Los 5 estados de botón se ven distintos entre sí sin depender solo del tono
- [ ] Recorriste la página completa y no queda ningún gris de Fase 1 sin decidir

---

## ETAPA 2 — Tipografía

1. Define la familia (o familias) de marca. Si usas Google Fonts, **precárgalas** y limita los pesos a los que realmente uses — cada peso extra es peso de descarga.
2. Declara siempre un **stack de respaldo real**: `"TuFuente", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Si la fuente no carga, la página no se debe romper.
3. Usa `font-display: swap` para que el texto sea legible mientras carga.
4. **La escala tipográfica también son tokens.** Define `--text-h1`, `--text-h2`, `--text-body`, `--text-small` en `tokens.css`, no tamaños sueltos por componente.
5. **No cambies la jerarquía establecida en Fase 1.** El H1 sigue siendo el H1 y el orden de encabezados (`h1` → `h2` → `h3`) no se altera: es estructura semántica, no decoración.
6. Cuida el **largo de línea**: entre 45 y 75 caracteres en párrafos de escritorio. Ya tienes `max-w-xl` en el subtítulo del hero; revisa el resto.

### ✅ Verificación de cierre — Etapa 2

- [ ] La fuente carga con `swap` y tiene stack de respaldo
- [ ] Solo se descargan los pesos que se usan
- [ ] La escala tipográfica está tokenizada
- [ ] Con la fuente bloqueada en DevTools, la página sigue siendo legible y no salta el layout
- [ ] El orden de encabezados sigue siendo correcto

---

## ETAPA 3 — Imágenes y assets reales

Aquí sustituyes los `[PLACEHOLDER]` por las fotos y el logo reales. Es la etapa que más puede dañar el rendimiento si se hace mal, así que léela completa antes de empezar.

### 3.1 Usa el sistema de imágenes de Astro

Importa las imágenes desde `src/assets/` y usa el componente `<Image />` de `astro:assets`. Astro te genera automáticamente los formatos modernos y los tamaños responsivos. **No metas las fotos en `public/` con un `<img>` crudo**: pierdes toda la optimización.

### 3.2 Reglas obligatorias por imagen

1. **Formato:** WebP o AVIF, con respaldo automático. Nunca un JPG de 3 MB salido de la cámara.
2. **`width` y `height` explícitos siempre.** Sin ellos el navegador no reserva el espacio y la página "salta" al cargar (CLS). Ese salto se nota muchísimo en celular.
3. **Respeta las relaciones de aspecto de la Fase 1.** Las tarjetas de servicio son **4:3**. Si tu foto no es 4:3, se recorta con `object-fit: cover`; no se deforma ni se cambia el layout.
4. **Carga diferida:** `loading="lazy"` en todo lo que esté debajo del pliegue. **Excepción:** la imagen del hero lleva `loading="eager"` y `fetchpriority="high"`, porque es lo primero que ve el usuario y es lo que mide el LCP.
5. **`alt` descriptivo y real.** No `alt="imagen"` ni `alt="lona"`. Describe qué se ve: *"Lona publicitaria de gran formato instalada en fachada comercial"*. Es accesibilidad y también SEO.
6. **Presupuesto de peso:** ninguna imagen individual por encima de **200 KB** después de optimizar, y la página completa por debajo de **1 MB** en la primera carga. Si te pasas, comprime más o recorta.

### 3.3 Logo y favicon

- El logo real sustituye a `[LOGO PLACEHOLDER]` en header y footer. **SVG de preferencia**: escala perfecto y pesa nada.
- Favicon real con las variantes que necesita (`favicon.svg`, `apple-touch-icon`).
- El logo del header debe seguir siendo un enlace al inicio con su `aria-label`.

### 3.4 Icono de WhatsApp

Ya puedes sustituir el placeholder `[WA]` por el icono real de WhatsApp en el FAB y en los CTA. Úsalo como **SVG inline**, respetando la forma oficial de la marca — no lo deformes, no lo recolorees arbitrariamente, no lo encierres en formas que lo alteren.

**El `aria-label="Cotizar por WhatsApp"` del FAB se queda.** Un icono sin nombre accesible es invisible para un lector de pantalla.

### 3.5 Vista previa para redes sociales

Como esta landing se va a compartir por WhatsApp (que es justamente el canal del negocio), agrega en `BaseLayout.astro`:

- `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
- `twitter:card` con valor `summary_large_image`
- Una imagen de vista previa de **1200×630 px**

Sin esto, cuando el dueño pegue el enlace en un chat va a salir un rectángulo gris. Con esto, sale una tarjeta con su marca. Es un detalle que se nota mucho en la presentación al cliente.

### ✅ Verificación de cierre — Etapa 3

- [ ] Cero `[PLACEHOLDER]` visibles en toda la página
- [ ] Todas las imágenes pasan por `astro:assets` con `width` y `height`
- [ ] El hero carga con `eager` + `fetchpriority="high"`; el resto con `lazy`
- [ ] Todos los `alt` son descriptivos y específicos
- [ ] Ninguna imagen supera 200 KB; la página completa está bajo 1 MB
- [ ] Con red lenta simulada (DevTools → Slow 4G) **la página no salta** al cargar imágenes
- [ ] Pegar la URL del preview en un chat muestra la tarjeta con imagen y título

---

## ETAPA 4 — Refinamiento visual

Ahora sí, el acabado. Aquí es donde el sitio deja de parecer una maqueta.

1. **Radios de esquina:** decide un radio y tokenízalo (`--radius-sm`, `--radius-md`). Aplícalo con criterio a botones, tarjetas y placeholders. **Un solo sistema, no un radio distinto por componente.**
2. **Elevación y sombras:** ya están permitidas. Tokenízalas también (`--shadow-sm`, `--shadow-md`). Úsalas para comunicar jerarquía —qué flota sobre qué—, no como adorno. El FAB debe tener elevación suficiente para leerse por encima del contenido.
3. **Transiciones:** suaves y cortas, entre 150 y 250 ms, solo en `Hover` y `Focus`. **Nada de animaciones de scroll, parallax ni entradas escalonadas.** Este sitio vive de cargar rápido.
4. **Respeta `prefers-reduced-motion`.** Si el usuario pidió menos movimiento en su sistema, desactiva las transiciones. Son tres líneas de CSS y es lo correcto.
5. **Estados hover en las tarjetas de servicio:** ahora que hay color, las tarjetas deberían responder al puntero. Sutil.
6. **Revisa el FAB con color.** Es el elemento más delicado de la página: debe destacar sin tapar contenido, y sus reglas de caja de exclusión de 72 px, safe area y ocultamiento por footer y por teclado **se conservan intactas**.

### ✅ Verificación de cierre — Etapa 4

- [ ] Radios y sombras están tokenizados y aplicados con un solo criterio
- [ ] Las transiciones son ≤250 ms y solo en interacción
- [ ] `prefers-reduced-motion` desactiva el movimiento
- [ ] El FAB conserva sus 9 reglas de la Fase 1 y se ve correctamente con color
- [ ] Ningún efecto visual estorba la lectura ni tapa un CTA

---

## ETAPA 5 — QA final y preparación para el cliente

**Esta etapa es la que decide si se presenta al cliente o no. No se recorta.**

### 5.1 Responsivo

Revisa **una por una**, sin saltarte ninguna:

| Ancho | Qué verificar |
|---|---|
| 320 px | Nada se desborda; el FAB no se recorta |
| 360 px | Frame rector; todo legible |
| 390 px | — |
| 430 px | — |
| 768 px | Transición a layout de escritorio |
| 1280 px | — |
| 1440 px | Frame rector de escritorio |
| 1920 px | El contenido no se estira más allá de 1344 px |

Y además: **zoom al 200%** — si el FAB colisiona, se oculta y queda el CTA inline.

### 5.2 Accesibilidad

- Recorrido completo con `Tab`: header → hero → tarjetas → trust → footer, con foco **siempre visible** y en orden lógico
- Contraste AA verificado con herramienta en toda la página
- Todos los `alt` presentes y descriptivos
- `aria-label` del FAB intacto
- El sitio se entiende sin percibir color

### 5.3 Rendimiento

Lighthouse en modo **móvil**, sobre el preview desplegado:

- **Rendimiento ≥ 90**
- **Accesibilidad ≥ 95**
- **Mejores prácticas ≥ 95**
- **LCP < 2.5 s** · **CLS < 0.1**

Si no llegas, casi siempre es por imágenes o por fuentes. Vuelve a la Etapa 3 o a la 2 antes de entregar.

### 5.4 Funcional

- Los 5 CTA abren WhatsApp con el mensaje correcto y el `service_id` correcto
- El estado Disabled sigue funcionando con el número vacío
- **Con JavaScript desactivado, los enlaces siguen funcionando** (siguen siendo `<a href>` reales)
- El estado Empty del catálogo es demostrable
- Todos los `data-testid` siguen presentes

### 5.5 Auditoría final de código

Antes de pedir revisión, revisa tu propio repositorio como si fueras yo:

- [ ] Ningún hex ni `rgb()` fuera de la capa de primitivas de `tokens.css`
- [ ] Ningún `style=` con color en componentes
- [ ] Ningún `console.log` olvidado
- [ ] Ningún componente muerto ni import sin usar
- [ ] Ningún `TODO` sin resolver
- [ ] `.env` **no** está versionado
- [ ] `npm run build` sin errores ni warnings
- [ ] La estructura de la §0.3 se cumple

**Si encuentras algo que no quedó como se esperaba, corrígelo ahora.** No lo entregues con una nota de "pendiente".

### 5.6 Preparación de la presentación

- Deploy en Cloudflare Pages o Vercel con URL pública
- **Deja el `<meta name="robots" content="noindex">`** hasta que el cliente apruebe y el dominio real esté listo. Anótalo en el README como tarea de lanzamiento — fue buen criterio ponerlo, pero hay que acordarse de quitarlo.
- Los placeholders de dirección, horario y enlaces legales del footer siguen pendientes de Andri. Si no llegan a tiempo, **déjalos con texto neutro creíble, no con corchetes visibles**. Frente al cliente, un `[DIRECCIÓN PLACEHOLDER]` se lee como trabajo sin terminar.
- Revisa el sitio **en un celular real**, no solo en el emulador del navegador. Los emuladores mienten sobre la safe area, el teclado y el comportamiento del FAB.

### ✅ Verificación de cierre — Etapa 5

- [ ] Las 8 anchuras y el zoom 200% verificados
- [ ] Lighthouse cumple los cuatro umbrales
- [ ] Accesibilidad completa verificada
- [ ] Funcionalidad de WhatsApp verificada en los dos estados
- [ ] Auditoría de código limpia
- [ ] Preview desplegado y probado en un celular real
- [ ] PR abierto con la URL y el resumen de resultados

---

## 3. Lo que NO se toca en esta fase

1. La estructura de secciones y su orden
2. El grid de 8 puntos y las alturas de header (56 px móvil / 72 px escritorio)
3. Las 9 reglas del FAB
4. El formato de los deep links de WhatsApp y la allowlist de `service_id`
5. La copy del H1, el subtítulo, la política de anticipos y los tres pasos
6. Los `data-testid`
7. La ausencia de backend: cero `fetch`, cero formularios, cero captura de datos personales
8. La regla de que los enlaces funcionan con JavaScript desactivado

---

## 4. Cómo entregar

En el Pull Request incluye:

1. La URL del preview desplegado
2. Capturas de Lighthouse (móvil) con los cuatro puntajes
3. La lista de verificación de cierre de cada etapa, marcada
4. Cualquier decisión de diseño que tomaste y que se desvíe de la Fase 1, con su razón

Dudas de **contenido, textos reales, fotos o datos del negocio** → Andri.
Dudas de **estructura, alcance, rendimiento o arquitectura** → Isaías.

---

## 5. Contexto para tu asistente de IA

Sustituye el contenido de tu `AGENTS.md` por este:

```markdown
# Contexto del proyecto — printflow-landing

## Qué es
Landing page pública de PrintFlow AI, el sistema de la Imprenta Escalante.
Sitio 100% estático. Su única conversión es abrir WhatsApp con un mensaje prellenado.
Mitiga la pérdida del 20-30% de cotizaciones por respuesta lenta del dueño.

## Stack
Astro + Tailwind CSS + TypeScript. Node 20. Deploy estático (Cloudflare Pages / Vercel).

## Fase actual: Fase 2 — identidad visual
La estructura ya está construida y aprobada. Esta fase agrega color de marca,
tipografía, fotografías reales e iconografía. El prototipo se presenta al cliente.

## LA ESTRUCTURA NO SE TOCA
No modificar: orden de secciones, grid de 8 puntos, alturas de header
(56px móvil / 72px escritorio), contenedor máximo de 1344px, las 9 reglas del FAB,
el formato de los deep links, la copy aprobada, ni los data-testid.
Si una decisión visual exige cambiar la estructura, detenerse y preguntar.

## Reglas duras — NUNCA las rompas

### Color
1. tokens.css tiene DOS capas: primitivas (--brand-*, --neutral-*) y semánticas
   (--surface-*, --ink-*, --border-*, --action-*). Los componentes usan SOLO
   tokens semánticos, y a través de clases de Tailwind.
2. Prohibido un hex, un rgb() o una primitiva --brand-* dentro de un componente.
3. Prohibido el atributo style= con color. Todo por clases de Tailwind mapeadas.
4. Contraste mínimo WCAG AA: 4.5:1 texto normal, 3:1 texto grande y bordes de control.
5. El color nunca es el único portador de significado. Los estados conservan su
   etiqueta textual y su tratamiento de borde.

### Imágenes
6. Todas las imágenes pasan por astro:assets con <Image />. Nunca <img> crudo
   desde public/.
7. width y height explícitos siempre, para no provocar CLS.
8. Hero: loading="eager" + fetchpriority="high". Todo lo demás: loading="lazy".
9. alt descriptivo y específico. Nunca alt="imagen".
10. Máximo 200 KB por imagen; página completa bajo 1 MB.
11. Las tarjetas de servicio conservan relación 4:3. Se recorta con object-fit,
    nunca se deforma ni se cambia el layout.

### Tipografía y movimiento
12. Fuentes con font-display: swap y stack de respaldo real. Solo los pesos usados.
13. Escala tipográfica tokenizada. El orden semántico h1 → h2 → h3 no cambia.
14. Transiciones de 150-250 ms solo en hover y focus. Prohibido parallax,
    scroll reveal y animaciones de entrada.
15. Respetar prefers-reduced-motion.

### Sin backend
16. Cero fetch, XHR, Server Actions, webhooks, Supabase o cualquier request.
17. Sin formularios, sin captura de datos personales, sin base de datos.
18. Los enlaces a WhatsApp son <a href> reales y deben funcionar con
    JavaScript desactivado.
19. El número sale de import.meta.env.PUBLIC_WHATSAPP_E164. Nunca hardcodear.
    Si no está configurado: CTA en estado Disabled y FAB sin renderizar.
20. El service_id solo puede venir de la allowlist en src/data/services.ts.
21. La landing nunca afirma que un pedido o cotización fue creado.
22. No inventar testimonios, sellos, certificaciones, precios ni clientes.

### Estructura de código
23. Un archivo, una responsabilidad. index.astro solo importa y ordena componentes.
24. NO aplicar Clean Architecture: este módulo no tiene lógica de negocio, estado
    ni backend. La separación correcta es components/ + lib/ + data/ + layouts/.
25. Todo control interactivo conserva su data-testid.

### Verificación
26. Al terminar cada etapa: abrir el resultado en el navegador, recorrerlo y
    confirmar que hace lo que debía. Si algo quedó mal, incompleto o inesperado,
    corregirlo en ese momento, no dejarlo como pendiente.
27. Nunca entregar la carpeta dist/. Siempre el repositorio con un Pull Request.
```

---

## 6. Resumen de la secuencia

Las etapas son **secuenciales**. No arranques una sin haber marcado la verificación de cierre de la anterior: cada una se apoya en la de antes, y saltártelas te obliga a rehacer trabajo.

| Orden | Etapa | Resultado esperado |
|---:|---|---|
| 1 | **0 — Cierre de deudas** | Repo entregado, tokens mapeados en Tailwind, deep links verificables |
| 2 | **1 — Sistema de color** | Paleta en dos capas, contraste AA, cero grises olvidados |
| 3 | **2 — Tipografía** | Fuente de marca cargada y tokenizada |
| 4 | **3 — Imágenes y assets** | Cero placeholders, rendimiento cuidado, vista previa social |
| 5 | **4 — Refinamiento** | Radios, sombras, transiciones, FAB con color |
| 6 | **5 — QA final** | Lighthouse, accesibilidad, auditoría de código, deploy |

**Punto de control obligatorio conmigo al terminar la Etapa 1.** No sigas a la Etapa 3 sin que yo vea el sistema de color aplicado: si la paleta necesita ajuste, prefiero decírtelo antes de que integres las fotografías encima.

El plazo de entrega te lo doy por separado.

---

## 7. Nota final

Tu Fase 1 quedó bien: el sistema de tokens está completo y exacto, el FAB tiene sus cuatro medidas correctas, la accesibilidad está cuidada y no hay un solo color literal en el CSS. Es una base sólida y por eso esta fase se trata de vestirla, no de rehacerla.

Lo único que falló fue la entrega: se mandó el `dist/` en lugar del repositorio, y con la configuración apagada, así que nadie pudo comprobar que los enlaces de WhatsApp y el FAB —que sí construiste— funcionaran. **Recorre siempre tu propio entregable antes de pasarlo.** Es la diferencia entre un trabajo bien hecho y un trabajo que además se ve bien hecho.

Al final de esta fase esto se le enseña al dueño de la imprenta. Que se vea como un producto terminado.
