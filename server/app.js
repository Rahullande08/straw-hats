import express from 'express';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';

import { createHelmetMiddleware } from './securityMiddleware.js';
import { createCorsMiddleware } from './config/cors.js';
import { requestIdMiddleware } from './middleware/requestId.middleware.js';
import { standardLimiter } from './middleware/rateLimit.middleware.js';
import { authenticate } from './middleware/auth.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { checkDatabaseHealth } from './config/database.js';
import { killSwitchService } from './services/killSwitch.service.js';
import { mandateRepository } from './repositories/mandate.repository.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import mandatesRoutes from './routes/mandates.routes.js';
import agentRoutes from './routes/agent.routes.js';
import policyRoutes from './routes/policy.routes.js';
import requestsRoutes from './routes/requests.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import paymentMethodsRoutes from './routes/paymentMethods.routes.js';
import passportsRoutes from './routes/passports.routes.js';
import activityRoutes from './routes/activity.routes.js';
import securityRoutes from './routes/security.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import merchantRoutes from './routes/merchant.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export function createApp() {
  const app = express();

  // Security Headers & CORS
  app.use(createHelmetMiddleware());
  app.use(createCorsMiddleware());
  app.use(cookieParser());
  app.use(express.json({ limit: '64kb' }));
  app.use(requestIdMiddleware);

  // Global Standard Rate Limiter on /api
  app.use('/api', standardLimiter);

  // Health Endpoint (distinguishes process health from database readiness)
  app.get('/api/health', async (req, res) => {
    const dbHealth = await checkDatabaseHealth();
    const killSwitch = await killSwitchService.getStatus();
    const activeMandates = await mandateRepository.findAllByUserId('usr_elena_vance').catch(() => []);

    const isHealthy = dbHealth.connected;
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: isHealthy ? 'UP' : 'DEGRADED',
      service: 'Mandate Gateway Core Engine',
      version: '2.4.0',
      mode: dbHealth.mode,
      killSwitchActive: killSwitch.active,
      activeMandatesCount: activeMandates.filter(m => m.status === 'ACTIVE').length,
      database: dbHealth,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime())
    });
  });

  // Session Authentication Middleware
  app.use('/api', authenticate);

  // Register API Routes
  app.use('/api', authRoutes);
  app.use('/api', dashboardRoutes);
  app.use('/api', mandatesRoutes);
  app.use('/api', agentRoutes);
  app.use('/api', policyRoutes);
  app.use('/api', requestsRoutes);
  app.use('/api', paymentsRoutes);
  app.use('/api', paymentMethodsRoutes);
  app.use('/api', passportsRoutes);
  app.use('/api', activityRoutes);
  app.use('/api', securityRoutes);
  app.use('/api', settingsRoutes);
  app.use('/api', merchantRoutes);

  // Production Unified Static Asset Serving & SPA Fallback
  const distPath = path.join(ROOT_DIR, 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.url.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
