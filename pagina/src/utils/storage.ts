import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  cart:             'lm_cart_v1',
  checkout:         'lm_checkout_v1',
  deliveries:       'lm_deliveries',
  deliveriesActive: 'lm_deliveries_active',
  chat:             'lm_chat_v2',
  reels:            'lm_reels_state',
  user:             'lm_user_v1',
  orders:           'lm_orders_v1',
  theme:            'lm_theme',
  allUsers:         'lm_all_users_v1',
  accessToken:      'lm_access_token',
  refreshToken:     'lm_refresh_token',
} as const;

export async function storageGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function storageSet<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export async function storageRemove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {}
}

export async function storageClear(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch {}
}
