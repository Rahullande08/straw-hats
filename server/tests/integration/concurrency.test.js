import assert from 'node:assert';
import { initializeDatabase, runInTransaction } from '../../config/database.js';
import { mandateRepository } from '../../repositories/mandate.repository.js';
import { approvalService } from '../../services/approval.service.js';
import { killSwitchService } from '../../services/killSwitch.service.js';
import { auditService } from '../../services/audit.service.js';

console.log('--- Running Concurrency & Transaction Integrity Tests ---');

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
  await initializeDatabase();

  await it('Prevents budget race conditions with atomic database reservation', async () => {
    // Create test mandate with ceiling of 5,000 INR (500,000 paise)
    const testMandateId = `M-CONC-${Date.now()}`;
    await mandateRepository.create({
      id: testMandateId,
      userId: 'usr_elena_vance',
      name: 'Concurrency Test Mandate',
      category: 'Hardware & Peripherals',
      budgetCeiling: 500000, // 5,000 INR
      utilizedAmount: 0,
      reservedAmount: 0,
      singlePurchaseLimit: 500000,
      humanApprovalThreshold: 500000,
      cosignerThreshold: 500000,
      status: 'ACTIVE'
    });

    // Simulate two concurrent requests trying to reserve 3,000 INR (300,000 paise) each.
    // 3,000 + 3,000 = 6,000 > 5,000 ceiling.
    // EXACTLY ONE must succeed; the second MUST be rejected!
    const reserve1 = mandateRepository.reserveBudget(testMandateId, 300000);
    const reserve2 = mandateRepository.reserveBudget(testMandateId, 300000);

    const [res1, res2] = await Promise.all([reserve1, reserve2]);

    const successes = [res1, res2].filter(r => r !== null).length;
    assert.strictEqual(successes, 1, 'Exactly one concurrent reservation must succeed');

    const finalMandate = await mandateRepository.findById(testMandateId);
    assert.strictEqual(Number(finalMandate.reserved_amount), 300000);
    assert.ok(Number(finalMandate.reserved_amount) <= Number(finalMandate.budget_ceiling));
  });

  await it('Atomically releases budget reservation on rejection', async () => {
    const testMandateId = `M-REL-${Date.now()}`;
    await mandateRepository.create({
      id: testMandateId,
      userId: 'usr_elena_vance',
      name: 'Release Test Mandate',
      category: 'Hardware & Peripherals',
      budgetCeiling: 500000,
      utilizedAmount: 0,
      reservedAmount: 200000, // 2,000 INR reserved
      singlePurchaseLimit: 500000,
      humanApprovalThreshold: 500000,
      cosignerThreshold: 500000,
      status: 'ACTIVE'
    });

    await mandateRepository.releaseReservedBudget(testMandateId, 200000);
    const updated = await mandateRepository.findById(testMandateId);
    assert.strictEqual(Number(updated.reserved_amount), 0, 'Reserved budget hold successfully released');
  });

  await it('Atomically converts reserved budget into utilized budget on settlement', async () => {
    const testMandateId = `M-CONV-${Date.now()}`;
    await mandateRepository.create({
      id: testMandateId,
      userId: 'usr_elena_vance',
      name: 'Convert Test Mandate',
      category: 'Hardware & Peripherals',
      budgetCeiling: 500000,
      utilizedAmount: 100000,
      reservedAmount: 200000,
      singlePurchaseLimit: 500000,
      humanApprovalThreshold: 500000,
      cosignerThreshold: 500000,
      status: 'ACTIVE'
    });

    await mandateRepository.convertReservedToUtilized(testMandateId, 200000);
    const updated = await mandateRepository.findById(testMandateId);
    assert.strictEqual(Number(updated.reserved_amount), 0);
    assert.strictEqual(Number(updated.utilized_amount), 300000);
  });

  await it('Verifies tamper-evident audit ledger cryptographic chain integrity', async () => {
    const report = await auditService.verifyChainIntegrity();
    assert.strictEqual(report.valid, true, 'Audit hash chain is unbroken');
    assert.ok(report.totalVerified > 0);
  });

  console.log(`\nConcurrency & Transaction Tests: ${passed} / ${total} passed.\n`);
  if (passed !== total) process.exit(1);
}

run();

