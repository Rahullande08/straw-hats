import { apiClient } from './apiClient.js';

export const securityService = {
  getAttacks: () => apiClient.get('/security/attacks'),
  runAttacks: () => apiClient.post('/security/run-attacks'),
  checkMessage: (message) => apiClient.post('/security/check-message', { message }),
  getKillSwitch: () => apiClient.get('/security/kill-switch'),
  toggleKillSwitch: (reason) => apiClient.post('/security/kill-switch/toggle', { reason }),
  verifyLedger: () => apiClient.get('/security/verify-ledger')
};

