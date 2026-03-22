import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000', // Aqui é onde seu backend do Docker está rodando
});

// Interceptor: Pega o token salvo no login e injeta em todas as próximas requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});