# **Documento de Visión, Alcance y Requerimientos de Negocio (BRD)** 

## **1. Ficha Técnica y Control del Documento** 

|**Campo**|**Detalle**|
|---|---|
|**Nombre del Proyecto**|**PrintFlow AI**- Sistema Integrado de Punto<br>de Venta, Gestión de Costos y Chatbot<br>Automatizado para Imprenta|
|**Cliente / Organización**|Imprenta Escalante|
|**Preparado por**|**Andri**(Rol: Analista de Negocio / Enlace)|
|**Fecha de Creación**|20 de Julio de 2026|
|**Versión Actual**|v1.2|
|**Estado**|Borrador con Ajustes de Estructura<br>Operativa y Financiera|



### **Historial de Revisiones** 

|**Versión**|**Fecha**|**Autor**|**Descripción del**<br>**Cambio**|
|---|---|---|---|
|v1.0|20/07/2026|Andri|Redacción inicial<br>del alcance,<br>requerimientos y<br>reglas de costeo<br>para la imprenta.|
|v1.1|20/07/2026|Andri|Incorporación del<br>cuello de botella<br>operativo del<br>Dueño (Saturación<br>de funciones) y<br>dimensionamiento<br>del equipo de|



||||campo (2<br>instaladores).|
|---|---|---|---|
|v1.2|20/07/2026|Andri|Adición de políticas<br>de control de<br>anticipos (abonos),<br>fechas de entrega<br>pactadas y<br>validación estricta<br>de saldo cero antes<br>de la entrega.|



## **2. Antecedentes y Contexto Operativo** 

### **Descripción del Negocio** 

El cliente opera una **imprenta y centro de diseño publicitario** que ofrece servicios de impresión en formato ancho (lonas, viniles), papelería comercial (tarjetas de presentación, flyers, folletos) y artículos promocionales. Su modelo de negocio atiende tanto a clientes finales (compras pequeñas al menudeo) como a intermediarios, agencias y revendedores (compras de alto volumen al mayoreo). 

La estructura del negocio es sumamente esbelta y altamente centralizada: **el dueño es quien absorbe la totalidad de la gestión comercial, administrativa, de compras y de diseño estructural** , mientras que cuenta con el apoyo exclusivo de **dos (2) trabajadores operativos** , cuyo rol principal está enfocado en salir del taller para realizar instalaciones físicas (colocación de espectaculares, rotulación de vehículos, montajes de lonas). 

### **Proceso Actual (El Status Quo)** 

Hoy en día, la operación se gestiona de manera mayoritariamente manual o semi-digitalizada: 

1. **Captación de Pedidos y Cotización:** Los clientes envían sus requerimientos por WhatsApp. Dado que el dueño está físicamente operando las máquinas, diseñando o atendiendo a clientes presenciales en el mostrador, los mensajes de WhatsApp quedan sin responder durante horas. Las cotizaciones se calculan manualmente "al ojo" en momentos de respiro o usando hojas de cálculo de Excel aisladas. 

2. **Abonos y Compromisos de Entrega:** Muchos pedidos de gran formato o volumen se 



procesan con un anticipo inicial (usualmente del ) y el resto al entregar. El registro de estos abonos se anota en una libreta o en la misma nota física de remisión. La "fecha pactada de entrega" se define de palabra y se escribe en una esquina del papel, sin un sistema de alertas que recuerde los compromisos adquiridos. 

3. **Producción e Instalación:** Una vez aceptada la cotización (cuando se logra concretar), el 

dueño anota las órdenes de trabajo en libretas físicas o notas de papel. Si el trabajo requiere instalación, los dos ayudantes salen del taller a realizarla. Durante ese lapso, el dueño se queda completamente solo a cargo de la producción física y la atención al cliente. 

4. **Entrega y Liquidación:** El cliente recoge su pedido o se le instala en campo. Debido a la prisa, la falta de comunicación o la ausencia del dueño durante las instalaciones, es común que se entreguen pedidos terminados a clientes que aún tienen saldos pendientes, con la promesa de "luego te transfiero", lo que genera una cartera vencida difícil de cobrar. 

5. **Finanzas:** Los gastos (compras de rollos de lona, tintas, consumibles de instalación) y las ganancias se calculan al final del mes sumando notas físicas, lo que genera un desfase crítico y un nulo control sobre la rentabilidad real de los trabajos. 

## **3. Planteamiento del Problema** 

### **La Problemática Central** 

El negocio sufre de **cuatro grandes cuellos de botella** derivados de su estructura centralizada: 

1. **Fuga Crítica de Ventas por Tiempos de Respuesta Lentos:** Al no contar con un vendedor dedicado y estar el dueño saturado con la operación de las máquinas y el diseño de archivos, los mensajes de clientes interesados en WhatsApp tardan entre 1 y 4 horas en responderse. En el sector de la impresión rápida, un cliente que no recibe respuesta en los primeros 10 minutos busca otro proveedor local. 

2. **Falta de Trazabilidad en Anticipos y Liquidaciones (Cartera Vencida):** Al no haber un validador estricto, se despachan productos en mostrador o se realizan instalaciones en 



campo sin que el pedido esté liquidado al . Esto ocurre por la saturación del dueño, quien olvida verificar si el cliente ya transfirió el saldo restante antes de autorizar la salida del material. 

3. **Incumplimiento de Fechas Pactadas:** Sin una agenda digital centralizada que ordene los trabajos por fecha límite de entrega, la prioridad de producción se decide de forma intuitiva ("el que grite más fuerte"). Esto provoca retrasos en trabajos de clientes clave y fricciones comerciales. 

4. **Saturación y "Efecto Bombero" del Dueño:** El dueño actúa como administrador, cajero, diseñador, operador de maquinaria y supervisor de instalaciones. Al no tener una plataforma automatizada que gestione las consultas repetitivas de cotización básica, no puede enfocarse en actividades de alto valor o supervisión de proyectos grandes. 

5. **Falta de Trazabilidad en Mermas e Insumos de Taller:** Sin herramientas de control, la lona sobrante, los cabezales de vinil mal cortados y el desperdicio de tinta solvente no se registran. Los instaladores consumen materiales en campo sin un inventario de salida claro, reduciendo el margen de ganancia real sin que el dueño pueda cuantificar la fuga. 

### **Impacto en el Negocio** 





- **Pérdida Económica Directa:** Se estima que entre un y un de las ventas anuales se quedan en el limbo de "cuentas por cobrar" no liquidadas tras la entrega del producto. 





   - Adicionalmente, se pierde entre un y un de las cotizaciones por WhatsApp por tardanza en responder. 

- **Pérdida de Clientes por Incumplimiento:** Clientes corporativos o agencias de publicidad no recontratan los servicios debido a retrasos de entre 24 y 48 horas en las fechas comprometidas de entrega. 

## **4. Objetivos del Proyecto y Criterios de Éxito** 

### **Objetivos SMART** 



- **Objetivo 1 (Cero Fuga por Cobro):** Garantizar que el de los pedidos entregados estén liquidados en su totalidad al momento del despacho, reduciendo a cero las entregas con saldo pendiente sin autorización expresa del administrador. 



- **Objetivo 2 (Cumplimiento de Plazos):** Lograr que el de las órdenes de trabajo se completen y estén listas para entrega en o antes de la "fecha pactada de entrega" registrada en el sistema. 



- **Objetivo 3 (Automatización de Ventas):** Delegar al menos el de las solicitudes de cotizaciones de productos estándar al Chatbot con IA de WhatsApp, reduciendo el tiempo de respuesta inicial a menos de 5 segundos. 

- **Objetivo 4 (Control de Inventarios y Mermas):** Reducir las pérdidas por merma no 



contabilizada a menos del mediante la deducción automatizada de insumos basada en fórmulas exactas de producción. 

### **Criterios de Aceptación del Cliente** 

1. **Bloqueo Estricto de Despacho:** El módulo de despacho (POS y Escáner QR) debe impedir físicamente cambiar el estado de un pedido a Entregado si el sistema detecta que el saldo pendiente es mayor a $0, mostrando una alerta visual restrictiva en pantalla. 

2. **Alertas de Agenda/Calendario:** El POS debe contar con un panel visual (tablero Kanban o lista priorizada) ordenado por la proximidad de la fecha pactada de entrega, con semaforización automática (Rojo: Vence hoy o vencido, Amarillo: Vence mañana, Verde: Tiempo suficiente). 

3. **Precisión del Chatbot:** El chatbot debe calcular la cotización exacta coincidiendo al 



- con la lista de precios oficial del sistema y pre-registrar el pedido especificando 

- que requiere un anticipo para pasar a producción. 

## **5. Alcance del Proyecto (Scope)** 

- [ WEB PÚBLICA (Landing) ] <---> [ CHATBOT IA (WhatsApp) ] 

│ 

- (Inyección de pedido) 

- [ ESCÁNER QR/BARRAS ] <---> [ PUNTO DE VENTA (POS) ] <---> [ INVENTARIO Y MERMAS ] │ (Valida Saldo $0 y Fecha) 

- 

- [ DESPACHO / ENTREGA SÓLO LIQUIDADO ] 

### **Dentro del Alcance (In-Scope)** 

- **Módulo 1: Sitio Web Público (Landing Page)** 

   - Catálogo visual de servicios e inicio de flujo conversacional hacia WhatsApp. 

- **Módulo 2: Chatbot con Inteligencia Artificial (WhatsApp/Web)** 

   - Interpretación de pedidos y cotizaciones automáticas. 



   - Notificación al cliente indicando el monto total, el anticipo mínimo requerido ( por defecto) y la solicitud de adjuntar el comprobante de pago para procesar la orden. 

- **Módulo 3: Punto de Venta (POS), Finanzas y Gestión de Órdenes** 

   - Panel de control con listado de pedidos ordenados por **Fecha Pactada de Entrega** . 

   - **Gestión de Abonos:** Registro secuencial de pagos recibidos para una sola orden (ej. Pago 1: Anticipo, Pago 2: Liquidación). 

   - **Generador de Notas de Venta en PDF:** Documento dinámico que muestra el costo total, el desglose de abonos realizados, el saldo restante y la fecha/hora pactada de entrega de forma prominente, acompañado del código QR. 

   - **Controlador de Entrega por Escáner:** Al escanear el QR, el sistema verifica que el saldo pendiente sea exactamente $0. Si hay saldo pendiente, la pantalla se bloquea en rojo, detalla la deuda y solicita registrar el abono liquidador antes de permitir la entrega. 

- **Módulo 4: Costos, Inventario Multicapa y Mermas** 

   - Asociación de recetas por producto y cálculo automatizado de utilidades netas reales. 

### **Fuera del Alcance (Out-of-Scope)** 

- Integración con terminales de pago con tarjeta físicas (mopos/datáfonos) en esta fase. El cajero registrará manualmente si el abono se hizo con tarjeta, efectivo o transferencia. 

- ● Facturación electrónica (timbrado fiscal). 

## **6. Actores y Perfiles de Usuario** 

#### 1. **Administrador / Dueño del Negocio (El Operador Principal)** 

- _Nivel Tecnológico:_ Medio. 

- _Permisos:_ Acceso total. Es el único perfil facultado para autorizar la entrega excepcional de un pedido que tenga saldo pendiente mediante una clave de 

supervisor en el POS. 

#### 2. **Auxiliares de Instalación e Impresión (Los 2 Trabajadores)** 

   - _Nivel Tecnológico:_ Bajo. 

   - _Permisos:_ Visualizar cola de producción de acuerdo a fechas de vencimiento. Escaneo de QR para validación de entrega. No pueden despachar un pedido con adeudo pendiente a menos que el sistema registre la liquidación. 

3. **Cliente Final (A través de WhatsApp)** 

   - _Nivel Tecnológico:_ Variable. 

   - _Permisos:_ Solicitar cotizaciones, consultar el estado de su orden, ver su saldo pendiente y enviar comprobantes de abonos. 

## **7. Requerimientos Funcionales de Alto Nivel y Reglas de Negocio** 

### **Reglas de Negocio Estrictas** 

#### 1. **Clasificación de Tarifas (Mayoreo vs. Menudeo):** 

- Transición automática a precio de mayoreo al superar el umbral volumétrico o por asignación de etiqueta manual en el perfil del cliente. 

#### 2. **Política de Anticipos para Producción:** 

- Ningún pedido personalizado del bot o mostrador puede cambiar al estado En Cola 



de Producción si no cuenta con al menos un abono registrado equivalente al del valor total de la orden, o una autorización manual firmada por el Administrador. 

#### 3. **Cálculo de Saldos y Restricción de Entrega (Regla de Oro):** 

El saldo pendiente ( ) de un pedido se define mediante la ecuación: 



Donde: 

- : El precio total acordado del pedido. 



- : El monto del abono número realizado por el cliente. 



- : El número total de abonos registrados para la orden. 



#### ○ **Regla de Bloqueo de Despacho:** Si 

**Regla de Bloqueo de Despacho:** Si , el estado del pedido _no puede_ ser cambiado a Entregado y el botón de confirmación en el POS o módulo móvil estará deshabilitado. 

#### 4. **Inmutabilidad y Compromiso de Fecha Pactada:** 

- La "Fecha Pactada de Entrega" es obligatoria al registrar la orden. Una vez guardada, 

solo puede ser reprogramada por el Administrador, registrando una bitácora con la razón del cambio para análisis de calidad posterior. 

#### 5. **Lógica del Cálculo del Costo de Producción:** 



#### 6. **Lógica de Utilidad Neta:** 



### **Flujo Detallado de Trabajo (Abonos y Entrega)** 

|[Cliente]                     [Chatbot / POS]                    [Taller / Entregas]<br> │ │ │|
|---|
|├─►Envía pedido ("Lona 2x3m")<br>─┼──────────────────────────────────►│|
|│ ├─►Registra Orden como "Pendiente"│<br> │ │con Fecha Pactada de Entrega.│<br> │ │ │<br> ├─►Realiza abono (Anticipo|
|50%)┼──────────────────────────────────►│<br>|
|│ ├─►Cambia a "En Producción"│<br> │ │(Insumos descontados en POS)│<br> │ │ │<br> │ │[Proceso de Impresión]│<br>│├──────────────────────────────────►│|
|<br> │ │Cambia a "Listo para Entrega"│<br> │ │ │<br> ├─►Acude a recoger pedido<br>─────┼──────────────────────────────────►│<br> │ │ ├─►Escanea QR del PDF<br> │ │◄─Retorna: "Bloqueado. Saldo > 0"┤<br> │ │ │<br> ├─►Liquida el saldo (Abono 2)─┼──────────────────────────────────►│<br>|
|│ ├─►Registra Pago. Saldo = $0│<br> │ │ ├─►Escanea QR de nuevo<br> │ │◄─Retorna: "Aprobado. Despachar"─┤|
|│ │ ├─►Entrega producto<br>|
|│ │ └─►Cambia a "Entregado"|



## **8. Requerimientos No Funcionales (Expectativas)** 

### **Entorno de Uso** 

- **PWA Multiplataforma:** Interfaz responsiva para que los auxiliares puedan escanear códigos QR y verificar estados de pago desde sus teléfonos celulares en campo durante las entregas/instalaciones. 

### **Rendimiento y Disponibilidad** 

- **Consistencia de Caja:** Las operaciones de abonos deben reflejarse en tiempo real en la base de datos para evitar que un cliente simule un pago en mostrador y el sistema no lo tenga registrado en el módulo de despacho del auxiliar. 

### **Seguridad** 

- **Bitácora de Eventos (Audit Trail):** El sistema debe registrar un historial de todos los abonos aplicados a una orden, indicando: Fecha, Hora, Monto, Método de Pago y el Usuario que procesó la transacción. 

## **9. Restricciones y Suposiciones** 

### **Restricciones** 

- El sistema de cobros no validará automáticamente transferencias SPEI o bancarias; dependerá de la verificación visual del dueño (quien valida la captura del cliente) para registrar manualmente el abono en el software. 

### **Suposiciones** 

- Los auxiliares de instalación cuentan con smartphones con cámara funcional, plan de datos móviles activo y acceso a internet para poder consultar el estatus de pago del pedido mediante el escaneo de QR en el sitio de instalación. 

## **10. Glosario de Términos (Vocabulario de la Imprenta)** 

- **Anticipo / Abono:** Pago parcial que realiza el cliente para iniciar la producción de un trabajo personalizado o para reducir el saldo total de su cuenta. 

- **Fecha Pactada de Entrega:** Límite de tiempo acordado de forma estricta con el cliente para que el producto esté completamente terminado y disponible para su retiro o instalación. 



- **Saldo Pendiente ( ):** Monto restante que el cliente debe liquidar antes de que se le permita retirar o recibir físicamente el trabajo terminado. 

- **Nota de Remisión:** Documento comercial en PDF que funge como comprobante de pedido, donde se detallan las características físicas del trabajo, la bitácora de abonos y el saldo pendiente de liquidar. 

