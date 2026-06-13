import axios from 'axios';

const adminApi = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? 'https://api.lemefest.awkservices.org' : 'http://localhost:3000',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let adminToken = null;

export function setAdminToken(token) {
  adminToken = token;
}

adminApi.interceptors.request.use(config => {
  if (adminToken) {
    config.headers['X-Admin-Token'] = adminToken;
  }
  return config;
});

export default adminApi;
