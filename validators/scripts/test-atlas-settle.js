'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const flowState = require('../../lib/flow-state');

const tests = [];
function addTest(name, fn) {
  tests.push({ name, fn });
}

let tempDir;

function setup() {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-settle-test-'));
  // Make sure directories inside tempDir exist
  fs.mkdirSync(path.join(tempDir, '.ai', 'state'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, '.ai', 'claims'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, '.ai', 'locks'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, '.ai', 'signals'), { recursive: true });
}

function cleanup() {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}
}

addTest('release-locks clears flow state locks and unlinks files', () => {
  const state = {
    schema_version: '2.0',
    run_id: 'run_settle',
    feature_slug: 'settle-feature',
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
    verified_artifacts: []
  };

  flowState.save(tempDir, state);

  // Setup actual lock file in the locks directory to release
  const { LeaseManager } = require('../../lib/lease-manager');
  const locksDir = path.join(tempDir, '.ai', 'locks');
  const leaseMgr = new LeaseManager(locksDir);
  const testFile = path.join(tempDir, 'test_file');
  fs.writeFileSync(testFile, 'dummy content');
  
  // Acquire lock
  leaseMgr.acquire(testFile, { owner: 'agent', purpose: 'testing' });
  
  // Update state locks with the test file relative path (as expected by release-locks)
  state.locks = [{ file: testFile, acquired_at: new Date().toISOString() }];
  flowState.save(tempDir, state);

  const { execSync } = require('child_process');
  execSync(`node .claude/skills/atlas-settle/scripts/release-locks.js "${tempDir}"`);

  const updated = flowState.load(tempDir);
  assert.deepStrictEqual(updated.locks, []);

  // Lock should be released (list should be empty)
  assert.deepStrictEqual(leaseMgr.list(), []);
});

addTest('signal-log appends valid signals to md and jsonl files', () => {
  const state = {
    schema_version: '2.0',
    run_id: 'run_settle',
    feature_slug: 'settle-feature',
    risk_profile: 'STANDARD',
    work_mode: 'FEATURE',
    stage: 'settle',
    status: 'running',
    attempt: 3,
    completed_steps: [],
    pending_step: '',
    locks: [],
    signals: [],
    consecutive_failures: 0,
    retry_count: 0,
    verified_artifacts: []
  };

  flowState.save(tempDir, state);

  const { execSync } = require('child_process');
  execSync(`node .claude/skills/atlas-settle/scripts/signal-log.js "${tempDir}"`);

  // Verify md file is generated and contains the signal
  const mdPath = path.join(tempDir, '.ai', 'signals', 'current-period.md');
  assert(fs.existsSync(mdPath), 'current-period.md should exist');
  const mdContent = fs.readFileSync(mdPath, 'utf8');
  assert(mdContent.includes('REVISION_COUNT'), 'md should contain REVISION_COUNT');
  assert(mdContent.includes('Value:** 3'), 'md should contain value 3');

  // Verify jsonl file exists and matches the format
  const jsonlPath = path.join(tempDir, '.ai', 'signals', 'current-period.jsonl');
  assert(fs.existsSync(jsonlPath), 'current-period.jsonl should exist');
  
  const lines = fs.readFileSync(jsonlPath, 'utf8').trim().split('\n');
  assert.strictEqual(lines.length, 1);
  const entry = JSON.parse(lines[0]);
  assert.strictEqual(entry.type, 'revision_count');
  assert.strictEqual(entry.value, 3);
  assert(entry.timestamp);
});

// Run tests
setup();
let failed = false;
for (const test of tests) {
  try {
    test.fn();
    console.log(`[PASS] ${test.name}`);
  } catch (err) {
    console.error(`[FAIL] ${test.name}:`, err);
    failed = true;
  }
}
cleanup();

if (failed) {
  process.exit(1);
}
