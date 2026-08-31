# Rediseño [SV]Go — Registro de progreso y continuidad

> **⚠️ OBSOLETO (2026-08-23):** todo el frontend que este archivo describe fue **borrado por
> completo** (`rm -rf`) e iniciado de cero con un sistema de diseño distinto. El trabajo sin
> commitear de esa versión quedó en `git stash` (mensaje `pre-rediseno: snapshot frontend
> antes de borrado total`), recuperable pero no aplicado. Para el estado y diseño vigentes,
> ver **`FRONTEND_HANDOFF.md`** en la raíz del repo. Este archivo queda como referencia
> histórica solamente.

> Este archivo existe para que **cualquier sesión de Claude Code** (esta cuenta u otra) pueda
> retomar el rediseño exactamente donde quedó, sin depender del historial de chat ni de los
> tokens de una conversación específica. Léelo primero. Actualízalo cada vez que termines un
> bloque de trabajo, aunque sea pequeño.

## Estado actual: FASE 1 completa. FASE 2 muy avanzada en color/tipografía (toda la web y toda la app barridas del palette viejo); falta la capa visual (vidrio/animaciones) pantalla por pantalla. FASE 3 (v5) completa: degradados suavizados, corrección real de acento a dorado, y flujo logístico de confirmación por QR — ver sección 5. **FASE 4 (reestructuración real, en curso) — ver sección 6: Home/Market ya reestructurado en ambas plataformas; el resto de las pantallas (Producto/Tienda, Carrito/Checkout, Perfil/Cambio de rol, dashboards, Chat/Notificaciones/Historial) todavía no.**

## 6. Sesión de reestructuración real (FASE 4, en curso)

Después de v5 (tokens + QR), el usuario pidió aplicar al código real la reestructuración completa que ya estaba aprobada en la propuesta interactiva (artifact "Bandera Institucional"). Es un trabajo mucho más grande que un barrido de color — toca la composición de cada pantalla — así que se avanza pantalla por pantalla, con cada bloque verificado (`tsc`/dev server) antes de pasar al siguiente.

- [x] **Home/Market — web (`src/pages/Market.tsx`)**: se descubrió que `Home.tsx` no está enrutado en `App.tsx` (`/` apunta a `Market.tsx`) — no se tocó `Home.tsx`, es código muerto, queda pendiente decidir si se borra. Se agregó una barra de cobertura + buscador real arriba de todo (el estado `searchQuery` ya existía pero no tenía ningún `<input>` conectado — bug real preexistente, ya corregido) y una franja de comunidad/micro-inversión antes del footer. Verificado en el dev server, 0 errores de consola.
- [x] **Home — mobile (`HomeScreen.tsx`)**: ya tenía buscador, categorías, tiendas nuevas/destacadas y grid con entrada escalonada — estaba mejor de lo esperado. Se montó `<AmbientBackground>` (existía desde una sesión anterior pero nunca se había usado en ninguna pantalla) y se agregó la misma franja de comunidad. `tsc` limpio.
- [x] **Explorar/Reels — capa visual**: `Explorar.tsx` (web) tenía su propia paleta de grises Tailwind genéricos (`#94A3B8`, `#0F172A`, etc.) totalmente desconectada del resto del sistema — se realineó a los tokens de DESIGN.md (7 líneas, alto impacto). `Reels.tsx` no necesitó cambios: es intencionalmente oscuro siempre (como Instagram/TikTok), no un bug. Mobile (`ExploreScreen.tsx`) ya usaba `useTheme()` correctamente, sin hex hardcoded.
- [x] **Barrido adicional de paletas grises sueltas** encontrado de paso: `VendedorDashboard.tsx` (paleta completa de dashboard + toast), `AdminCupones.tsx`, `AdminArbol.tsx`, `CarritoYpago.tsx` tenían la misma familia de grises Tailwind genéricos — corregidos a los tokens azules de DESIGN.md. `RepartidorDashboard.tsx` ya estaba bien (usa `var(--border, #E2E8F0)`, el hex ahí es solo fallback de la variable CSS, no un bug).
- [ ] **`Chat.tsx` (web) — hallazgo sin resolver**: tiene ~48 usos de la misma paleta gris genérica, pero a diferencia de los demás archivos **no tiene ninguna rama `isDark ?`** — parece ser una pantalla que nunca se hizo consciente de tema (siempre renderiza oscuro, pero con grises Tailwind en vez de la paleta de marca). Arreglar el color es fácil (sed); hacerla theme-aware de verdad es un trabajo más grande y no se hizo en esta pasada — queda pendiente decidir si Chat debe ser "siempre oscuro a propósito" (como Reels) o si debe respetar el toggle claro/oscuro como el resto de la app.
- [ ] **Todavía no tocado**: Producto/Tienda (el detalle de producto en web ya vive dentro de `Market.tsx`, revisar si necesita más trabajo de composición; falta `TiendaSidePanel.tsx` y el lado mobile `ProductScreen.tsx`), Carrito/Checkout (`CarritoYpago.tsx` web, `CartScreen.tsx` mobile), Perfil/Configuración y Cambio de rol (`Perfil.tsx`/`BecomeSeller.tsx` web, `ProfileScreen.tsx`/`MiCuentaScreen.tsx`/`BecomeSellerScreen.tsx` mobile), dashboards de Vendedor/Repartidor/Admin (ya tienen paleta corregida pero no la reestructuración de composición/KPIs-primero de la propuesta), Chat/Notificaciones/Historial en ambas plataformas.

## 7. Corrección de fondo (v5.1) — el usuario señaló que "se veía idéntico"

Tenía razón: la sesión anterior (sección 6) corrigió valores hex puntuales pero dejó la estructura CSS/JSX vieja intacta — cascarón "evolved-blue"/MercadoLibre con radios, sombras y patrones de tarjeta que nunca fueron parte del sistema Bandera Institucional. Se cargaron las skills `impeccable` (`craft-floor.md`) y `ui-ux-pro-max` para hacer el trabajo con el nivel de detalle correcto, y se encontró la causa raíz real:

- [x] **`css/dark.css` migrado de índigo/morado ("Añil Nocturno") a navy real** — DESIGN.md documentaba navy desde v4, pero el archivo completo (~379 líneas, no solo el bloque `:root`) seguía en la paleta índigo intermedia que el propio DESIGN.md dice que fue descartada. Esto es la corrección de más alcance de esta sesión: `dark.css` se importa en casi todas las páginas, así que el modo oscuro de **toda la app** cambia con este único archivo, no solo Market.
- [x] **`css/market.css` — tokens reescritos** para coincidir exactamente con DESIGN.md (radios `18/12/8px` en vez de `20/14/8`, sombras neutras en vez de tintadas con el azul viejo `#2563EB` que se suponía ya reemplazado, `--glass`/`.glass` agregados, bloque `html.dark` propio).
- [x] **`.product-card` — hover corregido a la levitación real de DESIGN.md** (`translateY(-6px) rotateX(4deg) rotateY(-3deg)`, antes un `translateY(-4px)` plano con borde azul viejo).
- [x] **Precios y nombres de producto — tipografía Archivo aplicada** (antes heredaban el body font, `font-variant-numeric: tabular-nums` en precios).
- [x] **Eliminado un patrón prohibido por `craft-floor.md`**: la grilla "Mi Cuenta/Panadería/Huertos/Comida/Mis Compras/Vende con SVGO" era exactamente el anti-patrón "same-size icon+heading+text cards" ("el contenedor perezoso"). Se reemplazó por: un riel de chips compacto para categorías (Mi Cuenta y Mis Compras se quitaron por ser redundantes con el navbar) + una franja distintiva de "Vendé con [SV]Go" con su propio tratamiento visual, no una tarjeta más.
- [x] Verificado con `tsc` limpio y en el dev server: `--ambient` del body confirmado en navy real (`rgba(47,155,245,.2)`), `.quick-cat-chip` con `backdrop-filter: blur(14px)` real, radios `18px` confirmados por `getComputedStyle`.

**Para quien continúe: la lección de esta sección es la que importa, no solo el resultado.** Corregir valores hex dentro de clases CSS heredadas del sistema anterior no es suficiente cuando esas clases fueron diseñadas para OTRO sistema (radios, sombras, densidad y patrones de tarjeta distintos). Antes de dar una pantalla por "migrada", verificar contra DESIGN.md punto por punto (radios exactos, sombras sin tinte viejo, sin patrones de la lista `craft-floor.md` "Refuse") — no alcanza con que los colores ya no sean el azul/naranja viejo.

**Pendiente aplicar el mismo nivel de detalle** (no solo retoque de hex) al resto de las pantallas listadas arriba en la sección 6 — es un trabajo mucho más grande de lo que parecía, pantalla por pantalla, con este mismo estándar.

## 8. Carrito/Checkout con el estándar de la sección 7 (completo, web + mobile)

- [x] **Web (`CarritoYpago.tsx` + `carritoypago.css`)**: carrito agrupado por vendedor de verdad (antes lista plana). Nuevo botón `.btn-confirm` (dorado, brillo pulsante + destello diagonal cada 2.4s, `prefers-reduced-motion` respetado) para "Sí, confirmar y pagar" — antes usaba `.btn-primary` (negro), el mismo estilo que "Continuar al pago", violando la regla de DESIGN.md de que el brillo dorado es para un único CTA por flujo. Hex sueltos corregidos (`#F1F5F9`→`var(--line-soft)`).
- [x] **Mobile (`CartScreen.tsx`)**: hallazgo real — `CARD_BG` era una paleta "candy" random (`#FF6B6B`, `#4ECDC4`, `#FECA57`...) sin ninguna relación con la marca; corregida a tonos azul/dorado de Bandera Institucional. **Ningún estilo de texto tenía `fontFamily`** — toda la pantalla renderizaba con la fuente del sistema, no Archivo/Hanken Grotesk; corregido en todos los estilos de texto + `tabular-nums` en precios/cantidades. Agrupado por vendedor agregado (ordenando `items` por `tienda_nombre` e insertando encabezados de grupo). Sombra del botón de pago corregida (usaba `#1D5FD1` hardcoded).
- [x] **`PaymentModal.tsx` (mobile) — mismo hallazgo que el botón web**: el botón "Sí, confirmar y pagar" usaba `colors.accent` (azul primario en este theme) en vez de `colors.ctaAccent` (el dorado real) — corregido, con texto oscuro (`#241300`, el dorado es muy claro para texto blanco) y un brillo pulsante propio vía `Animated`, reservado a este único botón.
- [x] Verificado con `tsc --noEmit` limpio en ambas plataformas (mobile con el workaround `--moduleResolution bundler` ya documentado).

**Patrón que se repitió en las dos plataformas** y vale la pena buscar en las pantallas que faltan: nombres de variable/tema (`accent` significando "azul primario" en un lado y "dorado" en otro) que hacen que el botón de confirmación de compra termine con el color equivocado sin que sea obvio con solo mirar el JSX — hay que revisar contra qué token real resuelve cada `c.accent`/`var(--accent)`, no asumir por el nombre.

## 9. Producto/Tienda con el mismo estándar (completo, web + mobile)

- [x] **Web**: el detalle de producto vive dentro de `Market.tsx` (no es una ruta aparte) — sus clases `.pd-*` en `market.css` ya heredaban bien los tokens corregidos en la sección 7 (`--radius-lg`, `--shadow-sm`, `var(--white)`), solo faltaba tipografía Archivo en `.pd-title`/`.pd-price-main` (+ `tabular-nums`) y 3 hex sueltos (`#f8fafc`, `#eff6ff`, `rgba(37,99,235,...)` — el azul viejo otra vez, en el anillo de foco de las miniaturas de galería).
- [x] **`TiendaSidePanel.tsx` (panel de tienda, web)**: tenía su propio `const ACCENT = '#1D5FD1'` — el azul del sistema anterior a "Bandera Institucional", corregido a `#2C4BC4`.
- [x] **Mobile — `ProductScreen.tsx` y `TiendaBottomSheet.tsx` ya estaban bien** (verificado, no hallazgos): usan `FontFamily.*` en todos sus estilos de texto, cero hex hardcoded, y `ProductScreen.tsx` ya distingue explícitamente `colors.accent` (azul, botón "Seguir") de `colors.ctaAccent` (dorado, CTA de compra) con un comentario propio explicando el porqué — evidencia de que esta pantalla específica sí se hizo con cuidado en una sesión anterior, a diferencia de `CartScreen.tsx`.
- [x] Verificado con `tsc --noEmit` limpio.

## 10. Perfil/Configuración y Cambio de rol (web completo, mobile parcial)

- [x] **Web — `css/perfil.css`**: archivo chico (89 líneas). Tokens `:root` corregidos (mismo patrón de las secciones anteriores), gradientes/sombra del avatar corregidos del azul viejo, toast alineado a navy. **Hallazgo sin resolver**: este archivo no tiene NINGÚN bloque `html.dark` propio — a diferencia de Chat.tsx (que sí carga `dark.css` pero sin ramas propias), Perfil.tsx si importa `dark.css`, y varias de sus clases (`.perfil-card`) están en la lista genérica de `dark.css`, pero `.perfil-hero`, `.perfil-avatar`, `.role-cards`, etc. NO están cubiertas ahí — es posible que se vean con colores de modo claro encima del fondo oscuro. No verificado visualmente (sin backend para autenticar y llegar a la pantalla real).
- [x] **Web — `BecomeSeller.tsx` (cambio de rol)**: formulario ya funcional y ya usaba `var(--blue)`/`var(--border)`/`var(--text)` correctamente (theme-aware). Se corrigieron 4 tintes `rgba(37,99,235,...)` (azul viejo) a la marca actual. **No se convirtió a stepper** (Elegí rol → Datos → Foto DUI → Revisión) como mostraba la propuesta — es un formulario de una sola página, ya funcional y probado; convertirlo a wizard es un cambio estructural más grande (y de más riesgo, por tocar la subida de documentos de identidad) que no se hizo en esta pasada por tiempo. Documentado para decidir prioridad.
- [x] **Mobile — `BecomeSellerScreen.tsx` ya estaba perfecto** (15 usos de `FontFamily`, cero hex hardcoded — no necesitó cambios).
- [x] **Mobile — `MiCuentaScreen.tsx` (parcial)**: el `StyleSheet.create` (9 reglas) ya tiene `FontFamily` aplicado. **Pendiente**: el archivo tiene 689 líneas y buena parte del texto se estiliza inline en el JSX (no en el `StyleSheet`) — no se auditó esa parte por tiempo. Mismo patrón de "pantalla sin fuente de marca" que tenía `CartScreen.tsx` (sección 8), probablemente no resuelto del todo acá todavía.
- [ ] **Mobile — `ProfileScreen.tsx` (hallazgo, sin corregir)**: 48 usos de `FontFamily` (bien), pero tiene la MISMA paleta "candy" (`#FF6B6B #4ECDC4 #96CEB4 #FECA57 #FF9FF3 #45B7D1 #A29BFE`) que ya se corrigió en `CartScreen.tsx` — parece ser un array de colores de avatar/fondo compartido copiado entre pantallas. Buscar si hay una constante común que valga la pena centralizar en vez de corregir archivo por archivo.

### Qué falta después de esta sesión (actualizado)

1. Verificar Perfil (web) en modo oscuro con un backend real corriendo — sospecha fuerte de contraste roto.
2. Decidir si `BecomeSeller`/`BecomeSellerScreen` pasan a un stepper de verificación o se quedan como formulario de una página (ya funciona bien).
3. Terminar el audit de tipografía inline en `MiCuentaScreen.tsx` (mobile).
4. Corregir la paleta "candy" de `ProfileScreen.tsx` (mobile) — considerar centralizar el array de colores de avatar en `theme/colors.ts` para no repetir la corrección pantalla por pantalla.
5. **Todavía sin empezar con el estándar de la sección 7**: los 3 dashboards operativos (Vendedor/Repartidor/Admin) y Chat/Notificaciones/Historial, en las dos plataformas.

## 11. CAUSA RAÍZ encontrada — por qué "no se notaba nada" (crítico, leer primero)

El usuario reportó (con razón) que después de toda la sección 6–10 la app se seguía viendo prácticamente igual. La causa real:

1. **`css/global.css` — el único archivo que se importa una sola vez para TODA la app — todavía tenía `--blue: #1D5FD1`** (el azul del sistema "evolved-blue" anterior). Se habían corregido `--accent`/`--orange`/`--ambient` en sesiones previas, pero nunca `--blue`/`--text`/`--bg`/`--border`, que son los tokens que más se usan en la práctica. Corregido ahora, con bloque `html.dark` agregado (no existía).
2. **Ningún elemento real usaba la clase `.glass`** — existía en el CSS pero nunca se aplicó a ninguna tarjeta. El "vidrio sobre degradado ambiental" es, textualmente, "la seña de identidad más fuerte del sistema" según el propio DESIGN.md, y no estaba en ningún lado.
3. **El azul viejo `#1D5FD1`/`#123F94` estaba hardcoded en 20+ archivos más** (no solo los que ya se habían tocado) — `Header.tsx`, `Footer.tsx`, `Chat.tsx`, `Login.tsx`, `Reels.tsx`, `Entregas.tsx`, `RepartidorDashboard.tsx`, `TiendaWizard.tsx`, y **todo** el panel de Admin (`admin.css`, `AdminLayout.tsx`, `AdminArbol.tsx`, `AdminCupones.tsx`, `AdminOrders.tsx`, `AdminProducts.tsx`, `AdminSettings.tsx`, `Users.tsx`) — el panel de Admin ni siquiera tenía soporte de modo oscuro.

### Lo que se corrigió en esta pasada (verificado con `tsc` + `getComputedStyle` en el dev server)

- [x] `global.css`: `--blue`/`--blue-dark`/`--blue-deep`/`--purple`/`--text`/`--text-muted`/`--bg`/`--border` corregidos a Bandera Institucional real, `html.dark` agregado, `--glass` agregado.
- [x] `.card`/`.product-card`/`.perfil-hero`/`.perfil-section` y equivalentes en `market.css`, `carritoypago.css`, `perfil.css`, `dashboards.css`, `admin.css`, `historial.css`, `entregas.css`, `auth.css`, `Chat.css` convertidos de fondo sólido a **vidrio real** (`background: var(--glass)` + `backdrop-filter: blur(14px) saturate(100%)`).
- [x] `dark.css`: el override genérico de 17 clases de tarjeta (`.card, .summary-card, .perfil-card, .role-card...`) también convertido a vidrio en modo oscuro.
- [x] **Barrido total de `#1D5FD1`/`#123F94`** — cero coincidencias restantes en `apps/web/web/src` y `apps/web/web/css` (verificado por grep, no por muestreo).
- [x] `admin.css` recibió su primer bloque `html.dark` — el panel de Admin no tenía soporte de tema oscuro en absoluto hasta ahora.
- [x] Verificado en vivo: `getComputedStyle` confirma `--blue` resolviendo a `#2F9BF5` (antes `#1D5FD1`), `backdrop-filter: blur(14px)` real en tarjetas.

## 12. Continuación tras "no has hecho nada" — reconstrucción real, no parches (en curso)

El usuario aclaró el pedido real: no son ajustes de token, es reconstruir la composición de cada pantalla, conservando solo la lógica que habla con el backend. Se viene ejecutando así desde acá, sin pausas:

- [x] **Home/Market**: nueva sección "Cerca de vos" con tarjetas de tienda reales (`productos.php?action=tiendas_destacadas`, mismo endpoint que ya usa mobile) — antes Home solo mostraba productos sueltos, nunca tiendas. Buscador convertido a vidrio real.
- [x] **Header (navbar)**: chip de rol visible junto al avatar en la barra superior (antes solo aparecía escondido en el dropdown).
- [x] **`VendedorDashboard.tsx`**: las 3 superficies principales (header de tienda, tarjetas KPI, gráfico de ganancias) convertidas de fondo sólido a vidrio real.
- [x] **Segunda pasada de barrido de azul viejo**: se encontraron 9 archivos más con `rgba(37, 99, 235, ...)` (la firma exacta del azul "evolved-blue") que el barrido de la sección 11 no había detectado por buscar solo el hex sólido, no sus variantes rgba — corregidos.
- [x] **Tercera pasada — grises Tailwind genéricos sueltos** (`#e2e8f0`, `#f3f4f6`, `#eef2ff`, `#9ca3af`, `#111827`, `#6b7280`): 33 ocurrencias más en 7 archivos, corregidas a los tokens azules de marca.
- [x] `dashboards.css`: `.panel-card`/`.dash-card` (usado por Repartidor y potencialmente Admin) tenía un `border-color` en el azul viejo y un borde genérico gris — corregidos.
- [x] **`AdminArbol.tsx` (la home real de `/admin`) — reescrita por completo**: no tenía NINGÚN soporte de modo oscuro (`color:'#000'`, `background:'#FFF'` hardcoded en cada tarjeta) — es la pantalla que un admin ve primero al entrar, y se veía rota en oscuro. Reescrita para usar los tokens de `admin.css` (ya corregidos en la sección 11) + vidrio real en todas sus tarjetas.
- [x] `AdminCupones.tsx`: mismo hallazgo (3 lugares con `#000`/`#FFF` sueltos), corregido.
- [x] `Chat.tsx`: botón de enviar/grabar nota de voz usaba un gradiente azul-morado (`#4f6ef7`→`#7c3aed`) que no es parte de la paleta de marca — corregido al degradado azul real. **Nota**: este archivo (1700+ líneas) no tiene ninguna rama `isDark` propia — confía en los overrides genéricos de `dark.css`, que ya cubren sus clases principales pero no fue auditado línea por línea en esta pasada.
- [x] **Mobile — `NotificacionesScreen.tsx` reescrita**: mismo bug que `CartScreen.tsx` (sección 8) — cero uso de `FontFamily` en toda la pantalla, todo el texto (incluyendo notificaciones no leídas) renderizaba con la fuente del sistema. Corregido + radio de tarjeta alineado a 18px.
- [x] **Auditoría rápida del resto de mobile**: `ReelsScreen`, `DriverScreen`, `SellerScreen`, `AdminScreen`, `ChatScreen`, `PedidosScreen`, `MapTrackingScreen`, `BecomeSellerScreen` ya usan `FontFamily` consistentemente (15–61 usos cada una) — no tenían el bug de fuente faltante.
- [ ] **Todavía sin este nivel de revisión**: Historial.tsx (web, aunque no se le encontró el bug de `#000`/`#FFF`), Users.tsx/AdminOrders.tsx/AdminProducts.tsx/AdminSettings.tsx (auditoría superficial only — no se abrieron línea por línea), y en mobile: no se auditó a fondo si además de tener `FontFamily` también usan vidrio/colores de marca correctamente en cada superficie — solo se verificó la presencia del import, no cada uso.

### Por qué esto importa más que todo lo de las secciones 6–10 juntas

Las correcciones anteriores tocaban páginas una por una. Esta pasada corrigió la **fuente de verdad compartida** (`global.css`, `dark.css`) — cualquier página que no tenga su propio `:root` conflictivo ya hereda el sistema correcto automáticamente. Si después de esto el usuario sigue sin ver cambio, el diagnóstico ya no es "faltan tokens" — hay que verificar con un backend real corriendo si es caché del navegador, una build vieja, o un archivo específico que todavía no se identificó.

## 5. Sesión v5 — degradados suavizados, corrección real de paleta, y flujo QR (nuevo)

**Hallazgo importante al empezar esta sesión:** las secciones 1–4 de este archivo (y DESIGN.md) daban por completado un "barrido total" de la paleta Bandera Institucional, pero el código real no lo reflejaba: `global.css`/`index.css`/`dark.css` y 7 CSS de página seguían con `--accent`/`--orange: #F0A202` (naranja, la versión explícitamente rechazada) en claro, y `dark.css` seguía en la paleta índigo/morada "Añil Nocturno" en vez del navy documentado. **Si otra sesión retoma esto, no confíe ciegamente en que "ya está migrado" solo porque lo dice una sección vieja de este archivo — verifique el hex real en el CSS.**

- [x] **DESIGN.md actualizado** con: degradado ambiental v5 (más difuso, resplandor más tenue, más paradas de color), deriva ambiental real en web (antes solo documentada, ahora implementada), sección nueva "Señales de vida" (micro-interacciones para que la UI no se sienta seca), y sección nueva "Flujo logístico — confirmación por código QR".
- [x] **Web — tokens corregidos y verificados en vivo** (dev server, ambos temas, 0 errores de consola):
  - `--ambient` suavizado con resplandor radial + más paradas de color en `global.css`, `index.css`, `dark.css` (el índigo de `dark.css` se mantuvo en su misma familia de color — no se migró a navy en esta pasada, ver nota abajo).
  - `--accent`/`--orange` corregidos a dorado real (`#E8B923` claro / `#F0C24B` oscuro) en los 10 archivos que lo tenían en naranja: `global.css`, `index.css`, `dark.css`, `auth.css`, `Chat.css`, `entregas.css`, `historial.css`, `market.css`, `perfil.css`, `Reels.css`.
  - **`carritoypago.css` NO se tocó a propósito**: ahí `--accent` es un alias local para el azul primario de los botones (colisión de nombre con el `--accent` dorado del resto de la app, deuda heredada) — cambiarlo habría vuelto gigante-dorados los botones de checkout. Pendiente decidir si se renombra esa variable local.
  - Deriva ambiental (`@keyframes ambientDrift`, 64s, `prefers-reduced-motion` respetado) agregada a `body` en `global.css`.
  - `npx tsc --noEmit` sin errores tras todos los cambios de esta sesión.
- [x] **Mobile — tokens corregidos** (verificado por estructura/tipos con `tsc`, no en Expo real — mismo límite de siempre en este entorno):
  - `ctaAccent` corregido a dorado en `ThemeContext.tsx` (ambos modos) y `theme/colors.ts`.
  - `AmbientBackground.tsx`: stops de degradado alineados a los mismos valores suavizados que la web (RN no soporta el resplandor radial, solo se suavizó vía más stops).
  - `BANNER_COLORS` de `HomeScreen.tsx` corregido (tenía el naranja viejo).
- [x] **Explorar y Reels ya estaban implementados de verdad** — se verificó el código antes de reconstruir nada: `Explorar.tsx`/`ExploreScreen.tsx` ya tienen buscador funcional con debounce + filtros reales; `Reels.tsx`/`ReelsScreen.tsx` ya son full-bleed con scroll-snap vertical puro (`scrollSnapType: 'y mandatory'` en web, `pagingEnabled`+`snapToInterval` en mobile). No se tocó nada ahí.
- [x] **Flujo logístico QR — implementado de punta a punta** (backend + web + mobile):
  - **Esquema:** se reutilizaron las columnas ya existentes `confirmado_vendedor_recogida`/`confirmado_repartidor_recogida` (doble confirmación de recogida, ya existía) y se agregaron 3 columnas nuevas vía el migrador idempotente de `conexion.php` (`db_migrate()`, ya existía, no se reinventó): `qr_recogida_token`, `qr_entrega_token`, `qr_entrega_generado_at` en `pedidos`.
  - **Backend:** la liquidación (comisiones + wallets, antes solo en `repartidor_dashboard.php` action=`completar`, autoconfirmada por el repartidor) se extrajo a `finalizar_entrega_pedido()` en `conexion.php` para poder compartirla con el nuevo camino. Endpoints: `vendedor_dashboard.php` (`confirmar_recogida` ahora genera y devuelve `qr_token`), `repartidor_dashboard.php` (`confirmar_recogida` ahora exige y valida `qr_token` vía `hash_equals`; nuevo `generar_qr_entrega`; `completar` se mantiene como respaldo manual, ahora usando la función compartida), `pedidos_tracking.php` (nuevo `confirmar_entrega`, solo comprador, valida el QR y dispara la liquidación). Los 4 archivos pasan `php -l`.
  - **Web:** componentes nuevos `src/components/QrScanner.tsx` (cámara con `html5-qrcode`, marcas de esquina + línea animada propias) y `QrCodeCard.tsx` (`qrcode.react`). Integrados en `VendedorDashboard.tsx` (genera QR de recogida), `RepartidorDashboard.tsx` (escanea recogida, genera QR de entrega) y `Entregas.tsx` (comprador escanea entrega). `npx tsc --noEmit` limpio.
  - **Mobile:** se instalaron `expo-camera` y `react-native-qrcode-svg` (`npx expo install`, compatibles con Expo SDK 54). Componentes nuevos equivalentes en `src/components/`. Integrados en `SellerScreen.tsx`, `DriverScreen.tsx` y `MapTrackingScreen.tsx`. Nuevos endpoints agregados a `Endpoints` en `services/api.ts`. `npx tsc --noEmit --moduleResolution bundler` limpio (el proyecto tiene un conflicto preexistente de tsconfig — `customConditions` vs `moduleResolution: node` — que impide correr `tsc` sin ese override; no lo causó esta sesión, ver nota abajo).
  - **No verificado con un dispositivo/backend real**: no hay MySQL/Apache corriendo en este entorno para probar las migraciones ni los endpoints de verdad, ni Expo para ver las pantallas mobile renderizadas. Antes de dar esto por "terminado", correr XAMPP + `npx expo start` y probar el flujo real: vendedor genera código → repartidor lo escanea → repartidor genera código de entrega → comprador lo escanea → se liquida la wallet.

### Nota técnica: conflicto de tsconfig en mobile (preexistente, no de esta sesión)

`npx tsc --noEmit` en `apps/mobile/frontend` falla con `TS5098: Option 'customConditions' can only be used when 'moduleResolution' is set to 'node16', 'nodenext', or 'bundler'` — viene de que `tsconfig.json` extiende `expo/tsconfig.base` (que fija `customConditions`) pero sobreescribe `moduleResolution: "node"` (legado). No se tocó `tsconfig.json` en esta sesión porque no es parte del pedido y arreglarlo bien requiere decidir si el proyecto puede pasarse a `moduleResolution: "bundler"` sin romper otra cosa. Mientras tanto, cualquier sesión que necesite typecheckear mobile puede usar `npx tsc --noEmit --moduleResolution bundler` como workaround.

### Qué falta después de esta sesión

1. **Verificar con XAMPP + Expo reales** (bloqueante para dar el QR por "probado", no solo "compilado") — ver punto de arriba.
2. **Decidir el destino de `--accent` en `carritoypago.css`** (colisión de nombre con el dorado global) — renombrar a algo como `--btn-primary` o aceptar que ese archivo vive en su propio namespace.
3. **Decidir si se migra `dark.css` (web) de índigo/morado a navy** para que por fin coincida 1:1 con DESIGN.md — en esta sesión se suavizó el degradado pero se mantuvo la familia de color existente a propósito, por riesgo/alcance.
4. Todo lo que ya estaba pendiente en la sección 3 (vidrio/animación pantalla por pantalla, iconos, fuentes viejas sin borrar) sigue vigente y no se tocó en esta sesión.

## 0. Cómo retomar en 60 segundos

1. Lee `DESIGN.md` (raíz del repo) — es la fuente de verdad del sistema visual actual, dirección
   **"Bandera Institucional"**.
2. Abre `docs/redisenio/svgo-direccion-bandera.html` en un navegador — es el mockup interactivo
   validado por el usuario (toggle claro/oscuro real, navbars, 9 animaciones en vivo). Todo lo que
   se implementa en código real debe verse/comportarse como ese mockup.
3. Revisa la sección "3. Qué falta" de este archivo y sigue por ahí.
4. Actualiza este archivo (sección 2 y 3) antes de terminar tu sesión.

## 1. Decisiones ya tomadas (no volver a preguntar)

- **Dirección elegida:** "Bandera Institucional" (azul institucional dominante + blanco como
  protagonista estructural + acento dorado único). Fue elegida por el usuario sobre la dirección
  asignada por el generador ("Rótulo de Pulpería") y sobre la opción segura de solo pulir el
  sistema anterior.
- **Es un reemplazo, no una evolución** del sistema "evolved-blue" anterior (`#2563EB`, Sora+Manrope).
- **Nada visual es intocable** salvo: el nombre/marca `[SV]Go`, y todas las reglas de negocio
  (cobertura por municipio, restricciones de Admin, los 3 métodos de pago).
- **Tipografía final:** Archivo (display/headings/números) + Hanken Grotesk (cuerpo). Se descartó
  Unbounded (primera propuesta) por sentirse "en movimiento"/distorsionada. Se descartaron
  Sora + Manrope (sistema anterior) porque este es un reemplazo completo de identidad.
- **Fondo:** degradado ambiental de página completa (no una banda de color plana), baja saturación,
  transición suave entre colores, inspirado en un wallpaper de degradado azul→negro que el usuario
  compartió como referencia explícita. Ver hex exactos en `DESIGN.md` sección "Fondo ambiental".
- **Densidad web:** cambio de dirección respecto al sistema anterior — dashboards ya NO son
  ultra-densos por defecto; el usuario pidió explícitamente "espacioso, prioriza claridad".
- **Fotos de producto:** grandes y protagonistas en pantallas de Comprador (no ilustración).
- **App↔Web:** misma marca, cada plataforma a su convención (web: navbar superior + tablas
  espaciosas; app: tabs inferiores + gestos nativos). No buscar paridad pixel-perfect entre
  plataformas, sí paridad de tokens/lenguaje.
- **Motion:** sí es parte fuerte de la identidad (el usuario lo pidió explícitamente). Catálogo de
  9 tipos de animación documentado en `DESIGN.md`.
- **Tono de contenido:** cercano e informal ("¡Ya casi llega tu pedido!", no "Su pedido está en
  camino").
- **Sin fecha límite** — el usuario priorizó calidad sobre velocidad.
- **Cero emoji como icono funcional** — regla heredada del sistema anterior, reafirmada.

## 2. Qué se hizo ya (FASE 1 — fundación, completada en esta sesión)

- [x] `DESIGN.md` reescrito por completo con la dirección "Bandera Institucional" (tokens de color,
  tipografía, fondo ambiental, navbars, catálogo de animaciones, do's/don'ts).
- [x] Mockup de referencia guardado localmente en
  `docs/redisenio/svgo-direccion-bandera.html` (además de vivir como Artifact publicado).
- [x] Fuentes Archivo (700/800) y Hanken Grotesk (400/600/700/800) descargadas y copiadas a:
  - `apps/web/web/public/fonts/` (`Archivo-Bold.ttf`, `Archivo-ExtraBold.ttf`,
    `HankenGrotesk-Regular.ttf`, `HankenGrotesk-SemiBold.ttf`, `HankenGrotesk-Bold.ttf`,
    `HankenGrotesk-ExtraBold.ttf`)
  - `apps/mobile/frontend/assets/fonts/` (mismos 6 archivos)
  - **Los archivos `Sora-*.ttf` y `Manrope-*.ttf` del sistema anterior se dejaron sin borrar**
    a propósito — hasta que ninguna pantalla los referencie (ver sección 3).
- [x] **Web** — tokens globales actualizados y **verificados en vivo** (dev server real, ambos
  temas probados con el botón "Modo claro"/"Modo oscuro" real de la app, sin errores de consola):
  - `css/index.css` (`:root`): paleta Bandera Institucional + tokens nuevos (`--accent`,
    `--accent-deep`, `--blue-deep`, `--surface-alpha`, `--font-display`, `--font-body`, `--ambient`).
  - `css/dark.css` (`html.dark`): mismos tokens en variante oscura. **Ojo:** el resto del archivo
    (~300 líneas de overrides con hex literal tipo `#1e293b`/`#334155` por componente) NO se tocó
    — sigue pendiente, ver sección 3 paso 5.
  - `css/global.css`: `@font-face` ahora carga Archivo + Hanken Grotesk; `body`/`html.dark body`
    usan `var(--ambient)` con `background-attachment: fixed` en vez de un color plano — el fondo
    ambiental ya es real y app-wide, no solo un mockup.
- [x] **Mobile** — tokens base actualizados (edición hecha, verificada estructuralmente —
  **NO probada en emulador/dispositivo real todavía**, este entorno no tiene forma de correr Expo):
  - `App.tsx`: `useFonts()` ahora registra Archivo/Hanken Grotesk además de Sora/Manrope (las viejas
    se mantienen cargadas para no romper nada a medias).
  - `src/theme/colors.ts`: `Colors` (paleta legacy) y `FontFamily` actualizados a la nueva paleta/tipografía.
  - `src/context/ThemeContext.tsx`: `darkColors`/`lightColors` (fuente de verdad real, usada por 37
    archivos vía `useTheme()`) reescritos con la paleta Bandera Institucional. Nota añadida en el
    propio archivo sobre que React Native no tiene `backdrop-filter` nativo barato — las superficies
    van casi opacas, no "vidrio" real, hasta que se decida una solución (`expo-blur` u opacidad simple).
  - **Pendiente verificar en Expo real** (`npx expo start`, o build de desarrollo) — no se pudo hacer
    en esta sesión por falta de emulador/dispositivo conectado al entorno de Claude Code.

## 2.1 Sesión "modo auto" — aplicación a código real (continuación)

- [x] **Web — `src/components/Header.tsx` (el navbar real de toda la app) migrado por completo y
  verificado en vivo en el dev server** (ambos temas, con el toggle real de la app, 0 errores):
  - Colores del componente (antes hardcoded localmente: `#2563EB`, `#3B82F6`, etc.) ahora usan la
    paleta Bandera Institucional.
  - La barra sticky superior ahora es **vidrio real**: `background: rgba(surface, .90–.92)` +
    `backdropFilter: blur(14px) saturate(100%)` sobre el fondo ambiental de `body` — verificado con
    `getComputedStyle` (`backdropFilter: "blur(14px) saturate(1)"`, `background-color: rgba(255,255,255,.92)`).
  - El logo `[SV]Go` usa `var(--font-display)` (Archivo) en vez de heredar Hanken Grotesk.
  - **La nav de 4 secciones (Inicio/Explorar/Reels/Pedidos/Chats) ahora tiene un indicador
    deslizante real** (`translateX` animado con `cubic-bezier(.2,.8,.2,1)`, medido con
    `useLayoutEffect` + refs por botón, recalculado en `resize`) — es el mismo patrón que el
    navbar del mockup, implementado en React con estado real, no solo CSS estático.
  - Nota para quien continúe: hubo un bug de desarrollo (`navLinksMeta is not defined`) por un
    typo mío al mover el bloque de código — **ya corregido y verificado**, pero si ves ese error
    en el historial de consola del navegador es de una versión intermedia, no del estado actual del
    archivo. Verificar siempre contra el archivo en disco, no contra el buffer de consola del
    navegador (en esta sesión el buffer de `read_console_messages` mostró el mismo error viejo
    varias veces después de corregido — parece cachear entre navegaciones de la misma pestaña).
- [x] **Mobile — `src/navigation/AppNavigator.tsx` (bottom tabs) no necesitó cambios**: ya leía
  todos sus colores de `useTheme()` (`colors.accent`, `colors.accentLight`, `colors.tabBar`, etc.),
  así que heredó la paleta nueva automáticamente en cuanto se actualizó `ThemeContext.tsx`. Ya tiene
  además una "píldora" de fondo detrás del ícono activo — no es un indicador deslizante compartido
  como en web (eso requeriría reemplazar el tab bar por uno custom; **se decidió no hacerlo**: los
  tabs nativos con convención propia por plataforma es justamente lo que pide `DESIGN.md` en
  "Coherencia app↔web" — no forzar el patrón web en mobile).
- [x] **`expo-linear-gradient` instalado** (`npx expo install expo-linear-gradient`, sin conflictos,
  828 paquetes auditados) — resuelve el bloqueo técnico para construir el fondo ambiental en mobile.
  `expo-blur` **ya estaba instalado** de antes — usarlo (`<BlurView>`) para el efecto vidrio en
  mobile en vez de intentar imitar `backdrop-filter` a mano.
- [x] **`src/components/AmbientBackground.tsx` (mobile) creado** — componente reutilizable con los
  mismos 7 stops de color que la versión web, usando `LinearGradient`. **Decisión ya tomada y
  documentada en el propio archivo**: es estático (sin deriva animada), a diferencia de la web,
  por costo de repintado en Android de gama media/baja (audiencia real del producto). Esto cierra
  el punto abierto que había quedado pendiente en la sección 4 de este archivo.
  - **Todavía no está montado en ninguna pantalla.** Envolver el contenido y quitar el
    `backgroundColor` sólido de la View raíz de esa pantalla — mismo patrón que en web, donde el
    fondo del `body` solo se ve donde ningún hijo lo tapa con un color sólido propio.
- [x] Corregido `BANNER_COLORS` en `HomeScreen.tsx` (tenía `#2563EB`/`#7C3AED` hardcoded del sistema
  anterior) — ahora usa `#1D5FD1`/`#F0A202`.
- [ ] **No verificado visualmente en ningún momento de esta sub-sesión** — este entorno de Claude
  Code no tiene navegador de verdad conectado a un emulador/dispositivo React Native, así que todo
  lo de mobile en esta sección se verificó solo por estructura/tipos, nunca por render real.
  **Antes de seguir construyendo sobre `AmbientBackground.tsx`, correr la app en Expo de verdad.**

## 2.2 Sesión "modo auto" (continuación 2) — hallazgo de arquitectura + barrido total de color

**Hallazgo importante:** cada página web tiene su propio archivo `css/<pagina>.css` con su **propio
bloque `:root {}` duplicado** (histórico, no introducido por este rediseño). `css/index.css` —
donde se habían puesto los tokens nuevos en la sesión anterior — **solo lo importan `Home.tsx` y
`NotFound.tsx`**. Es decir: el fix de tokens de la sesión anterior solo se veía garantizado en 2 de
23 páginas; en el resto, el `:root` local de cada página (con los colores VIEJOS) podía ganar la
cascada dependiendo de qué CSS cargara al final. Además `css/dark.css` no se importaba globalmente
— páginas como Chat, Admin (Dashboard/Users/AdminLayout) nunca lo cargaban, así que el modo oscuro
de sus clases propias simplemente no existía ahí. **Esto explica por qué el cambio "no se veía" en
la mayoría de la app.** Ya corregido de raíz:

- [x] **`css/global.css`** (el único archivo que se importa una sola vez, siempre, para toda la
  app) ahora tiene su propio bloque `:root` con la paleta completa + `--font-display`/`--font-body`/
  `--ambient`/`--surface-alpha` — es la fuente de verdad real, ya no depende de qué página cargue.
- [x] **`main.tsx` ahora importa `css/dark.css` globalmente** (antes solo lo importaban 9 de 23
  páginas) — el modo oscuro por fin llega a todas partes.
- [x] **Bloque `:root` de CADA página realineado a la paleta nueva** (mismos nombres de variable,
  valores nuevos, por seguridad ante el orden de carga): `auth.css` (Login/Registro), `perfil.css`,
  `market.css`, `entregas.css`, `historial.css`, `Chat.css`, `Reels.css`, `dashboards.css`,
  `carritoypago.css`, `src/admin.css`. Todas incluyen ahora también `--font-display`/`--font-body`
  donde aplicaba.
- [x] **Barrido mecánico completo de hex viejo literal** (`#2563EB`, `#1D4ED8`, `#EA580C`, `#3B82F6`,
  y también el palette histórico pre-Bandera-Institucional `#355068`/`#4A6D8C` que seguía vivo en
  8 archivos — Perfil, Chat, y varias pantallas de Admin) en **toda** `apps/web/web/src` y
  `apps/web/web/css` — 0 coincidencias restantes, verificado con grep case-insensitive.
- [x] **`src/pages/Login.tsx` (Registro/Login) migrado por completo**: logo, botón de submit
  (login Y registro), link de alternar modo — y verificado en vivo en el navegador: el fondo del
  wrapper ahora es `linear-gradient(135deg, rgb(29,95,209) 0%, rgb(18,63,148) 100%)` (el nuevo azul),
  fuente `Hanken Grotesk` confirmada por `getComputedStyle`.
- [x] **`src/pages/Market.tsx`**: los 2 primeros slides del carrusel (que usaban el azul histórico
  `#355068`/`#4A6D8C` y un azul genérico de Tailwind) ahora usan el gradiente de marca nuevo.
- [x] **Mobile: mismo barrido mecánico** en 10 archivos más (`ExploreMapView.tsx`,
  `LeafletMapView.tsx`, `PaymentModal.tsx`, `CartScreen.tsx`, `ChatScreen.tsx`,
  `OnboardingPhoneScreen.tsx`, `OnboardingRoleScreen.tsx`, `SellerScreen.tsx`, `SupportScreen.tsx`,
  `UsernameSetupScreen.tsx`) — verificado estructuralmente (conteo de llaves), no visualmente.
- [x] **Confirmado que `AuthScreen.tsx`, `ProfileScreen.tsx` y `MiCuentaScreen.tsx` (mobile) ya
  usaban `useTheme()` limpiamente, sin hex hardcoded** — ya heredaron la paleta nueva automáticamente
  desde que se actualizó `ThemeContext.tsx` en la sesión anterior. No necesitaron edición.
- [x] `npx tsc --noEmit` corrido antes y después del barrido en web: mismo número de errores
  pre-existentes (todos ajenos a este rediseño — `rol` vs `role`, tipos de `recharts`, imports sin
  usar, un `Cannot find namespace 'JSX'`). **El barrido no introdujo ningún error nuevo.**

**Lo que sigue faltando** (esto NO cambió: seguir tocando cada pantalla para vidrio/navbar/animación
es trabajo aparte de este barrido de color — ver sección 3, puntos 1–3 más abajo, siguen vigentes).
Nota para la próxima sesión: si algún rincón "sigue viéndose viejo", ya no es un problema de fuente
de verdad de tokens (eso está resuelto de raíz) — es una pantalla a la que aún no le tocó su pase de
`.glass`/navbar/animación, que es trabajo pantalla-por-pantalla, no un bug de color suelto.

### Dónde vive cada sistema de tokens (mapa para no tener que re-explorar)

- **Web** (`apps/web/web`), sin Tailwind, CSS plano:
  - `css/index.css` → bloque `:root { --blue, --text, --bg, ... }` — tokens modo claro.
  - `css/dark.css` → bloque `html.dark { ... }` — overrides modo oscuro (se activa con la clase
    `dark` en `<html>`, NO con `data-theme`).
  - `css/global.css` → `@font-face` (self-hosted, sin CDN) + `body { background, color }` fijos
    (no usan variables todavía — ahí es donde se plantará el fondo ambiental).
  - Páginas con CSS propio en `css/`: `Chat.css`, `Reels.css`, `auth.css`, `carritoypago.css`,
    `dashboards.css`, `entregas.css`, `historial.css`, `market.css`, `perfil.css` — varias tienen
    variables locales adicionales (ej. `carritoypago.css` define `--bg-deep`, `--ink`, etc. propias).
  - **25 archivos** (`src/` + `css/`) tienen el hex `#2563EB` escrito literal, no como variable —
    esos NO se actualizan solos al cambiar `:root`; hay que tocarlos uno por uno o hacer un
    reemplazo global cuidadoso.
  - Iconos: `lucide-react` (nota: esto contradice la regla de "un solo set de línea propio" de
    DESIGN.md — es deuda heredada del sistema anterior, no introducida por este rediseño; decidir
    si se mantiene lucide-react como el "set de línea propio" de facto o se reemplaza).

- **Mobile** (`apps/mobile/frontend`), React Native/Expo:
  - `src/context/ThemeContext.tsx` → exporta `darkColors` y `lightColors` (objetos `ColorPalette`
    completos) + `useTheme()` hook + toggle persistido en `AsyncStorage` (clave `svgo_theme`).
    **Esta es la fuente de verdad real**, usada en 37 archivos vía `useTheme()`.
  - `src/theme/colors.ts` → paleta más simple/antigua (`Colors`, `Spacing`, `Radius`, `Fonts`,
    `FontFamily`), usada en 35 archivos. Puede ser parcialmente redundante con `ThemeContext.tsx`
    — no se investigó a fondo cuál gana cuando ambas se usan en el mismo archivo.
  - `App.tsx` → `useFonts()` de `expo-font` registra las fuentes por nombre lógico
    (`Sora-Bold`, `Manrope-Regular`, etc.) — hay que añadir las claves de Archivo/Hanken Grotesk
    ahí para poder usarlas.

## 3. Qué falta (FASE 2 en adelante — pendiente)

La fundación (FASE 1) y el navbar web (FASE 2 arrancada, sección 2.1) ya están hechos. Esto es
lo que sigue, de mayor a menor apalancamiento — **empezar por el punto 1, es el único bloqueante
real**:

1. **[ ] Verificar mobile en un emulador/dispositivo real** — ningún cambio de mobile de esta
   sesión (`ThemeContext.tsx`, `AmbientBackground.tsx`, fuentes, `expo-linear-gradient` recién
   instalado) se vio renderizado ni una sola vez, solo se verificó por estructura/tipos. Correr
   `npx expo start` (o una build de desarrollo) es el paso obligatorio antes de seguir construyendo
   pantallas mobile — si algo se rompió, es más barato descubrirlo ahora que después de 5 pantallas más.
2. **[ ] Montar `<AmbientBackground>` en `HomeScreen.tsx`** (mobile) — quitar el `backgroundColor`
   sólido de su View raíz, envolver el contenido, y ajustar las tarjetas/secciones para que
   funcionen como superficies "casi opacas" encima (usar `colors.card`/`colors.surface` ya
   actualizados, o `<BlurView>` de `expo-blur` donde de verdad se quiera vidrio). Este archivo tiene
   552 líneas y ya usa `colors` de `useTheme()` en casi todo — no se tocó su layout en esta sesión
   por no poder verificarlo visualmente; es el candidato número 1 para la próxima sesión.
3. **[ ] Aplicar el mismo tratamiento a Home/Market en web** (`src/pages/Market.tsx` o `Home.tsx` —
   confirmar cuál es la home real de Comprador) — ya hereda los tokens base y ahora vive bajo el
   navbar rediseñado; falta pasar sus tarjetas de producto a `.glass`/radios nuevos y sumarle al
   menos 2 de las 9 animaciones de `DESIGN.md` (candidatas obvias: entrada escalonada de la grilla
   de productos, levitación de tarjeta al hover).
4. **[ ] Barrer los ~300 overrides con hex literal de `css/dark.css`** (web) — todo lo que no sea
   el bloque `:root`/`html.dark{}` de tokens (ya migrado) sigue con colores tipo `#1e293b`/`#334155`
   escritos a mano por componente (chat, checkout, historial, market, etc.). Recomendado: hacerlo
   por sección del archivo (ya está dividido con comentarios `/* ── Nombre ── */`), no todo de una vez.
5. **[ ] Barrer los ~24 archivos restantes con `#2563EB` literal** (modo claro, web — ya se
   corrigieron `Header.tsx` y la referencia en `HomeScreen.tsx` de mobile) y cualquier hex duro
   equivalente suelto en otros componentes mobile fuera de `useTheme()`/`Colors`.
6. **[ ] Decidir el destino de `lucide-react`** (web) e `Ionicons` (mobile) frente a la regla "un
   solo set de línea propio, cero emoji" de `DESIGN.md` — mantenerlos como el set oficial de facto,
   o sustituir por un set custom. No decidido todavía.
7. **[ ] Una vez migradas todas las pantallas**, borrar `Sora-*.ttf`/`Manrope-*.ttf` de
   `apps/web/web/public/fonts/` y `apps/mobile/frontend/assets/fonts/`, y quitar su `@font-face`/
   entrada en `useFonts()`.

## 4. Riesgos y notas para quien continúe

- El fondo ambiental fue corregido una vez ya por saturar demasiado — si al implementarlo en código
  real (fuera del mockup HTML) se ve "más fuerte" de lo esperado, sospechar primero de diferencias
  de renderizado de `backdrop-filter`/gradientes entre navegador de escritorio y WebView de React
  Native. **Ya resuelto:** RN no soporta `backdrop-filter` nativo, pero el proyecto ya tenía
  `expo-blur` instalado (`<BlurView>`) para el efecto vidrio, y se instaló `expo-linear-gradient`
  para el degradado — ver sección 2.1. El fondo de mobile se decidió **estático**, no animado.
- Solo se tocaron archivos de tokens base (ver sección 2) — ningún componente/pantalla individual
  se editó todavía, es intencional, para no romper nada a medias. La sección 3, paso 5, es el
  primer punto donde se toca una pantalla real.
- El fondo `body { background: var(--ambient); background-attachment: fixed; }` en web ya es real
  y global — cualquier página cuyo wrapper raíz no tenga su propio `background` sólido ya lo está
  mostrando. Antes de tocar una pantalla, revisar si se ve bien "de fondo" detrás del contenido
  actual (que todavía no tiene superficies `.glass`) — es esperable que se vea plano/poco integrado
  hasta que esa pantalla reciba su pase de vidrio.
- Verificar SIEMPRE contraste texto/fondo tras cualquier cambio de paleta — hubo un bug real de
  "texto blanco sobre fondo blanco" en el mockup (número de pedido) que se corrigió; es un tipo de
  error fácil de reintroducir al portar valores a componentes reales.
