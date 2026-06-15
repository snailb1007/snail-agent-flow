const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const validatorScriptPath = path.resolve(__dirname, 'validate-spec.js');

// Create a unique temporary directory inside the workspace (avoiding /tmp)
const testSandboxRoot = path.resolve(__dirname, '../../.specify/fixtures/test-sandbox');

function setupSandbox() {
  if (fs.existsSync(testSandboxRoot)) {
    fs.rmSync(testSandboxRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(testSandboxRoot, { recursive: true });
}

function cleanupSandbox() {
  if (fs.existsSync(testSandboxRoot)) {
    fs.rmSync(testSandboxRoot, { recursive: true, force: true });
  }
}

// Helper to run validator on sandbox
function runValidator(args = []) {
  const result = spawnSync('node', [validatorScriptPath, ...args], {
    env: {
      ...process.env,
      PROJECT_ROOT: testSandboxRoot
    },
    encoding: 'utf8'
  });
  return {
    code: result.status,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

function writeJson(relPath, obj) {
  const fullPath = path.join(testSandboxRoot, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, JSON.stringify(obj, null, 2), 'utf8');
}

function writeFile(relPath, content) {
  const fullPath = path.join(testSandboxRoot, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

function readJson(relPath) {
  const fullPath = path.join(testSandboxRoot, relPath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function fileExists(relPath) {
  return fs.existsSync(path.join(testSandboxRoot, relPath));
}

function readFile(relPath) {
  return fs.readFileSync(path.join(testSandboxRoot, relPath), 'utf8');
}

// Define mock assets for a perfect spec folder
const mockFeatureSlug = 'test-feature';
const mockSpecPath = `specs/${mockFeatureSlug}`;

const validSpecContent = `# Test Feature Spec

## Goal
To implement a test feature.

## Non-Goals
None.

## Acceptance Criteria
- Must work.

## Test Strategy
Manual verification.

## Behavior-Preservation Rules
Do not break anything.
`;

const validPlanContent = `# Test Feature Plan

## Proposed Changes
- Create files.

## Verification Plan
- Run tests.
`;

const validTasksContent = `# Test Feature Tasks
- [ ] Task 1
- [x] Task 2
`;

function writeValidSpecFolder() {
  writeJson('.specify/feature.json', { feature_directory: mockSpecPath });
  writeFile(`${mockSpecPath}/spec.md`, validSpecContent);
  writeFile(`${mockSpecPath}/plan.md`, validPlanContent);
  writeFile(`${mockSpecPath}/tasks.md`, validTasksContent);
}

// Test Runner list
const tests = [];
function addTest(name, fn) {
  tests.push({ name, fn });
}

// 1. Happy Path
addTest('Happy Path Spec Validation', () => {
  setupSandbox();
  writeValidSpecFolder();
  
  const res = runValidator();
  
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0, got ${res.code}. Stderr: ${res.stderr}`);
  }
  
  const state = readJson('.ai/state/run-state.json');
  if (!state) throw new Error('run-state.json not created');
  if (state.last_gate_status !== 'PASS') throw new Error(`Expected last_gate_status to be PASS, got ${state.last_gate_status}`);
  if (state.consecutive_failures !== 0) throw new Error(`Expected consecutive_failures to be 0, got ${state.consecutive_failures}`);
});

// 2. Missing Spec File
addTest('Missing Spec File', () => {
  setupSandbox();
  writeValidSpecFolder();
  // Remove tasks.md
  fs.unlinkSync(path.join(testSandboxRoot, mockSpecPath, 'tasks.md'));
  
  const res = runValidator();
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1, got ${res.code}`);
  }
  
  const state = readJson('.ai/state/run-state.json');
  if (state.last_gate_status !== 'BLOCKED') throw new Error(`Expected status to be BLOCKED, got ${state.last_gate_status}`);
  if (state.last_failed_rule !== 'Missing Required File') throw new Error(`Expected last_failed_rule to be Missing Required File, got ${state.last_failed_rule}`);
  if (state.consecutive_failures !== 1) throw new Error(`Expected consecutive_failures to be 1, got ${state.consecutive_failures}`);
});

// 3. Missing Spec Heading
addTest('Missing Spec Heading', () => {
  setupSandbox();
  writeValidSpecFolder();
  // Modify spec.md to miss ## Behavior-Preservation Rules
  const badSpec = validSpecContent.replace('## Behavior-Preservation Rules', '## Bad Heading');
  writeFile(`${mockSpecPath}/spec.md`, badSpec);
  
  const res = runValidator();
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1, got ${res.code}`);
  }
  
  const state = readJson('.ai/state/run-state.json');
  if (state.last_failed_rule !== 'Missing Required Heading') throw new Error(`Expected last_failed_rule to be Missing Required Heading, got ${state.last_failed_rule}`);
});

// 4. Placeholder Scan Block
addTest('Placeholder Scan Block', () => {
  setupSandbox();
  writeValidSpecFolder();
  // Add TODO to plan.md
  writeFile(`${mockSpecPath}/plan.md`, validPlanContent + '\nTODO: do something');
  
  const res = runValidator();
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1, got ${res.code}`);
  }
  
  const state = readJson('.ai/state/run-state.json');
  if (state.last_failed_rule !== 'Open Clarification') throw new Error(`Expected last_failed_rule to be Open Clarification, got ${state.last_failed_rule}`);
});

// 5. Path Drift Block
addTest('Path Drift Block', () => {
  setupSandbox();
  writeValidSpecFolder();
  // Add a drifted spec file
  writeFile('.specify/specs/shadow.md', '# Shadow Spec');
  
  const res = runValidator();
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1, got ${res.code}`);
  }
  
  const state = readJson('.ai/state/run-state.json');
  if (state.last_failed_rule !== 'Path Drift') throw new Error(`Expected last_failed_rule to be Path Drift, got ${state.last_failed_rule}`);
});

// 6. Retry Exhaustion Circuit Breaker
addTest('Retry Exhaustion Circuit Breaker', () => {
  setupSandbox();
  writeValidSpecFolder();
  // Force failures by keeping tasks.md missing
  fs.unlinkSync(path.join(testSandboxRoot, mockSpecPath, 'tasks.md'));
  
  // Run 1st time
  let res = runValidator();
  if (res.code !== 1) throw new Error(`Attempt 1: Expected code 1, got ${res.code}`);
  
  // Run 2nd time
  res = runValidator();
  if (res.code !== 1) throw new Error(`Attempt 2: Expected code 1, got ${res.code}`);
  
  // Run 3rd time (triggers NEEDS_HUMAN_REVIEW)
  res = runValidator();
  if (res.code !== 10) throw new Error(`Attempt 3: Expected code 10, got ${res.code}`);
  
  const state = readJson('.ai/state/run-state.json');
  if (state.last_gate_status !== 'NEEDS_HUMAN_REVIEW') {
    throw new Error(`Expected last_gate_status to be NEEDS_HUMAN_REVIEW, got ${state.last_gate_status}`);
  }
  if (state.consecutive_failures !== 3) {
    throw new Error(`Expected consecutive_failures to be 3, got ${state.consecutive_failures}`);
  }
  
  // Verify review packet exists
  const packetPath = `.ai/reviews/${mockFeatureSlug}/human-review.md`;
  if (!fileExists(packetPath)) {
    throw new Error('Human review packet not generated');
  }
  
  const packetContent = readFile(packetPath);
  if (!packetContent.includes('NEEDS_HUMAN_REVIEW')) {
    throw new Error('Review packet missing status tag');
  }
  if (!packetContent.includes(mockFeatureSlug)) {
    throw new Error('Review packet missing feature slug');
  }
});

// 7. Resume / Override Option
addTest('Resume / Override Option', () => {
  setupSandbox();
  writeValidSpecFolder();
  
  // Simulate 3 failures to get to NEEDS_HUMAN_REVIEW
  writeJson('.ai/state/run-state.json', {
    feature_slug: mockFeatureSlug,
    spec_path: mockSpecPath,
    current_phase: 'Spec-Validation',
    last_gate: 'Spec-Validation',
    last_gate_status: 'NEEDS_HUMAN_REVIEW',
    consecutive_failures: 3,
    retry_count: 3
  });
  
  // Execute resume
  const res = runValidator(['resume']);
  if (res.code !== 0) {
    throw new Error(`Resume execution failed with code ${res.code}. Stderr: ${res.stderr}`);
  }
  
  const state = readJson('.ai/state/run-state.json');
  if (state.consecutive_failures !== 0) throw new Error(`Expected failures to reset to 0, got ${state.consecutive_failures}`);
  if (state.last_gate_status !== 'RESUMED') throw new Error(`Expected status to be RESUMED, got ${state.last_gate_status}`);
});

// 8. Malformed JSON State
addTest('Malformed JSON State', () => {
  setupSandbox();
  writeValidSpecFolder();
  // Write invalid content
  writeFile('.ai/state/run-state.json', '{{{ invalid json');
  
  const res = runValidator();
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1, got ${res.code}`);
  }
  
  const state = readJson('.ai/state/run-state.json');
  if (!state) throw new Error('run-state.json was not corrected/overwritten');
  if (state.last_failed_rule !== 'Invalid JSON State') throw new Error(`Expected last_failed_rule to be Invalid JSON State, got ${state.last_failed_rule}`);
});

// 9. active-feature.json drift block
addTest('Active Feature Stale Pointer Drift', () => {
  setupSandbox();
  writeValidSpecFolder();
  writeJson('.ai/state/active-feature.json', {
    feature_slug: mockFeatureSlug,
    spec_path: mockSpecPath
  });

  const res = runValidator();
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1, got ${res.code}. Stderr: ${res.stderr}`);
  }

  const state = readJson('.ai/state/run-state.json');
  if (state.last_failed_rule !== 'Path Drift') throw new Error(`Expected last_failed_rule to be Path Drift, got ${state.last_failed_rule}`);
});

// 10. invalid active feature pointer
addTest('Invalid Active Feature Pointer', () => {
  setupSandbox();
  writeJson('.specify/feature.json', { feature_directory: 'specs/missing-feature' });

  const res = runValidator();
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1, got ${res.code}`);
  }

  const state = readJson('.ai/state/run-state.json');
  if (state.last_failed_rule !== 'Invalid Active Feature Pointer') {
    throw new Error(`Expected Invalid Active Feature Pointer, got ${state.last_failed_rule}`);
  }
});

// 11. competing root-level spec-kit file drift
addTest('Competing Root Spec File Drift', () => {
  setupSandbox();
  writeValidSpecFolder();
  writeFile('spec.md', '# Competing Root Spec');

  const res = runValidator();
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1, got ${res.code}`);
  }

  const state = readJson('.ai/state/run-state.json');
  if (state.last_failed_rule !== 'Path Drift') throw new Error(`Expected Path Drift, got ${state.last_failed_rule}`);
});

// 12. missing plan heading
addTest('Missing Plan Heading', () => {
  setupSandbox();
  writeValidSpecFolder();
  writeFile(`${mockSpecPath}/plan.md`, validPlanContent.replace('## Verification Plan', '## Checks'));

  const res = runValidator();
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1, got ${res.code}`);
  }

  const state = readJson('.ai/state/run-state.json');
  if (state.last_failed_rule !== 'Missing Required Heading') throw new Error(`Expected Missing Required Heading, got ${state.last_failed_rule}`);
  if (!state.last_validator_output.includes('## Verification Plan')) throw new Error('Expected output to name missing Verification Plan heading');
});

// 13. missing tasks checklist
addTest('Missing Tasks Checklist', () => {
  setupSandbox();
  writeValidSpecFolder();
  writeFile(`${mockSpecPath}/tasks.md`, '# Test Feature Tasks\nTask 1\nTask 2\n');

  const res = runValidator();
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1, got ${res.code}`);
  }

  const state = readJson('.ai/state/run-state.json');
  if (state.last_failed_rule !== 'Missing Required Heading') throw new Error(`Expected Missing Required Heading, got ${state.last_failed_rule}`);
});

// 14. non-TODO placeholder variants
addTest('Placeholder Variant Scan', () => {
  setupSandbox();
  writeValidSpecFolder();
  writeFile(`${mockSpecPath}/spec.md`, validSpecContent + '\nTBD: decide later\nFIXME: patch this\n');

  const res = runValidator();
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1, got ${res.code}`);
  }

  const state = readJson('.ai/state/run-state.json');
  if (state.last_failed_rule !== 'Open Clarification') throw new Error(`Expected Open Clarification, got ${state.last_failed_rule}`);
  if (!state.last_validator_output.includes('TBD') || !state.last_validator_output.includes('FIXME')) {
    throw new Error('Expected output to include both TBD and FIXME placeholders');
  }
});

// 16. ADR Purity Block - Filename
addTest('ADR Purity Block - Filename', () => {
  setupSandbox();
  writeValidSpecFolder();
  writeFile('docs/adr/profile-switch-2026-05-28.md', '# Checkpoint');
  
  const res = runValidator();
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1, got ${res.code}`);
  }
  
  const state = readJson('.ai/state/run-state.json');
  if (state.last_failed_rule !== 'ADR Purity') throw new Error(`Expected ADR Purity, got ${state.last_failed_rule}`);
});

// 17. ADR Purity Block - Content
addTest('ADR Purity Block - Content', () => {
  setupSandbox();
  writeValidSpecFolder();
  writeFile('docs/adr/some-adr.md', '---\nStatus: transient\n---\n# Transient ADR');
  
  const res = runValidator();
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1, got ${res.code}`);
  }
  
  const state = readJson('.ai/state/run-state.json');
  if (state.last_failed_rule !== 'ADR Purity') throw new Error(`Expected ADR Purity, got ${state.last_failed_rule}`);
});

// 15. pipeline script handles missing command arguments cleanly
addTest('Pipeline Script Missing Command Usage', () => {
  const scriptPath = path.resolve(__dirname, '../../.specify/scripts/bash/validate-pipeline-state.sh');
  const res = spawnSync('bash', [scriptPath], {
    env: {
      ...process.env,
      SPECIFY_AI_DIR: path.join(testSandboxRoot, '.ai')
    },
    encoding: 'utf8'
  });

  if (
    process.platform === 'win32' &&
    ((res.status === 127 && (res.stderr || '').includes('No such file or directory')) ||
     (res.stderr || '').includes('WSL') ||
     (res.stderr || '').includes('execvpe'))
  ) {
    console.log('Skipping bash usage assertion: WSL bash could not resolve the Windows script path.');
    return;
  }

  if (res.status !== 1) {
    throw new Error(`Expected exit code 1, got ${res.status}`);
  }
  if (!res.stderr.includes('Usage:')) {
    throw new Error(`Expected usage message, got stderr: ${res.stderr}`);
  }
});

// Run all tests
let failedCount = 0;
console.log('Running spec-validator tests...\n');

for (const t of tests) {
  try {
    t.fn();
    console.log(`✅ PASS: ${t.name}`);
  } catch (err) {
    console.error(`❌ FAIL: ${t.name}`);
    console.error(`   Error: ${err.message}`);
    failedCount++;
  }
}

cleanupSandbox();

console.log('\n--- Test Summary ---');
console.log(`Passed: ${tests.length - failedCount}/${tests.length}`);
if (failedCount > 0) {
  console.error(`Failed: ${failedCount}`);
  process.exit(1);
} else {
  console.log('All tests passed successfully!');
  process.exit(0);
}
