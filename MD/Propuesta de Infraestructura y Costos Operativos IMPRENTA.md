# **Propuesta de Infraestructura y Costos Operativos Imprenta** 

**Proyecto:** PrintFlow AI (Imprenta Escalante) 

**Fecha:** Agosto 2026 

**Fase:** Producción, Automatización y Lanzamiento 

**Precios verificados:** Agosto 2026 (se recomienda revalidar antes de contratar) 

## **1. Resumen Ejecutivo** 

Este documento detalla la infraestructura en la nube requerida para desplegar el sistema **PrintFlow AI** (Chatbot, POS y PWA) en un entorno de producción seguro. Se presentan dos escenarios de inversión fija para que la dirección pueda tomar una decisión informada según el nivel de riesgo operativo que esté dispuesta a asumir frente al manejo de dinero y entregas. 

|**Escenario**|**Costo Fijo Mensual**|**Nivel de Riesgo**|
|---|---|---|
|**A — Mínimo Viable (No**<br>**recomendado)**|~$13.25 USD / mes|Alto (Riesgo de caídas)|
|**B — Producción**<br>**Recomendado**|~$41.25 USD / mes|Bajo (Alta disponibilidad)|



_(Nota: Los costos variables por uso de Inteligencia Artificial y WhatsApp se desglosan en la sección 4)._ 

## **2. Arquitectura del Dominio** 

Se adquirirá un único dominio (ej. imprentaescalante.com) y se configurarán subdominios dedicados para separar la carga de los servicios y mantener la seguridad: 

|**Componente**|**URL**|**Función**|
|---|---|---|
|**Punto de Venta (POS)**|admin.imprentaescalante.com|Panel de control para el dueño<br>(Gestión de órdenes y caja)|
|**App Móvil (PWA)**|app.imprentaescalante.com|Escáner de entregas (Uso<br>exclusivo de instaladores)|
|**Backend & Webhooks**|n8n.imprentaescalante.com|Motor N8N que recibe|





mensajes de WhatsApp y conecta con la IA 

## **3. Desglose Completo de Servicios** 

### **Dominio Personalizado (.com)** 

La dirección oficial del sistema en internet. 

|**Concepto**|**Detalle**|
|---|---|
|**Proveedor Sugerido**|Namecheap o Cloudflare Registrar|
|**Precio de Mercado**|$10.00 – $15.00 USD / año|
|**Lo que pagaremos**|~$15.00 USD / año ($1.25 USD / mes)|
|**Incluye**|Subdominios ilimitados, gestión avanzada de<br>DNS|



**¿Por qué pagar?** Un dominio propio es obligatorio para verificar la cuenta oficial de WhatsApp Cloud API (Meta Business) y para emitir certificados de seguridad HTTPS confiables para el sistema. 

### **Base de Datos y Autenticación (PostgreSQL)** 

El núcleo del negocio: almacena finanzas, clientes, pedidos, mermas y gestiona los bloqueos de entrega. 

|**Concepto**|**Detalle**|
|---|---|
|**Proveedor**|Supabase|
|**Plan Gratuito**|500 MB almacenamiento, se pausa tras 7 días de<br>inactividad, SIN respaldos|
|**Plan Pro**|$25.00 USD / mes — 8 GB almacenamiento,<br>siempre encendido, respaldos PITR|
|**Lo que pagaremos**|Escenario A: $0.00 / Escenario B: $25.00 USD /<br>mes|



[!CAUTION] **Riesgo crítico del plan gratuito:** Supabase pausa automáticamente los proyectos gratuitos si no detecta actividad directa. Si la base de datos se pausa un domingo, el lunes por la mañana ni el POS ni el Chatbot de WhatsApp funcionarán, paralizando las ventas de la imprenta. Además, **no incluye Point-in-Time Recovery (PITR)** . Si alguien 

borra un cobro por accidente, el dinero se pierde en el sistema sin forma de recuperarlo. _Recomendación estricta:_ Para un sistema financiero, el Plan Pro ($25 USD) es innegociable. 

### **Backend y Orquestador (Servidor VPS con Docker)** 

El servidor que aloja N8N. Procesa los PDFs, recibe las imágenes de los clientes y conecta WhatsApp con Supabase y OpenAI. 

|**Concepto**|**Detalle**|
|---|---|
|**Proveedor**|DigitalOcean (Droplet) o Hetzner (Cloud VPS)|
|**Plan Básico (Escenario A)**|~$12.00 USD / mes — 2 GB RAM, 1 vCPU|
|**Plan Estándar (Escenario B)**|~$15.00 - $24.00 USD / mes — 4 GB RAM, 2<br>vCPU|
|**Lo que pagaremos**|Escenario A: $12.00 / Escenario B: $15.00<br>USD / mes (Hetzner CPX21)|



**¿Por qué pagar?** N8N es intensivo en memoria RAM cuando procesa múltiples peticiones simultáneas (ej. varios clientes enviando comprobantes de pago en imagen a WhatsApp al mismo tiempo). Un servidor de 2GB corre el riesgo de colapsar por falta de memoria (OOM kill). Un VPS de 4GB garantiza fluidez. 

### **Frontend (POS y App Móvil PWA)** 

Las interfaces visuales (React) que usarán el dueño y los instaladores. 

|**Concepto**|**Detalle**|
|---|---|
|**Proveedor**|Vercel o Cloudflare Pages|
|**Plan Gratuito**|Ancho de banda suficiente, SSL gratuito,<br>dominios personalizados|
|**Lo que pagaremos**|$0.00 USD / mes|



**¿Por qué NO pagar?** A diferencia del orquestador N8N, los sitios construidos con React (PWA/POS) se compilan como archivos estáticos. Se distribuyen mediante redes globales (CDN) que soportan millones de visitas en sus capas gratuitas sin requerir procesamiento de servidor continuo. 

### **Almacenamiento Multimedia (Storage)** 

Aloja los PDFs de las remisiones y las fotos de los comprobantes de pago. 

|**Concepto**|**Detalle**|
|---|---|
|**Proveedor**|Supabase Storage (Incluido)|
|**Lo que pagaremos**|$0.00 USD / mes (Va incluido en el Plan de<br>Base de Datos)|



## **4. Resumen Financiero de Infraestructura (Costos Fijos)** 

### **Escenario A — Mínimo Viable (Riesgo Alto de Caída)** 

|**Servicio**|**Proveedor**|**Plan**|**Precio Real del**<br>**Plan**|**Lo que**<br>**pagaremos**|
|---|---|---|---|---|
|Dominio (.com)|Namecheap|Anual|$15.00 USD/año|$1.25 USD/mes|
|Backend N8N|Hetzner/DO|2GB RAM|$12.00<br>USD/mes|$12.00<br>USD/mes|
|Base de Datos|Supabase|Gratuito|$0.00 USD/mes|$0.00 USD/mes|
|Frontend|Vercel|Gratuito|$0.00 USD/mes|$0.00 USD/mes|
|SSL/HTTPS|Vercel/Traefik|Incluido|$0.00 USD/mes|$0.00 USD/mes|
|**TOTAL FIJO**||||**$13.25 USD /**<br>**mes**|



[!CAUTION] **Riesgos de este escenario:** Susceptibilidad a colapsos de N8N por falta de memoria al procesar PDFs pesados. Riesgo altísimo de pausa de base de datos y nula capacidad de recuperación ante desastres (Sin Backups). 

### **Escenario B — Producción Recomendado (Riesgo Bajo)** 

|**Servicio**|**Proveedor**|**Plan**|**Precio Real del**<br>**Plan**|**Lo que**<br>**pagaremos**|
|---|---|---|---|---|
|Dominio (.com)|Namecheap|Anual|$15.00 USD/año|$1.25 USD/mes|
|Backend N8N|Hetzner/DO|4GB RAM|$15.00|$15.00|



||||USD/mes|USD/mes|
|---|---|---|---|---|
|Base de Datos|Supabase|**Pro**|$25.00<br>USD/mes|$25.00<br>USD/mes|
|Frontend|Vercel|Gratuito|$0.00 USD/mes|$0.00 USD/mes|
|SSL/HTTPS|Vercel/Traefik|Incluido|$0.00 USD/mes|$0.00 USD/mes|
|**TOTAL FIJO**||||**$41.25 USD /**<br>**mes**|



[!TIP] **Ventajas de este escenario:** Estabilidad total. PostgreSQL no se apagará jamás. Se incluyen respaldos con restauración minuto a minuto (PITR), y el servidor de N8N soportará tráfico concurrente sin congelarse. 

## **5. Costos Variables (Consumo de IA y Meta)** 

A diferencia de los servidores que tienen un costo fijo, la Inteligencia Artificial y WhatsApp cobran exactamente por lo que la imprenta consume (como la luz o el agua). 

|**Concepto**|**Proveedor**|**Tarifa Estimada**|**Control de Gasto**|
|---|---|---|---|
|**Inteligencia**<br>**Artificial (Cerebro)**|OpenAI API<br>(GPT-4o-mini)|~$10.00 - $15.00<br>USD / mes|Límite máximo (Hard<br>Cap) configurado en<br>$20 USD.|
|**Canal WhatsApp**|Meta Cloud API|~$15.00 - $25.00<br>USD / mes|1,000 conversaciones<br>de servicio gratuitas<br>al mes. Después,<br>~$0.04 USD por<br>charla (México).|



_Estos montos se cargan directamente a la tarjeta de crédito del cliente (Dueño de la Imprenta) en sus respectivas consolas._ 

## **6. Configuraciones Post-Despliegue** 

Una vez encendidos los servidores, el equipo técnico realizará: 

1. **Verificación Meta Business:** Vincular el dominio .com al panel de Facebook para habilitar el número oficial de WhatsApp. 

2. **DNS & Reverse Proxy:** Apuntar los subdominios a Vercel (Front) y al VPS (Backend) y configurar 

   - los webhooks con tokens de seguridad. 

3. **Límites Financieros (FinOps):** Activar los topes de gasto en OpenAI para prevenir ataques de facturación si un bot malicioso interactúa con el WhatsApp de la imprenta. 

## **7. Conclusión y Recomendación** 

Para un sistema que se encargará de detener fugas de dinero e interactuar directamente con los clientes de Imprenta Escalante sin supervisión humana, **se recomienda estrictamente el Escenario B ($41.25 USD / mes en costos fijos)** . 

Sumando los gastos variables aproximados ($25 USD), el costo de mantener "encendido" todo el cerebro digital de la imprenta es de aproximadamente **$66.25 USD al mes (Aprox. $1,325 MXN)** . 

Considerando que el sistema automatizará ventas las 24 horas y asegurará que ningún producto salga del taller sin ser liquidado (recuperando miles de pesos en cartera vencida), el costo de la infraestructura se paga a sí mismo en los primeros días del mes operativo. 

