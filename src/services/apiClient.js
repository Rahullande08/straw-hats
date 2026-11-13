import { dispatchMockRequest } from '../api/mockService.js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' && process.env ? process.env : {});
const RAW_BASE = env.VITE_API_BASE_URL;
const BASE_URL = RAW_BASE ? RAW_BASE.replace(/\/+$/, '') : '/api';
const APP_MODE = (env.VITE_APP_MODE || (env.VITE_DEMO_MODE === 'true' ? 'demo' : 'api')).toLowerCase();

export const isDemoMode = () => APP_MODE === 'demo';
export const getApiBaseUrl = () => BASE_URL;

class ApiClient {
  constructor() {
    this.baseUrl = BASE_URL;
    this.appMode = APP_MODE;
    this.connectionListeners = new Set();
    this.isOnline = true;
  }

  onConnectionChange(callback) {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  notifyConnection(isOnline, error = null) {
    this.isOnline = isOnline;
    this.connectionListeners.forEach(cb => cb({ isOnline, error }));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mandate-gateway-connection', { 
        detail: { isOnline, error: error?.message || null } 
      }));
    }
  }

  async request(endpoint, options = {}) {
    // 1. If explicitly configured in demo mode, serve from client-side mock service
    if (this.appMode === 'demo') {
      return await dispatchMockRequest(endpoint, options);
    }

    // 2. Otherwise run in API mode connecting to live Express backend
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const config = {
      credentials: 'include',
      headers,
      ...options
    };

    try {
      const res = await fetch(url, config);
      const contentType = res.headers.get('content-type') || '';
      const isHtml = contentType.includes('text/html');

      // If backend returned HTML from Vite/Vercel SPA fallback for an API route
      if (isHtml && !endpoint.includes('.html')) {
        const err = new Error(`Backend route ${endpoint} returned HTML shell instead of API response.`);
        err.status = 502;
        this.notifyConnection(false, err);
        throw err;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const err = new Error(errData.error || `HTTP ${res.status}: ${res.statusText}`);
        err.status = res.status;
        err.code = errData.code || 'API_ERROR';
        err.data = errData;
        throw err;
      }

      this.notifyConnection(true);
      return await res.json();
    } catch (err) {
      const isNetworkIssue =
        err.name === 'TypeError' ||
        err.name === 'SyntaxError' ||
        err.message?.includes('fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('ERR_CONNECTION_REFUSED');

      if (isNetworkIssue) {
        this.notifyConnection(false, err);
      }
      throw err;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  post(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options
    });
  }

  put(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options
    });
  }

  patch(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...options
    });
  }

  del(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }
}

export const apiClient = new ApiClient();

