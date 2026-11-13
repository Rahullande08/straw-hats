import { apiClient } from './apiClient.js';

export const passportService = {
  getPassports: () => apiClient.get('/passports'),
  getPassportById: (id) => apiClient.get(`/passports/${id}`),
  createPassport: (data) => apiClient.post('/passports', data),
  revokePassport: (id) => apiClient.post(`/passports/${id}/revoke`),
  verifyToken: (token) => apiClient.get(`/passports/verify/${token}`)
};

