import { apiClient } from './apiClient.js';

export const dashboardService = {
  getDashboard: () => apiClient.get('/dashboard'),
  getHealth: () => apiClient.get('/health'),
  getReady: () => apiClient.get('/ready'),
  resetDemoState: () => apiClient.post('/demo/reset')
};

