'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { validateDrift } = require('../../lib/validate-drift');
const { resolveTemplatePath } = require('../../lib/flow-engine');

const tests = [];
function addTest(name, fn) {
  tests.push({ name, fn });
}

let tempDir;

function setup() {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-drift-test-'));
  // Create required structure
  fs.mkdirSync(path.join(tempDir, '.claude', 'skills', 'contracts'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'specs'));
  fs.mkdirSync(path.join(tempDir, '.ai', 'state'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, '.ai', 'signals'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, '.ai', 'locks'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, '.ai', 'claims'), { recursive: true });

  // Copy artifact-map.json to temp
  fs.copyFileSync(
    path.join(__dirname, '..', '..', '.claude', 'skills', 'contracts', 'artifact-map.json'),
    path.join(tempDir, '.claude', 'skills', 'contracts', 'artifact-map.json')
  );
}

function cleanup() {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}
}

addTest('template alias resolution', () => {
  const pathVal = resolveTemplatePath('{{feature.spec}}', { feature_slug: 'test-slug' });
  assert.strictEqual(pathVal, 'specs/test-slug/spec.md');
});

addTest('drift validator flags duplicate spec.md', () => {
  // Setup duplicate spec
  const dupPath = path.join(tempDir, 'test-sandbox', 'spec.md');
  fs.mkdirSync(path.dirname(dupPath), { recursive: true });
  fs.writeFileSync(dupPath, '# Mock spec outside specs');

  const results = validateDrift(tempDir);
  const dupCheck = results.find(r => r.check === 'duplicate_spec');
  assert.strictEqual(dupCheck.status, 'BLOCKED');
});

addTest('drift validator checks signals validity', () => {
  const sigFile = path.join(tempDir, '.ai', 'signals', 'current-period.jsonl');
  fs.writeFileSync(sigFile, '{"type": "signal"}\nmalformed line\n');

  const results = validateDrift(tempDir);
  const sigCheck = results.find(r => r.check === 'signals_format');
  assert.strictEqual(sigCheck.status, 'FAIL');
});

addTest('drift validator flags stale locks/claims', () => {
  const locksDir = path.join(tempDir, '.ai', 'locks');
  fs.mkdirSync(locksDir, { recursive: true });
  
  // Write a stale lock file with expired TTL
  const staleLockPath = path.join(locksDir, 'stale-task.json');
  const meta = {
    owner: 'test-owner',
    pid: process.pid,
    acquired_at: new Date(Date.now() - 5000 * 1000).toISOString(), // 5000 seconds ago
    stale_lock_cap_seconds: 3600
  };
  fs.writeFileSync(staleLockPath, JSON.stringify(meta), 'utf8');

  const results = validateDrift(tempDir);
  const staleCheck = results.find(r => r.check === 'stale_locks');
  assert.strictEqual(staleCheck.status, 'WARN');
});

addTest('drift validator flags path outside contract with prefix-colliding sibling folder', () => {
  const backupDir = path.join(tempDir, '.ai', 'state-backup');
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(backupDir, 'foo.json'), '{"some": "data"}', 'utf8');

  const results = validateDrift(tempDir);
  const pathCheck = results.find(r => r.check === 'path_outside_contract');
  assert.strictEqual(pathCheck.status, 'WARN');
  assert.ok(pathCheck.message.includes('state-backup'));
});

addTest('drift validator passes lock-tracking check when .ai/locks is not in git', () => {
  // The shared tempDir is not a git working tree, so lock files cannot be tracked → PASS.
  const results = validateDrift(tempDir);
  const check = results.find(r => r.check === 'locks_tracked_in_git');
  assert.ok(check, 'locks_tracked_in_git check should be present');
  assert.strictEqual(check.status, 'PASS');
});

addTest('drift validator WARNS when lock/claim files are tracked by git', () => {
  const gitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-drift-git-'));
  try {
    const git = (args) => spawnSync('git', args, { cwd: gitDir, encoding: 'utf8' });
    if (git(['init']).status !== 0) {
      console.log('[SKIP] git not available; skipping lock-tracking WARN test');
      return;
    }
    git(['config', 'user.email', 'test@example.com']);
    git(['config', 'user.name', 'Test']);

    // Minimal structure validateDrift needs.
    fs.mkdirSync(path.join(gitDir, '.claude', 'skills', 'contracts'), { recursive: true });
    fs.copyFileSync(
      path.join(__dirname, '..', '..', '.claude', 'skills', 'contracts', 'artifact-map.json'),
      path.join(gitDir, '.claude', 'skills', 'contracts', 'artifact-map.json')
    );
    fs.mkdirSync(path.join(gitDir, '.ai', 'locks'), { recursive: true });
    fs.writeFileSync(
      path.join(gitDir, '.ai', 'locks', 'demo.json'),
      '{"owner":"x","pid":1,"acquired_at":"2026-01-01T00:00:00.000Z"}',
      'utf8'
    );

    // Staging alone makes `git ls-files` report the file as tracked.
    git(['add', '.ai/locks/demo.json']);

    const results = validateDrift(gitDir);
    const check = results.find(r => r.check === 'locks_tracked_in_git');
    assert.ok(check, 'locks_tracked_in_git check should be present');
    assert.strictEqual(check.status, 'WARN');
    assert.ok(check.message.includes('.ai/locks/demo.json'), 'message should name the tracked lock file');
  } finally {
    fs.rmSync(gitDir, { recursive: true, force: true });
  }
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
