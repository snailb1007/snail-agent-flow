'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const tests = [];
function addTest(name, fn) {
  tests.push({ name, fn });
}

let tempDir;
let stateDir;
let statePath;

function setup() {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-atlas-gates-'));
  stateDir = path.join(tempDir, '.ai', 'state');
  fs.mkdirSync(stateDir, { recursive: true });
  statePath = path.join(stateDir, 'flow-state.json');
}

function cleanup() {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}
}

addTest('lay-preflight - happy path (PASS)', () => {
  setup();
  
  // Write valid flow state
  const state = {
    schema_version: '2.0',
    last_verified_commit: 'abc123commit',
    locks: [{ file: 'specs/my-feature/spec.md', acquired_at: new Date().toISOString() }],
    risk_profile: 'STANDARD',
    work_mode: 'FEATURE',
    attempt: 1,
    consecutive_failures: 0
  };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  // Create a dummy test file under tests/
  const testDir = path.join(tempDir, 'tests');
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(testDir, 'test-dummy.js'), '// dummy test', 'utf8');

  // Execute lay-preflight.js
  const scriptPath = path.join(__dirname, '..', '..', '.claude', 'skills', 'atlas-gates', 'scripts', 'lay-preflight.js');
  let output;
  try {
    output = execSync(`node "${scriptPath}" "${tempDir}"`, { encoding: 'utf8' });
  } catch (err) {
    console.error('Command failed output:', err.stdout || err.message);
    throw err;
  }

  const result = JSON.parse(output);
  assert.strictEqual(result.stage_id, 'lay');
  assert.strictEqual(result.status, 'PASS');
  assert.strictEqual(result.blocking.length, 0);

  cleanup();
});

addTest('lay-preflight - missing all requirements (FAIL)', () => {
  setup();

  // Write invalid flow state (missing locks and last_verified_commit)
  const state = {
    schema_version: '2.0',
    locks: [],
    risk_profile: 'STANDARD',
    work_mode: 'FEATURE',
    attempt: 1,
    consecutive_failures: 0
  };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  // Do NOT create any test files

  // Execute lay-preflight.js (should exit 1)
  const scriptPath = path.join(__dirname, '..', '..', '.claude', 'skills', 'atlas-gates', 'scripts', 'lay-preflight.js');
  let exitCode = 0;
  let output = '';
  try {
    output = execSync(`node "${scriptPath}" "${tempDir}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch (err) {
    exitCode = err.status;
    output = err.stdout;
  }

  assert.strictEqual(exitCode, 1);
  const result = JSON.parse(output);
  assert.strictEqual(result.status, 'FAIL');
  assert.ok(result.blocking.includes('Pre-execution base commit hash (last_verified_commit) is not recorded.'));
  assert.ok(result.blocking.includes('No active file advisory leases acquired in flow state.'));
  assert.ok(result.blocking.includes('No unit or validation test file detected.'));

  cleanup();
});

addTest('act-evaluator - happy path under cap (PASS)', () => {
  setup();

  const state = {
    schema_version: '2.0',
    risk_profile: 'STANDARD',
    work_mode: 'FEATURE',
    attempt: 4, // under standard cap of 5
    consecutive_failures: 0
  };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  const scriptPath = path.join(__dirname, '..', '..', '.claude', 'skills', 'atlas-gates', 'scripts', 'act-evaluator.js');
  let output;
  try {
    output = execSync(`node "${scriptPath}" "${tempDir}"`, { encoding: 'utf8' });
  } catch (err) {
    console.error('Command failed output:', err.stdout || err.message);
    throw err;
  }

  const result = JSON.parse(output);
  assert.strictEqual(result.stage_id, 'act');
  assert.strictEqual(result.status, 'PASS');
  assert.strictEqual(result.blocking.length, 0);

  cleanup();
});

addTest('act-evaluator - exceeds FAST cap (BLOCKED)', () => {
  setup();

  const state = {
    schema_version: '2.0',
    risk_profile: 'FAST',
    work_mode: 'FEATURE',
    attempt: 4, // exceeds FAST cap of 3
    consecutive_failures: 0
  };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  const scriptPath = path.join(__dirname, '..', '..', '.claude', 'skills', 'atlas-gates', 'scripts', 'act-evaluator.js');
  let exitCode = 0;
  let output = '';
  try {
    output = execSync(`node "${scriptPath}" "${tempDir}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch (err) {
    exitCode = err.status;
    output = err.stdout;
  }

  assert.strictEqual(exitCode, 1);
  const result = JSON.parse(output);
  assert.strictEqual(result.status, 'BLOCKED');
  assert.ok(result.blocking[0].includes('exceeded the cap (3) for the FAST profile'));

  cleanup();
});

addTest('act-evaluator - stuck state warning', () => {
  setup();

  const state = {
    schema_version: '2.0',
    risk_profile: 'STANDARD',
    work_mode: 'FEATURE',
    attempt: 2,
    consecutive_failures: 2 // stuck state!
  };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  const scriptPath = path.join(__dirname, '..', '..', '.claude', 'skills', 'atlas-gates', 'scripts', 'act-evaluator.js');
  let output;
  try {
    output = execSync(`node "${scriptPath}" "${tempDir}"`, { encoding: 'utf8' });
  } catch (err) {
    console.error('Command failed output:', err.stdout || err.message);
    throw err;
  }

  const result = JSON.parse(output);
  assert.strictEqual(result.status, 'PASS');
  assert.ok(result.warnings[0].includes('Stuck state warning: 2 consecutive failures detected'));

  cleanup();
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
