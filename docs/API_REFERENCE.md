# Mandate Gateway — API Reference & Integration Manual

## 1. Authentication & Common Headers

Mandate Gateway supports three interchangeable authentication mechanisms:
1. **HttpOnly Session Cookie (`session_token`)**: Default for browser web applications.
2. **Bearer Authorization Header**: `Authorization: Bearer <session_token>`.
3. **Session Token Header**: `X-Session-Token: <session_token>`.

### Common Request Headers
| Header | Description | Required | Example |
|---|---|---|---|
| `Content-Type` | MIME payload type | For POST/PUT | `application/json` |
| `Authorization` | Bearer token authentication | Yes (unless using cookie) | `Bearer d8f4a...` |
| `X-Request-Id` | Tracing correlation ID | Optional | `req-8f4b-21a` |
| `Idempotency-Key` | Safe retry guarantee on payment mutations | Optional | `idem-992384-ord` |

---

## 2. API Endpoints Catalog

### 2.1 System & Health

#### `GET /health` or `GET /api/health`
Returns process status, database connectivity, and kill-switch state (Liveness probe).
- **Auth:** None (Public)
- **Response `200 OK`:**
```json
{
  "status": "UP",
  "service": "Mandate Gateway Core Engine",
  "version": "2.4.0",
  "mode": "EMBEDDED_POSTGRES",
  "killSwitchActive": false,
  "database": { "status": "CONNECTED", "driver": "pg" },
  "timestamp": "2026-11-12T18:00:00.000Z",
  "uptime": 124
}
```

#### `GET /ready` or `GET /api/ready`
Readiness probe verifying external PostgreSQL database pool availability.
- **Auth:** None (Public)
- **Response `200 OK` (or `503 Service Unavailable` if database is disconnected):**
```json
{
  "status": "READY",
  "database": { "status": "CONNECTED", "driver": "pg", "connected": true },
  "timestamp": "2026-11-12T18:00:00.000Z"
}
```

---

### 2.2 Session & Authentication

#### `POST /api/auth/login` (or `/api/login`)
Authenticates an operator using email and password, returning an authenticated session.
- **Auth:** None
- **Request Body:**
```json
{
  "email": "elena@vance.io",
  "password": "sovereign-vault-passphrase"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "user": {
    "id": "u-elena-vance-uuid",
    "name": "Elena Vance",
    "email": "elena@vance.io",
    "role": "operator"
  },
  "sessionToken": "a3b9f4..."
}
```

#### `POST /api/auth/register` (or `/api/register`)
Creates a new operator account and establishes a session.
- **Request Body:**
```json
{
  "name": "Marcus Aurelius",
  "email": "marcus@rome.io",
  "password": "SecureMasterPassphrase99!",
  "role": "operator"
}
```
- **Response `201 Created`:** User payload and session token.

#### `GET /api/auth/session` (or `/api/session`)
Returns the currently authenticated operator profile.
- **Auth:** Required

#### `GET /api/auth/me`
Retrieves currently authenticated operator details and roles.
- **Auth:** Required

#### `POST /api/auth/logout` (or `/api/logout`)
Revokes the current session token in PostgreSQL and clears cookies.
- **Auth:** Required

#### `POST /api/auth/revoke-sessions`
Revokes all active sessions across all devices for the authenticated operator.
- **Auth:** Required

---

### 2.3 Dashboard

#### `GET /api/dashboard`
Returns aggregated telemetry, active mandates summary, and pending approval inbox.
- **Auth:** Required
- **Response `200 OK`:**
```json
{
  "success": true,
  "stats": {
    "activeMandates": 4,
    "totalMandates": 4,
    "totalCeiling": 82500,
    "totalUtilized": 33700,
    "pendingApprovalsCount": 2,
    "clearedOrdersCount": 14,
    "blockedViolationsCount": 3
  },
  "mandates": [...],
  "pendingRequests": [...]
}
```

---

### 2.4 Mandate Management

#### `GET /api/mandates`
Retrieves all spending mandates belonging to the authenticated operator.

#### `GET /api/mandates/:id`
Retrieves a single mandate by its ID.

#### `POST /api/mandates`
Creates a new spending mandate.
- **Request Body:**
```json
{
  "name": "Cloud Infrastructure & GPUs",
  "description": "Compute and API credits for autonomous pipelines",
  "category": "Electronics & Computing",
  "currency": "USD",
  "budgetCeiling": 25000,
  "singlePurchaseLimit": 5000,
  "humanApprovalThreshold": 2000,
  "cosignerThreshold": 10000,
  "allowedMerchants": ["AWS", "RunPod", "Lambda Labs"],
  "blockedMerchants": ["SuspiciousHost.cc"]
}
```

#### `PUT /api/mandates/:id`
Updates budget ceiling, thresholds, or allowed merchants for an existing mandate.

#### `PATCH /api/mandates/:id/status`
Updates mandate status (`ACTIVE`, `PAUSED`, `REVOKED`, `EXPIRED`).

#### `POST /api/mandates/:id/revoke`
Toggles the revocation status (`active` <-> `revoked`). Revoked mandates immediately fail policy evaluation.

---

### 2.5 Agent Procurement

#### `POST /api/agent/parse-brief`
Parses a natural-language procurement brief into structured specifications.
- **Request Body:**
```json
{
  "brief": "Procure a Logitech MX Master 3S wireless mouse in graphite under 9000 INR"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "specs": {
    "product": "Logitech MX Master 3S",
    "color": "graphite",
    "maxPrice": 9000,
    "currency": "INR"
  }
}
```

#### `POST /api/agent/search-products` (or `/api/agent/search`)
Searches catalog candidates matching procurement requirements.

#### `POST /api/agent/evaluate-candidates`
Scores and validates catalog candidates against specifications and policy rules.

---

### 2.6 Deterministic Policy Engine

#### `POST /api/policy/evaluate`
Direct evaluation endpoint executing the inviolable 22-step deterministic rule chain.
- **Request Body:**
```json
{
  "amount": 8495,
  "currency": "INR",
  "merchant": "Amazon India",
  "category": "Electronics & Computing",
  "mandateId": "M-902",
  "agentId": "pass_claude_shop",
  "productUrl": "https://amazon.in/dp/B0B11D7T9M"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "verdict": "AUTO_CLEARED",
  "passedChecks": [
    "Payload validity confirmed",
    "Kill-switch inactive",
    "Mandate active and within budget",
    "Merchant verified on allowlist",
    "Single-item limit satisfied"
  ]
}
```

---

### 2.7 Purchase Requests & Approvals

#### `GET /api/requests`
Lists purchase requests with optional filters (`status`, `mandateId`, `limit`).

#### `GET /api/requests/:id`
Returns a purchase request along with its locked cryptographic evidence.

#### `POST /api/requests`
Submits a new purchase request from an autonomous agent, runs policy evaluation, reserves budget, and persists evidence.

#### `POST /api/requests/:id/approve`
Operator sign-off on a pending (`HITL_PENDING`) purchase request. Atomically converts reserved budget into utilized budget and initiates PayPal settlement.

#### `POST /api/requests/:id/reject`
Rejects a pending purchase request and immediately releases any held budget reservation.

#### `POST /api/requests/:id/cancel`
Cancels a pending purchase request and releases budget reservations back to the mandate.

#### `GET /api/requests/:id/dispute-pack`
Generates a downloadable, cryptographic proof-of-intent dispute pack containing order parameters, merchant evidence, and SHA-256 signatures.

---

### 2.8 Payment Methods & Rails

#### `GET /api/payment-methods`
Returns all registered payment rails (PayPal Sandbox, Virtual Cards).

#### `POST /api/payment-methods/connect`
Connects a new payment rail.

#### `POST /api/payment-methods/:id/toggle-freeze`
Toggles the frozen state of a payment rail. Frozen rails reject all clearance requests.

#### `POST /api/payment-methods/:id/limits`
Updates auto-approve cap and aggregate spending limits.

#### `POST /api/payments/webhook`
Receiver endpoint for asynchronous PayPal payment captures and disputes (with replay protection and signature verification).

---

### 2.9 Agent Passports

#### `GET /api/passports`
Lists all issued agent cryptographic passports.

#### `GET /api/passports/:id`
Retrieves a specific agent passport by identifier.

#### `POST /api/passports`
Mints a new agent passport with a SHA-256 token hash and unique `agentIdentifier`.

#### `POST /api/passports/:id/revoke`
Revokes an agent passport, preventing any future order authorization.

#### `GET /api/passports/verify/:token`
Public unauthenticated endpoint allowing e-commerce merchants to verify that an agent token is active and authorized.

---

### 2.10 Activity & Audit Ledger

#### `GET /api/activity`
Returns the immutable, hash-linked audit records.

#### `GET /api/activity/export?format=csv`
Exports the audit ledger to CSV with formula injection sanitization (protects Excel users against `=CMD|...` macros).

#### `GET /api/activity/export?format=json`
Exports the full audit log payload in canonical JSON format.

---

### 2.11 Security & Resilience Suite

#### `GET /api/security/attacks`
Returns the catalog of 15 adversarial attack test vectors.

#### `POST /api/security/run-attacks`
Executes the red-team suite against the active policy engine and returns empirical pass/fail metrics.

#### `POST /api/security/check-message`
Analyzes text or email content for fake payment confirmations, homoglyph phishing, and urgency triggers.

#### `GET /api/security/kill-switch`
Checks the current state of the global emergency stop switch.

#### `POST /api/security/kill-switch/toggle`
Instantly activates or deactivates the emergency kill-switch. When active, all incoming purchase clearances are blocked.

#### `GET /api/security/verify-ledger`
Dynamically validates the SHA-256 cryptographic chain across every audit record in PostgreSQL.

