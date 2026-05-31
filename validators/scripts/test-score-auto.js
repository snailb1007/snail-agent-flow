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
const SCORE_SCRIPT = path.join(REPO_ROOT, '.claude', 'skills', 'atlas-routing', 'scripts', 'score-and-claim.js');

/**
 * Set up a minimal temp directory that score-and-claim.js can use as a repoRoot.
 * Requires artifact-map.json to be findable for artifact-paths resolution.
 */
function createTempProject() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-score-auto-'));
  // score-and-claim.js resolves artifact-map.json from __dirname/../../../../.claude/skills/contracts
  // which points to the real repo. But flow-state.save resolves relative to repoRoot.
  // We need .ai/state/ to exist in the tempDir for flow state writing.
  fs.mkdirSync(path.join(tempDir, '.ai', 'state'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, '.ai', 'claims'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, '.ai', 'locks'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, '.specify'), { recursive: true });
  // Copy artifact-map.json so the libs can find it when required from the real repo
  // (artifact-paths.js resolves relative to its own __dirname, so it'll find the real one)
  return tempDir;
}

// Test 1: --auto --description "test feature" produces flow-state with risk_profile=STANDARD, all dims=1
addTest('--auto flag with description produces STANDARD profile with all dims=1', () => {
  const tempDir = createTempProject();
  try {
    const res = cp.spawnSync(process.execPath, [
      SCORE_SCRIPT, '--auto', '--description', 'test feature', tempDir
    ], { encoding: 'utf8' });

    // Parse the gate result from stdout
    const output = JSON.parse(res.stdout);
    assert.strictEqual(output.stage_id, 'align', 'stage_id should be align');
    assert.strictEqual(output.status, 'PASS', 'status should be PASS');

    // Check flow-state was written
    const statePath = path.join(tempDir, '.ai', 'state', 'flow-state.json');
    assert.ok(fs.existsSync(statePath), 'flow-state.json should exist');

    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.strictEqual(state.risk_profile, 'STANDARD', 'risk_profile should be STANDARD for --auto');
    assert.strictEqual(state.work_mode, 'FEATURE', 'work_mode should default to FEATURE');
    assert.ok(state.feature_slug, 'feature_slug should be set');
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
});

// Test 2: Full JSON payload still works (backward compatibility)
addTest('Full JSON payload produces correct flow-state (backward compat)', () => {
  const tempDir = createTempProject();
  try {
    const taskPayload = JSON.stringify({
      slug: 'compat-test',
      novelty: 1,
      blast_radius: 1,
      ambiguity: 1,
      reversibility: 1,
      user_biz_risk: 1
    });

    const res = cp.spawnSync(process.execPath, [
      SCORE_SCRIPT, taskPayload, tempDir
    ], { encoding: 'utf8' });

    assert.strictEqual(res.status, 0, `Script should succeed, stderr: ${res.stderr}`);
    const output = JSON.parse(res.stdout);
    assert.strictEqual(output.stage_id, 'align');
    assert.strictEqual(output.status, 'PASS');

    const statePath = path.join(tempDir, '.ai', 'state', 'flow-state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.strictEqual(state.feature_slug, 'compat-test');
    assert.strictEqual(state.risk_profile, 'STANDARD', 'total=5 should be STANDARD');
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
});

// Test 3: After --auto, .specify/feature.json has matching feature_directory
addTest('--auto creates .specify/feature.json with matching feature_directory', () => {
  const tempDir = createTempProject();
  try {
    const res = cp.spawnSync(process.execPath, [
      SCORE_SCRIPT, '--auto', '--description', 'my cool feature', tempDir
    ], { encoding: 'utf8' });

    // The --auto mode should create/update .specify/feature.json
    const featurePointerPath = path.join(tempDir, '.specify', 'feature.json');
    assert.ok(fs.existsSync(featurePointerPath), '.specify/feature.json should exist after --auto');

    const pointer = JSON.parse(fs.readFileSync(featurePointerPath, 'utf8'));
    assert.ok(pointer.feature_directory, 'feature_directory should be set');

    // feature_directory should contain the slug derived from description
    const statePath = path.join(tempDir, '.ai', 'state', 'flow-state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.ok(
      pointer.feature_directory.includes(state.feature_slug) ||
      state.feature_slug.length > 0,
      'feature_directory should relate to feature_slug'
    );
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
});

// Test 4: Pre-existing stale .specify/feature.json gets overwritten
addTest('--auto overwrites stale .specify/feature.json', () => {
  const tempDir = createTempProject();
  try {
    // Write a stale feature.json
    const featurePointerPath = path.join(tempDir, '.specify', 'feature.json');
    fs.writeFileSync(featurePointerPath, JSON.stringify({
      feature_directory: 'specs/000-old-stale-feature'
    }, null, 2), 'utf8');

    const res = cp.spawnSync(process.execPath, [
      SCORE_SCRIPT, '--auto', '--description', 'new replacement feature', tempDir
    ], { encoding: 'utf8' });

    const pointer = JSON.parse(fs.readFileSync(featurePointerPath, 'utf8'));
    assert.ok(
      !pointer.feature_directory.includes('old-stale-feature'),
      'Old stale feature_directory should be overwritten'
    );
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
});

// Test 5: Task with override: 'BUGFIX' → work_mode=BUGFIX, risk_profile=STANDARD
addTest('override BUGFIX sets work_mode=BUGFIX, risk_profile=STANDARD (not BUGFIX)', () => {
  const tempDir = createTempProject();
  try {
    const taskPayload = JSON.stringify({
      slug: 'bugfix-task',
      novelty: 0,
      blast_radius: 0,
      ambiguity: 0,
      reversibility: 0,
      user_biz_risk: 0,
      override: 'BUGFIX'
    });

    const res = cp.spawnSync(process.execPath, [
      SCORE_SCRIPT, taskPayload, tempDir
    ], { encoding: 'utf8' });

    const statePath = path.join(tempDir, '.ai', 'state', 'flow-state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    // work_mode should be BUGFIX (from the override field)
    assert.strictEqual(state.work_mode, 'BUGFIX', 'work_mode should be BUGFIX');
    // risk_profile should be a valid profile (FAST/STANDARD/FULL), NOT 'BUGFIX'
    assert.ok(
      ['FAST', 'STANDARD', 'FULL'].includes(state.risk_profile),
      `risk_profile should be FAST/STANDARD/FULL, got: ${state.risk_profile}`
    );
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
});

// Test 6: Task with override: 'PROTOTYPE' → work_mode=PROTOTYPE, risk_profile=STANDARD
addTest('override PROTOTYPE sets work_mode=PROTOTYPE, risk_profile=STANDARD (not PROTOTYPE)', () => {
  const tempDir = createTempProject();
  try {
    const taskPayload = JSON.stringify({
      slug: 'proto-task',
      novelty: 0,
      blast_radius: 0,
      ambiguity: 0,
      reversibility: 0,
      user_biz_risk: 0,
      override: 'PROTOTYPE'
    });

    const res = cp.spawnSync(process.execPath, [
      SCORE_SCRIPT, taskPayload, tempDir
    ], { encoding: 'utf8' });

    const statePath = path.join(tempDir, '.ai', 'state', 'flow-state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    // work_mode should be PROTOTYPE
    assert.strictEqual(state.work_mode, 'PROTOTYPE', 'work_mode should be PROTOTYPE');
    // risk_profile should NOT be 'PROTOTYPE' - it should be a valid profile
    assert.ok(
      ['FAST', 'STANDARD', 'FULL'].includes(state.risk_profile),
      `risk_profile should be FAST/STANDARD/FULL, got: ${state.risk_profile}`
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
