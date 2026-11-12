import cors from 'cors';
import { env } from './env.js';

export function createCorsMiddleware() {
  const allowedOrigins = env.CORS_ORIGINS
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin requests)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Session-Token', 'X-CSRF-Token'],
    maxAge: 86400,
  });
}

