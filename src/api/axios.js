import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? 'https://leme.ngrok.app' : 'http://192.168.0.200:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// fetch('https://gist.githubusercontent.com/allanwk/87bd602da06208026c25dfe3309fabe9/raw/url.json' + '?t=' + Date.now())
//   .then(response => response.json())
//   .then(data => {
//     if (process.env.NODE_ENV === "production") {
//       api.defaults.baseURL = data.prod;
//     } else {
//       api.defaults.baseURL = data.dev;
//     }
//   });

api.interceptors.request.use(config => {
  config.headers['X-User-Uuid'] = localStorage.getItem('uuid_usuario');
  config.headers['Authorization'] = localStorage.getItem('token');
  return config;
});

export default api;