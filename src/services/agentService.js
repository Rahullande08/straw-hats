import { apiClient } from './apiClient.js';

export const agentService = {
  parseBrief: (prompt) => apiClient.post('/agent/parse-brief', { prompt }),
  evaluateCandidates: (brief) => apiClient.post('/agent/evaluate-candidates', { brief }),
  searchProducts: (prompt) => apiClient.post('/agent/search-products', { prompt }),
  evaluatePolicy: (data) => apiClient.post('/policy/evaluate', data)
};

