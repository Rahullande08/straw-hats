/**
 * Mandate Gateway — Deterministic Policy Evaluation Engine
 * Core Security Principle: AI may recommend a purchase, but AI must NEVER override user authorization rules.
 * 
 * Verdicts:
 * - ALLOW: all applicable rules pass without exception; within auto-approve threshold.
 * - REQUIRES_APPROVAL: transaction is permissible under general mandate, but requires human sign-off (e.g. exceeds single-item auto cap or co-signer threshold).
 * - BLOCK: violation of mandatory rule (unapproved merchant, category breach, over budget ceiling, expired/revoked mandate, kill switch active).
 * - ERROR: missing required input, unresolvable mandate, or safe policy evaluation impossible (FAILS CLOSED).
 */

import { policyService } from './services/policy.service.js';

export function evaluatePurchasePolicy(args) {
  return policyService.evaluate(args);
}

export { policyService };
