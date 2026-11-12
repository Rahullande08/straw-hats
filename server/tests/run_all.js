import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFiles = [
  path.join(__dirname, 'unit/policyEngine.test.js'),
  path.join(__dirname, 'unit/money.test.js'),
  path.join(__dirname, 'unit/crypto.test.js'),
  path.join(__dirname, 'integration/concurrency.test.js')
];

async function run() {
  console.log('🚀 Executing Mandate Gateway Backend Test Suite...\n');

  for (const file of testFiles) {
    const code = await new Promise((resolve) => {
      const p = spawn(process.execPath, [file], { stdio: 'inherit' });
      p.on('close', resolve);
    });

    if (code !== 0) {
      console.error(`\n❌ Test file failed with code ${code}: ${path.basename(file)}`);
      process.exit(code);
    }
  }

  console.log('🏁 All Backend Unit, Security & Concurrency Tests Passed!\n');
}

run();
