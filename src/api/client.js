import { dispatchMockRequest } from './mockService.js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' && process.env ? process.env : {});
const RAW_BASE = env.VITE_API_BASE_URL;
const BASE_URL = RAW_BASE ? RAW_BASE.replace(/\/+$/, '') : '/api';
const FORCE_DEMO = env.VITE_DEMO_MODE === 'true';

let isDemoSandboxActive = FORCE_DEMO;

export function isDemoMode() {
  return isDemoSandboxActive;
}

export function getApiBaseUrl() {
  return BASE_URL;
}

async function request(endpoint, options = {}) {
  // If explicitly requested via VITE_DEMO_MODE or running in frontend-only mock mode
  if (FORCE_DEMO) {
    isDemoSandboxActive = true;
    return await dispatchMockRequest(endpoint, options);
  }

  const config = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, config);

    const contentType = res.headers.get('content-type') || '';
    const isHtmlResponse = contentType.includes('text/html');

    // If API returned 404/502/503/504 on relative proxy or SPA HTML fallback, fallback to mock service
    if (((res.status === 404 || res.status === 502 || res.status === 503 || res.status === 504) || isHtmlResponse) && !RAW_BASE) {
      console.info(`[Mandate Gateway] Backend route ${endpoint} not available (status: ${res.status}, isHtml: ${isHtmlResponse}). Serving via demo mock layer.`);
      isDemoSandboxActive = true;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mandate-gateway-demo-active', { detail: { endpoint } }));
      }
      return await dispatchMockRequest(endpoint, options);
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const error = new Error(errData.error || `HTTP ${res.status}: ${res.statusText}`);
      error.status = res.status;
      error.data = errData;
      throw error;
    }

    return await res.json();
  } catch (err) {
    // If backend connection was refused, failed network fetch, or parsed HTML as JSON from SPA rewrites
    const isNetworkOrParseIssue =
      err.name === 'TypeError' ||
      err.name === 'SyntaxError' ||
      err.message?.includes('fetch') ||
      err.message?.includes('NetworkError') ||
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('Unexpected token') ||
      err.message?.includes('is not valid JSON') ||
      err.message?.includes('ERR_CONNECTION_REFUSED');

    if (isNetworkOrParseIssue && !RAW_BASE) {
      console.info(`[Mandate Gateway] Live backend unreachable for ${endpoint}. Serving via client-side demo sandbox.`);
      isDemoSandboxActive = true;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mandate-gateway-demo-active', { detail: { endpoint } }));
      }
      return await dispatchMockRequest(endpoint, options);
    }

    console.error(`API Error [${endpoint}]:`, err.message);
    throw err;
  }
}

export const api = {
  // System Health & Demo State
  getHealth: () => request('/health'),
  getReady: () => request('/ready'),
  resetDemoState: () => request('/demo/reset', { method: 'POST' }),

  // Session & Auth
  getSession: () => request('/session'),
  getMe: () => request('/auth/me'),
  login: (passphrase, rememberTerminal, email) => request('/login', {
    method: 'POST',
    body: JSON.stringify({ passphrase, rememberTerminal, email }),
  }),
  register: (userData) => request('/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  logout: () => request('/logout', { method: 'POST' }),
  revokeSessions: () => request('/auth/revoke-sessions', { method: 'POST' }),

  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Mandates
  getMandates: () => request('/mandates'),
  getMandateById: (id) => request(`/mandates/${id}`),
  createMandate: (data) => request('/mandates', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateMandate: (id, data) => request(`/mandates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  updateMandateStatus: (id, status) => request(`/mandates/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  revokeMandate: (id) => request(`/mandates/${id}/revoke`, { method: 'POST' }),

  // Shopping Agent
  parseBrief: (prompt) => request('/agent/parse-brief', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  }),
  evaluateCandidates: (brief) => request('/agent/evaluate-candidates', {
    method: 'POST',
    body: JSON.stringify({ brief }),
  }),
  searchProducts: (prompt) => request('/agent/search-products', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  }),

  // Deterministic Policy Evaluation
  evaluatePolicy: (data) => request('/policy/evaluate', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Requests
  getRequests: () => request('/requests'),
  getRequestById: (id) => request(`/requests/${id}`),
  createRequest: (data) => request('/requests', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  approveRequest: (id) => request(`/requests/${id}/approve`, { method: 'POST' }),
  rejectRequest: (id, reason) => request(`/requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),
  cancelRequest: (id, reason) => request(`/requests/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),
  getDisputePack: (id) => request(`/requests/${id}/dispute-pack`),

  // Payment Methods & Rails
  getPaymentMethods: () => request('/payment-methods'),
  getPaymentOrders: () => request('/payments/orders'),
  getPaymentById: (id) => request(`/payments/${id}`),
  toggleFreezePaymentMethod: (id) => request(`/payment-methods/${id}/toggle-freeze`, { method: 'POST' }),
  connectPaymentRail: (data) => request('/payment-methods/connect', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updatePaymentLimits: (id, data) => request(`/payment-methods/${id}/limits`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Passports
  getPassports: () => request('/passports'),
  getPassportById: (id) => request(`/passports/${id}`),
  createPassport: (data) => request('/passports', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  revokePassport: (id) => request(`/passports/${id}/revoke`, { method: 'POST' }),
  verifyMerchantToken: (token) => request(`/passports/verify/${token}`),

  // Activity / Audit
  getActivity: () => request('/activity'),

  // Security & Resilience
  getAttacks: () => request('/security/attacks'),
  runAttacks: () => request('/security/run-attacks', { method: 'POST' }),
  checkScamMessage: (message) => request('/security/check-message', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),
  getKillSwitch: () => request('/security/kill-switch'),
  toggleKillSwitch: (reason) => request('/security/kill-switch/toggle', {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),
  verifyLedger: () => request('/security/verify-ledger'),

  // Merchants
  getMerchants: () => request('/merchants'),

  // Settings
  getSettings: () => request('/settings'),
  saveSettings: (settings) => request('/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  }),
};
