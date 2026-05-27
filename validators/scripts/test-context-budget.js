/**
 * Test suite for lib/context-budget.js and lib/context-policy-validator.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  estimateBudget,
  computeOutcome,
  loadPolicyConfig,
  DEFAULT_POLICY
} = require('../../lib/context-budget');

const {
  validatePolicyConfig,
  validateContextPack,
  validateHandoffArtifact
} = require('../../lib/context-policy-validator');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
    console.error(`    Expected: ${expectedStr}`);
    console.error(`    Actual:   ${actualStr}`);
  }
}

// ============================================================
// computeOutcome tests
// ============================================================

console.log('--- computeOutcome ---');

{
  assert(computeOutcome(0, 'x', DEFAULT_POLICY) === 'inline', 'computeOutcome: 0 bytes should be inline');
  assert(computeOutcome(50000, 'x', DEFAULT_POLICY) === 'inline', 'computeOutcome: 50KB threshold boundary should be inline');
  assert(computeOutcome(50001, 'x', DEFAULT_POLICY) === 'context_pack_required', 'computeOutcome: 50001 bytes should be context_pack_required');
  assert(computeOutcome(200000, 'x', DEFAULT_POLICY) === 'context_pack_required', 'computeOutcome: 200KB threshold boundary should be context_pack_required');
  assert(computeOutcome(200001, 'x', DEFAULT_POLICY) === 'fresh_session_required', 'computeOutcome: 200001 bytes should be fresh_session_required');
}

{
  // Stage overrides
  const policy = Object.assign({}, DEFAULT_POLICY, {
    stage_overrides: {
      heavy_stage: { outcome: 'fresh_session_required' },
      light_stage: { outcome: 'inline' }
    }
  });
  
  assert(computeOutcome(0, 'heavy_stage', policy) === 'fresh_session_required', 'computeOutcome: override forces fresh_session_required even at 0 bytes');
  assert(computeOutcome(999999, 'light_stage', policy) === 'inline', 'computeOutcome: override forces inline even at 1MB');
}

// ============================================================
// loadPolicyConfig tests
// ============================================================

console.log('--- loadPolicyConfig ---');

{
  // Missing file -> returns default policy
  const tempEmptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'context-budget-test-'));
  const config = loadPolicyConfig(tempEmptyDir);
  assertDeepEqual(config, DEFAULT_POLICY, 'loadPolicyConfig: missing file returns defaults');
  fs.rmdirSync(tempEmptyDir);
}

{
  // Valid file -> merges config
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'context-budget-test-'));
  const stateDir = path.join(tempDir, '.ai/state');
  fs.mkdirSync(stateDir, { recursive: true });
  
  const customConfig = {
    schema_version: '1.0',
    inline_threshold_bytes: 1000,
    pack_threshold_bytes: 5000,
    max_parallelism: 5,
    stage_overrides: {
      custom: { outcome: 'inline' }
    },
    budget_inputs: {
      include_session_logs: false
    }
  };
  
  fs.writeFileSync(path.join(stateDir, 'context-policy.json'), JSON.stringify(customConfig), 'utf8');
  
  const loaded = loadPolicyConfig(tempDir);
  assert(loaded.inline_threshold_bytes === 1000, 'loadPolicyConfig: custom inline_threshold_bytes loaded');
  assert(loaded.pack_threshold_bytes === 5000, 'loadPolicyConfig: custom pack_threshold_bytes loaded');
  assert(loaded.max_parallelism === 5, 'loadPolicyConfig: custom max_parallelism loaded');
  assert(loaded.stage_overrides.custom.outcome === 'inline', 'loadPolicyConfig: stage_overrides merged');
  assert(loaded.budget_inputs.include_session_logs === false, 'loadPolicyConfig: budget_inputs boolean overridden');
  assert(loaded.budget_inputs.include_required_artifacts === true, 'loadPolicyConfig: budget_inputs omitted keys remain default');
  
  // Clean up
  fs.unlinkSync(path.join(stateDir, 'context-policy.json'));
  fs.rmdirSync(stateDir);
  fs.rmdirSync(path.join(tempDir, '.ai'));
  fs.rmdirSync(tempDir);
}

// ============================================================
// estimateBudget tests
// ============================================================

console.log('--- estimateBudget ---');

{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'context-budget-test-'));
  
  // Create folders
  const sessionsDir = path.join(tempDir, '.ai/sessions');
  const contextPacksDir = path.join(tempDir, '.ai/context-packs');
  const stateDir = path.join(tempDir, '.ai/state');
  const phasesDir = path.join(tempDir, '.planning/phases/16-context-budget-test');
  
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.mkdirSync(contextPacksDir, { recursive: true });
  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(phasesDir, { recursive: true });
  
  // Write some files with content
  fs.writeFileSync(path.join(sessionsDir, 'session-1.md'), '12345', 'utf8'); // 5 bytes
  fs.writeFileSync(path.join(sessionsDir, 'session-2.md'), '1234567890', 'utf8'); // 10 bytes
  fs.writeFileSync(path.join(phasesDir, 'PLAN.md'), 'planning-data', 'utf8'); // 13 bytes
  fs.writeFileSync(path.join(contextPacksDir, 'pack-1.json'), 'pack-data', 'utf8'); // 9 bytes
  fs.writeFileSync(path.join(stateDir, 'context-handoff.json'), 'handoff', 'utf8'); // 7 bytes
  
  // Create dummy file for required artifacts
  fs.writeFileSync(path.join(tempDir, 'art-1.md'), 'hello', 'utf8'); // 5 bytes
  
  const flowStage = {
    id: 'my_stage',
    required_artifacts: [
      { path: 'art-1.md' },
      { path: 'missing-art.md' } // doesn't exist
    ]
  };
  
  const result = estimateBudget(flowStage, tempDir, { phase_id: '16-context-budget-test' });
  
  // Total expected bytes:
  // session logs: 5 + 10 = 15
  // planning: 13
  // context packs: 9
  // handoff: 7
  // required artifacts: 5
  // Total: 49 bytes
  assert(result.totalBytes === 49, `estimateBudget: total size expected 49, got ${result.totalBytes}`);
  assert(result.inputs.length === 6, `estimateBudget: inputs array length expected 6, got ${result.inputs.length}`);
  
  // Verify try-catch safety on missing paths: missing-art.md didn't throw and contributed 0
  const missingArtInput = result.inputs.find(i => i.path === 'missing-art.md');
  assert(!missingArtInput, 'estimateBudget: non-existent required artifacts should not be in inputs');
  
  // Clean up
  fs.unlinkSync(path.join(sessionsDir, 'session-1.md'));
  fs.unlinkSync(path.join(sessionsDir, 'session-2.md'));
  fs.unlinkSync(path.join(phasesDir, 'PLAN.md'));
  fs.unlinkSync(path.join(contextPacksDir, 'pack-1.json'));
  fs.unlinkSync(path.join(stateDir, 'context-handoff.json'));
  fs.unlinkSync(path.join(tempDir, 'art-1.md'));
  
  fs.rmdirSync(sessionsDir);
  fs.rmdirSync(contextPacksDir);
  fs.rmdirSync(stateDir);
  fs.rmdirSync(path.join(tempDir, '.ai'));
  
  fs.rmdirSync(phasesDir);
  fs.rmdirSync(path.join(tempDir, '.planning/phases'));
  fs.rmdirSync(path.join(tempDir, '.planning'));
  
  fs.rmdirSync(tempDir);
}

// ============================================================
// validatePolicyConfig tests
// ============================================================

console.log('--- validatePolicyConfig ---');

{
  // Valid config
  const validConfig = {
    schema_version: '1.0',
    inline_threshold_bytes: 50000,
    pack_threshold_bytes: 200000,
    max_parallelism: 3,
    stage_overrides: {},
    budget_inputs: {
      include_required_artifacts: true,
      include_session_logs: true,
      include_planning_artifacts: true,
      include_context_packs: true,
      include_handoff_files: true
    }
  };
  const result = validatePolicyConfig(validConfig);
  assert(result.valid, 'validatePolicyConfig: valid config passes');
}

{
  // Invalid config: inline >= pack threshold
  const invalidConfig = {
    schema_version: '1.0',
    inline_threshold_bytes: 300000,
    pack_threshold_bytes: 200000,
    max_parallelism: 3,
    stage_overrides: {},
    budget_inputs: {
      include_required_artifacts: true,
      include_session_logs: true,
      include_planning_artifacts: true,
      include_context_packs: true,
      include_handoff_files: true
    }
  };
  const result = validatePolicyConfig(invalidConfig);
  assert(!result.valid, 'validatePolicyConfig: inline >= pack threshold fails');
  assert(result.errors.some(e => e.includes('strictly less than')), 'validatePolicyConfig: error message matches threshold comparison');
}

{
  // Invalid config: max_parallelism > 10
  const invalidConfig = {
    schema_version: '1.0',
    inline_threshold_bytes: 50000,
    pack_threshold_bytes: 200000,
    max_parallelism: 11,
    stage_overrides: {},
    budget_inputs: {
      include_required_artifacts: true,
      include_session_logs: true,
      include_planning_artifacts: true,
      include_context_packs: true,
      include_handoff_files: true
    }
  };
  const result = validatePolicyConfig(invalidConfig);
  assert(!result.valid, 'validatePolicyConfig: max_parallelism > 10 fails');
}

{
  // Invalid config: stage_overrides invalid outcome
  const invalidConfig = {
    schema_version: '1.0',
    inline_threshold_bytes: 50000,
    pack_threshold_bytes: 200000,
    max_parallelism: 3,
    stage_overrides: {
      bad_stage: { outcome: 'INVALID_OUTCOME' }
    },
    budget_inputs: {
      include_required_artifacts: true,
      include_session_logs: true,
      include_planning_artifacts: true,
      include_context_packs: true,
      include_handoff_files: true
    }
  };
  const result = validatePolicyConfig(invalidConfig);
  assert(!result.valid, 'validatePolicyConfig: invalid stage override outcome fails');
}

// ============================================================
// validateContextPack tests
// ============================================================

console.log('--- validateContextPack ---');

{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'context-budget-test-'));
  const subDir = path.join(tempDir, '.ai/context-packs');
  fs.mkdirSync(subDir, { recursive: true });
  
  // Create mock required files
  fs.writeFileSync(path.join(tempDir, 'file-1.md'), 'content', 'utf8');
  
  const validPack = {
    schema_version: '1.0',
    created_at: '2026-05-27T10:30:00Z',
    stage_id: 'execution',
    objective: 'Test execution goal',
    required_files: [
      { path: 'file-1.md', reason: 'exists' }
    ],
    omissions: [],
    expected_outputs: [
      { path: 'file-2.md', description: 'will be created' }
    ],
    validation_commands: ['npm test'],
    stop_conditions: ['Tests pass']
  };
  
  const packPath = path.join(subDir, 'pack.json');
  fs.writeFileSync(packPath, JSON.stringify(validPack), 'utf8');
  
  const result = validateContextPack(packPath);
  assert(result.valid, 'validateContextPack: valid context pack passes');
  
  // Clean up
  fs.unlinkSync(path.join(tempDir, 'file-1.md'));
  fs.unlinkSync(packPath);
  fs.rmdirSync(subDir);
  fs.rmdirSync(path.join(tempDir, '.ai'));
  fs.rmdirSync(tempDir);
}

{
  // Path traversal check
  const invalidPack = {
    schema_version: '1.0',
    created_at: '2026-05-27T10:30:00Z',
    stage_id: 'execution',
    objective: 'Test execution goal',
    required_files: [
      { path: '../outside.md' }
    ],
    omissions: [],
    expected_outputs: [
      { path: '/absolute/file.md', description: 'no absolute paths' }
    ],
    validation_commands: ['npm test'],
    stop_conditions: ['Tests pass']
  };
  
  const result = validateContextPack(invalidPack);
  assert(!result.valid, 'validateContextPack: traversal paths fail');
  assert(result.errors.length === 2, `validateContextPack: expected 2 path validation errors, got ${result.errors.length}`);
}

{
  // D-16-07: Reference by path vs embeds inline body
  const bodyPack = {
    schema_version: '1.0',
    created_at: '2026-05-27T10:30:00Z',
    stage_id: 'execution',
    objective: 'Test execution goal',
    required_files: [
      { path: 'A'.repeat(1025) } // Path size too large represents file body
    ],
    omissions: [],
    expected_outputs: [
      { path: 'file-2.md', description: 'valid' }
    ],
    validation_commands: ['npm test'],
    stop_conditions: ['Tests pass']
  };
  const result = validateContextPack(bodyPack);
  assert(!result.valid, 'validateContextPack: embeds file body fails');
  assert(result.errors.some(e => e.includes('embeds file body instead of path reference (D-16-07)')), 'validateContextPack: correct D-16-07 error message');
}

{
  // Fan-out write target overlap without coordination note
  const myPack = {
    schema_version: '1.0',
    created_at: '2026-05-27T10:30:00Z',
    stage_id: 'execution',
    objective: 'Goal',
    required_files: [],
    omissions: [],
    expected_outputs: [],
    validation_commands: [],
    stop_conditions: [],
    subagent_fanout: {
      group_id: 'wave-1',
      subagent_index: 0,
      total_subagents: 2,
      write_targets: ['shared-file.js'],
      sequential_inline_fallback: true,
      join_owner: 'parent'
    }
  };
  
  const siblingPack = {
    schema_version: '1.0',
    created_at: '2026-05-27T10:30:00Z',
    stage_id: 'execution',
    objective: 'Goal',
    required_files: [],
    omissions: [],
    expected_outputs: [],
    validation_commands: [],
    stop_conditions: [],
    subagent_fanout: {
      group_id: 'wave-1',
      subagent_index: 1,
      total_subagents: 2,
      write_targets: ['shared-file.js'], // overlap target!
      sequential_inline_fallback: true,
      join_owner: 'parent'
    }
  };
  
  const result = validateContextPack(myPack, [siblingPack]);
  assert(!result.valid, 'validateContextPack: write target overlap fails when coordination note is missing');
  assert(result.errors.some(e => e.includes('Overlap in write targets detected')), 'validateContextPack: correct overlap error message');
  
  // Add coordination note to pass
  myPack.subagent_fanout.coordination_note = 'Developer A handles block 1, B handles block 2';
  const resultPassed = validateContextPack(myPack, [siblingPack]);
  assert(resultPassed.valid, 'validateContextPack: write target overlap passes when coordination note is present');
}

// ============================================================
// validateHandoffArtifact tests
// ============================================================

console.log('--- validateHandoffArtifact ---');

{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'context-budget-test-'));
  const stateDir = path.join(tempDir, '.ai/state');
  const packsDir = path.join(tempDir, '.ai/context-packs');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(packsDir, { recursive: true });
  
  const packPath = path.join(packsDir, 'my-pack.json');
  fs.writeFileSync(packPath, '{}', 'utf8');
  
  const handoff = {
    schema_version: '1.0',
    created_at: '2026-05-27T10:35:00Z',
    resume_stage: 'execution',
    next_skill: 'gsd-execute-phase',
    context_pack_path: '.ai/context-packs/my-pack.json',
    verification_commands: ['npm test'],
    reason: 'accumulated logs exceeded 200KB'
  };
  
  const handoffPath = path.join(stateDir, 'context-handoff.json');
  fs.writeFileSync(handoffPath, JSON.stringify(handoff), 'utf8');
  
  const result = validateHandoffArtifact(handoffPath, ['execution']);
  assert(result.valid, 'validateHandoffArtifact: valid handoff passes');
  
  // Clean up
  fs.unlinkSync(packPath);
  fs.unlinkSync(handoffPath);
  fs.rmdirSync(stateDir);
  fs.rmdirSync(packsDir);
  fs.rmdirSync(path.join(tempDir, '.ai'));
  fs.rmdirSync(tempDir);
}

{
  // Missing pack file
  const handoff = {
    schema_version: '1.0',
    created_at: '2026-05-27T10:35:00Z',
    resume_stage: 'execution',
    next_skill: 'gsd-execute-phase',
    context_pack_path: '.ai/context-packs/missing.json', // missing file
    verification_commands: ['npm test'],
    reason: 'reason'
  };
  
  const result = validateHandoffArtifact(handoff, ['execution']);
  assert(!result.valid, 'validateHandoffArtifact: missing context pack fails');
}

// ============================================================
// Summary
// ============================================================

console.log('');
console.log(`Context budget tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
