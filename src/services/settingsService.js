import { apiClient } from './apiClient.js';

export const settingsService = {
  getSettings: () => apiClient.get('/settings'),
  saveSettings: (settings) => apiClient.post('/settings', settings),
  updateSettings: (settings) => apiClient.put('/settings', settings)
};

