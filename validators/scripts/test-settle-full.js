'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const tests = [];
function addTest(name, fn) {
  tests.push({ name, fn });
}

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RELEASE_LOCKS_SCRIPT = path.join(
  REPO_ROOT, '.claude', 'skills', 'atlas-settle', 'scripts', 'release-locks.js'
);
const SETTLE_FULL_SCRIPT = path.join(
  REPO_ROOT, '.claude', 'skills', 'atlas-settle', 'scripts', 'settle-full.js'
);

function createTempProject() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-settle-full-'));
  fs.mkdirSync(path.join(tempDir, '.ai', 'state'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, '.ai', 'claims'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, '.ai', 'locks'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, '.ai', 'signals'), { recursive: true });
  return tempDir;
}

function createValidState(overrides = {}) {
  return {
    schema_version: '2.0',
    run_id: 'run_settle_full',
    feature_slug: 'settle-full-test',
    risk_profile: 'STANDARD',
    work_mode: 'FEATURE',
    stage: 'settle',
    status: 'running',
    attempt: 1,
    completed_steps: [],
    pending_step: '',
    locks: [],
    signals: [],
    consecutive_failures: 0,
    retry_count: 0,
    verified_artifacts: [],
    ...overrides
  };
}

// Test 18: Full settle sequence — release-locks clears state.locks to []
addTest('settle release-locks clears state.locks and releases LeaseManager locks', () => {
  const tempDir = createTempProject();

  try {
    const flowState = require('../../lib/flow-state');
    const { LeaseManager } = require('../../lib/lease-manager');
    const { ClaimManager } = require('../../lib/claim-manager');

    const locksDir = path.join(tempDir, '.ai', 'locks');
    const claimsDir = path.join(tempDir, '.ai', 'claims');
    const leaseMgr = new LeaseManager(locksDir);
    const claimMgr = new ClaimManager(claimsDir);

    // Create a test file and acquire a lease
    const testFile = path.join(tempDir, 'src', 'module.js');
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, 'module.exports = {}');
    leaseMgr.acquire(testFile, { owner: 'agent' });

    // Acquire a claim
    claimMgr.claim('settle-full-test', { owner: 'agent', profile: 'STANDARD', scope: [] });

    // Write flow state with the lock
    const state = createValidState({
      locks: [{ file: testFile, acquired_at: new Date().toISOString() }]
    });
    flowState.save(tempDir, state);

    // Verify locks exist before settle
    assert.strictEqual(leaseMgr.list().length, 1, 'Should have 1 lease before settle');

    // Run release-locks
    const res = cp.spawnSync(process.execPath, [RELEASE_LOCKS_SCRIPT, tempDir], {
      encoding: 'utf8'
    });

    assert.strictEqual(res.status, 0, `release-locks should succeed, stderr: ${res.stderr}`);

    const output = JSON.parse(res.stdout);
    assert.strictEqual(output.stage_id, 'settle');
    assert.strictEqual(output.status, 'PASS');

    // Verify flow-state locks are cleared
    const updatedState = flowState.load(tempDir);
    assert.deepStrictEqual(updatedState.locks, [], 'state.locks should be empty after release');

    // Verify LeaseManager has no active leases
    assert.strictEqual(leaseMgr.list().length, 0, 'LeaseManager should have 0 leases after release');
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
});

// Test 19: settle.js verify mode resolves the default command (npm test)
addTest('settle.js verify mode uses default npm test command', () => {
  const tempDir = createTempProject();

  try {
    const settleScript = path.join(
      REPO_ROOT, '.claude', 'skills', 'atlas-settle', 'scripts', 'settle.js'
    );

    // Create a minimal package.json with a passing test script
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        scripts: {
          test: 'echo "tests passed"'
        }
      }, null, 2),
      'utf8'
    );

    // Run settle.js in verify mode (default)
    const res = cp.spawnSync(process.execPath, [settleScript, 'verify'], {
      encoding: 'utf8',
      cwd: tempDir
    });

    const output = JSON.parse(res.stdout);
    assert.strictEqual(output.stage_id, 'settle');
    assert.strictEqual(output.status, 'PASS', `settle verify should pass with echo test, got: ${JSON.stringify(output)}`);
    assert.strictEqual(res.status, 0);
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
});

// Test 19b: settle.js validate mode runs npm run validate
addTest('settle.js validate mode uses npm run validate command', () => {
  const tempDir = createTempProject();

  try {
    const settleScript = path.join(
      REPO_ROOT, '.claude', 'skills', 'atlas-settle', 'scripts', 'settle.js'
    );

    // Create package.json with a passing validate script
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        scripts: {
          validate: 'echo "validation passed"'
        }
      }, null, 2),
      'utf8'
    );

    // Run settle.js in validate mode
    const res = cp.spawnSync(process.execPath, [settleScript, 'validate'], {
      encoding: 'utf8',
      cwd: tempDir
    });

    const output = JSON.parse(res.stdout);
    assert.strictEqual(output.stage_id, 'settle');
    assert.strictEqual(output.status, 'PASS');
    assert.strictEqual(res.status, 0);
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
});

// Test 19c: settle.js FAIL when the verification command fails
addTest('settle.js FAIL when verify command exits non-zero', () => {
  const tempDir = createTempProject();

  try {
    const settleScript = path.join(
      REPO_ROOT, '.claude', 'skills', 'atlas-settle', 'scripts', 'settle.js'
    );

    // Create package.json with a failing test script
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        scripts: {
          test: 'exit 1'
        }
      }, null, 2),
      'utf8'
    );

    const res = cp.spawnSync(process.execPath, [settleScript, 'verify'], {
      encoding: 'utf8',
      cwd: tempDir
    });

    assert.strictEqual(res.status, 1, 'Should exit 1 when test command fails');
    const output = JSON.parse(res.stdout);
    assert.strictEqual(output.status, 'FAIL');
    assert.ok(output.blocking.length > 0, 'Should have blocking entries');
    assert.ok(
      output.blocking[0].includes('Settle checks failed'),
      `Blocking message should indicate failure: ${output.blocking[0]}`
    );
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
});

addTest('settle-full uses atlas-flow.yaml verify_command when settle is final stage', () => {
  const tempDir = createTempProject();

  try {
    const flowState = require('../../lib/flow-state');

    fs.mkdirSync(path.join(tempDir, '.specify', 'templates'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, '.specify', 'templates', 'atlas-flow.yaml'),
      [
        'name: atlas-flow',
        'stages:',
        '  - id: align',
        '    command: echo align',
        '  - id: settle',
        '    command: node .claude/skills/atlas-settle/scripts/settle-full.js',
        '    gate: node .claude/skills/atlas-settle/scripts/settle-full.js',
        '    verify_command: node verify-from-yaml.js'
      ].join('\n'),
      'utf8'
    );

    fs.writeFileSync(
      path.join(tempDir, 'verify-from-yaml.js'),
      [
        "'use strict';",
        "const fs = require('fs');",
        "const path = require('path');",
        "fs.writeFileSync(path.join(process.cwd(), '.ai', 'state', 'yaml-verify-ran.txt'), 'ok');"
      ].join('\n'),
      'utf8'
    );

    flowState.save(tempDir, createValidState());

    const res = cp.spawnSync(process.execPath, [SETTLE_FULL_SCRIPT, tempDir], {
      encoding: 'utf8',
      cwd: tempDir
    });

    assert.strictEqual(res.status, 0, `settle-full should pass, stderr: ${res.stderr}, stdout: ${res.stdout}`);
    const output = JSON.parse(res.stdout);
    assert.strictEqual(output.status, 'PASS');
    assert.ok(
      fs.existsSync(path.join(tempDir, '.ai', 'state', 'yaml-verify-ran.txt')),
      'verify command from atlas-flow.yaml should run'
    );
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
});

addTest('settle-full fails and does not mark done when release-locks fails', () => {
  const tempDir = createTempProject();

  try {
    const flowState = require('../../lib/flow-state');
    const { LeaseManager } = require('../../lib/lease-manager');

    fs.writeFileSync(
      path.join(tempDir, 'verify-ok.js'),
      "'use strict';\nprocess.exit(0);\n",
      'utf8'
    );

    const lockedFile = path.join(tempDir, 'src', 'owned-by-other-agent.js');
    fs.mkdirSync(path.dirname(lockedFile), { recursive: true });
    fs.writeFileSync(lockedFile, 'module.exports = {};', 'utf8');

    const leaseMgr = new LeaseManager(path.join(tempDir, '.ai', 'locks'));
    leaseMgr.acquire(lockedFile, { owner: 'other-agent' });

    flowState.save(tempDir, createValidState({
      locks: [{ file: lockedFile, acquired_at: new Date().toISOString() }]
    }));

    const res = cp.spawnSync(process.execPath, [SETTLE_FULL_SCRIPT, '--cmd', 'node verify-ok.js', tempDir], {
      encoding: 'utf8',
      cwd: tempDir
    });

    assert.strictEqual(res.status, 1, 'settle-full should fail when release-locks fails');
    const output = JSON.parse(res.stdout);
    assert.strictEqual(output.status, 'FAIL');
    assert.ok(
      output.blocking.some((entry) => entry.includes('release-locks.js exited with status')),
      `blocking should include release-locks failure, got: ${JSON.stringify(output.blocking)}`
    );

    const updatedState = flowState.load(tempDir);
    assert.notStrictEqual(updatedState.status, 'done', 'state should not be marked done');
    assert.ok(
      !updatedState.completed_steps.includes('settle.release'),
      'settle.release should not be completed when release-locks fails'
    );
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
});

// Run tests
let failed = false;
for (const test of tests) {
  try {
    test.fn();
    console.log(`[PASS] ${test.name}`);
  } catch (err) {
    console.error(`[FAIL] ${test.name}:`, err.message);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
