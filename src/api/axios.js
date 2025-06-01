import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NODE_ENV === "production" ? 'https://f626-2804-14c-8181-82ba-adb2-1e16-2d25-8ae2.ngrok-free.app' : 'http://192.168.0.200:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(config => {
  config.headers['X-User-Uuid'] = localStorage.getItem('uuid_usuario');
  config.headers['Authorization'] = localStorage.getItem('token');
  return config;
});

export default api;