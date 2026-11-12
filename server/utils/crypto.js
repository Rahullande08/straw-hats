import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

/**
 * Hash a plain text password using bcrypt
 */
export async function hashPassword(plainText) {
  if (!plainText || typeof plainText !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  return bcrypt.hash(plainText, BCRYPT_ROUNDS);
}

/**
 * Compare plain text password against bcrypt hash
 */
export async function comparePassword(plainText, hash) {
  if (!plainText || !hash) return false;
  return bcrypt.compare(plainText, hash);
}

/**
 * Generate cryptographically secure random token (hex)
 */
export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash any token string using SHA-256
 */
export function hashToken(token) {
  if (!token) return '';
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/**
 * Generate a prefix representation (e.g. 0x9A...3B81)
 */
export function formatTokenPrefix(token) {
  if (!token) return '';
  const clean = token.startsWith('0x') ? token.slice(2) : token;
  if (clean.length <= 8) return `0x${clean}`;
  return `0x${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

/**
 * Canonical JSON stringifier to guarantee deterministic hashing
 */
export function canonicalJsonStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`).join(',') + '}';
}

/**
 * Compute SHA-256 hash of an audit event linked to previous hash
 */
export function computeAuditEventHash({ previousHash = 'GENESIS_HASH_00000000000000000000', eventType, actorId, entityId, action, outcome, metadataJson = {}, createdAt }) {
  const payload = {
    previousHash,
    eventType,
    actorId,
    entityId,
    action,
    outcome,
    metadataJson,
    createdAt: typeof createdAt === 'string' ? createdAt : new Date(createdAt).toISOString()
  };
  const canonical = canonicalJsonStringify(payload);
  return 'sha256:' + crypto.createHash('sha256').update(canonical).digest('hex');
}
