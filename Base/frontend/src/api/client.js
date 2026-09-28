import axios from 'axios';

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

const client = axios.create({
  baseURL: API_BASE_URL,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('devlab_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    const isAuthRoute = config?.url?.includes('/api/auth/');

    if (response?.status === 401 && !config._retry && !isAuthRoute) {
      config._retry = true;
      const refreshToken = localStorage.getItem('devlab_refresh_token');
      if (!refreshToken) {
        return Promise.reject(error);
      }

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_BASE_URL}/api/auth/refresh`, { refresh_token: refreshToken })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const { data } = await refreshPromise;
        localStorage.setItem('devlab_token', data.token);
        localStorage.setItem('devlab_refresh_token', data.refresh_token);
        config.headers.Authorization = `Bearer ${data.token}`;
        return client(config);
      } catch (refreshErr) {
        localStorage.removeItem('devlab_token');
        localStorage.removeItem('devlab_refresh_token');
        localStorage.removeItem('devlab_user');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
