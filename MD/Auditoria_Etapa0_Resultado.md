# Auditoría Fase 2 — Etapas 0 a 5

| Campo | Detalle |
|---|---|
| Repositorio | `printflow-landing` |
| Rama | `fase2/etapa-0-entrega-repositorio` |
| Fuente de requisitos | `MD/Fase1_FARIDE_Landing_UI.md` · `MD/Fase2_FARIDE_Landing_Identidad_Visual.md` |
| Método | Código fuente, build ejecutado, medición en navegador, dos estados de configuración |

---

## 1 · Veredicto ejecutivo

**Etapas 0, 1, 2 y 4: conformes.** **Etapas 3 y 5: parciales, bloqueadas por assets y deploy.**

El diagnóstico inicial fue que el repositorio no existía. Era falso: el proyecto estaba completo en la máquina de Faride y nunca se hizo `git add`. Lo único que había llegado a GitHub era la salida de `npm run build`. Eso está resuelto: el código vive en esta rama, el build pasa limpio y los deep links quedaron verificados en sus dos estados.

Sobre el código heredado de la Fase 1, hay que decirlo claro: **estaba bien hecho.** `whatsapp.ts` valida E.164, arma el deep link con el formato exacto de la §9.2 y saca el `service_id` de una allowlist tipada. El estado *Empty* del catálogo existía. El FAB tenía sus reglas de safe-area, colisión con footer y teclado virtual. Lo que faltaba era el §0.4 —el mapeo de color en Tailwind— y eso era justamente lo que bloqueaba toda la Fase 2.

Quedan **2 decisiones para Isaías** y **6 tareas bloqueadas por terceros**. Cero hallazgos abiertos imputables al código.

### Corrección de auditorías anteriores

Este documento tuvo dos versiones previas con errores. Se dejan asentados:

| Afirmación anterior | Realidad |
|---|---|
| "No existe el repositorio" (BLOQUEANTE) | Existía completo, sin commitear |
| "Faltan `.gitignore`, `.env.example`, `AGENTS.md`, `README.md`" | Los cuatro existían |
| "Falta el estado Empty del catálogo" | Implementado en `ServicesGrid.astro` |
| "El CTA no tiene ancho mínimo de 240 px" | `Hero.astro` ya lo pasaba |
| "El FAB queda oculto por un bug del IntersectionObserver" (ALTO) | Artefacto del entorno de auditoría: el pane no compositaba (`visibilityState: hidden`), así que el observer no entregaba callbacks. El código es correcto |
| "El `engines.node` contradice el stack" (MEDIO) | No es error de Faride: Astro 7.2.2 declara `engines.node >= 22.12.0`. El conflicto está en el documento |

---

## 2 · Trabajo ejecutado

### Etapa 0 — Cierre de deudas

| Hallazgo | Estado | Evidencia |
|---|---|---|
| Entregar el repositorio, no el `dist` | ✅ Resuelto | 3 commits con `src/`, configs y docs. `landing_pague_faride/` eliminado del control de versiones |
| `.gitignore` correcto | ✅ Resuelto | Ignora `dist/`, `node_modules/`, `.astro/`, `.env`, `dist.zip` y conserva las entradas del monorepo |
| `AGENTS.md` actualizado a Fase 2 | ✅ Resuelto | Las 27 reglas del §5. El anterior prohibía color de marca, Google Fonts y fotos reales |
| Mapeo de color en Tailwind (§0.4) | ✅ Resuelto | `grep 'style=' src/` → **0 resultados** (antes 37 en 10 archivos) |
| Deep links verificables (§0.5) | ✅ Resuelto | Ver bloque de verificación abajo |
| Estado Empty del catálogo (§0.6) | ✅ Ya existía | `ServicesGrid.astro` |
| Logo enlaza a la raíz | ✅ Resuelto | `href="/"` |
| Footer sin lenguaje interno | ✅ Resuelto | Se retiró "landing en fase de maquetado (Fase 1)" |

### Etapa 1 — Sistema de color

Arquitectura de dos capas en `tokens.css`, como exige el §1.1:

- **Primitivas:** `--brand-50…900` (naranja `#f47920`) y `--neutral-0…950` (negro carbón `#121215`). Únicos hexadecimales del proyecto.
- **Semánticas:** `--surface-*`, `--ink-*`, `--border-*`, `--action-*`, `--focus-ring`.
- Los componentes consumen la capa semántica **solo por clases de Tailwind** mapeadas en `tailwind.config.mjs`.

**Contraste AA verificado con herramienta** sobre las 18 combinaciones en uso. Dos decisiones que salieron de esa medición:

| Combinación | Ratio | Decisión |
|---|---:|---|
| Blanco sobre naranja | 2.76:1 | ❌ Descartado |
| **Negro sobre naranja** | **6.77:1** | ✅ Es el CTA primario |
| Naranja sobre blanco | 2.76:1 | ❌ No se usa para texto; el naranja es superficie |
| `--ink-brand` (brand-700) sobre blanco | 5.10:1 | ✅ Acento textual |
| Borde deshabilitado original (neutral-300) | 1.34:1 | ❌ Subido a neutral-500 → 7.03:1 |

El contexto oscuro (`.surface-inverse`, aplicado a header y footer) redefine tinta, superficies internas y anillo de foco, para que nada dentro pierda contraste sin que el componente tenga que saberlo.

### Etapa 2 — Tipografía

- **Anton** para display (H1, H2, H3, numeración de pasos) y **Barlow** 400/600/700 para cuerpo.
- `preconnect` a `fonts.googleapis.com` y `fonts.gstatic.com`, `display=swap`, solo los pesos usados.
- Stacks de respaldo reales: `Anton, 'Arial Narrow', 'Helvetica Neue', system-ui, sans-serif` y `Barlow, system-ui, -apple-system, …`.
- Escala tokenizada: `--text-h1`, `--text-h2`, `--text-h3`, `--text-body`, `--text-small`, `--text-xs`. Sin tamaños sueltos por componente.
- La jerarquía `h1 → h2 → h3` no se alteró.

### Etapa 3 — Imágenes y assets (parcial)

| Ítem | Estado |
|---|---|
| Icono oficial de WhatsApp como SVG inline | ✅ Hecho. Reemplaza el texto `[WA]`; hereda `currentColor`, no se deforma. El `aria-label` del FAB se conserva |
| Meta tags Open Graph y `twitter:card` | ✅ Hecho |
| `og:url` / canonical absolutos | ✅ Corregido. Sin `site`, Astro los resolvía contra `localhost` y se habrían publicado así |
| Fotografías reales | ⛔ **Bloqueado** — dependen de Andri |
| Logo real en SVG | ⛔ **Bloqueado** — depende de Andri |
| Favicon y `apple-touch-icon` | ⛔ **Bloqueado** — depende del logo |
| Imagen de vista previa 1200×630 | ⛔ **Bloqueado** — `og:image` se omite a propósito mientras no exista; una ruta rota la cachea WhatsApp |

### Etapa 4 — Refinamiento visual

- Radios tokenizados (`--radius-sm` 4px, `--radius-md` 8px), un solo criterio.
- Sombras tokenizadas (`--shadow-sm/md/lg`) usadas para jerarquía: el FAB lleva `shadow-lg`, las tarjetas `shadow-sm` y suben a `shadow-md` en hover.
- Transiciones de **150–200 ms**, solo en `hover` y `focus`. Sin parallax, scroll reveal ni animaciones de entrada.
- `prefers-reduced-motion: reduce` desactiva animaciones y transiciones.
- Hover sutil en tarjetas de servicio: el borde pasa a `--border-brand` y sube la elevación.
- **Las 9 reglas del FAB se conservan intactas.** Solo cambió su piel.

### Etapa 5 — QA (parcial)

**Auditoría de código: limpia.**

```
npm run build                     → exit 0, sin errores ni warnings de TypeScript
grep 'style=' src/                → 0 resultados
grep hex/rgb/hsl en componentes   → 0 resultados
grep '--brand-' en componentes    → 0 resultados
grep console.log|TODO|FIXME       → 0 resultados
grep fetch|XHR|axios|supabase     → 0 resultados
grep '<form'|'<input'             → 0 resultados
grep [0-9]{10,15} en src/         → 0 resultados
grep localhost en dist/index.html → 0 resultados
```

**Verificación de los dos estados de configuración**

Build A, con `PUBLIC_WHATSAPP_E164` configurado — mensaje decodificado del `href` real:

```
Hola, vengo del sitio de Imprenta Escalante.
Quiero cotizar: Gran formato.
Referencia: source=landing;service_id=gran-formato;placement=catalog.
```

Idéntico a la §9.2, carácter por carácter. Los 6 CTA generan su URL; el FAB se renderiza.

Build B, sin `.env`: los 6 CTA muestran "Contacto no disponible" con `disabled`, `aria-disabled` y borde punteado; `wa.me` → 0 ocurrencias; el FAB no tiene nodo en el DOM.

**Medición en navegador**

| Ancho | Resultado |
|---|---|
| 320 px | Sin scroll horizontal. Header 56 px. FAB 56×56 a 16 px del borde. **0 elementos desbordados** |
| 1920 px | Sin scroll horizontal. Contenedor topado en **1344 px**. Header 72 px. CTA principal **240×56**. FAB a 24 px del borde inferior |

Colores realmente aplicados, leídos con `getComputedStyle`: header y footer `rgb(18,18,21)`; CTA primario `rgb(244,121,32)` con texto `rgb(18,18,21)`; cuerpo `rgb(51,51,58)`; H1 en Anton a 56 px; cuerpo en Barlow.

---

## 3 · Pendiente

### Decisiones de Isaías

1. **Versión de Node.** La §4 de Fase 1 exige *"Astro última versión estable"* y *"Node 20 LTS"*. Son incompatibles: Astro 7.2.2 declara `engines.node >= 22.12.0`. Hoy el proyecto corre en Node 22. Hay que elegir: conservar Astro 7 con Node 22, o bajar Astro a una versión compatible con Node 20. **No se resolvió por cuenta propia: es el stack obligatorio.**

2. **Conteo de CTA.** La §8.1 exige un CTA de WhatsApp en el header. La §10 enumera *"los 5 enlaces (hero, 3 tarjetas, trust)"* y no lo cuenta. En el DOM hay 6, y el código cumple ambas secciones. Además, el tipo `Placement` de la §9.2 no contempla un valor `header`, así que `Header.astro` usa `'hero'` y en la trazabilidad del embudo un clic del header es indistinguible de uno del hero. Ampliar el tipo sería cambiar el contrato del deep link, que la §3.4 de Fase 2 congela.

3. **Punto de control de la Etapa 1.** El §6 de Fase 2 lo marca como obligatorio antes de seguir a la Etapa 3. La paleta está aplicada y lista para revisión.

### Bloqueado por Andri

Fotografías de producto · logo en SVG · favicon y `apple-touch-icon` · imagen social 1200×630 · dirección y horario reales · aviso de privacidad y términos.

Mientras tanto, el footer usa texto neutro que **no afirma ningún dato falso** ("Consulta nuestra ubicación por WhatsApp"), en lugar de corchetes visibles, como pide el §5.6. Los enlaces legales conservan `href="#"` para no generar un 404 frente al cliente.

### Requiere navegador real

Estos puntos **no se pudieron cerrar** porque el pane de auditoría no compositaba frames:

- Recorrido completo con `Tab` y foco visible en orden lógico (§10)
- Comportamiento del FAB con `IntersectionObserver` y `visualViewport` en vivo
- Zoom al 200%
- Carga con JavaScript desactivado
- Anchos 360, 390, 430, 768, 1280 y 1440 (se midieron 320 y 1920)
- Prueba en celular real (§5.6)

### Requiere deploy

Lighthouse móvil con los cuatro umbrales (Rendimiento ≥90, Accesibilidad ≥95, Mejores prácticas ≥95, LCP <2.5 s, CLS <0.1) y la URL de preview para el PR.

---

## 4 · Commits de esta entrega

```
2153fb9  fix: og:url y canonical ya no apuntan a localhost
29b19f1  docs(H-09): actualiza el README a Fase 2 y documenta las tareas de lanzamiento
a0335bc  refactor(H-01): elimina los 37 style inline y aplica la identidad visual
7f04f7a  feat: sistema de color de marca en dos capas (Etapa 1)
e5d0de9  docs(H-02): actualiza AGENTS.md al contexto de Fase 2
8f6d6bf  chore(H-01): extiende el .gitignore para ignorar dist, node_modules y .env
b76690e  chore(H-04): agrega .env.example, AGENTS.md y README.md
9c5de36  feat(H-01): agrega el codigo fuente de la landing al repositorio
```

**Nota:** falta agregar `PUBLIC_SITE_URL=` a `.env.example`. No se pudo editar por una restricción de permisos sobre archivos `.env*`; la variable está documentada en el README.
