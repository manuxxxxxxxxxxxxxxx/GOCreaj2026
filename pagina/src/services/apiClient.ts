import axios from 'axios';
import { storageGet, storageSet, storageRemove, KEYS } from '../utils/storage';

export const API_BASE = 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await storageGet<string>(KEYS.accessToken);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = await storageGet<string>(KEYS.refreshToken);
        const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken: refresh });
        const { accessToken } = res.data;
        await storageSet(KEYS.accessToken, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        await storageRemove(KEYS.accessToken);
        await storageRemove(KEYS.refreshToken);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
