import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NODE_ENV === "production" ? 'https://03e2-2804-14c-8181-82ba-d0a-200f-9835-e021.ngrok-free.app' : 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(config => {
  config.headers['X-User-Uuid'] = localStorage.getItem('uuid_usuario');
  return config;
});

export default api;