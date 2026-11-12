# Mandate Gateway — Production Deployment Guide

## 1. Quickstart (Zero-Dependency Local Run)

Mandate Gateway includes an embedded in-memory PostgreSQL engine (`pg-mem`). You can boot and test the entire backend without installing PostgreSQL or Docker locally:

```bash
# 1. Install dependencies
npm install

# 2. Run backend tests (unit + concurrency)
npm run test:backend

# 3. Run integration & route tests
npm run test:integration

# 4. Start backend server (defaults to port 3001)
npm run server
```

The server automatically applies SQL migrations and seeds baseline demo data on boot.

---

## 2. Docker & Docker Compose Deployment

For containerized environments with a dedicated PostgreSQL 16 database:

```bash
# Boot PostgreSQL and Mandate Gateway API via docker-compose
docker compose up -d --build

# Inspect logs
docker compose logs -f backend

# Verify health endpoint
curl http://localhost:3001/api/health
```

---

## 3. Cloud Platform Deployment (Render, Railway, Fly.io)

### 3.1 Railway Deployment
1. Create a new project in Railway.
2. Add a **PostgreSQL** service plugin.
3. Add a **GitHub Repo** service connected to `straw-hats`.
4. Configure environment variables in the service dashboard:
   - `NODE_ENV=production`
   - `PORT=3001`
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
   - `SESSION_SECRET=<generate-at-least-32-chars-random-string>`
   - `CORS_ORIGINS=https://your-frontend-domain.vercel.app`
   - `PAYPAL_MODE=sandbox`
5. Railway automatically builds the project using the included multi-stage `Dockerfile`.

### 3.2 Render Deployment
1. Create a **Web Service** pointing to your repository.
2. Select **Docker** as the runtime.
3. Add a managed **PostgreSQL database** on Render.
4. Copy the internal database connection string and set `DATABASE_URL`.
5. Set `SESSION_SECRET` and `CORS_ORIGINS`.

---

## 4. Production Environment Variables Reference

| Variable | Required | Description | Example |
|---|---|---|---|
| `NODE_ENV` | Yes | Node environment | `production` |
| `PORT` | No | Server listen port | `3001` (default) |
| `DATABASE_URL` | Recommended | PostgreSQL connection URL | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET` | Yes (in prod) | Minimum 32-character secret for signed session cookies | `random-secure-hex-string-at-least-32` |
| `CORS_ORIGINS` | Yes | Comma-separated list of allowed browser origins | `https://gateway.vance.io,http://localhost:5173` |
| `PAYPAL_MODE` | No | PayPal execution mode (`sandbox` or `live`) | `sandbox` |
| `PAYPAL_CLIENT_ID` | Optional | PayPal developer app client ID | `A21a...` |
| `PAYPAL_CLIENT_SECRET` | Optional | PayPal developer app secret | `EL8b...` |
| `PAYPAL_WEBHOOK_ID` | Optional | PayPal webhook listener ID | `WH-348...` |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window in ms (default: 900000 = 15m) | `900000` |
| `RATE_LIMIT_MAX_REQUESTS`| No | Max standard requests per window | `300` |
| `AUTH_RATE_LIMIT_MAX` | No | Max authentication attempts per window | `20` |

---

## 5. Health Checks & Verification

### Operational Health Check
```bash
curl -I http://localhost:3001/api/health
```
Expect HTTP `200 OK` with JSON response indicating `status: "UP"` and `database.status: "CONNECTED"`.

### Cryptographic Ledger Verification
```bash
curl -s http://localhost:3001/api/security/verify-ledger
```
Expect HTTP `200 OK` with `valid: true`.

---

## 6. Production Security Checklist
- [x] Set strong `SESSION_SECRET` (at least 32 characters of high-entropy random data).
- [x] Set explicit `CORS_ORIGINS` to prevent unauthorized cross-origin requests.
- [x] Enable SSL (`sslmode=require`) on external PostgreSQL connections.
- [x] Ensure rate limiters are active to mitigate credential-stuffing and denial-of-service attempts.
- [x] Verify that `dist/` is pre-built so the Express backend can serve both the API and client SPA under a single domain.

