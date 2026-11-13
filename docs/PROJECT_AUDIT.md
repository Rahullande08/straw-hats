# Mandate Gateway — Project Audit & Full-Stack System Review

**Date:** November 2026  
**Auditor:** Principal Full-Stack Engineer, Fintech Security Architect & DevOps Engineer  
**Repository:** `https://github.com/Rahullande08/straw-hats`  
**Branch:** `main`

---

## 1. Executive Summary

Mandate Gateway is an editorial fintech application designed to provide sovereign, user-governed authorization, deterministic policy enforcement, and payment governance between autonomous AI shopping agents and e-commerce merchants.

The application features:
1. **Frontend:** React 18, Vite 5, Tailwind CSS with custom Google Stitch-inspired design tokens, light/dark themes, and 12 distinct functional pages.
2. **Backend:** Express 4 modular monolith with 16 normalized PostgreSQL tables, a deterministic 25-step fail-closed policy engine, PayPal Sandbox REST v2 adapter, and SHA-256 hash-chained audit logging.
3. **Dual Operation Modes:** `VITE_APP_MODE=demo` (client-side mock service) and `VITE_APP_MODE=api` (live Express/PostgreSQL backend).

This audit identifies the current full-stack integration status, frontend-to-backend linkage, API contracts, database persistence, security posture, and production deployment readiness.

---

## 2. Existing Functionality

| Subsystem | Components | Functionality Status |
|---|---|---|
| **Landing Page** | `src/pages/LandingPage.jsx` | Editorial fintech hero, interactive 5-stage architecture diagram, feature cards, and direct CTAs. |
| **Dashboard** | `src/pages/DashboardPage.jsx` | Aggregated telemetry, active mandate cards, utilization progress bars, pending HITL approval queue, and recent activity. |
| **Mandate Registry** | `src/pages/MandatesPage.jsx` | 4-step mandate creation wizard, budget caps, merchant allowlists/blocklists, single-purchase limits, pause/resume, and instant revocation. |
| **Shopping Agent** | `src/pages/ShoppingAgentPage.jsx` | Procurement brief parser, 6 preconfigured judge scenarios, Channel3 product provider adapter, quote verification, candidate cards, and policy clearance submit. |
| **Purchase Requests** | `src/pages/PurchaseRequestsPage.jsx` | 7-stage order lifecycle, evidence inspection, sovereign approval/rejection modal, and cryptographic dispute pack generator. |
| **Payment Methods** | `src/pages/PaymentMethodsPage.jsx` | Connected payment rails, freeze/unfreeze toggle, auto-approve caps, and PayPal Sandbox integration status card. |
| **Agent Passports** | `src/pages/AgentPassportPage.jsx` | Cryptographic passport minting, SHA-256 token digest generation, spending caps, and revocation controls. |
| **Activity Log** | `src/pages/ActivityPage.jsx` | Searchable, filterable audit log with status badges and formula-injection-safe CSV export. |
| **Security Center** | `src/pages/SecurityPage.jsx` | Persistent global emergency kill-switch, 15 red-team adversarial attack vectors, scam message heuristic scanner, and defense rate telemetry. |
| **Merchant Verify** | `src/pages/MerchantVerifyPage.jsx` | Public unauthenticated merchant attestation portal verifying agent DID tokens. |
| **Settings** | `src/pages/SettingsPage.jsx` | Theme selection (light/dark), network node attestation, threshold limits, currency preferences, and notification toggles. |
| **Backend API Engine** | `server/` | 16 normalized PostgreSQL tables, Express 4 modular routes, rate limiting, helmet security headers, and embedded `pg-mem` local test runner. |

---

## 3. Gap Analysis: Frontend-to-Backend Linkage & Gaps

| Area | Current State | Target State (Full-Stack Revival) |
|---|---|---|
| **API Client Centralization** | `src/api/client.js` handled both dispatch and fetch | Centralize dedicated domain services under `src/services/` (`authService.js`, `dashboardService.js`, `mandateService.js`, etc.) while retaining `apiClient.js` with unified error handling. |
| **Connection Error Visibility** | Silent fallback to mock data on network errors in some flows | When `VITE_APP_MODE=api`, network or backend errors must be visibly rendered via toasts/banners with retry actions, never silently spoofed as mock success. |
| **Mandate Status Persistence** | Status toggles in frontend called `/revoke` | Wire up `PATCH /api/mandates/:id/status` for pause/resume alongside `POST /api/mandates/:id/revoke`. |
| **Purchase Cancellation** | Rejection was wired, cancellation was manual | Wire up `POST /api/requests/:id/cancel` to allow user-initiated cancellation releasing reserved budget holds. |
| **OpenAI Integration** | Deterministic rule-based brief parser active | Add optional live OpenAI adapter in backend (`server/integrations/openai/`) active when `AI_PROVIDER=openai` and `OPENAI_API_KEY` is present. |
| **Channel3 Integration** | `DemoChannel3ProductProvider` active | Clearly document Channel3 partner access prerequisites in `docs/API_KEYS_SETUP.md` while maintaining zero-breakage demo catalog. |
| **Idempotency & Webhooks** | Implemented on backend | Wire `Idempotency-Key` headers on state-mutating requests (`POST /requests`, `POST /mandates`) and document webhook simulation. |

---

## 4. API Endpoints Inventory & Contracts

All endpoints conform to standard JSON response envelopes (`success`, `data`, `message` / `error`, `code`, `requestId`):

```
Health & System:
  GET  /health
  GET  /ready
  GET  /api/health
  GET  /api/ready

Auth & Session:
  POST /api/auth/register
  POST /api/auth/login
  POST /api/auth/logout
  GET  /api/auth/session
  GET  /api/auth/me
  POST /api/auth/revoke-sessions

Dashboard:
  GET  /api/dashboard

Mandates:
  GET   /api/mandates
  GET   /api/mandates/:id
  POST  /api/mandates
  PUT   /api/mandates/:id
  PATCH /api/mandates/:id/status
  POST  /api/mandates/:id/revoke

Shopping Agent:
  POST /api/agent/parse-brief
  POST /api/agent/search-products
  POST /api/agent/search
  POST /api/agent/evaluate-candidates

Policy Engine:
  POST /api/policy/evaluate

Purchase Requests:
  GET  /api/requests
  GET  /api/requests/:id
  POST /api/requests
  POST /api/requests/:id/approve
  POST /api/requests/:id/reject
  POST /api/requests/:id/cancel
  GET  /api/requests/:id/dispute-pack

Payment Methods & Rails:
  GET  /api/payment-methods
  POST /api/payment-methods/connect
  POST /api/payment-methods/:id/toggle-freeze
  POST /api/payment-methods/:id/limits
  GET  /api/payments/orders
  GET  /api/payments/:id
  POST /api/payments/webhook

Agent Passports:
  GET  /api/passports
  GET  /api/passports/:id
  POST /api/passports
  POST /api/passports/:id/revoke
  GET  /api/passports/verify/:token

Activity & Audit Ledger:
  GET /api/activity
  GET /api/activity/export

Security & Resilience:
  GET  /api/security/attacks
  POST /api/security/run-attacks
  POST /api/security/check-message
  GET  /api/security/kill-switch
  POST /api/security/kill-switch/toggle
  GET  /api/security/verify-ledger

Settings:
  GET  /api/settings
  POST /api/settings
  PUT  /api/settings

Merchants:
  GET /api/merchants
```

---

## 5. Security Posture Review

- **Zero AI Authorization Authority:** Generative AI models are strictly unprivileged. Final payment authorization is mathematically calculated by `policy.service.js` using fail-closed invariants.
- **Integer Minor Currency Units:** Financial amounts are stored as integer minor units (`BIGINT` paise/cents) across PostgreSQL and memory.
- **Atomic Two-Phase Budget Allocation:** Budget reservations and utilization conversions execute inside PostgreSQL transactions with row-level locking (`SELECT ... FOR UPDATE`).
- **Cryptographic Hash-Linked Audit Trail:** Every state change computes a SHA-256 event hash linked to the prior record, validated by `/api/security/verify-ledger`.
- **Anti-Typosquatting & Homoglyphs:** Rejects lookalike domain fraud (`arnazon.com`) using Levenshtein distance matching and punycode (`xn--`) detection.
- **Formula Injection Defense:** CSV exports prefix formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) with `'`.
- **Global Emergency Kill-Switch:** Instantly circuit-breaks all incoming autonomous purchase clearances with PostgreSQL persistence.

---

## 6. Test Suite Baseline

All tests currently execute with 100% pass rate:
- `npm test`: **85 / 85 passed** (Frontend bundles, SPA rewrites, mock dispatcher, 6 scenarios)
- `npm run test:backend`: **28 / 28 passed** (15 policy engine invariants, 5 money math, 4 crypto, 4 concurrency)
- `npm run test:integration`: **54 / 54 passed** (40 end-to-end integration tests, 14 route resolutions)
- `npm run build`: **Vite production build succeeds** in under 5 seconds.

---

## 7. Deployment Readiness

- Multi-stage [Dockerfile](file:///c:/Users/Rahul/OneDrive/Desktop/paypal/Dockerfile) containerizing Vite build and Express backend.
- [docker-compose.yml](file:///c:/Users/Rahul/OneDrive/Desktop/paypal/docker-compose.yml) orchestrating PostgreSQL 16 and Mandate Gateway API container.
- [vercel.json](file:///c:/Users/Rahul/OneDrive/Desktop/paypal/vercel.json) configuring client SPA rewrites.
- Production environment template in [.env.example](file:///c:/Users/Rahul/OneDrive/Desktop/paypal/.env.example).

