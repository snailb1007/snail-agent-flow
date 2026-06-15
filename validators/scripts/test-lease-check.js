const fs = require('fs');
const path = require('path');
const os = require('os');
const { LeaseManager } = require('../../lib/lease-manager');

let passed = 0;
let failed = 0;

function assertTest(condition, message) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'adp-lease-check-'));
}

console.log('--- LeaseManager Inspect & --check Tests ---');

// Test 1: inspect on non-leased file
{
  const tempDir = createTempDir();
  try {
    const leaseManager = new LeaseManager(tempDir);
    const file = path.join(tempDir, 'non-leased.txt');

    const status = leaseManager.inspect(file);
    assertTest(status.held === false, 'inspect on non-leased file returns held=false');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Test 2: inspect on active lease
{
  const tempDir = createTempDir();
  try {
    const leaseManager = new LeaseManager(tempDir);
    const file = path.join(tempDir, 'leased.txt');
    const owner = 'agent-alice';
    const purpose = 'Writing plan';

    leaseManager.acquire(file, { owner, purpose });

    const status = leaseManager.inspect(file);
    assertTest(status.held === true, 'inspect on active leased file returns held=true');
    assertTest(status.owner === owner, `inspect returns correct owner "${owner}"`);
    assertTest(status.purpose === purpose, `inspect returns correct purpose "${purpose}"`);
    assertTest(status.pid === process.pid, 'inspect returns correct pid');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Test 3: inspect on stale lease
{
  const tempDir = createTempDir();
  try {
    const leaseManager = new LeaseManager(tempDir);
    const file = path.join(tempDir, 'stale-leased.txt');

    leaseManager.acquire(file, { owner: 'agent-alice', stale_lock_cap_seconds: -10 });

    const status = leaseManager.inspect(file);
    assertTest(status.held === false, 'inspect on stale lease returns held=false');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

console.log(`\nLeaseManager inspect tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
