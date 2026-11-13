# STRAW HATS — MANDATE GATEWAY TESTING & VERIFICATION GUIDE

This document describes the test architecture, automated suites, verification invariants, and execution procedures for the **Straw Hats Mandate Gateway** platform.

---

## 1. Test Architecture Overview

The Mandate Gateway employs a multi-tiered test matrix designed for zero-trust financial and policy assurance:

```
+-------------------------------------------------------------------------+
|                          END-TO-END VERIFICATION                       |
|     Dual-Process Dev & API Verification (scripts/dev_fullstack.mjs)      |
+-------------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------------+
|                       INTEGRATION TEST MATRIX                           |
|       40 Lifecycle Steps + 14 Route Checks (scripts/test_integration)   |
|   - Real Express Server (In-Memory Port 5055) + pg-mem PostgreSQL Pool  |
|   - Full Auth Session, Mandate Lifecycle, Atomic Reserves, Kill Switch  |
+-------------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------------+
|                     BACKEND UNIT & INVARIANT SUITE                      |
|            28 Deterministic Invariants (scripts/test_backend.mjs)       |
|   - 15 Policy Engine Determinism Checks (Fail-Closed, Invariance)       |
|   - 5 Integer Minor-Unit Math Invariants (Zero Floating-Point Drift)    |
|   - 4 Cryptographic Attestation Invariants (HMAC, SHA-256 Chain)        |
|   - 4 Concurrency Race Condition Invariants (Double-Spend Protection)   |
+-------------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------------+
|                     FRONTEND CONTRACT & BUILD SUITE                     |
|            85 Client & Bundle Invariants (scripts/test_frontend.mjs)    |
|   - Vite Production Build Artifact Validation                           |
|   - React Router SPA Rewrites & Deep-Linking Check                      |
|   - Mock Service Dispatcher & 6 Live E-Commerce Scenarios               |
+-------------------------------------------------------------------------+
```

---

## 2. Test Execution Commands

Run each test layer independently or execute the complete battery:

| Test Layer | Command | Duration | Coverage |
| :--- | :--- | :--- | :--- |
| **All Frontend & Build Checks** | `npm test` | ~3s | Vite bundle, client router, mock dispatcher, 6 hackathon scenarios (85 tests) |
| **Backend Unit & Invariants** | `npm run test:backend` | ~1s | Deterministic policy engine, money math, HMAC signatures, concurrent reserve races (28 tests) |
| **Full Lifecycle Integration** | `npm run test:integration` | ~2s | Live Express server, pg-mem DB, sessions, idempotency, dispute packs, cancel lifecycle (54 tests) |
| **Production Vite Build** | `npm run build` | ~2s | Production asset bundling, code splitting, chunk generation |
| **Full Dev Stack** | `npm run dev:fullstack` | Standing | Concurrent backend API (port 5000) and Vite frontend (port 5173) |

---

## 3. Detailed Test Suites

### 3.1. Backend Unit & Invariant Tests (`npm run test:backend`)

Validates core fintech business logic in total isolation from network I/O.

- **Deterministic Policy Invariants (15 Checks):**
  - Fail-closed default: empty rules or unconfigured mandates reject instantly.
  - Hard budget enforcement: requests exceeding `budgetCeiling` are blocked.
  - Single-purchase limits: requests exceeding `singlePurchaseLimit` trigger HITL review or rejection.
  - Co-signer threshold: requests exceeding `autoApproveLimit` require human sign-off (`HITL_PENDING`).
  - Strict merchant verification: unlisted or homoglyph-spoofed merchant domains (`amaz0n.in`, `chèvron.com`) are rejected.
  - Prohibited category filtering: requests matching prohibited strings are blocked.
  - Emergency Kill-Switch: when active, all purchase evaluations reject unconditionally with `503 Service Unavailable`.
- **Integer Minor-Unit Money Math (5 Checks):**
  - Zero floating-point rounding: all amounts stored as integer paise (1 INR = 100 paise).
  - Accurate fractional allocation without loss.
  - Boundary value checks for zero, maximum safe integer, and negative inputs.
- **Cryptographic Attestations (4 Checks):**
  - SHA-256 hash ledger integrity: modifying historical transactions breaks the block hash chain.
  - HMAC-SHA256 signature verification for agent passports.
  - Proof of Intent dispute pack payload sealing.
- **Concurrency & Double-Spend Defense (4 Checks):**
  - Parallel requests competing for the same mandate budget are serialized.
  - Atomic budget reservation prevents over-allocation.
  - Rollback on failed settlement restores reserved balance.

**Sample Output:**
```
Running Mandate Gateway Backend Invariant Test Battery...
[OK] Policy Invariant 1: Deny by default when mandate is missing
[OK] Policy Invariant 2: Budget ceiling enforced (single purchase > limit)
[OK] Policy Invariant 3: Co-signer requirement triggered when above auto-threshold
[OK] Policy Invariant 4: Discretionary auto-clearance when below auto-threshold
[OK] Policy Invariant 5: Homoglyph and spoofed merchant domain blocked
[OK] Policy Invariant 6: Strict merchant whitelist matching
[OK] Policy Invariant 7: Prohibited category blocked
[OK] Policy Invariant 8: Expired mandate rejected
[OK] Policy Invariant 9: Revoked mandate rejected
[OK] Policy Invariant 10: Revoked agent passport rejected
[OK] Policy Invariant 11: Emergency kill switch halts all procurement
[OK] Policy Invariant 12: Prompt injection attempt detected and neutralized
[OK] Policy Invariant 13: High-risk anomaly score forces human review
[OK] Policy Invariant 14: Sub-agent without active passport blocked
[OK] Policy Invariant 15: Currency mismatch blocked
[OK] Money Math 1: Integer minor units preserve precision across transactions
[OK] Money Math 2: Paired debit/credit sums balance to zero
[OK] Money Math 3: Fractional paise rounding prevents drift
[OK] Money Math 4: Overflow detection at max budget limit
[OK] Money Math 5: Negative amounts rejected by validation
[OK] Crypto 1: HMAC-SHA256 passport signature verification
[OK] Crypto 2: Dispute pack hash matches transaction payload
[OK] Crypto 3: Ledger hash chain verifies sequentially
[OK] Crypto 4: Tampered transaction breaks hash chain verification
[OK] Concurrency 1: Parallel requests correctly reserve budget sequentially
[OK] Concurrency 2: Double-spend race prevented by atomic reservation
[OK] Concurrency 3: Reservation rollback restores available budget
[OK] Concurrency 4: Idempotency key prevents duplicate transaction execution

Backend Invariants: 28/28 Passed (100% Deterministic)
```

---

### 3.2. Full-Lifecycle Integration Tests (`npm run test:integration`)

Spins up an ephemeral Express server with an embedded `pg-mem` PostgreSQL schema and runs 40 lifecycle steps followed by 14 route resolutions:

1. **Health & Readiness:** `GET /health` returns `200 OK`, `GET /ready` checks DB connection.
2. **Authentication Flow:** User session creation, cookie issuance, passphrase verification, and session revocation.
3. **Mandate Creation:** Synthesizing rules with budget caps, whitelisted merchants, and agent bindings.
4. **Agent Procurement:** AI shopping agent parses natural language intent, searches candidates, and requests policy evaluation.
5. **Deterministic Policy Clearance:** Real evaluation returning `AUTO_CLEARED`, `HITL_PENDING`, or `BLOCKED`.
6. **Idempotency De-duplication:** Submitting duplicate requests with identical `Idempotency-Key` headers returns cached 200 responses without double charging.
7. **Order Cancellation & Budget Release:** Over-threshold request placed in `HITL_PENDING` is cancelled; reserved budget is released back to the mandate.
8. **PayPal Sandbox Rail:** Simulated PayPal order creation and mock webhook event processing with signature verification.
9. **Emergency Kill-Switch Lifecycle:** Engaging kill switch blocks new requests; disengaging restores operational status.
10. **Immutable Audit Ledger:** Validating sequential block hashes in the activity ledger.

**Sample Output:**
```
==================================================
STRAW HATS — MANDATE GATEWAY INTEGRATION TEST SUITE
==================================================
[1/40] Health check OK
[2/40] Database readiness OK
[3/40] Authentication session created OK
[4/40] Protected route accepts active session OK
[5/40] Mandate synthesis & creation OK
[6/40] Mandate retrieval by ID OK
[7/40] Agent candidate search OK
[8/40] Deterministic policy evaluation OK
[9/40] Sub-threshold request auto-cleared OK
[10/40] Over-threshold request flagged for HITL OK
...
[39/40] Ledger hash chain verified OK
[40/40] Order cancellation releases budget OK
--------------------------------------------------
Running Route Discovery Checks (14 Endpoints)...
[OK] GET /health (200)
[OK] GET /ready (200)
[OK] GET /api/session (200)
[OK] GET /api/dashboard (200)
[OK] GET /api/mandates (200)
[OK] GET /api/requests (200)
[OK] GET /api/payment-methods (200)
[OK] GET /api/passports (200)
[OK] GET /api/activity (200)
[OK] GET /api/security/kill-switch (200)
[OK] GET /api/security/attacks (200)
[OK] GET /api/merchants (200)
[OK] GET /api/settings (200)
[OK] POST /api/security/check-message (200)
--------------------------------------------------
Integration Suite: 54/54 Passed (100% Success Rate)
```

---

### 3.3. Frontend Contract & Scenario Tests (`npm test`)

Validates the React 18 client, component bundles, SPA routing rules, and the 6 pre-configured hackathon evaluation scenarios:

1. **Scenario 1 — Discretionary Purchase:** Fast-path auto-clearance under ₹3,000 threshold.
2. **Scenario 2 — High-Value Ergonomic Desk:** Co-signer sign-off gate triggered at ₹42,000.
3. **Scenario 3 — Merchant Domain Spoofing Attack:** Typosquat vendor blocked by homoglyph defense.
4. **Scenario 4 — Cross-Category Prompt Injection:** Untrusted seller payload attempting privilege escalation neutralized.
5. **Scenario 5 — Daily Budget Exhaustion:** Cumulative purchase sequence blocked upon hitting ₹50,000 ceiling.
6. **Scenario 6 — Emergency Kill Switch:** Instant execution-time halt across all sub-agents.

---

## 4. Dual-Mode Operational Testing

The application supports seamless switching between client-side demo mode and live API mode:

### Testing in Demo Sandbox Mode
```bash
# In .env or shell:
VITE_DEMO_MODE=true

# Launch frontend:
npm run dev:frontend
```
*Behavior:* All requests are intercepted in the browser by `src/api/mockService.js`. No backend process required.

### Testing in Live Full-Stack API Mode
```bash
# In .env or shell:
VITE_DEMO_MODE=false
PORT=5000

# Launch full-stack runner:
npm run dev:fullstack
```
*Behavior:* Vite runs on `http://localhost:5173` and proxies `/api` calls to `http://localhost:5000`. If the backend becomes unreachable, `ApiStatusContext` immediately displays an alert banner rather than silently spoofing success.

---

## 5. Continuous Integration (CI) Automation

The following GitHub Actions workflow is recommended for automated PR validation:

```yaml
name: CI Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Backend Invariant Unit Tests
        run: npm run test:backend

      - name: Full-Stack Lifecycle Integration Tests
        run: npm run test:integration

      - name: Frontend Contract & Scenario Tests
        run: npm test

      - name: Production Vite Build
        run: npm run build
```

---

## 6. Verification Checklist Before Deployment

Before releasing to production or presenting to judges, verify:

- [x] All 28 backend unit tests pass (`npm run test:backend`)
- [x] All 54 integration lifecycle steps pass (`npm run test:integration`)
- [x] All 85 frontend contract tests pass (`npm test`)
- [x] Production build completes with zero errors (`npm run build`)
- [x] Kill switch disengages and engages cleanly without data corruption
- [x] Real PostgreSQL migrations match schema definitions (`server/database/migrations/`)
- [x] Database fallback to `pg-mem` functions identically in local development
- [x] No plaintext secrets or live API keys committed in source control
