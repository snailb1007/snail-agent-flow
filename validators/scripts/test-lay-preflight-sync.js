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
const LAY_PREFLIGHT_SCRIPT = path.join(
  REPO_ROOT, '.claude', 'skills', 'atlas-gates', 'scripts', 'lay-preflight.js'
);

function createValidState(overrides = {}) {
  return {
    schema_version: '2.0',
    run_id: 'test_run_lay',
    feature_slug: 'lay-test-feature',
    risk_profile: 'STANDARD',
    work_mode: 'FEATURE',
    stage: 'lay',
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

function createTempProject(stateOverrides = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-lay-preflight-sync-'));
  const stateDir = path.join(tempDir, '.ai', 'state');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(path.join(tempDir, '.ai', 'locks'), { recursive: true });

  const state = createValidState(stateOverrides);
  fs.writeFileSync(
    path.join(stateDir, 'flow-state.json'),
    JSON.stringify(state, null, 2),
    'utf8'
  );
  return tempDir;
}

// Test 13: lay-preflight PASS when locks present in flow-state + tests exist
addTest('lay-preflight PASS when locks in state and test files exist', () => {
  const tempDir = createTempProject({
    last_verified_commit: 'abc123',
    locks: [{ file: 'specs/feat/spec.md', acquired_at: new Date().toISOString() }]
  });

  // Create a test file to satisfy the test-existence check
  const testDir = path.join(tempDir, 'validators', 'scripts');
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(testDir, 'test-dummy.js'), '// test', 'utf8');

  try {
    const res = cp.spawnSync(process.execPath, [LAY_PREFLIGHT_SCRIPT, tempDir], {
      encoding: 'utf8'
    });

    assert.strictEqual(res.status, 0, `Should exit 0, stderr: ${res.stderr}`);
    const output = JSON.parse(res.stdout);
    assert.strictEqual(output.stage_id, 'lay');
    assert.strictEqual(output.status, 'PASS');
    assert.strictEqual(output.blocking.length, 0, 'No blocking issues expected');
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
});

// Test 14: lay-preflight FAIL when locks are empty in flow-state (no fallback sync yet)
addTest('lay-preflight FAIL when locks empty and no lock files on disk', () => {
  const tempDir = createTempProject({
    last_verified_commit: 'abc123',
    locks: []
  });

  // Create test file but no locks
  const testDir = path.join(tempDir, 'tests');
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(testDir, 'test-dummy.js'), '// test', 'utf8');

  try {
    const res = cp.spawnSync(process.execPath, [LAY_PREFLIGHT_SCRIPT, tempDir], {
      encoding: 'utf8'
    });

    assert.strictEqual(res.status, 1, 'Should exit 1 for missing locks');
    const output = JSON.parse(res.stdout);
    assert.strictEqual(output.status, 'FAIL');
    assert.ok(
      output.blocking.some(b => b.includes('No active file advisory leases')),
      'Should report missing leases'
    );
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
});

// Test 15: lay-preflight fallback sync — locks empty in state but lock files exist on disk
// This test validates that the script should sync locks from .ai/locks/ into flow-state
// when flow-state.locks is empty but physical lock files exist.
// NOTE: This is TDD — the fallback sync is NOT yet implemented in lay-preflight.js.
addTest('lay-preflight fallback sync populates locks from disk when state.locks is empty', () => {
  const tempDir = createTempProject({
    last_verified_commit: 'commit789',
    locks: []
  });

  // Create test files to pass test-existence check
  const testDir = path.join(tempDir, 'validators', 'scripts');
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(testDir, 'test-dummy.js'), '// test', 'utf8');

  // Create physical lock files in .ai/locks/ to simulate out-of-sync state
  const locksDir = path.join(tempDir, '.ai', 'locks');
  const lockData = {
    owner: 'agent',
    pid: process.pid,
    acquired_at: new Date().toISOString(),
    stale_lock_cap_seconds: 3600,
    target_file: path.join(tempDir, 'specs', 'feat', 'spec.md')
  };
  fs.writeFileSync(
    path.join(locksDir, 'lock-abc123.json'),
    JSON.stringify(lockData, null, 2),
    'utf8'
  );

  try {
    const res = cp.spawnSync(process.execPath, [LAY_PREFLIGHT_SCRIPT, tempDir], {
      encoding: 'utf8'
    });

    // After fallback sync: lay-preflight should have synced the lock from disk into state
    // and then PASS (since locks now exist after sync).
    // If the fallback sync is NOT implemented yet, this will FAIL (which is expected for TDD).
    const output = JSON.parse(res.stdout);

    if (output.status === 'PASS') {
      // Fallback sync is implemented — verify state was updated
      const flowState = require('../../lib/flow-state');
      const state = flowState.load(tempDir);
      assert.ok(state.locks.length > 0, 'State locks should be populated after fallback sync');
    } else {
      // Fallback sync not yet implemented — this is the expected TDD failure
      assert.strictEqual(output.status, 'FAIL', 'Expected FAIL without fallback sync');
      assert.ok(
        output.blocking.some(b => b.includes('No active file advisory leases')),
        'Should report missing leases (fallback sync not yet implemented)'
      );
      // Mark this as a known TDD failure
      throw new Error(
        'Fallback lock sync not yet implemented in lay-preflight.js — ' +
        'lay-preflight should detect .ai/locks/ files and sync into flow-state.locks'
      );
    }
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
