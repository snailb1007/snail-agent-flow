const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { ClaimManager } = require('../../lib/claim-manager');

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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'adp-claim-manager-'));
}

console.log('--- ClaimManager Tests ---');

// Test 1: claim -> status -> release -> status
{
  const tempDir = createTempDir();
  try {
    const claimManager = new ClaimManager(tempDir);
    const task = 'task-1';
    const owner = 'agent-alice';
    const profile = 'STANDARD';
    const scope = ['lib/foo.js', 'lib/bar.js'];

    // Initial status should be null
    assertTest(claimManager.status(task) === null, 'Initial status is null');

    // Claim task
    const claimed = claimManager.claim(task, { owner, profile, scope });
    assertTest(claimed === true, 'Successfully claimed task');

    // Status check
    const status = claimManager.status(task);
    assertTest(status !== null, 'Status is not null after claim');
    assertTest(status.owner === owner, 'Owner matches');
    assertTest(status.task === task, 'Task slug matches');
    assertTest(status.profile === profile, 'Profile matches');
    assertTest(status.scope.length === 2, 'Scope matches');
    assertTest(status.status === 'active', 'Status is active');

    // List check
    const list = claimManager.list();
    assertTest(list.length === 1, 'List contains 1 claim');
    assertTest(list[0].task === task, 'List element matches');

    // Release task
    const released = claimManager.release(task, owner);
    assertTest(released === true, 'Successfully released task');

    // Status check after release
    assertTest(claimManager.status(task) === null, 'Status is null after release');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Test 2: Double claim throws LOCK_UNAVAILABLE
{
  const tempDir = createTempDir();
  try {
    const claimManager = new ClaimManager(tempDir);
    const task = 'task-2';

    claimManager.claim(task, { owner: 'agent-alice', profile: 'FAST' });

    let threw = false;
    try {
      claimManager.claim(task, { owner: 'agent-bob', profile: 'FULL' });
    } catch (e) {
      threw = true;
      assertTest(e.code === 'LOCK_UNAVAILABLE', 'Throws LOCK_UNAVAILABLE');
      assertTest(e.message.includes('agent-alice'), 'Error message contains current owner');
    }
    assertTest(threw, 'Double claim throws');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Test 3: Stale steal dead PID
{
  const tempDir = createTempDir();
  try {
    const claimManager = new ClaimManager(tempDir);
    const task = 'task-3';

    // Write a lock file manually with dead PID
    const lockFilePath = path.join(tempDir, task + '.json');
    const staleData = {
      owner: 'agent-dead',
      pid: 999999, // dead PID
      acquired_at: new Date().toISOString(),
      stale_lock_cap_seconds: 3600,
      task: task,
      profile: 'FAST',
      scope: [],
      status: 'active'
    };
    fs.writeFileSync(lockFilePath, JSON.stringify(staleData, null, 2), 'utf8');

    // Bob claims and steals it
    const claimed = claimManager.claim(task, { owner: 'agent-bob', profile: 'STANDARD' });
    assertTest(claimed === true, 'Bob successfully stole the stale claim');

    const status = claimManager.status(task);
    assertTest(status.owner === 'agent-bob', 'Owner is now Bob');
    assertTest(status.pid === process.pid, 'PID updated to current');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

console.log(`\nClaimManager tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
