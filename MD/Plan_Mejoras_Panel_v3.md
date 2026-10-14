# Plan de implementación: mejoras del cliente al panel (v3)

| Campo | Detalle |
|---|---|
| Proyecto | **PrintFlow AI**, Imprenta Escalante |
| Origen | Solicitudes del cliente tras la presentación (10/10/2026) |
| Alcance | `printflow-admin` y migraciones en `API/supabase` (aplicadas con `psql`, sin CLI) |
| Regla general | No se cambia ninguna regla de negocio: candado de entrega, saldos, anticipo, bitácora y RLS siguen igual |

## Resumen

| # | Tema | Tipo | Toca BD | Esfuerzo | Fase |
|---|---|---|---|---|---|
| K1 | Error "No tiene permiso" al cambiar la unidad de un insumo | Corrección | Sí (pequeño) | Bajo | 1 |
| K2 | Unidades y medidas: comprar en una unidad y vender en otra | Corrección **grave** | **Sí** | **Alto** | 2 |
| M1 | Recibos de pago de los abonos | Mejora | Sí (folio de recibo) | Medio | 3 |
| M2 | Excel con formato y reporte de utilidad y mermas más claro | Mejora | No | Medio | 3 |
| M3 | Eliminar insumos y productos | Mejora | Sí | Medio | 1 |

El orden pone primero lo que hoy bloquea al cliente (K1, M3), luego el cambio de fondo de unidades (K2), que afecta el costeo y el inventario, y al final las mejoras de presentación (M1, M2).

---

## K1. Error al cambiar la unidad de un insumo

**Causa encontrada:** no es un problema de permisos. La base de datos tiene una regla a propósito: **la unidad de un insumo no se puede cambiar si ya tiene movimientos** (compras, consumos, conteos). Si se cambiara de "m²" a "pieza", las existencias y el costo promedio quedarían mezclando dos unidades distintas. El panel muestra el mensaje genérico "No tiene permiso para esta operación" porque no enseña el motivo que manda la base: "La unidad no se puede cambiar: el insumo ya tiene movimientos".

**Corrección:**
1. Mostrar el motivo real del rechazo en todos los `PF_FORBIDDEN` que traen detalle útil, no solo en este caso.
2. En **Editar insumo**, si el insumo ya tiene movimientos, el selector de unidad aparece bloqueado con la explicación y un botón **"Convertir unidad…"**.
3. **Convertir unidad** (nueva RPC `convert_material_unit`): pide la equivalencia ("1 pieza = 0.70 m²") y un motivo, y en una sola operación:
   - cambia la unidad;
   - convierte existencia, stock mínimo y costo promedio con esa equivalencia;
   - convierte las cantidades de las recetas que usan ese insumo;
   - registra un movimiento de tipo "Conversión de unidad" en el historial y en la bitácora.

   El historial anterior se conserva tal cual, con su unidad original, para que las cifras pasadas sigan cuadrando.

---

## K2. Unidades y medidas (el problema grave)

### El problema, con los ejemplos del cliente

Hoy cada receta dice "este producto consume **X unidades del insumo** por cada unidad vendida", y eso solo funciona cuando el insumo y el producto se miden igual. No cubre casos reales de la imprenta:

| Caso | Se compra | Se vende | Qué hace falta saber |
|---|---|---|---|
| Pliego para minicarteles | Por pieza (pliego de 70 × 100 cm) | Por pieza (minicartel de 10 × 15 cm) | Cuántos minicarteles salen de un pliego, o el área de ambos |
| Pliego para carteles | Por pieza (pliego) | Por pieza (2 carteles por pliego) | Rendimiento: 2 por pliego |
| Rollo de lona | Por m² | Por m² | Ya funciona |
| Rollo de vinil para stickers | Por m² | Por pieza (sticker de 10 × 10 cm) | El área de cada sticker |
| Rollo de vinil para rótulos | Por m² | Por pieza a la medida que pida el cliente | Las medidas de **cada pedido** |
| Rollo de ancho fijo | Por metro lineal (rollo de 1.37 m) | Por m² | El ancho del rollo |
| Tinta, ojillos | Por litro o por pieza | Por m² o por pieza | Una cantidad fija por unidad vendida (ya funciona) |

### La solución propuesta: el sistema aprende las medidas

**1. Medidas del insumo** (en Insumos, al dar de alta o editar):

| Unidad de compra | Dato nuevo | Para qué |
|---|---|---|
| Pieza / pliego | Ancho × alto de la pieza (opcional) | Saber cuántos m² trae cada pieza |
| Metro lineal | Ancho del rollo | Convertir metros lineales a m² |
| m² | Nada | Ya es área |
| Litro, kg | Nada | No tienen área: solo cantidad fija o rendimiento |

**2. Medidas del producto** (en Productos):
- **Se vende por m²:** igual que hoy; el ancho y alto se capturan en cada pedido.
- **Se vende por pieza de medida fija** (minicartel de 10 × 15, sticker de 10 × 10): las medidas se guardan una vez en el producto.
- **Se vende por pieza a la medida** (rótulo del tamaño que pida el cliente): al capturar el pedido se pide ancho y alto de la pieza, aunque se cobre por pieza.
- **Se vende por pieza sin medida** (playera, termo): igual que hoy.

**3. Tres formas de definir cada renglón de la receta** (el administrador elige la que entiende mejor):

| Forma | Cómo se escribe | Ejemplo | Cuándo usarla |
|---|---|---|---|
| **Por área** | El sistema calcula el área del producto y la convierte a la unidad del insumo | Sticker de 10 × 10 cm en vinil por m² → 0.01 m² por sticker, más la merma | Insumos con área (m², metro lineal, pieza con medidas) |
| **Por rendimiento** | "De 1 [unidad de insumo] salen N productos" | De 1 pliego salen 20 minicarteles → 0.05 pliegos por minicartel | Es como piensa el impresor; no necesita medidas |
| **Cantidad fija** | Igual que hoy: X por unidad vendida | 4 ojillos por lona, 0.02 L de tinta por m² | Consumibles sin área |

La merma (%) se sigue sumando en las tres formas.

**4. Cómo se descuenta:** al pasar a producción, el sistema calcula el consumo de cada renglón con su forma y las medidas reales de la partida. El consumo se descuenta **en la unidad en que se compra el insumo**: si el pliego se compra por pieza, el inventario baja 1.05 pliegos, no metros cuadrados. El reporte de mermas y el costo de producción salen de ese mismo cálculo.

### Cambios técnicos

- **Migración:**
  - `raw_materials`: `width_m`, `height_m` (pieza) y `roll_width_m` (metro lineal).
  - `products`: `size_mode` (`NONE` / `FIXED` / `PER_ORDER`), `piece_width_m` y `piece_height_m`.
  - `recipes`: `consumption_mode` (`AREA` / `YIELD` / `FIXED`) y `yield_per_unit`.
  - `order_items`: se reusan `width_m` y `height_m` para piezas a la medida.
- **Funciones a reescribir con la nueva fórmula:** `line_material_breakdown` (la usan el congelamiento, la vista previa de insumos, el estimado y el simulador), `unit_material_cost` y `quote_order` (pedir medidas en piezas a la medida).
- **Compatibilidad:** las recetas actuales quedan como "cantidad fija" y calculan exactamente lo mismo que hoy. Los pedidos ya producidos no cambian, porque su costo está congelado.
- **Validaciones:** "por área" exige que el insumo tenga área y que el producto tenga medidas. Si falta algo, la receta lo dice antes de guardar: "Este insumo se compra por pieza: capture sus medidas en Insumos".

### Panel

- **Insumos:** campos de medidas según la unidad, con texto de ayuda ("Pliego de 70 × 100 cm").
- **Productos:** selector "¿Cómo se vende?": por m², por pieza de medida fija (pide medidas), por pieza a la medida o por pieza sin medida.
- **Receta y costo:** en cada renglón, la forma de consumo. Una línea en lenguaje claro dice qué entendió el sistema, por ejemplo **"De 1 pliego (0.70 m²) salen 20 minicarteles: cada uno consume 0.05 pliegos + 5 % de merma"**. El simulador de costo se actualiza en vivo.
- **Nuevo pedido:** las piezas a la medida piden ancho y alto. El aviso de insumos y el estimado usan las medidas reales.

### Pruebas

Una por cada caso de la tabla del problema: pliego a minicarteles por área y por rendimiento, vinil por m² a stickers, rótulo a la medida, rollo por metro lineal a m², y ojillos por cantidad fija. Además, que una receta antigua dé el mismo costo antes y después de la migración, y que el descuento de inventario sea exacto en la unidad de compra.

---

## M3. Eliminar insumos y productos

**Hoy** solo se pueden desactivar. Borrar uno que ya se usó rompería el historial: pedidos que dirían "producto desconocido", reportes de utilidad que no cuadrarían y movimientos de inventario sin insumo.

**Propuesta: borrado seguro**
- Botón **Eliminar** en Insumos y en Productos.
- **Si nunca se usó** (sin pedidos, sin movimientos, sin recetas), se borra de verdad, después de confirmar.
- **Si ya se usó**, el sistema explica por qué no se puede borrar ("Este producto aparece en 14 pedidos") y ofrece **Archivar**:
  - desaparece de las listas, de la captura de pedidos y de los selectores;
  - se conserva para el historial y los reportes;
  - se ve con el filtro "Archivados" y se puede restaurar.
- **Un insumo que está en recetas activas** no se puede archivar hasta quitarlo de esas recetas. El sistema dice cuáles son.
- Todo queda en la bitácora.

**Técnico:** RPC `delete_or_archive_product` y `delete_or_archive_material`, que verifican el uso en la base, borran o archivan y responden qué hicieron. Se agrega el estado "archivado" separado de "inactivo".

---

## M1. Recibos de pago de los abonos

**Qué se agrega:**
- Al registrar un abono aparece **"Descargar recibo"** en la confirmación.
- En la lista de abonos del pedido, cada pago tiene su botón **Recibo** para reimprimirlo cuando sea.
- El recibo (PDF, media carta) incluye:
  - logotipo y datos de Imprenta Escalante;
  - **folio de recibo consecutivo** (R-000123);
  - fecha y hora;
  - cliente y teléfono;
  - folio del pedido y descripción breve;
  - monto **con número y con letra** ("Mil doscientos pesos 00/100 M.N.");
  - método de pago;
  - **saldo anterior, este abono y saldo restante**;
  - quién lo cobró;
  - el QR del pedido.
- Si el abono liquida el pedido, el recibo lo dice en grande: **"PEDIDO LIQUIDADO"**.

**Técnico:**
- Columna `receipt_no` en `payments`, con su propia secuencia. A los 21 abonos que ya existen se les asigna número en orden de fecha.
- El PDF se genera en el navegador con la misma librería que la remisión.
- El folio lo asigna la base, así nunca se repite ni se salta.

**A futuro:** cuando exista el asistente de WhatsApp, el mismo recibo se podrá enviar al cliente por ahí.

---

## M2. Excel con formato y reportes más claros

**Excel con formato** (reemplaza el CSV actual):
- Archivo `.xlsx` real, con:
  - encabezado con logotipo, título y periodo ("Utilidad · 1 al 31 de octubre de 2026");
  - columnas con formato de moneda y porcentaje, anchos ajustados y encabezados en negrita con color de la marca;
  - fila de **totales**;
  - los renglones con costo incompleto, marcados en ámbar con una nota;
  - una hoja **"Cómo leer este reporte"** con las fórmulas en palabras.
- Mismo formato para Mermas y para el historial de Pedidos.
- Librería: `exceljs`, la que permite estilos.

**Utilidad y mermas más entendibles:**
- **Resumen en palabras** arriba: "En octubre vendió $7,970. Después de materiales y gastos le quedan $7,970 de utilidad (100 % de margen). 9 pedidos no tienen receta: su costo real es mayor al mostrado."
- Cada tarjeta (Venta, Costo de producción, Gastos extra, Utilidad, Margen) con un **"¿Qué es esto?"** de una línea.
- **Gráficas:** utilidad por mes (barras) y los 5 productos que más dejan.
- **Costo incompleto** explicado y con enlace directo a la receta que falta.
- **Mermas** en lenguaje claro: "Esperaba desperdiciar 2.5 m² de lona y se desperdiciaron 4.1 m² (+64 %)", con semáforo verde, ámbar y rojo según la diferencia.

---

## Orden de trabajo y verificación

| Fase | Contenido | Por qué en este orden |
|---|---|---|
| 1 | K1 (mensaje real y convertir unidad) y M3 (borrado seguro) | Destraban al cliente hoy y son de bajo riesgo |
| 2 | K2 (unidades y medidas) | Cambio de fondo en costeo e inventario: va con respaldo previo de la base y la batería completa de pruebas SQL |
| 3 | M1 (recibos) y M2 (Excel y reportes) | Presentación; no tocan reglas |

En cada fase: respaldo de la base antes de migrar, pruebas SQL (hoy 318 verificaciones) y del panel, revisión en el navegador en claro y oscuro, y después subir a `main` para Render.

## Decisiones que necesito

| # | Pregunta | Recomendación |
|---|---|---|
| D1 | Convertir unidad: ¿se permite con equivalencia (opción de K1) o se prefiere crear un insumo nuevo y archivar el viejo? | Permitir con equivalencia: es más rápido y conserva el historial |
| D2 | Las tres formas de receta (área, rendimiento, cantidad fija), ¿le quedan claras al cliente? ¿Hay algún caso que no cubran? | Validarlo con él usando 3 productos reales antes de construir |
| D3 | Piezas a la medida: ¿qué productos se venden por pieza pero con medidas que cambian en cada pedido? | Pedir la lista al cliente para configurarlos |
| D4 | Recibo: ¿media carta o ticket de 80 mm para impresora térmica? ¿Lleva RFC o datos fiscales? | Media carta en PDF; ticket si tienen impresora térmica |
| D5 | Borrado seguro: ¿de acuerdo con que lo ya usado se archive en vez de borrarse? | Sí: es la única forma de no romper reportes ni pedidos |
