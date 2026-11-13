import { spawn } from 'child_process';

console.log('🚀 Starting Mandate Gateway Full-Stack Development Environment...\n');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// 1. Start Backend Server
const backend = spawn(npmCmd, ['run', 'dev:backend'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: process.env.PORT || '3001' }
});

// 2. Start Vite Frontend Dev Server
const frontend = spawn(npmCmd, ['run', 'dev:frontend'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

function cleanup() {
  console.log('\n🛑 Shutting down full-stack processes...');
  try {
    if (backend && !backend.killed) backend.kill('SIGINT');
    if (frontend && !frontend.killed) frontend.kill('SIGINT');
  } catch {
    // Ignore shutdown race conditions
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

