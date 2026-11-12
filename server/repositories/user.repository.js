import { query, runInTransaction } from '../config/database.js';

export class UserRepository {
  async findById(id) {
    const res = await query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async findByEmail(email) {
    const res = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return res.rows[0] || null;
  }

  async create({ id, name, email, passwordHash, role = 'user', avatar = null, terminalVersion = 'Node v2.4 Live', compliance = 'PCI-DSS 4.0 Attested' }) {
    const res = await query(
      `INSERT INTO users (id, name, email, password_hash, role, avatar, terminal_version, compliance, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [id, name, email, passwordHash, role, avatar, terminalVersion, compliance]
    );
    return res.rows[0];
  }

  async createSession({ id, userId, sessionTokenHash, expiresAt }) {
    const res = await query(
      `INSERT INTO sessions (id, user_id, session_token_hash, expires_at, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [id, userId, sessionTokenHash, expiresAt]
    );
    return res.rows[0];
  }

  async findSessionByTokenHash(sessionTokenHash) {
    const res = await query(
      `SELECT s.*, u.id as user_id, u.name, u.email, u.role, u.avatar, u.terminal_version, u.compliance
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.session_token_hash = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW()`,
      [sessionTokenHash]
    );
    return res.rows[0] || null;
  }

  async revokeSession(sessionTokenHash) {
    await query(
      `UPDATE sessions SET revoked_at = NOW() WHERE session_token_hash = $1`,
      [sessionTokenHash]
    );
  }

  async revokeAllUserSessions(userId) {
    await query(
      `UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1`,
      [userId]
    );
  }
}

export const userRepository = new UserRepository();

