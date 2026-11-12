import { query } from '../config/database.js';

export class PassportRepository {
  async findAllByUserId(userId) {
    const res = await query(
      `SELECT * FROM agent_passports WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  async findById(id, userId = null) {
    let sql = `SELECT * FROM agent_passports WHERE id = $1`;
    const params = [id];
    if (userId) {
      sql += ` AND user_id = $2`;
      params.push(userId);
    }
    const res = await query(sql, params);
    return res.rows[0] || null;
  }

  async findByTokenHash(tokenHash) {
    const res = await query(
      `SELECT ap.*, u.name as user_name
       FROM agent_passports ap
       JOIN users u ON ap.user_id = u.id
       WHERE ap.token_hash = $1`,
      [tokenHash]
    );
    return res.rows[0] || null;
  }

  async findByTokenPrefix(prefix) {
    const res = await query(
      `SELECT * FROM agent_passports WHERE LOWER(token_prefix) = LOWER($1)`,
      [prefix]
    );
    return res.rows[0] || null;
  }

  async create(data) {
    const {
      id,
      userId,
      agentName,
      agentIdentifier,
      tokenHash,
      tokenPrefix,
      publicKey,
      status = 'ACTIVE',
      spendingLimit,
      allowedCategories = [],
      enclaveAttestation = 'Software Cryptographic Token (SHA-256 Validated)',
      expiresAt = null
    } = data;

    const res = await query(
      `INSERT INTO agent_passports (
         id, user_id, agent_name, agent_identifier, token_hash, token_prefix,
         public_key, status, spending_limit, allowed_categories, enclave_attestation,
         expires_at, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       RETURNING *`,
      [
        id,
        userId,
        agentName,
        agentIdentifier,
        tokenHash,
        tokenPrefix,
        publicKey,
        status,
        spendingLimit,
        JSON.stringify(allowedCategories),
        enclaveAttestation,
        expiresAt
      ]
    );
    return res.rows[0];
  }

  async updateStatus(id, userId, status) {
    const revokedAt = status === 'REVOKED' ? 'NOW()' : 'NULL';
    const res = await query(
      `UPDATE agent_passports
       SET status = $1, revoked_at = ${revokedAt}
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [status, id, userId]
    );
    return res.rows[0] || null;
  }

  async incrementOrdersCompleted(id) {
    await query(
      `UPDATE agent_passports SET orders_completed = orders_completed + 1 WHERE id = $1`,
      [id]
    );
  }
}

export const passportRepository = new PassportRepository();
