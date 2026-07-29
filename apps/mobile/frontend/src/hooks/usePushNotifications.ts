import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api, Endpoints } from '@/services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Pide permiso de notificaciones y registra el expo_push_token del dispositivo
 * en la cuenta del usuario logueado. No hace nada si:
 *  - el usuario no está logueado,
 *  - corre en un simulador/emulador (no hay token real),
 *  - el proyecto EAS todavía no está configurado (falta app.json → extra.eas.projectId,
 *    ver docs/PUSH_NOTIFICATIONS.md — esto lo debe completar Noel fuera de este entorno).
 */
export function usePushNotifications(usuarioId: number | undefined): void {
  useEffect(() => {
    if (!usuarioId) return;

    (async () => {
      try {
        if (!Device.isDevice) return; // los simuladores no reciben push reales

        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) {
          if (__DEV__) console.warn('[push] Falta extra.eas.projectId en app.json — ver docs/PUSH_NOTIFICATIONS.md');
          return;
        }

        const { status: existing } = await Notifications.getPermissionsAsync();
        let status = existing;
        if (status !== 'granted') {
          const req = await Notifications.requestPermissionsAsync();
          status = req.status;
        }
        if (status !== 'granted') return;

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
          });
        }

        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (token) {
          await api(Endpoints.authGuardarPushToken, { body: { expo_push_token: token } });
        }
      } catch (e) {
        if (__DEV__) console.warn('[push] No se pudo registrar el token:', e);
      }
    })();
  }, [usuarioId]);
}
