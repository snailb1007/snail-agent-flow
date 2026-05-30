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

/**
 * Tests for the lease-sync logic: load → modify → save pattern
 * using lib/flow-state directly (since handleLease in adp.js is not exported).
 */

// Test 9: flow-state load → modify locks → save roundtrip preserves data
addTest('flow-state load/modify/save preserves lock data', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-lease-sync-'));
  fs.mkdirSync(path.join(tempDir, '.ai', 'state'), { recursive: true });
  // Copy artifact-map.json is not needed because flow-state.js resolves it from its own __dirname

  try {
    const flowState = require('../../lib/flow-state');

    const state = {
      schema_version: '2.0',
      run_id: 'run_lease_sync',
      feature_slug: 'lease-test',
      risk_profile: 'STANDARD',
      work_mode: 'FEATURE',
      stage: 'align',
      status: 'running',
      attempt: 1,
      completed_steps: [],
      pending_step: '',
      locks: [],
      signals: [],
      consecutive_failures: 0,
      retry_count: 0,
      verified_artifacts: []
    };

    // Save initial state
    flowState.save(tempDir, state);

    // Load and modify locks
    const loaded = flowState.load(tempDir);
    loaded.locks = [
      { file: 'specs/my-feature/spec.md', acquired_at: new Date().toISOString() },
      { file: 'lib/my-module.js', acquired_at: new Date().toISOString() }
    ];
    flowState.save(tempDir, loaded);

    // Re-load and verify
    const reloaded = flowState.load(tempDir);
    assert.strictEqual(reloaded.locks.length, 2, 'Should have 2 locks after modification');
    assert.strictEqual(reloaded.locks[0].file, 'specs/my-feature/spec.md');
    assert.strictEqual(reloaded.locks[1].file, 'lib/my-module.js');
    assert.strictEqual(reloaded.feature_slug, 'lease-test');
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
});

// Test 10: LeaseManager acquire + flow-state sync round-trip
addTest('LeaseManager acquire integrates with flow-state lock tracking', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-lease-sync-'));
  fs.mkdirSync(path.join(tempDir, '.ai', 'state'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, '.ai', 'locks'), { recursive: true });

  try {
    const flowState = require('../../lib/flow-state');
    const { LeaseManager } = require('../../lib/lease-manager');

    const state = {
      schema_version: '2.0',
      run_id: 'run_lease_acquire',
      feature_slug: 'lease-acquire-test',
      risk_profile: 'STANDARD',
      work_mode: 'FEATURE',
      stage: 'align',
      status: 'running',
      attempt: 1,
      completed_steps: [],
      pending_step: '',
      locks: [],
      signals: [],
      consecutive_failures: 0,
      retry_count: 0,
      verified_artifacts: []
    };
    flowState.save(tempDir, state);

    // Acquire a lease via LeaseManager
    const locksDir = path.join(tempDir, '.ai', 'locks');
    const leaseMgr = new LeaseManager(locksDir);
    const testFile = path.join(tempDir, 'test-target.js');
    fs.writeFileSync(testFile, 'content');
    leaseMgr.acquire(testFile, { owner: 'agent' });

    // Simulate handleLease: sync lock into flow-state
    const loaded = flowState.load(tempDir);
    loaded.locks.push({
      file: path.relative(tempDir, testFile),
      acquired_at: new Date().toISOString()
    });
    flowState.save(tempDir, loaded);

    // Verify state has the lock
    const reloaded = flowState.load(tempDir);
    assert.strictEqual(reloaded.locks.length, 1);
    assert.ok(reloaded.locks[0].file.includes('test-target.js'));

    // Verify LeaseManager can list it
    const leases = leaseMgr.list();
    assert.strictEqual(leases.length, 1);
    assert.strictEqual(leases[0].owner, 'agent');
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
});

// Test 11: path.resolve normalizes relative paths for lease files
addTest('path normalization for lease file paths', () => {
  // Verify that path.resolve consistently normalizes paths
  const base = path.resolve('c:\\projects\\my-app');

  const rel1 = path.resolve(base, 'specs/feat/spec.md');
  const rel2 = path.resolve(base, './specs/feat/spec.md');
  const rel3 = path.resolve(base, 'specs/../specs/feat/spec.md');

  assert.strictEqual(rel1, rel2, 'Equivalent relative paths should resolve identically');
  assert.strictEqual(rel1, rel3, 'Paths with .. should resolve identically');

  // Also verify path.relative round-trip
  const relFromBase = path.relative(base, rel1);
  const backToAbs = path.resolve(base, relFromBase);
  assert.strictEqual(backToAbs, rel1, 'relative → resolve round-trip should be stable');
});

// Test 12: LeaseManager release removes lock and flow-state sync clears it
addTest('Lease release removes from LeaseManager and flow-state sync clears lock', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-lease-sync-'));
  fs.mkdirSync(path.join(tempDir, '.ai', 'state'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, '.ai', 'locks'), { recursive: true });

  try {
    const flowState = require('../../lib/flow-state');
    const { LeaseManager } = require('../../lib/lease-manager');

    const locksDir = path.join(tempDir, '.ai', 'locks');
    const leaseMgr = new LeaseManager(locksDir);
    const testFile = path.join(tempDir, 'locked-file.js');
    fs.writeFileSync(testFile, 'content');

    // Acquire
    leaseMgr.acquire(testFile, { owner: 'agent' });

    const state = {
      schema_version: '2.0',
      run_id: 'run_lease_release',
      feature_slug: 'lease-release-test',
      risk_profile: 'STANDARD',
      work_mode: 'FEATURE',
      stage: 'settle',
      status: 'running',
      attempt: 1,
      completed_steps: [],
      pending_step: '',
      locks: [{ file: testFile, acquired_at: new Date().toISOString() }],
      signals: [],
      consecutive_failures: 0,
      retry_count: 0,
      verified_artifacts: []
    };
    flowState.save(tempDir, state);

    // Release via LeaseManager
    leaseMgr.release(testFile, 'agent');

    // Sync flow-state: remove lock entry
    const loaded = flowState.load(tempDir);
    loaded.locks = loaded.locks.filter(l => {
      const absFile = path.isAbsolute(l.file) ? l.file : path.resolve(tempDir, l.file);
      // Check if lease still exists
      try {
        const leases = leaseMgr.list();
        return leases.some(lease => lease.target_file === absFile);
      } catch (e) {
        return false;
      }
    });
    flowState.save(tempDir, loaded);

    const reloaded = flowState.load(tempDir);
    assert.strictEqual(reloaded.locks.length, 0, 'Locks should be empty after release sync');
    assert.strictEqual(leaseMgr.list().length, 0, 'LeaseManager list should be empty');
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
