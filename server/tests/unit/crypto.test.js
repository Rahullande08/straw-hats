import assert from 'node:assert';
import { hashPassword, comparePassword, generateSecureToken, hashToken, computeAuditEventHash, canonicalJsonStringify } from '../../utils/crypto.js';

console.log('--- Running Crypto & Security Unit Tests ---');

let passed = 0;
let total = 0;

async function it(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

async function run() {
  await it('Hashes passwords securely with bcrypt and verifies matches', async () => {
    const raw = 'sovereign-vault-passphrase-2026';
    const hash = await hashPassword(raw);
    assert.ok(hash.startsWith('$2b$10$'), 'bcrypt hash format verified');
    const isMatch = await comparePassword(raw, hash);
    assert.strictEqual(isMatch, true);
    const isWrong = await comparePassword('wrong-password', hash);
    assert.strictEqual(isWrong, false);
  });

  await it('Generates high-entropy random tokens and SHA-256 digests', () => {
    const token1 = generateSecureToken(32);
    const token2 = generateSecureToken(32);
    assert.notStrictEqual(token1, token2);
    assert.strictEqual(token1.length, 64); // 32 bytes in hex

    const hash1 = hashToken(token1);
    const hash2 = hashToken(token1);
    assert.strictEqual(hash1, hash2, 'SHA-256 hash is deterministic');
    assert.strictEqual(hash1.length, 64);
  });

  await it('Guarantees deterministic canonical JSON serialization', () => {
    const objA = { z: 1, a: 2, m: { b: 3, a: 4 } };
    const objB = { a: 2, m: { a: 4, b: 3 }, z: 1 };
    assert.strictEqual(canonicalJsonStringify(objA), canonicalJsonStringify(objB));
  });

  await it('Generates hash-linked audit ledger records', () => {
    const prevHash = 'GENESIS_HASH_00000000000000000000';
    const event1Hash = computeAuditEventHash({
      previousHash: prevHash,
      eventType: 'MANDATE_CREATED',
      actorId: 'usr_elena_vance',
      entityId: 'M-902',
      action: 'CREATE',
      outcome: 'SUCCESS',
      metadataJson: { budget: 50000 },
      createdAt: '2026-10-24T12:00:00.000Z'
    });

    assert.ok(event1Hash.startsWith('sha256:'));

    const event2Hash = computeAuditEventHash({
      previousHash: event1Hash,
      eventType: 'PURCHASE_APPROVED',
      actorId: 'usr_elena_vance',
      entityId: 'PR-1082',
      action: 'APPROVE',
      outcome: 'SUCCESS',
      metadataJson: { amount: 8495 },
      createdAt: '2026-10-24T12:05:00.000Z'
    });

    assert.ok(event2Hash.startsWith('sha256:'));
    assert.notStrictEqual(event1Hash, event2Hash);
  });

  console.log(`\nCrypto Unit Tests: ${passed} / ${total} passed.\n`);
  if (passed !== total) process.exit(1);
}

run();

