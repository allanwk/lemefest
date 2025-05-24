import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(config => {
  config.headers['X-User-Uuid'] = localStorage.getItem('uuid_usuario');
  return config;
});

// api.interceptors.response.use(response => {
//   return response;
// }, error => {
//   // Optional: Global error handling
//   if (error.response?.status === 401) {
//     // e.g., redirect to login
//   }
//   return Promise.reject(error);
// });

export default api;