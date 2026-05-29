'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');
const flowState = require('../../lib/flow-state');
const { resolveNext } = require('../../.claude/skills/atlas-routing/scripts/transition');

const tests = [];
function addTest(name, fn) {
  tests.push({ name, fn });
}

addTest('FAST profile skips align-gate', () => {
  const state = {
    schema_version: '2.0',
    run_id: 'run_fast',
    feature_slug: 'fast-feature',
    risk_profile: 'FAST',
    work_mode: 'FEATURE',
    stage: 'align',
    status: 'running',
    attempt: 1,
    completed_steps: ['align.score', 'align.claim'],
    pending_step: '',
    locks: [],
    signals: [],
    consecutive_failures: 0,
    retry_count: 0,
    verified_artifacts: []
  };

  const result = resolveNext(state);
  assert.strictEqual(result.nextStage, 'trace');
  assert.ok(result.skipped.includes('align-gate'));
});

addTest('FAST profile skips settle.pr-check', () => {
  const state = {
    schema_version: '2.0',
    run_id: 'run_fast_settle',
    feature_slug: 'fast-feature',
    risk_profile: 'FAST',
    work_mode: 'FEATURE',
    stage: 'act',
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

  const result = resolveNext(state);
  assert.strictEqual(result.nextStage, 'settle');
  assert.ok(result.skipped.includes('settle.pr-check'));
});

addTest('DOCS work mode skips act stage and lay.test-setup', () => {
  const state = {
    schema_version: '2.0',
    run_id: 'run_docs',
    feature_slug: 'docs-update',
    risk_profile: 'STANDARD',
    work_mode: 'DOCS',
    stage: 'trace',
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

  // From trace, next stage should be lay (skipping lay.test-setup is noted in skipped, but nextStage is lay)
  const res1 = resolveNext(state);
  assert.strictEqual(res1.nextStage, 'lay');
  assert.ok(res1.skipped.includes('lay.test-setup'));

  // From lay, next stage should settle, skipping act entirely
  state.stage = 'lay';
  const res2 = resolveNext(state);
  assert.strictEqual(res2.nextStage, 'settle');
  assert.ok(res2.skipped.includes('act'));
});

addTest('score-and-claim script Integration Test', () => {
  const taskPayload = JSON.stringify({
    slug: 'integration-test-task',
    novelty: 0,
    blast_radius: 0,
    ambiguity: 0,
    reversibility: 0,
    user_biz_risk: 0
  });

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-atlas-routing-test-'));
  const scriptPath = path.join(__dirname, '../../.claude/skills/atlas-routing/scripts/score-and-claim.js');

  // Override resolvePath inside artifact-paths to direct locks_dir and claims_dir to tempDir
  const paths = require('../../lib/artifact-paths');
  const origResolvePath = paths.resolvePath;
  paths.resolvePath = function(dottedKey, variables) {
    if (dottedKey === 'claims_dir') {
      return path.join(tempDir, '.ai', 'claims');
    }
    if (dottedKey === 'flow_state') {
      return path.join(tempDir, '.ai', 'state', 'flow-state.json');
    }
    return origResolvePath(dottedKey, variables);
  };

  try {
    const res = cp.spawnSync(process.execPath, [scriptPath, taskPayload, tempDir], { encoding: 'utf8' });
    if (res.status !== 0) {
      throw new Error(`score-and-claim failed: ${res.stderr || res.stdout || (res.error && res.error.message)}`);
    }
    const stdout = res.stdout;
    const output = JSON.parse(stdout);
    assert.strictEqual(output.stage_id, 'align');
    assert.strictEqual(output.status, 'PASS');

    const stateFile = path.join(tempDir, '.ai', 'state', 'flow-state.json');
    assert.ok(fs.existsSync(stateFile));
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.strictEqual(state.risk_profile, 'FAST');
    assert.strictEqual(state.feature_slug, 'integration-test-task');
  } finally {
    paths.resolvePath = origResolvePath;
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }
});

// Run tests
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

if (failed) {
  process.exit(1);
}
