import { apiClient } from './apiClient.js';

export const requestService = {
  getRequests: () => apiClient.get('/requests'),
  getRequestById: (id) => apiClient.get(`/requests/${id}`),
  createRequest: (data) => apiClient.post('/requests', data),
  approveRequest: (id) => apiClient.post(`/requests/${id}/approve`),
  rejectRequest: (id, reason) => apiClient.post(`/requests/${id}/reject`, { reason }),
  cancelRequest: (id, reason) => apiClient.post(`/requests/${id}/cancel`, { reason }),
  getDisputePack: (id) => apiClient.get(`/requests/${id}/dispute-pack`)
};

