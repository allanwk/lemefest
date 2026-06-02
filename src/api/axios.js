import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? 'https://api.lemefest.awkservices.org' : 'http://localhost:3000',
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
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = token;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status;
    const hadToken = !!sessionStorage.getItem('token');
    if (hadToken && (status === 401 || status === 403)) {
      sessionStorage.removeItem('token');
      localStorage.removeItem('bootstrapToken');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;