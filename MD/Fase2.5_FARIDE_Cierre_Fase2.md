# Fase 2.5 — FARIDE · Cierre de la Fase 2

| Campo | Detalle |
|---|---|
| Proyecto | **PrintFlow AI** — Imprenta Escalante |
| Módulo | Fase 8 del SRS — Landing Page Pública |
| Responsable | **Faride** — Frontend / UI-UX |
| Aprueba | **Isaías** — Líder Técnico |
| Repositorio | `printflow-landing` |
| Estructura del trabajo | **3 bloques secuenciales** |
| Fuente de assets | https://www.facebook.com/share/1c7HvhuMmG/ |
| Objetivo | Cerrar la Fase 2 y dejar la landing **presentable al dueño de la imprenta** |

---

## 1. De dónde sale esta tarea

Audité tu entrega de la Fase 2. **El veredicto fue conforme parcial: cuatro de seis etapas completas.**

Y quiero empezar por lo que hiciste bien, porque es bastante:

- **Cero fallos de contraste.** Recorrí los 44 elementos de texto de la página midiendo cada uno contra su fondo real: ni uno solo baja de AA, y el peor está en 5.10:1. Es la mejor accesibilidad del equipo.
- **Los 37 `style=` inline eliminados.** Era la deuda que bloqueaba toda la fase y la cerraste bien.
- **La arquitectura de tokens en dos capas está impecable**, y documentaste cada decisión de color con la medición que la sustenta —descartar blanco sobre naranja por 2.76:1 y usar negro con 6.77:1 es exactamente el criterio correcto.
- **`.surface-inverse`** no te lo pedí y lo resolviste bien. Que el header y el footer oscuros redefinan los tokens semánticos, para que ningún componente tenga que saber sobre qué fondo vive, es justo el objetivo de tener una capa semántica.
- Corriste la auditoría que te pedí, **encontraste que dos versiones previas de tu propio reporte tenían afirmaciones falsas, y las dejaste asentadas por escrito.** Eso es honestidad técnica y se agradece.

Lo que falta es de alcance, no de calidad: **la Etapa 3 —imágenes y logos— no se ejecutó**, y quedaron algunos detalles menores.

### Sobre los assets

Tú reportaste la Etapa 3 como *"bloqueada por assets"* y anotaste en el README que los esperabas de Andri. **Pero los assets ya los teníamos**: están en la página de Facebook del cliente, que es el único material que nos entregó, y eso ya se había comentado. Se te pasó, y como no quedó escrito en el documento, no hubo nada que te lo recordara.

De aquí salen dos correcciones, una para cada quien:

- **Mía:** el enlace no estaba en el documento de Fase 2, solo dicho. **Ya está escrito, en el Bloque 3.** Lo que bloquea trabajo va por escrito, no de palabra.
- **Tuya:** cuando algo te bloquee, **pregunta antes de declararlo bloqueado.** Marcaste la etapa como detenida por un tercero y seguiste con las demás. Un mensaje de una línea —*"¿de dónde saco las imágenes?"*— habría cerrado la fase completa. La Etapa 3 era la más visible de las seis, y es justo la que quedó sin hacer.

No es un reclamo por el resultado: lo que entregaste está bien hecho. Es para que no se repita, porque el costo de preguntar es de un minuto y el de no preguntar fue una etapa entera.

**Los assets están localizados. Ver el Bloque 3.**

---

## 2. Regla permanente de verificación

Sigue vigente y aplica a los tres bloques:

> **Al terminar cada bloque, antes de pasar al siguiente, revisa el estado real de tu código contra lo que el bloque pedía.** Si algo no quedó como se esperaba, algo se rompió sin querer o algo se te pasó, **corrígelo en ese momento.** No lo dejes para el final ni lo reportes como "pendiente".

No des un bloque por terminado porque escribiste el código: dalo por terminado cuando **lo abriste en el navegador, lo recorriste y confirmaste que hace lo que debía.**

Al cerrar cada bloque, **vuelve a correr el prompt de auditoría** (`Prompt_Auditoria_FARIDE.md`) y adjunta el reporte en el PR. Ya lo hiciste una vez y salió bien.

---

# BLOQUE 1 — Deploy y entorno

**Va primero, y no depende de nadie más.**

## Por qué este bloque abre la lista

Es lo que más rendimiento da por lo poco que cuesta:

- Te da una **URL permanente**. Se acaba el *"córrelo en local para verlo"*, que es como hemos estado revisando y no es sostenible.
- Vercel y Cloudflare **redespliegan solos en cada push**. A partir de ahí, todo lo que hagas aparece sin que tengas que avisar.
- Saca a la luz los problemas de entorno —versión de Node, variables— **ahora que cuestan poco**, en lugar de el día que se lo queramos enseñar al dueño.
- Y sin esto no hay presentación posible. No vamos a sentar al cliente frente a una laptop con `npm run dev`.

## 1.1 · Decisión de versión de Node — resuelta

Levantaste esta contradicción y **tenías razón**:

> *"La §4 de Fase 1 pide Astro última versión estable y Node 20 LTS. Con Astro 7 esas dos condiciones son incompatibles: Astro 7.2.2 declara `engines.node >= 22.12.0`."*

**Decisión: nos quedamos en Astro 7 con Node 22.** Node 22 ya es LTS y bajar de versión de Astro por una línea de mi documento no tiene sentido.

Acciones:

- Deja `engines.node` como está
- **Fija la versión de Node en el hosting** para que coincida con tu entorno local (variable `NODE_VERSION` en Cloudflare Pages, o el selector de runtime en Vercel)
- Actualiza la nota del README: ya no es una decisión pendiente, es una decisión tomada
- Corrige el `AGENTS.md`, que todavía dice "Node 20"

## 1.2 · Deploy en preview público

- Conecta el repositorio a **Cloudflare Pages** o **Vercel** (Free Tier, como marca la infraestructura del proyecto)
- Comando de build `npm run build`, directorio de salida `dist`
- **Configura las variables de entorno en el panel del hosting**, no en el repo:
  - `PUBLIC_WHATSAPP_E164` — déjala **vacía** hasta que Andri entregue el número oficial. El estado *Disabled* es el comportamiento correcto y hay que poder demostrarlo
  - `PUBLIC_SITE_URL` — la URL del preview. Es la que necesita Astro para generar `og:url` y la canónica como absolutos
- **Conserva el `<meta name="robots" content="noindex">`.** Sigue siendo lo correcto hasta que el cliente apruebe y exista el dominio real. Ya lo tienes anotado en las tareas de lanzamiento del README; déjalo ahí

## 1.3 · Autohospedar las tipografías *(recomendado, se puede recortar)*

Hoy Anton y Barlow se cargan desde `fonts.googleapis.com`. Está bien hecho —`preconnect`, `display=swap`, solo los pesos usados— pero implica **dos conexiones a un tercero antes de que la página pinte texto con su tipografía final**.

Autohospedarlas (`@fontsource/anton` y `@fontsource/barlow`, o los `.woff2` directamente en `src/assets/`) te da:

- Dos round-trips menos, que se notan en la red móvil donde vive el cliente objetivo
- Mejor LCP, justo la métrica que vas a medir al final
- No enviar la IP de cada visitante a Google

**Si vas justa, este punto se puede posponer.** Los otros dos no.

## 1.4 · Métricas de referencia

Con el sitio ya desplegado, corre **Lighthouse en modo móvil sobre la URL pública** y guarda los resultados. Todavía no hay imágenes, así que los números van a salir altos — **eso es normal y es justo el punto**: es tu línea base. Cuando metas los assets del Bloque 3 vas a poder ver exactamente cuánto costaron.

Objetivo final (después del Bloque 3): Rendimiento ≥90, Accesibilidad ≥95, Mejores prácticas ≥95, LCP <2.5 s, CLS <0.1.

## ✅ Verificación de cierre — Bloque 1

- [ ] El sitio está desplegado y accesible desde una URL pública
- [ ] Un `push` a `main` redespliega automáticamente
- [ ] `PUBLIC_WHATSAPP_E164` está vacía en el hosting y los CTA muestran "Contacto no disponible"
- [ ] El FAB no se renderiza con la configuración vacía
- [ ] `PUBLIC_SITE_URL` está configurada; `og:url` y la canónica **no** apuntan a localhost
- [ ] `noindex` sigue presente
- [ ] La versión de Node del hosting coincide con la local
- [ ] README y `AGENTS.md` actualizados con la decisión de Node
- [ ] Lighthouse móvil ejecutado sobre la URL pública y los cuatro puntajes guardados

---

# BLOQUE 2 — Jerarquía de llamadas a la acción

**Tampoco depende de assets. Va antes de las imágenes, y hay una razón.**

## Por qué antes de las imágenes

**Reducir los CTA cambia el layout de tres secciones.** Si primero metes las fotos y después quitas botones, vas a reacomodar composiciones dos veces. Ajustar una imagen 4:3 dentro de una tarjeta cuyo botón acaba de desaparecer es exactamente el retrabajo que se evita ordenando bien.

## 2.1 · El problema

La página tiene **7 CTA de WhatsApp repartidos en 4 secciones**, y cuatro de ellos mandan exactamente el mismo mensaje genérico:

| # | Ubicación | Texto | Mensaje que envía |
|---:|---|---|---|
| 1 | Header | "Cotizar por WhatsApp" | Cotización general |
| 2 | Hero | "Cotizar por WhatsApp" | Cotización general |
| 3 | Tarjeta 1 | "Cotizar Gran formato" | Gran formato |
| 4 | Tarjeta 2 | "Cotizar Papelería comercial" | Papelería comercial |
| 5 | Tarjeta 3 | "Cotizar Promocionales" | Promocionales |
| 6 | Trust | "Iniciar cotización por WhatsApp" | Cotización general |
| 7 | FAB flotante | "Cotizar por WhatsApp" | Cotización general |

**El problema no es la cantidad, es la redundancia.** Los tres CTA de tarjeta están perfectos: cada uno manda un `service_id` distinto y le ahorra al cliente tener que explicar qué quiere. Los otros cuatro dicen lo mismo, y los del **header y el hero son visibles al mismo tiempo, en la misma pantalla, con el mismo texto y el mismo naranja**.

Eso produce dos efectos, los dos malos:

1. **Se aplana la jerarquía.** Cuando todo es un botón naranja que dice lo mismo, ninguno destaca. El ojo deja de saber cuál es el importante.
2. **Se lee como insistencia.** Un sitio que te persigue con el mismo botón cada vez que haces scroll transmite desesperación por vender, no profesionalismo. Y estamos vendiendo confianza: el negocio pide un anticipo del 50% por adelantado.

## 2.2 · Objetivo: bajar de 7 a 4 sin perder cobertura

| CTA | Decisión |
|---|---|
| **Hero** | **Se queda.** Es el CTA principal de la página. Tratamiento primario |
| **3 tarjetas** | **Se quedan.** Son los más valiosos: mandan contexto al bot |
| **FAB flotante** | **Se queda.** Es la red de seguridad para quien ya decidió y no quiere buscar |
| **Header** | **Conviértelo en "Ver servicios"** (ancla interna a `#servicios`) o quítalo |
| **Trust** | **Quítalo, o cámbiale el rol** — ver abajo |

**Sobre el del header:** hoy compite directamente con el del hero estando los dos en pantalla. Convertirlo en "Ver servicios" resuelve el conflicto y además le da al visitante indeciso un camino que no es "escríbeme ya".

Si prefieres conservarlo como CTA de WhatsApp, **cámbiale el tratamiento visual a secundario** (contorno en lugar de relleno) para que no compita con el principal. Lo que no puede quedarse es como está.

**Sobre el de trust:** está a menos de 200 px del FAB, que hace exactamente lo mismo. Tienes dos opciones y las dos me parecen bien:

- Quitarlo, y dejar que el FAB cubra esa zona
- Conservarlo pero **cambiándole el mensaje**: en lugar de "Cotización general", que mande algo alineado con la sección donde vive, por ejemplo *"Tengo dudas sobre el anticipo"*. Así deja de ser redundante y pasa a resolver la objeción concreta que ese bloque plantea

**La decisión de cuál usar es tuya.** Documenta cuál elegiste y por qué.

## 2.3 · Corregir la trazabilidad del `placement`

El CTA del header manda `placement=hero`, igual que el del hero. **Los dos reportan lo mismo**, así que en el chatbot es imposible distinguir de dónde vino el cliente.

Eso rompe la medición del embudo que pide la §4 de la Fase 8 del SRS.

**La culpa es mía:** la allowlist que definí en la Fase 1 era `hero | catalog | fab | trust` y no contemplé el header. Tú te ajustaste a la allowlist, que es lo que debías hacer.

**Corrección:** amplía el tipo `Placement` en `src/lib/whatsapp.ts` para incluir `header`, y úsalo en `Header.astro`.

> **Si tras el punto 2.2 el CTA del header desaparece o se convierte en un ancla interna, este punto se cierra solo.** Resuelve primero la jerarquía y después revisa si todavía hace falta.

## ✅ Verificación de cierre — Bloque 2

- [ ] La página tiene **4 CTA de WhatsApp**, no 7
- [ ] No hay dos CTA con el mismo texto visibles al mismo tiempo en ninguna resolución
- [ ] Cada CTA que quedó tiene un `placement` distinto y correcto
- [ ] Los tres CTA de tarjeta siguen mandando su `service_id` específico
- [ ] Documentaste qué decidiste para el CTA de trust y por qué
- [ ] Los `data-testid` de los CTA que se conservan **no cambiaron**
- [ ] El estado *Disabled* sigue funcionando en todos ellos con el número vacío
- [ ] Con JavaScript desactivado, los enlaces siguen funcionando

---

# BLOQUE 3 — Assets: imágenes y logos

**Este es el que convierte el prototipo en algo presentable.**

## 3.1 · Dónde están los assets

Todo el material visual de la imprenta está en la página de Facebook que nos pasó el cliente:

**https://www.facebook.com/share/1c7HvhuMmG/**

Es **lo único que el cliente nos entregó**, así que de ahí sale todo: logotipo, fotografías de trabajos y colores de referencia. *(La paleta ya la extrajiste bien en la Etapa 1; este bloque es por las imágenes y el logo.)*

> **Guarda este enlace.** Es la misma fuente que está usando Emir para la app móvil, y es la única que tenemos. Si en algún momento necesitas algo que no esté ahí, pídelo antes de darlo por perdido.

**Tú eliges cuáles usar.** Entra, revisa lo que hay y selecciona las que consideres adecuadas para cada sección. **Puedes editarlas, recortarlas y ajustarlas** —de hecho vas a tener que hacerlo, porque las tarjetas de servicio necesitan relación 4:3 y las fotos de redes sociales casi nunca vienen así.

## 3.2 · Qué necesitas cubrir

| Ubicación | Qué va |
|---|---|
| Header | Logotipo |
| Footer | Logotipo (puede ser variante clara, ver 3.4) |
| Hero | Una imagen de impacto que represente a la imprenta |
| Tarjeta "Gran formato" | Lonas, viniles, rotulación, espectaculares |
| Tarjeta "Papelería comercial" | Tarjetas de presentación, flyers, folletos |
| Tarjeta "Promocionales" | Artículos publicitarios con marca |
| Vista previa social | Imagen de 1200×630 (ver 3.5) |
| Favicon | Derivado del logotipo |

**Criterio de selección:** prioriza fotos de **trabajos reales terminados**, sobre todo instalados o en uso. Una lona colgada en una fachada vende mucho más que la misma lona enrollada sobre una mesa. Si una categoría no tiene buena foto disponible, dímelo antes de rellenar con algo que no represente el servicio.

## 3.3 · Reglas al tomar los assets

- **Solo material de la propia imprenta.** Nada de fotos de terceros, stock ajeno ni imágenes que aparezcan en la página pero no sean suyas.
- **Nada de incrustar contenido de Facebook.** No embebas publicaciones, no cargues imágenes desde el dominio de Facebook, no metas píxeles ni scripts de seguimiento. **Descarga los archivos y guárdalos en `src/assets/`.**
- **Si el logotipo sale de baja resolución o con el fondo quemado**, no lo uses así ni intentes repararlo a mano: **pídele a Andri el archivo original**, idealmente vectorial (`.svg`, `.ai` o `.pdf`). Un logo pixelado en el header arruina la percepción de todo lo demás, y esto se le va a enseñar al dueño.
- **Editar y recortar está permitido y esperado.** Lo que no está permitido es deformar: si una foto no da el 4:3, se recorta, nunca se estira.

## 3.4 · Reglas técnicas *(estas no cambian)*

Siguen vigentes de la Etapa 3 del documento de Fase 2:

1. **Todas las imágenes pasan por `astro:assets` con `<Image />`.** Nunca un `<img>` crudo desde `public/`; perderías toda la optimización.
2. **`width` y `height` explícitos siempre.** Sin ellos el navegador no reserva el espacio y la página salta al cargar. Ese salto arruina el CLS y se nota muchísimo en celular.
3. **Hero:** `loading="eager"` y `fetchpriority="high"` — es lo que mide el LCP. **Todo lo demás:** `loading="lazy"`.
4. **Relación 4:3 en las tarjetas de servicio**, recortando con `object-fit: cover`. El layout no cambia.
5. **`alt` descriptivo y específico.** No `alt="lona"`, sino *"Lona publicitaria de gran formato instalada en fachada comercial"*.
6. **Máximo 200 KB por imagen** ya optimizada, y **la página completa bajo 1 MB** en la primera carga. Hoy el build pesa 57 KB; tienes margen, pero no es infinito.
7. **El logotipo debe verse bien sobre el header y el footer oscuros.** Tu `.surface-inverse` ya resuelve el color del texto; el logo necesita su propia solución — variante clara, `currentColor` si es SVG, o un filtro.

## 3.5 · Vista previa social

Con el logo y una foto ya disponibles, genera la imagen de **1200×630** y pásala como `ogImage` a `BaseLayout`.

Tu razonamiento para omitirla fue correcto —declarar una ruta inexistente es peor, porque WhatsApp cachea el fallo— pero ahora ya no hay razón para omitirla.

**Importa más de lo que parece:** esta landing se va a compartir **por WhatsApp**, que es literalmente el canal del negocio. El dueño va a mandar el enlace a sus clientes por ahí. Con imagen se ve como un negocio establecido; sin ella, como un enlace sospechoso.

## 3.6 · Verifica el desbordamiento del logo

En 320 y 375 px, el texto del placeholder `[LOGO PLACEHOLDER — NO ASSET REAL]` mide 94×67 px dentro de una caja de 112×32 px y **se sale 5 px por debajo del header**.

Debería desaparecer solo al entrar el logo real, pero **confírmalo midiendo** en esas dos anchuras. Si el logo real también se desborda, es un problema de la caja y hay que arreglarlo.

## 3.7 · Vuelve a medir el rendimiento

Las imágenes son lo que más puede dañar el rendimiento. Con los assets ya integrados, **repite Lighthouse móvil sobre la URL pública** y compáralo contra la línea base del Bloque 1.

Si algún puntaje se cayó por debajo del objetivo, es casi seguro por peso de imagen: comprime más, recorta dimensiones o revisa que el `lazy` esté bien puesto. **No entregues con los umbrales en rojo.**

## ✅ Verificación de cierre — Bloque 3

- [ ] **Cero placeholders** en toda la página
- [ ] Los assets están **descargados dentro del repositorio**, no enlazados a Facebook
- [ ] Cero scripts, píxeles o recursos externos de Facebook en el proyecto
- [ ] Todas las imágenes pasan por `astro:assets` con `width` y `height`
- [ ] Hero con `eager` + `fetchpriority="high"`; el resto con `lazy`
- [ ] Todos los `alt` son descriptivos y específicos
- [ ] Ninguna imagen supera 200 KB; la página completa bajo 1 MB
- [ ] Las tarjetas conservan 4:3; ninguna imagen está deformada
- [ ] El logo se ve correctamente sobre el header y el footer oscuros
- [ ] `og:image` de 1200×630 configurada, y pegar la URL en un chat muestra la tarjeta completa
- [ ] Favicon real
- [ ] Con red lenta simulada, **la página no salta** al cargar imágenes
- [ ] El logo no se desborda del header en 320 ni 375 px
- [ ] Lighthouse móvil cumple los cuatro umbrales
- [ ] Contraste: sigue en **cero fallos** (verifícalo otra vez; el texto sobre imagen es donde más se falla)

---

## 3. Lo que NO se toca

1. La estructura de secciones y su orden
2. El grid de 8 puntos y las alturas de header (56 px móvil / 72 px escritorio)
3. El contenedor máximo de 1344 px
4. Las 9 reglas del FAB
5. El formato de los deep links y la allowlist de `service_id`
6. La copy del H1, el subtítulo, la política de anticipos y los tres pasos
7. La arquitectura de tokens en dos capas
8. La ausencia de backend: cero `fetch`, cero formularios, cero captura de datos personales
9. Los `data-testid` de los CTA que se conservan

---

## 4. Cómo entregar

En el Pull Request incluye:

1. **La URL del preview desplegado**
2. Lighthouse móvil: la línea base del Bloque 1 y la final del Bloque 3, para comparar
3. El reporte de auditoría actualizado (corre el prompt otra vez)
4. Qué decidiste para el CTA del header y el de trust, con tu razón
5. Qué imágenes elegiste para cada sección
6. Las listas de verificación de los tres bloques, marcadas

Dudas de **marca, logotipo oficial o si una foto se puede usar** → Andri.
Dudas de **estructura, alcance, rendimiento o arquitectura** → Isaías.

---

## 5. Contexto para tu asistente de IA

Agrega esta sección a tu `AGENTS.md` y **corrige la línea que dice "Node 20"**:

```markdown
## Fase 2.5 — Cierre de Fase 2

Tres bloques secuenciales: 1) deploy y entorno, 2) jerarquía de CTA, 3) assets.
No saltarse el orden: reducir los CTA cambia el layout de tres secciones, y
hacerlo después de meter imágenes obliga a reacomodar dos veces.

## Decisiones tomadas
- Stack: Astro 7 con Node 22 (NO Node 20; Astro 7.2.2 exige >=22.12.0).
- El sitio se despliega en Cloudflare Pages o Vercel con redeploy automático.
- PUBLIC_WHATSAPP_E164 se queda VACÍA hasta que Andri entregue el número.
  El estado Disabled es el comportamiento correcto, no un bug.
- El meta robots noindex SE CONSERVA hasta que el cliente apruebe.

## Bloque 2 — CTA
La página debe quedar con 4 CTA de WhatsApp, no 7: hero, tres tarjetas y FAB.
El del header pasa a ser "Ver servicios" (ancla interna) o se le da tratamiento
secundario. El de trust se quita o cambia de mensaje para no ser redundante.
Ampliar el tipo Placement en src/lib/whatsapp.ts para incluir 'header' si el
CTA del header sobrevive como enlace a WhatsApp.
Nunca dos CTA con el mismo texto visibles al mismo tiempo.

## Bloque 3 — Assets
Los assets salen de la página de Facebook del cliente que indicó Isaías.
Se DESCARGAN a src/assets/. Prohibido enlazar, embeber o cargar cualquier cosa
desde Facebook, y prohibido incluir sus scripts o píxeles de seguimiento.
Se pueden editar y recortar; NUNCA deformar. Las tarjetas van en 4:3 con
object-fit: cover.
Todas las imágenes por astro:assets con <Image />, width y height explícitos.
Hero: eager + fetchpriority="high". El resto: lazy.
alt descriptivo y específico, nunca genérico.
Máximo 200 KB por imagen; página completa bajo 1 MB.
El logo debe funcionar sobre el header y el footer oscuros.
og:image de 1200x630 pasada como ogImage a BaseLayout.

## Verificación
Al cerrar cada bloque: abrir el sitio, recorrerlo y confirmar. Correr el prompt
de auditoría (Prompt_Auditoria_FARIDE.md) y adjuntar el reporte en el PR.
El contraste debe seguir en CERO fallos: el texto sobre imagen es donde más
se falla, así que hay que volver a medirlo después del Bloque 3.
```

---

## 6. Resumen de la secuencia

| Orden | Bloque | Resultado esperado | ¿Depende de terceros? |
|---:|---|---|---|
| 1 | **Deploy y entorno** | URL pública con redeploy automático, Node resuelto, línea base de Lighthouse | No |
| 2 | **Jerarquía de CTA** | 4 CTA en lugar de 7, `placement` trazable | No |
| 3 | **Assets** | Cero placeholders, `og:image`, rendimiento verificado | Solo si el logo sale de baja resolución |

**Punto de control conmigo al terminar el Bloque 2.** Quiero ver la jerarquía de CTA resuelta antes de que integres las imágenes: si hay que ajustar algo de la composición, es mucho más barato decírtelo con las cajas vacías que con diez fotos encima.

El plazo te lo doy por separado.

---

## 7. Nota final

Esta fase es corta y casi todo depende de ti sola. El Bloque 1 te desbloquea a ti misma —tener una URL cambia por completo cómo revisamos—, el Bloque 2 es criterio de diseño, y el Bloque 3 es el que hace que esto se pueda enseñar.

Y quiero cerrar donde empecé: **la base que construiste está bien hecha.** Los tokens, el contraste, la estructura de componentes y la documentación están listos para recibir los assets sin pelear. Falta ponerlos.

Cuando termines, esto se le enseña al dueño de la imprenta. Que se vea como un producto terminado.
