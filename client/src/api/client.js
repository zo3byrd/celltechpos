import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = useAuthStore.getState().token;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Queue requests that arrive while a token refresh is in flight
let isRefreshing = false;
let refreshQueue = [];

function processQueue(err, token = null) {
  refreshQueue.forEach(({ resolve, reject }) => err ? reject(err) : resolve(token));
  refreshQueue = [];
}

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const store = useAuthStore.getState();

      if (!store.refreshToken) {
        store.logout();
        window.location.href = '/login';
        return Promise.reject(err);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        }).catch(e => Promise.reject(e));
      }

      isRefreshing = true;
      try {
        const { data } = await axios.post('/api/auth/refresh', {
          refreshToken: store.refreshToken,
        });
        const { token: newToken, refreshToken: newRefresh } = data;
        store.setAuth(newToken, store.user, store.plan, newRefresh || store.refreshToken);
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    if (err.response?.status === 402) {
      useAuthStore.getState().setLicenseError(err.response.data);
    }

    return Promise.reject(err);
  }
);

export default api;
