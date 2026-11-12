/**
 * Structured Application Logger
 */

export const logger = {
  info: (message, context = {}) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, Object.keys(context).length ? JSON.stringify(context) : '');
  },
  warn: (message, context = {}) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, Object.keys(context).length ? JSON.stringify(context) : '');
  },
  error: (message, error = null, context = {}) => {
    const errDetails = error ? (error.stack || error.message || error) : '';
    console.error(`[ERROR] [${new Date().toISOString()}] ${message} ${errDetails}`, Object.keys(context).length ? JSON.stringify(context) : '');
  },
  debug: (message, context = {}) => {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] [${new Date().toISOString()}] ${message}`, Object.keys(context).length ? JSON.stringify(context) : '');
    }
  }
};
