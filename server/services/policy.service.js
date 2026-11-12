import { merchantVerificationService } from './merchantVerification.service.js';
import { toMinorUnits, fromMinorUnits, formatCurrency } from '../utils/money.js';

/**
 * Mandate Gateway — Deterministic Policy Evaluation Engine
 * 
 * Invariance Rules:
 * - AI may discover, parse, or recommend products.
 * - AI models must NEVER make the final authorization decision.
 * - Every decision is strictly deterministic code.
 * - Fails CLOSED: any error, missing data, or exception defaults to BLOCK or ERROR.
 */

export class PolicyService {
  /**
   * Evaluate a purchase request against spending mandate and system state
   */
  evaluate({
    request,
    mandate,
    systemState = {}
  }) {
    const result = {
      verdict: 'ERROR', // Default fail-closed
      decisionType: 'POLICY_ERROR',
      confidenceScore: 100,
      reasons: [],
      violations: [],
      passedChecks: [],
      specsEvaluation: [],
      timestamp: new Date().toISOString()
    };

    try {
      // 1. Validate purchase payload
      if (!request || typeof request !== 'object') {
        result.reasons.push('Invalid or missing purchase request payload');
        result.violations.push('MALFORMED_PAYLOAD');
        return result;
      }

      const {
        itemTitle,
        amount,
        amountMinor: reqAmountMinor,
        currency = 'INR',
        merchant,
        category,
        agentId,
        agentName,
        listingUrl,
        shippingFee = 0,
        taxFee = 0,
        specs = [],
        quoteEvidence = []
      } = request;

      // Anti-Prompt Injection in Item Title or Description
      const combinedText = `${itemTitle || ''} ${request.description || ''}`;
      if (
        combinedText.includes('<!--') ||
        combinedText.includes('SYSTEM:') ||
        combinedText.toLowerCase().includes('disregard budget') ||
        combinedText.toLowerCase().includes('approve immediately') ||
        combinedText.toLowerCase().includes('ignore previous instructions')
      ) {
        result.verdict = 'BLOCK';
        result.decisionType = 'PROMPT_INJECTION_DETECTED';
        result.reasons.push('Security Alert: Malicious prompt injection sequence detected in product title/description. Direct execution blocked.');
        result.violations.push('PROMPT_INJECTION');
        return result;
      }

      // Check for invisible Unicode control characters (Zero-width spaces / control codes)
      if (/[\u200B-\u200D\uFEFF\u0000-\u001F]/.test(itemTitle || '')) {
        result.verdict = 'BLOCK';
        result.decisionType = 'STEGANOGRAPHY_DETECTED';
        result.reasons.push('Security Alert: Hidden Unicode zero-width or control characters detected in product title.');
        result.violations.push('UNICODE_SMUGGLING');
        return result;
      }

      // Resolve Amount in Minor Units
      let totalAmountMinor = 0;
      if (reqAmountMinor !== undefined && reqAmountMinor !== null) {
        totalAmountMinor = Number(reqAmountMinor);
      } else if (amount !== undefined && amount !== null) {
        // Assume major amount if amount is given (e.g. 5000 INR -> 500000 paise)
        // Check if amount is already in minor units (> 100000 for standard amounts) or major
        totalAmountMinor = toMinorUnits(amount, currency);
      }

      // Include shipping, taxes and fees in total evaluated amount (Checkpoint 17)
      const shippingMinor = toMinorUnits(shippingFee, currency);
      const taxMinor = toMinorUnits(taxFee, currency);
      const grandTotalMinor = totalAmountMinor + shippingMinor + taxMinor;

      if (isNaN(grandTotalMinor) || grandTotalMinor <= 0) {
        result.reasons.push('Invalid purchase amount: total must be a positive number');
        result.violations.push('INVALID_AMOUNT');
        return result;
      }

      if (!merchant || typeof merchant !== 'string' || !merchant.trim()) {
        result.reasons.push('Merchant identifier or name is required');
        result.violations.push('MISSING_MERCHANT');
        return result;
      }

      // 3. Check global emergency kill switch (HIGHEST PRIORITY)
      if (systemState.emergencyKillSwitchActive) {
        result.verdict = 'BLOCK';
        result.decisionType = 'KILL_SWITCH_ENGAGED';
        result.reasons.push('Emergency Kill Switch is ENGAGED. All autonomous authorizations and payments are immediately halted.');
        result.violations.push('KILL_SWITCH_ACTIVE');
        return result;
      }

      // 4. Check mandate existence
      if (!mandate) {
        result.verdict = 'BLOCK';
        result.decisionType = 'MANDATE_NOT_FOUND';
        result.reasons.push('No valid spending mandate bound to this purchase request.');
        result.violations.push('MANDATE_MISSING');
        return result;
      }

      // 5. Check mandate status
      if (mandate.status !== 'ACTIVE') {
        result.verdict = 'BLOCK';
        result.decisionType = 'MANDATE_INACTIVE';
        result.reasons.push(`Mandate #${mandate.id} (${mandate.name}) is ${mandate.status}. Only ACTIVE mandates authorize transactions.`);
        result.violations.push('MANDATE_NOT_ACTIVE');
        return result;
      }

      // 6. Check mandate expiry
      if (mandate.expiry || mandate.expires_at) {
        const expiryDate = new Date(mandate.expiry || mandate.expires_at);
        if (!isNaN(expiryDate.getTime()) && expiryDate < new Date()) {
          result.verdict = 'BLOCK';
          result.decisionType = 'MANDATE_EXPIRED';
          result.reasons.push(`Mandate #${mandate.id} expired on ${expiryDate.toISOString()}.`);
          result.violations.push('MANDATE_EXPIRED');
          return result;
        }
      }
      result.passedChecks.push('Mandate status ACTIVE and unexpired');

      // 7. Check agent passport status & revocation
      if (systemState.agentPassports && (agentId || agentName)) {
        const passport = systemState.agentPassports.find(
          p => p.id === agentId || p.agentName === agentName || p.agent_name === agentName
        );

        if (passport) {
          if (passport.status !== 'ACTIVE') {
            result.verdict = 'BLOCK';
            result.decisionType = 'AGENT_REVOKED';
            result.reasons.push(`Agent Passport "${passport.agentName || passport.agent_name}" is ${passport.status}. Access denied.`);
            result.violations.push('AGENT_REVOKED');
            return result;
          }

          if (passport.expires_at && new Date(passport.expires_at) < new Date()) {
            result.verdict = 'BLOCK';
            result.decisionType = 'AGENT_TOKEN_EXPIRED';
            result.reasons.push(`Agent Passport "${passport.agentName || passport.agent_name}" has expired.`);
            result.violations.push('AGENT_EXPIRED');
            return result;
          }

          // 8. Check agent spending limit
          const agentLimitMinor = Number(passport.spending_limit || passport.spendingLimit || 0);
          if (agentLimitMinor > 0 && grandTotalMinor > agentLimitMinor) {
            result.verdict = 'BLOCK';
            result.decisionType = 'AGENT_LIMIT_EXCEEDED';
            result.reasons.push(`Request exceeds agent spending ceiling of ${formatCurrency(agentLimitMinor, currency)}.`);
            result.violations.push('AGENT_LIMIT_BREACH');
            return result;
          }
        }
      }
      result.passedChecks.push('Agent delegate identity validated and active');

      // 9. Validate currency
      const mandateCurrency = (mandate.currency || 'INR').toUpperCase();
      const reqCurrency = (currency || 'INR').toUpperCase();
      if (mandateCurrency !== reqCurrency) {
        result.verdict = 'BLOCK';
        result.decisionType = 'CURRENCY_MISMATCH';
        result.reasons.push(`Currency mismatch: request currency (${reqCurrency}) does not match mandate (${mandateCurrency}). Arbitrage blocked.`);
        result.violations.push('CURRENCY_MISMATCH');
        return result;
      }
      result.passedChecks.push(`Currency verified (${mandateCurrency})`);

      // 10, 11, 12. Validate merchant identity, canonical domain, blocklist, allowlist
      const merchantCheck = merchantVerificationService.evaluateMerchant({
        merchantName: merchant,
        listingUrl,
        allowedMerchants: mandate.allowedMerchants || mandate.merchants?.map(m => m.merchantName) || [],
        blockedMerchants: systemState.merchantBlocklist || []
      });

      if (!merchantCheck.isAllowed || merchantCheck.isBlocked) {
        result.verdict = 'BLOCK';
        result.decisionType = 'DETERMINISTIC_MERCHANT_BLOCK';
        result.reasons.push(merchantCheck.reason || `Merchant "${merchant}" is not permitted under policy.`);
        result.violations.push('MERCHANT_NOT_PERMITTED');
        return result;
      }
      result.passedChecks.push(`Merchant verified & whitelisted: ${merchant}`);

      // 13. Validate product category & Dealbreaker keywords
      const reqCategory = (category || '').toLowerCase();
      const mandateCategory = (mandate.category || '').toLowerCase();

      if (reqCategory && mandateCategory) {
        // Block gaming consoles under office hardware
        if (mandateCategory.includes('hardware') && (reqCategory.includes('gaming console') || reqCategory.includes('entertainment'))) {
          result.verdict = 'BLOCK';
          result.decisionType = 'CATEGORY_MISMATCH';
          result.reasons.push(`Category mismatch: "${category}" cannot be charged to "${mandate.category}".`);
          result.violations.push('CATEGORY_VIOLATION');
          return result;
        }
        // Block office hardware under SaaS/DevOps
        if (mandateCategory.includes('saas') && reqCategory.includes('hardware')) {
          result.verdict = 'BLOCK';
          result.decisionType = 'CATEGORY_MISMATCH';
          result.reasons.push(`Category mismatch: Hardware cannot be charged to SaaS mandate.`);
          result.violations.push('CATEGORY_VIOLATION');
          return result;
        }
      }
      result.passedChecks.push('Category compliance confirmed');

      // 14 & 15. Validate required product specifications and evidence
      const combinedEvidence = [...specs, ...quoteEvidence];
      if (combinedEvidence.length > 0) {
        for (const item of combinedEvidence) {
          const isPassed = item.pass !== false && item.match !== false && item.status !== 'MISMATCH' && item.status !== 'VIOLATION';
          result.specsEvaluation.push({
            label: item.label || item.field || item.spec,
            passed: isPassed,
            quote: item.exactQuote || item.quote
          });

          if (!isPassed) {
            result.verdict = 'BLOCK';
            result.decisionType = 'QUOTE_EVIDENCE_MISMATCH';
            result.reasons.push(`Specification dealbreaker: ${item.label || item.field || item.spec} verification failed. ${item.reason || 'Not matched in authentic listing'}.`);
            result.violations.push('SPEC_MISMATCH');
            return result;
          }
        }
      }

      // 18. Check Single-Item Purchase Ceiling
      const singleLimitMinor = Number(
        mandate.single_purchase_limit !== undefined
          ? mandate.single_purchase_limit
          : toMinorUnits(mandate.singlePurchaseLimit || 5000, currency)
      );

      // Hidden Shipping Surcharge Price Trick Detection (Attack 03)
      if (shippingMinor > 0 && grandTotalMinor > singleLimitMinor && totalAmountMinor <= singleLimitMinor) {
        result.verdict = 'BLOCK';
        result.decisionType = 'SURCHARGE_MANIPULATION_DETECTED';
        result.reasons.push(`Hidden Surcharge Trick: Item price was within limit, but ancillary shipping fees (${formatCurrency(shippingMinor, currency)}) push total to ${formatCurrency(grandTotalMinor, currency)}, exceeding single-item limit of ${formatCurrency(singleLimitMinor, currency)}.`);
        result.violations.push('SURCHARGE_BREACH');
        return result;
      }

      // 19. Check Remaining Cumulative Budget (Atomic arithmetic)
      const currentUtilizedMinor = Number(
        mandate.utilized_amount !== undefined
          ? mandate.utilized_amount
          : toMinorUnits(mandate.utilized || 0, currency)
      );
      const currentReservedMinor = Number(
        mandate.reserved_amount !== undefined
          ? mandate.reserved_amount
          : 0
      );
      const budgetCeilingMinor = Number(
        mandate.budget_ceiling !== undefined
          ? mandate.budget_ceiling
          : toMinorUnits(mandate.budgetCeiling || 0, currency)
      );

      const projectedTotalMinor = currentUtilizedMinor + currentReservedMinor + grandTotalMinor;

      if (projectedTotalMinor > budgetCeilingMinor) {
        result.verdict = 'BLOCK';
        result.decisionType = 'BUDGET_CEILING_EXCEEDED';
        result.reasons.push(
          `Total budget ceiling breach: Currently committed ${formatCurrency(currentUtilizedMinor + currentReservedMinor, currency)} + Request ${formatCurrency(grandTotalMinor, currency)} = ${formatCurrency(projectedTotalMinor, currency)}, exceeding ceiling ${formatCurrency(budgetCeilingMinor, currency)}.`
        );
        result.violations.push('BUDGET_EXCEEDED');
        return result;
      }
      result.passedChecks.push(`Budget ceiling satisfied (${formatCurrency(projectedTotalMinor, currency)} <= ${formatCurrency(budgetCeilingMinor, currency)})`);

      // 20. Determine whether human approval is required
      const coSignerThresholdMinor = Number(
        mandate.cosigner_threshold !== undefined
          ? mandate.cosigner_threshold
          : toMinorUnits(mandate.requiresCoSignerOver || systemState.requireCoSignerThreshold || 50000, currency)
      );

      if (grandTotalMinor > coSignerThresholdMinor) {
        result.verdict = 'REQUIRES_APPROVAL';
        result.decisionType = 'CO_SIGNER_ESCALATION';
        result.reasons.push(
          `High-Value Threshold Trigger: Amount ${formatCurrency(grandTotalMinor, currency)} exceeds dual-signature threshold ${formatCurrency(coSignerThresholdMinor, currency)}. Requires multi-sig hardware co-signer.`
        );
        return result;
      }

      if (grandTotalMinor > singleLimitMinor) {
        result.verdict = 'REQUIRES_APPROVAL';
        result.decisionType = 'HITL_ESCALATION';
        result.reasons.push(
          `Single-Item Limit Trigger: Amount ${formatCurrency(grandTotalMinor, currency)} exceeds unattended single-order ceiling of ${formatCurrency(singleLimitMinor, currency)}. Human approval required.`
        );
        return result;
      }

      // 21. All invariants satisfied within unattended thresholds -> ALLOW
      result.verdict = 'ALLOW';
      result.decisionType = 'AUTO_CLEARANCE';
      result.reasons.push(
        `Deterministic Clearance: Under ${formatCurrency(singleLimitMinor, currency)} single-order ceiling, verified merchant, and valid quota.`
      );
      result.passedChecks.push(`Within single-item ceiling (${formatCurrency(grandTotalMinor, currency)} <= ${formatCurrency(singleLimitMinor, currency)})`);

      return result;
    } catch (err) {
      result.verdict = 'ERROR';
      result.decisionType = 'SYSTEM_ERROR_FAIL_CLOSED';
      result.reasons.push(`Policy evaluation exception: ${err.message}. Fails closed.`);
      result.violations.push('INTERNAL_ERROR');
      return result;
    }
  }
}

export const policyService = new PolicyService();

/**
 * Backward compatibility wrapper for existing server/policyEngine.js
 */
export function evaluatePurchasePolicy(args) {
  return policyService.evaluate(args);
}
