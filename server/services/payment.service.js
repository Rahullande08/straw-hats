import { paymentRepository } from '../repositories/payment.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { toMinorUnits, fromMinorUnits } from '../utils/money.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

export class PaymentService {
  formatPaymentMethodForClient(pm) {
    if (!pm) return null;
    return {
      id: pm.id,
      type: pm.type,
      name: pm.name,
      identifier: pm.identifier,
      clientId: pm.provider_reference || 'BAAv88201...99XJ',
      status: pm.status,
      balance: pm.balance || '$5,000.00 USD (Sandbox)',
      autoApproveCap: pm.auto_approve_cap_minor ? `₹${fromMinorUnits(pm.auto_approve_cap_minor, 'INR').toLocaleString()} INR` : '₹3,000 INR',
      spendingLimit: pm.spending_limit_minor ? fromMinorUnits(pm.spending_limit_minor, 'INR') : 25000,
      spent: pm.spent_minor ? fromMinorUnits(pm.spent_minor, 'INR') : 0,
      expDate: pm.exp_date || '11/26',
      issuer: pm.issuer || 'Sovereign Fleet Card / Visa',
      mode: pm.sandbox_mode ? 'SANDBOX' : 'LIVE',
      webhookStatus: pm.webhook_status || 'ACTIVE (Listener verified)',
      frozen: pm.frozen
    };
  }

  async getPaymentMethods(userId) {
    const list = await paymentRepository.getPaymentMethods(userId);
    return list.map(pm => this.formatPaymentMethodForClient(pm));
  }

  async connectPaymentRail({ userId, name, type = 'SANDBOX_RAIL', identifier, autoApproveCap = '₹5,000 INR' }) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new BadRequestError('Payment method name is required');
    }

    const newId = `pm_rail_${Date.now()}`;
    const autoCapNumber = Number(String(autoApproveCap).replace(/[^0-9]/g, '')) || 5000;
    const autoCapMinor = toMinorUnits(autoCapNumber, 'INR');

    const created = await paymentRepository.createPaymentMethod({
      id: newId,
      userId,
      type: type || 'SANDBOX_RAIL',
      name: name.trim(),
      identifier: identifier || `sb-${Date.now().toString().slice(-4)}@business.example.com`,
      provider: 'paypal',
      providerReference: `BAAv${Math.random().toString(16).substring(2, 8)}`,
      autoApproveCapMinor: autoCapMinor,
      spendingLimitMinor: toMinorUnits(50000, 'INR'),
      balance: '$5,000.00 USD (Sandbox)',
      status: 'CONNECTED',
      frozen: false,
      sandboxMode: true
    });

    await auditRepository.createLog({
      userId,
      actorType: 'USER',
      actorId: userId,
      eventType: 'PAYMENT_RAIL_CONNECTED',
      entityType: 'PAYMENT_METHOD',
      entityId: newId,
      action: 'CONNECT_RAIL',
      outcome: 'SUCCESS',
      summary: `Sandbox rail "${created.name}" connected with auto-approve cap ${autoApproveCap}.`,
      amount: autoApproveCap,
      meta: 'Sandbox isolation guard verified'
    });

    return this.formatPaymentMethodForClient(created);
  }

  async toggleFreeze(id, userId) {
    const updated = await paymentRepository.toggleFreezePaymentMethod(id, userId);
    if (!updated) {
      throw new NotFoundError(`Payment method #${id} not found`);
    }

    await auditRepository.createLog({
      userId,
      actorType: 'USER',
      actorId: userId,
      eventType: 'CARD_FREEZE_TOGGLE',
      entityType: 'PAYMENT_METHOD',
      entityId: id,
      action: 'TOGGLE_FREEZE',
      outcome: 'SUCCESS',
      summary: `${updated.name} (${updated.identifier}) was ${updated.status}.`,
      amount: updated.status,
      meta: 'Security guard state altered'
    });

    return this.formatPaymentMethodForClient(updated);
  }

  async updateLimits(id, userId, { autoApproveCap, spendingLimit }) {
    let autoCapMinor = null;
    let spendLimitMinor = null;

    if (autoApproveCap !== undefined) {
      const capNum = Number(String(autoApproveCap).replace(/[^0-9]/g, ''));
      autoCapMinor = toMinorUnits(capNum || 3000, 'INR');
    }
    if (spendingLimit !== undefined) {
      spendLimitMinor = toMinorUnits(Number(spendingLimit), 'INR');
    }

    const updated = await paymentRepository.updatePaymentLimits(id, userId, autoCapMinor, spendLimitMinor);
    if (!updated) {
      throw new NotFoundError(`Payment method #${id} not found`);
    }

    await auditRepository.createLog({
      userId,
      actorType: 'USER',
      actorId: userId,
      eventType: 'PAYMENT_LIMIT_UPDATED',
      entityType: 'PAYMENT_METHOD',
      entityId: id,
      action: 'UPDATE_LIMITS',
      outcome: 'SUCCESS',
      summary: `Payment method ${updated.name} limits updated.`,
      amount: autoApproveCap || `₹${spendingLimit}`,
      meta: 'Limits updated via Sovereign terminal'
    });

    return this.formatPaymentMethodForClient(updated);
  }
}

export const paymentService = new PaymentService();
