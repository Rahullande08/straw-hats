import { query } from '../config/database.js';
import { generateSecureToken } from '../utils/crypto.js';

export const webhookRepository = {
  async getByEventId(eventId) {
    const res = await query(
      `SELECT * FROM webhook_events WHERE event_id = $1`,
      [eventId]
    );
    return res.rows[0] || null;
  },

  async recordEvent({ provider, eventId, eventType, payload, signatureVerified = false }) {
    const id = `wh_${generateSecureToken(12)}`;
    const res = await query(
      `INSERT INTO webhook_events (id, provider, event_id, event_type, payload, status, signature_verified)
       VALUES ($1, $2, $3, $4, $5, 'RECEIVED', $6)
       RETURNING *`,
      [id, provider, eventId, eventType, JSON.stringify(payload), signatureVerified]
    );
    return res.rows[0];
  },

  async markProcessed(eventId, status = 'PROCESSED') {
    const res = await query(
      `UPDATE webhook_events
       SET status = $1, processed_at = CURRENT_TIMESTAMP
       WHERE event_id = $2
       RETURNING *`,
      [status, eventId]
    );
    return res.rows[0];
  }
};
