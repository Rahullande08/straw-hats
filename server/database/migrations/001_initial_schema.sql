-- ====================================================================
-- MANDATE GATEWAY — PostgreSQL Schema Migration 001
-- Description: Normalized tables, foreign keys, indexes, minor currency
-- ====================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  avatar TEXT,
  terminal_version VARCHAR(100) DEFAULT 'Node v2.4 Live',
  compliance VARCHAR(100) DEFAULT 'PCI-DSS 4.0 Attested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(session_token_hash);

-- 3. Merchants Table
CREATE TABLE IF NOT EXISTS merchants (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  canonical_domain VARCHAR(255) UNIQUE NOT NULL,
  verification_status VARCHAR(50) NOT NULL DEFAULT 'VERIFIED',
  reputation_score INT DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_merchants_domain ON merchants(canonical_domain);

-- 4. Mandates Table
CREATE TABLE IF NOT EXISTS mandates (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  budget_ceiling BIGINT NOT NULL,          -- In minor currency units (paise/cents)
  utilized_amount BIGINT NOT NULL DEFAULT 0, -- In minor currency units
  reserved_amount BIGINT NOT NULL DEFAULT 0, -- In minor currency units
  single_purchase_limit BIGINT NOT NULL,   -- In minor currency units
  human_approval_threshold BIGINT NOT NULL, -- In minor currency units
  cosigner_threshold BIGINT NOT NULL,       -- In minor currency units
  plain_text_rule TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, REVOKED, EXPIRED
  agents JSONB DEFAULT '[]'::jsonb,
  start_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mandates_user_id ON mandates(user_id);
CREATE INDEX IF NOT EXISTS idx_mandates_status ON mandates(status);

-- 5. Mandate Merchants Join Table
CREATE TABLE IF NOT EXISTS mandate_merchants (
  id VARCHAR(64) PRIMARY KEY,
  mandate_id VARCHAR(64) NOT NULL REFERENCES mandates(id) ON DELETE CASCADE,
  merchant_id VARCHAR(64) REFERENCES merchants(id) ON DELETE SET NULL,
  merchant_name VARCHAR(255) NOT NULL,
  merchant_domain VARCHAR(255),
  rule_type VARCHAR(20) NOT NULL DEFAULT 'ALLOWED', -- 'ALLOWED' | 'BLOCKED'
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mandate_merchants_mandate_id ON mandate_merchants(mandate_id);

-- 6. Agent Passports Table
CREATE TABLE IF NOT EXISTS agent_passports (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_name VARCHAR(255) NOT NULL,
  agent_identifier VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  token_prefix VARCHAR(32) NOT NULL,
  public_key VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, REVOKED, EXPIRED
  spending_limit BIGINT NOT NULL,              -- minor units
  orders_completed INT NOT NULL DEFAULT 0,
  disputes INT NOT NULL DEFAULT 0,
  enclave_attestation VARCHAR(255) DEFAULT 'Software Audit Key (SHA-256 Validated)',
  allowed_categories JSONB DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_passports_user_id ON agent_passports(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_passports_token_hash ON agent_passports(token_hash);

-- 7. Purchase Requests Table
CREATE TABLE IF NOT EXISTS purchase_requests (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mandate_id VARCHAR(64) NOT NULL REFERENCES mandates(id) ON DELETE RESTRICT,
  agent_passport_id VARCHAR(64) REFERENCES agent_passports(id) ON DELETE SET NULL,
  agent_name VARCHAR(255) NOT NULL,
  product_title VARCHAR(500) NOT NULL,
  merchant_id VARCHAR(64) REFERENCES merchants(id) ON DELETE SET NULL,
  merchant_name VARCHAR(255) NOT NULL,
  product_url TEXT,
  amount_minor BIGINT NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  category VARCHAR(100),
  policy_verdict VARCHAR(50) NOT NULL, -- ALLOW, REQUIRES_APPROVAL, BLOCK, ERROR
  status VARCHAR(50) NOT NULL,         -- PENDING_POLICY, PENDING_HITL, PENDING_COSIGNER, AUTO_CLEARED, APPROVED, PAYMENT_PENDING, COMPLETED, BLOCKED, REJECTED, CANCELLED, FAILED, EXPIRED
  decision_type VARCHAR(100),
  decision_reason TEXT,
  idempotency_key VARCHAR(255) UNIQUE,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_user_id ON purchase_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_mandate_id ON purchase_requests(mandate_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);

-- 8. Purchase Evidence Table
CREATE TABLE IF NOT EXISTS purchase_evidence (
  id VARCHAR(64) PRIMARY KEY,
  purchase_request_id VARCHAR(64) NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  expected_value TEXT,
  observed_value TEXT,
  exact_quote TEXT,
  evidence_source VARCHAR(255),
  verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_evidence_request_id ON purchase_evidence(purchase_request_id);

-- 9. Approvals Table
CREATE TABLE IF NOT EXISTS approvals (
  id VARCHAR(64) PRIMARY KEY,
  purchase_request_id VARCHAR(64) NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  approver_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approval_type VARCHAR(50) NOT NULL DEFAULT 'HITL', -- HITL | COSIGNER
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',      -- PENDING, APPROVED, REJECTED, EXPIRED
  token_hash VARCHAR(255) UNIQUE,
  expires_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approvals_request_id ON approvals(purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_approvals_token_hash ON approvals(token_hash);

-- 10. Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'PAYPAL_SANDBOX', -- PAYPAL_SANDBOX | VIRTUAL_CARD
  name VARCHAR(255) NOT NULL,
  identifier VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'paypal',
  provider_reference VARCHAR(255),
  auto_approve_cap_minor BIGINT DEFAULT 300000,
  spending_limit_minor BIGINT DEFAULT 2500000,
  spent_minor BIGINT DEFAULT 0,
  balance TEXT,
  exp_date VARCHAR(20),
  issuer VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'CONNECTED',
  frozen BOOLEAN NOT NULL DEFAULT false,
  sandbox_mode BOOLEAN NOT NULL DEFAULT true,
  webhook_status VARCHAR(100) DEFAULT 'ACTIVE (Listener verified)',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);

-- 11. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  purchase_request_id VARCHAR(64) NOT NULL REFERENCES purchase_requests(id) ON DELETE RESTRICT,
  payment_method_id VARCHAR(64) REFERENCES payment_methods(id) ON DELETE SET NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'paypal',
  provider_order_id VARCHAR(255),
  provider_capture_id VARCHAR(255),
  amount_minor BIGINT NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(50) NOT NULL, -- NOT_CONFIGURED, SANDBOX_CONFIGURED, CREATING_ORDER, AWAITING_APPROVAL, PAYMENT_PENDING, COMPLETED, FAILED_OR_CANCELLED
  single_use_token_hash VARCHAR(255),
  idempotency_key VARCHAR(255) UNIQUE,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_request_id ON payments(purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(provider_order_id);

-- 12. Audit Logs Table (Hash-Linked Ledger)
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  actor_type VARCHAR(50) NOT NULL, -- USER | AGENT | GATEWAY
  actor_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  action VARCHAR(255) NOT NULL,
  outcome VARCHAR(50) NOT NULL,   -- SUCCESS | BLOCKED | FAILED | ESCALATED
  summary TEXT NOT NULL,
  amount TEXT,
  meta TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  previous_hash VARCHAR(255) NOT NULL,
  event_hash VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_hash ON audit_logs(event_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 13. Agent Security Events Table
CREATE TABLE IF NOT EXISTS agent_security_events (
  id VARCHAR(64) PRIMARY KEY,
  agent_passport_id VARCHAR(64) REFERENCES agent_passports(id) ON DELETE SET NULL,
  attack_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  blocked BOOLEAN NOT NULL DEFAULT true,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_events_attack_type ON agent_security_events(attack_type);

-- 14. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_user_setting UNIQUE(user_id, setting_key)
);
