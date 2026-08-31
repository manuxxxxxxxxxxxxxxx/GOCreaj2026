# GOCreaj — Rediseño de frontend v2 (registro de continuidad)

> **Léeme primero si estás retomando este proyecto en otra sesión/cuenta de Claude Code.**
> Este documento describe el frontend construido desde cero en la sesión que terminó el
> **2026-08-23**. Reemplaza por completo cualquier frontend anterior — no hay relación de
> código entre esta versión y la que describen `DESIGN.md` y `docs/redisenio/PROGRESO.md`
> (esos dos archivos documentan un sistema visual distinto, "Bandera Institucional"
> navy+dorado, sobre un frontend que fue **borrado por completo** al inicio de esta sesión).
> La única parte de `DESIGN.md` que sigue vigente es la sección **"Flujo logístico —
> confirmación por código QR"** (líneas 213-221): es lógica de negocio del backend, no
> diseño visual, y ya está implementada tal cual en este frontend nuevo.

## 0. Estado al cierre de esta sesión

- **Backend PHP**: sin ningún cambio. Se usa tal cual existía.
- **Web** (`apps/web/web`): reconstruida 100% desde cero. 86 archivos fuente. TypeScript compila sin errores. Verificada en vivo contra el backend real (registro, login, home con datos reales, carrito).
- **App móvil** (`apps/mobile/frontend`): reconstruida 100% desde cero (Expo SDK 57). 73 archivos fuente. TypeScript compila sin errores. Verificada en vivo vía `expo start --web` (registro, login, home, carrito, cambio de tema).
- **Frontend viejo**: borrado con `rm -rf`, pero el trabajo sin commitear de esa versión quedó guardado en un `git stash` con el mensaje `pre-rediseno: snapshot frontend antes de borrado total (app + web)` — recuperable con `git stash list` / `git stash show`.
- Admin **no tiene app móvil** (decisión explícita: panel separado, solo web).

## 1. Cómo levantar todo para seguir trabajando

```bash
# 1. Encender XAMPP (Apache + MySQL) desde su panel — el frontend no funciona sin esto.

# 2. Web (Vite) — puerto 5173 o el siguiente libre
npm --prefix apps/web/web run dev

# 3. App móvil en modo navegador (para verificar sin emulador/dispositivo)
npm --prefix apps/mobile/frontend run web
# equivalente: npx expo start --web (desde apps/mobile/frontend)

# Ambos configs ya están en .claude/launch.json como "web-vite" y "mobile-web"
# para usarse con la herramienta de preview del entorno.
```

Usuario de prueba creado durante la verificación de esta sesión: `camila.test@gocreaj.dev` / `test1234` (rol comprador).

**Gotcha de red para la app móvil**: `src/lib/api/client.ts` apunta a `http://localhost/...` en iOS/web y `http://10.0.2.2/...` en Android (emulador). Para probar en un **teléfono físico** con Expo Go hay que cambiar `DEV_HOST` a la IP de LAN de la PC.

## 2. Sistema de diseño actual (el que aplica ahora)

Definido en dos rondas de preguntas con el usuario. Resumen de decisiones, en orden de prioridad:

- **Identidad**: dark-native, monocromático de alto contraste, **un único acento sólido** (no multicolor), con glow difuso tipo mesh gradient + overlay de puntos en cuadrícula sutil.
- **Acento**: cian eléctrico. Claro `#0891B2` / Oscuro `#38D6FF`.
- **Fondo**: Claro `#F4F6FA` / Oscuro `#080B14` (no negro puro).
- **4 niveles de superficie** por luminosidad (fondo → card → card elevada → popover), sin bordes marcados.
- **Colores semánticos independientes del acento** para estados de pedido: verde (`ok`), ámbar (`warn`), rojo (`danger`) — no variantes de cian.
- **Tipografía**: Space Grotesk (display/títulos) + Inter (cuerpo/UI) + IBM Plex Mono (cifras/precios, tabular).
- **Espaciado**: escala de 4pt (4/8/12/16/24/32).
- **Iconos**: **Phosphor únicamente, cero emojis en toda la app.**
  - Web: `@phosphor-icons/react` — nombres pelados, ej. `import { House, ShoppingCart } from "@phosphor-icons/react"`.
  - Móvil: `phosphor-react-native` — **todos los nombres llevan sufijo `Icon`**, ej. `import { HouseIcon, ShoppingCartIcon } from "phosphor-react-native"`. Confundir esto rompe el build.
- **Animación**: nivel cinematográfico (el más alto de las opciones ofrecidas) — entrada escalonada de tarjetas, glow flotante, indicador de tab deslizante, "vuelo" al agregar al carrito, pulso en el ícono de Pedidos cuando hay una entrega en curso.
- **Ambos modos** (claro/oscuro), con toggle manual expuesto al usuario (Perfil en ambas plataformas), no solo automático por sistema.

Tokens completos en:
- Web: `apps/web/web/src/styles/tokens.css` (variables CSS, `:root` + `[data-theme]` + `prefers-color-scheme`).
- Móvil: `apps/mobile/frontend/src/theme/tokens.ts` (objetos JS `lightTokens`/`darkTokens`, sin CSS vars).

## 3. Arquitectura de navegación (la parte más específica de este proyecto)

Decidida en el cuestionario de arquitectura — ver historial de chat para el detalle completo, resumen aquí:

### App móvil — 5 tabs inferiores, cambian según el rol activo del usuario
| Tab | Comprador | Vendedor | Repartidor |
|---|---|---|---|
| 1 (Inicio) | Feed/Home | Resumen (KPIs) | Disponibles (+ switch en línea) |
| 2 | Explorar | Pedidos | Entregas |
| 3 | Reels | Reels | Reels |
| 4 | Chat | Chat | Chat |
| 5 | Perfil | Perfil | Perfil |

- Top bar propia (no del sistema): saludo + ícono Pedidos (con pulso animado si hay entrega `en_camino`) + ícono Carrito (**oculto por completo**, no solo deshabilitado, para vendedor/repartidor).
- Top bar y tab bar solo viven en las 5 pantallas raíz (`TabsShell.tsx`); las pantallas de detalle (`ProductDetail`, `Checkout`, etc.) se apilan encima sin ellas.
- Tab bar flotante con indicador que se desliza (Reanimated), no la barra nativa de sistema.
- Implementación: `src/navigation/{RootNavigator,AuthStack,MainStack,TabsShell,BottomTabBar,TopBar,tabConfig}.tsx`.

### Web — sidebar colapsable para dashboards, topnav para la tienda pública
- Comprador vive en `PublicLayout` (topnav con Inicio/Explorar/Reels/Chat + buscador + carrito/notificaciones/avatar).
- Vendedor/Repartidor/Admin viven cada uno en su propio `SidebarLayout` (rail colapsable, no comparten navegación con el comprador).
- Admin **solo existe en web**, nunca en móvil.

## 4. Backend — contrato que el frontend respeta (no se tocó nada del backend)

17 archivos PHP en `apps/mobile/backend/`, patrón uniforme:
- `?action=xxx` en query string decide la operación dentro de cada archivo.
- Toda request GET/POST responde JSON `{ ok: boolean, error?: string, ...datos }`.
- Auth: `Authorization: Bearer <token>` (token firmado HMAC-SHA256, ver `gen_token()`/`uid_from_token()` en `conexion.php`).
- El cliente de API (`lib/api/client.ts` en ambas plataformas) centraliza esto: arma la URL, agrega el header, y lanza `ApiError` si `ok:false`.
- Los módulos `lib/api/{auth,productos,carrito,pedidos,chat,vendedor,repartidor,misc,admin}.ts` son **prácticamente idénticos entre web y móvil** (mismas funciones, mismos tipos) — si cambia el backend, replicar el cambio en ambos.
- `lib/types.ts` (idéntico en ambas plataformas) tiene las interfaces TS de cada entidad (`Usuario`, `Producto`, `Pedido`, etc.) — mantenerlas sincronizadas con las columnas reales de `conexion.php` → `db_migrate()`.

Lógica de negocio importante ya reflejada en el frontend:
- Comisión de plataforma 10%, repartidor 20% del subtotal (`COMISION_PLATAFORMA_PCT`/`COMISION_REPARTIDOR_PCT` en `conexion.php`) — el frontend no calcula esto, solo muestra lo que el backend liquida.
- Flujo QR de recogida/entrega — ver sección 0 de este archivo y `DESIGN.md` líneas 213-221. Implementado en `QrScanBox.tsx` (ambas plataformas) + las pantallas de tracking/entregas.
- Checkout: Luhn de tarjeta y validación de cobertura por municipio son server-side; el frontend solo refleja errores.

## 5. Mapa de archivos

### Web (`apps/web/web/src/`)
```
styles/          tokens.css, global.css
lib/             types.ts, format.ts, categoryIcons.tsx, api/ (10 módulos)
context/         AuthContext, ThemeContext, ToastContext, CartContext
components/ui/   Button, IconButton, Card, StatusPill, Input, Avatar, Skeleton, Sheet, ConfirmDialog, EmptyState
components/domain/ StoreCard, ProductCard, CommentsSheet, QrScanBox
components/layout/ TopNav, SidebarLayout, PublicLayout, AuthLayout
pages/           Home, Explorar, ProductDetail, StoreDetail, Cart, Checkout, Orders, OrderTracking,
                 Chat, Reels, Profile, Direcciones, Wallet, Notifications, Convertirse, Soporte, ComingSoon
pages/auth/      Login, Register, ForgotPassword
pages/vendedor/  VendedorLayout, Resumen, Pedidos, Productos, Tienda, Resenas
pages/repartidor/ RepartidorLayout, Disponibles, Entregas, Perfil
pages/admin/     AdminLayout, Resumen, Usuarios, Pedidos, Productos, Cupones, Soporte,
                 Solicitudes, Arbol, Finanzas, Cobertura, Repartidores
routes/          guards.tsx (RequireAuth, RequireRole)
App.tsx          enrutamiento completo
```

### Móvil (`apps/mobile/frontend/src/`)
```
theme/           tokens.ts, ThemeContext.tsx
lib/             (mismo que web, adaptado a AsyncStorage/fetch de RN)
context/         AuthContext, CartContext, ToastContext (con overlay animado propio, no hay DOM)
components/ui/   mismos nombres que web, implementados en RN puro (StyleSheet + Reanimated)
components/domain/ StoreCard, ProductCard, BentoGrid, CommentsSheet, QrScanBox (usa expo-camera)
navigation/      RootNavigator, AuthStack, MainStack, TabsShell, BottomTabBar, TopBar, tabConfig, types.ts
screens/auth/    Login, Register, ForgotPassword
screens/comprador/ Home, Explorar, ProductDetail, StoreDetail, Cart, Checkout, Orders, OrderDetail
screens/shared/  Reels, ChatList, ChatThread, Profile, Notifications, Direcciones, Wallet, Convertirse, Soporte
screens/vendedor/ Resumen, Pedidos, Productos, ProductoForm, Tienda, Resenas
screens/repartidor/ Disponibles, Entregas, Perfil
App.tsx          carga de fuentes (Google Fonts vía @expo-google-fonts/*) + providers + splash screen
```

## 6. Gaps conocidos / lo que falta

- **Chat**: no hay grabación de notas de voz (el backend sí soporta `tipo: 'audio'` en `chat_multi.php`, el frontend no implementa el grabador).
- **Reels**: el reproductor de video (`expo-video` en móvil, `<video>` en web) no se probó con archivos reales de `video_url` — solo se confirmó que no rompe el render sin video.
- **Pulido visual fino**: no se hizo una pasada de comparación pixel a pixel contra el mockup aprobado; el sistema de diseño está aplicado consistentemente pero podría haber ajustes de detalle.
- **Accesibilidad**: no se corrió una auditoría formal (contraste medido solo para fondo/acento base, no para cada combinación; touch targets no medidos uno por uno).
- **Tests**: no hay tests automatizados (unitarios/e2e) para ninguna de las dos plataformas.
- **Admin en árbol de control / finanzas**: funcional pero sin gráficos más allá de barras simples hechas a mano (no se usó ninguna librería de charts).

## 7. Bugs encontrados y corregidos en esta sesión

- **Web**: `<button>` anidado dentro de otro `<button>` en `ProductCard.tsx` (la tarjeta de producto completa era un `<button>` y el botón "+" de agregar rápido estaba adentro) — HTML inválido, causaba error de hidratación en React. Corregido: el contenedor externo ahora es un `<div role="button" tabIndex={0}>` con soporte de teclado (Enter/Espacio), el botón interno sigue siendo un `<button>` real.
- **Móvil**: `StyleSheet.absoluteFillObject` no existe en esta versión de React Native (solo `StyleSheet.absoluteFill`) — corregido en 12 archivos.
- **Móvil**: tipo de `Appearance.getColorScheme()` no calzaba con el estado de `ThemeContext` — corregido ampliando el tipo del estado a `ColorSchemeName | null | undefined`.

## 8. Convenciones a mantener si se sigue construyendo

- No usar emojis en ningún archivo de código ni de UI — siempre iconos Phosphor.
- Todo texto de UI en español, sentence case (sin Title Case).
- Todo color en componentes debe salir de los tokens (`var(--...)` en web, `tokens.xxx` en móvil) — nunca hex sueltos.
- Cifras/precios siempre con fuente tabular (`className="tabular"` en web, `fontFamily: "IBMPlexMono_500Medium"` en móvil).
- Confirmación (`ConfirmDialog`/`Sheet`) obligatoria antes de cualquier acción destructiva (cancelar pedido, eliminar cuenta, suspender usuario, etc.) — ya es el patrón en todo el código existente, mantenerlo.
