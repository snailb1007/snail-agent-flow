const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const cliScriptPath = path.resolve(__dirname, '../../bin/adp.js');
const testSandboxRoot = path.resolve(__dirname, '../../.specify/fixtures/test-cli-sandbox');

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

// Helper to run CLI on sandbox
function runCLI(args = []) {
  const result = spawnSync('node', [cliScriptPath, ...args], {
    env: {
      ...process.env,
      PROJECT_ROOT: testSandboxRoot,
      REPO_ROOT: testSandboxRoot
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

const tests = [];
function addTest(name, fn) {
  tests.push({ name, fn });
}

// 1. Help Usage
addTest('CLI Help Usage', () => {
  setupSandbox();
  const res = runCLI([]);
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1 when no command provided, got ${res.code}`);
  }
  if (!res.stdout.includes('Usage:')) {
    throw new Error('Expected Usage output in stdout');
  }

  const resHelp = runCLI(['--help']);
  if (resHelp.code !== 0) {
    throw new Error(`Expected exit code 0 on --help, got ${resHelp.code}`);
  }
});

// 2. Init command
addTest('CLI Init Command', () => {
  setupSandbox();

  // Create mock constitution template so adp init can find it
  writeJson('.specify/templates/constitution-template.md', '# Mock Constitution Template');

  const res = runCLI(['init']);
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0 on init, got ${res.code}. Stderr: ${res.stderr}`);
  }

  // Verify directories are created
  const dirs = [
    '.ai/sessions',
    '.ai/memory',
    '.ai/reviews',
    '.ai/state',
    '.specify/templates',
    'specs'
  ];
  for (const d of dirs) {
    if (!fileExists(d)) {
      throw new Error(`Expected directory to be created: ${d}`);
    }
  }

  // Verify files are created
  const files = [
    '.ai/constitution.md',
    'CLAUDE.md',
    'GEMINI.md',
    'AGENTS.md'
  ];
  for (const f of files) {
    if (!fileExists(f)) {
      throw new Error(`Expected file to be created: ${f}`);
    }
  }

  // Verify safe overwrite policy: modify CLAUDE.md, run init again, must NOT overwrite
  writeFile('CLAUDE.md', 'Custom CLAUDE');
  const res2 = runCLI(['init']);
  if (res2.code !== 0) {
    throw new Error(`Expected exit code 0 on second init, got ${res2.code}`);
  }
  if (readFile('CLAUDE.md') !== 'Custom CLAUDE') {
    throw new Error('Safe creation failed: custom CLAUDE.md was overwritten!');
  }
});

// 3. Doctor command
addTest('CLI Doctor Command', () => {
  setupSandbox();

  // Running on uninitialized sandbox should fail
  let res = runCLI(['doctor']);
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1 on uninitialized sandbox doctor, got ${res.code}`);
  }

  // Initialize sandbox via init
  runCLI(['init']);

  // Should still fail because specs/ is empty (no active feature spec files)
  res = runCLI(['doctor']);
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1 on doctor with empty specs, got ${res.code}`);
  }

  // Set up mock feature spec files
  const mockFeatureSlug = 'test-feature';
  const mockSpecPath = `specs/${mockFeatureSlug}`;
  writeJson('.specify/feature.json', { feature_directory: mockSpecPath });

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

  writeFile(`${mockSpecPath}/spec.md`, validSpecContent);
  writeFile(`${mockSpecPath}/plan.md`, validPlanContent);
  writeFile(`${mockSpecPath}/tasks.md`, validTasksContent);

  // Now doctor should pass successfully!
  // Wait, the doctor command spawns validators/scripts/validate-spec.js.
  // We need to write a mock validate-spec.js in the sandbox, or make sure validate-spec.js is resolved relative to the real project!
  // Yes! The adp.js script will spawn path.join(__dirname, '../validators/scripts/validate-spec.js') which resides in the real repository root.
  // But wait! If we run inside sandbox, we should pass REPO_ROOT/PROJECT_ROOT env variables to validate-spec.js so it runs on our sandbox.
  // We'll design bin/adp.js to pass process.env.PROJECT_ROOT/REPO_ROOT through to the subprocess!

  res = runCLI(['doctor']);
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0 on doctor with valid specs, got ${res.code}. Stderr: ${res.stderr}. Stdout: ${res.stdout}`);
  }
});

// 4. Status command
addTest('CLI Status Command', () => {
  setupSandbox();

  // Empty sandbox should output "No active feature"
  let res = runCLI(['status']);
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0 on status with empty sandbox, got ${res.code}`);
  }
  if (!res.stdout.includes('No active feature')) {
    throw new Error(`Expected 'No active feature' message, got: ${res.stdout}`);
  }

  // Set up mock feature pointer and run-state
  const mockFeatureSlug = 'test-feature-status';
  const mockSpecPath = `specs/${mockFeatureSlug}`;
  writeJson('.specify/feature.json', { feature_directory: mockSpecPath });
  writeJson('.ai/state/run-state.json', {
    feature_slug: mockFeatureSlug,
    spec_path: mockSpecPath,
    current_phase: 'Critique',
    last_gate: 'Product-Review',
    last_gate_status: 'WARN',
    retry_count: 0,
    verified_artifacts: ['/some/path/artifact.md']
  });

  res = runCLI(['status']);
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0 on status, got ${res.code}`);
  }
  if (!res.stdout.includes(mockFeatureSlug)) {
    throw new Error(`Expected output to contain feature slug, got: ${res.stdout}`);
  }
  if (!res.stdout.includes('Critique')) {
    throw new Error(`Expected output to contain phase 'Critique', got: ${res.stdout}`);
  }
  if (!res.stdout.includes('Product-Review')) {
    throw new Error(`Expected output to contain gate 'Product-Review', got: ${res.stdout}`);
  }
  if (!res.stdout.includes('WARN')) {
    throw new Error(`Expected output to contain status 'WARN', got: ${res.stdout}`);
  }
  if (!res.stdout.includes('artifact.md')) {
    throw new Error(`Expected output to contain verified artifact, got: ${res.stdout}`);
  }
});

// 5. New-Session command
addTest('CLI New-Session Command', () => {
  setupSandbox();
  runCLI(['init']);

  // Running without session name must fail
  let res = runCLI(['new-session']);
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1 on new-session with no name, got ${res.code}`);
  }

  // Set up mock feature directory
  writeJson('.specify/feature.json', { feature_directory: 'specs/test-feature' });

  // Create session
  res = runCLI(['new-session', 'user-auth-setup']);
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0 on new-session, got ${res.code}`);
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const expectedFile = `.ai/sessions/${dateStr}-user-auth-setup.md`;
  if (!fileExists(expectedFile)) {
    throw new Error(`Expected session file to exist: ${expectedFile}`);
  }

  const content = readFile(expectedFile);
  if (!content.includes('user-auth-setup')) {
    throw new Error(`Expected session file to contain session name, got: ${content}`);
  }

  // Reject path traversal and nested path attempts.
  res = runCLI(['new-session', 'nested/../../escape']);
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1 on unsafe session name, got ${res.code}`);
  }
  if (fileExists('.ai/escape.md')) {
    throw new Error('Unsafe session name escaped the .ai/sessions directory');
  }
});

// 6. Handoff command
addTest('CLI Handoff Command', () => {
  setupSandbox();
  runCLI(['init']);

  // Missing handoff.md should fail
  let res = runCLI(['handoff']);
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1 on missing handoff file, got ${res.code}`);
  }

  // Empty handoff.md should fail
  writeFile('.ai/state/handoff.md', '# Mock Handoff');
  res = runCLI(['handoff']);
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1 on empty handoff file, got ${res.code}`);
  }

  // Correct handoff.md should pass
  const validHandoff = `# Memory Handoff Report
Feature: test-feature-handoff

## Promoted to project memory
- Verified memory.

## Architecture updated
- Described architecture.

## Verification promoted
- Ran validation tests.
`;
  writeFile('.ai/state/handoff.md', validHandoff);

  // We need the active feature to match "test-feature-handoff"
  writeJson('.specify/feature.json', { feature_directory: 'specs/test-feature-handoff' });
  writeJson('.ai/state/run-state.json', { feature_slug: 'test-feature-handoff', spec_path: 'specs/test-feature-handoff' });

  res = runCLI(['handoff']);
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0 on valid handoff, got ${res.code}. Stderr: ${res.stderr}. Stdout: ${res.stdout}`);
  }
});

// 7. Validate-Spec command
addTest('CLI Validate-Spec Command', () => {
  setupSandbox();
  runCLI(['init']);

  // Set up mock feature directory
  const mockFeatureSlug = 'test-feature-valspec';
  const mockSpecPath = `specs/${mockFeatureSlug}`;
  writeJson('.specify/feature.json', { feature_directory: mockSpecPath });

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

  writeFile(`${mockSpecPath}/spec.md`, validSpecContent);
  writeFile(`${mockSpecPath}/plan.md`, validPlanContent);
  writeFile(`${mockSpecPath}/tasks.md`, validTasksContent);

  // Running validate-spec should pass
  let res = runCLI(['validate-spec']);
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0 on validate-spec, got ${res.code}`);
  }

  // Remove tasks.md, should now fail
  fs.unlinkSync(path.join(testSandboxRoot, mockSpecPath, 'tasks.md'));
  res = runCLI(['validate-spec']);
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1 on failed validate-spec, got ${res.code}`);
  }
});

// 8. CWD-based resolution (P1 fix: CLI should default to process.cwd(), not package dir)
addTest('CLI CWD-Based Resolution', () => {
  setupSandbox();

  // Set up a feature pointer inside the sandbox
  writeJson('.specify/feature.json', { feature_directory: 'specs/cwd-test-feature' });

  // Run CLI WITHOUT PROJECT_ROOT/REPO_ROOT env vars, using cwd=sandbox
  const result = spawnSync('node', [cliScriptPath, 'status'], {
    cwd: testSandboxRoot,
    env: Object.fromEntries(
      Object.entries(process.env).filter(([k]) => k !== 'PROJECT_ROOT' && k !== 'REPO_ROOT')
    ),
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    throw new Error(`Expected exit code 0 on cwd-based status, got ${result.status}. Stderr: ${result.stderr}`);
  }

  // Must show the sandbox's feature, not the package repo's feature
  if (!result.stdout.includes('cwd-test-feature')) {
    throw new Error(`Expected output to contain 'cwd-test-feature' (sandbox feature), got: ${result.stdout}`);
  }
});

// 9. Greenfield Fixture Test
addTest('Greenfield Project Fixture Integration', () => {
  const greenfieldSandbox = path.join(testSandboxRoot, 'greenfield-sandbox');
  if (fs.existsSync(greenfieldSandbox)) {
    fs.rmSync(greenfieldSandbox, { recursive: true, force: true });
  }
  fs.mkdirSync(greenfieldSandbox, { recursive: true });

  // Copy mock package.json from fixture
  const fixturePkg = path.resolve(__dirname, '../../.specify/fixtures/greenfield-project/package.json');
  fs.copyFileSync(fixturePkg, path.join(greenfieldSandbox, 'package.json'));

  // Run init in greenfield sandbox
  const resultInit = spawnSync('node', [cliScriptPath, 'init'], {
    cwd: greenfieldSandbox,
    env: {
      ...process.env,
      PROJECT_ROOT: greenfieldSandbox,
      REPO_ROOT: greenfieldSandbox
    },
    encoding: 'utf8'
  });

  if (resultInit.status !== 0) {
    throw new Error(`Expected exit code 0 on greenfield init, got ${resultInit.status}. Stderr: ${resultInit.stderr}`);
  }

  // Verify that CLAUDE.md was initialized
  if (!fs.existsSync(path.join(greenfieldSandbox, 'CLAUDE.md'))) {
    throw new Error('Expected CLAUDE.md to be initialized in greenfield project');
  }

  // Create an active feature pointer and specs files to run doctor successfully
  const mockFeatureSlug = 'greenfield-feature';
  const mockSpecPath = `specs/${mockFeatureSlug}`;
  const specDirFull = path.join(greenfieldSandbox, mockSpecPath);
  fs.mkdirSync(specDirFull, { recursive: true });

  fs.writeFileSync(path.join(greenfieldSandbox, '.specify/feature.json'), JSON.stringify({ feature_directory: mockSpecPath }), 'utf8');

  const validSpecContent = `# Greenfield Spec\n## Goal\nTest.\n## Non-Goals\nNone.\n## Acceptance Criteria\n- Pass.\n## Test Strategy\nManual.\n## Behavior-Preservation Rules\nNone.\n`;
  const validPlanContent = `# Greenfield Plan\n## Proposed Changes\n- Change.\n## Verification Plan\n- Test.\n`;
  const validTasksContent = `# Greenfield Tasks\n- [ ] Task 1\n`;

  fs.writeFileSync(path.join(specDirFull, 'spec.md'), validSpecContent, 'utf8');
  fs.writeFileSync(path.join(specDirFull, 'plan.md'), validPlanContent, 'utf8');
  fs.writeFileSync(path.join(specDirFull, 'tasks.md'), validTasksContent, 'utf8');

  // Run doctor in greenfield sandbox
  const resultDoctor = spawnSync('node', [cliScriptPath, 'doctor'], {
    cwd: greenfieldSandbox,
    env: {
      ...process.env,
      PROJECT_ROOT: greenfieldSandbox,
      REPO_ROOT: greenfieldSandbox
    },
    encoding: 'utf8'
  });

  if (resultDoctor.status !== 0) {
    throw new Error(`Expected exit code 0 on greenfield doctor, got ${resultDoctor.status}. Stderr: ${resultDoctor.stderr}`);
  }
});

// 10. Brownfield Fixture Test
addTest('Brownfield Project Fixture Integration', () => {
  const brownfieldSandbox = path.join(testSandboxRoot, 'brownfield-sandbox');
  if (fs.existsSync(brownfieldSandbox)) {
    fs.rmSync(brownfieldSandbox, { recursive: true, force: true });
  }
  fs.mkdirSync(brownfieldSandbox, { recursive: true });

  // Copy package.json, README.md, and src/index.js from brownfield fixture
  const fixtureDir = path.resolve(__dirname, '../../.specify/fixtures/brownfield-project');
  fs.copyFileSync(path.join(fixtureDir, 'package.json'), path.join(brownfieldSandbox, 'package.json'));
  fs.copyFileSync(path.join(fixtureDir, 'README.md'), path.join(brownfieldSandbox, 'README.md'));

  fs.mkdirSync(path.join(brownfieldSandbox, 'src'), { recursive: true });
  fs.copyFileSync(path.join(fixtureDir, 'src/index.js'), path.join(brownfieldSandbox, 'src/index.js'));

  // Run init in brownfield sandbox
  const resultInit = spawnSync('node', [cliScriptPath, 'init'], {
    cwd: brownfieldSandbox,
    env: {
      ...process.env,
      PROJECT_ROOT: brownfieldSandbox,
      REPO_ROOT: brownfieldSandbox
    },
    encoding: 'utf8'
  });

  if (resultInit.status !== 0) {
    throw new Error(`Expected exit code 0 on brownfield init, got ${resultInit.status}. Stderr: ${resultInit.stderr}`);
  }

  // Verify that new files are created
  if (!fs.existsSync(path.join(brownfieldSandbox, 'CLAUDE.md'))) {
    throw new Error('Expected CLAUDE.md to be initialized in brownfield project');
  }

  // Verify that pre-existing application files are NOT changed or destroyed
  const readmeContent = fs.readFileSync(path.join(brownfieldSandbox, 'README.md'), 'utf8');
  if (!readmeContent.includes('Mock Brownfield Project')) {
    throw new Error('Brownfield README.md was overwritten or corrupted during initialization');
  }

  const srcContent = fs.readFileSync(path.join(brownfieldSandbox, 'src/index.js'), 'utf8');
  if (!srcContent.includes('Hello from pre-existing brownfield application!')) {
    throw new Error('Brownfield src/index.js was overwritten or corrupted during initialization');
  }

  // Create an active feature pointer and specs files to verify doctor on adopted projects.
  const mockFeatureSlug = 'brownfield-feature';
  const mockSpecPath = `specs/${mockFeatureSlug}`;
  const specDirFull = path.join(brownfieldSandbox, mockSpecPath);
  fs.mkdirSync(specDirFull, { recursive: true });

  fs.writeFileSync(path.join(brownfieldSandbox, '.specify/feature.json'), JSON.stringify({ feature_directory: mockSpecPath }), 'utf8');

  const validSpecContent = `# Brownfield Spec\n## Goal\nTest.\n## Non-Goals\nNone.\n## Acceptance Criteria\n- Pass.\n## Test Strategy\nManual.\n## Behavior-Preservation Rules\nNone.\n`;
  const validPlanContent = `# Brownfield Plan\n## Proposed Changes\n- Change.\n## Verification Plan\n- Test.\n`;
  const validTasksContent = `# Brownfield Tasks\n- [ ] Task 1\n`;

  fs.writeFileSync(path.join(specDirFull, 'spec.md'), validSpecContent, 'utf8');
  fs.writeFileSync(path.join(specDirFull, 'plan.md'), validPlanContent, 'utf8');
  fs.writeFileSync(path.join(specDirFull, 'tasks.md'), validTasksContent, 'utf8');

  const resultDoctor = spawnSync('node', [cliScriptPath, 'doctor'], {
    cwd: brownfieldSandbox,
    env: {
      ...process.env,
      PROJECT_ROOT: brownfieldSandbox,
      REPO_ROOT: brownfieldSandbox
    },
    encoding: 'utf8'
  });

  if (resultDoctor.status !== 0) {
    throw new Error(`Expected exit code 0 on brownfield doctor, got ${resultDoctor.status}. Stderr: ${resultDoctor.stderr}`);
  }
});

// 11. Evaluation Rubric Structural Check
addTest('Evaluation Rubric Schema Conformance', () => {
  const rubricPath = path.resolve(__dirname, '../../.specify/templates/evaluation-rubric.json');
  if (!fs.existsSync(rubricPath)) {
    throw new Error(`Evaluation rubric file missing at: ${rubricPath}`);
  }

  const data = JSON.parse(fs.readFileSync(rubricPath, 'utf8'));

  // Validate required fields
  if (!data.name || typeof data.name !== 'string') {
    throw new Error('Evaluation rubric must contain a "name" string');
  }
  if (!data.version || typeof data.version !== 'string') {
    throw new Error('Evaluation rubric must contain a "version" string');
  }
  if (!Array.isArray(data.criteria) || data.criteria.length === 0) {
    throw new Error('Evaluation rubric must contain a non-empty "criteria" array');
  }

  const criterionIds = new Set();
  let weightTotal = 0;

  // Validate each criterion
  for (const c of data.criteria) {
    if (!c.id || typeof c.id !== 'string') {
      throw new Error('Each criterion must have an "id" string');
    }
    if (criterionIds.has(c.id)) {
      throw new Error(`Evaluation rubric criterion id must be unique: ${c.id}`);
    }
    criterionIds.add(c.id);
    if (!c.name || typeof c.name !== 'string') {
      throw new Error('Each criterion must have a "name" string');
    }
    if (!c.description || typeof c.description !== 'string') {
      throw new Error('Each criterion must have a "description" string');
    }
    if (typeof c.weight !== 'number' || c.weight < 0 || c.weight > 1) {
      throw new Error('Each criterion must have a "weight" number between 0 and 1');
    }
    weightTotal += c.weight;
  }

  if (Math.abs(weightTotal - 1) > 0.000001) {
    throw new Error(`Evaluation rubric weights must sum to 1.0, got ${weightTotal}`);
  }
});

// 12. CI Workflow Structure Check
addTest('CI Workflow Matrix Structure', () => {
  const workflowPath = path.resolve(__dirname, '../../.github/workflows/ci.yml');
  if (!fs.existsSync(workflowPath)) {
    throw new Error(`CI workflow file missing at: ${workflowPath}`);
  }

  const workflow = fs.readFileSync(workflowPath, 'utf8');
  const requiredSnippets = [
    'push:',
    'pull_request:',
    'node-version: "20"',
    'strategy:',
    'matrix:',
    'npm run validate',
    'npm run test:validator',
    'npm run test:pipeline',
    'npm run test:cli',
    'npm test'
  ];

  for (const snippet of requiredSnippets) {
    if (!workflow.includes(snippet)) {
      throw new Error(`CI workflow missing required snippet: ${snippet}`);
    }
  }
});

// Run all tests
let failedCount = 0;
console.log('Running CLI tests...\n');

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

console.log('\n--- CLI Test Summary ---');
console.log(`Passed: ${tests.length - failedCount}/${tests.length}`);
if (failedCount > 0) {
  console.error(`Failed: ${failedCount}`);
  process.exit(1);
} else {
  console.log('All CLI tests passed successfully!');
  process.exit(0);
}
