# Plan de Implementación — Base de Datos, Panel Administrativo y Conexión de la App

| Campo | Detalle |
|---|---|
| Proyecto | **PrintFlow AI** — Imprenta Escalante |
| Alcance | Fase 1 SRS (BD), Fase 3 SRS (Panel POS) y conexión de la Fase 4 (PWA) a datos reales |
| Responsable | **Isaías** (BD y Panel). Emir se integra al terminar sus pendientes (`Pendientes_Frontend_Cierre.md`) |
| Arquitectura | **La del SRS**: los frontends hablan directo con Supabase (PostgREST + RPC), protegidos por RLS y triggers. Sin servidor de API propio |
| Plazo | Lo define Isaías |
| Fuentes | BRD v1.2 · SRS Fases 1, 3, 4, 5 y 6 · Wireframe Spec-Kit V2 Final §1.7, §2 y §3 · Propuesta de Infraestructura · `printflow-app/src/data/contracts.ts` |

> **Regla de oro de este plan.** El dinero y la autorización de entrega se resuelven en PostgreSQL. Ningún frontend calcula precios, totales ni saldos, y ningún frontend escribe directamente en `orders` o `payments`. Los frontends **leen** y **llaman funciones**.

---

## 0. Alcance

### Dentro (MVP)

El camino completo del dinero y la entrega:

```
Alta manual del pedido (panel) → anticipo (panel) → producción → listo para entrega
  → remisión PDF con QR → escaneo en la PWA → bloqueo o autorización → entregado
```

### Fuera (se deja preparado, no se construye)

| Pendiente | Cómo queda preparado |
|---|---|
| Chatbot WhatsApp + n8n | `orders.source` ya distingue `WHATSAPP_BOT`; `create_order` es la misma función que llamará n8n; la vista `active_price_list` ya existe |
| Inventario, recetas y mermas (Módulo 4 del BRD) | Fuera del esquema del MVP. **Comunicarlo al cliente como segunda entrega**: el Objetivo 4 del BRD depende de esto |
| "Forzar entrega con saldo" (ARQ-03) | El trigger estricto se mantiene. Se agrega después como RPC auditada |
| Bucket de comprobantes, `chat_sessions`, rate limiting | Fase n8n |
| Reportes y utilidad neta | Requieren el Módulo 4 |
| Cámara real en la PWA | Pendiente de Emir; esta conexión funciona con la entrada manual de token que ya existe |

---

## 1. Decisiones de arquitectura

Todas cerradas para poder escribir el esquema. Las marcadas **(Desvía SRS)** cambian algo del documento original y dicen por qué.

| ID | Decisión | Origen |
|---|---|---|
| **ARQ-01** | El QR contiene **solo** `orders.qr_code_hash` (UUID crudo, sin URL ni JSON). La PWA lo resuelve con la RPC `get_delivery_info`. Nunca se expone `orders.id` | SRS-DB-01, Spec-Kit §3.3 |
| **ARQ-02** | El INSTALLER **no tiene `SELECT` directo** sobre `orders`, `order_items`, `payments` ni `customers`. Solo llama a 3 RPC que devuelven exactamente los campos permitidos. **(Desvía SRS)**: el SRS daba lectura de `orders` al instalador, pero RLS filtra filas, no columnas, y `orders` contiene dinero | Spec-Kit ARQ-02 |
| **ARQ-03** | "Forzar entrega con saldo" **fuera del MVP**. El trigger de bloqueo es incondicional. "Iniciar producción sin anticipo" **sí entra**, con motivo obligatorio y bitácora | BRD regla 2, Spec-Kit §3.4 |
| **ARQ-04** | Un abono se rechaza en la BD si es `<= 0`, si excede el saldo, o si el pedido está `DELIVERED`/`CANCELLED`. Además `CHECK (balance_due >= 0)` | Spec-Kit ARQ-04 |
| **ARQ-05** | Tablas `products` y `order_items`. El precio unitario se **congela** en la partida al crear el pedido | Spec-Kit ARQ-05 |
| **ARQ-06** | Revocación por `profiles.is_active`. Tope absoluto de 12 h verificado **en el servidor** con la marca de tiempo del login (`amr` del JWT). Verificación empírica obligatoria en `DB-13` | SRS-PWA-03 |
| **D-01** | **Escrituras solo por RPC** (`SECURITY DEFINER`). El rol `authenticated` no tiene `INSERT/UPDATE/DELETE` sobre `orders`, `order_items` ni `payments`. **(Desvía SRS)**: el SRS hacía `INSERT` directo en `payments` desde el POS y `UPDATE` de `status` desde la PWA. Con RPC se valida todo en una transacción y se obtiene idempotencia | Spec-Kit §3.2: "se recomienda idempotency key/RPC" |
| **D-02** | Los triggers del SRS **se conservan** aunque las RPC ya validen. Son la última barrera ante un bug de una RPC | SRS Fase 1 §4 |
| **D-03** | Tabla `profiles` en lugar de `users` **(Desvía SRS solo en el nombre)**: evita la confusión con `auth.users` | SRS Fase 1 §1.1 |
| **D-04** | Estado `CANCELLED` agregado al enum | SRS Fase 1 §2 lo menciona |
| **D-05** | `orders.source`: `ADMIN_MANUAL` (MVP) / `WHATSAPP_BOT` (futuro) | Decisión de Isaías: pedidos manuales primero |
| **D-06** | Identificador humano **no enumerante**: `folio` tipo `PF-7K3MQ9` (alfabeto sin `0 O 1 I`), aleatorio y único | Spec-Kit §3.1 |
| **D-07** | Anticipo mínimo configurable en `business_settings.deposit_pct` (por defecto **50**) | BRD: "50 % por defecto" |
| **D-08** | Zona horaria operativa en `business_settings.timezone`. **Supuesto: `America/Mexico_City` — confirmar** | Spec-Kit §3.1: "zona horaria como configuración aprobada" |
| **D-09** | **Dinero como texto en las RPC de la PWA.** PostgREST serializa `numeric` como número JSON, y el candado compara `balanceDue === "0.00"`. Las RPC devuelven `balance_due::text` (`numeric(10,2)` conserva la escala: `0` → `"0.00"`) | `contracts.ts` (Money = string) |
| **D-10** | Registro de usuarios **deshabilitado** en Supabase Auth. Los usuarios se crean desde el dashboard; un trigger crea su `profile` inactivo y el ADMIN lo activa y le asigna rol | SRS-RLS-01 |
| **D-11** | Remisión PDF generada en el navegador al vuelo, sin guardarla en Storage | Simplificación del MVP |
| **D-12** | El proyecto de Supabase actual es **desarrollo/staging**. Producción será un proyecto aparte en **plan Pro** (PITR) antes de cargar datos reales | SRS Fase 5 §3, Infraestructura |
| **D-13** | El panel se construye directo con identidad visual (tokens de la app de Emir), sin etapa de wireframe en grises | Velocidad de entrega |

### Mapa de repositorios

| Repo | Carpeta local | Contenido |
|---|---|---|
| `printflow-api` | `API/` (hoy vacía) | `supabase/` con migraciones, seeds, pruebas SQL y config. **Es la API**: PostgREST + RPC |
| `printflow-admin` | `printflow-admin/` (nuevo) | Panel administrativo |
| `printflow-app` | `printflow-app/` | PWA de Emir (solo se le agrega la implementación Supabase del gateway) |
| `printflow-landing` | `landing_pague_faride/` | Sin cambios en este plan |

---

# FASE 0 — Preparación

| ID | Tarea | Criterio de cierre |
|---|---|---|
| **P-01** | **Rotar la contraseña de la base de datos** (se expuso en el chat): *Project Settings → Database → Reset database password* | Contraseña nueva guardada solo en un gestor de contraseñas |
| P-02 | Instalar Supabase CLI y Docker Desktop (BD local del SRS Fase 5 §3) | `supabase --version` y `docker ps` funcionan |
| P-03 | Crear el repo `printflow-api`, `supabase init`, `supabase link --project-ref <PROJECT_REF>` | `supabase db pull` contra el proyecto vacío no da error |
| P-04 | Auth settings: **desactivar "Allow new users to sign up"**; JWT expiry de 3600 s (las sesiones se renuevan; el tope de 12 h lo pone ARQ-06) | Un `signUp` desde un cliente anónimo falla |
| P-05 | Confirmar la zona horaria (D-08) | Valor escrito en el seed de `business_settings` |
| P-06 | **Pedir a Andri el catálogo real**: productos, unidad (pieza o m²), precio de menudeo, precio de mayoreo y umbral de mayoreo | Hoja recibida. Mientras tanto se usan precios `DEMO` |
| P-07 | Plantillas de entorno sin secretos: `.env.example` en cada repo | Ningún `.env` versionado (`git check-ignore .env`) |

**Variables de entorno:**

| Repo | Variable | Contenido |
|---|---|---|
| `printflow-api` | `SUPABASE_DB_PASSWORD` | Solo local, para `supabase link` y `db push` |
| `printflow-admin` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Claves **públicas** (SRS Fase 5 §5.1) |
| `printflow-app` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DATA_SOURCE` | `VITE_DATA_SOURCE=mock` o `supabase` |

> **La `service_role` key no va en ningún frontend**: ni en `.env`, ni en el hosting, ni en el bundle. Su único consumidor futuro es n8n.

---

# FASE 1 — Base de datos (`printflow-api`)

## 1.1 Estructura del repo

```
printflow-api/
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_extensiones_y_enums.sql
│   │   ├── 0002_settings_y_profiles.sql
│   │   ├── 0003_customers_y_products.sql
│   │   ├── 0004_orders_items_payments.sql
│   │   ├── 0005_order_events.sql
│   │   ├── 0006_triggers_integridad.sql
│   │   ├── 0007_helpers_seguridad.sql
│   │   ├── 0008_rls_y_privilegios.sql
│   │   ├── 0009_rpc_panel.sql
│   │   ├── 0010_rpc_instalador.sql
│   │   └── 0011_realtime_y_vistas.sql
│   ├── seed.sql
│   └── tests/                     # pgTAP: `supabase test db`
│       ├── 01_regla_de_oro.sql
│       ├── 02_bloqueo_entrega.sql
│       ├── 03_sobrepago.sql
│       ├── 04_anticipo.sql
│       ├── 05_rls.sql
│       └── 06_rpc_instalador.sql
├── docs/
│   └── concurrencia.md            # procedimiento manual de DB-14
├── .env.example
└── README.md
```

**Una migración es un archivo inmutable.** Un cambio posterior es una migración **nueva**; nunca se edita una ya aplicada.

## 1.2 Modelo de datos

Todas las PK son `uuid default gen_random_uuid()` salvo donde se indica (SRS-DB-01). Todo el dinero es `numeric(10,2)`.

### Enums (`0001`)

```sql
create type public.user_role        as enum ('ADMIN', 'INSTALLER');
create type public.pricing_tier     as enum ('RETAIL', 'WHOLESALE');
create type public.order_status     as enum ('PENDING_DEPOSIT', 'IN_PRODUCTION',
                                             'READY_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');
create type public.payment_method   as enum ('CASH', 'TRANSFER', 'CARD');
create type public.order_source     as enum ('ADMIN_MANUAL', 'WHATSAPP_BOT');
create type public.pricing_unit     as enum ('UNIT', 'M2');
create type public.product_category as enum ('GRAN_FORMATO', 'PAPELERIA', 'PROMOCIONALES');
create type public.order_event_type as enum (
  'CREATED', 'PAYMENT_REGISTERED', 'STATUS_CHANGED', 'PRODUCTION_OVERRIDE',
  'PROMISED_DATE_CHANGED', 'DELIVERED', 'CANCELLED');
```

> `product_category` usa las mismas tres categorías que la landing (`gran-formato`, `papeleria`, `promocionales`), para que el `service_id` del deep link se pueda mapear cuando entre n8n.

### `business_settings` (`0002`) — una sola fila

| Columna | Tipo | Regla |
|---|---|---|
| `id` | `boolean` PK | `default true`, `check (id)`: garantiza una sola fila |
| `deposit_pct` | `numeric(5,2)` | `not null default 50`, `check (deposit_pct between 0 and 100)` |
| `timezone` | `text` | `not null default 'America/Mexico_City'` |
| `updated_at` | `timestamptz` | |

### `profiles` (`0002`) — empleados (SRS 1.1)

| Columna | Tipo | Regla |
|---|---|---|
| `id` | `uuid` PK | `references auth.users(id) on delete restrict` |
| `role` | `user_role` | `not null default 'INSTALLER'` |
| `full_name` | `varchar(100)` | `not null` |
| `is_active` | `boolean` | `not null default false` (D-10: nace inactivo) |
| `created_at` | `timestamptz` | `default now()` |

Trigger `on_auth_user_created` (`after insert on auth.users`) inserta el `profile` con `full_name` desde `raw_user_meta_data->>'full_name'` (o el email), y **siempre** `role = 'INSTALLER'` e `is_active = false`.

> **Nunca leer el rol desde los metadatos del usuario**: el propio usuario puede escribirlos.

### `customers` (`0003`) — SRS 1.2

| Columna | Tipo | Regla |
|---|---|---|
| `id` | `uuid` PK | |
| `phone_number` | `varchar(20)` | `not null unique`, `check (phone_number ~ '^[0-9]{10,15}$')`: E.164 sin `+`, la llave que usará n8n |
| `full_name` | `varchar(150)` | `not null` |
| `pricing_tier` | `pricing_tier` | `not null default 'RETAIL'` (la "etiqueta manual" del BRD, regla 1) |
| `is_active` | `boolean` | `not null default true` (soft delete, SRS §2) |
| `notes` | `text` | |
| `created_at` | `timestamptz` | `default now()` |

### `products` (`0003`) — ARQ-05

| Columna | Tipo | Regla |
|---|---|---|
| `id` | `uuid` PK | |
| `sku` | `varchar(30)` | `not null unique` |
| `name` | `varchar(120)` | `not null` |
| `category` | `product_category` | `not null` |
| `pricing_unit` | `pricing_unit` | `not null`: `UNIT` por pieza, `M2` por metro cuadrado |
| `retail_price` | `numeric(10,2)` | `not null check (retail_price > 0)` |
| `wholesale_price` | `numeric(10,2)` | `not null check (wholesale_price > 0 and wholesale_price <= retail_price)` |
| `wholesale_min_qty` | `numeric(10,2)` | Nulo = sin umbral. Si la cantidad facturable lo alcanza, aplica mayoreo (BRD regla 1: "umbral volumétrico") |
| `is_active` | `boolean` | `not null default true` |
| `created_at`, `updated_at` | `timestamptz` | |

### `orders` (`0004`) — SRS 1.3

| Columna | Tipo | Regla |
|---|---|---|
| `id` | `uuid` PK | **Nunca sale hacia la PWA ni al QR** |
| `folio` | `varchar(12)` | `not null unique` (D-06) |
| `customer_id` | `uuid` | `not null references customers(id) on delete restrict` (SRS §2) |
| `status` | `order_status` | `not null default 'PENDING_DEPOSIT'` |
| `promised_date` | `timestamptz` | `not null` (BRD regla 4) |
| `total_price` | `numeric(10,2)` | `not null check (total_price > 0)` |
| `balance_due` | `numeric(10,2)` | `not null`, `check (balance_due >= 0 and balance_due <= total_price)` (ARQ-04). **Solo lo escribe el trigger T2** |
| `qr_code_hash` | `uuid` | `not null unique default gen_random_uuid()` (ARQ-01) |
| `route_token` | `uuid` | `not null unique default gen_random_uuid()`: token opaco de "Mi Ruta", **distinto** del QR, para que tener la ruta no permita entregar sin escanear |
| `source` | `order_source` | `not null default 'ADMIN_MANUAL'` (D-05) |
| `production_override` | `boolean` | `not null default false` (ARQ-03) |
| `notes` | `text` | |
| `created_by` | `uuid` | `references profiles(id)`; nulo en pedidos del bot |
| `delivered_at` | `timestamptz` | |
| `delivered_by` | `uuid` | `references profiles(id)` |
| `created_at`, `updated_at` | `timestamptz` | |

Índices: `(status, promised_date)` para el Kanban y la ruta; `(customer_id)`.

### `order_items` (`0004`) — ARQ-05

| Columna | Tipo | Regla |
|---|---|---|
| `id` | `uuid` PK | |
| `order_id` | `uuid` | `not null references orders(id) on delete restrict` |
| `product_id` | `uuid` | `not null references products(id) on delete restrict` |
| `description` | `varchar(200)` | `not null`: nombre del producto + medidas (copia congelada) |
| `pricing_unit` | `pricing_unit` | `not null` (copia congelada) |
| `quantity` | `numeric(10,2)` | `not null check (quantity > 0)`: piezas |
| `width_m`, `height_m` | `numeric(8,2)` | Obligatorios y `> 0` si `pricing_unit = 'M2'`; nulos si `UNIT` (`check`) |
| `billable_qty` | `numeric(12,4)` | `not null`: `quantity` o `quantity × width_m × height_m` |
| `applied_tier` | `pricing_tier` | `not null` |
| `unit_price` | `numeric(10,2)` | `not null`: **congelado** |
| `line_total` | `numeric(10,2)` | `not null`: `round(unit_price × billable_qty, 2)` |

### `payments` (`0004`) — SRS 1.4, solo inserción

| Columna | Tipo | Regla |
|---|---|---|
| `id` | `uuid` PK | |
| `order_id` | `uuid` | `not null references orders(id) on delete restrict` (SRS §2) |
| `amount` | `numeric(10,2)` | `not null check (amount > 0)` |
| `payment_method` | `payment_method` | `not null` |
| `registered_by` | `uuid` | `not null references profiles(id)` |
| `idempotency_key` | `uuid` | `not null unique`: anti doble clic y "resultado incierto" (Spec-Kit §3.2) |
| `created_at` | `timestamptz` | `not null default now()` |

### `order_events` (`0005`) — bitácora (BRD §8 "Audit Trail", BRD regla 4)

| Columna | Tipo | Regla |
|---|---|---|
| `id` | `bigint generated always as identity` PK | |
| `order_id` | `uuid` | `not null references orders(id) on delete restrict` |
| `event_type` | `order_event_type` | `not null` |
| `from_value`, `to_value` | `text` | Estado o fecha anterior / nueva |
| `amount` | `numeric(10,2)` | Solo en `PAYMENT_REGISTERED` |
| `reason` | `text` | Obligatorio en `PRODUCTION_OVERRIDE`, `PROMISED_DATE_CHANGED` y `CANCELLED` |
| `actor_id` | `uuid` | `references profiles(id)` |
| `created_at` | `timestamptz` | `not null default now()` |

Solo inserción, igual que `payments`.

## 1.3 Reglas de integridad en la BD (`0006`)

Todas las funciones con `set search_path = ''` y nombres totalmente calificados.

| Trigger | Evento | Qué hace | Fuente |
|---|---|---|---|
| **T1 `payments_before_insert`** | `BEFORE INSERT ON payments` | `SELECT ... FROM public.orders WHERE id = NEW.order_id FOR UPDATE` (bloqueo de fila); rechaza si el pedido no existe, si está `DELIVERED`/`CANCELLED`, o si `NEW.amount > balance_due` | ARQ-04, SRS §5 |
| **T2 `payments_after_insert`** | `AFTER INSERT ON payments` | `balance_due = total_price − SUM(amount)` del pedido. **Regla de oro** | SRS Trigger 1 |
| **T3 `orders_before_update_delivery`** | `BEFORE UPDATE ON orders` | `IF NEW.status = 'DELIVERED' AND NEW.balance_due > 0 THEN RAISE EXCEPTION 'Operación denegada: El pedido mantiene un saldo deudor de %.', NEW.balance_due` | SRS Trigger 2 (texto literal) |
| **T4 `orders_before_update_transitions`** | `BEFORE UPDATE OF status ON orders` | Solo transiciones válidas (tabla siguiente) | BRD regla 2 |
| **T5 `append_only`** | `BEFORE UPDATE OR DELETE ON payments, order_events` | `RAISE EXCEPTION` siempre | SRS 1.4 |
| T6 `set_updated_at` | `BEFORE UPDATE` en tablas con `updated_at` | `NEW.updated_at = now()` | |

**Transiciones permitidas (T4):**

| De | A | Condición |
|---|---|---|
| `PENDING_DEPOSIT` | `IN_PRODUCTION` | Pagado `>= round(total × deposit_pct / 100, 2)` **o** `production_override = true` |
| `IN_PRODUCTION` | `READY_FOR_DELIVERY` | Ninguna |
| `READY_FOR_DELIVERY` | `DELIVERED` | `balance_due = 0` (también lo valida T3) |
| Cualquiera salvo `DELIVERED` | `CANCELLED` | Ninguna (la RPC exige motivo) |
| Cualquier otra | — | **Rechazada** |

**Errores con código legible.** Toda excepción de negocio usa un código estable que el frontend traduce **sin leer el texto en español** (la lección de A.4 de la app):

```sql
raise exception using errcode = 'P0001', message = 'PF_OVERPAYMENT', detail = 'texto para humanos';
```

| Código | Cuándo |
|---|---|
| `PF_NOT_FOUND` | Pedido, cliente o producto inexistente |
| `PF_FORBIDDEN` | Rol incorrecto, usuario inactivo o fuera de turno |
| `PF_OVERPAYMENT` | Abono mayor al saldo |
| `PF_ORDER_CLOSED` | Abono o cambio sobre un pedido entregado o cancelado |
| `PF_DEPOSIT_REQUIRED` | Pasar a producción sin el anticipo mínimo |
| `PF_INVALID_TRANSITION` | Transición de estado no permitida |
| `PF_BALANCE_DUE` | Entrega con saldo (T3) |
| `PF_ALREADY_DELIVERED` | Doble entrega |
| `PF_REASON_REQUIRED` | Motivo vacío o solo con espacios |
| `PF_INVALID_INPUT` | Validación de parámetros |

## 1.4 Funciones de seguridad (`0007`)

```sql
-- ¿El usuario actual es un ADMIN activo?
create function public.is_admin() returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'ADMIN' and is_active);
$$;

-- ¿Instalador activo y dentro de su turno de 12 h desde el LOGIN? (ARQ-06)
--   activo + role = 'INSTALLER'
--   + now() < to_timestamp((auth.jwt() -> 'amr' -> 0 ->> 'timestamp')::bigint)
--             + interval '12 hours'
create function public.is_installer_on_shift() returns boolean ...
```

> **Verificación obligatoria (DB-13):** confirmar que `amr[0].timestamp` **no se renueva** al refrescar el token. Si se renovara, el plan B es una columna `profiles.shift_started_at` escrita solo por una RPC que se llama justo después de `signInWithPassword`.

`private.generate_folio()`: 6 caracteres de `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` con prefijo `PF-`; reintenta ante colisión.

## 1.5 RLS y privilegios (`0008`)

RLS **activado en todas las tablas**. Además de las políticas, se **revocan privilegios**: RLS sin `REVOKE` deja abiertas columnas y operaciones.

| Tabla | ADMIN | INSTALLER | anon |
|---|---|---|---|
| `business_settings` | SELECT, UPDATE | SELECT | — |
| `profiles` | SELECT de todas; cambios solo por RPC | SELECT **solo de la propia** | — |
| `customers` | SELECT, INSERT, UPDATE (sin DELETE: soft delete) | — | — |
| `products` | SELECT, INSERT, UPDATE (sin DELETE) | — | — |
| `orders` | SELECT (escritura solo por RPC) | — (solo RPC, ARQ-02) | — |
| `order_items` | SELECT | — | — |
| `payments` | SELECT (SRS-RLS-01) | — (SRS-RLS-01) | — |
| `order_events` | SELECT | — | — |

**Funciones:** `revoke execute on function ... from public, anon;` y `grant execute ... to authenticated;` en **todas**. Supabase concede `EXECUTE` a `anon` por defecto sobre las funciones nuevas del esquema `public`; aunque la RPC rechazaría por rol, no se deja abierta.

## 1.6 Catálogo de RPC (`0009`, `0010`)

Todas son `SECURITY DEFINER` con `set search_path = ''`, verifican el rol al inicio y registran en `order_events`.

### Para el panel (requieren `is_admin()`)

| RPC | Parámetros | Hace | Devuelve |
|---|---|---|---|
| `quote_order` | `p_customer_id uuid, p_items jsonb` | Calcula **sin guardar**: precio por partida (regla de mayoreo), total y anticipo mínimo | `jsonb` con partidas, `total` y `deposit_required` (todo el dinero como texto) |
| `create_order` | `p_customer_id, p_items jsonb, p_promised_date timestamptz, p_notes text` | Valida cliente activo, al menos una partida, productos activos, medidas en `M2` y `promised_date > now()`. Calcula con **la misma función interna que `quote_order`**, inserta pedido y partidas con `balance_due = total`, genera folio y registra `CREATED` | `id`, `folio`, `qr_code_hash`, `total_price`, `deposit_required` |
| `register_payment` | `p_order_id, p_amount numeric, p_method payment_method, p_idempotency_key uuid` | Si la clave ya existe, devuelve el pago original (**idempotente**). Si no, inserta (T1 y T2 validan y recalculan) y registra el evento | `payment_id`, `balance_due` (texto) |
| `advance_order_status` | `p_order_id, p_to order_status` | Solo hacia `IN_PRODUCTION` y `READY_FOR_DELIVERY` (T4 valida el anticipo) | `status` |
| `start_production_override` | `p_order_id, p_reason text` | Motivo con `trim() <> ''`; pone `production_override = true` y pasa a `IN_PRODUCTION`. No crea pagos | `status` |
| `reschedule_order` | `p_order_id, p_new_date timestamptz, p_reason text` | Motivo obligatorio; fecha distinta y futura; el evento guarda la fecha anterior y la nueva (BRD regla 4) | `promised_date` |
| `cancel_order` | `p_order_id, p_reason text` | Motivo obligatorio; los pagos se conservan (sin reembolsos en el MVP) | `status` |
| `admin_update_user` | `p_user_id, p_role user_role, p_is_active boolean, p_full_name text` | Un ADMIN **no puede desactivarse ni quitarse el rol a sí mismo** | `profile` |

**Formato de `p_items`:**

```json
[
  { "product_id": "uuid", "quantity": 2, "width_m": 2.00, "height_m": 3.00 },
  { "product_id": "uuid", "quantity": 1000 }
]
```

**Regla de precio por partida** (BRD regla 1):

```
billable_qty = quantity                          si UNIT
             = quantity × width_m × height_m     si M2

tier = WHOLESALE  si customers.pricing_tier = 'WHOLESALE'
                  o (wholesale_min_qty no es nulo y billable_qty >= wholesale_min_qty)
       RETAIL     en otro caso

line_total = round(precio_del_tier × billable_qty, 2)
total      = Σ line_total
deposit    = round(total × deposit_pct / 100, 2)
```

### Para la PWA (requieren `is_installer_on_shift()`)

| RPC | Parámetros | Devuelve | Se mapea a |
|---|---|---|---|
| `get_delivery_info` | `p_qr uuid` | Cero filas si no existe. Si existe: `order_token` (= `qr_code_hash`), `customer_label` (`full_name`), `product_label` (primera partida + "y N más"), `status` y `balance_due::text` | `ScannedOrderDTO` |
| `confirm_delivery` | `p_qr uuid` | `jsonb`: `{ok: true, delivered_at}` o `{ok: false, code: 'ALREADY_DELIVERED' \| 'REJECTED_BY_RULE', reason}` | `ConfirmDeliveryResult` |
| `get_my_route` | `p_filter text` (`'today'` / `'upcoming'`) | `route_token`, `product_label`, `promised_date`. **Ningún campo de dinero** (ARQ-02). Solo `READY_FOR_DELIVERY`, ordenado por `promised_date ASC`. `today` = antes del inicio de mañana en la zona operativa (incluye vencidos); `upcoming` = desde mañana | `RouteItemDTO[]` |

`confirm_delivery` por dentro: `SELECT ... FOR UPDATE` del pedido → si ya está `DELIVERED`, devuelve `ALREADY_DELIVERED`; si no está `READY_FOR_DELIVERY` o `balance_due > 0`, devuelve `REJECTED_BY_RULE`; si todo es correcto, hace el `UPDATE` (T3 vuelve a validar, D-02) y escribe `delivered_at`, `delivered_by` y el evento.

## 1.7 Realtime y vistas (`0011`)

- `alter publication supabase_realtime add table public.orders;`. Realtime respeta RLS, así que **solo el ADMIN** recibe eventos. Como un abono actualiza `orders.balance_due`, también dispara el evento del pedido.
- Vista `active_price_list` (productos activos con ambos precios) para n8n en el futuro (SRS Fase 2, Estado 1). Sin acceso para `anon` ni `authenticated` en el MVP.

## 1.8 Seed (`seed.sql`) — solo desarrollo

- `business_settings` con `deposit_pct = 50` y la zona horaria confirmada en P-05.
- Productos con `sku` que empieza por **`DEMO-`**: al menos uno por categoría, y uno `M2` con umbral de mayoreo.
- Tres clientes ficticios (uno `WHOLESALE`).
- Usuarios: se crean en el dashboard (un ADMIN y un INSTALLER) y el seed los activa con un `update`. **Las credenciales no se guardan en el repo.**

Pedidos de prueba que reproducen los fixtures de Emir, para poder repetir su matriz de 27 filas con datos reales:

| Fixture | Estado | Saldo |
|---|---|---|
| F1 | `READY_FOR_DELIVERY` | 0.00 |
| F2 | `READY_FOR_DELIVERY` | Mayor a 0 |
| F5 | `IN_PRODUCTION` | 0.00 |
| F6 | `DELIVERED` | 0.00 |

> F3 (saldo nulo) y F4 (sobrepago) **no se pueden reproducir con datos reales**: el esquema los hace imposibles (`not null` y `check (balance_due >= 0)`). Es la prueba de que ARQ-04 funciona. Siguen existiendo en el modo mock para probar la UI.

## 1.9 Tareas de la Fase 1

| ID | Tarea | Depende de |
|---|---|---|
| DB-01 | Migraciones `0001`–`0005` (enums y tablas) | P-03 |
| DB-02 | `0006`: triggers T1–T6 y catálogo de errores `PF_*` | DB-01 |
| DB-03 | `0007`: `is_admin`, `is_installer_on_shift`, `generate_folio` y trigger de `auth.users` | DB-01 |
| DB-04 | `0008`: RLS y `REVOKE` de tablas y funciones | DB-03 |
| DB-05 | `0009`: RPC del panel | DB-02, DB-04 |
| DB-06 | `0010`: RPC de la PWA | DB-02, DB-04 |
| DB-07 | `0011`: Realtime y vista | DB-01 |
| DB-08 | `seed.sql` | DB-05 |
| DB-09 | Pruebas `01`–`04`: regla de oro, bloqueo, sobrepago y anticipo | DB-05 |
| DB-10 | Prueba `05`: RLS (instalador sin acceso a `payments` ni `orders`; `anon` sin nada) | DB-04 |
| DB-11 | Prueba `06`: las 3 RPC de la PWA, **incluido que `balance_due` llega como el texto `"0.00"`** | DB-06 |
| DB-12 | Generar tipos (`supabase gen types typescript`) para `printflow-admin` | DB-05 |
| **DB-13** | **Verificar ARQ-06**: la marca `amr` no cambia al refrescar el token | DB-03 |
| **DB-14** | **Prueba de concurrencia del SRS Fase 6 §2.1**: dos sesiones `psql`. En una, `BEGIN; select register_payment(...)` sin `COMMIT`; en la otra, `select confirm_delivery(...)`. La segunda debe **esperar** y, tras el `COMMIT` del pago, entregar con saldo 0 y sin error | DB-05, DB-06 |
| DB-15 | `supabase db push` al proyecto de desarrollo | DB-09 a DB-14 en verde |

### Pruebas mínimas (pgTAP)

| Archivo | Casos |
|---|---|
| `01_regla_de_oro` | Pedido de 500 → abono de 250 → `balance_due = 250.00`; segundo abono de 250 → `0.00` |
| `02_bloqueo_entrega` | `UPDATE status = 'DELIVERED'` con saldo mayor a 0 lanza la excepción del SRS; con saldo 0 desde `READY_FOR_DELIVERY` pasa; desde `IN_PRODUCTION` falla |
| `03_sobrepago` | Abono mayor al saldo → `PF_OVERPAYMENT`; abono de `0` → falla; abono a un pedido `DELIVERED` → `PF_ORDER_CLOSED`; la misma `idempotency_key` dos veces → **un solo** pago |
| `04_anticipo` | Pasar a producción con 49 % → `PF_DEPOSIT_REQUIRED`; con 50 % → pasa; override sin motivo → `PF_REASON_REQUIRED`; con motivo → pasa y deja evento |
| `05_rls` | Como INSTALLER: `select` sobre `payments`, `orders` y `customers` da 0 filas o error; como `anon`: todas las RPC rechazadas; un ADMIN inactivo no tiene acceso |
| `06_rpc_instalador` | QR inexistente → 0 filas; QR válido → campos exactos y `balance_due` como texto; `get_my_route` sin columnas de dinero; `confirm_delivery` dos veces → `ALREADY_DELIVERED` |
| Adicionales | `UPDATE` y `DELETE` sobre `payments` y `order_events` siempre fallan; `reschedule_order` sin motivo falla, y con motivo deja la fecha anterior y la nueva en la bitácora |

### ✅ Cierre de la Fase 1

- [ ] Todas las migraciones se aplican limpias en una BD local vacía (`supabase db reset`)
- [ ] `supabase test db` en verde
- [ ] DB-13 y DB-14 verificados y documentados en el README
- [ ] Ninguna tabla de `public` sin RLS
- [ ] Ninguna función ejecutable por `anon`
- [ ] Aplicado al proyecto de desarrollo

---

# FASE 2 — Panel administrativo (`printflow-admin`)

## 2.1 Stack (SRS Fase 3)

| Capa | Tecnología |
|---|---|
| Base | React + Vite + **TypeScript strict** |
| Estilos | Tailwind con la arquitectura de tokens en tres capas de `printflow-app` (D-13) |
| Estado | Zustand |
| Datos | `@supabase/supabase-js` + tipos de DB-12 |
| Rutas | React Router |
| Fechas | `date-fns` + `@date-fns/tz` (semáforo en la zona operativa, D-08) |
| PDF | `@react-pdf/renderer` |
| QR | `qrcode`: genera la imagen PNG como data URL para incrustarla en el PDF. (`qrcode.react` pinta en el DOM y no funciona dentro de `@react-pdf`) |
| Notificaciones | `react-hot-toast` (SRS Fase 3 §7) |
| Pruebas | Vitest + Testing Library; Playwright para E2E (SRS Fase 6) |

## 2.2 Estructura (SRS Fase 3 §1.1)

```
src/
├── assets/            # logo y tipografías
├── components/        # Button, Modal, Input, Select, Money, StatusBadge, EmptyState
├── features/
│   ├── auth/          # login, guard, reautenticación, inactividad
│   ├── kanban/        # tablero, carriles, tarjeta, semáforo, realtime
│   ├── orders/        # nuevo pedido, detalle, acciones de estado
│   ├── pos/           # modal de cobro
│   ├── supervisor/    # acciones avanzadas
│   ├── pdf/           # remisión + QR
│   ├── customers/
│   ├── products/
│   └── users/
├── hooks/             # useAuth, useOrders, useRealtimeOrders, useSettings
├── layouts/           # AdminShell (sidebar + header + contenido)
├── lib/               # supabaseClient.ts, rpc.ts (llamadas tipadas), errors.ts (mapa PF_*)
├── pages/
├── store/
└── utils/             # money.ts (formato, nunca aritmética), dates.ts (semáforo)
```

## 2.3 Reglas transversales

1. **El panel no calcula dinero.** Totales, anticipos y saldos vienen de la BD (`quote_order`, `balance_due`). `utils/money.ts` solo formatea.
2. **Todo error se traduce por su código `PF_*`** en `lib/errors.ts`, nunca leyendo el mensaje.
3. **Nunca éxito optimista** en operaciones de dinero o de estado: se espera la respuesta de la BD.
4. **Toast en cada mutación**: verde para éxito, rojo para error (SRS Fase 3 §7).
5. **Texto del usuario siempre escapado**: prohibido `dangerouslySetInnerHTML` (SRS Fase 3 §7).
6. **`ErrorBoundary`** global y por carril o sección: nunca una pantalla en blanco (SRS-POS-02).
7. **`data-testid`** en cada control crítico (Spec-Kit §1.8).

## 2.4 Tareas

### ADM-01 · Base del proyecto

Vite + TS strict + Tailwind + tokens, `supabaseClient.ts` (solo la anon key), tipos de DB-12, `AdminShell` (sidebar oscuro, header con el usuario activo, área de contenido), router, `ErrorBoundary` y toasts. `AGENTS.md` con las reglas de §2.3.

### ADM-02 · Autenticación y seguridad (SRS Fase 3 §2)

| Requisito | Implementación |
|---|---|
| Login | `supabase.auth.signInWithPassword()`; después se lee `profiles`. Si no es un ADMIN activo → `signOut()` y "Acceso no autorizado" |
| Rutas protegidas | `<ProtectedRoute requiredRole="ADMIN">`. Otro rol → `/acceso-denegado` sin montar ningún componente financiero |
| Inactividad | 30 min sin `mousemove`, `keydown` ni `click` → `signOut()`, cerrar modales y vaciar de memoria los borradores financieros (Spec-Kit §3.0) |
| Pantalla de pausa | Overlay "Sesión pausada por inactividad" (Brief UI/UX §2.5) |
| Reautenticación | Componente reutilizable: pide la contraseña y la verifica con `signInWithPassword` del mismo email; mensaje genérico ante error |

### ADM-03 · Dashboard Kanban (SRS Fase 3 §3, Spec-Kit §3.1)

- **Carga inicial:** `orders` con `customers(full_name)` y el resumen de `order_items`, excluyendo `CANCELLED`.
- **Cuatro carriles** por `status`; `DELIVERED` colapsado por defecto. Dentro de cada carril, orden por `promised_date ASC`.
- **Tarjeta:** folio, cliente, resumen del producto, fecha pactada, saldo (ADMIN) y semáforo. Acciones: abrir detalle y registrar abono.
- **Semáforo** calculado en la zona operativa (`utils/dates.ts`): `VENCIDO`, `VENCE HOY`, `VENCE MAÑANA`, `EN TIEMPO` y `FECHA INVÁLIDA`. **Con redundancia estructural** (borde de 4 px, barra, borde discontinuo, borde de 1 px + etiqueta), no solo color.
- **Realtime (`useRealtimeOrders`):** suscripción a `postgres_changes` de `orders`. Un `INSERT` agrega la tarjeta; un `UPDATE` la mueve o actualiza el saldo. **Tras cada reconexión se recarga todo**, para cubrir los eventos perdidos.
- **Indicador de conexión** con 4 estados: Conectado / Conectando / Sin tiempo real (con botón "Reconectar") / Error (Spec-Kit §3.1).
- **Filtros** por fecha, estado y búsqueda (folio, cliente o teléfono). Ningún filtro modifica datos.
- **Estados vacío y de error por carril**: un carril con error no derriba el tablero.

### ADM-04 · Alta manual de pedidos (nueva: sustituye al chatbot en el MVP)

Ruta `/pedidos/nuevo`. **Es la pantalla que reemplaza al bot**, así que tiene que ser rápida para alguien que atiende el mostrador.

1. **Cliente:** buscador por teléfono o nombre. Si no existe, alta rápida dentro del mismo flujo (teléfono normalizado a E.164 sin `+`, nombre y tier).
2. **Partidas:** tabla editable. Por fila: producto (selector por categoría), cantidad y, **si el producto es `M2`**, ancho y alto en metros. Se pueden agregar y quitar filas.
3. **Total en vivo:** cada cambio llama a `quote_order` (con una espera de unos 300 ms). Por partida se muestra el tier aplicado (menudeo o mayoreo), el precio unitario y el importe; abajo, el total y el **anticipo mínimo**. **El panel nunca suma.**
4. **Fecha pactada:** `datetime` obligatorio; no puede estar en el pasado (BRD regla 4).
5. **Notas** opcionales.
6. **Guardar:** `create_order`, con el mismo patrón anti doble clic que el cobro. Al terminar se abre el detalle con dos acciones destacadas: **"Registrar anticipo"** y **"Generar remisión"**.

Errores (producto inactivo, medidas faltantes, fecha pasada, cliente inactivo) se muestran junto a su campo, traducidos desde `PF_INVALID_INPUT`.

### ADM-05 · Detalle del pedido

Ruta `/pedidos/:folio`. Muestra:

- **Encabezado:** folio, estado, cliente y teléfono, fecha pactada y semáforo
- **Partidas** con su precio congelado
- **Resumen:** total, abonado y saldo
- **Lista de pagos** con fecha, hora, monto, método y usuario (el "Audit Trail" del BRD §8)
- **Bitácora** (`order_events`)

Acciones según el estado:

| Estado | Acción | RPC |
|---|---|---|
| `PENDING_DEPOSIT` | Pasar a producción (deshabilitado, con el motivo visible, si no se alcanza el anticipo) | `advance_order_status` |
| `IN_PRODUCTION` | Marcar como listo para entrega | `advance_order_status` |
| Cualquiera salvo `DELIVERED` y `CANCELLED` | Registrar abono | ADM-06 |
| Cualquiera | Generar remisión | ADM-08 |
| Cualquiera | Acciones avanzadas | ADM-07 |

### ADM-06 · Modal de cobro (SRS Fase 3 §4, Spec-Kit §3.2)

- **Resumen de solo lectura:** total, abonado y **saldo actual**.
- **Formulario:** `Monto` (decimal, mayor a 0, máximo dos decimales y **no mayor al saldo**: prevención visible; la BD lo garantiza) y `Método` (Efectivo / Transferencia / Tarjeta).
- **Anti doble clic (contrato exacto del Spec-Kit):** en el mismo tick del primer clic, `isSubmitting = true`, botón deshabilitado con spinner y el texto "Registrando abono…", y una guarda que ignora los clics posteriores. Solo se rehabilita si la BD responde con error.
- **`idempotency_key`:** un `crypto.randomUUID()` generado **al abrir** el modal y reutilizado en cada reintento. Así, reintentar tras un "resultado incierto" no duplica el cobro.
- **Resultado incierto** (la red cae después de enviar): el modal no se cierra; se vuelve a consultar el pedido antes de permitir el reintento.
- **Aviso permanente:** *"Las transferencias se verifican manualmente antes de registrarlas"* (BRD §9).
- **Éxito:** se cierra y aparece un toast verde. El nuevo saldo llega por Realtime.

### ADM-07 · Acciones avanzadas — modo supervisor (SRS Fase 3 §6, Spec-Kit §3.4)

Detrás de un botón "Acciones avanzadas" que exige **reautenticación** (ADM-02), en un panel visualmente diferenciado.

| Excepción | En el MVP | Reglas |
|---|---|---|
| **Modificar fecha pactada** | ✅ | Fecha nueva + **"Razón del cambio" obligatoria** (`trim().length > 0`). "Guardar" deshabilitado hasta que ambas sean válidas. El éxito muestra la fecha anterior, la nueva, el motivo y el usuario |
| **Iniciar producción sin anticipo** | ✅ | Motivo obligatorio; no crea pagos ni toca el saldo |
| **Cancelar pedido** | ✅ | Motivo obligatorio |
| **Forzar entrega con saldo** | ❌ ARQ-03 | Botón visible pero **bloqueado**: "No disponible en esta versión" |

### ADM-08 · Remisión PDF con QR (SRS Fase 3 §5, Spec-Kit §3.3)

**Geometría** (Carta, 216 × 279 mm, márgenes de 12 mm):

| Zona | Contenido |
|---|---|
| Header | Logo a la izquierda, datos de emisión a la derecha, y una banda a todo lo ancho: **"FECHA PACTADA DE ENTREGA: DD/MM/AAAA HH:MM"** en letra grande |
| Datos | Folio y cliente |
| Tabla | Descripción · Cant. · P. Unitario · Importe. Encabezado repetido en cada página; nunca se corta una fila |
| Resumen | Subtotal, Anticipos registrados (aunque sean $0.00) y **SALDO PENDIENTE** en negritas con borde de 4 px (en rojo como refuerzo, nunca como única señal) |
| QR | Esquina inferior derecha de la **última página**: caja de 40 × 40 mm con el QR de 32 × 32 mm y zona muda de 4 mm; leyenda "ESCANEAR PARA VALIDAR ENTREGA" |

**Contenido del QR:** el `qr_code_hash` crudo como texto (ARQ-01), con corrección de errores de nivel **M** como mínimo.

**Máquina de estados del Spec-Kit:** `idle → validating_data → rendering_document → encoding_qr → validating_artifact → ready → downloading → ready`, con `error` desde cualquier fase. Spinner con etiqueta por fase; "Descargar" deshabilitado hasta `ready`; un error revoca el blob parcial y cambia el botón a "Regenerar PDF".

**Prueba física obligatoria:** imprimir al 100 % y al 80 %, fotografiar en ángulo y escanear con la PWA. Las tres deben resolver al mismo pedido.

### ADM-09 · Clientes

Lista con búsqueda; alta y edición (teléfono normalizado, nombre, tier y notas). **Desactivar en lugar de borrar**: un cliente inactivo no puede recibir pedidos nuevos, pero conserva su historial.

### ADM-10 · Productos y lista de precios

Lista por categoría; alta y edición de nombre, unidad, precio de menudeo, precio de mayoreo y umbral. **Cambiar un precio no altera los pedidos existentes** (precio congelado). Desactivar en lugar de borrar.

### ADM-11 · Usuarios

Lista de `profiles`: activar o desactivar, cambiar rol y nombre con `admin_update_user`. La **creación** se hace en el dashboard de Supabase (D-10), y la pantalla lo indica con un enlace. Crear usuarios desde el panel requiere una Edge Function con `service_role`; queda para después.

### ADM-12 · Pruebas

| Tipo | Casos |
|---|---|
| Unitarias | Semáforo en la zona operativa (incluido el cambio de día a las 00:00 locales); `money.ts`; mapa de errores `PF_*` |
| Componente | Modal de cobro: un solo envío ante doble clic; se rehabilita solo ante error; conserva la `idempotency_key` |
| E2E (Playwright, contra staging) | Flujo de cobro del SRS Fase 6 §1.3: login → pedido → abono → botón deshabilitado → toast |

### ✅ Cierre de la Fase 2

- [ ] Un INSTALLER que inicia sesión en el panel no ve nada financiero
- [ ] Se puede crear un pedido manual con partidas `UNIT` y `M2`, y el total coincide con el que calcula la BD
- [ ] Un abono con doble clic genera **un solo** pago
- [ ] Un pedido creado o pagado en otra pestaña aparece y se mueve **sin recargar**
- [ ] La remisión impresa se escanea con la PWA
- [ ] Cambiar la fecha exige motivo y queda en la bitácora
- [ ] 30 minutos de inactividad cierran la sesión

---

# FASE 3 — Conexión de la app de Emir (`printflow-app`)

## 3.1 Lo que no cambia

Ninguna pantalla, ni `evaluateDeliveryGuard`, ni `contracts.ts`, ni las pruebas existentes. Toda la conexión vive en la capa de datos, que es exactamente para lo que Emir diseñó `PrintflowGateway`.

## 3.2 APP-01 · Punto de selección del gateway

Hoy **7 archivos importan el mock directamente**:

```
src/features/auth/LoginScreen.tsx
src/features/delivery/BlockedDeliveryPanel.tsx
src/features/delivery/ClearancePanel.tsx
src/features/delivery/DeliveryResultScreen.tsx
src/features/route/MyRouteScreen.tsx
src/features/scanner/ScannerScreen.tsx
src/store/demo.ts
```

1. Crear `src/data/index.ts`, que exporte `gateway: PrintflowGateway` según `import.meta.env.VITE_DATA_SOURCE` (`mock` por defecto, o `supabase`).
2. Cambiar los 6 imports de pantallas para que apunten a `src/data`. **`store/demo.ts` sigue importando el mock**, porque usa sus métodos propios (`setOnline`, `setConfirmMode`…).
3. Con `VITE_DATA_SOURCE=supabase`, la ruta `/demo` **no se registra** y el botón `[DEMO]` no se renderiza: el modo demo es solo para el mock. El aislamiento de A.3 permite hacerlo sin tocar nada más.

## 3.3 APP-02 · `SupabaseGateway`

Archivo `src/data/supabase/supabaseGateway.ts`, que implementa `PrintflowGateway`:

| Método | Llama a | Mapeo |
|---|---|---|
| `signIn(email, password)` | `auth.signInWithPassword` y luego `select` de su `profile` | Rol distinto de `INSTALLER` o inactivo → `signOut()` y error genérico (sin revelar el motivo). `SessionDTO`: `fullName`, `role`, `sessionStartedAt` = marca `amr` del login, `absoluteDeadline` = esa marca + 12 h |
| `scanOrder(payload)` | `rpc('get_delivery_info', { p_qr })` | Un payload que no es UUID → `INVALID_PAYLOAD` **sin llamar a la red**. 0 filas → `NOT_FOUND`. Una fila → `FOUND` con `ScannedOrderDTO` (`balanceDue` ya llega como texto, D-09) |
| `confirmDelivery(orderToken)` | `rpc('confirm_delivery', { p_qr })` | El JSON de la RPC ya tiene la forma de `ConfirmDeliveryResult` |
| `getMyRoute(filter)` | `rpc('get_my_route', { p_filter })` | `routeItemToken`, `productLabel`, `promisedDate` |

**Mapa de errores** (obligatorio, para no repetir el bug de A.5):

| Situación | Resultado para la UI |
|---|---|
| Falla el `fetch`, hay timeout o no hay respuesta HTTP | `NETWORK_ERROR` en el escaneo; excepción de red en lo demás |
| `PF_FORBIDDEN` (inactivo o turno vencido) | `signOut()` + `SessionExpiredModal` |
| Cualquier otro error | `UNKNOWN` o error genérico. **Nunca** se interpreta como autorización |

**Defensa adicional:** validar en `SupabaseGateway` que `balanceDue` cumpla `^-?\d+\.\d{2}$`. Si llega un número u otro formato, devolver `balanceDue: null`, que el guard ya resuelve como `DENY_INDETERMINATE`.

## 3.4 APP-03 · Sesión y cierre

- El `logout()` del store llama también a `supabase.auth.signOut()`.
- El turno de 12 h lo hace cumplir la BD (`PF_FORBIDDEN`); el contador de la UI es solo informativo, como ya pedía el Spec-Kit.
- `NetworkOnly` para el saldo: **ninguna** respuesta de `get_delivery_info` se guarda en caché ni en `localStorage` (SRS Fase 4 §1.2).

## 3.5 APP-04 · Pruebas

| Prueba | Cómo |
|---|---|
| Unitarias de `SupabaseGateway` | Cliente de Supabase simulado: cada fila del mapa de errores; `balanceDue` numérico → `null`; un payload que no es UUID no llama a la red |
| Las 6 pruebas del candado | Siguen en verde con el mock (no se tocan) |
| Manual contra staging | Repetir la matriz de 27 filas con los pedidos semilla F1, F2, F5 y F6 |

### ✅ Cierre de la Fase 3

- [ ] Con `VITE_DATA_SOURCE=mock`, la app se comporta **exactamente** igual que hoy
- [ ] Con `supabase`: el QR real del F2 → pantalla de bloqueo **sin** botón; el F1 → autorización → entrega → el pedido sale de "Mi Ruta" y aparece como `DELIVERED` en el Kanban del panel en tiempo real
- [ ] Un instalador desactivado desde el panel pierde el acceso en su siguiente llamada
- [ ] Ninguna respuesta de red de la app contiene `total_price`, `payments` ni `orders.id` (revisar la pestaña Red del navegador)

---

# FASE 4 — Integración, despliegue y aceptación

| ID | Tarea |
|---|---|
| INT-01 | Desplegar `printflow-admin` y `printflow-app` (con `VITE_DATA_SOURCE=supabase`) en Vercel o Cloudflare Pages, con las variables configuradas en el hosting (SRS Fase 5 §5.1) |
| INT-02 | CI con GitHub Actions: `lint` → `build` → `test` en cada PR de los tres repos (SRS Fase 5 §4) |
| INT-03 | **Flujo dorado E2E** (abajo), en staging y cronometrado |
| INT-04 | Repetir la prueba de concurrencia DB-14 contra staging |
| INT-05 | Prueba física de la remisión: imprimir y escanear desde un celular real, en la calle |
| INT-06 | Crear el proyecto de **producción en plan Pro** con PITR y aplicar las migraciones, sin seed (D-12) |
| INT-07 | Importación del día cero: clientes desde el CSV de Andri con teléfonos normalizados (SRS Fase 1 §7). Sin cuentas por cobrar antiguas |
| INT-08 | UAT con Andri y el dueño (SRS Fase 6 §5) |

### Flujo dorado (criterio de aceptación del MVP)

1. El ADMIN crea un pedido manual —lona de 2 × 3 m para un cliente nuevo, con fecha pactada para mañana—. **Aparece en el Kanban** en `PENDING_DEPOSIT`, marcado `VENCE MAÑANA`.
2. Intenta pasar a producción sin anticipo → **rechazado**, con el motivo visible.
3. Registra el 50 % por transferencia → el saldo baja **sin recargar**; ahora sí pasa a producción.
4. Lo marca como "Listo para entrega" y genera la remisión → PDF con fecha pactada, anticipos, saldo y QR.
5. El INSTALLER escanea el QR → **pantalla de bloqueo sin botón**, con el saldo correcto.
6. El ADMIN registra la liquidación → el instalador revalida → **autorización** → confirma la entrega.
7. El pedido pasa a `DELIVERED` en el Kanban **sin recargar**, y la bitácora muestra cada paso con usuario y hora.

**Debe completarse en menos de 5 minutos y sin errores** (SRS Fase 6 §5).

---

## 5. Riesgos y dependencias

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **El panel es la pieza más grande y aún no existe** | Es la ruta crítica del proyecto | La BD primero; Emir se suma al panel al cerrar sus pendientes (ADM-09, ADM-10 y ADM-11 son buenos candidatos para delegarle) |
| Catálogo y precios reales sin entregar (P-06) | No se pueden cotizar pedidos reales | Seed `DEMO`; la carga real es una tarea de datos, sin código |
| ARQ-06 no se comporta como se espera (DB-13) | El tope de 12 h no se aplica | Plan B ya definido (`shift_started_at`) |
| Proyecto gratuito de Supabase | Se pausa a los 7 días de inactividad y no tiene PITR | Solo para desarrollo; producción en Pro antes de cargar datos reales (D-12) |
| Docker no disponible | Sin BD local para probar los triggers | Las pruebas pgTAP pueden correr contra un proyecto de staging aparte |
| Módulo 4 fuera del MVP | El Objetivo 4 del BRD (mermas) no se cumple en la primera entrega | **Acordarlo por escrito con el cliente** antes de la UAT |

## 6. Orden de ejecución

```
P-01 … P-07
   │
   ▼
DB-01 → DB-02 ──────┐
   │                ├→ DB-05 (RPC panel) ─┬→ DB-08 → DB-09 ─┐
   ├→ DB-03 → DB-04 ┤                     │                 ├→ DB-15 (push)
   │                └→ DB-06 (RPC PWA) ───┼→ DB-11 ─────────┤
   └→ DB-07                               └→ DB-13, DB-14 ──┘
                                                   │
                     ┌─────────────────────────────┴──────────────────┐
                     ▼                                                ▼
      ADM-01 → ADM-02 → ADM-03                        APP-01 → APP-02 → APP-03 → APP-04
                    ├→ ADM-09, ADM-10 → ADM-04 → ADM-05 → ADM-06 → ADM-07 → ADM-08
                    └→ ADM-11                                                │
                                                                             ▼
                                                    INT-01 → INT-03 → INT-05 → INT-08
```

**En paralelo** desde que exista DB-15: el panel (Isaías) y la conexión de la app (Emir), porque solo comparten la BD.

**Primer hito demostrable:** DB-15 + ADM-01 a ADM-06 + APP-01 a APP-03 = crear un pedido, cobrarlo y bloquear o autorizar la entrega con datos reales.

## 7. Convenciones

- Ramas `feat/...` y `fix/...`; PR con revisión; nada directo a `main`.
- **Un cambio de esquema es una migración nueva.** Nunca se edita una migración aplicada.
- Ningún secreto en el repo: `.env` ignorado y la `service_role` fuera de los frontends.
- Commits en español con el ID de la tarea: `feat(DB-05): RPC create_order con cálculo de mayoreo`.
- Cada fase se cierra con su lista de verificación marcada en el PR.
