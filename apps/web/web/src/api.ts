import axios from 'axios';

// Usa el host desde el que se cargó la página (localhost en desktop,
// la IP LAN cuando se abre desde el teléfono vía WebView), en vez de
// codificar "localhost" a fuego (lo cual rompe el acceso desde otros dispositivos).
export const API_URL = `http://${window.location.hostname}/GOCreaj2026/apps/mobile/backend`;
export const SOCKET_URL = `http://${window.location.hostname}:3001`;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lm_token_v1');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
