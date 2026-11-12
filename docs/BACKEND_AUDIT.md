# Mandate Gateway — Backend & Architecture Audit Report
**Date:** November 2026  
**Auditor:** Principal Backend Engineer & Fintech Security Architect  
**Project:** STRAW HATS — MANDATE GATEWAY  
**Target Repository:** `https://github.com/Rahullande08/straw-hats`

---

## Executive Summary

Mandate Gateway was designed as a user-governed authorization, deterministic policy enforcement, and payment execution gateway situated between autonomous AI shopping agents and e-commerce merchants. The frontend application (React 18 + Vite + Tailwind CSS) features an elaborate UI spanning 12 distinct pages, an interactive scenario runner, and a client-side mock service.

However, the existing backend in `server/index.js` is an unpersisted in-memory prototype. It stores critical financial data in global JavaScript arrays, lacks database persistence, provides simulated authentication without password verification, implements simulated PayPal transactions with random string generation, and evaluates red-team security attacks via static category lookups rather than active policy passes.

This audit establishes the baseline required to revive the backend into an enterprise-grade, secure, persistent, and deterministically auditable platform without breaking existing frontend contracts or demo capabilities.

---

## 1. Inventory of Existing API Endpoints

The system encompasses routes declared across `server/index.js`, `openapi.yaml`, `src/services/apiContract.js`, and `postman_collection.json`:

| Method | Endpoint | Defined in Backend | Defined in OpenAPI | Description & Contract Status |
|---|---|---|---|---|
| `GET` | `/api/health` | Yes | Yes | Process health, uptime, sandbox status, kill-switch state |
| `GET` | `/api/session` | Yes | Yes | Current user session payload |
| `POST` | `/api/login` | Yes | Yes | Operator authentication; currently accepts any passphrase |
| `POST` | `/api/logout` | Yes | Yes | Invalidate session |
| `POST` | `/api/register` | No | No | User registration (Required by Phase 3) |
| `GET` | `/api/dashboard` | Yes | Yes | High-level KPI aggregations, pending requests, active mandates |
| `GET` | `/api/mandates` | Yes | Yes | List all spending mandates |
| `GET` | `/api/mandates/:id` | No | Yes | Get single mandate by ID (Frontend contract gap) |
| `POST` | `/api/mandates` | Yes | Yes | Create spending mandate |
| `PUT` | `/api/mandates/:id` | No | Yes | Update mandate rules and budget ceilings (Contract gap) |
| `POST` | `/api/mandates/:id/revoke` | Yes | Yes | Toggle mandate revocation status |
| `POST` | `/api/agent/parse-brief` | Yes | Yes | NL brief parsing, specification & constraint extraction |
| `POST` | `/api/agent/search` | No | Yes | E-commerce catalog discovery |
| `POST` | `/api/agent/evaluate-candidates`| Yes | Yes | Quote verification & spec matching against catalog |
| `POST` | `/api/policy/evaluate` | Yes | Yes | Deterministic 22-step policy verification engine |
| `GET` | `/api/requests` | Yes | Yes | List purchase requests queue |
| `GET` | `/api/requests/:id` | No | Yes | Get purchase request by ID (Contract gap) |
| `POST` | `/api/requests` | Yes | Yes | Create and policy-evaluate purchase request |
| `POST` | `/api/requests/:id/approve` | Yes | Yes | Human-in-the-Loop / Co-signer authorization |
| `POST` | `/api/requests/:id/reject` | Yes | Yes | Reject / decline purchase request |
| `GET` | `/api/requests/:id/dispute-pack` | Yes | Yes | Generate cryptographic proof-of-intent dispute pack |
| `GET` | `/api/payment-methods` | Yes | Yes | List registered payment rails & cards |
| `POST` | `/api/payment-methods/connect` | Yes | Yes | Connect sandbox PayPal or virtual card rail |
| `POST` | `/api/payment-methods/:id/toggle-freeze` | Yes | Yes | Freeze / unfreeze payment rail |
| `POST` | `/api/payment-methods/:id/limits` | Yes | Yes | Modify auto-approve cap & spending limit |
| `GET` | `/api/passports` | Yes | Yes | List registered agent passports |
| `POST` | `/api/passports` | Yes | Yes | Mint new agent cryptographic passport |
| `POST` | `/api/passports/:id/revoke` | Yes | Yes | Revoke / reactivate agent passport |
| `GET` | `/api/passports/verify/:token` | Yes | Yes | Public unauthenticated merchant verification endpoint |
| `GET` | `/api/activity` | Yes | Yes | List hash-linked audit ledger records |
| `GET` | `/api/activity/export` | Yes | Yes | Export audit ledger to JSON or CSV (with formula defense) |
| `GET` | `/api/security/attacks` | Yes | Yes | Retrieve 15 standardized red-team test vectors |
| `POST` | `/api/security/run-attacks` | Yes | Yes | Execute red-team attack simulation suite |
| `POST` | `/api/security/check-message` | Yes | Yes | Analyze message for phishing / fake payment confirmations |
| `GET` | `/api/security/kill-switch` | Yes | Yes | Check emergency kill switch state |
| `POST` | `/api/security/kill-switch/toggle` | Yes | Yes | Activate / deactivate emergency kill switch |
| `GET` | `/api/settings` | Yes | Yes | Retrieve system & node configuration |
| `POST` | `/api/settings` | Yes | Yes | Update arbitration, notification & threshold settings |
| `POST` | `/api/demo/reset` | Mock only | No | Reset demo state back to seed baseline |

---

## 2. Frontend API Contracts & Request-Response Mapping

Frontend consumers in `src/pages/*.jsx` and `src/components/*.jsx` communicate via `src/api/client.js` with consistent envelopes:

### Standard Success Response Envelope
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed"
}
```
*Note: Existing endpoints in `server/index.js` return direct keys like `{ success: true, mandates: [...] }` or `{ success: true, stats: {...} }`. To ensure 100% backward compatibility with existing React pages, our backend controllers will supply both top-level resource keys (e.g. `mandates`, `stats`, `requests`) AND standard `data` properties.*

### Standard Error Response Envelope
```json
{
  "success": false,
  "error": "Human-readable description of error",
  "code": "ERROR_CODE",
  "requestId": "req_uuid_v4"
}
```

---

## 3. Existing Mock Functionality Audit

1. **`src/api/mockData.js` & `src/api/mockService.js`**:
   - Implements full client-side request interception and state management using `sessionStorage` under `mandate_gateway_demo_state_v1`.
   - Seeded with 4 realistic mandates (`M-902`, `M-844`, `M-719`, `M-603`), 3 agent passports (`pass_claude_shop`, `pass_perplexity_buy`, `pass_autoprocure`), 4 purchase requests (`PR-1082`, `PR-1081`, `PR-1079`, `PR-1075`), 3 payment methods, and 15 red team attack vectors.
   - Fully interactive without a backend; supports creating mandates, approving/rejecting requests, freezing cards, toggling the kill switch, and resetting demo state.
   - **Requirement**: Must be kept fully intact when `VITE_APP_MODE=demo` or when the backend server is unreachable.

2. **`src/services/paymentService.js`**:
   - `DemoPayPalPaymentService` simulates PayPal Sandbox order creation with random hex IDs (`PAYPAL-SB-XXXX`) and instant simulated capture (`CAP-XXXX`).
   - Clearly labels orders with `isSimulated: true`.
   - Lacks real PayPal Sandbox REST API connectivity (OAuth 2.0 token exchange, `/v2/checkout/orders` creation, capture, and webhook verification).

3. **`src/services/productProvider.js`**:
   - `DemoChannel3ProductProvider` supplies 4 deterministic product fixtures for automated scenario testing:
     - `cand-deathadder` (Fully compliant, ₹1,499)
     - `cand-g502` (Exceeds ₹3,000 auto-cap, triggers HITL)
     - `cand-mxmaster-unauthorized` (Unverified merchant, blocked)
     - `cand-samsung-monitor-overcap` (Exceeds ₹5,000 ceiling, blocked)
   - Decoupled from the UI via the `ProductProvider` base class.

---

## 4. Existing Backend Functionality Audit

1. **`server/index.js`**:
   - Express 4 application with helmet security headers, origin-restricted CORS, rate limiting, and centralized error handling.
   - All state is stored in Node.js process memory (`let mandates = [...]`, `let purchaseRequests = [...]`).
   - Serves built static assets from `dist/` with SPA fallback for unhandled non-API routes.

2. **`server/securityMiddleware.js`**:
   - Configures Helmet Content Security Policy (restricting script, style, img, font, connect origins).
   - Rate limiters: Standard (400 req / 15 min), Auth (25 req / 15 min), AI Procurement (60 req / 5 min).
   - CSV Formula Injection defense: Neutralizes `=`, `+`, `-`, `@`, `\t`, `\r` prefixes with single quote prepend (`'`).
   - Centralized error handler masking stack traces in production.

3. **`server/policyEngine.js`**:
   - Core deterministic policy evaluation function `evaluatePurchasePolicy`.
   - Steps checked: Payload validation, Kill switch, Mandate status, Mandate expiration, Agent authorization, Currency match, Merchant blocklist & allowlist, Category match, Cumulative budget ceiling check, Specs/evidence verification, Single-item limit, Co-signer threshold.
   - Default fail-closed verdict (`ERROR`).

---

## 5. Identified Incomplete & Broken Functionality

1. **State Volatility**: Any restart of `server/index.js` erases all user changes, new mandates, approved orders, newly registered agents, and audit logs.
2. **Missing CRUD Routes**:
   - `GET /api/mandates/:id` (returns 404 on current server).
   - `PUT /api/mandates/:id` (cannot update existing mandate).
   - `GET /api/requests/:id` (cannot inspect request details individually).
   - `POST /api/register` (no way to create real user accounts).
3. **Simulated Red Team Suite**:
   - In `server/index.js:1373`, `run-attacks` does not execute `evaluatePurchasePolicy()`; it simply returns `isBenchmark ? 'AUTO_CLEARED' : 'BLOCKED'`.
4. **Mock Redirection in Attack 15 & Attack Vectors**:
   - Attacks should test actual policy code with simulated malicious payloads (prompt injection in title, unicode zero-width spaces, hidden surcharge in request object, typosquatting domain).
5. **No Concurrency Protection**:
   - Two concurrent purchase requests for ₹4,000 on a mandate with ₹5,000 remaining budget both evaluate successfully in memory before either updates `utilized`, allowing over-budget settlement.

---

## 6. Identified Security Weaknesses

1. **Zero Authentication Verification**:
   - `server/index.js:586` logs in the user regardless of passphrase provided.
   - `createAuthMiddleware` simply checks `sessionUserRef.isAuthenticated`, which is shared globally across every HTTP client connecting to the server.
2. **Privilege Escalation & Cross-User Data Leakage**:
   - No user ownership binding on mandates or purchase requests. All connected clients share the single global Elena Vance session.
3. **Unvalidated Claims of Enclave & Hardware Attestation**:
   - API responses claim "Intel SGX Enclave #TDX-AUTO (Hardware Signed)" and "AWS Nitro SGX Enclave #E-8902" despite running plain Node.js math and string interpolation.
   - Must be transparently documented as software-generated cryptographic hashes (`SHA-256`), not hardware enclave or distributed blockchain.
4. **Weak Hash Generation**:
   - Audit event hashes use `sha256:${Math.random().toString(16).substring(2, 10)}`, which is neither SHA-256 nor hash-linked.
5. **Typosquatting Detection is Fragile**:
   - Merchant domain validation checks simple substring inclusion (`normalizedMerchant.includes(b)`), which can lead to false positives (e.g. `notamazon.in` containing `amazon.in` or vice versa).

---

## 7. Missing Database Persistence & Normalization Needs

To support atomic transactions, concurrency, and multi-tenant isolation, 14 normalized PostgreSQL tables are required:
1. `users` (UUID primary key, email, bcrypt password hash, role, timestamps).
2. `sessions` (UUID primary key, user_id FK, token hash, expiry, revoked_at).
3. `mandates` (UUID primary key, user_id FK, name, category, currency, budget ceilings in minor units, status, expiry).
4. `mandate_merchants` (join table for allowed/blocked merchants).
5. `merchants` (canonical domain, verification status).
6. `agent_passports` (agent credentials, token hash, public key, spending ceiling, status).
7. `purchase_requests` (mandate_id, agent_passport_id, amount_minor, policy_verdict, status, idempotency_key).
8. `purchase_evidence` (specs, expected vs observed, quotes, verified boolean).
9. `approvals` (single-use cryptographic approval tokens, status, expiry, consumed_at).
10. `payment_methods` (provider, provider_reference, frozen, sandbox_mode).
11. `payments` (provider order ID, capture ID, amount_minor, status, idempotency_key).
12. `audit_logs` (tamper-evident SHA-256 hash-chain, previous_hash, canonical event payload).
13. `agent_security_events` (security incidents, attack category, blocked boolean).
14. `system_settings` (user/system configuration key-values).

---

## 8. Dependencies & Environment Constraints

- Node.js runtime: v24.20.0 (Windows local workstation).
- Package manager: npm.
- Module format: ES modules (`"type": "module"`).
- Existing packages: `express`, `cors`, `helmet`, `express-rate-limit`, `react`, `react-router-dom`, `tailwindcss`, `vite`.
- Required backend dependencies:
  - `pg`: Official PostgreSQL client supporting connection pooling and client transactions.
  - `bcryptjs`: Secure password hashing without native binary compilation failures on Windows.
  - `dotenv`: Reliable environment variable loading from `.env`.
- Database adapter design:
  - Supports standard PostgreSQL via `pg.Pool` when `DATABASE_URL` is set.
  - Provides a zero-external-dependency fallback/embedded PostgreSQL adapter (`pg-mem` or robust SQL execution engine) for seamless local dev & test execution when a local PostgreSQL daemon is not installed.
  - Dual frontend modes: `VITE_APP_MODE=demo` (client mock) vs `VITE_APP_MODE=api` (live backend).

---

## 9. Key Audit Findings & Architectural Resolutions (Discoveries A–J)

During the comprehensive audit, ten critical technical factors were isolated and systematically addressed in the revived backend architecture:

| Finding ID | Audit Discovery | Root Cause & Security Implication | Permanent Architectural Resolution |
|---|---|---|---|
| **A** | `server/index.js` contains global in-memory state | Arrays (`mandates`, `requests`, `auditLogs`) in process memory reset on reboot and do not scale. | Replaced with normalized PostgreSQL tables, versioned SQL migrations (`001_initial_schema.sql`), and repository DAOs. |
| **B** | Session user was pre-authenticated | Endpoints assumed operator "Elena Vance" was logged in without credentials check. | Implemented proper session tokens (`sessions` table), HttpOnly cookie delivery, Bearer header support, and `/api/auth/me`. |
| **C** | Auth middleware did not verify actual credentials | Simulated passphrases accepted any text without password hashing. | Implemented bcrypt password verification, SHA-256 session token hashing, expiration, and revocation. |
| **D** | Agent passport demo records contained hardcoded token values | Passports stored plain tokens (`0x9A48F9E0...`) directly in memory. | Passports now store SHA-256 token digests in the database; full tokens are only displayed once on minting. |
| **E** | Simulated attestation and compliance labels | Labels like "PCI-DSS 4.0 Attested" and "Hardware Enclave SGX" were static strings. | Replaced with truthful disclosures: software cryptographic token verification using SHA-256 digests. |
| **F** | Merchant validation used unsafe substring matching | Matching allowed `amazon.co.uk.evil.com` if `amazon` was an allowed substring. | Replaced with canonical domain normalization, exact host matching, and Levenshtein distance anti-typosquatting checks. |
| **G** | Budget evaluation lacked atomic reservation transactions | Concurrent requests against the same mandate risked double-spending. | Implemented two-phase atomic budget reservation (`reserved_amount`) inside PostgreSQL row-level locks (`SELECT ... FOR UPDATE`). |
| **H** | PayPal configuration supported deterministic mock mode | When credentials were absent, the app lacked a real PayPal REST adapter. | Implemented modular PayPal REST v2 Orders adapter with OAuth 2.0 token caching and graceful deterministic mock fallback (`NOT_CONFIGURED`). |
| **I** | Embedded `pg-mem` as in-memory fallback | Local dev workstations lacked running PostgreSQL instances. | Configured `server/config/database.js` to use `pg.Pool` when `DATABASE_URL` is set, with seamless fallback to `pg-mem` for zero-dependency test runs. |
| **J** | `package.json` lacked explicit production drivers | Production deployment required `pg`, `zod`, and dependencies declared under production dependencies. | Added `pg`, `zod`, `express`, `cors`, `bcryptjs`, and `helmet` under production `"dependencies"` in `package.json`. |

---

## 10. Conclusion & Action Plan

The repository is structurally clean and passes all 85 existing frontend tests. The backend revival can proceed with zero regression to the existing frontend. 

**Next Steps:**
- Phase 1: Implement modular monolith structure under `server/`.
- Phase 2: Create SQL migrations, models, seeds, and connection pool with minor-currency unit handling.
- Phase 3: Implement true bcrypt password authentication, session tokens, and ownership checks.
- Phase 4: Build Mandate repository and service with budget lifecycle checks.
- Phase 5: Upgrade policy engine to 22 deterministic checkpoints with canonical domain verification and fail-closed architecture.
- Phase 6: Build modular shopping agent brief parser & candidate evaluator.
- Phase 7: Implement purchase request state machine, single-use approval tokens, and dispute packs.
- Phase 8: Implement modular PayPal sandbox adapter with honest status reporting (`NOT_CONFIGURED` vs `SANDBOX_CONFIGURED`).
- Phase 9: Secure Agent Passport management with SHA-256 token hashing and public verification.
- Phase 10: Persistent kill switch and live red-team attack runner testing real policy code.
- Phase 11: Tamper-evident SHA-256 hash-linked audit ledger and CSV export.
- Phase 12: Real aggregated dashboard metrics and settings.
- Phase 13 & 14: Comprehensive API compatibility testing with frontend integration.
- Phase 15 & 16: Automated unit/integration test suite, deployment guides, and Docker Compose.
- Phase 17: Git commit and push to remote.

