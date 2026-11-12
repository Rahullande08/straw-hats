-- ====================================================================
-- MANDATE GATEWAY — Seed Script 001: Demo Data Baseline
-- ====================================================================

-- 1. Users: Elena Vance Sovereign Demo Account
INSERT INTO users (id, name, email, password_hash, role, avatar, terminal_version, compliance)
VALUES (
  'usr_elena_vance',
  'Elena Vance',
  'elena.vance@sovereign-vault.internal',
  '$2b$10$cHinVmXzic0.YAIVRl0ukeyHp5HNqNQ/3Qu3dHMM4A1LNa/rXZEuq', -- 'sovereign-passphrase-vault'
  'Sovereign Account',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD2D3f8-QvkKo7Iep79rwSRjqJSxlO1LNDFKOeQWUFCr2X0OcRZKqHzk3eutzQTCES5Fg0_FRJBYKHObO5NAT5D_0RSxNR71xMq8_Y2AMHIbV6b9dXMb3LSv2sKjoM2T5CkSfz1DCVRccy77T8Smg6vzxMkKM9qxEX5GPor0vGul7__cKEKdJNrFR4Wyig0VbRRc4h1deGJ_keampTAhyAKvCpYZB75WJZlI2lP0qHIcYtSQIyAiTXdww',
  'Node v2.4 Live',
  'PCI-DSS 4.0 Attested'
) ON CONFLICT (id) DO NOTHING;

-- 2. Verified & Unverified Merchants
INSERT INTO merchants (id, name, canonical_domain, verification_status, reputation_score) VALUES
  ('merch_amz_in', 'Amazon India', 'amazon.in', 'VERIFIED', 98),
  ('merch_croma', 'Croma Retail', 'croma.com', 'VERIFIED', 95),
  ('merch_logitech', 'Logitech Official', 'logitech.com', 'VERIFIED', 96),
  ('merch_lenovo', 'Lenovo Direct', 'lenovo.com', 'VERIFIED', 94),
  ('merch_apple', 'Apple India Official', 'apple.com', 'VERIFIED', 99),
  ('merch_dell', 'Dell Direct', 'dell.com', 'VERIFIED', 95),
  ('merch_github', 'GitHub', 'github.com', 'VERIFIED', 99),
  ('merch_aws', 'AWS', 'aws.amazon.com', 'VERIFIED', 99),
  ('merch_do', 'DigitalOcean', 'digitalocean.com', 'VERIFIED', 97),
  ('merch_cloudflare', 'Cloudflare', 'cloudflare.com', 'VERIFIED', 99),
  ('merch_bookswagon', 'Bookswagon', 'bookswagon.com', 'VERIFIED', 90),
  ('merch_acm', 'ACM Digital Library', 'dl.acm.org', 'VERIFIED', 98),
  ('merch_mmt', 'MakeMyTrip', 'makemytrip.com', 'VERIFIED', 92),
  ('merch_uber', 'Uber', 'uber.com', 'VERIFIED', 95),
  ('merch_irctc', 'IRCTC', 'irctc.co.in', 'VERIFIED', 94),
  ('merch_ebay_untrusted', 'eBay Global Store', 'ebay.com', 'BLOCKED', 20),
  ('merch_techbazaar', 'TechBazaar.in', 'techbazaar.in', 'BLOCKED', 15),
  ('merch_typosquat', 'Amazon Lookalike Phish', 'amzon-india-secure.co', 'BLOCKED', 0)
ON CONFLICT (id) DO NOTHING;

-- 3. Mandates (minor units: e.g. 50,000 INR = 5,000,000 paise)
INSERT INTO mandates (
  id, user_id, name, description, category, currency,
  budget_ceiling, utilized_amount, reserved_amount, single_purchase_limit, human_approval_threshold, cosigner_threshold,
  plain_text_rule, status, agents, expires_at
) VALUES
  (
    'M-902',
    'usr_elena_vance',
    'Office Hardware Q4',
    'Quarterly workstation hardware refresh and peripheral procurement',
    'Hardware & Peripherals',
    'INR',
    5000000, -- 50,000 INR
    1820000, -- 18,200 INR
    0,
    500000,  -- 5,000 INR
    500000,  -- 5,000 INR
    800000,  -- 8,000 INR
    'Buy approved office peripherals on Amazon India and Croma. Cap single transactions at ₹5,000. Require manual sign-off above ₹5,000.',
    'ACTIVE',
    '["Claude Shopping", "Claude Shopping v3.5"]'::jsonb,
    '2026-12-31T23:59:59Z'
  ),
  (
    'M-844',
    'usr_elena_vance',
    'DevOps & Infrastructure SaaS',
    'Automated CI runners, container hosting, and DNS billings',
    'Cloud & Infrastructure',
    'INR',
    1200000, -- 12,000 INR
    945000,  -- 9,450 INR
    0,
    300000,  -- 3,000 INR
    300000,  -- 3,000 INR
    600000,  -- 6,000 INR
    'Allow automated CI runners, container hosting, and DNS billings up to ₹12,000/mo. Block unapproved domain registrars.',
    'ACTIVE',
    '["AutoProcure", "AutoProcure Daemon"]'::jsonb,
    '2026-11-30T23:59:59Z'
  ),
  (
    'M-719',
    'usr_elena_vance',
    'Research & Reference Materials',
    'Technical books and digital publications',
    'Books & Subscriptions',
    'INR',
    550000,  -- 5,500 INR
    185000,  -- 1,850 INR
    0,
    200000,  -- 2,000 INR
    200000,  -- 2,000 INR
    350000,  -- 3,500 INR
    'Permit technical books and research papers from trusted merchants under ₹2,000 per volume.',
    'ACTIVE',
    '["Perplexity Buy", "Perplexity Buy v1.2"]'::jsonb,
    '2026-12-15T23:59:59Z'
  ),
  (
    'M-603',
    'usr_elena_vance',
    'Travel & Mobility Logistics',
    'Ground transport and railway tickets',
    'Transportation',
    'INR',
    1500000, -- 15,000 INR
    420000,  -- 4,200 INR
    0,
    300000,  -- 3,000 INR
    300000,  -- 3,000 INR
    500000,  -- 5,000 INR
    'Inter-city travel booking and airport taxi rides during active team trips only.',
    'ACTIVE',
    '["AutoProcure"]'::jsonb,
    '2026-11-15T23:59:59Z'
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Mandate Merchants Join
INSERT INTO mandate_merchants (id, mandate_id, merchant_id, merchant_name, merchant_domain, rule_type) VALUES
  ('mm_902_1', 'M-902', 'merch_amz_in', 'Amazon India', 'amazon.in', 'ALLOWED'),
  ('mm_902_2', 'M-902', 'merch_croma', 'Croma Retail', 'croma.com', 'ALLOWED'),
  ('mm_902_3', 'M-902', 'merch_logitech', 'Logitech Official', 'logitech.com', 'ALLOWED'),
  ('mm_902_4', 'M-902', 'merch_lenovo', 'Lenovo Direct', 'lenovo.com', 'ALLOWED'),
  ('mm_902_5', 'M-902', 'merch_apple', 'Apple India Official', 'apple.com', 'ALLOWED'),
  ('mm_902_6', 'M-902', 'merch_dell', 'Dell Direct', 'dell.com', 'ALLOWED'),
  ('mm_844_1', 'M-844', 'merch_github', 'GitHub', 'github.com', 'ALLOWED'),
  ('mm_844_2', 'M-844', 'merch_aws', 'AWS', 'aws.amazon.com', 'ALLOWED'),
  ('mm_844_3', 'M-844', 'merch_do', 'DigitalOcean', 'digitalocean.com', 'ALLOWED'),
  ('mm_844_4', 'M-844', 'merch_cloudflare', 'Cloudflare', 'cloudflare.com', 'ALLOWED'),
  ('mm_719_1', 'M-719', 'merch_amz_in', 'Amazon India', 'amazon.in', 'ALLOWED'),
  ('mm_719_2', 'M-719', 'merch_bookswagon', 'Bookswagon', 'bookswagon.com', 'ALLOWED'),
  ('mm_719_3', 'M-719', 'merch_acm', 'ACM Digital Library', 'dl.acm.org', 'ALLOWED'),
  ('mm_603_1', 'M-603', 'merch_mmt', 'MakeMyTrip', 'makemytrip.com', 'ALLOWED'),
  ('mm_603_2', 'M-603', 'merch_uber', 'Uber', 'uber.com', 'ALLOWED'),
  ('mm_603_3', 'M-603', 'merch_irctc', 'IRCTC', 'irctc.co.in', 'ALLOWED')
ON CONFLICT (id) DO NOTHING;

-- 5. Agent Passports
INSERT INTO agent_passports (
  id, user_id, agent_name, agent_identifier, token_hash, token_prefix, public_key,
  status, spending_limit, orders_completed, disputes, enclave_attestation, allowed_categories
) VALUES
  (
    'pass_claude_shop',
    'usr_elena_vance',
    'Claude Shopping',
    'agent.anthropic.claude-3-5.shop-v1',
    'e4eba69d9a79aaf3d0922b0688e7404a56fda26b1bdd0eeb4bf059ffbe60138c',
    '0x9A...3B81',
    'ed25519:MC4CAQAwBQYDK2VwBCIEIH188a109bf004123b81ef1088c42109e2fa90a1bc334188',
    'ACTIVE',
    2500000, -- 25,000 INR
    18,
    0,
    'Software Cryptographic Token (SHA-256 Validated)',
    '["Hardware & Peripherals", "Research & Reference Materials"]'::jsonb
  ),
  (
    'pass_perplexity_buy',
    'usr_elena_vance',
    'Perplexity Buy',
    'agent.perplexity.sonar.procure-v2',
    '62588b5c0c4733ceb90635c001da559bad4a2fbe689a39abb38d3f16272f7362',
    '0x4C...1D29',
    'ed25519:MC4CAQAwBQYDK2VwBCIEIN941b20f8b77a012911d29fa8e990b7145e12089ca2001',
    'ACTIVE',
    550000, -- 5,500 INR
    7,
    0,
    'Software Cryptographic Token (SHA-256 Validated)',
    '["Books & Subscriptions"]'::jsonb
  ),
  (
    'pass_autoprocure',
    'usr_elena_vance',
    'AutoProcure',
    'agent.langchain.autoprocure.saas-v4',
    'e9ee78c8b70b968429075bf8e4c2096cbc43aa8e99f8c0f5c53d93462240c729',
    '0x7E...88F0',
    'ed25519:MC4CAQAwBQYDK2VwBCIEIZ7921acb6188f001294821cc0911094ba76192a001889',
    'ACTIVE',
    1200000, -- 12,000 INR
    12,
    0,
    'Software Cryptographic Token (SHA-256 Validated)',
    '["Cloud & Infrastructure", "Transportation"]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Payment Methods
INSERT INTO payment_methods (
  id, user_id, type, name, identifier, provider, provider_reference,
  auto_approve_cap_minor, spending_limit_minor, spent_minor, balance, status, frozen, sandbox_mode
) VALUES
  (
    'pm_paypal_sandbox',
    'usr_elena_vance',
    'PAYPAL_SANDBOX',
    'PayPal Sandbox Business Account',
    'sb-merchant-gateway@business.example.com',
    'paypal',
    'BAAv8820199XJ',
    300000,  -- 3,000 INR
    5000000, -- 50,000 INR
    0,
    '$4,850.00 USD (Sandbox)',
    'CONNECTED',
    false,
    true
  ),
  (
    'pm_vcard_primary',
    'usr_elena_vance',
    'VIRTUAL_CARD',
    'Single-Use Ephemeral Visa #1',
    '•••• 4019',
    'internal_card',
    'card_ref_4019',
    500000,  -- 5,000 INR
    2500000, -- 25,000 INR
    1820000, -- 18,200 INR
    NULL,
    'ACTIVE',
    false,
    true
  ),
  (
    'pm_vcard_saas',
    'usr_elena_vance',
    'VIRTUAL_CARD',
    'Cloud Infrastructure Card #2',
    '•••• 8820',
    'internal_card',
    'card_ref_8820',
    300000,  -- 3,000 INR
    1200000, -- 12,000 INR
    945000,  -- 9,450 INR
    NULL,
    'ACTIVE',
    false,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- 7. Purchase Requests
INSERT INTO purchase_requests (
  id, user_id, mandate_id, agent_passport_id, agent_name, product_title,
  merchant_id, merchant_name, product_url, amount_minor, currency, category,
  policy_verdict, status, decision_type, decision_reason
) VALUES
  (
    'PR-1082',
    'usr_elena_vance',
    'M-902',
    'pass_claude_shop',
    'Claude Shopping',
    'Logitech MX Master 3S Wireless Mouse',
    'merch_amz_in',
    'Amazon India',
    'https://amazon.in/dp/B0B11D7T9M',
    849500, -- 8,495 INR
    'INR',
    'Hardware & Peripherals',
    'REQUIRES_APPROVAL',
    'PENDING_HITL',
    'HITL_ESCALATION',
    'High-Value Ceiling Trigger: Peripheral ceiling is ₹5,000. Request exceeds single-item ceiling by ₹3,495.'
  ),
  (
    'PR-1081',
    'usr_elena_vance',
    'M-902',
    'pass_perplexity_buy',
    'Perplexity Buy',
    'Ergonomic Mechanical Keyboard (Hot-swappable)',
    'merch_croma',
    'Croma Retail',
    'https://croma.com/keyboards/ergonomic-hot-swap',
    420000, -- 4,200 INR
    'INR',
    'Hardware & Peripherals',
    'REQUIRES_APPROVAL',
    'PENDING_HITL',
    'HITL_ESCALATION',
    'First-time Merchant Node Check: Croma Retail domain certificate verified. Requires one-touch authorization.'
  ),
  (
    'PR-1079',
    'usr_elena_vance',
    'M-902',
    'pass_claude_shop',
    'Claude Shopping',
    'Dell UltraSharp 4K DisplayPort Cable',
    'merch_amz_in',
    'Amazon India',
    'https://amazon.in/dp/B08XDP4K9',
    129900, -- 1,299 INR
    'INR',
    'Hardware & Peripherals',
    'ALLOW',
    'AUTO_CLEARED',
    'AUTO_CLEARANCE',
    'Deterministic Clearance: Under ₹5,000 ceiling, approved merchant, all quote requirements verified.'
  ),
  (
    'PR-1075',
    'usr_elena_vance',
    'M-844',
    'pass_autoprocure',
    'AutoProcure',
    'Refurbished Server Rack Mount',
    'merch_ebay_untrusted',
    'eBay Global Store',
    'https://ebay.com/itm/server-mount-refurb',
    1299000, -- 12,990 INR
    'INR',
    'Cloud & Infrastructure',
    'BLOCK',
    'BLOCKED',
    'DETERMINISTIC_BLOCK',
    'Deterministic Invariance Violation: eBay Global is NOT in allowed merchants list. Category mismatch for Hardware under SaaS mandate.'
  )
ON CONFLICT (id) DO NOTHING;

-- 8. Purchase Evidence
INSERT INTO purchase_evidence (id, purchase_request_id, field_name, expected_value, observed_value, exact_quote, evidence_source, verified) VALUES
  ('evi_1082_1', 'PR-1082', 'Product Name', 'Logitech MX Master 3S Wireless Performance Mouse', 'Match confirmed', '"Logitech MX Master 3S Wireless Performance Mouse - Pale Grey, 8K DPI"', 'Listing Scraping', true),
  ('evi_1082_2', 'PR-1082', 'Connection', 'Bluetooth & Logi Bolt Wireless', 'Match confirmed', '"Connect via Bluetooth Low Energy or Logi Bolt USB Receiver"', 'Technical Specs', true),
  ('evi_1082_3', 'PR-1082', 'Side Buttons', 'Yes', 'Match confirmed', '"Customizable thumb wheel, side forward/back buttons"', 'Feature List', true),
  ('evi_1082_4', 'PR-1082', 'Price Cap', 'Under ₹5,000 cap', '₹8,495 (Breaches cap)', '"M.R.P.: ₹10,995. Deal Price: ₹8,495 incl. taxes"', 'Buybox', false),
  ('evi_1081_1', 'PR-1081', 'Product Name', 'Keychron K2 V2 Hot-swappable Mechanical Keyboard', 'Match confirmed', '"Keychron K2 Wireless Hot-swappable Mechanical Keyboard with Gateron Brown"', 'Listing Scraping', true),
  ('evi_1081_2', 'PR-1081', 'Price', '₹4,200', 'Match confirmed', '"Special Online Price: ₹4,200 (Inclusive of all taxes)"', 'Buybox', true),
  ('evi_1081_3', 'PR-1081', 'Condition', 'Brand New', 'Match confirmed', '"Brand New with 1 Year Manufacturer Warranty"', 'Item Condition', true),
  ('evi_1079_1', 'PR-1079', 'Product Name', 'Dell UltraSharp DisplayPort 1.4 Cable', 'Match confirmed', '"Dell Certified UltraSharp 4K DisplayPort Cable 2M"', 'Amazon Prime', true),
  ('evi_1079_2', 'PR-1079', 'Price', '₹1,299', 'Match confirmed', '"Deal Price ₹1,299"', 'Amazon Buybox', true)
ON CONFLICT (id) DO NOTHING;

-- 9. Payments
INSERT INTO payments (
  id, purchase_request_id, payment_method_id, provider, provider_order_id, provider_capture_id,
  amount_minor, currency, status, idempotency_key
) VALUES
  (
    'pay_pr1079',
    'PR-1079',
    'pm_paypal_sandbox',
    'paypal',
    'PP-ORD-662910',
    'CAP-990184719',
    129900,
    'INR',
    'COMPLETED',
    'idemp_pr1079_completed'
  ),
  (
    'pay_pr1082',
    'PR-1082',
    'pm_paypal_sandbox',
    'paypal',
    'MOCK-PP-ORD-889104',
    NULL,
    849500,
    'INR',
    'AWAITING_APPROVAL',
    'idemp_pr1082_pending'
  ),
  (
    'pay_pr1081',
    'PR-1081',
    'pm_paypal_sandbox',
    'paypal',
    'MOCK-PP-ORD-771923',
    NULL,
    420000,
    'INR',
    'AWAITING_APPROVAL',
    'idemp_pr1081_pending'
  )
ON CONFLICT (id) DO NOTHING;

-- 10. Audit Logs (with deterministic SHA-256 hash-chain)
INSERT INTO audit_logs (
  id, user_id, actor_type, actor_id, event_type, entity_type, entity_id,
  action, outcome, summary, amount, meta, metadata_json, previous_hash, event_hash, created_at
) VALUES
  (
    'evt_99168',
    'usr_elena_vance',
    'GATEWAY',
    'gateway_daemon',
    'SHIELD_ROTATION',
    'system_token',
    'token_cluster_01',
    'CYCLE_KEYS',
    'SUCCESS',
    'Deterministic gateway keys renewed. Ephemeral sub-agent tokens cycled.',
    '3 Active Tokens',
    'Next cycle scheduled in 24 hours',
    '{"attestation":"PASSED","enclave":"Software Cryptographic Token (SHA-256 Validated)"}'::jsonb,
    'GENESIS_HASH_00000000000000000000',
    'sha256:2aea6aab815907d97bac1656a38113e5ca2110bea473f7b3558dd2e4e664e8d7',
    '2026-10-24T12:00:00.000Z'
  ),
  (
    'evt_99175',
    'usr_elena_vance',
    'USER',
    'usr_elena_vance',
    'CEILING_MODIFIED',
    'mandate',
    'M-902',
    'UPDATE_CEILING',
    'SUCCESS',
    'Elena Vance increased Hardware quarterly quota from ₹20,000 to ₹25,000.',
    'Ceiling: ₹25,000',
    'Cryptographic signature confirmed',
    '{"mandate":"#M-902","newLimit":"₹25,000","previousLimit":"₹20,000"}'::jsonb,
    'sha256:2aea6aab815907d97bac1656a38113e5ca2110bea473f7b3558dd2e4e664e8d7',
    'sha256:03af06b8d6cc942e3f1526efd46d9295fd79f2208e4c784d75fc009939e28076',
    '2026-10-24T15:00:00.000Z'
  ),
  (
    'evt_99180',
    'usr_elena_vance',
    'AGENT',
    'pass_claude_shop',
    'AUTO_CLEARED',
    'purchase_request',
    'PR-1079',
    'SETTLE_PAYMENT',
    'SUCCESS',
    'Dell 4K DisplayPort Cable settled via Amazon India under Mandate #M-902.',
    '₹1,299',
    'Charged to Virtual Single-Use Card #VS-9014',
    '{"mandate":"#M-902","merchant":"Amazon India","orderId":"PP-ORD-662910"}'::jsonb,
    'sha256:03af06b8d6cc942e3f1526efd46d9295fd79f2208e4c784d75fc009939e28076',
    'sha256:c17079ddd83f224ae6e2a4e70cb37976a7a1402b99d086a7631afb81a6926347',
    '2026-10-24T18:30:05.000Z'
  ),
  (
    'evt_99182',
    'usr_elena_vance',
    'AGENT',
    'pass_autoprocure',
    'MERCHANT_BLOCKED',
    'purchase_request',
    'PR-1075',
    'POLICY_EVALUATION',
    'BLOCKED',
    'AutoProcure blocked attempting eBay Global (unapproved merchant).',
    '₹12,990',
    'Policy invariance zero-override rule triggered',
    '{"mandate":"#M-844","merchantAttempted":"ebay.com"}'::jsonb,
    'sha256:c17079ddd83f224ae6e2a4e70cb37976a7a1402b99d086a7631afb81a6926347',
    'sha256:8b9b22406672955512d8e3be1aef2d9450f7e2e575912891b785deba0ecff52e',
    '2026-10-24T21:40:00.000Z'
  )
ON CONFLICT (id) DO NOTHING;

-- 11. System Settings
INSERT INTO system_settings (id, user_id, setting_key, setting_value) VALUES
  ('sett_default_approve', 'usr_elena_vance', 'defaultAutoApproveLimit', '3000'::jsonb),
  ('sett_cosigner_thresh', 'usr_elena_vance', 'requireCoSignerThreshold', '8000'::jsonb),
  ('sett_hard_cap', 'usr_elena_vance', 'hardMandateCap', '150000'::jsonb),
  ('sett_auto_revoke', 'usr_elena_vance', 'autoRevokeOnAnomaly', 'true'::jsonb),
  ('sett_strict_quote', 'usr_elena_vance', 'strictQuoteVerification', 'true'::jsonb),
  ('sett_sandbox_mode', 'usr_elena_vance', 'paypalSandboxMode', 'true'::jsonb),
  ('sett_node_id', 'usr_elena_vance', 'networkNodeId', '"node-us-east-sgx-01"'::jsonb),
  ('sett_currency', 'usr_elena_vance', 'currency', '"INR"'::jsonb),
  ('sett_kill_switch', 'usr_elena_vance', 'emergencyKillSwitch', '{"active": false, "activatedAt": null, "activatedBy": null, "reason": null}'::jsonb)
ON CONFLICT (id) DO NOTHING;
