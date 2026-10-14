# Plan de Implementación — Módulo 4: Costos, Inventario Multicapa y Mermas

| Campo | Detalle |
|---|---|
| Proyecto | **PrintFlow AI** — Imprenta Escalante |
| Alcance | Módulo 4 del BRD completo: insumos, recetas por producto, mermas, inventario, costo de producción y utilidad neta |
| Responsable | **Isaías** (BD y Panel) |
| Base | Continúa `Plan_Implementacion_BD_Panel_App.md`. Mismas reglas: lógica en PostgreSQL, escrituras por RPC, dinero como texto |
| Plazo | Lo define Isaías |
| Fuentes | BRD v1.2 §4 (Módulo 4), §5 (problema 5: mermas), §7 (fórmulas §5 y §6, extraídas del PDF original) · SRS Fase 1 §1.5 (tablas) y §6 (Test de Merma) · SRS Fase 6 (NDA: márgenes confidenciales) |

> **Regla de oro del módulo.** El costo y la utilidad se calculan **solo en PostgreSQL**, con aritmética `numeric` exacta. El panel muestra lo que calcula la base. Un costo, una vez congelado en un pedido, **no cambia** aunque después cambie el precio de un insumo.

---

## 0. Fórmulas del BRD (fuente: PDF original, §5 y §6)

En el MD convertido estas secciones salieron vacías porque eran imágenes. Se extrajeron del PDF:

**Costo de producción (BRD §5)**

$$C_p = \sum_{i=1}^{n} \big(C_{insumo\_i} \cdot Q_{insumo\_i} \cdot (1 + M_i)\big) + C_{fijo}$$

**Utilidad neta (BRD §6)**

$$U = P_{venta} - (C_p + C_{extra})$$

**Mapeo al esquema**

| Variable | Significado | Dónde vive |
|---|---|---|
| $C_{insumo\_i}$ | Costo unitario del insumo *i* | `raw_materials.unit_cost` (costo promedio, ver M4-D-04) |
| $Q_{insumo\_i}$ | Cantidad del insumo por **unidad facturable** del producto | `recipes.quantity_required` |
| $M_i$ | Merma histórica del insumo en ese producto | `recipes.waste_margin_pct / 100` |
| $C_{fijo}$ | Costo fijo por unidad facturable (mano de obra, energía, desgaste) | `products.fixed_cost` **(nuevo)** |
| $P_{venta}$ | Precio de venta | `order_items.line_total` / `orders.total_price` (ya existe) |
| $C_{extra}$ | Gastos propios del pedido (viáticos, diseño, material extraordinario) | `order_extra_costs` **(nuevo)** |

**Aplicado a una partida** con cantidad facturable $q$ (piezas o m²):

$$C_{p,partida} = q \cdot \Big(\sum_i C_{insumo\_i} \cdot Q_{insumo\_i} \cdot (1 + M_i) + C_{fijo}\Big)$$

$$U_{pedido} = \sum P_{venta,partida} - \Big(\sum C_{p,partida} + \sum C_{extra}\Big)$$

**Verificación con el Test de Merma del SRS:** lona de $10/m², 1 m² por m², merma 10 %, sin costo fijo → $10 × 1 × 1.10 = $11.00$.

---

## 1. Decisiones

Las marcadas **(Supuesto)** son el valor por defecto propuesto; se confirman con el cliente en la UAT sin bloquear la construcción.

| ID | Decisión | Motivo |
|---|---|---|
| **M4-D-01** | Recetas **por unidad facturable**: en productos `M2`, `quantity_required` es por m² (lona 2×3 = 6 × Q). En `UNIT`, por pieza | Coherente con `billable_qty` que ya calcula `quote_order` |
| **M4-D-02** | $C_{fijo}$ es **por producto y por unidad facturable** (`products.fixed_cost`, default 0) **(Supuesto)** | El BRD lo suma al costo del producto, no al pedido |
| **M4-D-03** | $C_{extra}$ se captura **por pedido**, con concepto y monto. No se borra: se **anula** con motivo (queda en bitácora) **(Supuesto)** | Trazabilidad, igual que abonos |
| **M4-D-04** | Valuación del inventario por **Costo Promedio Ponderado (CPP)**: cada reabasto recalcula `unit_cost = (stock·costo + compra·costo_compra) / (stock + compra)` | Método aceptado en México; evita saltos por una sola compra cara |
| **M4-D-05** | **Congelamiento del costo** al pasar a `IN_PRODUCTION` (por anticipo u override): se guardan cantidades, costos unitarios y $C_{fijo}$ por partida en `order_item_costs` y se descuenta el inventario en la misma transacción | El BRD: "En Producción (insumos descontados)". Cambiar precios después no altera utilidades pasadas |
| **M4-D-06** | Antes de producción el costo se muestra como **estimado** (costos vigentes, sin congelar) | El admin ve el margen al cotizar |
| **M4-D-07** | **Stock negativo permitido con alerta** (`business_settings.allow_negative_stock = true`) **(Supuesto)** | El inventario físico rara vez está al día al inicio; bloquear producción por un dato desactualizado frena el taller. Con `false`, la transición falla con `PF_INSUFFICIENT_STOCK` |
| **M4-D-08** | Cancelar un pedido ya en producción **no reintegra** insumos automáticamente. El modal de cancelar pregunta "¿Se recuperó material?" y, si sí, registra `PRODUCTION_RETURN` por insumo | El material casi siempre ya se cortó/imprimió |
| **M4-D-09** | Movimientos de inventario **append-only** (`inventory_transactions`). `current_stock` lo mantiene un trigger; nadie lo edita directo. Correcciones = movimiento `ADJUSTMENT` con motivo | Kardex auditable, mismo patrón que `payments` |
| **M4-D-10** | Merma real **adicional** (lona mal cortada, tinta desperdiciada) se registra como `WASTE`, opcionalmente ligada a un pedido. El reporte compara merma real vs. `waste_margin_pct` | BRD problema 5: "falta de trazabilidad en mermas" |
| **M4-D-11** | Precisión: cantidades y costos unitarios `numeric(12,4)`; montos resultantes por partida redondeados a 2 decimales (half-up, `round()` de PostgreSQL) **una sola vez**, al congelar | Evita acumulación de redondeos |
| **M4-D-12** | **Confidencialidad** (NDA, SRS Fase 6): costos, recetas, inventario y utilidad solo para ADMIN. El INSTALLER no tiene acceso. `active_price_list` (n8n) **no** incluye `fixed_cost` ni costos | Los márgenes no deben llegar al chatbot ni a terceros |
| **M4-D-13** | Producto activo **sin receta**: $C_p = C_{fijo}$ y el reporte lo marca "costo incompleto". Al activar un producto se avisa si no tiene receta (no se bloquea) | No frenar la operación mientras se capturan recetas |
| **M4-D-14** | Utilidad se reconoce por **fecha de entrega** (`delivered_at`) en el reporte por defecto; filtro alterno por fecha de creación | Venta concretada = entregada y liquidada |
| **M4-D-15** | Utilidad se expone en $ y en % sobre venta (margen = U / P_venta) | Lo que pide el cliente: "ver su margen" |

---

## 2. Esquema (migraciones `20261009000001..`)

### 2.1 `M4-DB-01` Enums y configuración

```sql
create type public.material_unit as enum ('M2', 'ML', 'UNIT', 'LT', 'KG');
create type public.inventory_tx_type as enum
  ('RESTOCK', 'PRODUCTION_USAGE', 'PRODUCTION_RETURN', 'WASTE', 'ADJUSTMENT');

alter table public.business_settings
  add column allow_negative_stock boolean not null default true;

alter table public.products
  add column fixed_cost numeric(12,4) not null default 0 check (fixed_cost >= 0);
```

Nuevos eventos en `order_event_type`: `COSTS_FROZEN`, `EXTRA_COST_ADDED`, `EXTRA_COST_VOIDED`, `MATERIALS_RETURNED`.

### 2.2 `M4-DB-02` `raw_materials`

| Columna | Tipo | Regla |
|---|---|---|
| id | uuid PK | |
| sku | varchar(30) unique | no vacío |
| name | varchar(120) | no vacío |
| unit | material_unit | inmutable tras el primer movimiento (T0) |
| unit_cost | numeric(12,4) | `>= 0`; solo lo cambia el trigger de reabasto (CPP) o `set_material_cost` |
| current_stock | numeric(12,4) | solo lo cambia el trigger de movimientos |
| min_stock | numeric(12,4) null | alerta de stock bajo |
| is_active | boolean | soft delete |
| created_at / updated_at | timestamptz | T6 |

### 2.3 `M4-DB-03` `recipes`

| Columna | Tipo | Regla |
|---|---|---|
| product_id | uuid FK products | PK compuesta |
| raw_material_id | uuid FK raw_materials | PK compuesta |
| quantity_required | numeric(12,4) | `> 0` (por unidad facturable, M4-D-01) |
| waste_margin_pct | numeric(5,2) | `0 <= x < 100` |
| updated_at | timestamptz | |

Escritura solo por RPC `set_recipe(product_id, items jsonb)` que **reemplaza la receta completa** en una transacción (evita recetas a medio editar).

### 2.4 `M4-DB-04` `inventory_transactions` (append-only)

| Columna | Tipo | Regla |
|---|---|---|
| id | bigint identity PK | |
| raw_material_id | uuid FK | |
| type | inventory_tx_type | |
| quantity | numeric(12,4) | firmado: `RESTOCK`/`RETURN` > 0; `USAGE`/`WASTE` < 0; `ADJUSTMENT` ≠ 0 (CHECK por tipo) |
| unit_cost | numeric(12,4) | costo del movimiento (compra en RESTOCK; CPP vigente en los demás) |
| order_id | uuid FK null | obligatorio en `PRODUCTION_*` |
| line_no | int null | partida que lo originó |
| reason | text null | obligatorio en `ADJUSTMENT` y `WASTE` |
| idempotency_key | uuid unique null | reabastos y ajustes desde el panel |
| created_by | uuid FK profiles | |
| created_at | timestamptz | |

**Triggers:**
- `T7` before insert: bloquea la fila del insumo (`FOR UPDATE`), aplica CPP en `RESTOCK`, valida stock negativo según M4-D-07.
- `T8` after insert: `current_stock += quantity`.
- `T5` (ya existe) extendido: append-only.

### 2.5 `M4-DB-05` `order_item_costs` (costo congelado)

| Columna | Tipo |
|---|---|
| order_id, line_no, raw_material_id | PK compuesta; FK a `order_items(order_id, line_no)` |
| quantity_per_unit | numeric(12,4) — Q de la receta al congelar |
| waste_margin_pct | numeric(5,2) |
| unit_cost | numeric(12,4) — CPP al congelar |
| consumed_qty | numeric(12,4) — `q · Q · (1 + M)` |
| material_cost | numeric(12,2) — `round(consumed_qty · unit_cost, 2)` |

Y en `order_items`: `fixed_cost numeric(12,2) null`, `production_cost numeric(12,2) null` (Σ material + fijo), `costs_frozen_at timestamptz null`. En `orders`: `production_cost numeric(12,2) null`, `extra_cost numeric(12,2) not null default 0` (mantenido por trigger, como `balance_due`). T0 extendido: estas columnas solo cambian desde las funciones de congelamiento (`pg_trigger_depth`/flag de sesión).

### 2.6 `M4-DB-06` `order_extra_costs`

| Columna | Tipo | Regla |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK | pedido no cancelado |
| concept | varchar(120) | no vacío |
| amount | numeric(10,2) | `> 0` |
| voided_at / voided_by / void_reason | | anulación con motivo; nunca DELETE |
| idempotency_key | uuid unique | doble clic seguro |
| created_by / created_at | | |

Trigger recalcula `orders.extra_cost = Σ amount where voided_at is null`.

---

## 3. Funciones

### 3.1 Internas (`private`)

| Función | Qué hace |
|---|---|
| `M4-DB-07` `private.unit_material_cost(product_id)` | $\sum C \cdot Q \cdot (1+M)$ con costos vigentes. Base del estimado |
| `M4-DB-08` `private.freeze_order_costs(order_id)` | Por cada partida: inserta `order_item_costs`, un `PRODUCTION_USAGE` por insumo (`-consumed_qty`), fija `fixed_cost`, `production_cost`, `costs_frozen_at`; suma en `orders.production_cost`; evento `COSTS_FROZEN`. **Idempotente**: si ya está congelado, no hace nada |

`freeze_order_costs` se invoca desde **T4** al pasar `PENDING_DEPOSIT → IN_PRODUCTION` (cubre `advance_order_status` y `start_production_override` sin tocar sus RPC). El lock del pedido que ya toma T4 evita doble consumo concurrente.

### 3.2 RPC del panel (ADMIN, `SECURITY DEFINER`, dinero como texto)

| Tarea | RPC | Notas |
|---|---|---|
| M4-DB-09 | `upsert_material(id?, sku, name, unit, min_stock, is_active)` | No toca costo ni stock |
| M4-DB-10 | `restock_material(id, qty, unit_cost, idempotency_key, note)` | CPP. Devuelve stock y costo nuevos |
| M4-DB-11 | `register_waste(id, qty, reason, order_id?, idempotency_key)` | Merma real adicional |
| M4-DB-12 | `adjust_stock(id, new_stock, reason, idempotency_key)` | Conteo físico: inserta la diferencia como `ADJUSTMENT` |
| M4-DB-13 | `set_material_cost(id, unit_cost, reason)` | Corrección manual del CPP. Se registra en `material_cost_changes` (bitácora append-only: costo anterior, nuevo, motivo, usuario), no en `inventory_transactions`, porque no mueve cantidad. No afecta pedidos ya congelados |
| M4-DB-14 | `set_recipe(product_id, items jsonb)` | Reemplazo completo; valida insumos activos, Q > 0, merma en rango |
| M4-DB-15 | `simulate_product_cost(product_id, qty?)` | Devuelve costo de materiales, fijo, $C_p$, y margen a precio menudeo y mayoreo |
| M4-DB-16 | `get_order_costing(order_id)` | Estimado (si no está congelado) o congelado: desglose por partida e insumo, extras, $U$ y margen %. Campo `is_estimate` |
| M4-DB-17 | `add_extra_cost(order_id, concept, amount, idempotency_key)` / `void_extra_cost(id, reason)` | Bitácora |
| M4-DB-18 | `cancel_order` **v2**: parámetro `p_returns jsonb default null` (`[{raw_material_id, qty}]`) | Registra `PRODUCTION_RETURN` (M4-D-08). Firma vieja se reemplaza (`drop function` + `create`) |
| M4-DB-19 | `get_profit_report(p_from, p_to, p_basis 'DELIVERED'\|'CREATED', p_group 'ORDER'\|'PRODUCT'\|'CATEGORY'\|'CUSTOMER'\|'MONTH')` | Venta, $C_p$, $C_{extra}$, $U$, margen %, conteo, bandera `incomplete_cost`. Rango en la zona operativa |
| M4-DB-20 | `get_waste_report(p_from, p_to)` | Por insumo: merma teórica (Σ `consumed_qty − q·Q`) vs. merma real (`WASTE`), en cantidad y en $ |
| M4-DB-21 | Vista `low_stock_materials` (security_invoker, ADMIN) | `current_stock <= min_stock` |

**Errores nuevos:** `PF_INSUFFICIENT_STOCK`, `PF_MATERIAL_INACTIVE`, `PF_RECIPE_INVALID`, `PF_COSTS_FROZEN` (intento de editar receta congelada no aplica, pero sí anular extras de pedido entregado: permitido con motivo).

### 3.3 Seguridad `M4-DB-22`

- RLS en las 5 tablas nuevas: `select` solo `is_admin()`. Sin `insert/update/delete` para `authenticated` (todo por RPC).
- `REVOKE EXECUTE` de las RPC nuevas a `anon`; `GRANT` a `authenticated` (cada una valida `is_admin()`).
- `get_delivery_info` / `get_my_route` **no** cambian: el instalador sigue sin ver dinero ni costos.
- `active_price_list` se mantiene sin `fixed_cost`. Prueba explícita.

### 3.4 Seed `M4-DB-23`

Insumos DEMO (lona 13 oz $/m², vinil $/m², tinta solvente $/lt, papel couché $/millar, ojillos $/pza) y recetas para los 6 productos DEMO, para que el reporte tenga datos desde el primer día.

---

## 4. Pruebas de base de datos `M4-DB-24` (tests/07..10, mismo harness)

| # | Caso | Esperado |
|---|---|---|
| 07-01 | **Test de Merma (SRS)**: insumo $10, Q=1, M=10 %, fijo 0 | $C_p$ unitario = `11.0000` |
| 07-02 | Producto M2, lona 2×3, Q=1.05 m²/m², M=8 %, fijo $15/m² | $6·(C·1.05·1.08 + 15)$ exacto |
| 07-03 | Varios insumos + fijo, redondeo half-up una vez por partida | coincide con cálculo manual |
| 07-04 | Producto sin receta | $C_p = C_{fijo}$, `incomplete_cost = true` |
| 08-01 | Pasar a producción congela costos y descuenta stock | `order_item_costs` lleno, stock baja `consumed_qty`, evento `COSTS_FROZEN` |
| 08-02 | Cambiar `unit_cost` después | utilidad del pedido congelado **no cambia** |
| 08-03 | Override de producción también congela | igual que 08-01 |
| 08-04 | Doble transición / llamada repetida | un solo consumo (idempotente) |
| 08-05 | `allow_negative_stock=false` y stock insuficiente | `PF_INSUFFICIENT_STOCK`, pedido sigue en `PENDING_DEPOSIT`, sin movimientos |
| 08-06 | Concurrencia: 2 pedidos consumen el mismo insumo a la vez | stock final exacto (script tipo `concurrencia.sh`) |
| 09-01 | CPP: 10 m² a $10 + 10 m² a $14 | `unit_cost = 12.0000` |
| 09-02 | Reabasto con misma `idempotency_key` | un solo movimiento |
| 09-03 | `UPDATE`/`DELETE` en `inventory_transactions` | rechazado (append-only) |
| 09-04 | `adjust_stock` a conteo físico | movimiento = diferencia, stock = conteo |
| 09-05 | Cancelar en producción con devoluciones | `PRODUCTION_RETURN`, stock sube; sin devoluciones, stock igual |
| 10-01 | Extras: agregar, anular, `orders.extra_cost` | suma solo vigentes; $U = P − (C_p + C_{extra})$ |
| 10-02 | Reporte por fecha de entrega en zona CDMX (frontera de medianoche) | pedido de 23:30 local cae en el día correcto |
| 10-03 | INSTALLER / anon: select en tablas nuevas y RPC de costos | `PF_FORBIDDEN` / sin filas |
| 10-04 | `active_price_list` no expone `fixed_cost` | columna ausente |
| 10-05 | Reporte de merma: teórica vs real | cifras exactas |

Se ejecutan local (`run_local.sh`) y remoto (`run.sh`), sin residuo, como en la Fase 1.

---

## 5. Panel administrativo

| Tarea | Pantalla / componente | Contenido |
|---|---|---|
| **M4-ADM-01** | Navegación | Nuevas entradas: **Insumos**, **Utilidad**. Badge de stock bajo en "Insumos" |
| **M4-ADM-02** | `/insumos` lista | SKU, nombre, unidad, stock (rojo si ≤ mínimo o negativo), CPP, valor del inventario (lo calcula la base). Filtro activos/stock bajo |
| **M4-ADM-03** | Acciones por insumo | Modales: **Reabastecer** (cantidad, costo de compra; muestra CPP resultante devuelto por la RPC), **Registrar merma** (cantidad, motivo, pedido opcional), **Conteo físico**, **Editar**. Guarda síncrona + `idempotency_key` como `PaymentModal` |
| **M4-ADM-04** | `/insumos/:id` kardex | Movimientos con tipo, cantidad, costo, pedido (link), usuario, motivo |
| **M4-ADM-05** | Recetas en `ProductForm` | Pestaña "Costo": `fixed_cost`, editor de receta (insumo, Q por unidad facturable con etiqueta "por m²"/"por pieza", merma %). Panel lateral con `simulate_product_cost`: costo unitario, margen a menudeo y a mayoreo (en rojo si negativo) |
| **M4-ADM-06** | Nuevo pedido | Bajo el resumen: "Costo estimado / Utilidad estimada / Margen" (vía `get_order_costing` sobre la cotización: se agrega `p_items` a una variante `estimate_costing(customer_id, items)`) — **solo visible para ADMIN, plegado por defecto** (el panel puede estar a la vista del cliente en mostrador) |
| **M4-ADM-07** | Detalle de pedido: sección **Costos y utilidad** | Etiqueta "Estimado" o "Congelado el …"; desglose por partida e insumo; lista de extras con **+ Gasto extra** y **Anular** (motivo); total $U$ y margen %. Plegada por defecto (mismo motivo de privacidad) |
| **M4-ADM-08** | Cancelar pedido (AdvancedActions) | Si estaba en producción: paso extra "¿Se recuperó material?" con los insumos consumidos y cantidad a reintegrar |
| **M4-ADM-09** | `/utilidad` reporte | Rango de fechas (presets: este mes, mes anterior, año), base (entrega/creación), agrupación. Tarjetas: Venta, Costo de producción, Gastos extra, **Utilidad neta**, **Margen %**. Tabla ordenable; filas con costo incompleto marcadas. Exportar CSV (los números tal cual vienen de la base) |
| **M4-ADM-10** | `/utilidad` pestaña Mermas | `get_waste_report`: teórica vs real por insumo, en cantidad y $ |
| **M4-ADM-11** | Kanban | Ícono de alerta en el encabezado si hay insumos bajo mínimo (sin datos de costo en tarjetas) |
| **M4-ADM-12** | Pruebas | Formulario de receta (validación Q y merma), modal de reabasto (doble clic → 1 llamada, misma clave en reintento), mapeo de errores nuevos, formateo de margen |

Gráficas: barras simples de utilidad por mes con SVG propio (sin librería nueva) en M4-ADM-09.

---

## 6. Orden de ejecución

1. **M4-DB-01..06** esquema → **M4-DB-07..08** congelamiento + T4 → pruebas 07 y 08.
2. **M4-DB-09..14** inventario y recetas → pruebas 09.
3. **M4-DB-15..21** costeo, extras, reportes → pruebas 10. **M4-DB-22** seguridad, **M4-DB-23** seed.
4. Aplicar en remoto, correr 157 + nuevas pruebas, verificar 0 tablas sin RLS y 0 funciones ejecutables por anon.
5. **M4-ADM-01..05** (insumos y recetas) → captura real de recetas por el cliente puede empezar aquí.
6. **M4-ADM-06..11** (costos en pedidos y reportes) → **M4-ADM-12** pruebas, typecheck, build.
7. Actualizar `Documento de Visión… .md` §5 y §6 con las fórmulas y README de ambos repos.

---

## 7. Flujo de aceptación (UAT)

1. Crear insumo "Lona 13 oz" en m², reabastecer 50 m² a $10 y 50 m² a $14 → CPP $12.00, stock 100.
2. Receta de "Lona impresa": 1.05 m² de lona por m², merma 8 %; tinta 0.012 lt/m², merma 5 %; costo fijo $15/m². El simulador muestra costo unitario y margen a menudeo/mayoreo.
3. Pedido de lona 2×3 → el resumen muestra utilidad **estimada**.
4. Abono del 50 % → pasar a producción → sección de costos dice "Congelado", el stock de lona baja 6 × 1.05 × 1.08 = 6.804 m².
5. Reabastecer lona a $20 → la utilidad del pedido **no cambia**.
6. Agregar gasto extra "Viáticos instalación $150" → la utilidad baja exactamente $150.
7. Registrar merma real de 0.5 m² ligada al pedido → aparece en el reporte de mermas.
8. Liquidar, escanear y entregar → el pedido aparece en `/utilidad` del día, con $U$ y margen correctos; CSV coincide con la pantalla.
9. Instalador: la PWA sigue sin mostrar ningún dato de costos.

---

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| Recetas sin capturar → utilidades infladas | Bandera "costo incompleto" en reportes y aviso al activar productos (M4-D-13). Seed de ejemplo como guía |
| Inventario inicial desconocido | Conteo físico (`adjust_stock`) como primer paso de la puesta en marcha; stock negativo permitido con alerta |
| Margen visible para el cliente en mostrador | Secciones de costo plegadas por defecto (M4-ADM-06/07) |
| Cambio de `cancel_order` rompe el panel actual | La firma nueva tiene `p_returns` con default; se actualiza `rpc.ts` en el mismo PR |
| $C_{fijo}$ / $C_{extra}$ interpretados distinto por el cliente | Son supuestos documentados (M4-D-02/03); el esquema permite moverlos sin migrar datos de pedidos ya congelados |
| Unidades mezcladas (lt vs ml, millar vs pieza) | Unidad fija por insumo, inmutable tras el primer movimiento; la etiqueta de unidad se muestra en cada captura de Q |

---

## 9. Pendiente de confirmar con el cliente (no bloquea)

1. M4-D-02: ¿qué incluye su costo fijo y si es por unidad facturable?
2. M4-D-03: ejemplos reales de gastos extra.
3. M4-D-07: ¿permitir producir con stock negativo?
4. M4-D-08: ¿cuándo se recupera material al cancelar?
5. M4-D-14: ¿la utilidad la quiere ver por fecha de entrega o de venta?
