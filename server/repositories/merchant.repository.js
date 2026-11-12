import { query } from '../config/database.js';

export class MerchantRepository {
  async findByDomain(domain) {
    if (!domain) return null;
    const clean = domain.trim().toLowerCase();
    const res = await query(
      `SELECT * FROM merchants WHERE LOWER(canonical_domain) = $1`,
      [clean]
    );
    return res.rows[0] || null;
  }

  async findByName(name) {
    if (!name) return null;
    const clean = name.trim().toLowerCase();
    const res = await query(
      `SELECT * FROM merchants WHERE LOWER(name) = $1`,
      [clean]
    );
    return res.rows[0] || null;
  }

  async upsertMerchant({ id, name, canonicalDomain, verificationStatus = 'VERIFIED', reputationScore = 100 }) {
    const res = await query(
      `INSERT INTO merchants (id, name, canonical_domain, verification_status, reputation_score, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (canonical_domain) DO UPDATE
       SET name = EXCLUDED.name, verification_status = EXCLUDED.verification_status
       RETURNING *`,
      [id, name, canonicalDomain.toLowerCase(), verificationStatus, reputationScore]
    );
    return res.rows[0];
  }

  async getAll() {
    const res = await query('SELECT * FROM merchants ORDER BY name ASC');
    return res.rows;
  }
}

export const merchantRepository = new MerchantRepository();
