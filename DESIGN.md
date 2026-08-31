---
name: "[SV]Go"
description: "Hyperlocal delivery marketplace para El Salvador — dirección 'Bandera Institucional' v4: navy profundo + azul ultramar/cian con resplandor integrado al fondo (referencia visual del usuario: JumpBot/Unify), blanco como protagonista estructural en claro, acento dorado con brillo animado, Archivo + Hanken Grotesk, superficies glass. Animaciones firma (sello de aprobación, numerales split-flap, revelado de trazo de tinta) más revelado en cascada por scroll orquestado en toda la página."
colors:
  primary: "#2C4BC4"
  primary-deep: "#1B2F82"
  primary-soft: "#E6F1FE"
  accent: "#E8B923"
  accent-deep: "#B8890F"
  success: "#16A34A"
  destructive: "#DC2626"
  bg: "#F6FAFF"
  bg-alt: "#EDF4FD"
  surface: "#FFFFFF"
  surface-2: "#E8F1FC"
  text: "#0B1626"
  text-muted: "#4A5C75"
  text-faint: "#8598B3"
  border: "#D7E6F9"
  primary-dark: "#2F9BF5"
  primary-deep-dark: "#1C7AD1"
  primary-soft-dark: "#12233E"
  accent-dark: "#F0C24B"
  accent-deep-dark: "#C99A2E"
  success-dark: "#34D399"
  destructive-dark: "#F87171"
  bg-dark: "#070B16"
  bg-alt-dark: "#0B121F"
  surface-dark: "#0F1729"
  surface-2-dark: "#141D33"
  text-dark: "#F2F6FC"
  text-muted-dark: "#8CA0BE"
  text-faint-dark: "#5E7295"
  border-dark: "#1E2A44"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontWeight: 800
    letterSpacing: "-0.015em"
  heading:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontWeight: 700
    letterSpacing: "0.06em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "26px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "11px 20px"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "#241300"
    rounded: "{rounded.md}"
    padding: "11px 20px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
  badge-pill:
    backgroundColor: "{colors.accent}"
    textColor: "#241300"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
---

> **⚠️ OBSOLETO (2026-08-23):** este documento describe el sistema visual "Bandera
> Institucional" (navy+dorado) de un frontend que fue **borrado por completo** y
> reconstruido desde cero con un sistema de diseño distinto (dark cian). Ver
> **`FRONTEND_HANDOFF.md`** en la raíz del repo para el diseño y la arquitectura vigentes.
> La única sección de este archivo que sigue siendo válida es **"Flujo logístico —
> confirmación por código QR"** más abajo: es lógica de negocio del backend (aún vigente),
> no diseño visual.

## Overview

[SV]Go es un marketplace hyperlocal de delivery para El Salvador (4 roles: Comprador, Vendedor, Repartidor, Admin) en dos codebases que comparten un backend PHP/MySQL: web React+Vite (`apps/web/web`) y app React Native/Expo (`apps/mobile/frontend`).

Esta es la **segunda generación** del sistema visual — un **reemplazo deliberado**, no una evolución, del sistema "evolved-blue" anterior (`#2563EB`/`#1D4ED8`, Sora+Manrope, iconos de línea, fondos planos). Se aprobó tras un intake de ~20 preguntas y una ronda de generación de direcciones (`concept-seed.mjs`, modo Operate): el generador asignó "Rótulo de Pulpería" (rótulos pintados a mano) como dirección a construir, pero el usuario eligió en su lugar **"Bandera Institucional"** — la dirección de mayor resonancia propia (IMPECCABLE'S PICK) — por su vínculo directo con el nombre "SVGo" y la bandera de El Salvador. Se iteró dos veces sobre feedback real del usuario: (1) se retiró la tipografía Unbounded por sentirse "en movimiento"/distorsionada, reemplazada por Archivo; (2) el fondo pasó de una banda azul plana en el header a un **degradado ambiental de página completa**, desaturado y con transiciones suaves (referencia visual: wallpapers de degradado azul→negro tipo cielo nocturno), porque la primera versión saturaba y contrastaba demasiado con el contenido.

Mockup de referencia completo (interactivo, con toggle claro/oscuro real y el catálogo de animaciones en vivo): ver `docs/redisenio/svgo-direccion-bandera.html` (copia local, sincronizada con este archivo) — construido y validado en un artifact durante la sesión de diseño.

**Historial de la paleta (para que quede claro qué se probó y por qué se descartó, no solo el estado final):** primero se probó un modo oscuro navy/slate con azul brillante — el usuario lo señaló como "look de IA" (navy casi negro + glow azul es un patrón muy repetido en interfaces generadas por IA). Se corrigió a "Añil Nocturno" (índigo profundo con acento dorado, referenciando el tinte histórico de El Salvador) para alejarse deliberadamente de ese cliché. Después el usuario compartió referencias reales que le gustaban (JumpBot, Unify — ambas navy + azul/cian brillante con glow) y pidió explícitamente volver a esa dirección, aceptando conscientemente el parecido con el patrón que antes se había evitado — **es una decisión informada del usuario, no un descuido**. La paleta actual (v4, ver bloque `colors` arriba) es esa: navy profundo + azul ultramar con un resplandor radial integrado al degradado (no manchas sueltas), acento dorado con animación de brillo, y azul primario en modo claro deliberadamente más profundo (`#2C4BC4`, ultramar) que el celeste genérico de SaaS para no repetir el mismo problema en claro.

Color strategy: **Committed** — el azul primario cubre 30–60% de cada pantalla (headers, CTAs, nav activa, fondo ambiental), nunca es un accent menor. El blanco es un segundo protagonista real (franjas, remates, superficies glass) en modo claro. Un único acento dorado, con brillo animado, reservado para urgencia/CTA de compra.

## Colores

- **Primary** (`#2C4BC4` ultramar claro / `#2F9BF5` azul-cian oscuro) — dominante. Headers, CTAs primarios, nav activa, degradado ambiental. En claro es deliberadamente más profundo que un azul SaaS genérico; en oscuro es más brillante porque así lo pidió el usuario a partir de referencias reales.
- **Primary Deep** (`#1B2F82` / `#1C7AD1` oscuro) — pressed states, extremo del gradiente en botones/heros.
- **Accent** (`#E8B923` dorado claro / `#F0C24B` oscuro) — dorado, no naranja (se corrigió desde `#F0A202`, que se percibía anaranjado). Lleva una **animación de brillo constante** (glow pulsante + destello diagonal que cruza el botón cada 2.4s) reservada a **un único CTA por flujo** — hoy el botón "Confirmar pedido" del checkout — no generalizarla a otros botones (ni siquiera a los de escanear/generar QR, por más que también sean momentos importantes). Reservado para urgencia, CTA de compra, momentos de éxito.
- **Success** (`#16A34A` / `#34D399`) — solo confirmado/entregado.
- **Destructive** (`#DC2626` / `#F87171`) — solo errores/cancelaciones.
- Neutrales con sesgo azul en ambos modos — nunca gris puro.

### Fondo ambiental (el cambio más importante frente al sistema "evolved-blue")

Toda la página —no solo el hero— vive sobre un degradado diagonal (160deg) con **un resplandor radial integrado**, no dos manchas (`.blob`) sueltas flotando por separado (versión anterior: se veían como "dos pelotas" — corregido fusionando el resplandor directamente dentro de la variable `--ambient` como una segunda capa `radial-gradient`, siempre la misma posición, sin blobs independientes).

**v5 (actual) — versión suavizada:** el usuario señaló que la v4 se sentía "seca"/con cortes de color notorios. Se bajó la opacidad del resplandor (~.34→.14 claro, .48→.20 oscuro), se agrandó el radio (66%→85%) y se sumaron más paradas de color intermedias en el degradado lineal para que la transición sea gradual, sin bandas visibles:

- **Claro**: `radial-gradient(85% 75% at 82% 0%, rgba(44,75,196,.14), transparent 82%), linear-gradient(160deg, #FBFDFF 0%, #F8FBFF 22%, #F3F8FE 40%, #EEF4FD 56%, #E8F1FC 70%, #E1ECFA 85%, #DAE6F8 100%)`
- **Oscuro**: `radial-gradient(85% 75% at 82% 0%, rgba(47,155,245,.20), transparent 82%), linear-gradient(160deg, #06090F 0%, #080C17 22%, #0A0F1D 40%, #0D1423 56%, #0F1828 70%, #121D30 85%, #152238 100%)`

Reglas duras:
- **El resplandor vive dentro de `--ambient`, nunca como elementos `.blob` separados** — esa fue la corrección explícita del usuario ("no me gusta que se vean como dos pelotas"). Si se necesita más de un punto de luz, se resuelve con más capas `radial-gradient` en la misma variable, nunca con divs posicionados independientemente.
- **Deriva ambiental (web): ya implementada, no solo aspiracional.** `background-size: 160% 160%` + `animation: ambientDrift 64s ease-in-out infinite alternate` moviendo `background-position` en un rango chico (8–40%). Respeta `prefers-reduced-motion`. Es intencionalmente casi imperceptible — es una de las señales de "vida" del sistema, no debe notarse como movimiento, solo evitar que el fondo se sienta estático/muerto.
- Toda superficie de contenido (tarjetas, navbars, paneles) flota encima en **glass**: `rgba(surface, .93)` + `backdrop-filter: blur(14px) saturate(100%)` — la opacidad alta (93%) es deliberada: el fondo nunca debe teñir el texto ni reducir su contraste. No subir el `saturate()` del blur por encima de 100% — eso intensifica el color que se filtra detrás del texto.
- Excepción: superficies operativas muy densas (tablas de Admin/Vendedor con muchas filas) pueden usar `--surface` sólido en vez de `.glass` si la legibilidad a alta densidad lo exige — la claridad de Operate gana sobre el efecto visual.
- **Mobile (React Native):** se implementa con `expo-linear-gradient` (componente `AmbientBackground`) y `expo-blur` (`<BlurView>`) para el efecto vidrio — RN no tiene `backdrop-filter` nativo. A diferencia de la web, el degradado en mobile **sigue sin la deriva animada** — la audiencia real (Android gama media/baja en El Salvador) no debe pagar el costo de repintar un degradado grande cada frame. Sí debe llevar la misma paleta v5 suavizada.

### Señales de "vida" (nuevo, v5)

El usuario señaló que el sistema se sentía "seco" a pesar de estar visualmente correcto. No se resuelve subiendo saturación/contraste (contradiría la sección anterior) sino con **micro-interacciones reales**, todas ya validadas en la propuesta interactiva:

- Deriva ambiental (ver arriba).
- Punto de notificación (campana) con pulso continuo sutil (`~1.8s`).
- Cantidades de carrito/producto con steppers +/- que **de verdad** recalculan el número y el subtotal en pantalla, no decorativos.
- Indicador de "escribiendo…" (3 puntos con bounce) en chat antes de que llegue una respuesta — nunca una respuesta instantánea a una acción del usuario.
- Elevación sutil en hover para más superficies (KPI tiles, vendor cards), no solo product cards.
- El brillo animado del acento dorado (ver sección Colores) se mantiene **reservado a un único CTA por flujo** — en checkout, el botón "Confirmar pedido". No generalizar a los botones de escaneo de QR ni a otros CTAs, por más "vivos" que se quiera sentir el resto: la regla de exclusividad es lo que le da peso a ese momento.

## Tipografía

Dos familias, ambas self-hosted (sin CDN de Google Fonts — igual que el sistema anterior, por la misma restricción de CSP):

- **Archivo** (700/800) — display, headings, todos los numerales (precios, KPIs, número de pedido). Reemplaza a Unbounded (descartada: sus curvas geométricas se percibían "en movimiento"/inestables) y a Sora (sistema anterior). Es una grotesca muy estable, sin distorsión, con excelentes tabular numerals. `font-variant-numeric: tabular-nums` en toda columna numérica.
- **Hanken Grotesk** (400/600/700/800) — cuerpo, labels de UI, tablas densas. Reemplaza a Manrope. Muy legible a tamaños pequeños.

Nunca mezclar una tercera familia. Labels en mayúsculas: `letter-spacing: 0.06–0.08em`, peso 700, ~0.72rem.

Archivos: `Archivo-Bold.ttf`, `Archivo-ExtraBold.ttf`, `HankenGrotesk-Regular.ttf`, `HankenGrotesk-SemiBold.ttf`, `HankenGrotesk-Bold.ttf`, `HankenGrotesk-ExtraBold.ttf` — ya copiados a `apps/web/web/public/fonts/` y `apps/mobile/frontend/assets/fonts/`. Los archivos `Sora-*.ttf`/`Manrope-*.ttf` del sistema anterior **se mantienen en disco sin borrar** hasta que ninguna pantalla los referencie (ver `docs/redisenio/PROGRESO.md`).

## Layout

- **Web dashboards (Vendedor/Admin/Repartidor):** cambio de dirección respecto al sistema anterior — ya **no** son ultra-densos por defecto. El usuario pidió explícitamente "espacioso, prioriza claridad" sobre "denso, ver todo de un vistazo". Filas con más aire, jerarquía clara, aunque implique más scroll.
- **Mobile:** espacioso, grid de 2 columnas, touch targets ≥44px, bottom tabs con indicador deslizante animado.
- **Comprador (Market/Home):** foto de producto/comercio grande y protagonista — confirmado explícitamente por el usuario (no ilustración de reemplazo).
- **Operativas (Vendedor/Admin):** dato (precio, estado, comprador) lidera; imagen pequeña/funcional.
- Regla de negocio invariable: nunca diseñar un flujo que implique entrega fuera de un municipio con `cobertura_activa`.
- **Explorar:** buscador real y funcional arriba de la pantalla (no decorativo) — filtra tiendas/productos en vivo, combinable con chips de categoría y "cobertura activa".
- **Reels:** feed a pantalla completa (full-bleed, sin recuadro ni gap entre reels), navegación **exclusivamente por scroll vertical con snap** — nunca flechas, tabs ni swipe horizontal. Mismo patrón en web y mobile.

## Fotografía — la app se ve, no se lee (nuevo, v5)

Dirección explícita del usuario: las pantallas de comprador deben sentirse tan visuales/animadas como Deliveroo, PedidosYa o la app de McDonald's — **imágenes reales de fotografía** (comida, productos, tiendas, banners promocionales) llevando el peso visual de la pantalla, no texto ni iconos haciendo ese trabajo. Esto es fotografía de contenido, un requisito nuevo y distinto de la regla de iconografía de línea (esa sigue aplicando solo a controles de UI — ver Componentes).

- **Más imagen que texto en toda pantalla de comprador** (Home, Market/Explorar, detalle de producto/tienda, Reels): la foto es el elemento dominante del layout, el texto es apoyo (nombre, precio, badge), no al revés. Si una tarjeta o sección se siente "vacía", la respuesta es una imagen más grande, no más copy.
- **Categorías con foto, no icono.** Los chips/tiles de categoría (Comida, Farmacia, Abarrotes, etc.) llevan una imagen fotográfica representativa de fondo (con overlay de degradado para legibilidad del label encima), igual que los tiles de categoría de Deliveroo/PedidosYa — nunca un ícono de línea solo ni un emoji.
- **Banner/carrusel hero en Home y Market:** franja de imágenes grandes (promos, destacados, tiendas nuevas) tipo carrusel horizontal con snap, foto a sangre completa (full-bleed dentro de su tarjeta), texto superpuesto mínimo — mismo patrón que el hero de banners de McDonald's app.
- **Tarjeta de producto/tienda:** la imagen ocupa la mayoría del área de la tarjeta (no un thumbnail chico al costado); el bloque de texto (nombre, precio, rating) es una franja compacta debajo o superpuesta con degradado, nunca la mitad del espacio de la tarjeta.
- **Nunca usar un placeholder gris/ícono como sustituto permanente de una foto de producto/tienda en pantallas de comprador** — si falta la foto real, se resuelve con shimmer de carga (animación #4) mientras llega, no con un ícono de reemplazo estático.
- Esta regla es **exclusiva de pantallas de comprador** (Home, Market, Explorar, Reels, detalle de producto/tienda). Las pantallas operativas (Vendedor/Admin/Repartidor) mantienen "dato lidera, imagen pequeña" — invertir esa jerarquía ahí reduciría la claridad que el usuario pidió para Operate (ver Layout arriba).
- No confundir con los iconos de línea de UI (nav, botones, controles) — esos se mantienen como están (ver Componentes); la regla de "más imagen que texto" es sobre contenido (producto/tienda/promo), no sobre controles de interfaz.

## Navbars

- **Web:** barra superior única (no sidebar) — logo `[SV]Go`, enlaces (Inicio/Mercado/Pedidos/Wallet) con un indicador píldora azul que se desliza con `transition: transform .38s cubic-bezier(.2,.8,.2,1)`, buscador, notificaciones, avatar. Superficie glass.
- **App:** barra superior minimal (título + notificaciones) + tabs inferiores con indicador que se desliza igual que en web (mismo lenguaje de movimiento, cada plataforma con su propia convención de posición).

## Elevación y vidrio

- `--shadow`: `0 1px 2px rgba(11,27,51,.08), 0 12px 32px rgba(11,27,51,.10)` claro (ajustar opacidad/negro en oscuro) — única sombra para tarjetas/dropdowns/navbars.
- `.glass`: ver regla de fondo ambiental arriba. Es el reemplazo del "shadow-lg" de presentación del sistema anterior.
- El momento de confirmación de pedido **ya no es la caja 3D que giraba** (era, en retrospectiva, el mismo cliché de "card flip" que usa cualquier demo de IA) — ver "Sello de aprobación" en el catálogo de animaciones. Sigue siendo el único momento de firma reservado para ese instante exacto.

## Formas

- Tarjetas/paneles: `18px` (`rounded.lg`).
- Botones, inputs, category tiles: `12px` (`rounded.md`).
- Pills/badges/avatars/navbar: `999px` (`rounded.pill`).
- Navbars y contenedores grandes de vidrio: `26px` (`rounded.xl`, nuevo token frente al sistema anterior).

## Componentes

- **Iconos — un solo set de línea propio, cero emoji.** Regla heredada e inquebrantable del sistema anterior; se reafirma explícitamente tras un descuido corregido en la sesión de diseño (se habían usado emoji de categoría en un mockup intermedio). 24×24, `stroke-width: 1.9`, `stroke-linecap/linejoin: round`, `fill: none`.
- **Botones:** primary = sólido `primary`, texto blanco. Accent = sólido `accent`, texto `#241300` (no blanco — el dorado es demasiado claro para texto blanco legible). Outline = borde `border`, transparente. Feedback táctil: `scale(.96)` en `:active`.
- **Status pills:** fondo `color-mix(in srgb, var(--x) 15-20%, transparent)`, texto en el color semántico completo, transición de estado por **crossfade**, nunca salto instantáneo.
- **KPI/stat tiles:** label (icono + caption mayúscula) → numeral grande Archivo 800 tabular → delta semántico. Los números usan el efecto **split-flap** al entrar en viewport (`IntersectionObserver`), no count-up (ver catálogo de animaciones, #10).
- **Tarjeta de producto:** `transform: translateY(-6px) rotateX(4deg) rotateY(-3deg)` + sombra elevada en hover — la "levitación" es parte del lenguaje de movimiento, no decorativa.

## Catálogo de animaciones (nuevo frente al sistema anterior)

El sistema anterior tenía ~5 momentos de movimiento orquestados. Este sistema define 12 categorías reutilizables — implementar como utilidades/componentes compartidos, no repetir código por pantalla. Las primeras 8 son utilitarias y comunes a cualquier producto bien hecho; **las últimas 3 son las animaciones firma** — deliberadamente específicas de [SV]Go, elegidas para no parecerse al lenguaje de motion por defecto de una IA (fade+translateY genérico, spinners, count-up plano, glow pulsante):

1. **Entrada escalonada** — listas/grids aparecen ítem a ítem (`delay` 100–150ms entre ítems), nunca todo de golpe.
2. **Pulso de seguimiento en vivo** — único loop infinito con justificación real (repartidor en camino). `~2.2s ease-in-out`, color `primary` en ambos modos.
3. **Crossfade de estado** — pills/badges cambian de estado con fundido, no salto.
4. **Shimmer de carga** — nunca pantalla en blanco mientras cargan datos.
5. **Notificación flotante** — toasts entran desde abajo, se retiran solos (~3.6s).
6. **Levitación de tarjeta** — hover en tarjetas de producto (ver Componentes).
7. **Retroalimentación de botón** — `scale(.96)` en press, siempre, en todo botón.
8. **Deriva ambiental** — el fondo degradado se mueve ~60s casi imperceptible (ver "Fondo ambiental").

**Animaciones firma:**

9. **Sello de aprobación** — reemplaza el "card flip 3D" del sistema anterior como momento de confirmación de pedido. Un sello circular cae desde arriba (`translateY(-40px)→0`, leve rotación `-8deg→0`, `280ms ease-in` acelerando como una caída real), impacta con una compresión rápida (`scale(1.15→0.95→1)`, `120ms`), y un anillo de tinta se expande desde el punto de impacto y se desvanece (`500ms`). Timing intencionalmente mecánico/físico, no suave — es un sello de verdad, no un objeto 3D flotando. Único momento reservado para confirmación de pedido; no se repite en otro lugar.
10. **Numerales split-flap** — precios y KPIs (Archivo, tabular-nums) ya no "cuentan" suavemente desde 0 (el cliché de cualquier demo de IA): cada dígito gira sobre su eje X como una ficha de tablero de aeropuerto/estación de buses antiguo, aterrizando en el valor final. Los dígitos se escalonan levemente (el de la izquierda se asienta último) para una sensación de cascada mecánica, no sincronizada al frame.
11. **Revelado de trazo de tinta** — encabezados de sección (no listas de producto — eso es la entrada escalonada) se revelan con un barrido tipo pincelada, `clip-path: inset()` animado de izquierda a derecha en pasos ligeramente irregulares (no un `ease` perfectamente lineal), evocando un rótulo pintado a mano o tela teñida con añil. Reemplaza el fade+translateY genérico para este caso específico.

Todas respetan `prefers-reduced-motion: reduce` (desactivar o saltar al estado final, nunca dejar un elemento "colgado" a mitad de animación).

## Flujo logístico — confirmación por código QR (nuevo, v5)

Reemplaza la confirmación manual ("marcar como recogido/entregado" con un botón suelto) por evidencia física de que la recogida y la entrega ocurrieron:

1. **Recogida:** cuando el Vendedor marca un pedido como "listo", la tienda genera un **código QR único por pedido**. El Repartidor lo escanea al retirar el paquete — recién ahí se activa el seguimiento en tiempo real para el Comprador (antes de escanear, el Comprador ve "en preparación", no un mapa con movimiento falso).
2. **Entrega:** al llegar al destino, el Repartidor genera un **segundo código QR de confirmación** (distinto al de recogida). El Comprador lo escanea desde su propio dispositivo para cerrar el pedido — ese escaneo es el que dispara el "sello de aprobación" (animación firma #9), no un botón de "marcar entregado" del lado del repartidor.
3. Cada código es de un solo uso y expira al ser escaneado o al cerrarse el pedido — no reutilizar el mismo token para recogida y entrega, son eventos distintos con responsables distintos (vendedor↔repartidor, repartidor↔comprador).
4. La UI de "escanear" es el visor de cámara con marcas de esquina + línea de escaneo animada (`scannerView`); la UI de "generar" es el propio código QR en una tarjeta clara, con una frase de una línea explicando a quién mostrárselo. Nunca combinar generación y escaneo en la misma pantalla para el mismo rol en el mismo instante.
5. Este flujo es la única razón de negocio por la que el seguimiento en tiempo real "se activa" en un momento preciso — antes de la recogida no hay tracking real que mostrar, así que la pantalla de seguimiento del Comprador debe reflejar honestamente el estado "preparando" sin simular movimiento.

## Do's y Don'ts

- **Do** tratar el fondo ambiental como presente en toda la app, no solo en el hero — es la seña de identidad más fuerte de este sistema.
- **Do** mantener las superficies de contenido casi opacas (93%) sobre el fondo — el vidrio es para dar profundidad, no para que el texto pierda contraste.
- **Do** usar Archivo únicamente en display/heading/numerales — nunca en párrafos largos (se vuelve pesado a tamaños de cuerpo).
- **Do** mantener animaciones orquestadas y con propósito — cada una de las 9 categorías tiene un porqué, no son decoración.
- **Do** hacer que las pantallas de comprador se sientan tan visuales como Deliveroo/PedidosYa/McDonald's app — foto real dominando la tarjeta, texto como apoyo (ver "Fotografía" arriba).
- **Don't** subir la saturación o el contraste local del degradado ambiental — es la corrección más importante de esta iteración, ya validada por el usuario.
- **Don't** usar emoji como icono funcional en ningún lugar — regla heredada, ya corregida una vez en esta misma sesión de diseño.
- **Don't** resolver una categoría, banner o tarjeta de producto/tienda con un ícono de línea o un bloque de color liso en pantallas de comprador — ahí va fotografía real, el ícono de línea es solo para controles de UI.
- **Don't** reintroducir Unbounded, Sora o Manrope en pantallas nuevas — el sistema tipográfico actual es Archivo + Hanken Grotesk.
- **Don't** usar azul brillante/glow como acento de modo oscuro — es exactamente el patrón que se corrigió ("Añil Nocturno"); en oscuro el dorado lleva la luz, el azul lleva la marca.
- **Don't** usar count-up plano ni el card-flip 3D genérico — fueron reemplazados por split-flap y sello de aprobación precisamente por leerse como "lo que haría cualquier IA".
- **Don't** asumir dashboards densos por defecto en web — este sistema invierte esa regla frente al anterior; priorizar claridad salvo que una pantalla específica demuestre que la densidad es necesaria.
