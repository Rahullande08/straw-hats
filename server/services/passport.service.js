import { passportRepository } from '../repositories/passport.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { generateSecureToken, hashToken, formatTokenPrefix } from '../utils/crypto.js';
import { toMinorUnits, fromMinorUnits } from '../utils/money.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export class PassportService {
  formatPassportForClient(p) {
    if (!p) return null;
    const allowedCategories = typeof p.allowed_categories === 'string'
      ? JSON.parse(p.allowed_categories)
      : (p.allowed_categories || ['Hardware & Peripherals']);

    const KNOWN_TOKENS = {
      pass_claude_shop: '0x9A48F9E03B812C44D87102E9B310FCA1',
      pass_perplexity_buy: '0x4C189A021D2988F023AB45CC9031E512',
      pass_autoprocure: '0x7E301CB288F099AD4356E088190B3891'
    };

    return {
      id: p.id,
      agentName: p.agent_name,
      agentIdentifier: p.agent_identifier,
      tokenPrefix: p.token_prefix,
      fullToken: p.full_token || KNOWN_TOKENS[p.id] || p.token_prefix,
      publicKey: p.public_key,
      authorizedBy: 'Elena Vance (Sovereign Operator)',
      spendingCeiling: fromMinorUnits(p.spending_limit, 'INR'),
      spendingCeilingMinor: Number(p.spending_limit),
      expiresInDays: 30,
      status: p.status,
      allowedCategories,
      ordersCompleted: p.orders_completed || 0,
      disputes: p.disputes || 0,
      enclaveAttestation: p.enclave_attestation || 'Software Cryptographic Token (SHA-256 Validated)',
      createdAt: p.created_at,
      revokedAt: p.revoked_at
    };
  }

  async getPassports(userId) {
    const rows = await passportRepository.findAllByUserId(userId);
    return rows.map(r => this.formatPassportForClient(r));
  }

  async getPassportById(id, userId) {
    const p = await passportRepository.findById(id, userId);
    if (!p) {
      throw new NotFoundError(`Agent passport #${id} not found`);
    }
    return this.formatPassportForClient(p);
  }

  async createPassport({ userId, agentName, spendingCeiling = 15000, allowedCategories = ['Hardware & Peripherals'] }) {
    if (!agentName || typeof agentName !== 'string' || !agentName.trim()) {
      throw new BadRequestError('Agent name is required');
    }

    const rawToken = `0x${generateSecureToken(16).toUpperCase()}`;
    const tokenHash = hashToken(rawToken);
    const tokenPrefix = formatTokenPrefix(rawToken);
    const publicKey = `ed25519:${generateSecureToken(24)}`;

    const id = `pass_${agentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;
    const spendingLimitMinor = toMinorUnits(Number(spendingCeiling) || 15000, 'INR');

    const passport = await passportRepository.create({
      id,
      userId,
      agentName: agentName.trim(),
      agentIdentifier: `agent.sovereign.${agentName.toLowerCase().replace(/\s+/g, '-')}-v1`,
      tokenHash,
      tokenPrefix,
      publicKey,
      status: 'ACTIVE',
      spendingLimit: spendingLimitMinor,
      allowedCategories: Array.isArray(allowedCategories) ? allowedCategories : [allowedCategories],
      enclaveAttestation: 'Software Cryptographic Token (SHA-256 Validated)',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    await auditRepository.createLog({
      userId,
      actorType: 'USER',
      actorId: userId,
      eventType: 'AGENT_PASSPORT_ISSUED',
      entityType: 'AGENT_PASSPORT',
      entityId: id,
      action: 'ISSUE_PASSPORT',
      outcome: 'SUCCESS',
      summary: `Agent passport token issued for ${agentName} with ceiling ₹${Number(spendingCeiling).toLocaleString()}.`,
      amount: `Ceiling: ₹${Number(spendingCeiling).toLocaleString()}`,
      meta: 'Ed25519 software cryptographic identity sealed'
    });

    const clientObj = this.formatPassportForClient(passport);
    clientObj.fullToken = rawToken; // Only returned once upon creation!
    return clientObj;
  }

  async revokePassport(id, userId) {
    // Lookup by id or clean name
    let passport = await passportRepository.findById(id, userId);
    if (!passport) {
      const all = await passportRepository.findAllByUserId(userId);
      passport = all.find(p => p.id.toLowerCase() === id.toLowerCase() || p.agent_name.toLowerCase().includes(id.toLowerCase()));
    }

    if (!passport) {
      throw new NotFoundError(`Agent passport "${id}" not found`);
    }

    const newStatus = passport.status === 'REVOKED' ? 'ACTIVE' : 'REVOKED';
    const updated = await passportRepository.updateStatus(passport.id, userId, newStatus);

    await auditRepository.createLog({
      userId,
      actorType: 'USER',
      actorId: userId,
      eventType: newStatus === 'REVOKED' ? 'TOKEN_REVOKED' : 'TOKEN_REACTIVATED',
      entityType: 'AGENT_PASSPORT',
      entityId: passport.id,
      action: 'TOGGLE_PASSPORT_STATUS',
      outcome: 'SUCCESS',
      summary: `Agent passport token for ${passport.agent_name} was ${newStatus}.`,
      amount: newStatus,
      meta: 'Cryptographic revocation broadcasted'
    });

    return this.formatPassportForClient(updated);
  }

  async verifyMerchantToken(token) {
    if (!token) {
      return {
        verified: false,
        status: 'UNKNOWN_TOKEN',
        message: 'No token provided'
      };
    }

    // Try finding by token hash first
    const tokenHash = hashToken(token);
    let match = await passportRepository.findByTokenHash(tokenHash);

    // If not found, check if token matches raw prefix or id
    if (!match) {
      const all = await passportRepository.findAllByUserId('usr_elena_vance');
      match = all.find(p =>
        p.id.toLowerCase() === token.toLowerCase() ||
        (p.token_prefix && p.token_prefix.toLowerCase().includes(token.toLowerCase())) ||
        (p.public_key && p.public_key.includes(token))
      );
    }

    if (!match || match.status !== 'ACTIVE') {
      return {
        verified: false,
        status: match ? match.status : 'UNKNOWN_TOKEN',
        message: 'Agent Token is invalid, expired, or revoked by the authorizing human.'
      };
    }

    const categories = typeof match.allowed_categories === 'string'
      ? JSON.parse(match.allowed_categories)
      : (match.allowed_categories || []);

    return {
      verified: true,
      status: 'ACTIVE_AUTHORIZED',
      agentName: match.agent_name,
      authorizedBy: 'Elena Vance (Sovereign Operator)',
      enclaveAttestation: match.enclave_attestation,
      permittedCategories: categories,
      spendingCeiling: fromMinorUnits(match.spending_limit, 'INR'),
      ordersCompleted: match.orders_completed || 0,
      disputes: match.disputes || 0,
      merchantAdvice: 'Trusted Autonomous Agent: You may allow this checkout session without anti-bot blocks.'
    };
  }
}

export const passportService = new PassportService();
