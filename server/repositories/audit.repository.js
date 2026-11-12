import { query } from '../config/database.js';
import { computeAuditEventHash } from '../utils/crypto.js';

export class AuditRepository {
  async getLatestLog() {
    const res = await query(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1`
    );
    return res.rows[0] || null;
  }

  async createLog(data, client = null) {
    const runner = client || { query };
    const latest = await this.getLatestLog();
    const previousHash = latest ? latest.event_hash : 'GENESIS_HASH_00000000000000000000';

    const now = new Date().toISOString();
    const id = data.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const eventHash = computeAuditEventHash({
      previousHash,
      eventType: data.eventType,
      actorId: data.actorId || 'unknown_actor',
      entityId: data.entityId || 'none',
      action: data.action || data.eventType,
      outcome: data.outcome || 'SUCCESS',
      metadataJson: data.metadataJson || {},
      createdAt: now
    });

    const res = await runner.query(
      `INSERT INTO audit_logs (
         id, user_id, actor_type, actor_id, event_type, entity_type, entity_id,
         action, outcome, summary, amount, meta, metadata_json, previous_hash, event_hash, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        id,
        data.userId || null,
        data.actorType || 'USER',
        data.actorId || 'unknown_actor',
        data.eventType,
        data.entityType || 'SYSTEM',
        data.entityId || 'none',
        data.action || data.eventType,
        data.outcome || 'SUCCESS',
        data.summary,
        data.amount || null,
        data.meta || null,
        JSON.stringify(data.metadataJson || {}),
        previousHash,
        eventHash,
        now
      ]
    );

    return res.rows[0];
  }

  async getLogs({ userId = null, limit = 50, offset = 0, eventType = null }) {
    let sql = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (userId) {
      sql += ` AND (user_id = $${idx++} OR user_id IS NULL)`;
      params.push(userId);
    }
    if (eventType) {
      sql += ` AND event_type = $${idx++}`;
      params.push(eventType);
    }

    sql += ` ORDER BY created_at DESC, id DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const res = await query(sql, params);
    return res.rows;
  }

  async getChronologicalLogs() {
    const res = await query(
      `SELECT * FROM audit_logs ORDER BY created_at ASC, id ASC`
    );
    return res.rows;
  }

  async createSecurityEvent(data) {
    const id = data.id || `sec_evt_${Date.now()}`;
    const res = await query(
      `INSERT INTO agent_security_events (
         id, agent_passport_id, attack_type, severity, description, blocked, metadata_json, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [
        id,
        data.agentPassportId || null,
        data.attackType,
        data.severity || 'HIGH',
        data.description,
        data.blocked !== undefined ? data.blocked : true,
        JSON.stringify(data.metadataJson || {})
      ]
    );
    return res.rows[0];
  }

  async getSecurityEvents(limit = 20) {
    const res = await query(
      `SELECT * FROM agent_security_events ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return res.rows;
  }
}

export const auditRepository = new AuditRepository();
