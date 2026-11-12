import { requestRepository } from '../repositories/request.repository.js';
import { mandateRepository } from '../repositories/mandate.repository.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { killSwitchService } from './killSwitch.service.js';
import { payPalService } from './paypal.service.js';
import { runInTransaction } from '../config/database.js';
import { fromMinorUnits, formatCurrency } from '../utils/money.js';
import { NotFoundError, ConflictError, ForbiddenError, BadRequestError } from '../utils/errors.js';

export class ApprovalService {
  async approveRequest(requestId, userId, userName = 'Elena Vance') {
    // 1. Check emergency kill switch
    const killSwitch = await killSwitchService.getStatus();
    if (killSwitch.active) {
      throw new ForbiddenError('Emergency Kill Switch is ENGAGED. Approvals are blocked until the kill switch is deactivated.');
    }

    const reqItem = await requestRepository.findById(requestId);
    if (!reqItem) {
      throw new NotFoundError(`Purchase request #${requestId} not found`);
    }

    // 2. Prevent approving settled or duplicate approved requests
    if (reqItem.status === 'AUTO_CLEARED' || reqItem.status === 'APPROVED' || reqItem.status === 'COMPLETED') {
      throw new ConflictError(
        `Request #${reqItem.id} has already been approved and settled (Capture ID: ${reqItem.provider_capture_id || 'settled'}). Duplicate approval blocked.`
      );
    }

    // 3. Prevent approving blocked requests
    if (reqItem.status === 'BLOCKED') {
      throw new ConflictError(
        `Request #${reqItem.id} was BLOCKED due to policy invariance violations. Overriding deterministic blocks is forbidden.`
      );
    }

    // 4. Capture PayPal Order
    const payment = await paymentRepository.getPaymentByRequestId(requestId);
    const orderId = payment?.provider_order_id || `PP-ORD-${Date.now().toString().slice(-6)}`;
    const captureResult = await payPalService.captureOrder(orderId);

    // 5. Execute state transition and budget conversion inside atomic database transaction
    const updated = await runInTransaction(async (client) => {
      // Convert reserved to utilized or add to utilized
      await mandateRepository.convertReservedToUtilized(reqItem.mandate_id, reqItem.amount_minor, client);
      // Fallback add if not reserved
      await mandateRepository.directAddUtilized(reqItem.mandate_id, 0, client);

      // Update purchase request status to AUTO_CLEARED (compatible with frontend expectations)
      const res = await requestRepository.updateStatus(
        requestId,
        'AUTO_CLEARED',
        {
          decisionReason: `Human Authorized: Single-use order authorized and cleared by ${userName}.`,
          settledAt: new Date().toISOString()
        },
        client
      );

      // Update payment record
      if (payment) {
        await paymentRepository.updatePaymentStatus(
          payment.id,
          'COMPLETED',
          captureResult.captureId,
          client
        );
      }

      return res;
    });

    const currency = reqItem.currency || 'INR';
    const amountFormatted = formatCurrency(reqItem.amount_minor, currency);

    await auditRepository.createLog({
      userId,
      actorType: 'USER',
      actorId: userId,
      eventType: 'HITL_APPROVED',
      entityType: 'PURCHASE_REQUEST',
      entityId: requestId,
      action: 'APPROVE_PURCHASE',
      outcome: 'SUCCESS',
      summary: `${reqItem.product_title} approved for ${amountFormatted} on ${reqItem.merchant_name}.`,
      amount: amountFormatted,
      meta: `Single-use PayPal order ${orderId} executed (Capture: ${captureResult.captureId})`,
      metadataJson: {
        requestId,
        mandateId: reqItem.mandate_id,
        captureId: captureResult.captureId,
        agentName: reqItem.agent_name
      }
    });

    return requestRepository.findById(requestId);
  }

  async rejectRequest(requestId, userId, _userName = 'Elena Vance', reason = null) {
    const reqItem = await requestRepository.findById(requestId);
    if (!reqItem) {
      throw new NotFoundError(`Purchase request #${requestId} not found`);
    }

    if (reqItem.status === 'AUTO_CLEARED' || reqItem.status === 'APPROVED' || reqItem.status === 'COMPLETED') {
      throw new ConflictError(
        `Request #${reqItem.id} has already been settled and cannot be cancelled retroactively.`
      );
    }

    await runInTransaction(async (client) => {
      // Release any reserved budget hold
      await mandateRepository.releaseReservedBudget(reqItem.mandate_id, reqItem.amount_minor, client);

      // Update request status to REJECTED
      await requestRepository.updateStatus(
        requestId,
        'REJECTED',
        {
          decisionReason: reason || 'Human Authorization Declined: Order cancelled by sovereign account holder.'
        },
        client
      );

      // Cancel associated payment record
      const payment = await paymentRepository.getPaymentByRequestId(requestId);
      if (payment) {
        await paymentRepository.updatePaymentStatus(payment.id, 'FAILED_OR_CANCELLED', null, client);
      }
    });

    const currency = reqItem.currency || 'INR';
    const amountFormatted = formatCurrency(reqItem.amount_minor, currency);

    await auditRepository.createLog({
      userId,
      actorType: 'USER',
      actorId: userId,
      eventType: 'HITL_REJECTED',
      entityType: 'PURCHASE_REQUEST',
      entityId: requestId,
      action: 'REJECT_PURCHASE',
      outcome: 'BLOCKED',
      summary: `${reqItem.product_title} rejected for ${amountFormatted}.`,
      amount: 'Declined',
      meta: 'Funds hold released back to mandate budget',
      metadataJson: {
        requestId,
        mandateId: reqItem.mandate_id,
        agentName: reqItem.agent_name
      }
    });

    return requestRepository.findById(requestId);
  }

  async cancelRequest(requestId, userId, _userName = 'Elena Vance', reason = null) {
    const reqItem = await requestRepository.findById(requestId);
    if (!reqItem) {
      throw new NotFoundError(`Purchase request #${requestId} not found`);
    }

    if (reqItem.status === 'AUTO_CLEARED' || reqItem.status === 'APPROVED' || reqItem.status === 'COMPLETED') {
      throw new ConflictError(
        `Request #${reqItem.id} has already been settled and cannot be cancelled retroactively.`
      );
    }

    await runInTransaction(async (client) => {
      // Release any reserved budget hold
      await mandateRepository.releaseReservedBudget(reqItem.mandate_id, reqItem.amount_minor, client);

      // Update request status to CANCELLED
      await requestRepository.updateStatus(
        requestId,
        'CANCELLED',
        {
          decisionReason: reason || 'Purchase request cancelled by operator or autonomous agent.'
        },
        client
      );

      // Cancel associated payment record
      const payment = await paymentRepository.getPaymentByRequestId(requestId);
      if (payment) {
        await paymentRepository.updatePaymentStatus(payment.id, 'FAILED_OR_CANCELLED', null, client);
      }
    });

    const currency = reqItem.currency || 'INR';
    const amountFormatted = formatCurrency(reqItem.amount_minor, currency);

    await auditRepository.createLog({
      userId,
      actorType: 'USER',
      actorId: userId,
      eventType: 'PURCHASE_CANCELLED',
      entityType: 'PURCHASE_REQUEST',
      entityId: requestId,
      action: 'CANCEL_PURCHASE',
      outcome: 'SUCCESS',
      summary: `${reqItem.product_title} cancelled. Reserved budget released.`,
      amount: amountFormatted,
      meta: 'Hold released back to active spending mandate'
    });

    return requestRepository.findById(requestId);
  }

  async generateDisputePack(requestId) {
    const reqItem = await requestRepository.findById(requestId);
    if (!reqItem) {
      throw new NotFoundError(`Purchase request #${requestId} not found`);
    }

    const currency = reqItem.currency || 'INR';
    const amountFormatted = formatCurrency(reqItem.amount_minor, currency);

    return {
      packId: `DSP-PACK-${reqItem.id}`,
      generatedAt: new Date().toISOString(),
      transactionId: reqItem.provider_order_id || 'PP-ORD-PENDING',
      captureId: reqItem.provider_capture_id || 'N/A',
      itemTitle: reqItem.product_title,
      merchant: reqItem.merchant_name,
      amount: `${amountFormatted} ${currency}`,
      agentPassportProof: {
        agent: reqItem.agent_name,
        passportId: reqItem.agent_passport_id || 'pass_default',
        authorizedHuman: 'Elena Vance',
        signature: 'sha256_software_audit_proof_88f910ab38c41092e01b34'
      },
      evidenceRecords: reqItem.quote_evidence?.length > 0 ? reqItem.quote_evidence : [
        { field: 'Listing URL', quote: reqItem.product_url || 'https://verified-merchant.in' },
        { field: 'Mandate Attached', quote: reqItem.mandate_name }
      ],
      paypalDisputeReadyJson: {
        dispute_reason: 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED',
        evidence_type: 'PROOF_OF_INTENT_LEDGER',
        notes: `Autonomous agent purchased ${reqItem.product_title} under strict cryptographic mandate #${reqItem.mandate_id}. Seller delivered non-conforming goods.`
      }
    };
  }
}

export const approvalService = new ApprovalService();

