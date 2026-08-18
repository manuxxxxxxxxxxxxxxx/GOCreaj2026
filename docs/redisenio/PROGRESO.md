# Rediseño [SV]Go — Registro de progreso y continuidad

> Este archivo existe para que **cualquier sesión de Claude Code** (esta cuenta u otra) pueda
> retomar el rediseño exactamente donde quedó, sin depender del historial de chat ni de los
> tokens de una conversación específica. Léelo primero. Actualízalo cada vez que termines un
> bloque de trabajo, aunque sea pequeño.

## Estado actual: FASE 1 completa. FASE 2 muy avanzada en color/tipografía (toda la web y toda la app barridas del palette viejo); falta la capa visual (vidrio/animaciones) pantalla por pantalla.

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
