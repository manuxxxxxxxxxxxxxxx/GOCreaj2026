import axios from 'axios';

export const API_URL = 'http://localhost/GOCreaj2026/apps/mobile/backend';

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
