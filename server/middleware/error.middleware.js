import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || (status === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR');
  const requestId = req.id || 'unknown';

  if (status >= 500) {
    logger.error(`[API 500] ${req.method} ${req.originalUrl || req.url}`, err, { requestId });
  } else {
    logger.warn(`[API ${status}] ${req.method} ${req.originalUrl || req.url}: ${err.message}`, { requestId, code });
  }

  const safeMessage = env.isProduction && status === 500
    ? 'Internal Gateway Server Error. The incident has been recorded in the security audit ledger.'
    : err.message || 'An unexpected error occurred.';

  res.status(status).json({
    success: false,
    error: safeMessage,
    code,
    requestId,
    details: err.details || undefined,
    timestamp: new Date().toISOString()
  });
}

