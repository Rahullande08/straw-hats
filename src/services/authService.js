import { apiClient } from './apiClient.js';

export const authService = {
  login: (passphrase, rememberTerminal = true, email = null) =>
    apiClient.post('/login', { passphrase, rememberTerminal, email }),

  register: (userData) =>
    apiClient.post('/register', userData),

  logout: () =>
    apiClient.post('/logout'),

  getSession: () =>
    apiClient.get('/session'),

  getMe: () =>
    apiClient.get('/auth/me'),

  revokeSessions: () =>
    apiClient.post('/auth/revoke-sessions')
};

