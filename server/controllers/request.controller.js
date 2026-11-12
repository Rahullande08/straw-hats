import { requestRepository } from '../repositories/request.repository.js';
import { mandateRepository } from '../repositories/mandate.repository.js';
import { paymentRepository } from '../repositories/payment.repository.js';
import { passportRepository } from '../repositories/passport.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { policyService } from '../services/policy.service.js';
import { killSwitchService } from '../services/killSwitch.service.js';
import { approvalService } from '../services/approval.service.js';
import { payPalService } from '../services/paypal.service.js';
import { runInTransaction } from '../config/database.js';
import { toMinorUnits, fromMinorUnits, formatCurrency } from '../utils/money.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

export class RequestController {
  formatRequestForClient(r) {
    if (!r) return null;
    const currency = r.currency || 'INR';
    const amountMajor = fromMinorUnits(r.amount_minor, currency);

    return {
      id: r.id,
      itemTitle: r.product_title,
      merchant: r.merchant_name,
      agentName: r.agent_name,
      agentId: r.agent_passport_id,
      amount: amountMajor,
      amountMinor: Number(r.amount_minor),
      currency,
      mandateId: r.mandate_id,
      mandateName: r.mandate_name,
      status: r.status,
      triggerReason: r.decision_reason,
      decisionType: r.decision_type,
      createdAt: r.created_at,
      settledAt: r.settled_at,
      listingUrl: r.product_url,
      quoteEvidence: r.quote_evidence || [],
      paypalOrder: {
        orderId: r.provider_order_id || 'MOCK-PP-ORD-PENDING',
        status: r.payment_status || (r.status === 'AUTO_CLEARED' ? 'COMPLETED' : 'AWAITING_PAYER_APPROVAL'),
        captureId: r.provider_capture_id || (r.status === 'AUTO_CLEARED' ? `CAP-${Date.now().toString().slice(-8)}` : null),
        payee: `${r.merchant_name} (PayPal Sandbox)`
      }
    };
  }

  async getRequests(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const rows = await requestRepository.findAllByUserId(userId);
      const requests = rows.map(r => this.formatRequestForClient(r));
      res.json({
        success: true,
        data: requests,
        requests
      });
    } catch (err) {
      next(err);
    }
  }

  async getRequestById(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const r = await requestRepository.findById(req.params.id, userId);
      if (!r) {
        throw new NotFoundError(`Purchase request #${req.params.id} not found`);
      }
      const formatted = this.formatRequestForClient(r);
      res.json({
        success: true,
        data: formatted,
        request: formatted
      });
    } catch (err) {
      next(err);
    }
  }

  async createRequest(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const {
        itemTitle,
        amount,
        currency = 'INR',
        merchant,
        mandateId = 'M-902',
        agentName = 'Claude Shopping',
        agentId = 'pass_claude_shop',
        listingUrl = '',
        specs = [],
        quoteEvidence = []
      } = req.body;

      if (!itemTitle || amount === undefined || !merchant) {
        throw new BadRequestError('itemTitle, amount, and merchant are required');
      }

      const amountMinor = toMinorUnits(Number(amount), currency);

      // Fetch target mandate
      const mandate = await mandateRepository.findById(mandateId);
      if (!mandate) {
        throw new NotFoundError(`Mandate #${mandateId} not found`);
      }

      // Fetch system state (kill-switch, passports)
      const [killSwitch, passports] = await Promise.all([
        killSwitchService.getStatus(),
        passportRepository.findAllByUserId(userId)
      ]);

      // 1. Evaluate purchase request against Deterministic Policy Engine
      const evalResult = policyService.evaluate({
        request: {
          itemTitle,
          amountMinor,
          currency,
          merchant,
          agentId,
          agentName,
          listingUrl,
          specs,
          quoteEvidence
        },
        mandate,
        systemState: {
          emergencyKillSwitchActive: killSwitch.active,
          agentPassports: passports
        }
      });

      const newId = `PR-${Math.floor(1000 + Math.random() * 9000)}`;
      let status = 'PENDING_HITL';
      let triggerReason = evalResult.reasons.join(' • ');

      if (evalResult.verdict === 'ALLOW') {
        status = 'AUTO_CLEARED';
      } else if (evalResult.verdict === 'BLOCK' || evalResult.verdict === 'ERROR') {
        status = 'BLOCKED';
      } else if (evalResult.decisionType === 'CO_SIGNER_ESCALATION') {
        status = 'PENDING_COSIGNER';
      } else {
        status = 'PENDING_HITL';
      }

      // 2. Prepare PayPal Order
      const paypalOrder = await payPalService.createOrder({
        purchaseRequestId: newId,
        amountMinor,
        currency,
        merchant,
        itemTitle
      });

      // 3. Persist in database with atomic transaction
      await runInTransaction(async (client) => {
        if (status === 'AUTO_CLEARED') {
          await mandateRepository.directAddUtilized(mandateId, amountMinor, client);
        } else if (status === 'PENDING_HITL' || status === 'PENDING_COSIGNER') {
          // Reserve budget
          await mandateRepository.reserveBudget(mandateId, amountMinor, client);
        }

        // Insert purchase request
        await requestRepository.create(
          {
            id: newId,
            userId,
            mandateId,
            agentPassportId: agentId,
            agentName,
            productTitle: itemTitle.trim(),
            merchantName: merchant.trim(),
            productUrl: listingUrl || `https://${merchant.toLowerCase().replace(/\s+/g, '')}.com/items/${newId}`,
            amountMinor,
            currency,
            category: mandate.category,
            policyVerdict: evalResult.verdict,
            status,
            decisionType: evalResult.decisionType,
            decisionReason: triggerReason
          },
          client
        );

        // Insert evidence
        const evidenceToSave = quoteEvidence.length > 0 ? quoteEvidence : (
          specs.length > 0 ? specs : [
            { field: 'Product Name', value: itemTitle, exactQuote: `"${itemTitle}"`, match: true },
            { field: 'Price', value: formatCurrency(amountMinor, currency), exactQuote: `"Listed price ${amount}"`, match: true }
          ]
        );
        await requestRepository.addEvidence(newId, evidenceToSave, client);

        // Insert payment record
        await paymentRepository.createPayment(
          {
            id: `pay_${newId.toLowerCase()}`,
            purchaseRequestId: newId,
            provider: 'paypal',
            providerOrderId: paypalOrder.orderId,
            providerCaptureId: status === 'AUTO_CLEARED' ? `CAP-${Date.now().toString().slice(-8)}` : null,
            amountMinor,
            currency,
            status: status === 'AUTO_CLEARED' ? 'COMPLETED' : 'AWAITING_APPROVAL'
          },
          client
        );
      });

      // 4. Audit Log
      await auditRepository.createLog({
        userId,
        actorType: 'AGENT',
        actorId: agentName,
        eventType: status === 'AUTO_CLEARED' ? 'AUTO_CLEARED' : (status === 'BLOCKED' ? 'MERCHANT_BLOCKED' : 'HITL_ESCALATION'),
        entityType: 'PURCHASE_REQUEST',
        entityId: newId,
        action: 'SUBMIT_REQUEST',
        outcome: status === 'BLOCKED' ? 'BLOCKED' : 'SUCCESS',
        summary: `${itemTitle} (${merchant}) evaluated: ${status} (${evalResult.decisionType}).`,
        amount: formatCurrency(amountMinor, currency),
        meta: `Policy check: ${evalResult.reasons[0] || 'Processed'}`,
        metadataJson: {
          requestId: newId,
          verdict: evalResult.verdict,
          mandateName: mandate.name
        }
      });

      const freshRequest = await requestRepository.findById(newId);
      const formatted = this.formatRequestForClient(freshRequest);

      res.status(201).json({
        success: true,
        data: formatted,
        request: formatted,
        evaluation: evalResult
      });
    } catch (err) {
      next(err);
    }
  }

  async approveRequest(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const userName = req.user?.name || 'Elena Vance';
      const updated = await approvalService.approveRequest(req.params.id, userId, userName);
      const formatted = this.formatRequestForClient(updated);

      res.json({
        success: true,
        data: formatted,
        request: formatted,
        message: 'Purchase request approved and payment settled.'
      });
    } catch (err) {
      next(err);
    }
  }

  async rejectRequest(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_elena_vance';
      const userName = req.user?.name || 'Elena Vance';
      const { reason } = req.body || {};
      const updated = await approvalService.rejectRequest(req.params.id, userId, userName, reason);
      const formatted = this.formatRequestForClient(updated);

      res.json({
        success: true,
        data: formatted,
        request: formatted,
        message: 'Purchase request rejected.'
      });
    } catch (err) {
      next(err);
    }
  }

  async getDisputePack(req, res, next) {
    try {
      const pack = await approvalService.generateDisputePack(req.params.id);
      res.json({
        success: true,
        data: pack,
        disputePack: pack
      });
    } catch (err) {
      next(err);
    }
  }
}

export const requestController = new RequestController();
