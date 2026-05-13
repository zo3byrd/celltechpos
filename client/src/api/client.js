import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = useAuthStore.getState().token;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    if (err.response?.status === 402) {
      // Store license error so the UI can show the expired screen
      const data = err.response.data;
      useAuthStore.getState().setLicenseError(data);
    }
    return Promise.reject(err);
  }
);

export default api;
