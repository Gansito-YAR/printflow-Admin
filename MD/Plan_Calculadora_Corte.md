# Plan — Calculadora de corte por pliego

**Fecha:** 17/10/2026 · **Estado:** en implementación

## Qué hace

Al capturar una partida de un producto **por pieza**, el usuario indica **Base**, **Altura** y **Cantidad** de la pieza a imprimir, más **Separación entre cortes** y **Orilla del pliego** (0 por defecto). Con las medidas de cada insumo por pieza de la receta (obligatorios y opcionales elegidos), el sistema calcula:

- **Piezas por pliego.** Prueba la pieza derecha, girada y combinando las dos orientaciones (franjas verticales u horizontales), y se queda con el mejor acomodo.
- **Pliegos necesarios** = ⌈cantidad ÷ piezas por pliego⌉. Si un pliego no alcanza, usa otro.
- **% utilizado y % de merma:** por pliego y del pedido completo, contando el último pliego incompleto.
- **El acomodo:** las coordenadas de cada pieza, para dibujarlo.

**Ejemplo:** pliego de 70 × 95 cm, pieza de 33.02 × 48.26 cm, 500 piezas.
- 3 piezas por pliego, 167 pliegos.
- 71.89 % utilizado por pliego.
- 71.75 % utilizado en el pedido completo (28.25 % de merma).

## Decisiones (Isaías, 17/10/2026)

1. **Varios materiales elegidos:** el corte se calcula en **cada** material con la misma cantidad, y cada uno descuenta sus pliegos. El usuario decide cómo los combina.
2. **Separación y orilla:** se piden en cada partida, en cm, con 0 por defecto.
3. **Precio:** en productos por pieza, precio por pieza × cantidad. **En productos por m²** (17/10/2026, migración 0026) se usa el mismo flujo (cantidad, base, altura, separación, margen y material) y se cobra cantidad × (base × altura en m²) × precio por m². Ancho y alto en metros pasan a 4 decimales.
4. **Alcance:** insumos **por pieza** con base y altura. Los insumos por m² o en rollo se integran después.

## Base de datos (migración 0025)

- **`order_items`:** `cut_width_cm`, `cut_height_cm`, `cut_gap_cm` y `cut_margin_cm`. Son opcionales y no aplican a productos por m².
- **`order_item_materials`:** `pieces_per_sheet`, `sheets_required`, `used_pct` (del pedido completo) y `layout` (el acomodo en jsonb).
- **`private.cut_layout(pliego, pieza, separación, orilla)`:** devuelve el mejor acomodo.
- **`private.cut_plan_line(...)`:** devuelve el plan por material de una partida.
- **`public.plan_cuts(items)`:** vista previa en vivo para el panel; solo ADMIN.
- **`price_items`** valida:
  - Base y altura obligatorias si algún material de la partida es cortable.
  - Que la pieza quepa en cada pliego.
  - Cantidad entera.
  - Agrega "(33.02 × 48.26 cm)" a la descripción de la partida.
- **`create_order`:** guarda las medidas en la partida y el plan de cada material.
- **Producción (`freeze_order_costs`):** descuenta los **pliegos calculados** de cada material, costea pliegos × costo del pliego y registra la merma en `order_item_costs`.

## Panel

- **Nueva partida (producto por pieza):** Cantidad; si hay materiales cortables, también Base (cm), Altura (cm), Separación (cm) y Orilla (cm).
- **Vista previa en vivo por material:** "Estireno 70 × 95 cm · 3 por pliego · 167 pliegos · 71.75 % utilizado · 28.25 % merma", con el dibujo del acomodo de un pliego.

## Pendiente para después

- Insumos por m² y en rollo (vinil, lona).
- Que el pronóstico de faltantes (pedidos pendientes) cuente los pliegos planeados.
- Mostrar el plan de corte en el detalle del pedido y en la remisión.
