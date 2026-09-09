import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
export const TOKEN_KEY = 'newvision:token';
export const USER_KEY = 'newvision:user';

export const httpClient = axios.create({ baseURL: API_URL });

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
