import { query } from '../config/database.js';
import { generateSecureToken } from '../utils/crypto.js';

export const idempotencyRepository = {
  async getByKey(key) {
    const res = await query(
      `SELECT * FROM idempotency_keys WHERE idempotency_key = $1 AND expires_at > NOW()`,
      [key]
    );
    return res.rows[0] || null;
  },

  async create({ key, userId = null, requestPath, requestHash, ttlSeconds = 86400 }) {
    const id = `idem_${generateSecureToken(12)}`;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const res = await query(
      `INSERT INTO idempotency_keys (id, user_id, idempotency_key, request_path, request_hash, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, 'PROCESSING', $6)
       RETURNING *`,
      [id, userId, key, requestPath, requestHash, expiresAt]
    );
    return res.rows[0];
  },

  async complete({ key, responseCode, responseBody }) {
    const res = await query(
      `UPDATE idempotency_keys 
       SET status = 'COMPLETED', response_code = $1, response_body = $2
       WHERE idempotency_key = $3
       RETURNING *`,
      [responseCode, JSON.stringify(responseBody), key]
    );
    return res.rows[0];
  },

  async fail({ key, responseCode = 500, responseBody = null }) {
    const res = await query(
      `UPDATE idempotency_keys 
       SET status = 'FAILED', response_code = $1, response_body = $2
       WHERE idempotency_key = $3
       RETURNING *`,
      [responseCode, responseBody ? JSON.stringify(responseBody) : null, key]
    );
    return res.rows[0];
  }
};
