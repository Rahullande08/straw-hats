# Mandate Gateway — Credentials & API Keys Setup Guide

This guide details all environment variables, third-party credentials, and configuration steps required to operate **Mandate Gateway** in local development, testing, and production environments.

---

## 1. Environment Configuration Overview

Copy the template file to begin:
```bash
cp .env.example .env
```

| Key | Default / Fallback | Required | Description |
|---|---|---|---|
| `PORT` | `3001` | No | Server listening port |
| `NODE_ENV` | `development` | Yes | Node environment (`development`, `production`, `test`) |
| `DATABASE_URL` | `""` (embedded pg-mem) | Optional in dev, Recommended in prod | PostgreSQL connection string |
| `SESSION_SECRET` | 32-char dev string | Yes in production | High-entropy random key for HMAC session signing |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Yes in production | Comma-separated list of allowed browser origins |
| `PAYPAL_MODE` | `sandbox` | No | PayPal execution rail (`sandbox` only; live disabled) |
| `PAYPAL_CLIENT_ID` | `""` (mock mode) | Optional | PayPal Sandbox REST App Client ID |
| `PAYPAL_CLIENT_SECRET` | `""` (mock mode) | Optional | PayPal Sandbox REST App Secret |
| `PAYPAL_WEBHOOK_ID` | `""` (mock mode) | Optional | PayPal Webhook ID for signature verification |
| `AI_PROVIDER` | `none` | No | AI parser provider (`none` or `openai`) |
| `OPENAI_API_KEY` | `""` | Optional | OpenAI API key for natural language brief parsing |
| `OPENAI_MODEL` | `gpt-4o-mini` | No | OpenAI model identifier |
| `VITE_APP_MODE` | `api` | No | Frontend mode (`api` for live backend, `demo` for client mock) |

---

## 2. PostgreSQL Database Setup

### Option A: Embedded Zero-Dependency Mode (Default)
If `DATABASE_URL` is left empty or omitted, Mandate Gateway automatically spins up an embedded in-memory PostgreSQL engine (`pg-mem`).
- **Features:** 100% SQL compatibility, foreign keys, migrations, seeds, and transactions.
- **Use case:** Local quickstart, automated CI test runners, offline reviews.
- **Limitation:** In-memory only; state resets on server restart.

### Option B: Local Docker PostgreSQL
To use a persistent local PostgreSQL 16 database:
```bash
# Start PostgreSQL container via docker-compose
docker compose up -d postgres

# Configure your .env:
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/mandate_gateway
```

### Option C: Managed Cloud PostgreSQL (Neon, Supabase, Render, Railway, AWS RDS)
Obtain your pooled connection string with SSL:
```ini
DATABASE_URL=postgresql://user:password@ep-sparkling-pool.us-east-2.aws.neon.tech/mandate_gateway?sslmode=require
```
Mandate Gateway automatically applies all 16 table migrations and seeds baseline records on the first startup.

---

## 3. PayPal Sandbox Configuration

Mandate Gateway orchestrates payments through PayPal REST v2 Orders API.

### Obtaining Sandbox Credentials:
1. Navigate to the **[PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)**.
2. Sign in with your PayPal developer credentials.
3. Under **Apps & Credentials**, select **Sandbox**.
4. Click **Create App** (e.g. "Mandate Gateway Sandbox").
5. Copy the **Client ID** and **Secret**:
   ```ini
   PAYPAL_MODE=sandbox
   PAYPAL_CLIENT_ID=Ae2...YOUR_SANDBOX_CLIENT_ID...
   PAYPAL_CLIENT_SECRET=EL8...YOUR_SANDBOX_SECRET...
   ```

### Webhook Event Listener Registration:
1. In your PayPal Developer App, scroll to **SandBox Webhooks**.
2. Click **Add Webhook**.
3. Set Webhook URL to: `https://<YOUR_DEPLOYED_DOMAIN>/api/payments/webhook`.
4. Select Event Types:
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
5. Save and copy the **Webhook ID**:
   ```ini
   PAYPAL_WEBHOOK_ID=WH-348109283471092-SANDBOX
   ```

> **Truthful Disclosure**: When `PAYPAL_CLIENT_ID` or `PAYPAL_CLIENT_SECRET` are not configured, the gateway automatically switches to deterministic mock sandbox mode (`state: "NOT_CONFIGURED"`). It simulates order creation, approvals, and capture IDs without issuing real external HTTP calls, ensuring evaluation workflows remain functional without API keys. Live payments (`PAYPAL_MODE=live`) are explicitly prohibited in this build.

---

## 4. Optional AI Provider Setup (OpenAI)

Mandate Gateway uses deterministic regex and structured rule parsing by default. If you wish to enable generative prompt extraction:

```ini
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...YOUR_OPENAI_KEY...
OPENAI_MODEL=gpt-4o-mini
```

When `AI_PROVIDER=none` or the key is omitted:
- Natural-language procurement briefs are parsed deterministically by `server/services/procurement.service.js`.
- AI models **NEVER** authorize payments or modify policy constraints regardless of provider.

---

## 5. Channel3 Product Provider Status

Mandate Gateway implements a decoupled product discovery interface in `src/services/productProvider.js` and `server/services/procurement.service.js`:
- **Current Adapter:** `DemoChannel3ProductProvider` simulating realistic e-commerce inventory across Amazon India, Croma Retail, Reliance Digital, and Tata CLiQ.
- **Live Channel3 Status:** Official Channel3 partner API endpoints require authenticated merchant scraping keys and production contracts. The interface is engineered to accept API credentials when available, but does not simulate fake live API endpoints or fabricate credentials.

---

## 6. Frontend Mode Switching (`VITE_APP_MODE`)

- **`VITE_APP_MODE=api` (Default):**
  Frontend communicates directly with the live Express backend via `/api` (proxied by Vite or absolute URL via `VITE_API_BASE_URL`).
- **`VITE_APP_MODE=demo`:**
  Frontend executes completely inside the browser using client-side mock storage (`src/api/mockService.js`). Ideal for static hosting (e.g., pure Vercel preview without backend).
