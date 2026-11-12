import assert from 'node:assert';
import { toMinorUnits, fromMinorUnits, formatCurrency, getCurrencyFactor } from '../../utils/money.js';

console.log('--- Running Minor Currency Unit Tests ---');

let passed = 0;
let total = 0;

function it(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

it('Calculates correct currency factors', () => {
  assert.strictEqual(getCurrencyFactor('INR'), 100);
  assert.strictEqual(getCurrencyFactor('USD'), 100);
  assert.strictEqual(getCurrencyFactor('EUR'), 100);
  assert.strictEqual(getCurrencyFactor('JPY'), 1);
});

it('Converts major currency amounts to integer minor units without floating-point artifacts', () => {
  assert.strictEqual(toMinorUnits(5000, 'INR'), 500000);
  assert.strictEqual(toMinorUnits(19.99, 'USD'), 1999);
  assert.strictEqual(toMinorUnits(0.01, 'USD'), 1);
  assert.strictEqual(toMinorUnits('4200', 'INR'), 420000);
  assert.strictEqual(toMinorUnits(1500, 'JPY'), 1500);
});

it('Converts integer minor units back to major amounts', () => {
  assert.strictEqual(fromMinorUnits(500000, 'INR'), 5000);
  assert.strictEqual(fromMinorUnits(1999, 'USD'), 19.99);
  assert.strictEqual(fromMinorUnits(1, 'USD'), 0.01);
  assert.strictEqual(fromMinorUnits(0, 'INR'), 0);
});

it('Avoids floating-point precision loss on repeated addition', () => {
  // In standard float math: 0.1 + 0.2 = 0.30000000000000004
  const tenCents = toMinorUnits(0.1, 'USD');  // 10
  const twentyCents = toMinorUnits(0.2, 'USD'); // 20
  const totalMinor = tenCents + twentyCents;   // 30
  assert.strictEqual(totalMinor, 30);
  assert.strictEqual(fromMinorUnits(totalMinor, 'USD'), 0.3);
});

it('Formats currency strings properly', () => {
  assert.strictEqual(formatCurrency(500000, 'INR'), '₹5,000');
  assert.strictEqual(formatCurrency(1999, 'USD'), '$19.99');
});

console.log(`\nMoney Unit Tests: ${passed} / ${total} passed.\n`);
if (passed !== total) process.exit(1);

