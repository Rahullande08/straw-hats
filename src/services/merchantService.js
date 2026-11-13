import { apiClient } from './apiClient.js';

export const merchantService = {
  getMerchants: () => apiClient.get('/merchants'),
  verifyMerchantToken: (token) => apiClient.get(`/passports/verify/${token}`)
};

