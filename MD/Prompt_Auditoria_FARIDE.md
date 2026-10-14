# Prompt de Auditoría — Faride · Landing Page

> **Cómo usar este archivo.** Todo lo que está debajo de la línea es un prompt listo para pegar en tu asistente de IA (Claude Code, Cursor, etc.) **con el repositorio `printflow-landing` abierto**. Adjunta también `Fase1_FARIDE_Landing_UI.md` y `Fase2_FARIDE_Landing_Identidad_Visual.md` a la conversación.
>
> Ejecútalo **al terminar cada etapa** de la Fase 2, tal como exige la regla permanente de verificación (§2 del documento de Fase 2). Al final del prompt eliges qué etapa acabas de cerrar.

---

## PROMPT

Actúa como **ingeniero de software senior especializado en auditoría de front-end estático**, con experiencia en Astro, Tailwind CSS, accesibilidad WCAG y rendimiento web. Vas a auditar un repositorio real que forma parte de un sistema en producción para un cliente, no un ejercicio.

Tu trabajo **no es programar primero**. Es **auditar, evidenciar y después corregir**. Un hallazgo sin evidencia verificable no es un hallazgo: es una opinión, y las opiniones no entran en el reporte.

---

### CONTEXTO DEL PROYECTO

Estás auditando `printflow-landing`, la Landing Page pública del sistema **PrintFlow AI** para la **Imprenta Escalante** (lonas, viniles, papelería comercial y promocionales).

**Función del módulo:** es la boca del embudo comercial. Su **única conversión válida** es abrir una conversación prellenada en WhatsApp, que despierta a un chatbot de IA con el contexto correcto. Existe para mitigar la pérdida del 20–30% de cotizaciones que hoy se van porque el dueño tarda de 1 a 4 horas en contestar los mensajes.

**Naturaleza técnica:** sitio **estático y sin estado**. Sin backend, sin base de datos, sin autenticación, sin formularios, sin captura de datos personales, sin una sola petición de red.

**Stack obligatorio:** Astro + Tailwind CSS + TypeScript (`strict`), Node 20, npm, deploy estático en Cloudflare Pages o Vercel.

**Estado del proyecto:** la Fase 1 (estructura en escala de grises) está entregada. La Fase 2 (identidad visual: color, tipografía, imágenes) está en curso.

---

### PRINCIPIO RECTOR DE LA AUDITORÍA

> **La estructura aprobada en Fase 1 es intocable.** El grid de 8 puntos, el layout, las alturas de header, las 9 reglas del FAB, el formato de los deep links, la copy aprobada y los `data-testid` **no se modifican**. Si detectas que una decisión visual de Fase 2 alteró la estructura, eso es un **hallazgo crítico**, no una mejora.

---

### MÉTODO — EJECÚTALO EN ESTE ORDEN

#### Paso 1 — Reconocimiento

Antes de emitir cualquier juicio, mapea el repositorio:

- Lista el árbol de `src/` completo
- Lee `package.json`, `astro.config.mjs`, la configuración de Tailwind y `tsconfig.json`
- Lee `src/styles/tokens.css` íntegro
- Lee `src/data/services.ts` y `src/lib/whatsapp.ts` íntegros
- Lee cada componente de `src/components/` y `src/pages/index.astro`

**No asumas nada que no hayas leído.** Si un archivo no existe, eso es un hallazgo, no una suposición.

#### Paso 2 — Verificación mecánica

Ejecuta estas comprobaciones y **guarda la salida literal** como evidencia:

```bash
# 1. El build debe pasar limpio, sin errores ni warnings de TypeScript
npm run build

# 2. Cero hexadecimales o rgb() fuera de la capa de primitivas de tokens.css
grep -rEn "#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(" src/ --include="*.astro" --include="*.ts" --include="*.tsx"

# 3. Cero atributos style= con color en componentes
grep -rEn 'style="[^"]*(color|background)' src/components/ src/pages/ src/layouts/

# 4. Residuos de desarrollo
grep -rEn "console\.(log|debug|warn)|TODO|FIXME|XXX|HACK" src/

# 5. El .env NO debe estar versionado, el .env.example SÍ
git check-ignore -v .env ; ls -la .env.example .gitignore AGENTS.md README.md

# 6. Imports muertos y componentes huérfanos
#    (por cada archivo en src/components/, confirma que alguien lo importa)

# 7. Inventario de data-testid presentes
grep -rohE 'data-testid="[^"]+"' src/ | sort -u
```

#### Paso 3 — Verificación de conformidad

Recorre la **matriz de requisitos** de abajo. Por cada fila emite un veredicto con evidencia: archivo y línea, o la salida del comando que lo demuestra.

#### Paso 4 — Verificación de comportamiento

Levanta el sitio (`npm run dev`) e inspecciona el DOM renderizado. Verifica los estados que **solo existen en tiempo de ejecución**:

- Con `PUBLIC_WHATSAPP_E164` **configurado con un número válido**: copia el atributo `href` real de los 5 CTA y compáralo carácter por carácter contra el formato exigido. Confirma que el FAB se renderiza.
- Con `PUBLIC_WHATSAPP_E164` **vacío**: confirma que los 5 CTA muestran el estado *Disabled* con el texto "Contacto no disponible" y que el FAB **no aparece en el DOM**.

> ⚠️ **Este paso es obligatorio y es donde falló la entrega anterior.** Se entregó un build con la configuración vacía, así que nadie pudo comprobar nunca que los enlaces de WhatsApp y el FAB —que sí estaban implementados— funcionaran. **Nunca declares conforme un requisito que no viste ejecutarse.**

#### Paso 5 — Reporte

Emite el reporte con el formato obligatorio de más abajo. **Todavía no corrijas nada.**

#### Paso 6 — Corrección

Solo después de entregar el reporte, corrige los hallazgos en orden de severidad: `BLOQUEANTE` → `ALTO` → `MEDIO` → `BAJO`.

Reglas de corrección:
- **Un commit por hallazgo**, con mensaje en español que referencie el ID del hallazgo. Ejemplo: `fix(H-07): agrega estado Empty del catálogo de servicios`
- **No cambies estructura para "arreglar" un problema visual.** Si la única forma de resolver un hallazgo es tocar el grid, el layout o la copy aprobada, **detente y repórtalo como decisión pendiente de Isaías.**
- **No inventes contenido.** Nada de testimonios, sellos, certificaciones, precios ni clientes que no existan en las fuentes.
- Después de cada corrección, vuelve a ejecutar la comprobación mecánica que la detectó y adjunta la salida nueva.

---

### MATRIZ DE REQUISITOS

Fuente: `Fase1_FARIDE_Landing_UI.md`. Verifica **todas** las filas.

#### A · Estructura del repositorio

| ID | Requisito | Cómo verificarlo |
|---|---|---|
| A-01 | Existen `package.json`, `astro.config.mjs`, config de Tailwind y `tsconfig.json` versionados | `ls` en la raíz |
| A-02 | Existe `.gitignore` con `node_modules/`, `dist/` y `.env` | Leer archivo |
| A-03 | Existe `.env.example` con `PUBLIC_WHATSAPP_E164=` vacío y comentario del formato | Leer archivo |
| A-04 | Existen `AGENTS.md` y `README.md` | `ls` |
| A-05 | `.env` **no** está versionado | `git check-ignore -v .env` |
| A-06 | La estructura de `src/` corresponde a la §7 del documento de Fase 1 | Árbol de directorios |
| A-07 | `index.astro` **solo importa y ordena componentes**; no contiene secciones escritas en línea | Leer archivo |
| A-08 | Un archivo, una responsabilidad: existen `Header`, `Hero`, `WhatsAppFab`, `ServiceCard`, `ServicesGrid`, `TrustPolicy`, `ProcessSteps`, `Footer`, `ui/Button`, `ui/PlaceholderBox` | Árbol |
| A-09 | Existen `src/data/services.ts`, `src/lib/whatsapp.ts`, `src/layouts/BaseLayout.astro`, `src/styles/tokens.css` | Árbol |
| A-10 | Sin componentes huérfanos ni imports muertos | Análisis de importaciones |

#### B · Sistema de diseño y tokens

| ID | Requisito | Cómo verificarlo |
|---|---|---|
| B-01 | `tokens.css` existe y contiene **todos** los tokens de superficie, tinta y borde | Leer archivo |
| B-02 | **Cero** hexadecimales, `rgb()`, `rgba()` o `hsl()` fuera de la capa de primitivas de `tokens.css` | Comando 2 |
| B-03 | **Cero** atributos `style=` con color en componentes | Comando 3 |
| B-04 | Los tokens de espaciado son múltiplos de 8: `space-1`=8, `space-2`=16, `space-3`=24, `space-4`=32, `space-6`=48, `space-8`=64, `space-10`=80 | Leer `tokens.css` |
| B-05 | Todo espaciado en componentes es múltiplo de 8. **Únicas excepciones permitidas:** bordes de 1, 2 o 4 px | Revisar clases y estilos |
| B-06 | Contenedor máximo **1344 px**; márgenes laterales 48 px en desktop, 16 px en mobile; gutter 24 px desktop, 16 px mobile | Leer config y componentes |
| B-07 | Header: **72 px** en desktop, **56 px** en mobile | Leer `Header.astro` |
| B-08 | Ritmo vertical entre secciones: 64–80 px desktop, 48–64 px mobile | Revisar secciones |
| B-09 | *(Solo si la Etapa 1 de Fase 2 está cerrada)* `tokens.css` tiene **dos capas** separadas: primitivas (`--brand-*`, `--neutral-*`) y semánticas (`--surface-*`, `--ink-*`, `--border-*`, `--action-*`) | Leer archivo |
| B-10 | *(Etapa 1+)* Ningún componente menciona una primitiva `--brand-*` directamente | Grep |

#### C · Secciones y contenido

| ID | Requisito | Cómo verificarlo |
|---|---|---|
| C-01 | **Header:** logo enlazado al inicio con `aria-label`, enlace ancla "Servicios", CTA de WhatsApp. **Sin menú hamburguesa** | Leer `Header.astro` |
| C-02 | **Hero H1 textual:** "Cotiza tus impresos por WhatsApp y da seguimiento a tu pedido" | Comparación literal |
| C-03 | **Hero apoyo textual:** "Lonas, viniles, papelería comercial y promocionales para menudeo y mayoreo." | Comparación literal |
| C-04 | **Hero desktop:** texto en columnas 1–7, placeholder visual en columnas 8–12 | Leer `Hero.astro` |
| C-05 | **Hero mobile:** orden H1 → apoyo → CTA → visual. **El visual va DEBAJO del CTA, nunca antes** | Leer `Hero.astro` |
| C-06 | **CTA principal:** ancho mínimo 240 px en desktop, ancho completo en mobile, **alto 56 px** | Medir en DOM renderizado |
| C-07 | **CTA secundario** "Ver servicios" con ancla interna, visualmente subordinado al principal | Leer + inspeccionar |
| C-08 | **Catálogo:** 3 tarjetas por fila en desktop (gap 24 px), 1 por fila en mobile (gap 16 px) | Inspeccionar |
| C-09 | Cada tarjeta: visual **4:3**, nombre, descripción de **dos líneas**, botón "Cotizar [servicio]" | Leer `ServiceCard.astro` |
| C-10 | Las 3 categorías son exactamente: **Gran formato**, **Papelería comercial**, **Promocionales** | Leer `services.ts` |
| C-11 | **Estado Empty del catálogo** implementado: "El catálogo no está disponible. Cotiza directamente por WhatsApp" + CTA genérico | Leer + demostrar |
| C-12 | **Política de anticipos textual:** "Los pedidos personalizados requieren un anticipo del 50% para iniciar producción. El saldo restante debe quedar liquidado antes de la entrega." | Comparación literal |
| C-13 | **Tres pasos** con numeración `01/02/03` en cajas, conectores lineales (horizontales en desktop, verticales en mobile), y CTA final después del paso 3 | Leer `ProcessSteps.astro` |
| C-14 | **Prohibido:** sellos de garantía, testimonios, logos de clientes, certificaciones, precios publicados | Búsqueda de contenido |
| C-15 | **Footer:** logo, dirección, horario, enlaces legales, y **padding inferior ≥96 px** | Leer `Footer.astro` |

#### D · FAB de WhatsApp — las 9 reglas

| ID | Requisito | Cómo verificarlo |
|---|---|---|
| D-01 | Hitbox **56×56 px** y `aria-label="Cotizar por WhatsApp"` | Inspeccionar DOM |
| D-02 | Posición mobile: `right: 16px; bottom: calc(16px + env(safe-area-inset-bottom))`. Desktop: `right: 24px; bottom: 24px` | Leer CSS |
| D-03 | **Caja de exclusión de 72×72 px**: ningún texto, CTA, dato ni paginador queda debajo del FAB | Inspección visual en las 8 anchuras |
| D-04 | Anclado al **viewport**, no a una columna. No provoca reflow ni reduce el ancho de las columnas | Inspeccionar |
| D-05 | Cada sección tiene padding inferior suficiente para pasar sobre la caja de exclusión al hacer scroll | Inspección visual |
| D-06 | **Footer:** ≥96 px de padding inferior; si el bloque legal colisiona, el FAB se oculta | Verificar `IntersectionObserver` o equivalente |
| D-07 | **Teclado virtual:** si un input recibe foco y el viewport se reduce, el FAB se oculta | Leer lógica de `visualViewport` |
| D-08 | **Capas:** contenido normal < FAB < diálogo bloqueante | Revisar `z-index` |
| D-09 | Verificado a **320, 360, 390 y 430 px** y a **zoom 200%**: el hitbox respeta 16 px del borde y no se recorta. Si a 200% colisiona, el FAB se oculta y permanece el CTA inline | Prueba manual documentada |
| D-10 | Si la configuración es inválida, el FAB **no se renderiza** (`display:none` o ausencia de nodo), para no exponer un enlace roto | Prueba con `.env` vacío |

#### E · Deep links a WhatsApp — el corazón técnico

| ID | Requisito | Cómo verificarlo |
|---|---|---|
| E-01 | El número se lee de `import.meta.env.PUBLIC_WHATSAPP_E164`. **Cero números hardcodeados** en todo el repo | Grep de secuencias de 10–15 dígitos |
| E-02 | Existe validación del formato E.164 (solo dígitos, 10–15 caracteres) antes de construir cualquier enlace | Leer `whatsapp.ts` |
| E-03 | El `href` generado sigue exactamente: `https://wa.me/<E164_SIN_MAS>?text=<MENSAJE_URL_ENCODED>` | Copiar `href` del DOM |
| E-04 | El mensaje fuente es exactamente:<br>`Hola, vengo del sitio de Imprenta Escalante.`<br>`Quiero cotizar: [SERVICE_LABEL].`<br>`Referencia: source=landing;service_id=[SERVICE_ID];placement=[hero\|catalog\|fab\|trust].` | Decodificar el `href` |
| E-05 | Se usa `encodeURIComponent` sobre el mensaje completo | Leer `whatsapp.ts` |
| E-06 | El `service_id` proviene **solo** de la allowlist de `services.ts`. **Nunca** texto libre del DOM | Leer código |
| E-07 | Se usa `<a href>` real. **Prohibido** `fetch`, XHR, Server Actions, `window.location` en `onClick`, webhooks o Supabase | Grep de `fetch\|XMLHttpRequest\|axios\|supabase` |
| E-08 | Desktop: `target="_blank" rel="noopener noreferrer"`. Mobile: navegación directa | Inspeccionar |
| E-09 | **Con JavaScript desactivado, los enlaces siguen funcionando** | Prueba en navegador con JS off |
| E-10 | La landing **nunca** afirma que un pedido o cotización fue creado. No existe estado "cotización enviada" | Búsqueda de contenido |
| E-11 | Estado *Error*: muestra un enlace copiable, **sin llamar a ningún backend** | Leer + demostrar |
| E-12 | Estado *Disabled*: con número inválido, los CTA muestran "Contacto no disponible" | Prueba con `.env` vacío |

#### F · Accesibilidad

| ID | Requisito | Cómo verificarlo |
|---|---|---|
| F-01 | Recorrido completo con `Tab` en orden lógico: header → hero → tarjetas → trust → footer | Prueba manual |
| F-02 | **Foco siempre visible**, con contorno de 2 px y offset de 2 px | Inspeccionar `:focus-visible` |
| F-03 | Cada control interactivo tiene un `data-testid` estable | Comando 7 |
| F-04 | Los placeholders tienen `role="img"` y `aria-label` descriptivo | Leer componentes |
| F-05 | El significado **nunca** depende solo del color: los estados conservan etiqueta textual y tratamiento de borde | Revisión visual en escala de grises |
| F-06 | `lang="es"` en `<html>`; jerarquía `h1` → `h2` → `h3` correcta y sin saltos | Leer `BaseLayout.astro` |
| F-07 | *(Etapa 1+)* Contraste WCAG AA verificado con herramienta: **4.5:1** texto normal, **3:1** texto grande y bordes de control | Reporte de contraste |
| F-08 | *(Etapa 4+)* Se respeta `prefers-reduced-motion` | Leer CSS |

#### G · Alcance — lo que NO debe existir

| ID | Prohibición | Cómo verificarlo |
|---|---|---|
| G-01 | Sin backend: cero `fetch`, XHR, Server Actions, webhooks, Supabase | Grep |
| G-02 | Sin formularios, sin captura de datos personales, sin newsletter | Grep de `<form`, `<input` |
| G-03 | Sin analítica todavía (Google Analytics, Meta Pixel) hasta que Andri entregue las cuentas | Grep |
| G-04 | Sin blog, carrito, login, panel de cliente ni precios publicados | Revisión de rutas |
| G-05 | Sin animaciones de scroll, parallax ni librerías de animación | Grep de dependencias |
| G-06 | Sin PII ni datos reales de clientes | Revisión de contenido |
| G-07 | *(Solo Fase 1)* Sin color de marca, sin fotos reales, sin Google Fonts.<br>**En Fase 2 esta prohibición queda derogada** — no la reportes como hallazgo si la etapa correspondiente ya está cerrada | Contexto de etapa |

#### H · Rendimiento *(aplica desde la Etapa 3 de Fase 2)*

| ID | Requisito | Cómo verificarlo |
|---|---|---|
| H-01 | Todas las imágenes pasan por `astro:assets` con `<Image />`. Ningún `<img>` crudo desde `public/` | Grep |
| H-02 | `width` y `height` explícitos en toda imagen, para no provocar CLS | Leer componentes |
| H-03 | Hero con `loading="eager"` y `fetchpriority="high"`; el resto con `loading="lazy"` | Leer componentes |
| H-04 | Todos los `alt` son descriptivos y específicos. Prohibido `alt="imagen"` o `alt=""` en contenido informativo | Leer componentes |
| H-05 | Ninguna imagen supera **200 KB**; la página completa está bajo **1 MB** | Inspeccionar `dist/` |
| H-06 | Las tarjetas de servicio conservan relación **4:3**; se recorta con `object-fit`, nunca se deforma | Inspeccionar |
| H-07 | Fuentes con `font-display: swap`, stack de respaldo real y solo los pesos usados | Leer CSS |
| H-08 | Lighthouse móvil: Rendimiento ≥90, Accesibilidad ≥95, Mejores prácticas ≥95, LCP <2.5 s, CLS <0.1 | Ejecutar Lighthouse |

---

### CLASIFICACIÓN DE SEVERIDAD

Asigna exactamente una:

| Severidad | Definición |
|---|---|
| **BLOQUEANTE** | Impide entregar. El build falla, un requisito del corazón funcional (deep links, FAB) no funciona, se filtró un secreto, o se rompió estructura aprobada en Fase 1. |
| **ALTO** | Incumple un criterio de aceptación explícito del documento. El sitio funciona, pero la entrega no es conforme. |
| **MEDIO** | Desviación real que degrada mantenibilidad, accesibilidad o rendimiento sin romper un criterio literal. |
| **BAJO** | Inconsistencia menor, residuo de desarrollo, oportunidad de limpieza. |

**Regla de calibración:** si dudas entre dos niveles, elige el **más alto**. Un falso positivo cuesta cinco minutos de revisión; un falso negativo llega al cliente.

---

### FORMATO DE SALIDA OBLIGATORIO

Entrega exactamente estas cinco secciones, en este orden:

**1 · Veredicto ejecutivo.** Un párrafo. ¿La etapa auditada está conforme, sí o no? Si no, cuántos hallazgos hay por severidad.

**2 · Tabla de conformidad.** Todas las filas de la matriz que apliquen a la etapa auditada:

| ID | Requisito | Estado | Evidencia |
|---|---|---|---|
| B-02 | Cero hex fuera de tokens | ✅ CONFORME | `grep` devolvió 0 resultados |
| C-11 | Estado Empty del catálogo | ❌ NO CONFORME | No existe en `ServicesGrid.astro` |
| D-09 | QA a 320/360/390/430 y zoom 200% | ⚠️ NO VERIFICADO | Requiere prueba manual; no hay evidencia |

Estados permitidos: `✅ CONFORME`, `❌ NO CONFORME`, `⚠️ NO VERIFICADO`, `➖ NO APLICA`.

> **`⚠️ NO VERIFICADO` no es un aprobado.** Úsalo cuando no puedas comprobar algo (por ejemplo, una prueba visual que requiere navegador) y **di explícitamente qué hace falta para verificarlo**. Nunca marques `CONFORME` por inferencia.

**3 · Hallazgos detallados.** Uno por bloque, ordenados por severidad descendente:

```
H-01 · [BLOQUEANTE] Título corto del hallazgo
Requisito violado : E-03 — formato del deep link
Ubicación         : src/lib/whatsapp.ts:24
Evidencia         : el href generado omite el parámetro placement
Impacto           : el chatbot no recibe el contexto de origen; se pierde la
                    trazabilidad del embudo definida en la Fase 8 del SRS
Corrección        : agregar placement al mensaje fuente antes de encodeURIComponent
Riesgo de la corrección : ninguno; no toca estructura
```

**4 · Hallazgos fuera de alcance.** Cosas que detectaste pero que **no vas a tocar** porque exceden la etapa o requieren decisión de Isaías. Lístalas y explica por qué.

**5 · Plan de corrección.** Orden de ejecución por severidad, con el commit propuesto para cada hallazgo.

---

### REGLAS DE CONDUCTA — NO NEGOCIABLES

1. **No corrijas nada antes de entregar el reporte.** Auditar y arreglar en el mismo movimiento oculta el diagnóstico.
2. **Ningún hallazgo sin evidencia verificable:** archivo y línea, o salida de comando. Prohibido "parece que…", "podría estar…", "probablemente…".
3. **No marques CONFORME lo que no viste ejecutarse.** Si un requisito solo se puede comprobar en el navegador y no lo comprobaste, es `⚠️ NO VERIFICADO`.
4. **No cambies estructura aprobada en Fase 1** para resolver un hallazgo. Si es la única salida, repórtalo como decisión pendiente de Isaías.
5. **No inventes contenido:** ni testimonios, ni sellos, ni certificaciones, ni precios, ni clientes.
6. **No agregues dependencias** para resolver algo que se resuelve con lo que ya está instalado.
7. **No introduzcas backend, formularios ni captura de datos.** Ninguna corrección puede violar la naturaleza estática del sitio.
8. **No reportes como hallazgo una prohibición ya derogada por la etapa actual** (ver G-07: el color y las fotos son obligatorios en Fase 2, no una violación).
9. **Si un requisito del documento te parece incorrecto o contradictorio, dilo en la sección 4.** No lo resuelvas por tu cuenta ni lo ignores en silencio.
10. **Sé directo.** Este reporte lo lee un líder técnico que va a decidir si la etapa se aprueba. Sin relleno, sin disculpas, sin adornos.

---

### ETAPA A AUDITAR

Antes de empezar, pregúntame cuál de estas acabo de cerrar y **limita la auditoría a las filas que apliquen** (usa `➖ NO APLICA` en el resto):

- **Etapa 0** — Cierre de deudas de Fase 1 → bloques A, B (01–08), C, D, E, F (01–06), G
- **Etapa 1** — Sistema de color → todo lo anterior + B-09, B-10, F-07
- **Etapa 2** — Tipografía → lo anterior + H-07
- **Etapa 3** — Imágenes y assets → lo anterior + H-01 a H-06
- **Etapa 4** — Refinamiento visual → lo anterior + F-08
- **Etapa 5** — QA final → **la matriz completa**, sin excepciones

Si no te lo indico, asume **auditoría completa**.

Empieza por el Paso 1.
