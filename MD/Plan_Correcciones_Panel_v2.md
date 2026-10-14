# Plan de implementación: correcciones del panel administrativo (v2)

| Campo | Detalle |
|---|---|
| Proyecto | **PrintFlow AI**, Imprenta Escalante |
| Alcance | `printflow-admin` y migraciones en `API/supabase` |
| Origen | Correcciones de Isaías tras el despliegue en Render (10/10/2026) |
| Regla general | No se cambia ninguna regla de negocio existente: candado de entrega, saldos, anticipo, costeo congelado y RLS siguen igual |

## Resumen

| # | Corrección | Toca BD | Esfuerzo | Fase |
|---|---|---|---|---|
| C1 | Modo claro / oscuro | No | Bajo | 1 |
| C2 | Tipografía | No | Bajo | 1 |
| C3 | Colores por estado del pedido | No | Bajo | 1 |
| C4 | Teléfono con lada internacional y mejor captura | No | Medio | 2 |
| C5 | Categorías de producto personalizadas | **Sí** | Medio | 3 |
| C6 | Aviso de insumos insuficientes + **centro de Notificaciones** | **Sí** (tabla de alertas, 2 RPC, triggers) | Alto | 3 |
| C7 | Crear cuentas (con contraseña) desde Usuarios | **Sí** (función SQL) | Alto | 4 |

El orden va de lo visual y sin riesgo (fase 1) a lo que necesita servidor (fase 4). Así cada fase se puede subir a Render por separado.

---

## Fase 1: Base visual (C1, C2, C3)

Va primero porque C3 y todo lo nuevo de las fases siguientes se diseña ya con tema y tipografía definitivos.

### C1. Modo claro / oscuro

**Estado actual:** `src/styles/tokens.css` ya define los dos temas (`[data-theme="light"|"dark"]` y `prefers-color-scheme`), pero `src/main.tsx:7` fuerza `data-theme="light"`. El oscuro existe en los tokens pero nadie lo usa.

**Cambios:**
1. `src/store/theme.ts` (nuevo): preferencia `system | light | dark` guardada en `localStorage` (con `try/catch`), igual que la app móvil.
2. `index.html`: un script en línea que aplique el tema antes del primer pintado, para evitar el destello blanco al cargar en oscuro.
3. `src/main.tsx`: quitar el `setAttribute("data-theme", "light")` fijo.
4. `ThemeToggle` en el encabezado de `AdminShell` (Sistema / Claro / Oscuro, con icono y `aria-label`). También en Configuración, como selector de tres opciones.
5. **Auditoría de colores fijos:** buscar hex y `bg-white` / `text-black` en `src/**/*.tsx` y pasarlos a tokens. Revisar sobre todo el Kanban, los modales (`PaymentModal`, `RecipeModal`), `toast` (react-hot-toast necesita estilos por tema) y las tablas de `DataList`.
6. **Contraste AA (4.5:1)** en ambos temas, con mayor cuidado en los badges de urgencia y de estado.
7. **Fuera de alcance:** el PDF de remisión (`pdfTheme.ts`) se queda siempre en claro, porque se imprime.

**Criterio de aceptación:** las 13 pantallas se ven correctas en claro y oscuro, a 360 / 768 / 1280 px, sin texto ilegible ni fondos blancos sueltos. El tema elegido se mantiene al recargar.

### C2. Tipografía

**Estado actual:** `global.css:75` usa `system-ui`, y cada sistema operativo muestra una fuente distinta.

**Propuesta:** usar la tipografía de la marca que ya usa la landing de Faride.
- **Barlow** para todo el texto. Es legible en tablas y formularios densos y tiene cifras tabulares para montos alineados.
- **Anton** solo en títulos de página y en el logotipo, con moderación.

**Cambios:**
1. Instalar `@fontsource/barlow` (pesos 400, 500, 600 y 700) y `@fontsource/anton`. Así se sirven desde el propio panel, sin depender de Google Fonts.
2. Tokens `--font-sans` y `--font-display` en `tokens.css`. Escala tipográfica en tokens: 12 / 14 / 16 / 20 / 24 / 32.
3. `font-variant-numeric: tabular-nums` en montos, cantidades y tablas.
4. Verificar que el peso total de las fuentes en el build no pase de 150 KB (solo subconjunto `latin`).

**Decisión (D1):** se aplica también a la app móvil. En la app se usa solo Barlow; Anton queda para el panel y la landing, porque en pantallas de teléfono y con mensajes de estado críticos se necesita la máxima legibilidad.

### C3. Colores por estado del pedido

**Estado actual:** `StatusBadge` (`components/ui.tsx:295`) es gris para los 5 estados. Solo las urgencias tienen color.

**Paleta propuesta** (tokens nuevos `--status-<estado>-bg/ink/line` para claro y oscuro):

| Estado | Color | Icono |
|---|---|---|
| Pendiente de anticipo | Ámbar | Reloj |
| En producción | Azul | Engrane / impresora |
| Listo para entrega | Verde azulado | Paquete |
| Entregado | Verde | Palomita |
| Cancelado | Gris con texto tachado | X |

**Reglas:**
- El estado nunca se indica **solo** por color: cada badge lleva icono y texto, por accesibilidad y por la regla de la constitución.
- Los colores de estado no deben confundirse con los de urgencia (rojo = vencido). Por eso no se usa rojo para ningún estado.

**Dónde se aplica:**
- `StatusBadge`, en todos los listados.
- Encabezados de columna y borde superior de las tarjetas del Kanban.
- Filtros de Pedidos.
- Detalle del pedido.
- Bitácora.

---

## Fase 2: Teléfono internacional (C4)

**Estado actual:** `CustomerForm.tsx:12-18`. Un número de 10 dígitos recibe el prefijo `52`; cualquier otro se guarda tal cual si tiene entre 10 y 15 dígitos. No hay selector de lada y la pista solo menciona México.

**Restricción importante:** `customers.phone_number` se guarda en **E.164 sin "+"** y es la llave con la que n8n identificará al cliente de WhatsApp. El formato guardado **no cambia**; solo mejora la captura.

**Diseño de la captura:**
1. **Selector de país** con bandera, nombre y lada (+52, +1, +57, +34, …). México va por defecto y primero, seguido de los países más probables: EE. UU., Canadá, Guatemala, Colombia y España. Después, el resto en orden alfabético, con búsqueda.
2. **Campo del número** con máscara por país mientras se escribe. Para México: `55 1234 5678`. Para EE. UU.: `(555) 123-4567`. Teclado numérico (`inputMode="tel"`).
3. **Pegado inteligente:** si se pega `+52 1 55…`, `0052…` o un número con espacios o guiones, se detecta la lada y se separa sola.
4. **Validación en vivo** de la longitud por país, con mensaje claro: "Faltan 2 dígitos", no "Teléfono inválido".
5. **Vista previa** del número completo: "Se guardará como +52 55 1234 5678".
6. **Edición:** al abrir un cliente existente se separa la lada guardada en país + número.
7. **Duplicados:** el aviso "Ya existe un cliente con ese teléfono" pasa a mostrarse debajo del campo, con un enlace al cliente existente.

**Librería:** `libphonenumber-js` en su versión `min`, con metadatos de unos 80 KB y carga diferida solo en el formulario. Da la validación por país, las máscaras y el formato E.164 correcto, sin mantener reglas a mano.

**Datos existentes:** los teléfonos ya guardados con `52…` siguen válidos. No hay migración.

**Pruebas:** normalización de México de 10 dígitos → `52…`, de EE. UU. → `1…`, pegado con `+`, `00` y espacios, longitudes inválidas por país, y edición de un cliente existente.

---

## Fase 3: Categorías personalizadas (C5) y aviso de insumos (C6)

### C5. Categorías de producto personalizadas

**Estado actual:** la categoría es un `enum` de PostgreSQL con 3 valores fijos (`GRAN_FORMATO`, `PAPELERIA`, `PROMOCIONALES`). Agregar una categoría hoy exige una migración.

**Migración `20261012000001_categorias_producto.sql`:**
1. Nueva tabla `product_categories`:
   - Columnas: `id`, `name` (único sin distinguir mayúsculas), `sort_order`, `is_active`, `created_at`.
   - RLS: lectura para usuarios autenticados y escritura solo para ADMIN.
2. Insertar las 3 categorías actuales con sus nombres legibles: Gran formato, Papelería, Promocionales.
3. `products.category_id` (FK a `product_categories`), llenado desde el enum actual. Después se elimina la columna `category` y el tipo `product_category`.
4. Actualizar lo que usa el enum:
   - Vista `active_price_list` (`0011`), que el chatbot usará.
   - Reporte de utilidad agrupado por categoría (`modulo4_rpc.sql:607-632`).
   - Permisos de columna (`0008`).
5. RPC `admin_upsert_category(name, sort_order, is_active)` con validación: nombre no vacío, máximo 40 caracteres, sin duplicados.
6. **No se borran categorías.** Se desactivan, para no romper productos ni reportes históricos. Desactivar una que tiene productos activos muestra un aviso con el número de productos.

**Panel:**
- En el formulario de producto, el selector de categoría incluye al final **"+ Nueva categoría…"**. Abre un campo en línea, la crea y la deja seleccionada sin salir del formulario.
- En Productos, una sección "Administrar categorías" para renombrar, reordenar y activar o desactivar.
- `types.ts`: `ProductCategory` deja de ser una unión fija y pasa a `{ id, name }`. Se reemplaza `CATEGORY_LABEL`.
- Los filtros por categoría se cargan de la tabla.

**Riesgo:** esta migración cambia una columna que usan varias vistas y RPC. Se prueba primero contra una copia (rama de Supabase o `pg_dump` local), y antes de aplicarla en producción se hace un respaldo.

### C6. Aviso de insumos insuficientes

**Estado actual:**
- Los insumos se descuentan al pasar un pedido a **En producción** (congelamiento, `modulo4_congelamiento.sql:114`).
- `business_settings.allow_negative_stock` vale `true` por defecto, así que el inventario puede quedar en negativo **sin ningún aviso**.
- `raw_materials.min_stock` existe, pero no se avisa cuando se alcanza.

**Decisión (D3):** se permite continuar con confirmación; la cotización ya hecha no se ve afectada. El aviso **persiste** mientras el faltante exista y queda en la bitácora.

**Base de datos (migración `20261012000002_alertas_inventario.sql`):**
1. RPC de solo lectura `preview_order_materials(p_order_id)`. Devuelve por insumo: requerido (con merma), disponible y faltante. Usa la misma fórmula que el congelamiento, para que el aviso y el descuento real coincidan.
2. Tabla `inventory_alerts`:
   - Columnas: `id`, `order_id`, `raw_material_id`, `shortage_qty`, `created_at`, `acknowledged_by`, `resolved_at`.
   - Se crea **sola** en el congelamiento cuando un descuento deja el insumo en negativo: un registro por pedido e insumo.
   - Se **resuelve sola** con un trigger en `inventory_transactions`, cuando un reabasto o un ajuste devuelve ese insumo a stock ≥ 0.
   - RLS: solo ADMIN.
3. RPC `get_notifications()`. Junta en una sola lista:
   - **Faltante en producción:** alertas abiertas de `inventory_alerts`. "El pedido #1024 usó 6 m² de Lona 13 oz con solo 4 m² disponibles; faltan 2 m²".
   - **Faltante previsto:** pedidos en *Pendiente de anticipo* cuya receta, sumada a la de los demás pendientes, excede el stock actual. Es un aviso anticipado para comprar antes de que el pedido entre a producción, y se calcula en el momento.
   - **Stock bajo:** insumos con `current_stock <= min_stock`.
4. El evento "Continuó a producción con faltante" (quién, cuándo, insumos y cantidades) se guarda en `order_events` y aparece en la bitácora del pedido y en la bitácora general.
5. `inventory_alerts` se publica por Supabase Realtime para que el contador se actualice sin recargar.

**Panel:**
1. **Al pasar a producción** (Kanban y detalle):
   - Si falta algún insumo, antes de confirmar aparece el modal "Insumos insuficientes" con una tabla de insumo, requerido, disponible y faltante.
   - Con `allow_negative_stock = true`: botones **"Continuar de todos modos"** y "Cancelar".
   - Con `false`: solo "Cancelar", y se explica que Configuración no permite inventario negativo.
2. **Centro de Notificaciones (nuevo):**
   - Campana en el encabezado con contador. Rojo si hay faltantes en producción, ámbar si solo hay previstos o stock bajo; siempre con número e icono, no solo color.
   - Página **Notificaciones** con pestañas Activas / Resueltas, agrupada por tipo, con enlace directo al pedido o al insumo y botón "Reabastecer".
   - "Marcar como vista" quita el aviso del contador pero no lo resuelve. Solo el reabasto lo resuelve, así el faltante no se pierde.
3. **Avisos persistentes en el pedido:** la tarjeta del Kanban y el detalle del pedido muestran el badge **"Excede insumos"** mientras su alerta siga abierta.
4. **Al crear el pedido** (`NewOrderPage`): un aviso informativo junto a cada partida que exceda el stock, por ejemplo "Lona 13 oz: alcanza para 4 m², se piden 6 m²". No bloquea el guardado.
5. **En Insumos:** badges "Stock bajo" y "Sin stock" con icono, y el filtro "Solo con stock bajo".

**Mensajes:** siempre con cantidades y unidades reales, nunca solo "stock insuficiente".

**Pruebas:**
- La RPC calcula igual que el congelamiento: mismo pedido, mismo resultado.
- Continuar con faltante crea la alerta y el evento en la bitácora. Un reabasto suficiente la resuelve sola.
- Un reabasto parcial deja la alerta abierta.
- Faltante previsto: dos pedidos pendientes que juntos exceden el stock aparecen los dos.
- El modal aparece solo con faltante.
- Con `allow_negative_stock = false` no hay opción de continuar.
- El aviso de nuevo pedido no bloquea el guardado.

---

## Fase 4: Crear cuentas desde Usuarios (C7)

**Estado actual:** las cuentas se crean a mano en el dashboard de Supabase. Después hay que activar el perfil, que se crea inactivo. Fue lo que pasó con `unpricedsteam78@gmail.com`.

**Enfoque (decisión D4, sin CLI ni Edge Functions): todo por migración SQL**, aplicada con `psql` como las anteriores.

Crear una cuenta de Auth normalmente requiere la llave `service_role`, que nunca puede ir en el panel. La alternativa sin servidor extra es una función de PostgreSQL `SECURITY DEFINER`, que se ejecuta con permisos del dueño de la base pero solo si quien la llama es ADMIN.

**Migración `20261013000001_alta_usuarios_panel.sql`:**
1. `admin_create_user(p_email, p_full_name, p_role, p_password)`:
   - Verifica en la base que quien llama sea **ADMIN activo** (`private.assert_admin()`); si no, `PF_FORBIDDEN`.
   - Valida: correo con formato válido y no registrado, nombre no vacío, contraseña de 8 caracteres o más.
   - Inserta en `auth.users` con la contraseña cifrada con bcrypt (`crypt(p_password, gen_salt('bf'))`, el mismo formato que usa Supabase Auth) y el correo ya confirmado.
   - Inserta su registro en `auth.identities` (proveedor `email`); sin él, el login no funciona.
   - Llena con texto vacío las columnas de tokens que Supabase Auth no acepta en nulo.
   - Crea o actualiza `profiles` con el rol, `is_active = true` y el nombre real.
   - Registra el alta en la bitácora general (quién creó a quién; **nunca** la contraseña).
2. `admin_reset_password(p_user_id, p_password)`: mismas verificaciones; actualiza la contraseña cifrada.
3. Permisos: `EXECUTE` solo para `authenticated`; la verificación de ADMIN va dentro de la función.

**Riesgo y cómo se controla:** escribir directo en el esquema `auth` no es la vía oficial, y una actualización de Supabase podría cambiar esas tablas. Para detectarlo:
- Una prueba de punta a punta: crear un instalador de prueba con la función, iniciar sesión con él en la app real y luego desactivarlo.
- Esa prueba se repite si Supabase anuncia cambios en Auth.

Si algún día se adopta la CLI, la función se puede reemplazar por una Edge Function sin cambiar la pantalla del panel.

**Panel (pestaña Usuarios):**
- Botón **"Nuevo usuario"** con un formulario: nombre completo, correo, rol (Instalador por defecto), contraseña temporal con generador y opción de mostrarla.
- Al terminar, una tarjeta con correo y contraseña para copiar, y la advertencia "No se volverá a mostrar".
- Acción **"Restablecer contraseña"** por usuario, con `admin_reset_password`. Es útil cuando un instalador olvida la suya.
- Se mantiene la regla actual: un administrador no puede editarse ni desactivarse a sí mismo.

**Pruebas:**
- Un instalador que llama a la función recibe `PF_FORBIDDEN`.
- Un admin crea un instalador que puede entrar a la app en el primer intento.
- Un correo duplicado da un mensaje claro.
- La contraseña no aparece en logs ni en la bitácora.

---

## Verificación al cierre de cada fase

1. `tsc`, pruebas (`vitest`) y `build` limpios.
2. Revisión visual en claro y oscuro, a 360 / 768 / 1280 px.
3. Las migraciones se aplican a Supabase y se verifican con consultas antes de subir el panel.
4. Commit en `main` y despliegue en Render. Probar en la URL publicada.

## Decisiones tomadas

| # | Decisión |
|---|---|
| D1 | Tipografía: Barlow (texto) + Anton (títulos) en panel; Barlow en la app móvil |
| D2 | El administrador define la contraseña al crear la cuenta (con generador) |
| D3 | Faltante de insumos: continuar con confirmación; aviso persistente en Notificaciones y en el pedido; registro en bitácora |
| D4 | Sin CLI: todo por migraciones SQL aplicadas con `psql`; las cuentas se crean con una función `SECURITY DEFINER` |
