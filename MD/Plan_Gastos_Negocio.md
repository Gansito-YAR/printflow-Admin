# Plan de implementación: gastos del negocio en Utilidad y mermas

| Campo | Detalle |
|---|---|
| Proyecto | **PrintFlow AI**, Imprenta Escalante |
| Origen | Solicitud del cliente (13/10/2026) |
| Alcance | `printflow-admin` y migraciones en `API/supabase` (aplicadas con `psql`, sin CLI) |
| Objetivo | Que el reporte muestre la **utilidad real del negocio**: lo que dejan los pedidos menos los gastos fijos y ocasionales (renta, sueldos, luz, internet…) |

## Por qué hace falta

Hoy **Utilidad y mermas** solo resta lo que cuesta cada pedido: materiales con merma, costo fijo y gastos extra del pedido. Los gastos que no pertenecen a ningún pedido en particular no aparecen. Por eso el reporte enseña, por ejemplo, "100 % de margen", aunque el negocio pague renta y sueldos.

Con este sistema el reporte separa:

| Concepto | De dónde sale |
|---|---|
| Utilidad de los pedidos | Lo que ya calcula hoy |
| − Gastos del negocio | **Nuevo:** gastos únicos y continuos del periodo |
| **= Utilidad del negocio** | **Nuevo:** la ganancia real |

---

## Cómo funciona para el cliente

### Registrar un gasto (botón **"+ Gasto"** en Utilidad y mermas)

**Paso 1. ¿Qué y cuánto?**
- **Concepto**: "Renta del local", "Sueldo de Juan", "Luz".
- **Monto**.
- **Categoría** (mejora propuesta): Renta, Sueldos, Servicios (luz, agua, internet), Mantenimiento, Publicidad, Impuestos u Otros. Sirve para ver en qué se va el dinero.

**Paso 2. ¿Es un gasto continuo?** Una casilla.
- **Sin marcar (gasto único)**: se registra al instante con la fecha de hoy, o con otra fecha si el cliente se olvidó de capturarlo el día que pagó. Se refleja de inmediato en la utilidad.
- **Marcada (gasto continuo)**: aparece el paso 3.

**Paso 3. ¿Cada cuánto y desde cuándo?** (solo gastos continuos)

| Frecuencia | Qué se pide | Ejemplo |
|---|---|---|
| Diario | Desde qué fecha | Comida del personal |
| Semanal | Qué día de la semana | Sueldo cada viernes |
| Quincenal | Días 15 y último de cada mes | Sueldo quincenal |
| Mensual | Qué día del mes (1 al 31) | Renta cada día 5 |
| Bimestral | Qué día, cada 2 meses | Luz (CFE) |
| Anual | Qué día y mes | Licencias, refrendo |

- **Fecha de inicio** (por defecto, hoy) y **fecha de fin opcional**, por ejemplo un préstamo que termina en diciembre.
- Si el día elegido no existe en ese mes (día 31 en febrero), se cobra el **último día del mes**.
- Antes de guardar, el sistema muestra una vista previa en palabras: **"Se cobrará $8,000 cada mes el día 5. Próximo cobro: 5 de noviembre de 2026."**

### Cuando llega la fecha de cobro

1. El sistema registra el cargo solo: queda como un gasto con su fecha, su monto y "Generado automáticamente por: Renta del local".
2. Aparece un aviso en **Notificaciones**: "Se registró el gasto «Renta del local» por $8,000 (5 de noviembre)."
3. Se refleja en **Utilidad y mermas** dentro del periodo que corresponde.

### Editar y eliminar gastos continuos

Pestaña **"Gastos"** dentro de Utilidad y mermas, con dos listas:
- **Gastos continuos**: concepto, monto, frecuencia en palabras ("Mensual, día 5"), próximo cobro y estado.
- **Historial de gastos**: todos los cargos registrados (únicos y automáticos), con filtro por fechas y categoría.

| Acción | Qué hace | Qué NO hace |
|---|---|---|
| **Editar** (subió la renta, aumento de sueldo) | Cambia monto, concepto, frecuencia o día **desde el próximo cobro** | No cambia los cargos ya registrados: la utilidad de meses pasados queda igual |
| **Pausar / Reanudar** (mejora propuesta) | Detiene los cobros temporalmente, por ejemplo vacaciones sin sueldo | No borra nada |
| **Eliminar** (terminó la renta) | Deja de cobrar desde hoy y lo quita de la lista | Los cargos ya registrados siguen en el historial y en los reportes. Igual que con insumos y productos, no se borra de la base |
| **Anular un cargo** (se registró por error) | Lo anula con motivo y deja de contar en la utilidad | Queda en la bitácora |

---

## Ajustes que propongo a la idea original

1. **"Descontar" significa registrar el gasto**, no mover dinero real. El sistema no está conectado al banco ni a una caja: lleva la cuenta de lo que se gasta para calcular la utilidad.
2. **Los gastos van en Utilidad, no en Mermas.** "Mermas" compara el desperdicio esperado de material contra el real; un gasto de renta no es merma. Ambos están en la misma pantalla, así que el cliente los ve juntos.
3. **Editar un gasto continuo no cambia el pasado.** Si la renta sube en noviembre, los meses anteriores deben seguir con la renta vieja; si no, los reportes pasados cambiarían solos.
4. **Ponerse al día solo**: si nadie abre el panel en una semana, al volver se registran todos los cargos que vencieron, cada uno con su fecha correcta y sin duplicados.
5. **Categorías y fecha de fin**, para ver en qué se gasta y para gastos con término.

---

## Diseño técnico

### Base de datos (migración `20261016000001_gastos_negocio.sql`)

1. **`expense_categories`**: las 7 categorías iniciales. Administrables como las de productos.
2. **`recurring_expenses`** (la regla del gasto continuo):
   - Concepto, monto, categoría y frecuencia (`DAILY`, `WEEKLY`, `BIWEEKLY`, `MONTHLY`, `BIMONTHLY`, `YEARLY`).
   - Día de la semana o del mes según la frecuencia.
   - `starts_on`, `ends_on` opcional, `paused`, `deleted_at` y `last_generated_on`.
3. **`business_expenses`** (cada cargo real, único o automático):
   - Fecha, concepto, monto y categoría.
   - `recurring_expense_id` cuando lo generó un gasto continuo.
   - `voided_at` y `void_reason` para anular.
   - Restricción única (`recurring_expense_id`, fecha): **un mismo cobro nunca se registra dos veces**.
   - Solo inserción y anulación: no se edita ni se borra, igual que los abonos.
4. **`generate_due_expenses()`**: crea los cargos pendientes hasta hoy, en la zona horaria del negocio. Es idempotente: correrla 10 veces da el mismo resultado. Cada cargo nuevo genera su aviso en Notificaciones.
5. **Quién la ejecuta** (doble seguro):
   - **pg_cron** todos los días a las 00:05. Está disponible en el proyecto pero no activado; se activa con una línea en la migración.
   - **Al abrir el panel** y al entrar a Utilidad o a Notificaciones también se ejecuta, por si el cron fallara algún día.
6. **RPC**: `create_expense` (único o continuo), `update_recurring_expense` (solo hacia adelante), `set_recurring_expense_paused`, `delete_recurring_expense` (oculta y deja de cobrar), `void_expense` (con motivo) y `preview_recurrence` (próximas 3 fechas, para la vista previa).
7. **`get_profit_report`**: agrega a los totales `business_expenses` y `business_profit` del periodo. Al agrupar por **Mes**, cada mes muestra sus gastos del negocio. Al agrupar por pedido, cliente o producto, los gastos no se reparten entre pedidos: van como bloque aparte en los totales.
8. **Notificaciones**: nuevo tipo "Gasto registrado", informativo, con "Marcar como visto". No pone la campana en rojo.
9. **Bitácora**: alta, edición, pausa, eliminación y anulación, con quién y cuándo.
10. **Permisos**: solo ADMIN, como todo lo confidencial.

### Panel

- **Utilidad y mermas** pasa a tener tres pestañas: **Utilidad · Gastos · Mermas**.
- **Utilidad**: nuevas tarjetas "Gastos del negocio" y "Utilidad del negocio", con el resumen en palabras: "En octubre los pedidos dejaron $45,000; después de $18,500 de gastos fijos, el negocio ganó $26,500."
- **Gastos**: botón "+ Gasto", lista de gastos continuos con Editar, Pausar y Eliminar, e historial con Anular.
- **Formulario** en el orden que pidió el cliente: concepto y monto, casilla de gasto continuo, frecuencia y día, más la vista previa en palabras.
- **Ayuda breve "?"** en cada campo, como en el resto del panel.
- El Excel exportado incluye los gastos.

### Pruebas

- Cada frecuencia genera las fechas correctas, incluidos día 31 en meses cortos, años bisiestos y quincenas.
- Ponerse al día: 10 días sin abrir el panel → exactamente los cargos vencidos, sin duplicados.
- Editar un gasto continuo cambia solo los cargos futuros.
- Eliminar o pausar detiene los cobros; el historial se conserva.
- Anular un cargo lo quita de la utilidad.
- El reporte cuadra: utilidad del negocio = utilidad de pedidos − gastos del periodo.
- Un instalador no puede ver ni registrar gastos.

---

## Decisiones que necesito

| # | Pregunta | Recomendación |
|---|---|---|
| G1 | ¿Las categorías propuestas (Renta, Sueldos, Servicios, Mantenimiento, Publicidad, Impuestos, Otros) le sirven al cliente? | Sí. Puede crear más |
| G2 | ¿La quincena se cobra los días 15 y último del mes, o cada 14 días? | Días 15 y último, como se paga en México |
| G3 | ¿Activamos pg_cron en Supabase para cobrar a medianoche aunque nadie abra el panel? | Sí. Sin él, los cargos se registran al abrir el panel, igual con su fecha correcta |
| G4 | ¿Se permite registrar gastos únicos con fecha pasada? | Sí, para cuando se olvida capturarlo el día que se pagó |
