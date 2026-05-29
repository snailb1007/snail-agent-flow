'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

function runNode(args, options = {}) {
  const res = spawnSync(process.execPath, args, {
    ...options,
    encoding: 'utf8'
  });
  if (res.status !== 0) {
    throw new Error(`node ${args.join(' ')} failed: ${res.stderr || res.stdout || (res.error && res.error.message)}`);
  }
  return res.stdout;
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-e2e-test-'));

// Bootstrap minimal file layout for CLI init
const projectDir = path.join(tempDir, 'project');
fs.mkdirSync(path.join(projectDir, '.claude', 'skills', 'contracts'), { recursive: true });
fs.copyFileSync(
  path.resolve(__dirname, '..', '..', '.claude', 'skills', 'contracts', 'artifact-map.json'),
  path.join(projectDir, '.claude', 'skills', 'contracts', 'artifact-map.json')
);
fs.copyFileSync(
  path.resolve(__dirname, '..', '..', '.claude', 'skills', 'contracts', 'entities.schema.json'),
  path.join(projectDir, '.claude', 'skills', 'contracts', 'entities.schema.json')
);
fs.copyFileSync(
  path.resolve(__dirname, '..', '..', '.claude', 'skills', 'contracts', 'gate-result.schema.json'),
  path.join(projectDir, '.claude', 'skills', 'contracts', 'gate-result.schema.json')
);

// Pre-create mock skill folders to satisfy prerequisite checks
const skills = ['gsd-discuss-phase', 'using-superpowers', 'speckit-specify', 'plan-ceo-review'];
for (const s of skills) {
  fs.mkdirSync(path.join(projectDir, '.agents/skills', s), { recursive: true });
}

// Bootstrap node_modules/package.json
fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');

// Run adp init
runNode([path.resolve(__dirname, '../../bin/adp.js'), 'init'], { cwd: projectDir });

// 1. Align
const taskJson = JSON.stringify({
  slug: 'e2e-task',
  novelty: 0,
  blast_radius: 0,
  ambiguity: 0,
  reversibility: 0,
  user_biz_risk: 0
});
const alignRes = runNode([
  path.resolve(__dirname, '../../.claude/skills/atlas-routing/scripts/score-and-claim.js'),
  taskJson,
  projectDir
]);
const alignGate = JSON.parse(alignRes);
assert.strictEqual(alignGate.status, 'PASS');

// 2. Trace -> Skip align-gate & resolve next stage (trace)
const trans1Res = runNode([
  path.resolve(__dirname, '../../.claude/skills/atlas-routing/scripts/transition.js'),
  projectDir
]);
const trans1 = JSON.parse(trans1Res);
assert.strictEqual(trans1.next_stage, 'trace');

// 3. Lay
// Simulate lay entry
const state = JSON.parse(fs.readFileSync(path.join(projectDir, '.ai', 'state', 'flow-state.json'), 'utf8'));
state.stage = 'lay';
state.last_verified_commit = 'commit-123';
state.locks = [{ file: 'test-file.js', acquired_at: new Date().toISOString() }];
fs.writeFileSync(path.join(projectDir, '.ai', 'state', 'flow-state.json'), JSON.stringify(state, null, 2));

// Create a dummy test file to pass lay checks
fs.mkdirSync(path.join(projectDir, 'validators', 'scripts'), { recursive: true });
fs.writeFileSync(path.join(projectDir, 'validators', 'scripts', 'test-dummy.js'), '// failing mock test');

const layRes = runNode([
  path.resolve(__dirname, '../../.claude/skills/atlas-gates/scripts/lay-preflight.js'),
  projectDir
]);
const layGate = JSON.parse(layRes);
assert.strictEqual(layGate.status, 'PASS');

// 4. Settle
// Release locks
runNode([
  path.resolve(__dirname, '../../.claude/skills/atlas-settle/scripts/release-locks.js'),
  projectDir
]);
const finalState = JSON.parse(fs.readFileSync(path.join(projectDir, '.ai', 'state', 'flow-state.json'), 'utf8'));
assert.deepStrictEqual(finalState.locks, []);

// Cleanup
try {
  fs.rmSync(tempDir, { recursive: true, force: true });
} catch (e) {}

console.log('[PASS] E2E Integration test succeeded');
