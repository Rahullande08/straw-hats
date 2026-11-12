import { mandateRepository } from '../repositories/mandate.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { toMinorUnits, fromMinorUnits } from '../utils/money.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';

export class MandateService {
  formatMandateForClient(m) {
    if (!m) return null;
    const currency = m.currency || 'INR';
    const allowedMerchants = Array.isArray(m.merchants) && m.merchants.length > 0
      ? m.merchants.filter(item => item.ruleType === 'ALLOWED').map(item => item.merchantName)
      : ['Amazon India', 'Croma Retail'];

    const agents = typeof m.agents === 'string' ? JSON.parse(m.agents) : (m.agents || ['Claude Shopping']);

    return {
      id: m.id,
      name: m.name,
      description: m.description,
      category: m.category,
      currency,
      budgetCeiling: fromMinorUnits(m.budget_ceiling, currency),
      utilized: fromMinorUnits(m.utilized_amount, currency),
      reserved: fromMinorUnits(m.reserved_amount, currency),
      budgetCeilingMinor: Number(m.budget_ceiling),
      utilizedMinor: Number(m.utilized_amount),
      reservedMinor: Number(m.reserved_amount),
      singlePurchaseLimit: fromMinorUnits(m.single_purchase_limit, currency),
      singlePurchaseLimitMinor: Number(m.single_purchase_limit),
      requiresCoSignerOver: fromMinorUnits(m.cosigner_threshold, currency),
      status: m.status,
      plainTextRule: m.plain_text_rule,
      allowedMerchants,
      agents,
      expiry: m.expires_at ? new Date(m.expires_at).toISOString().split('T')[0] : '2026-12-31',
      expiresAt: m.expires_at,
      createdAt: m.created_at,
      updatedAt: m.updated_at
    };
  }

  async getMandates(userId) {
    const rows = await mandateRepository.findAllByUserId(userId);
    return rows.map(r => this.formatMandateForClient(r));
  }

  async getMandateById(id, userId = null) {
    const m = await mandateRepository.findById(id, userId);
    if (!m) {
      throw new NotFoundError(`Mandate #${id} not found`);
    }
    return this.formatMandateForClient(m);
  }

  async createMandate({
    userId,
    name,
    category = 'General Procurement',
    plainTextRule = '',
    budgetCeiling,
    singlePurchaseLimit = null,
    requiresCoSignerOver = null,
    currency = 'INR',
    allowedMerchants = ['Amazon India', 'Croma Retail'],
    agents = ['Claude Shopping'],
    expiry = null
  }) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new BadRequestError('Mandate name is required');
    }

    const ceilingMajor = Number(budgetCeiling);
    if (isNaN(ceilingMajor) || ceilingMajor <= 0) {
      throw new BadRequestError('Budget ceiling must be a positive number');
    }

    const budgetCeilingMinor = toMinorUnits(ceilingMajor, currency);
    const singleLimitMajor = singlePurchaseLimit ? Number(singlePurchaseLimit) : Math.round(ceilingMajor / 4);
    const singleLimitMinor = toMinorUnits(singleLimitMajor, currency);
    const cosignerMajor = requiresCoSignerOver ? Number(requiresCoSignerOver) : Math.round(ceilingMajor / 2);
    const cosignerMinor = toMinorUnits(cosignerMajor, currency);

    const newId = `M-${Math.floor(100 + Math.random() * 900)}`;
    const expiresAt = expiry ? new Date(expiry) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const mandate = await mandateRepository.create({
      id: newId,
      userId,
      name: name.trim(),
      category,
      plainTextRule: plainTextRule || `Custom mandate rule for ${name}`,
      currency,
      budgetCeiling: budgetCeilingMinor,
      utilizedAmount: 0,
      reservedAmount: 0,
      singlePurchaseLimit: singleLimitMinor,
      humanApprovalThreshold: singleLimitMinor,
      cosignerThreshold: cosignerMinor,
      status: 'ACTIVE',
      agents,
      expiresAt
    });

    // Add allowed merchants
    if (Array.isArray(allowedMerchants)) {
      for (const mName of allowedMerchants) {
        await mandateRepository.addMerchantRule(newId, mName, null, 'ALLOWED');
      }
    }

    await auditRepository.createLog({
      userId,
      actorType: 'USER',
      actorId: userId,
      eventType: 'MANDATE_CREATED',
      entityType: 'MANDATE',
      entityId: newId,
      action: 'CREATE_MANDATE',
      outcome: 'SUCCESS',
      summary: `New mandate ${name} (#${newId}) created with ceiling ₹${ceilingMajor.toLocaleString()}.`,
      amount: `Ceiling: ₹${ceilingMajor.toLocaleString()}`,
      meta: 'FIDO2 / WebAuthn cryptographically sealed'
    });

    return this.getMandateById(newId, userId);
  }

  async updateMandate(id, userId, updates) {
    const existing = await mandateRepository.findById(id, userId);
    if (!existing) {
      throw new NotFoundError(`Mandate #${id} not found`);
    }

    const repoUpdates = {};
    if (updates.name) repoUpdates.name = updates.name.trim();
    if (updates.budgetCeiling) {
      repoUpdates.budgetCeiling = toMinorUnits(Number(updates.budgetCeiling), existing.currency || 'INR');
    }
    if (updates.singlePurchaseLimit) {
      repoUpdates.singlePurchaseLimit = toMinorUnits(Number(updates.singlePurchaseLimit), existing.currency || 'INR');
    }
    if (updates.plainTextRule) repoUpdates.plainTextRule = updates.plainTextRule;
    if (updates.status) repoUpdates.status = updates.status;

    await mandateRepository.update(id, userId, repoUpdates);

    await auditRepository.createLog({
      userId,
      actorType: 'USER',
      actorId: userId,
      eventType: 'MANDATE_MODIFIED',
      entityType: 'MANDATE',
      entityId: id,
      action: 'UPDATE_MANDATE',
      outcome: 'SUCCESS',
      summary: `Mandate #${id} parameters updated.`,
      meta: 'Updated by authenticated operator'
    });

    return this.getMandateById(id, userId);
  }

  async updateStatus(id, userId, status) {
    const existing = await mandateRepository.findById(id, userId);
    if (!existing) {
      throw new NotFoundError(`Mandate #${id} not found`);
    }

    const validStatuses = ['ACTIVE', 'PAUSED', 'REVOKED', 'EXPIRED'];
    const normalized = (status || '').toUpperCase();
    if (!validStatuses.includes(normalized)) {
      throw new BadRequestError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    await mandateRepository.setStatus(id, userId, normalized);

    await auditRepository.createLog({
      userId,
      actorType: 'USER',
      actorId: userId,
      eventType: 'MANDATE_STATUS_CHANGED',
      entityType: 'MANDATE',
      entityId: id,
      action: 'UPDATE_STATUS',
      outcome: 'SUCCESS',
      summary: `Mandate #${id} status changed from ${existing.status} to ${normalized}.`,
      amount: `Status: ${normalized}`,
      meta: 'Sovereign operator state change'
    });

    return this.getMandateById(id, userId);
  }

  async toggleRevoke(id, userId) {
    const existing = await mandateRepository.findById(id, userId);
    if (!existing) {
      throw new NotFoundError(`Mandate #${id} not found`);
    }

    const newStatus = existing.status === 'REVOKED' ? 'ACTIVE' : 'REVOKED';
    await mandateRepository.setStatus(id, userId, newStatus);

    await auditRepository.createLog({
      userId,
      actorType: 'USER',
      actorId: userId,
      eventType: newStatus === 'REVOKED' ? 'MANDATE_REVOKED' : 'MANDATE_RESTORED',
      entityType: 'MANDATE',
      entityId: id,
      action: 'TOGGLE_REVOCATION',
      outcome: 'SUCCESS',
      summary: `Mandate ${existing.name} (#${id}) was ${newStatus}.`,
      amount: `Status: ${newStatus}`,
      meta: 'Instant gateway kill-switch triggered'
    });

    return this.getMandateById(id, userId);
  }
}

export const mandateService = new MandateService();

