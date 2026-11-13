# Mandate Gateway — Implementation Tracker & Progress Matrix

## Phase-by-Phase Task Checklist

### Phase 0: Repository Audit and Safety
- [x] Run `git status`, `git branch --show-current`, `git remote -v`
- [x] Run `npm install`
- [x] Create `docs/PROJECT_AUDIT.md`
- [x] Create `docs/IMPLEMENTATION_TRACKER.md`

### Phase 1: Product and Design Preservation
- [x] Preserve Google Stitch editorial fintech identity & branding
- [x] Maintain light & dark theme tokens (`src/index.css`)
- [x] Verify typography, layouts, animations, and icons
- [x] Ensure responsive layouts across mobile, tablet, and desktop
- [x] Add loading skeletons, empty states, error states, and toast notifications

### Phase 2: Frontend Complete Revival
- [x] Page 1: Landing Page (fintech hero, architecture diagram, flow, CTAs)
- [x] Page 2: Dashboard (real database metrics, active mandates, pending inbox, working refresh)
- [x] Page 3: Mandate Registry (wizard, edit, pause, resume, revoke, search, filter, persist)
- [x] Page 4: Shopping Agent (brief, search, spec extraction, comparison, candidate selection, policy evaluation, 6 judge scenarios)
- [x] Page 5: Purchase Requests (list, details, search, filters, approval, rejection, cancellation, dispute pack, payment status)
- [x] Page 6: Payment Methods (PayPal connection state, sandbox config, payment history, freeze toggle, limits)
- [x] Page 7: Agent Passports (passport creation, identity, scoped permissions, token status, revocation, verification)
- [x] Page 8: Activity & Audit Log (pagination, search, filtering, date ranges, event details, CSV export)
- [x] Page 9: Security Center (global kill switch, attack history, red-team execution, alerts, agent status)
- [x] Page 10: Merchant Verification (token lookup, identity, status, evidence, safe public verification response)
- [x] Page 11: Settings (user profile, security, session, theme, notification, currency, payment config status)

### Phase 3: Frontend/Backend Connection
- [x] Centralized API client (`src/services/apiClient.js`)
- [x] Domain service modules under `src/services/`:
  - [x] `authService.js`
  - [x] `dashboardService.js`
  - [x] `mandateService.js`
  - [x] `agentService.js`
  - [x] `requestService.js`
  - [x] `paymentService.js`
  - [x] `passportService.js`
  - [x] `activityService.js`
  - [x] `securityService.js`
  - [x] `merchantService.js`
  - [x] `settingsService.js`
- [x] Global authentication context (`src/context/AuthContext.jsx`)
- [x] Global API status & connectivity context / toast banner (`src/context/ApiStatusContext.jsx`)
- [x] Dual mode support: `VITE_APP_MODE=demo` vs `VITE_APP_MODE=api`
- [x] Visible connection error banner when API is unreachable in API mode (no silent fallback to mock)

### Phase 4: Backend Architecture
- [x] Express 4 modular monolith in `server/`
- [x] Strict layering: config, middleware, routes, controllers, services, repositories
- [x] Error handling & RFC-7807 compliance
- [x] Helmet security headers & origin-restricted CORS with credentials
- [x] Sliding-window rate limiting & distributed request tracing (`X-Request-Id`)

### Phase 5: PostgreSQL Database
- [x] 16 normalized tables in `server/database/migrations/001_initial_schema.sql`
- [x] Seed data script `server/database/seeds/001_seed_demo_data.sql`
- [x] UUID primary keys, foreign keys, unique constraints, and performance indexes
- [x] Integer minor currency units (paise/cents) for zero floating-point loss
- [x] Two-phase atomic budget reservation transactions with row-level locking
- [x] Idempotency keys table & webhook events table
- [x] Local Docker Compose setup (`docker-compose.yml`)

### Phase 6: Authentication and Security
- [x] Registration: `POST /api/auth/register`
- [x] Login with bcrypt verification: `POST /api/auth/login`
- [x] Logout: `POST /api/auth/logout`
- [x] Session info: `GET /api/auth/session`
- [x] Current operator: `GET /api/auth/me`
- [x] Revoke all sessions: `POST /api/auth/revoke-sessions`
- [x] HttpOnly, Secure, SameSite session cookies + Bearer token support
- [x] User ownership verification on all resource mutations

### Phase 7: Deterministic Policy Engine
- [x] Inviolable 25-step deterministic evaluation sequence in `server/services/policy.service.js`
- [x] Fail-closed default (zero AI trust for purchase authorization)
- [x] Anti-typosquatting Levenshtein distance check & punycode (`xn--`) detection
- [x] Prompt injection & hidden zero-width unicode smuggling filters
- [x] Single-item ceiling and cumulative budget enforcement in minor units

### Phase 8: Purchase and Approval Engine
- [x] 12 lifecycle statuses (`PENDING_POLICY`, `PENDING_HITL`, `AUTO_CLEARED`, `APPROVED`, `COMPLETED`, `CANCELLED`, `REJECTED`, etc.)
- [x] Single-use cryptographic approval tokens
- [x] Order cancellation hold release endpoint (`POST /api/requests/:id/cancel`)
- [x] Cryptographic dispute pack generator (`GET /api/requests/:id/dispute-pack`)

### Phase 9: PayPal Sandbox API
- [x] Modular PayPal REST v2 Orders adapter (`server/services/paypal.service.js`)
- [x] OAuth 2.0 token caching and orders creation (`/v2/checkout/orders`)
- [x] Webhook event listener with replay protection (`webhook_events`)
- [x] Deterministic mock fallback when credentials omitted (`NOT_CONFIGURED`)

### Phase 10: OpenAI API Integration
- [x] Optional OpenAI provider adapter (`server/integrations/openai/`)
- [x] Controlled by `AI_PROVIDER=none` or `openai`
- [x] Deterministic parsing fallback when key is absent
- [x] Untrusted AI output boundary (AI cannot alter policies or authorize payments)

### Phase 11: Channel3 / Product API Integration
- [x] Provider abstraction in `src/services/productProvider.js`
- [x] Decoupled `DemoChannel3ProductProvider` simulating realistic Indian e-commerce catalog
- [x] Documented partner credential prerequisites in `docs/API_KEYS_SETUP.md`

### Phase 12: Agent Passports
- [x] Cryptographic identity generation & SHA-256 token hashing
- [x] Public merchant verification endpoint (`GET /api/passports/verify/:token`)
- [x] Token detail lookup (`GET /api/passports/:id`)
- [x] Sensitive tokens exposed only once upon minting

### Phase 13: Security Center and Kill Switch
- [x] Persistent emergency kill-switch in PostgreSQL (`system_settings`)
- [x] 15 live red-team attack vectors testing actual policy engine
- [x] Scam message analyzer with transaction ledger cross-checking

### Phase 14: Audit Ledger
- [x] SHA-256 hash-chained immutable event records
- [x] Dynamic chain verification endpoint (`GET /api/security/verify-ledger`)
- [x] Formula-injection-safe CSV exports

### Phase 15: API Contract and Documentation
- [x] Standard JSON response envelope (`success`, `data`, `message` / `error`, `code`, `requestId`)
- [x] OpenAPI 3.0.3 spec (`openapi.yaml`) synchronized
- [x] Postman collection v2.1.0 synchronized

### Phase 16: End-to-End Frontend Integration
- [x] Workflow A: Authentication
- [x] Workflow B: Mandate Lifecycle
- [x] Workflow C: Shopping & Policy Verdict
- [x] Workflow D: HITL Approval & Rejection
- [x] Workflow E: Payment Settlement
- [x] Workflow F: Security & Kill Switch
- [x] Workflow G: Audit Logging & CSV Export
- [x] Workflow H: Database Persistence Across Restarts

### Phase 17: Testing
- [x] Frontend verification suite (`npm test`) -> 85/85 passed
- [x] Backend unit, crypto, money & concurrency tests (`npm run test:backend`) -> 28/28 passed
- [x] End-to-end integration & route resolution tests (`npm run test:integration`) -> 54/54 passed

### Phase 18: Full Application Build & Process Scripts
- [x] Root scripts added in `package.json` (`dev`, `dev:backend`, `dev:frontend`, `dev:fullstack`, `build`, `test`, `test:integration`, `test:e2e`)
- [x] Concurrently / dual runner configuration

### Phase 19: Deployment
- [x] `docs/DEPLOYMENT.md`
- [x] `docs/API_KEYS_SETUP.md`
- [x] `docs/BACKEND_ARCHITECTURE.md`
- [x] `docs/DATABASE_SCHEMA.md`
- [x] `docs/SECURITY_MODEL.md`
- [x] `docs/TESTING.md`
- [x] Updated `README.md` with correct repository clone URL

### Phase 20: GitHub Commit and Push
- [x] Scan for exposed secrets & verify `.gitignore`
- [x] Commit: `feat: complete straw hats full-stack mandate gateway`
- [x] Push to `origin main` (`https://github.com/Rahullande08/straw-hats.git`)
- [x] Verify remote commit status

