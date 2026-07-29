# Notificaciones push reales — pasos pendientes para Noel

El código ya está completo en ambos lados:

- **Backend** (`apps/mobile/backend/conexion.php`, función `enviar_push_expo()`): ya envía un push real vía la API de Expo cada vez que se crea una notificación in-app (`crear_notificacion()`), que ya se dispara en los eventos correspondientes (nuevo pedido, pedido aprobado, oferta de entrega, pedido en camino, entrega completada, etc). No requiere ningún cambio.
- **App** (`apps/mobile/frontend/src/hooks/usePushNotifications.ts`): al iniciar sesión, pide permiso de notificaciones, obtiene el token de push del dispositivo y lo guarda en la cuenta del usuario (`auth.php?action=guardar_push_token`, columna `usuarios.expo_push_token`).

Lo único que falta es una **acción externa que solo Noel puede hacer**, porque requiere su propia cuenta de Expo: crear el proyecto EAS que identifica a la app ante el servicio de push de Expo. Sin esto, `usePushNotifications` detecta que falta la configuración y no hace nada (la app sigue funcionando normal, solo sin push).

## Pasos exactos

1. Crear una cuenta gratuita en [expo.dev](https://expo.dev) si no tienes una.
2. Instalar la CLI de EAS (una sola vez, en tu máquina):
   ```bash
   npm install -g eas-cli
   ```
3. Iniciar sesión con tu cuenta de Expo:
   ```bash
   eas login
   ```
4. Desde `apps/mobile/frontend/`, correr:
   ```bash
   eas init
   ```
   Esto crea el proyecto en tu cuenta de Expo y agrega automáticamente el `projectId` a `app.json` (dentro de `expo.extra.eas.projectId`). Si prefieres hacerlo a mano, el ID también aparece en la página del proyecto en https://expo.dev/accounts/[tu-cuenta]/projects.
5. (Solo si vas a compilar un build standalone, no en Expo Go) Configurar las credenciales de push nativas:
   ```bash
   eas build:configure
   ```
   - **Android**: EAS puede generar las credenciales de Firebase Cloud Messaging (FCM) automáticamente, o puedes subir tu propio `google-services.json` si ya tienes un proyecto de Firebase.
   - **iOS**: EAS puede generar y gestionar el certificado APNs automáticamente con tu cuenta de Apple Developer (`eas credentials`).
6. Publicar/compilar un build nuevo (`eas build`) para que los cambios de `app.json` y las credenciales queden incluidos.

Una vez que `app.json` tenga `expo.extra.eas.projectId`, el registro de push funciona solo — no hace falta tocar más código.

## Cómo probarlo

- En Expo Go, con el `projectId` ya configurado, inicia sesión en la app: debería pedir permiso de notificaciones y, si lo aceptas, guardar el token silenciosamente (revisa la consola de Metro si quieres confirmarlo — con `__DEV__` activo se loguean los errores, no los éxitos, así que "sin warnings" = token guardado).
- Para confirmar que un push realmente llega: haz un pedido de prueba y complétalo hasta que dispare alguna notificación (p. ej. "Pedido en camino"); debería llegar como notificación push al teléfono, no solo aparecer en el centro de notificaciones in-app.
