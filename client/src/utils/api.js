import axios from 'axios';

const API_URL = 'https://api.luminafly.timka20.ru';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (username, password) => api.post('/api/auth/login', { username, password })
};

export const polesApi = {
  getAll: () => api.get('/api/poles')
};

export const dronesApi = {
  getAll: () => api.get('/api/drones'),
  getDetails: (id) => api.get(`/api/drones/${id}/details`)
};

export const basesApi = {
  getAll: () => api.get('/api/bases')
};

export const statisticsApi = {
  getAll: () => api.get('/api/statistics')
};

export default api;
