# Plan — Diseños para personalizar productos (v2: Cloudflare R2)

**Fecha:** 17/10/2026 · **Estado:** propuesta. Faltan las decisiones de la sección 10 y los datos de Cloudflare de la sección 9.

**Cambios respecto a la v1:**
- Las imágenes se guardan en **Cloudflare R2 en su calidad original**, sin compresión.
- Supabase guarda solo los registros, de 1 a 2 KB cada uno.
- Hay **borrado automático configurable** del original (30 días por defecto), con miniatura e historial permanentes.
- Hay **medidores de almacenamiento** en Configuración y **avisos** a los 8 y 9.5 GB, sin rechazar subidas.

---

## 1. La idea

Subir una o varias imágenes de diseño a un pedido (por ejemplo, una taza con dos diseños). Es opcional y se puede hacer en cualquier momento, sin frenar el pedido si el cliente aún no manda la imagen.

## 2. Mejoras incorporadas

| # | Mejora |
|---|---|
| 1 | El diseño va en la **línea** del pedido (la taza), no solo en el pedido. |
| 2 | **Nota** por diseño: "frente", "reverso", "logo en la esquina". |
| 3 | Productos con la casilla **"Lleva diseño del cliente"**. Solo ahí aparece el aviso "Falta diseño". |
| 4 | **Aviso, nunca bloqueo:** etiqueta en el pedido, el tablero y el calendario; sección en Notificaciones; confirmación al pasar a producción. |
| 5 | Se sube en cualquier momento mientras el pedido no esté entregado ni cancelado. |
| 6 | **Original en calidad completa**, sin compresión. **Miniatura** ligera (~30 KB) para las listas. |
| 7 | **Borrado automático del original** X días después de entregado el pedido (configurable, 30 por defecto). El registro y la miniatura se conservan como historial. |
| 8 | Botón **"Conservar"** por diseño (por ejemplo, el logo de un cliente frecuente): ese original no se borra solo. |
| 9 | "Quitar" a mano **no borra el registro:** se oculta con motivo y queda en la bitácora. |
| 10 | Desde el celular: cámara o galería. En la computadora: arrastrar y soltar. |
| 11 | Origen del diseño (`PANEL`, y en el futuro `WHATSAPP`) para el bot de n8n. |

## 3. Arquitectura

```
Panel (navegador)
   │  1. Sube el archivo con la sesión del usuario (token de Supabase)
   ▼
Cloudflare Worker  "printflow-disenos"
   │  2. Pregunta a Supabase, CON EL MISMO TOKEN, si puede subir
   │     (es ADMIN, el pedido no está entregado ni cancelado, tamaño y tipo válidos).
   │     Las reglas viven en la base, igual que el anticipo y la entrega.
   │  3. Guarda el original y la miniatura en R2.
   │  4. Registra el diseño en Supabase (si falla, borra lo que acaba de subir).
   ▼
R2 "printflow-disenos" (privado)        Supabase: tabla order_item_designs
   disenos/{pedido}/{linea}/{id}.ext      1 renglón por diseño (~1-2 KB)
   disenos/{pedido}/{linea}/{id}-mini.webp
```

- **Ver un diseño:** el panel lo pide al Worker con la sesión del usuario. El Worker confirma con Supabase que tiene permiso y devuelve el archivo. Nunca hay enlaces públicos.
- **Borrado diario:** el Worker tiene una tarea programada (*Cron Trigger*) a las 3:00 a. m.:
  1. Le pide a Supabase la lista de originales que ya vencieron, presentando una clave compartida.
  2. Los borra de R2.
  3. Confirma a Supabase cuáles se borraron.
- **Red de seguridad en R2:** una regla de ciclo de vida borra cualquier objeto con más de 400 días.
- **Lo que el Worker NO tiene:** la llave maestra de Supabase (`service_role`) ni llaves de R2. Accede a R2 por un enlace interno (*binding*) y a Supabase con la sesión del usuario o con la clave compartida, que solo sirve para el borrado.
- **La clave compartida de borrado** vive cifrada en **Supabase Vault** y como *Secret* del Worker. Nunca está en el código ni en el repositorio.

## 4. Base de datos (migración `20261018000001_disenos_pedido.sql`)

**`products`:** columna `requires_design boolean default false`.

**`business_settings`:**

| Columna | Valor por defecto | Para qué |
|---|---|---|
| `design_retention_days` | 30 | Días después de entregado en que se borra el original (15, 30, 60, 90 o 180). |
| `design_storage_warn_gb` | 8 | Primer aviso. |
| `design_storage_alert_gb` | 9.5 | Aviso urgente. |
| `design_storage_free_gb` | 10 | Referencia del plan gratis de R2, para la barra. |

**Tabla `order_item_designs`:**

| Columna | Uso |
|---|---|
| `id`, `order_id`, `order_item_id` | La línea a la que pertenece. |
| `object_key`, `preview_key` | Rutas en R2. |
| `file_name`, `mime_type`, `size_bytes`, `preview_bytes` | Para mostrar y para el medidor. |
| `note` (≤ 200), `source` | "Frente"; `PANEL` / `WHATSAPP`. |
| `keep_original boolean` | "Conservar": no se borra solo. |
| `original_deleted_at` | Cuándo se borró el original. La miniatura sigue. |
| `uploaded_by`, `created_at` | |
| `removed_at`, `removed_by`, `removed_reason` | "Quitar" sin borrar el registro. |

**Funciones:**

| Función | Quién la llama | Qué hace |
|---|---|---|
| `design_upload_check(item, tamaño, tipo)` | Worker, con la sesión del usuario | Valida que sea ADMIN, el estado del pedido, máximo 10 diseños por línea, el tipo y el tamaño. Devuelve la ruta donde guardar. |
| `register_design(...)` | Worker, con la sesión del usuario | Crea el registro. |
| `design_file_access(id, variante)` | Worker, con la sesión del usuario | Valida el permiso para ver o descargar. |
| `set_design_keep(id, bool)` | Panel | Activa o desactiva "Conservar". |
| `remove_design(id, motivo)` | Panel | Oculta el diseño con motivo, sin borrar. |
| `designs_due_for_purge(clave)` | Worker (tarea diaria) | Devuelve los originales vencidos. Exige la clave de Vault. |
| `confirm_design_purge(clave, ids)` | Worker (tarea diaria) | Marca `original_deleted_at`. |
| `get_storage_usage()` | Panel (ADMIN) | Bytes vivos en R2 (originales no borrados + miniaturas), tamaño de la base de Supabase y lo que se liberará en 7 días. |

- `get_notifications()` suma las secciones **"Pedidos sin diseño"** y **"Almacenamiento"** (8 y 9.5 GB).
- Disparadores: sin `DELETE`, campos del archivo inmutables y bitácora con categoría `DISEÑO`.

**Pruebas SQL (`15_disenos.sql`):**
- El instalador no sube.
- No se sube a pedidos entregados o cancelados.
- Máximo 10 por línea.
- Sin borrado.
- Quitar exige motivo.
- La clave de borrado equivocada se rechaza.
- Solo vencen los originales de pedidos entregados hace más de X días y sin "Conservar".
- Los medidores son correctos.
- Los avisos aparecen en 8 y 9.5 GB.

## 5. Límites

| | Valor |
|---|---|
| Formatos | JPG, PNG, WEBP, PDF y TIFF. SVG no, porque puede llevar código. PSD y AI no, porque no tienen vista previa; se exportan a PDF. |
| Tamaño por archivo | 50 MB (el Worker gratis acepta hasta 100 MB por petición). |
| Diseños por línea | 10 activos. |
| Calidad | El original se guarda **tal cual**. |

## 6. Panel

| Pantalla | Cambio |
|---|---|
| **Configuración → Almacenamiento** (nueva) | Barra **Cloudflare (diseños)**: "3.2 GB de 10 GB", en verde, amarillo (≥ 8) y rojo (≥ 9.5), con número de diseños y "se liberarán 420 MB en 7 días". Barra **Supabase (base de datos)**: tamaño real de la base contra el límite del plan. Lista **"Borrar originales después de"** con 15, 30 (predeterminado), 60, 90 y 180 días. Límites de aviso ajustables. |
| Productos | Casilla "Lleva diseño del cliente" y filtro "Personalizables". |
| Nuevo pedido | Al guardar, si hay líneas personalizables: "Subir diseños ahora / Después". |
| Detalle del pedido | Apartado "Diseños" por línea: subir con barra de avance, nota, miniaturas, ver ampliado, descargar original, "Conservar", quitar con motivo, y aviso "El original se borra el 18 de nov." o "Original eliminado (queda la miniatura)". |
| Tablero y calendario | Etiqueta "Falta diseño". |
| Pasar a producción | Confirmación si falta diseño. |
| Notificaciones y campana | "Pedidos sin diseño" y "Almacenamiento: pasaste 8 GB de 10 GB" (o la versión urgente). |
| Bitácora | Subido, quitado, conservado y original borrado automáticamente. |

**Archivos nuevos:** `lib/designs.ts` (llamadas al Worker), `DesignUploader`, `DesignGallery`, `features/settings/StorageSection.tsx`. **Variable nueva en Render:** `VITE_DESIGNS_WORKER_URL`.

## 7. Worker (`API/cloudflare/disenos-worker.js`)

| Ruta | Qué hace |
|---|---|
| `POST /upload` | Recibe original, miniatura y nota. Llama a `design_upload_check`, guarda en R2 y llama a `register_design`. |
| `GET /file/:id?v=mini\|original` | Llama a `design_file_access` y devuelve el archivo. |
| `scheduled` (3:00 a. m.) | Ejecuta el borrado diario. |

- **CORS:** solo acepta peticiones del dominio del panel en Render y de `localhost`.
- Se publica **desde el panel web de Cloudflare** (copiar y pegar), sin instalar nada.

## 8. Fases

| Fase | Contenido | Estimado |
|---|---|---|
| **0. Cloudflare** | Tú creas la cuenta, el bucket y el Worker vacío (guía en la sección 9). | 20–30 min |
| **1. Base** | Migración, Vault, funciones, avisos y pruebas SQL. Respaldo antes de aplicar. | 1 día |
| **2. Worker** | Código, ciclo de vida de R2 y pruebas de subida, descarga, permisos y borrado. | 1 día |
| **3. Subir y ver** | Detalle del pedido. | 1–1.5 días |
| **4. Avisos y Configuración** | Almacenamiento, casilla en Productos, etiquetas, confirmación y notificaciones. | 1 día |
| **5. Cierre** | Pruebas en navegador (escritorio y celular), datos `[PRUEBA]` limpiados y manual. | 0.5 día |

## 9. Datos de Cloudflare que necesito

**Estado al 17/10/2026:**
- ✅ Cuenta creada y R2 activado.
- ✅ Bucket `printflow-disenos`: Standard, sin acceso público.
- ✅ Worker `printflow-disenos` publicado en `https://printflow-disenos.gansito-marinela-claude.workers.dev`, por ahora con el Hello World.
- ✅ Binding `DISENOS` → `printflow-disenos` en Production.
- ⏳ Alerta de presupuesto (Billing → Add Budget Alert).
- ✅ URL del panel en Render: `https://printflow-admin-v9fe.onrender.com`. Va en `ALLOWED_ORIGINS` del Worker.
- ℹ️ No se usan el Account ID ni la API S3 de R2: el Worker accede por el binding.
- ⏳ Variables del Worker: se agregan en la fase 2.

**Lo que haces tú en Cloudflare:**
1. Crear la cuenta en dash.cloudflare.com con el correo del negocio.
2. **R2 → Activar.** Cloudflare pide un método de pago aunque se use solo lo gratis.
3. **R2 → Create bucket:** nombre `printflow-disenos`, ubicación automática. **No** activar el acceso público.
4. **Workers & Pages → Create → Worker:** nombre `printflow-disenos`. Desplegar el ejemplo tal cual; después se pega mi código.
5. En el Worker, **Settings → Bindings → R2 bucket:** nombre de variable `DISENOS`, bucket `printflow-disenos`.
6. **Billing → Notifications:** alerta de uso o cobro a tu correo, como respaldo.

**Lo que me pasas (no es secreto):**

| Dato | Ejemplo | Para qué |
|---|---|---|
| URL del Worker | `https://printflow-disenos.tu-subdominio.workers.dev` | El panel le envía los archivos. |
| URL del panel en Render | `https://printflow-admin.onrender.com` | Permitir solo a ese dominio (CORS). |
| Confirmación de los pasos 2, 3, 5 y 6 | "Listo" | Saber que ya existen. |

**La clave de borrado (sí es secreta) NO me la mandas por el chat:**
- La genero yo y la guardo en **Supabase Vault** y en `API/.env` de tu computadora (`PF_DESIGNS_PURGE_SECRET`).
- Tú la copias de ese archivo a **Worker → Settings → Variables → Secret** con el nombre `PURGE_SECRET`.

**Variables del Worker** (las pegas en Settings → Variables; te paso la lista exacta con la fase 2):

| Nombre | Tipo | Valor |
|---|---|---|
| `SUPABASE_URL` | Texto | `https://cwnocmilhgjsngkwazey.supabase.co` |
| `SUPABASE_ANON_KEY` | Texto | La clave pública del panel (la misma `VITE_SUPABASE_ANON_KEY`) |
| `ALLOWED_ORIGINS` | Texto | URL del panel en Render y `http://localhost:5179` |
| `PURGE_SECRET` | **Secret** | La clave de borrado de `API/.env` |

**Lo que NO necesito y no debes mandarme:**
- Llaves de acceso de R2 (*Access Key ID / Secret Access Key*): el Worker usa el enlace interno.
- Tokens de API de Cloudflare ni la *Global API Key*.
- Tu contraseña de Cloudflare.
- La `service_role` de Supabase.

## 10. Decisiones tomadas (17/10/2026, Isaías)

| # | Decisión | Qué implica |
|---|---|---|
| 1 | **Solo los administradores suben** diseños. | `design_upload_check` y las políticas exigen ADMIN. El instalador no sube ni ve. |
| 2 | **Pasar a producción sin diseño: se confirma, no se bloquea.** | Diálogo de confirmación en el panel. La base no lo impide. |
| 3 | **Formatos JPG, PNG, WEBP, PDF y TIFF, hasta 50 MB.** Sin SVG, PSD ni AI. | Se valida en el panel, en el Worker y en la base. |
| 4 | **Los instaladores no ven diseños en la app por ahora.** | La app no cambia. Queda para después. |
| 5 | **Sí, el diseño sale en la remisión PDF.** | Ver detalle abajo. |

**Detalle de la decisión 5 (remisión):**
- Debajo de cada línea con diseños, la remisión muestra las **miniaturas**: hasta 4 por línea, con su nota ("Frente", "Reverso"). Si hay más: "+2 diseños más".
- Se usan las miniaturas (~30 KB, unos 480 px), no los originales: el PDF queda ligero y se genera rápido. La miniatura existe aunque el original ya se haya borrado, así que una remisión reimpresa meses después sigue mostrando el diseño.
- Los diseños en **PDF** no tienen miniatura. En su lugar sale el texto "Diseño en PDF: logo-final.pdf".
- El panel descarga las miniaturas desde el Worker, con la sesión del administrador, y las incrusta en el PDF (`@react-pdf/renderer` acepta imágenes como datos). Si alguna falla, la remisión se genera igual con el texto "(vista previa no disponible)", **nunca se bloquea el cobro ni la entrega**.
- Los diseños quitados (`removed_at`) no aparecen.
- Archivos: `RemissionDocument.tsx` y `RemissionButton.tsx`. Se agrega a la **fase 4**.

**Cambio en las fases:** la fase 4 incluye ahora "Miniaturas de diseños en la remisión PDF" (+0.5 día).
