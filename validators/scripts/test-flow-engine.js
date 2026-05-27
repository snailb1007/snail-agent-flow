/**
 * Test suite for lib/flow-engine.js
 * Tests: validateLedger, resolveNextStage, checkArtifacts, advanceStage,
 *        triggerRevision, formatStageInstruction
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  VALID_STATUSES,
  validateLedger,
  resolveNextStage,
  resolveTemplatePath,
  checkArtifacts,
  advanceStage,
  triggerRevision,
  formatStageInstruction,
  checkStagePrerequisites
} = require('../../lib/flow-engine');

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

function createMockLedger(statusOverrides) {
  const stages = [
    { id: 'decision_discovery', name: 'Decision discovery', status: 'pending', artifacts: [], gate_result: null, started_at: null, completed_at: null, revision_count: 0 },
    { id: 'decision_challenge', name: 'Decision challenge', status: 'pending', artifacts: [], gate_result: null, started_at: null, completed_at: null, revision_count: 0 },
    { id: 'canonical_spec', name: 'Canonical spec', status: 'pending', artifacts: [], gate_result: null, started_at: null, completed_at: null, revision_count: 0 },
    { id: 'implementation_plan', name: 'Implementation plan', status: 'pending', artifacts: [], gate_result: null, started_at: null, completed_at: null, revision_count: 0 },
    { id: 'plan_critique', name: 'Plan critique', status: 'pending', artifacts: [], gate_result: null, started_at: null, completed_at: null, revision_count: 0 }
  ];

  if (statusOverrides) {
    for (const [id, status] of Object.entries(statusOverrides)) {
      const stage = stages.find(s => s.id === id);
      if (stage) stage.status = status;
    }
  }

  return {
    flow_name: 'test-flow',
    flow_version: '1.0.0',
    flow_definition_path: '.ai/flows/test-flow.yaml',
    current_stage: stages.find(s => s.status !== 'done')?.id || null,
    created_at: '2026-05-25T00:00:00.000Z',
    updated_at: '2026-05-25T00:00:00.000Z',
    stages,
    revision_history: []
  };
}

function createMockFlowDefinition() {
  return {
    name: 'test-flow',
    version: '1.0.0',
    stages: [
      { id: 'decision_discovery', name: 'Decision discovery', skill: 'gsd-discuss-phase', command: 'node bin/adp.js new-session discuss', required_artifacts: [{ path: '.planning/phases/{phase_id}-CONTEXT.md', headings: ['## Decisions'] }], revision_routing: [] },
      { id: 'decision_challenge', name: 'Decision challenge', skill: 'grill-with-docs', required_artifacts: [{ path: '.planning/phases/{phase_id}-CHALLENGE-NOTES.md' }], revision_routing: [{ on: 'challenge_failed', to: 'decision_discovery' }] },
      { id: 'canonical_spec', name: 'Canonical spec', skill: 'speckit-specify', required_artifacts: [{ path: '{feature_dir}/spec.md', headings: ['## Goal'] }], revision_routing: [] },
      { id: 'implementation_plan', name: 'Implementation plan', skill: 'speckit-plan', required_artifacts: [{ path: '{feature_dir}/plan.md' }], revision_routing: [] },
      { id: 'plan_critique', name: 'Plan critique', skill: 'plan-ceo-review', required_artifacts: [], revision_routing: [{ on: 'spec_failed', to: 'canonical_spec' }] }
    ]
  };
}

// ============================================================
// validateLedger tests
// ============================================================

console.log('--- validateLedger ---');

{
  const result = validateLedger(null);
  assert(!result.valid, 'validateLedger: null input should be invalid');
  assert(result.errors.length > 0, 'validateLedger: null input should have errors');
}

{
  const ledger = createMockLedger();
  const result = validateLedger(ledger);
  assert(result.valid, 'validateLedger: valid ledger should pass');
  assert(result.errors.length === 0, 'validateLedger: valid ledger should have no errors');
}

{
  const ledger = createMockLedger();
  delete ledger.flow_name;
  const result = validateLedger(ledger);
  assert(!result.valid, 'validateLedger: missing flow_name should be invalid');
}

{
  const ledger = createMockLedger();
  ledger.stages[0].status = 'INVALID';
  const result = validateLedger(ledger);
  assert(!result.valid, 'validateLedger: invalid status should be invalid');
  assert(result.errors.some(e => e.includes('INVALID')), 'validateLedger: error should mention invalid status');
}

{
  const ledger = createMockLedger();
  ledger.stages[0].id = '';
  const result = validateLedger(ledger);
  assert(!result.valid, 'validateLedger: empty stage id should be invalid');
}

{
  const ledger = createMockLedger();
  delete ledger.revision_history;
  const result = validateLedger(ledger);
  assert(!result.valid, 'validateLedger: missing revision_history should be invalid');
}

// ============================================================
// resolveNextStage tests
// ============================================================

console.log('--- resolveNextStage ---');

{
  const ledger = createMockLedger();
  const flow = createMockFlowDefinition();
  const result = resolveNextStage(ledger, flow);
  assert(result !== null, 'resolveNextStage: should return a result when stages are pending');
  assert(result.ledgerStage.id === 'decision_discovery', 'resolveNextStage: all pending should return first stage');
  assert(result.flowStage !== null, 'resolveNextStage: should include flow stage metadata');
  assert(result.flowStage.skill === 'gsd-discuss-phase', 'resolveNextStage: flow stage should have correct skill');
}

{
  const ledger = createMockLedger({ decision_discovery: 'done' });
  const flow = createMockFlowDefinition();
  const result = resolveNextStage(ledger, flow);
  assert(result.ledgerStage.id === 'decision_challenge', 'resolveNextStage: first done should skip to second');
}

{
  const ledger = createMockLedger({ decision_discovery: 'done', canonical_spec: 'needs_revision' });
  const flow = createMockFlowDefinition();
  const result = resolveNextStage(ledger, flow);
  assert(result.ledgerStage.id === 'canonical_spec', 'resolveNextStage: needs_revision should take priority over pending');
}

{
  const ledger = createMockLedger({
    decision_discovery: 'done',
    decision_challenge: 'done',
    canonical_spec: 'done',
    implementation_plan: 'done',
    plan_critique: 'done'
  });
  const flow = createMockFlowDefinition();
  const result = resolveNextStage(ledger, flow);
  assert(result === null, 'resolveNextStage: all done should return null');
}

{
  const result = resolveNextStage(null, null);
  assert(result === null, 'resolveNextStage: null ledger should return null');
}

// ============================================================
// resolveTemplatePath tests
// ============================================================

console.log('--- resolveTemplatePath ---');

{
  const resolved = resolveTemplatePath('{feature_dir}/spec.md', { feature_dir: 'specs/010-test' });
  assert(resolved === 'specs/010-test/spec.md', 'resolveTemplatePath: should resolve {feature_dir}');
}

{
  const resolved = resolveTemplatePath('.planning/phases/{phase_id}-CONTEXT.md', { phase_id: '10-flow-engine-skill' });
  assert(resolved === '.planning/phases/10-flow-engine-skill-CONTEXT.md', 'resolveTemplatePath: should resolve {phase_id}');
}

{
  const resolved = resolveTemplatePath('no-vars.md', {});
  assert(resolved === 'no-vars.md', 'resolveTemplatePath: path without variables should be unchanged');
}

{
  const resolved = resolveTemplatePath(null, {});
  assert(resolved === null, 'resolveTemplatePath: null path should return null');
}

// ============================================================
// checkArtifacts tests
// ============================================================

console.log('--- checkArtifacts ---');

{
  // Create temp directory with test files
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flow-engine-test-'));
  const testFile = path.join(tmpDir, 'test-artifact.md');
  fs.writeFileSync(testFile, '# Test Content\n', 'utf8');

  const flowStage = {
    id: 'test',
    required_artifacts: [{ path: 'test-artifact.md' }]
  };

  const result = checkArtifacts(flowStage, tmpDir, {});
  assert(result.passed, 'checkArtifacts: existing non-empty file should pass');
  assert(result.results.length === 1, 'checkArtifacts: should have 1 result');
  assert(result.results[0].exists, 'checkArtifacts: file should exist');
  assert(result.results[0].nonEmpty, 'checkArtifacts: file should be non-empty');

  // Cleanup
  fs.unlinkSync(testFile);
  fs.rmdirSync(tmpDir);
}

{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flow-engine-test-'));

  const flowStage = {
    id: 'test',
    required_artifacts: [{ path: 'missing-file.md' }]
  };

  const result = checkArtifacts(flowStage, tmpDir, {});
  assert(!result.passed, 'checkArtifacts: missing file should fail');
  assert(!result.results[0].exists, 'checkArtifacts: missing file should not exist');

  fs.rmdirSync(tmpDir);
}

{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flow-engine-test-'));
  const emptyFile = path.join(tmpDir, 'empty.md');
  fs.writeFileSync(emptyFile, '', 'utf8');

  const flowStage = {
    id: 'test',
    required_artifacts: [{ path: 'empty.md' }]
  };

  const result = checkArtifacts(flowStage, tmpDir, {});
  assert(!result.passed, 'checkArtifacts: empty file should fail');
  assert(result.results[0].exists, 'checkArtifacts: empty file should exist');
  assert(!result.results[0].nonEmpty, 'checkArtifacts: empty file should not be non-empty');

  fs.unlinkSync(emptyFile);
  fs.rmdirSync(tmpDir);
}

{
  // Test template variable resolution
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flow-engine-test-'));
  const subDir = path.join(tmpDir, 'specs', '010-test');
  fs.mkdirSync(subDir, { recursive: true });
  fs.writeFileSync(path.join(subDir, 'spec.md'), '# Spec\n', 'utf8');

  const flowStage = {
    id: 'test',
    required_artifacts: [{ path: '{feature_dir}/spec.md' }]
  };

  const result = checkArtifacts(flowStage, tmpDir, { feature_dir: 'specs/010-test' });
  assert(result.passed, 'checkArtifacts: template variable resolution should work');

  // Cleanup
  fs.unlinkSync(path.join(subDir, 'spec.md'));
  fs.rmdirSync(subDir);
  fs.rmdirSync(path.join(tmpDir, 'specs'));
  fs.rmdirSync(tmpDir);
}

{
  // No required_artifacts — should pass
  const flowStage = { id: 'test' };
  const result = checkArtifacts(flowStage, '/tmp', {});
  assert(result.passed, 'checkArtifacts: no required_artifacts should pass');
  assert(result.results.length === 0, 'checkArtifacts: no results for no artifacts');
}

// ============================================================
// advanceStage tests
// ============================================================

console.log('--- advanceStage ---');

{
  const ledger = createMockLedger({ decision_discovery: 'in_progress' });
  const result = advanceStage(ledger, 'decision_discovery', ['path/to/context.md']);
  assert(result.stages[0].status === 'done', 'advanceStage: status should be done');
  assert(result.stages[0].completed_at !== null, 'advanceStage: completed_at should be set');
  assertDeepEqual(result.stages[0].artifacts, ['path/to/context.md'], 'advanceStage: artifacts should be recorded');
  assert(result.current_stage === 'decision_challenge', 'advanceStage: current_stage should advance');
  assert(result.updated_at !== '2026-05-25T00:00:00.000Z', 'advanceStage: updated_at should change');
}

{
  // Advance last stage — current_stage should be null
  const ledger = createMockLedger({
    decision_discovery: 'done',
    decision_challenge: 'done',
    canonical_spec: 'done',
    implementation_plan: 'done',
    plan_critique: 'in_progress'
  });
  const result = advanceStage(ledger, 'plan_critique', ['review.md']);
  assert(result.current_stage === null, 'advanceStage: all done should set current_stage to null');
}

{
  // Advance with empty artifacts
  const ledger = createMockLedger({ decision_discovery: 'in_progress' });
  const result = advanceStage(ledger, 'decision_discovery', []);
  assertDeepEqual(result.stages[0].artifacts, [], 'advanceStage: empty artifacts should be ok');
}

{
  // Error: invalid stage id
  const ledger = createMockLedger();
  let threw = false;
  try {
    advanceStage(ledger, 'nonexistent', []);
  } catch (e) {
    threw = true;
    assert(e.message.includes('nonexistent'), 'advanceStage: error should mention stage id');
  }
  assert(threw, 'advanceStage: should throw for nonexistent stage');
}

// ============================================================
// triggerRevision tests
// ============================================================

console.log('--- triggerRevision ---');

{
  const ledger = createMockLedger({
    decision_discovery: 'done',
    decision_challenge: 'done',
    canonical_spec: 'done',
    implementation_plan: 'done',
    plan_critique: 'in_progress'
  });
  // Simulate revision from plan_critique back to canonical_spec
  const result = triggerRevision(ledger, 'plan_critique', 'canonical_spec', 'Spec incomplete');

  assert(result.stages[2].status === 'needs_revision', 'triggerRevision: target stage should be needs_revision');
  assert(result.stages[3].status === 'needs_revision', 'triggerRevision: intermediate stage should be needs_revision');
  assert(result.stages[4].status === 'needs_revision', 'triggerRevision: source stage should be needs_revision');
  assert(result.stages[0].status === 'done', 'triggerRevision: unaffected stages should remain done');
  assert(result.stages[1].status === 'done', 'triggerRevision: unaffected stages should remain done');
  assert(result.current_stage === 'canonical_spec', 'triggerRevision: current_stage should be target');
  assert(result.revision_history.length === 1, 'triggerRevision: should log revision');
  assert(result.revision_history[0].from_stage === 'plan_critique', 'triggerRevision: log should have from_stage');
  assert(result.revision_history[0].to_stage === 'canonical_spec', 'triggerRevision: log should have to_stage');
  assert(result.revision_history[0].reason === 'Spec incomplete', 'triggerRevision: log should have reason');
}

{
  // Edge case: revision to immediately previous stage
  const ledger = createMockLedger({
    decision_discovery: 'done',
    decision_challenge: 'in_progress'
  });
  const result = triggerRevision(ledger, 'decision_challenge', 'decision_discovery', 'Challenge found issue');

  assert(result.stages[0].status === 'needs_revision', 'triggerRevision: adjacent target should be needs_revision');
  assert(result.stages[1].status === 'needs_revision', 'triggerRevision: adjacent source should be needs_revision');
  assert(result.current_stage === 'decision_discovery', 'triggerRevision: adjacent revision current_stage correct');
}

{
  // Edge case: revision to first stage from later
  const ledger = createMockLedger({
    decision_discovery: 'done',
    decision_challenge: 'done',
    canonical_spec: 'done',
    implementation_plan: 'in_progress'
  });
  const result = triggerRevision(ledger, 'implementation_plan', 'decision_discovery', 'Wrong decisions');

  for (let i = 0; i <= 3; i++) {
    assert(result.stages[i].status === 'needs_revision', `triggerRevision: stage ${i} should be needs_revision`);
  }
  assert(result.stages[4].status === 'pending', 'triggerRevision: later pending stage should remain pending');
}

{
  // Verify artifacts are cleared on revision
  const ledger = createMockLedger({
    decision_discovery: 'done',
    decision_challenge: 'done',
    canonical_spec: 'done',
    implementation_plan: 'in_progress'
  });
  ledger.stages[2].artifacts = ['old-spec.md'];
  ledger.stages[2].gate_result = 'pass';

  const result = triggerRevision(ledger, 'implementation_plan', 'canonical_spec', 'Spec wrong');
  assertDeepEqual(result.stages[2].artifacts, [], 'triggerRevision: artifacts should be cleared');
  assert(result.stages[2].gate_result === null, 'triggerRevision: gate_result should be cleared');
}

{
  // Verify revision_count increments
  const ledger = createMockLedger({
    decision_discovery: 'done',
    decision_challenge: 'done',
    canonical_spec: 'done'
  });
  ledger.stages[1].revision_count = 1;
  const result = triggerRevision(ledger, 'canonical_spec', 'decision_challenge', 'Need re-challenge');
  assert(result.stages[1].revision_count === 2, 'triggerRevision: revision_count should increment');
  assert(result.stages[2].revision_count === 1, 'triggerRevision: previously zero revision_count should become 1');
}

{
  // Error: target after source
  const ledger = createMockLedger();
  let threw = false;
  try {
    triggerRevision(ledger, 'decision_discovery', 'canonical_spec', 'Wrong order');
  } catch (e) {
    threw = true;
    assert(e.message.includes('must be before'), 'triggerRevision: error should mention order');
  }
  assert(threw, 'triggerRevision: should throw if target is after source');
}

// ============================================================
// formatStageInstruction tests
// ============================================================

console.log('--- formatStageInstruction ---');

{
  const flowStage = {
    id: 'decision_discovery',
    name: 'Decision discovery',
    skill: 'gsd-discuss-phase',
    command: 'node bin/adp.js new-session discuss',
    required_artifacts: [
      { path: '.planning/phases/{phase_id}-CONTEXT.md', headings: ['## Decisions'] }
    ],
    revision_routing: []
  };
  const ledgerStage = { id: 'decision_discovery', status: 'pending' };

  const output = formatStageInstruction(flowStage, ledgerStage);
  assert(output.includes('═══ NEXT STAGE ═══'), 'formatStageInstruction: should have header');
  assert(output.includes('Decision discovery'), 'formatStageInstruction: should include stage name');
  assert(output.includes('decision_discovery'), 'formatStageInstruction: should include stage id');
  assert(output.includes('gsd-discuss-phase'), 'formatStageInstruction: should include skill');
  assert(output.includes('node bin/adp.js'), 'formatStageInstruction: should include command');
  assert(output.includes('CONTEXT.md'), 'formatStageInstruction: should include artifact path');
  assert(output.includes('"## Decisions"'), 'formatStageInstruction: should include headings');
  assert(output.includes('═══════════════════'), 'formatStageInstruction: should have footer');
}

{
  // Stage with no command
  const flowStage = {
    id: 'decision_challenge',
    name: 'Decision challenge',
    skill: 'grill-with-docs',
    required_artifacts: [],
    revision_routing: [{ on: 'challenge_failed', to: 'decision_discovery' }]
  };
  const ledgerStage = { id: 'decision_challenge', status: 'needs_revision' };

  const output = formatStageInstruction(flowStage, ledgerStage);
  assert(!output.includes('Command:'), 'formatStageInstruction: no command should not have Command line');
  assert(output.includes('challenge_failed'), 'formatStageInstruction: should include revision routing');
  assert(output.includes('decision_discovery'), 'formatStageInstruction: should include revision target');
  assert(output.includes('needs_revision'), 'formatStageInstruction: should include current status');
}

// ============================================================
// checkStagePrerequisites tests
// ============================================================

console.log('--- checkStagePrerequisites ---');

{
  // Stage with no skill and no command passes automatically
  const flowStage = { id: 'test_stage' };
  const prerequisites = [{ name: 'GSD', command: 'gsd-discuss-phase' }];
  const result = checkStagePrerequisites(flowStage, prerequisites);
  assert(result.passed === true, 'checkStagePrerequisites: stage with no skill passes');
  assert(result.results.length === 0, 'checkStagePrerequisites: stage with no skill returns no results');
}

{
  // Substring/case-insensitive matching works (gsd-discuss-phase matches GSD)
  const flowStage = { id: 'decision_discovery', skill: 'gsd-discuss-phase' };
  const prerequisites = [
    {
      name: 'GSD',
      command: 'gsd-discuss-phase',
      check: 'node -v' // Dummy check command that will always pass
    }
  ];
  const result = checkStagePrerequisites(flowStage, prerequisites, __dirname);
  assert(result.passed === true, 'checkStagePrerequisites: matched prerequisite passes check');
  assert(result.results.length === 1, 'checkStagePrerequisites: returns exactly 1 result');
  assert(result.results[0].name === 'GSD', 'checkStagePrerequisites: result maps to matched prerequisite name');
  assert(result.results[0].available === true, 'checkStagePrerequisites: matches status as available');
}

{
  // Matched prerequisite is missing
  const flowStage = { id: 'decision_discovery', skill: 'gsd-discuss-phase' };
  const prerequisites = [
    {
      name: 'GSD',
      command: 'nonexistent-gsd-command',
      check: 'command -v nonexistent-gsd-command'
    }
  ];
  const result = checkStagePrerequisites(flowStage, prerequisites, __dirname);
  assert(result.passed === false, 'checkStagePrerequisites: failed prerequisite fails stage');
  assert(result.results.length === 1, 'checkStagePrerequisites: returns result for missing prerequisite');
  assert(result.results[0].available === false, 'checkStagePrerequisites: missing prerequisite is marked unavailable');
  assert(result.results[0].instructions !== undefined, 'checkStagePrerequisites: returns instructions for missing prerequisite');
  assert(result.results[0].description !== undefined, 'checkStagePrerequisites: returns description for missing prerequisite');
}

// ============================================================
// resolveNextStage contextPolicy tests
// ============================================================

console.log('--- resolveNextStage contextPolicy ---');

{
  const ledger = createMockLedger();
  const flow = createMockFlowDefinition();
  // Call with only 2 args (backward compatibility)
  const result = resolveNextStage(ledger, flow);
  assert(result !== null, 'resolveNextStage contextPolicy: 2-argument call should return result');
  assert(result.contextPolicy !== undefined, 'resolveNextStage contextPolicy: contextPolicy is present');
  assert(typeof result.contextPolicy.outcome === 'string', 'resolveNextStage contextPolicy: outcome is a string');
  assert(typeof result.contextPolicy.estimatedBytes === 'number', 'resolveNextStage contextPolicy: estimatedBytes is a number');
}

{
  // Call with null ledger
  const result = resolveNextStage(null, null);
  assert(result === null, 'resolveNextStage contextPolicy: null ledger returns null');
}

// ============================================================
// formatStageInstruction contextPolicy tests
// ============================================================

console.log('--- formatStageInstruction contextPolicy ---');

{
  const flowStage = { id: 'test_stage', name: 'Test Stage', skill: 'none', required_artifacts: [] };
  const ledgerStage = { id: 'test_stage', status: 'pending' };
  
  // No context policy -> no block
  const outputNoPolicy = formatStageInstruction(flowStage, ledgerStage);
  assert(!outputNoPolicy.includes('CONTEXT POLICY'), 'formatStageInstruction: no policy context excludes block');
  
  // With context policy
  const policy = { outcome: 'context_pack_required', estimatedBytes: 150000 };
  const output = formatStageInstruction(flowStage, ledgerStage, policy);
  assert(output.includes('CONTEXT POLICY'), 'formatStageInstruction: includes CONTEXT POLICY block');
  assert(output.includes('Outcome:   context_pack_required'), 'formatStageInstruction: includes correct outcome');
  assert(output.includes('Est. size: 146.5 KB'), 'formatStageInstruction: includes correct KB size');
  assert(output.includes('Create .ai/context-packs/'), 'formatStageInstruction: includes context pack action');
  
  // With fresh_session_required
  const policyHandoff = { outcome: 'fresh_session_required', estimatedBytes: 300000 };
  const outputHandoff = formatStageInstruction(flowStage, ledgerStage, policyHandoff);
  assert(outputHandoff.includes('Write .ai/state/context-handoff.json'), 'formatStageInstruction: includes handoff action');
}

// ============================================================
// Ledger mutation protection and parallelism limit checks
// ============================================================

console.log('--- Ledger subagent protection and parallelism checks ---');

{
  // Test 1: Mutating state throws error when SUBAGENT environment variable is true
  const ledger = createMockLedger({
    decision_discovery: 'pending'
  });
  
  process.env.SUBAGENT = 'true';
  let threwAdvance = false;
  try {
    advanceStage(ledger, 'decision_discovery', []);
  } catch (e) {
    threwAdvance = true;
    assert(e.message.includes('subagents are not permitted to modify'), 'advanceStage: expected subagent mutation blocked error message');
  }
  assert(threwAdvance, 'advanceStage: should throw under SUBAGENT=true');

  let threwRevision = false;
  try {
    triggerRevision(ledger, 'decision_challenge', 'decision_discovery', 'test');
  } catch (e) {
    threwRevision = true;
    assert(e.message.includes('subagents are not permitted to modify'), 'triggerRevision: expected subagent mutation blocked error message');
  }
  assert(threwRevision, 'triggerRevision: should throw under SUBAGENT=true');
  
  delete process.env.SUBAGENT;
}

{
  // Test 2: validateLedger enforces parallelism cap when repoRoot is passed
  const os = require('os');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-flow-engine-parallel-'));
  try {
    fs.mkdirSync(path.join(tempDir, '.ai/state'), { recursive: true });
    
    // Write policy config with max_parallelism = 2
    const policyConfig = {
      schema_version: '1.0.0',
      inline_threshold_bytes: 50000,
      pack_threshold_bytes: 200000,
      max_parallelism: 2,
      stage_overrides: {},
      budget_inputs: {
        include_required_artifacts: true,
        include_session_logs: true,
        include_planning_artifacts: true,
        include_context_packs: true,
        include_handoff_files: true
      }
    };
    fs.writeFileSync(path.join(tempDir, '.ai/state/context-policy.json'), JSON.stringify(policyConfig, null, 2), 'utf8');

    // Ledger with 3 stages in progress
    const ledger = {
      flow_name: 'test-flow',
      current_stage: 'stage1',
      stages: [
        { id: 'stage1', status: 'in_progress', artifacts: [] },
        { id: 'stage2', status: 'in_progress', artifacts: [] },
        { id: 'stage3', status: 'in_progress', artifacts: [] }
      ],
      revision_history: []
    };

    // Calling validateLedger with repoRoot should catch the violation
    const res = validateLedger(ledger, tempDir);
    assert(res.valid === false, 'validateLedger: should fail when concurrent stages exceed max_parallelism');
    assert(res.errors.some(e => e.includes('exceeds the maximum parallelism limit')), 'validateLedger: error message should mention parallelism limit');

    // Ledger with 2 stages in progress should succeed
    ledger.stages[2].status = 'pending';
    const resOk = validateLedger(ledger, tempDir);
    assert(resOk.valid === true, 'validateLedger: should succeed when concurrent stages are within max_parallelism');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// ============================================================
// Summary
// ============================================================

console.log('');
console.log(`Flow engine tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}

