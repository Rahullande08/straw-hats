import { createApp } from './app.js';
import { initializeDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const PORT = env.PORT || 3001;

async function startServer() {
  try {
    logger.info(`[STARTUP] Initializing Mandate Gateway Server in mode: ${env.NODE_ENV.toUpperCase()}`);

    // Initialize database migrations and seed baseline
    await initializeDatabase();

    const app = createApp();

    const server = app.listen(PORT, () => {
      logger.info(`Mandate Gateway Backend listening on http://localhost:${PORT}`);
    });

    const shutdown = async () => {
      logger.info('Shutting down Mandate Gateway server gracefully...');
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    return { app, server };
  } catch (err) {
    logger.error('Fatal server startup error', err);
    process.exit(1);
  }
}

// Automatically start if executed directly
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  startServer();
}

export { createApp, startServer };
