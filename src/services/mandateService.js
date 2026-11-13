import { apiClient } from './apiClient.js';

export const mandateService = {
  getMandates: () => apiClient.get('/mandates'),
  getMandateById: (id) => apiClient.get(`/mandates/${id}`),
  createMandate: (data) => apiClient.post('/mandates', data),
  updateMandate: (id, data) => apiClient.put(`/mandates/${id}`, data),
  updateStatus: (id, status) => apiClient.patch(`/mandates/${id}/status`, { status }),
  revokeMandate: (id) => apiClient.post(`/mandates/${id}/revoke`)
};

