# Pendientes del Frontend — Cierre antes de presentar al cliente

| Campo | Detalle |
|---|---|
| Proyecto | **PrintFlow AI** — Imprenta Escalante |
| Origen | Revisión de Isaías sobre `landing_pague_faride` (Fase 2.5) y `printflow-app` (Fase 2, Apartado B etapas 1-4) |
| Estado | El front es funcional pero **no está listo para enseñarse al cliente** |
| Plazo | Lo define Isaías por separado |
| Nota | Se pausa para iniciar el Backend. Estos pendientes se retoman después |

> **Cómo se verificó.** Código fuente, `npm run build`, `npm test` y medición en navegador (contraste, tamaños, DOM) sobre ambos proyectos corriendo en local. Las capturas de pantalla no se renderizan en el panel de revisión, así que **el aspecto visual no está validado a ojo**: lo valida Isaías antes de enseñarlo.

---

## 1. Landing — Faride

### Ya está bien (no tocar)

- Cero placeholders visibles; 6 imágenes cargadas sin errores; hero `eager` + `fetchpriority="high"`, resto `lazy`
- Build de 529 KB (límite 1 MB); imágenes en WebP, todas bajo 200 KB; `og:image` de 83 KB
- Contraste AA: 0 fallos en 36 textos (peor ratio 5.1:1)
- A 320 px: sin scroll horizontal, logo dentro del header, FAB de 56×56 a 16 px de los bordes
- Header (72/56 px), contenedor de 1344 px, deep links y `noindex` intactos

### Pendientes

| ID | Prioridad | Pendiente | Detalle |
|---|---|---|---|
| **L-01** | **Alta** | **Deploy en URL pública** | Es lo único que falta del Bloque 1 de la Fase 2.5. Cloudflare Pages o Vercel, redeploy automático en cada push, `PUBLIC_SITE_URL` configurada en el hosting, Node 22 fijado en el hosting. Sin URL no hay presentación posible |
| **L-02** | **Alta** | **Número oficial de WhatsApp** | `PUBLIC_WHATSAPP_E164` sigue vacía. Con la variable vacía **todos los CTA muestran "Contacto no disponible"** y el FAB no se renderiza. Depende de **Andri**. Es la única conversión de la página |
| L-03 | Media | Lighthouse móvil sobre la URL pública | Dos mediciones: línea base y final. Umbrales: Rendimiento ≥90, Accesibilidad ≥95, Mejores prácticas ≥95, LCP <2.5 s, CLS <0.1. Requiere L-01 |
| L-04 | Media | Verificar la calidad del logo | Su reporte decía que el logo disponible salía del banner (960×422, sobre textura) y que **no se debe recortar de ahí**. Hoy el logo es `logo-imprenta-escalante.png` de 800×165. Confirmar a ojo que tiene fondo limpio y buena resolución; si no, pedir el original vectorial a Andri |
| L-05 | Baja | Actualizar la lista "Tareas de lanzamiento" del README | Aparece como pendiente lo que ya está hecho (placeholders, imagen social 1200×630, decisión de Node). Dejar solo lo real: quitar `noindex` al aprobar, número de WhatsApp, enlaces legales |
| L-06 | Baja | Enlaces legales del footer | Aviso de privacidad y términos definitivos. Depende de **Andri** |
| L-07 | Baja | Corregir la cuenta de CTA en la documentación | Quedan **5** CTA de WhatsApp (hero, 3 tarjetas, FAB), no 4. El documento de Fase 2.5 se equivocó al sumar; el código sigue la lista correcta |

---

## 2. App móvil — Emir

### Ya está bien (no tocar)

- Tokens en tres capas; tema claro / oscuro / sistema con atributo explícito que gana sobre `prefers-color-scheme` en ambos sentidos
- Script anti-parpadeo en `index.html`, `theme-color` dinámico, `localStorage` protegido con `try/catch`
- `ThemeToggle` de 48×48 con `aria-label`; logo real en el header
- **Candado intacto en ambos temas**: sin `delivery-confirm` con deuda / saldo nulo / sobrepago / no entregable; con botón solo con saldo `"0.00"`
- `npm run build` limpio; 6/6 tests

### Pendientes

| ID | Prioridad | Pendiente | Detalle |
|---|---|---|---|
| **E-01** | **Alta** | **Iconos reales de la PWA** | `public/manifest-icons/icon-192.png` (600 B) e `icon-512.png` (2.2 KB) siguen siendo los marcadores del 8/09. Generar los reales con el logo + **variante `maskable`** (marca dentro del 80 % central) |
| **E-02** | **Alta** | **`apple-touch-icon.png` no existe** | `index.html` lo referencia (`/manifest-icons/apple-touch-icon.png`) pero el archivo no está. El servidor responde 200 con HTML (fallback de la SPA), así que **falla en silencio**. Crear el archivo de 180×180 |
| **E-03** | **Alta** | **Matriz de verificación 27 filas × 2 temas** | Etapa 7. No existe (`docs/` solo tiene `identidad-visual.md`). Recorrer las 27 filas de la Fase 1.5 en claro y oscuro, a 320 / 360 / 390 / 430 px, y entregar la tabla marcada |
| E-04 | Media | Instalar la PWA en un celular real | Verificar icono nítido y sin recorte, splash con colores correctos, modo `standalone`, barra de estado en ambos temas y nombre completo bajo el icono. Requiere E-01 y E-02 |
| E-05 | Media | Pruebas de tema | Los tests siguen en 6 y **ninguno cubre el tema**. Agregar: persistencia, estado `system`, y que `delivery-confirm` siga sin existir con deuda en ambos temas |
| E-06 | Media | Contraste en modo oscuro | Badge `SIN FECHA PACTADA`: **4.31:1** a 12 px (mínimo 4.5:1) |
| E-07 | Baja | Contraste en modo claro | Texto del marcador `[CAMERA FEED — NO IMAGE REAL]`: **3.94:1** a 14 px. Es un placeholder de desarrollo; se resuelve solo cuando entre la cámara real, pero conviene subirlo |
| E-08 | Baja | `ThemeToggle` ausente en login | Solo aparece dentro de `AppShell`. Un instalador con el sistema en oscuro no puede cambiar el tema antes de iniciar sesión |
| E-09 | Baja | Etapa 6 (tipografía y refinamiento) | No se revisó a fondo. Comprobar escala tipográfica tokenizada, radios y sombras con un solo criterio, `prefers-reduced-motion`, y que en oscuro la jerarquía no dependa de sombras |
| E-10 | Baja | **M-01** — doble `scanOrder` por escaneo | Sigue abierto: `ScannerScreen` y `DeliveryResultScreen` llaman a `scanOrder`. Medido: ~1.4 s del clic al panel. Debe llamarse una sola vez, en la pantalla de resultado |
| E-11 | Baja | **M-02** — estado duplicado demo ↔ gateway | Declarado resuelto en el commit del Apartado A pero **no lo está** (solo se movió la sincronización manual). Reabrirlo como pendiente explícito hacia la integración con la API |

---

## 3. Dependencias externas y decisiones

| Asunto | Quién | Bloquea |
|---|---|---|
| Número oficial de WhatsApp | **Andri** | L-02 |
| Aviso de privacidad y términos | **Andri** | L-06 |
| Logo original vectorial (solo si L-04 lo exige) | **Andri** | L-04 |
| Elegir hosting del deploy (Cloudflare Pages o Vercel) | **Isaías** | L-01 |
| Validar a ojo el aspecto de ambas apps antes de enseñarlas | **Isaías** | Presentación |

---

## 4. Orden sugerido al retomar

1. **Faride:** L-01 (deploy) → L-03 (Lighthouse) → L-04 → L-05
2. **Emir:** E-01 + E-02 (iconos) → E-04 (instalar en celular) → E-03 (matriz 27×2) → E-05 / E-06 → resto
3. **Presentación al cliente** solo cuando estén cerrados L-01, L-02, E-01, E-02 y E-03

## 5. Limpieza local (Isaías)

- Hay un `.env` ficticio con un número de WhatsApp de prueba (`521000000000`) en `landing_pague_faride/`. Está en `.gitignore` y no se versiona, pero hace que los CTA se vean activos en local aunque la variable real esté vacía. **Borrarlo antes de evaluar el estado real de la landing**
- Hay `.claude/launch.json` en la raíz y en `landing_pague_faride/` que dejó la revisión, solo para arrancar los servidores de vista previa
