# Auditoría — FARIDE · Landing Page, entrega de Fase 2

| Campo | Detalle |
|---|---|
| Auditor | **Isaías** — Líder Técnico |
| Auditado | `printflow-landing` — entrega de Fase 2 |
| Referencia | `Fase2_FARIDE_Landing_Identidad_Visual.md` y `Fase1_FARIDE_Landing_UI.md` |
| Método | Lectura del código fuente + ejecución del sitio + medición en navegador + `npm run build` + revisión del historial de commits |
| Veredicto | **CONFORME PARCIAL** — 4 de 6 etapas completas, 1 sin ejecutar, 1 parcial. 8 hallazgos: 1 alto, 3 medios, 4 bajos |

---

## 1. Veredicto ejecutivo

**La calidad del trabajo entregado es alta.** Las Etapas 0, 1, 2 y 4 están completas y en varios puntos superan lo que pedí: la arquitectura de tokens en dos capas está impecable, el contraste no falla en un solo elemento de toda la página, y documentó por escrito cada decisión de color con la medición que la sustenta.

**Pero la Etapa 3 —imágenes y logos— no se ejecutó.** La página sigue mostrando **seis placeholders grises**, no hay ni un solo elemento `<img>`, y no existe `src/assets/`. Eso es bloqueante para el objetivo declarado de la fase, que era **presentarle avances al dueño de la imprenta**. Una landing de una imprenta sin una sola imagen de sus trabajos no se puede enseñar como avance.

La causa quedó aclarada: **los assets sí estaban disponibles** —en la página de Facebook del cliente, la misma fuente que usa Emir— pero el enlace se comunicó de palabra y no quedó escrito en el documento, y ella declaró la etapa bloqueada sin preguntar. Ver F-01.

---

## 2. Conformidad por etapa

| Etapa | Estado | Evidencia |
|---|---|---|
| **0 — Cierre de deudas** | ✅ **Completa** | Repo entregado con `src/`, `.gitignore`, `.env.example`, `AGENTS.md`, `README.md`. Los **37 `style=` inline eliminados** (verifiqué: 0 resultados). Deep links verificables en ambos estados |
| **1 — Sistema de color** | ✅ **Completa, sobresaliente** | Dos capas en `tokens.css`, contexto `.surface-inverse`, contraste medido y documentado |
| **2 — Tipografía** | ✅ **Completa** | Anton + Barlow, `display=swap`, `preconnect`, solo los pesos usados, escala tokenizada, stacks de respaldo reales |
| **3 — Imágenes y assets** | ❌ **No ejecutada** | 0 elementos `<img>`, 6 placeholders visibles, sin `src/assets/`, sin `astro:assets`, sin `og:image` |
| **4 — Refinamiento visual** | ✅ **Completa** | `--radius-*`, `--shadow-*`, `--duration-*` tokenizados; `prefers-reduced-motion` implementado |
| **5 — QA final** | ⚠️ **Parcial** | Ejecutó la auditoría que le pedí y la commiteó (`MD/Auditoria_Etapa0_Resultado.md`, 188 líneas). **Falta el deploy en preview público y las métricas de Lighthouse** |

### 2.1 Verificación mecánica independiente

Corrí las comprobaciones del prompt de auditoría por mi cuenta:

| Comprobación | Resultado |
|---|---|
| Hexadecimales o `rgb()` fuera de `tokens.css` | **0** ✅ |
| Atributos `style=` con color en componentes | **0** ✅ |
| `console.log`, `TODO`, `FIXME` reales | **0** ✅ |
| `npm run build` | Limpio, 1.56 s, **57 KB** total ✅ |
| Deep links de WhatsApp | **7/7 con formato, encoding y `service_id` correctos** ✅ |
| Estado *Disabled* con número vacío | Funciona ✅ |
| Scroll horizontal a 320 px | Ninguno ✅ |
| Elementos desbordados a 320 px | Ninguno ✅ |
| FAB a 320 px | 56×56 px, 16 px de cada borde, sin recorte ✅ |
| `prefers-reduced-motion` | Implementado ✅ |

### 2.2 Contraste — medición completa

Recorrí los **44 elementos de texto visibles** de la página y calculé el ratio de cada uno contra su fondo real:

```
elementosMedidos: 44
fallosAA:          0
peorRatio:         5.10:1   (mínimo exigido: 4.5:1)
```

**Cero fallos.** Y no fue suerte: en su reporte documenta que midió 18 combinaciones y descartó dos por no cumplir —blanco sobre naranja daba 2.76:1, así que el CTA primario usa negro sobre naranja con 6.77:1— y que subió el borde deshabilitado de `neutral-300` (1.34:1) a `neutral-500` (7.03:1).

**Esto está mejor resuelto que en la app de Emir**, donde sí encontré un fallo de contraste.

### 2.3 El detalle que más me gustó: `.surface-inverse`

No se lo pedí y lo resolvió bien. El header y el footer son oscuros, así que creó una clase que **redefine los tokens semánticos dentro de ese contexto**:

```css
.surface-inverse {
  --ink-strong: var(--neutral-0);
  --surface-1: var(--neutral-900);   /* si no, un placeholder claro heredaría tinta clara */
  --focus-ring: var(--brand-500);    /* el foco negro desaparecería sobre fondo negro */
  ...
}
```

El resultado es que **ningún componente tiene que saber si está sobre fondo claro u oscuro**. Es exactamente el objetivo de tener una capa semántica, y lo aplicó por iniciativa propia.

---

## 3. Hallazgos

### F-01 · [ALTO] La Etapa 3 no se ejecutó: cero imágenes y cero logos

**Estado verificado:**

```
elementos <img>:  0
placeholders:     6  →  [LOGO PLACEHOLDER — NO ASSET REAL]  ×2
                        [IMAGEN HERO — PLACEHOLDER]         ×1
                        [IMAGEN SERVICIO 4:3 — PLACEHOLDER] ×3
carpeta src/assets/: no existe
uso de astro:assets: ninguno
og:image:            ausente
```

El historial de commits lo confirma: hay commits para las Etapas 0, 1, 2 y 4, y **ninguno para la Etapa 3**.

**Por qué es alto:** el objetivo declarado de la Fase 2 era *"prototipo visualmente terminado y profesional, listo para presentarle avances al dueño de la imprenta"*. Una landing de una **imprenta** —un negocio que vende exactamente aquello que se ve— con seis cajas grises donde deberían ir sus lonas, sus tarjetas y su logotipo, no cumple ese objetivo. El color y la tipografía están bien, pero la página sigue leyéndose como una maqueta.

**Causa — aclarada:**

Su reporte declara la Etapa 3 como *"parcial, bloqueada por assets"*, y en el README dejó anotado: *"Sustituir los placeholders de logo e imágenes por los assets reales (Andri)"*.

**Pero los assets sí estaban disponibles.** Están en la página de Facebook del cliente —https://www.facebook.com/share/1c7HvhuMmG/—, que es el único material que nos entregó, y eso ya se le había comentado. Es la misma fuente que está usando Emir para la app móvil.

Dos causas concurrentes:

| Causa | Responsable |
|---|---|
| El enlace se comunicó de palabra, pero **no quedó escrito en el documento de Fase 2** | Isaías |
| Declaró la etapa bloqueada por un tercero **sin preguntar** dónde estaban los assets, y siguió con las demás | Faride |

**Ninguna de las dos justifica la otra.** Lo que bloquea trabajo tiene que quedar por escrito, y un bloqueo tiene que levantarse preguntando antes de darse por detenido — sobre todo cuando afecta a la etapa más visible de la fase.

**Acción:** el enlace ya quedó documentado en `Fase2.5_FARIDE_Cierre_Fase2.md`, Bloque 3. La etapa se ejecuta ahí.

---

### F-02 · [MEDIO] Saturación de llamadas a la acción

La página tiene **7 CTA de WhatsApp en 4 secciones**, y cuatro de ellos dicen prácticamente lo mismo:

| # | Ubicación | Texto | Mensaje que envía |
|---:|---|---|---|
| 1 | Header | "Cotizar por WhatsApp" | Cotización general |
| 2 | Hero | "Cotizar por WhatsApp" | Cotización general |
| 3 | Tarjeta 1 | "Cotizar Gran formato" | Gran formato |
| 4 | Tarjeta 2 | "Cotizar Papelería comercial" | Papelería comercial |
| 5 | Tarjeta 3 | "Cotizar Promocionales" | Promocionales |
| 6 | Trust | "Iniciar cotización por WhatsApp" | Cotización general |
| 7 | FAB flotante | "Cotizar por WhatsApp" | Cotización general |

**El problema no es la cantidad, es la redundancia.** Los tres CTA de tarjeta están perfectos: cada uno manda un `service_id` distinto y le ahorra al cliente explicar qué quiere. Los otros cuatro mandan exactamente el mismo mensaje genérico, y dos de ellos —header y hero— son visibles **al mismo tiempo, en la misma pantalla**, con el mismo texto y el mismo color.

Eso produce dos efectos, ambos malos:

1. **Fatiga de decisión.** Cuando todo es un botón naranja que dice lo mismo, ninguno destaca. La jerarquía visual se aplana.
2. **Se lee como insistencia.** Un sitio que te persigue con el mismo botón cada vez que haces scroll transmite desesperación por vender, no profesionalismo.

**Corrección sugerida — bajar de 7 a 4 sin perder cobertura:**

| CTA | Decisión |
|---|---|
| **Hero** | **Se queda.** Es el CTA principal de la página |
| **3 tarjetas** | **Se quedan.** Son los más valiosos: mandan contexto al bot |
| **FAB flotante** | **Se queda.** Es la red de seguridad para quien ya decidió |
| **Header** | **Cambiar a "Ver servicios"** (ancla interna) o quitarlo. Compite con el hero estando ambos en pantalla |
| **Trust** | **Quitarlo o cambiar el rol.** Está a 200 px del FAB, que hace lo mismo |

Si prefiere conservar el del header, que al menos **cambie su tratamiento visual** —secundario en lugar de primario— para que no compita con el del hero.

---

### F-03 · [MEDIO] El CTA del header rompe la trazabilidad del embudo

El botón del header manda `placement=hero`:

```
cta-header-whatsapp  →  ...placement=hero
cta-hero-whatsapp    →  ...placement=hero
```

**Los dos reportan lo mismo**, así que en el chatbot es imposible saber si el cliente entró desde el header o desde el hero.

Eso importa porque la §4 de la Fase 8 del SRS pide medir la tasa de conversión del embudo. Si dos orígenes distintos se reportan igual, la métrica pierde resolución justo donde F-02 dice que hay que tomar una decisión: **no vamos a poder saber si el CTA del header aporta algo o solo estorba.**

**Aclaración de responsabilidad:** el error es mío. La allowlist que definí en la Fase 1 era `hero | catalog | fab | trust` y **no contemplé el header**. Ella se ajustó a la allowlist, que es exactamente lo que debía hacer.

**Corrección:** ampliar la allowlist a `header` en `src/lib/whatsapp.ts` y usarlo en `Header.astro`. Si tras F-02 el CTA del header desaparece, este hallazgo se cierra solo.

---

### F-04 · [MEDIO] Sin imagen de vista previa social

`og:image` está ausente. Al pegar el enlace en un chat, sale una tarjeta sin imagen.

**Importa más de lo que parece:** esta landing se va a compartir **por WhatsApp**, que es literalmente el canal del negocio. El dueño va a mandar el enlace a sus clientes por ahí. Una tarjeta con logo y foto se ve como un negocio establecido; un rectángulo gris se ve como un enlace sospechoso.

**A su favor:** lo dejó implementado de forma condicional y documentó por qué lo omitió:

> *"Mientras Andri no entregue el asset de marca, se omite: es preferible no declarar `og:image` a declarar una ruta que no existe, porque WhatsApp cachea el fallo."*

**Ese razonamiento es correcto** —WhatsApp efectivamente cachea las vistas previas fallidas y cuesta trabajo purgarlas—. El hueco no es de criterio, es de asset. Se cierra junto con F-01.

---

### F-05 · [BAJO] El placeholder del logo se desborda del header en móvil

En 320 y 375 px, el texto `[LOGO PLACEHOLDER — NO ASSET REAL]` mide 94×67 px dentro de una caja de 112×32 px, y **se sale 5 px por debajo del header**. Se ve cortado.

Es un problema **exclusivo del placeholder**: desaparece solo en cuanto entre el logo real. Lo anoto para que no se le olvide verificarlo después de F-01, no como algo a arreglar por separado.

---

### F-06 · [BAJO] Falta el deploy en preview público

La Etapa 5 pedía *"Deploy en Cloudflare Pages o Vercel con URL pública"*. No hay URL. Hoy el sitio solo corre en local.

Sin eso no puedo verificar Lighthouse en condiciones reales, y **no le podemos enseñar nada al cliente**: no vamos a sentar al dueño de la imprenta frente a una laptop con `npm run dev`.

---

### F-07 · [BAJO] Las tipografías se cargan desde el CDN de Google

`BaseLayout.astro` carga Anton y Barlow desde `fonts.googleapis.com`. Está bien hecho —`preconnect` a los dos dominios, `display=swap`, solo los pesos usados— pero implica **dos conexiones externas antes de que la página pueda pintar texto con su tipografía final**.

**Mejora sugerida, no defecto:** autohospedar las fuentes (`@fontsource/anton` y `@fontsource/barlow`, o los `.woff2` en `src/assets/`). Beneficios: elimina dos round-trips a un tercero, mejora el LCP en red móvil —que es donde vive el cliente objetivo— y evita enviar la IP del visitante a Google, cosa que en Europa sería un problema legal y aquí simplemente es mejor práctica.

---

### F-08 · [BAJO] Decisión pendiente: Node 20 vs Astro 7

Ella levantó correctamente una contradicción de mi documento:

> *"La §4 de Fase 1 pide Astro última versión estable y Node 20 LTS. Con Astro 7 esas dos condiciones son incompatibles: Astro 7.2.2 declara `engines.node >= 22.12.0`."*

**Tiene razón y la decisión es mía.** Hay que cerrarla antes del deploy, porque el runtime del hosting tiene que coincidir. Mi recomendación: **quedarse en Astro 7 con Node 22**; Node 22 ya es LTS y bajar de versión de Astro por una línea de un documento no tiene sentido.

---

## 4. Resumen de hallazgos

| ID | Severidad | Hallazgo | ¿De quién depende? |
|---|---|---|---|
| **F-01** | **ALTO** | Etapa 3 sin ejecutar: cero imágenes y logos | Faride (assets ya localizados) |
| F-02 | MEDIO | Saturación de CTA: 7 en 4 secciones, 4 redundantes | Faride |
| F-03 | MEDIO | El CTA del header reporta `placement=hero` | Isaías (allowlist) + Faride |
| F-04 | MEDIO | Sin `og:image` | Se cierra con F-01 |
| F-05 | BAJO | El placeholder del logo se desborda en móvil | Se cierra con F-01 |
| F-06 | BAJO | Falta deploy en preview público | Faride |
| F-07 | BAJO | Fuentes desde CDN externo | Faride (mejora) |
| F-08 | BAJO | Node 20 vs Astro 7 | **Isaías** |

**Orden recomendado:**

Se ejecuta en `Fase2.5_FARIDE_Cierre_Fase2.md`, en tres bloques:

1. **Bloque 1** — F-08 (decisión de Node) y F-06 (deploy). No depende de nadie y desbloquea la revisión
2. **Bloque 2** — F-02 y F-03. Va antes de las imágenes: reducir los CTA cambia el layout de tres secciones
3. **Bloque 3** — F-01, y con él se cierran F-04 y F-05

F-07 queda como mejora opcional dentro del Bloque 1.

---

## 5. Valoración final

El trabajo de código de Faride es de buena calidad y en algunos aspectos es el mejor del equipo: **cero fallos de contraste en 44 elementos**, arquitectura de tokens limpia, decisiones documentadas con la medición que las respalda, y un `README` que deja el proyecto listo para que lo tome otra persona.

También hizo algo que vale la pena reconocer: **corrió la auditoría que le pedí, encontró que dos versiones previas de su propio reporte tenían afirmaciones falsas, y las dejó asentadas por escrito en una tabla de correcciones.** Eso es más honestidad técnica de la que se ve normalmente.

El problema es de alcance, no de calidad: **entregó cinco sextas partes de la fase.** Y la parte que falta es justamente la que el cliente va a mirar primero. Un dueño de imprenta no va a valorar el ratio de contraste del texto secundario; va a mirar si aparecen sus lonas y su logotipo.

Lo demás está listo para recibirlos. Falta ponerlos.
