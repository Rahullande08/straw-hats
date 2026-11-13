import { apiClient } from './apiClient.js';

export const activityService = {
  getActivity: () => apiClient.get('/activity'),
  exportCsv: () => apiClient.get('/activity/export?format=csv'),
  exportJson: () => apiClient.get('/activity/export?format=json')
};

