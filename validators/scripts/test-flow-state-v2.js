'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const flowState = require('../../lib/flow-state');
const { migrate } = require('../../.claude/skills/atlas-routing/scripts/migrate-ledger');

const tests = [];
function addTest(name, fn) {
  tests.push({ name, fn });
}

let tempDir;

function setup() {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-flow-state-test-'));
  // Mock artifact-paths to use tempDir for flow_state
  const paths = require('../../lib/artifact-paths');
  // Override resolvePath for this test environment
  const origResolvePath = paths.resolvePath;
  paths.resolvePath = function(dottedKey, variables) {
    if (dottedKey === 'flow_state') {
      return path.join(tempDir, '.ai', 'state', 'flow-state.json');
    }
    return origResolvePath(dottedKey, variables);
  };
}

function cleanup() {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}
}

addTest('flow-state load/save and validate', () => {
  const state = {
    schema_version: '2.0',
    run_id: 'run_111',
    feature_slug: 'feature_slug_test',
    risk_profile: 'STANDARD',
    work_mode: 'FEATURE',
    stage: 'act',
    status: 'running',
    attempt: 1,
    last_verified_commit: 'abc',
    completed_steps: [],
    pending_step: 'act.test',
    locks: [],
    signals: [],
    consecutive_failures: 0,
    retry_count: 0,
    verified_artifacts: []
  };

  flowState.save(tempDir, state);
  const loaded = flowState.load(tempDir);
  assert.strictEqual(loaded.run_id, 'run_111');
  assert.strictEqual(loaded.risk_profile, 'STANDARD');
});

addTest('flow-state validation rejects invalid profile', () => {
  const state = {
    schema_version: '2.0',
    run_id: 'run_111',
    feature_slug: 'feature_slug_test',
    risk_profile: 'INVALID_PROFILE',
    work_mode: 'FEATURE',
    stage: 'act',
    status: 'running',
    attempt: 1,
    completed_steps: [],
    pending_step: 'act.test',
    locks: [],
    signals: [],
    consecutive_failures: 0,
    retry_count: 0,
    verified_artifacts: []
  };

  assert.throws(() => {
    flowState.save(tempDir, state);
  }, /Invalid risk profile/);
});

addTest('markStepComplete and setStage logic', () => {
  const state = {
    schema_version: '2.0',
    run_id: 'run_111',
    feature_slug: 'feature_slug_test',
    risk_profile: 'STANDARD',
    work_mode: 'FEATURE',
    stage: 'act',
    status: 'running',
    attempt: 1,
    completed_steps: [],
    pending_step: 'act.test',
    locks: [],
    signals: [],
    consecutive_failures: 0,
    retry_count: 0,
    verified_artifacts: []
  };

  flowState.markStepComplete(state, 'act.test');
  assert.deepStrictEqual(state.completed_steps, ['act.test']);
  assert.strictEqual(state.pending_step, '');

  flowState.setStage(state, 'settle');
  assert.strictEqual(state.stage, 'settle');
  assert.strictEqual(state.revision_history.length, 1);
  assert.strictEqual(state.revision_history[0].to, 'settle');
});

addTest('migrate-ledger functionality', () => {
  const aiDir = path.join(tempDir, '.ai', 'state');
  fs.mkdirSync(aiDir, { recursive: true });

  const ledger = {
    flow_name: 'rough-project-flow',
    current_stage: 'execution',
    status: 'running',
    stages: [
      { id: 'decision_discovery', status: 'done' },
      { id: 'execution', status: 'in_progress' }
    ]
  };
  fs.writeFileSync(path.join(aiDir, 'flow-ledger.json'), JSON.stringify(ledger), 'utf8');

  const runState = {
    run_id: 'run_999',
    risk_profile: 'FULL',
    work_mode: 'BUGFIX',
    attempt: 3,
    last_gate: 'Spec-Validation',
    last_gate_status: 'PASS',
    consecutive_failures: 2
  };
  fs.writeFileSync(path.join(aiDir, 'run-state.json'), JSON.stringify(runState), 'utf8');

  migrate(tempDir);

  const state = flowState.load(tempDir);
  assert.strictEqual(state.schema_version, '2.0');
  assert.strictEqual(state.run_id, 'run_999');
  assert.strictEqual(state.risk_profile, 'FULL');
  assert.strictEqual(state.work_mode, 'BUGFIX');
  assert.strictEqual(state.stage, 'act'); // mapped from execution
  assert.strictEqual(state.attempt, 3);
  assert.deepStrictEqual(state.completed_steps, ['align.complete']); // mapped from decision_discovery
});

addTest('flow-state validation rejects non-array locks', () => {
  const state = {
    schema_version: '2.0',
    run_id: 'run_111',
    feature_slug: 'feature_slug_test',
    risk_profile: 'STANDARD',
    work_mode: 'FEATURE',
    stage: 'act',
    status: 'running',
    attempt: 1,
    completed_steps: [],
    pending_step: 'act.test',
    locks: 'oops',
    signals: [],
    consecutive_failures: 0,
    retry_count: 0,
    verified_artifacts: []
  };

  assert.throws(() => {
    flowState.validate(state);
  }, /'locks' must be an array/);
});

addTest('flow-state validation rejects invalid locks element shape', () => {
  const state = {
    schema_version: '2.0',
    run_id: 'run_111',
    feature_slug: 'feature_slug_test',
    risk_profile: 'STANDARD',
    work_mode: 'FEATURE',
    stage: 'act',
    status: 'running',
    attempt: 1,
    completed_steps: [],
    pending_step: 'act.test',
    locks: [{ file: 123, acquired_at: 'now' }],
    signals: [],
    consecutive_failures: 0,
    retry_count: 0,
    verified_artifacts: []
  };

  assert.throws(() => {
    flowState.validate(state);
  }, /'locks\[0\].file' must be a string/);
});

addTest('migrate-ledger legacy normalization', () => {
  const aiDir = path.join(tempDir, '.ai', 'state');
  fs.mkdirSync(aiDir, { recursive: true });

  const ledger = {
    flow_name: 'rough-project-flow',
    current_stage: 'execution',
    status: 'running',
    stages: []
  };
  fs.writeFileSync(path.join(aiDir, 'flow-ledger.json'), JSON.stringify(ledger), 'utf8');

  const runState = {
    run_id: 'run_999',
    risk_profile: 'balanced', // legacy/case check
    work_mode: 'fix',         // legacy check
    attempt: 1
  };
  fs.writeFileSync(path.join(aiDir, 'run-state.json'), JSON.stringify(runState), 'utf8');

  migrate(tempDir);

  const state = flowState.load(tempDir);
  assert.strictEqual(state.risk_profile, 'STANDARD'); // normalized
  assert.strictEqual(state.work_mode, 'BUGFIX');      // normalized
});

// Run tests
let failed = false;
for (const test of tests) {
  setup();
  try {
    test.fn();
    console.log(`[PASS] ${test.name}`);
  } catch (err) {
    console.error(`[FAIL] ${test.name}:`, err);
    failed = true;
  } finally {
    cleanup();
  }
}

if (failed) {
  process.exit(1);
}
