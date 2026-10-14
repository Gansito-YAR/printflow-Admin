# Plan de Implementación — Panel Administrativo Responsive (Celular y Tablet)

| Campo | Detalle |
|---|---|
| Proyecto | **PrintFlow AI** — Imprenta Escalante |
| Repositorio | `printflow-admin` (github.com/Gansito-YAR/printflow-Admin) |
| Alcance | Las 13 pantallas del panel, más sus ventanas emergentes, usables en celular (≥ 360 px) y tablet (768–1023 px) sin perder nada en escritorio |
| Fuera de alcance | La lógica de negocio, la base de datos y el PDF de remisión (se genera igual en cualquier dispositivo). Este trabajo es **solo de presentación** |
| Responsable | Isaías |

> **Regla de oro.** Ninguna pantalla puede tener desplazamiento horizontal de la página en ningún tamaño. Si un contenido no cabe, se reacomoda (columnas → filas, tabla → tarjetas) o se desplaza **dentro de su propio contenedor**, nunca la página completa.

---

## 0. Diagnóstico actual (medido el 08/10/2026)

| Ancho | Menú lateral | Espacio para contenido | Estado |
|---|---|---|---|
| 1280 px (escritorio) | 224 px | 1056 px | Correcto |
| 768 px (tablet) | 224 px | 544 px | Usable pero apretado; las tablas se cortan (contenido de 654 px en 544 px) |
| 375 px (celular) | 224 px | **151 px** | Inutilizable |

Causas, en orden de impacto:
1. El menú lateral es fijo (`w-56`) en todos los tamaños.
2. 7 tablas de ancho fijo: Pedidos, Clientes, Productos, Insumos, Usuarios, Utilidad y Mermas.
3. El tablero usa 4 columnas con ancho mínimo de 992 px.
4. Hay formularios en rejillas de 2 a 12 columnas: Nuevo pedido, Productos, Insumos, Recetas y Costos.
5. Las ventanas emergentes miden 648 px de ancho máximo y su relleno es fijo de 32 px.
6. Los filtros usan anchos fijos (`w-40`, `w-52`, `w-72`…).
7. Algunos botones usan solo `title` (texto al pasar el cursor), que no existe en pantallas táctiles.

---

## 1. Decisiones

| ID | Decisión | Motivo |
|---|---|---|
| **RSP-D-01** | Puntos de quiebre de Tailwind: **celular < 768 px**, **tablet 768–1023 px** (`md:`), **escritorio ≥ 1024 px** (`lg:`). El diseño actual pasa a ser el de `lg:` | No hace falta configurar nada, y el escritorio actual queda intacto |
| **RSP-D-02** | Se escribe **de celular hacia arriba**: las clases base son de celular y se agregan `md:` y `lg:` | Es la forma natural en Tailwind y evita casos que se cubren dos veces |
| **RSP-D-03** | **Menú:** en escritorio, el lateral actual. En celular y tablet, un **cajón deslizable** que abre el botón ☰ del encabezado. Se cierra al elegir una opción, con Esc o tocando el fondo | Libera los 224 px. Un menú de iconos no sirve aquí porque el panel no tiene iconografía |
| **RSP-D-04** | **Tablas:** se crea un componente `DataList` que dibuja una **tabla** desde `md:` y **tarjetas apiladas** en celular, a partir de la misma definición de columnas | Una sola implementación para las 7 tablas; no se duplica cada pantalla |
| **RSP-D-05** | **Tablero:** escritorio sin cambios. En tablet, carriles con **desplazamiento horizontal y ajuste** (scroll-snap) mostrando 2 a la vez. En celular, **pestañas por estado** con contador ("Anticipo 0 · Producción 1 · Listos 2 · Entregados") y un solo carril a lo ancho | Arrastrar 4 columnas en 375 px no es usable; las pestañas sí |
| **RSP-D-06** | **Ventanas emergentes:** en celular se abren como **hoja inferior** a pantalla casi completa, con botones fijos abajo. Desde `md:`, siguen centradas como hoy | Cobrar un abono en el celular con el teclado abierto debe dejar el botón a la vista |
| **RSP-D-07** | **Zona táctil mínima de 44×44 px** en botones, enlaces de acción y casillas (WCAG 2.5.5) | Se usa con el dedo, a veces con prisa en el taller |
| **RSP-D-08** | Campos de texto con **fuente de 16 px en celular** | Con menos de 16 px, iOS hace zoom automático al escribir y descuadra la pantalla |
| **RSP-D-09** | Nada depende solo de pasar el cursor: todo `title` informativo pasa a ser **texto visible** o una ayuda que se abre con un toque | En una pantalla táctil no hay cursor |
| **RSP-D-10** | **Barra de acciones fija abajo** en celular en Nuevo pedido ("Crear pedido" + total) y en el detalle del pedido ("Registrar abono"). Respeta la zona segura del iPhone (`env(safe-area-inset-bottom)`) | La acción principal siempre a la mano |
| **RSP-D-11** | Sin librerías nuevas. Solo Tailwind y los componentes propios | Mantiene el peso del paquete |
| **RSP-D-12** | La confidencialidad no cambia: costos y utilidad siguen plegados por defecto en todos los tamaños | En un celular es todavía más fácil que el cliente vea la pantalla |

---

## 2. Base común (se hace primero)

| Tarea | Archivo(s) | Qué cambia |
|---|---|---|
| **RSP-01** Shell con cajón | `layouts/AdminShell.tsx` | Menú lateral `hidden lg:flex`. Encabezado con botón ☰ (`lg:hidden`) y logo. Cajón `fixed inset-y-0 left-0 w-72` con fondo oscuro detrás, bloqueo del desplazamiento del cuerpo y foco atrapado; se cierra al navegar, con Esc o al tocar el fondo. El aviso de stock bajo también aparece en el botón ☰. El nombre del usuario y "Cerrar sesión" se mueven dentro del cajón en celular. Relleno de `main`: `p-3 md:p-4 lg:p-6` |
| **RSP-02** `DataList` | `components/DataList.tsx` (nuevo) | Recibe `columns: {key, header, render, align?, primary?, hideOnMobile?}[]`, `rows`, `rowKey` y `actions?`. Desde `md:` dibuja un `<table>`. En celular dibuja una `<ul>` de tarjetas: la columna `primary` va como título, las demás como pares "etiqueta: valor" y las acciones como botones a todo lo ancho. Accesible: la tabla con encabezados `th scope`; las tarjetas con `aria-label`. La tabla se envuelve en `overflow-x-auto` como red de seguridad en tablet |
| **RSP-03** Modal responsive | `components/ui.tsx` (`Modal`) | Celular: `items-end`, panel `w-full max-h-[92dvh] rounded-t-xl`, relleno `px-4 py-4`, pie fijo dentro del panel. Desde `md:`: centrado como hoy. Usa `dvh` para que el teclado del celular no tape los botones |
| **RSP-04** Botones y campos | `components/ui.tsx` | `Button`: `min-h-11` en celular y `md:min-h-10`. Campos: `text-base md:text-sm` (RSP-D-08). Nueva variante `Button block` (`w-full md:w-auto`) |
| **RSP-05** Barra de filtros | `components/FilterBar.tsx` (nuevo) | Contenedor `grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap` que reemplaza los `w-40/w-52/w-72` fijos. En celular, los filtros se pliegan detrás de un botón "Filtros (n)" |
| **RSP-06** Barra de acción fija | `components/StickyActions.tsx` (nuevo) | `fixed bottom-0 inset-x-0 lg:static` con `pb-[env(safe-area-inset-bottom)]`. La página reserva espacio abajo para no tapar contenido |
| **RSP-07** Sin `title` como único texto | Búsqueda en todo el código | Botón de forzar entrega, aviso de stock bajo, etc.: el motivo de un botón deshabilitado se muestra como texto pequeño debajo |
| **RSP-08** Utilidades CSS | `styles/global.css` | `.safe-bottom`, `.no-scrollbar` y bloqueo de desplazamiento del cuerpo (`overflow: hidden` mientras haya cajón u hoja abiertos) |

---

## 3. Pantalla por pantalla

| Tarea | Pantalla | Celular (< 768) | Tablet (768–1023) |
|---|---|---|---|
| **RSP-10** | **Login** | Ya cabe. Verificar fuente de 16 px y que el teclado no tape el botón | Sin cambio |
| **RSP-11** | **Tablero** | Pestañas por estado con contador (RSP-D-05), un carril a lo ancho y tarjetas a todo lo ancho. Filtros detrás del botón "Filtros". "+ Nuevo pedido" como botón flotante abajo a la derecha. El indicador "En tiempo real" se reduce al punto de color con texto accesible | 4 carriles con `overflow-x-auto snap-x`, cada uno de `min-w-[46%] snap-start` |
| **RSP-12** | **Nuevo pedido** | Cliente: buscador y "+ Cliente nuevo" apilados. **Partidas:** cada renglón pasa a tarjeta (producto a todo lo ancho; cantidad, ancho y alto en 3 columnas; quitar arriba a la derecha). Entrega y resumen apilados. Barra fija abajo con "Total $X" y "Crear pedido" | Partidas en 2 filas por renglón (producto / medidas); entrega y resumen en 2 columnas |
| **RSP-13** | **Detalle de pedido** | Encabezado apilado: folio y estado, cliente y luego el saldo en grande. Acciones: "Registrar abono" fija abajo y las demás (avanzar estado, remisión) a todo lo ancho. Partidas como tarjetas (`DataList`). Bitácora en una columna (fecha arriba del texto). Costos: las tarjetas por partida se apilan. Acciones avanzadas: botones a todo lo ancho, uno por fila, con el motivo de los deshabilitados visible | Encabezado en 2 columnas; acciones avanzadas en 2 columnas |
| **RSP-14** | **Modal de cobro** | Hoja inferior (RSP-03), monto con `inputMode="decimal"` y 16 px, botón "Registrar abono" fijo abajo | Centrado |
| **RSP-15** | **Acciones avanzadas (modales)** | Hoja inferior. Reautenticación con `autoComplete="current-password"`. Reintegro de material: un campo por insumo, a lo ancho | Centrado |
| **RSP-16** | **Pedidos** | `DataList`: la tarjeta lleva folio y estado como título, y cliente, trabajo, registrado, total y saldo. Paginación con botones a lo ancho | Tabla sin "Trabajo" (`hideOnTablet`) |
| **RSP-17** | **Clientes** | `DataList` + "Editar" a lo ancho. Formulario de cliente en una columna | Tabla |
| **RSP-18** | **Productos y recetas** | `DataList` con nombre y estado como título, precios en pares y botones "Receta y costo" y "Editar". Formulario de producto en una columna. **Recetas:** cada insumo en tarjeta (insumo a lo ancho; cantidad y merma en 2 columnas). El simulador queda debajo y su tabla de márgenes se convierte en 2 tarjetas (Menudeo / Mayoreo) | Tabla sin "Mín. mayoreo"; receta en 2 filas por insumo |
| **RSP-19** | **Insumos** | `DataList` con existencia en grande (rojo si está bajo) y costo. Las 5 acciones van en un menú "Acciones ▾" (hoja inferior) para no apilar 5 botones. Historial de movimientos en tarjetas | Tabla; acciones en 2 filas |
| **RSP-20** | **Utilidad y mermas** | Las 5 tarjetas de totales en 2 columnas, con la utilidad a lo ancho. Filtros detrás del botón "Filtros". Tablas en `DataList`. Pestañas Utilidad/Mermas a lo ancho. CSV igual | Totales en 3 columnas; tabla con desplazamiento dentro de su contenedor |
| **RSP-21** | **Bitácora** | Cada registro: fecha y usuario arriba en pequeño, tipo como etiqueta, texto completo abajo. Filtros detrás del botón "Filtros" | Rejilla de 2 columnas (fecha / contenido) |
| **RSP-22** | **Usuarios** | `DataList` con nombre y rol (selector a lo ancho) y Activar/Desactivar a lo ancho | Tabla |
| **RSP-23** | **Configuración** | Ya es de una columna; ajustar el relleno y que "Guardar" quede a lo ancho | Sin cambio |
| **RSP-24** | **Avisos (toasts)** | `position="top-center"` en celular para que no tapen el encabezado ni la barra fija | `top-right` |

---

## 4. Accesibilidad y detalles táctiles

| Tarea | Detalle |
|---|---|
| **RSP-30** | El cajón y las hojas inferiores atrapan el foco, se cierran con Esc y devuelven el foco al botón que los abrió (`Modal` ya lo hace; extenderlo al cajón) |
| **RSP-31** | `aria-expanded` y `aria-controls` en ☰, "Filtros" y "Acciones ▾" |
| **RSP-32** | Respetar `prefers-reduced-motion`: el cajón y la hoja aparecen sin animación si el usuario lo pide (ya existe la regla global) |
| **RSP-33** | Contraste AA conservado; los tokens no cambian |
| **RSP-34** | Orientación horizontal del celular (812×375): el tablero y las hojas siguen siendo usables; la hoja usa `max-h-[92dvh]` con desplazamiento interno |
| **RSP-35** | Campos numéricos con `inputMode="decimal"` (teclado numérico) y teléfono con `inputMode="tel"`. Revisar los que falten |

---

## 5. Verificación

### 5.1 Matriz de pruebas

Cada pantalla, con sus ventanas emergentes, se revisa en:

| Dispositivo | Tamaño |
|---|---|
| Celular pequeño | 360 × 740 |
| iPhone | 390 × 844 |
| Celular horizontal | 844 × 390 |
| Tablet vertical | 768 × 1024 |
| Tablet horizontal | 1024 × 768 |
| Escritorio | 1280 × 800 (regresión: debe verse igual que hoy) |

### 5.2 Criterios de aceptación por pantalla

1. `document.documentElement.scrollWidth === innerWidth` (sin desplazamiento horizontal de la página).
2. Ningún texto cortado, salvo los recortes intencionales (`line-clamp`).
3. Botones y enlaces de acción ≥ 44 px de alto en celular.
4. La acción principal es visible sin desplazarse, o está en la barra fija.
5. Con el teclado abierto, el botón de enviar de la ventana sigue visible.
6. En escritorio no hay cambios visuales (se comparan capturas antes y después).

### 5.3 Automatización

| Tarea | Detalle |
|---|---|
| **RSP-40** | Script de auditoría `scripts/audit-responsive` que recorre las rutas en cada tamaño de la matriz y reporta: desplazamiento horizontal, elementos que salen del viewport y zonas táctiles < 44 px. Se corre en el navegador del panel con sesión de ADMIN |
| **RSP-41** | Pruebas de componentes (Vitest): `DataList` dibuja una tabla o tarjetas según el ancho (con `matchMedia` simulado); el cajón abre, cierra con Esc y cierra al navegar; el `Modal` en modo hoja conserva el foco |
| **RSP-42** | Capturas antes y después en escritorio para confirmar que no hubo regresiones |
| **RSP-43** | Prueba real en un teléfono Android y en un iPhone contra el panel desplegado o por la red local (`vite --host`). Revisa el zoom de iOS, la zona segura, el teclado y la orientación |

---

## 6. Orden de ejecución

1. **Base:** RSP-01 (cajón), RSP-03 (modal), RSP-04 (botones y campos) y RSP-08 (utilidades). Con esto solo, todo deja de quedar aplastado.
2. **Componentes:** RSP-02 (`DataList`), RSP-05 (filtros), RSP-06 (barra fija) y RSP-07.
3. **Flujo de dinero primero:** RSP-11 (tablero), RSP-13 (detalle), RSP-14 (cobro), RSP-12 (nuevo pedido) y RSP-15 (acciones avanzadas).
4. **Listados:** RSP-16 a RSP-22, todos con `DataList`.
5. **Pulido:** RSP-23, RSP-24 y RSP-30 a RSP-35.
6. **Verificación:** RSP-40 a RSP-43; commit y push por bloque.

---

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| Romper el escritorio al tocar clases | Escribir de celular hacia arriba, con `lg:` igual al diseño actual. Capturas de regresión (RSP-42) |
| `DataList` no cubre algún caso especial (selector de rol, acciones múltiples) | `render` libre por columna y `actions` libres |
| Teclado del celular tapando botones en las hojas | `dvh`, pie fijo dentro de la hoja y prueba real (RSP-43) |
| Costos visibles en un celular a la vista del cliente | Siguen plegados por defecto (RSP-D-12) |
| Generar el PDF en el celular es lento la primera vez (unos 1.2 MB de librería) | Ya se carga solo al usarlo. Mostrar "Generando PDF…" con estado claro (ya existe) |
