import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

// Load environment variables from .env file
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  SESSION_SECRET: process.env.SESSION_SECRET || 'mandate-gateway-default-insecure-dev-secret-32chars!',
  CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3001,http://127.0.0.1:5173',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // PayPal Sandbox configuration
  PAYPAL_MODE: process.env.PAYPAL_MODE || 'sandbox',
  PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID || '',
  PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET || '',
  PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID || '',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '400', 10),
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '30', 10),

  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  isDevelopment: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
};

// Validate environment constraints
if (env.isProduction) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    console.warn('[SECURITY WARNING] SESSION_SECRET is shorter than 32 characters in production!');
  }
}

