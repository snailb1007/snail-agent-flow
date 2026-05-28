const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { LeaseManager } = require('../../lib/lease-manager');

let passed = 0;
let failed = 0;

function assertTest(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'adp-lease-manager-'));
}

console.log('--- LeaseManager Tests ---');

// Test 1: Round-trip acquire -> throw -> release -> acquire
{
  const tempDir = createTempDir();
  try {
    const leaseManager = new LeaseManager(tempDir);
    const file = path.join(tempDir, 'dummy-file.txt');
    const ownerA = 'agent-alice';
    const ownerB = 'agent-bob';

    // First acquire succeeds
    const acquiredA = leaseManager.acquire(file, { owner: ownerA, purpose: 'Writing spec' });
    assertTest(acquiredA === true, 'Alice acquires lease successfully');

    // Second acquire on same file throws LOCK_UNAVAILABLE
    let threw = false;
    try {
      leaseManager.acquire(file, { owner: ownerB, purpose: 'Writing plan' });
    } catch (e) {
      threw = true;
      assertTest(e.code === 'LOCK_UNAVAILABLE', 'Bob blocked with LOCK_UNAVAILABLE');
      assertTest(e.message.includes(ownerA), 'Error message names current lease owner');
    }
    assertTest(threw, 'Bob is blocked from acquiring active lease');

    // Release lease
    const released = leaseManager.release(file, ownerA);
    assertTest(released === true, 'Alice successfully releases lease');

    // Bob can now acquire
    const acquiredB = leaseManager.acquire(file, { owner: ownerB, purpose: 'Writing plan' });
    assertTest(acquiredB === true, 'Bob acquires lease successfully after release');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Test 2: Stale lease stolen
{
  const tempDir = createTempDir();
  try {
    const leaseManager = new LeaseManager(tempDir);
    const file = path.join(tempDir, 'stale-file.txt');
    
    // Alice acquires lease with very short stale cap
    leaseManager.acquire(file, { owner: 'agent-alice', stale_lock_cap_seconds: -10 }); // negative cap = immediately stale

    // Bob acquires, should steal successfully
    const acquiredB = leaseManager.acquire(file, { owner: 'agent-bob' });
    assertTest(acquiredB === true, 'Bob steals stale lease');

    const leases = leaseManager.list();
    assertTest(leases.length === 1, 'Only one active lease exists');
    assertTest(leases[0].owner === 'agent-bob', 'Bob is the owner of the stolen lease');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

console.log(`\nLeaseManager tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
