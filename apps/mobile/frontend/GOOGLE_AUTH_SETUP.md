# Configurar "Continuar con Google"

El botón de Google en Login/Register (mobile con `expo-auth-session`, web con
`@react-oauth/google`) ya está implementado de punta a punta, incluyendo la
verificación del ID token en el backend (`apps/mobile/backend/auth.php`,
acción `social`) — no confía en nada que mande el cliente sin verificarlo
contra Google primero. Falta solo el dato externo que el dueño del proyecto
debe generar: el **OAuth Client ID** de Google.

Mientras esa variable no exista, los botones se siguen mostrando (no se oculta
la funcionalidad), pero al presionarlos muestran un aviso explicando que falta
configurarlo — no inventan un client id falso ni fallan en silencio.

## Pasos

1. Ir a [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Crear (o reusar) un proyecto para SV[Go].
3. **Create Credentials → OAuth client ID** → tipo **Web application**. Este
   mismo Client ID sirve para mobile (usa el `scheme` nativo `gocreaj://` como
   redirect URI, definido en `app.json`, vía `expo-auth-session`) y para web
   (Google Identity Services no necesita más que el Client ID + el origen).
   - En "Authorized JavaScript origins" agregar el/los orígenes donde corre la
     web (ej. `http://localhost:5173` en desarrollo, y el dominio real en
     producción).
   - En "Authorized redirect URIs" no hace falta agregar nada para el flujo
     nativo de mobile.
4. Copiar el **Client ID** generado (termina en `.apps.googleusercontent.com`).
5. Configurarlo en los tres lugares:

   - `apps/mobile/frontend/.env` (no se commitea):
     ```
     EXPO_PUBLIC_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
     ```
   - `apps/web/web/.env` (no se commitea):
     ```
     VITE_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
     ```
   - `apps/mobile/backend/conexion.php`, constante `GOOGLE_CLIENT_IDS`
     (imprescindible: es lo que el backend usa para validar el "aud" del ID
     token antes de confiar en él — sin esto, `action=social` con
     `provider=google` siempre responde 401):
     ```php
     define('GOOGLE_CLIENT_IDS', 'tu-client-id.apps.googleusercontent.com');
     ```
     Puede llevar varios Client ID separados por coma si más adelante se
     agregan clientes específicos de iOS/Android (ver sección de abajo).

6. Reiniciar el servidor de Expo (`npx expo start -c`) para que recoja la
   variable — Expo inlinea automáticamente cualquier variable con el prefijo
   `EXPO_PUBLIC_`. Reiniciar también el dev server de Vite para `VITE_*`.

## Producción (builds standalone / EAS Build)

Para builds nativos publicados (no Expo Go) generalmente se necesitan además
Client IDs específicos por plataforma:

- **iOS**: OAuth client tipo "iOS" con el bundle identifier de la app.
- **Android**: OAuth client tipo "Android" con el package name y el SHA-1 de
  la keystore de firma.

El ID token que emite Google para esos clientes lleva el Client ID
correspondiente como "aud", así que hay que agregarlo también a
`GOOGLE_CLIENT_IDS` en el backend (separado por coma) o la verificación lo
rechazará. Esto es un paso adicional solo relevante para el build de
producción; para desarrollo con Expo Go/dev client, el Client ID tipo "Web
application" del paso 3 es suficiente.
