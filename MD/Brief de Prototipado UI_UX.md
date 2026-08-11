# **Brief Detallado de Prototipado UI/UX (Basado en Arquitectura)** 

**Proyecto:** PrintFlow AI **Fase:** Diseño de Interfaces (Wireframes y Alta Fidelidad) **Herramientas recomendadas:** Figma, Penpot. 

**Objetivo:** Crear la maqueta visual exacta del sistema antes de programar, asegurando que todas las reglas de negocio y restricciones técnicas de las Fases 3 y 4 estén reflejadas gráficamente. 

## **1. Módulo Móvil: PWA de Instaladores (Basado en Fase 4)** 

**Regla General de UI:** Orientación vertical (Portrait) obligatoria. Barra superior (App Shell) con el color corporativo de la imprenta. Botones grandes y fáciles de tocar (Hitbox mínimo de 60x60px). 

### **Pantallas Requeridas (Emir diagrama, Faride estiliza):** 

1. **Pantalla de Login:** 

   - Logo de la empresa. 

   - Input de Correo y Contraseña. 

   - Botón de "Iniciar Sesión". 

2. **Vista Principal: Escáner QR:** 

   - Recuadro central simulando el visor de la cámara trasera. 

   - Texto indicativo: "Escanee el código de la remisión". 

   - **Elemento técnico:** Un botón de "Linterna" (Torch) visible para zonas oscuras. 

   - **Estado de Error:** Un diseño de modal o texto rojo que diga "Código QR no reconocido" (Para escaneos 404). 

3. **Pantalla ROJA (Candado Digital - Saldo Deudor):** 

   - **Fondo/Tema:** Rojo intenso y agresivo. 

   - **Iconografía:** Un icono gigante de "Stop" o "Bloqueado". 

   - **Datos a mostrar:** Nombre del cliente, Producto. 

   - **Texto Financiero:** "Saldo Pendiente: $XXX.XX" (En tipografía gigante y clara). 

   - **Mensaje de Sistema:** "El sistema impide la entrega. Solicite al cliente liquidar el adeudo mediante transferencia." 

   - **RESTRICCIÓN CRÍTICA DE UI:** En esta pantalla **NO DEBE EXISTIR** el botón de entregar. Solo un botón de "Regresar/Cerrar". 

4. **Pantalla VERDE (Autorización - Saldo Cero):** 

   - **Fondo/Tema:** Verde confirmación. 

   - **Iconografía:** Icono gigante de Check/Aprobado. 

   - **Datos a mostrar:** Nombre del cliente, Producto. 

   - **Texto Financiero:** "PAGO CONFIRMADO. Saldo: $0.00". 

   - **Acción:** Un botón gigante (ancho completo de la pantalla) que diga "Confirmar Entrega Física". 

5. **Vista Secundaria: Mi Ruta (Cola de Producción):** 

   - Diseño tipo lista de tarjetas (Cards). 

   - Cada tarjeta debe mostrar: Nombre del Producto (Lona 2x3m) y Dirección/Cliente. 

   - **Semaforización Técnica:** Un indicador visual (borde, etiqueta o punto de color) basado en la fecha de entrega: Rojo (Hoy/Atrasado), Amarillo (Mañana), Verde (Futuro). 

   - **RESTRICCIÓN CRÍTICA DE UI:** Cero precios. No poner signos de pesos en esta vista por confidencialidad (RLS). 

6. **Componentes Globales Móviles (Pop-ups):** 

   - _Toast de Actualización:_ Un banner flotante inferior negro que diga "Actualización crítica requerida. Presione aquí para reiniciar". 

   - _Error Boundary:_ Pantalla en blanco con icono de error que diga "Ocurrió un error. Reinicie la aplicación e informe a Sistemas" con un botón de recargar. 

   - _Estado Offline:_ Un banner superior rojo que diga "Sin conexión a Internet". 

## **2. Módulo Web: Panel Administrativo POS (Basado en Fase** 

## **3)** 

**Regla General de UI:** Layout de escritorio clásico. Menú lateral (Sidebar) oscuro para navegación, Cabecera (Header) con datos del usuario activo, y un Área de Contenido (Content) amplia. Tipografía monoespaciada o muy legible para los números financieros. 

### **Pantallas Requeridas :** 

1. **Dashboard Principal (Tablero Kanban Real-time):** 

   - Área de trabajo dividida en columnas por estado (Ej. Pendiente, En Producción, Listo). 

   - **Tarjetas de Pedido (Cards):** Deben incluir Nombre, Producto y Saldo. 

   - **Semaforización (Obligatoria):** Aplicar estilos visuales a los bordes de la tarjeta: 

      - _Borde Rojo:_ Fecha de entrega en el pasado o es HOY. 

      - _Borde Amarillo:_ Fecha de entrega es MAÑANA. 

      - _Borde Verde:_ Fecha de entrega es en el FUTURO (pasado mañana en adelante). 

2. **Modal de Cobro (El Punto de Venta):** 

   - Al hacer clic en una tarjeta, se abre este popup centrado. 

   - **Visualización:** Mostrar el nombre del cliente y el Saldo Actual grande. 

   - **Inputs requeridos:** 

      1. Monto a abonar (Input numérico). 

      2. Método de pago (Select dropdown: Efectivo, Transferencia, Tarjeta). 

   - **Botón de Acción y Estado de Carga:** Diseñar dos estados para el botón "Registrar Abono". 

      - _Estado 1 (Normal):_ Azul/Verde sólido. 

      - _Estado 2 (Cargando/Anti-doble clic):_ Botón desactivado (gris o con opacidad), texto cambia a "Procesando..." y muestra un icono de _spinner_ circular. 

3. **Panel de Excepciones (Modo Supervisor):** 

   - Una pestaña o modal protegido, visualmente diferenciado (quizá con tonos naranjas o iconos de candado). 

   - **Botón 1:** "Forzar Entrega (Cliente con Crédito)". 

   - **Acción 2:** Input de fecha/hora (Datetime) para modificar fecha pactada + un <textarea> obligatorio que diga "Razón del Cambio" + Botón Guardar. 

   - **Botón 3:** "Iniciar Producción sin 50%". 

4. **Diseño de la Nota de Remisión (Plantilla PDF):** 

   - Esto debe diseñarse en formato Carta (A4/Letter) para exportación a PDF. 

   - _Cabecera:_ Logo de la imprenta (Izquierda), "FECHA PACTADA DE ENTREGA: [Fecha]" (Centro, texto muy grande y visible). 

   - _Cuerpo:_ Tabla con columnas (Cant., Descripción, P. Unitario, Importe). 

   - _Pie Financiero:_ Subtotal, Anticipos y "SALDO PENDIENTE: $ZZZ" (Obligatorio en Rojo y Negritas). 

- _Esquina Inferior Derecha:_ Un cuadro reservado (placeholder) para renderizar el Código QR. 

- 5. **Componentes Globales Web:** 

   - _Toasts (Notificaciones):_ Diseñar alertas pequeñas en la esquina superior derecha. Verde ("Abono registrado correctamente"), Roja ("Error al procesar el pago"). 

   - _Lock Screen (Inactividad):_ Una pantalla superpuesta con fondo difuminado que diga "Sesión pausada por inactividad. Ingrese su contraseña para continuar" (Para el timeout de 30 min). 

## **3. Landing Page Pública (Frente Comercial)** 

_(Faride es la responsable total de esta sección para generar conversiones)_ . 

- **Estructura Vertical:** 

   - **Hero Section:** Titular principal con propuesta de valor, subtítulo y un botón flotante llamativo de "Cotizar por WhatsApp" que llevará al Agente N8N. 

   - **Servicios:** Cuadrícula (Grid) visual con fotos reales o mockups de lonas, viniles, tarjetas. 

   - **Social Proof:** "Cómo funciona" (1. Escribe al Bot, 2. Aprueba tu diseño, 3. Recoge en tienda). 

   - **Diseño Responsivo:** Se deben entregar los _frames_ en versión Computadora (Desktop) y Celular (Mobile). 

