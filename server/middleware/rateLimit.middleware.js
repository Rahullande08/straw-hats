import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const standardLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this client. Rate limit exceeded, please retry later.',
    retryAfterSeconds: Math.round(env.RATE_LIMIT_WINDOW_MS / 1000)
  }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

export const aiProcurementLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'AI brief evaluation rate limit reached. Please throttle sub-agent task queries.'
  }
});

