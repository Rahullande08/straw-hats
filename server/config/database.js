import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

let pool = null;
let isInMemory = false;
let inMemoryDb = null;

/**
 * Initialize connection pool to PostgreSQL or in-memory pg-mem adapter
 */
export async function getPool() {
  if (pool) return pool;

  if (env.DATABASE_URL) {
    logger.info('Connecting to PostgreSQL using DATABASE_URL...');
    pool = new pg.Pool({
      connectionString: env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: env.isProduction ? { rejectUnauthorized: false } : false
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client', err);
    });
  } else {
    logger.info('No DATABASE_URL configured. Initializing embedded PostgreSQL instance (pg-mem)...');
    const { newDb } = await import('pg-mem');
    inMemoryDb = newDb();
    
    // Create pg adapter
    const adapter = inMemoryDb.adapters.createPg();
    pool = new adapter.Pool();
    isInMemory = true;
  }

  return pool;
}

/**
 * Execute query with automatic error handling
 */
export async function query(text, params = []) {
  const p = await getPool();
  const start = Date.now();
  try {
    const res = await p.query(text, params);
    const duration = Date.now() - start;
    if (duration > 500) {
      logger.warn('Slow query detected', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (err) {
    logger.error('Database query error', err, { text, params });
    throw err;
  }
}

/**
 * Run operations inside an ACID transaction
 */
export async function runInTransaction(callback) {
  const p = await getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      logger.error('Transaction rollback failed', rbErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Run version-controlled SQL migrations and baseline seeds
 */
export async function initializeDatabase() {
  const p = await getPool();

  const migrationsDir = path.join(__dirname, '../database/migrations');
  const seedsDir = path.join(__dirname, '../database/seeds');

  // Read migrations
  if (fs.existsSync(migrationsDir)) {
    const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of migrationFiles) {
      logger.info(`Applying database migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await p.query(sql);
    }
  }

  // Check if seed is needed (e.g. users table empty)
  const usersCheck = await p.query('SELECT count(*) as count FROM users');
  const userCount = parseInt(usersCheck.rows[0]?.count || '0', 10);

  if (userCount === 0 && fs.existsSync(seedsDir)) {
    const seedFiles = fs.readdirSync(seedsDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of seedFiles) {
      logger.info(`Applying database seed: ${file}`);
      const seedSql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
      await p.query(seedSql);
    }
  }

  logger.info('Database initialization complete.', {
    isInMemory,
    databaseMode: isInMemory ? 'EMBEDDED_POSTGRES' : 'REMOTE_POSTGRES'
  });
}

/**
 * Health check distinguishing process from database
 */
export async function checkDatabaseHealth() {
  const start = Date.now();
  try {
    const p = await getPool();
    await p.query('SELECT 1 as health_check');
    const latencyMs = Date.now() - start;
    return {
      status: 'UP',
      connected: true,
      mode: isInMemory ? 'EMBEDDED_POSTGRES' : 'POSTGRES_LIVE',
      latencyMs
    };
  } catch (err) {
    return {
      status: 'DOWN',
      connected: false,
      error: err.message,
      latencyMs: Date.now() - start
    };
  }
}
