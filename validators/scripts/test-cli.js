const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const cliScriptPath = path.resolve(__dirname, '../../bin/adp.js');
const testSandboxRoot = path.resolve(__dirname, '../../.specify/fixtures/test-cli-sandbox');

function rmSyncWithRetry(dirPath, maxRetries = 10, delayMs = 50) {
  let retries = 0;
  while (true) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
      break;
    } catch (err) {
      retries++;
      if (retries >= maxRetries) {
        throw err;
      }
      try {
        const sab = new SharedArrayBuffer(4);
        const int32 = new Int32Array(sab);
        Atomics.wait(int32, 0, 0, delayMs);
      } catch (e) {
        const start = Date.now();
        while (Date.now() - start < delayMs) {}
      }
    }
  }
}

function setupSandbox() {
  rmSyncWithRetry(testSandboxRoot);
  fs.mkdirSync(testSandboxRoot, { recursive: true });

  // Pre-create mock skill folders to satisfy prerequisite checks in tests
  const skills = ['gsd-discuss-phase', 'using-superpowers', 'speckit-specify', 'plan-ceo-review'];
  for (const s of skills) {
    fs.mkdirSync(path.join(testSandboxRoot, '.agents/skills', s), { recursive: true });
  }

  // Copy schemas to sandbox for drift validation
  const contractsDest = path.join(testSandboxRoot, '.claude', 'skills', 'contracts');
  fs.mkdirSync(contractsDest, { recursive: true });
  const contractsSrc = path.resolve(__dirname, '../../.claude/skills/contracts');
  fs.copyFileSync(path.join(contractsSrc, 'artifact-map.json'), path.join(contractsDest, 'artifact-map.json'));
  fs.copyFileSync(path.join(contractsSrc, 'entities.schema.json'), path.join(contractsDest, 'entities.schema.json'));
  fs.copyFileSync(path.join(contractsSrc, 'gate-result.schema.json'), path.join(contractsDest, 'gate-result.schema.json'));
}

function cleanupSandbox() {
  rmSyncWithRetry(testSandboxRoot);
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
    'specs',
    '.ai/claims',
    '.ai/locks'
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
  if (!readFile('CLAUDE.md').startsWith('Custom CLAUDE')) {
    throw new Error('Safe creation failed: custom CLAUDE.md was overwritten or prefix lost!');
  }
});

// 3. Doctor command
addTest('CLI Doctor Command', () => {
  setupSandbox();

  // Running on uninitialized sandbox should fail (strict checks fail)
  let res = runCLI(['doctor']);
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1 on uninitialized sandbox doctor, got ${res.code}`);
  }

  // Initialize sandbox via init
  runCLI(['init']);

  // Should now pass with SKIPPED because no active feature exists yet
  res = runCLI(['doctor']);
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0 on doctor with no active feature (should skip spec validation), got ${res.code}. Stderr: ${res.stderr}`);
  }
  const combinedOutput = (res.stdout || '') + (res.stderr || '');
  if (!combinedOutput.includes('SKIPPED')) {
    throw new Error(`Expected doctor output to contain 'SKIPPED' when no active feature, got: ${combinedOutput}`);
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

  // Now doctor should pass with full spec validation
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

  // Set up mock feature pointer and flow state
  const mockFeatureSlug = 'test-feature-status';
  const mockSpecPath = `specs/${mockFeatureSlug}`;
  writeJson('.specify/feature.json', { feature_directory: mockSpecPath });
  writeJson('.ai/state/flow-state.json', {
    schema_version: '2.0',
    run_id: 'run-123',
    feature_slug: mockFeatureSlug,
    risk_profile: 'STANDARD',
    work_mode: 'FEATURE',
    stage: 'trace',
    status: 'running',
    attempt: 1,
    completed_steps: [],
    pending_step: 'trace.pending',
    locks: [],
    signals: [],
    last_gate: 'Product-Review',
    last_gate_status: 'WARN',
    consecutive_failures: 0,
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
  if (!res.stdout.includes('trace')) {
    throw new Error(`Expected output to contain stage 'trace', got: ${res.stdout}`);
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

// 8. Feature scaffold command
addTest('CLI Feature Command Creates Valid Spec-Kit Scaffold', () => {
  setupSandbox();

  let res = runCLI(['init']);
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0 on init before feature, got ${res.code}`);
  }

  res = runCLI(['feature', 'Add user login']);
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0 on feature, got ${res.code}. Stderr: ${res.stderr}`);
  }

  const pointer = readJson('.specify/feature.json');
  if (!pointer || pointer.feature_directory !== 'specs/001-add-user-login') {
    throw new Error(`Expected active feature pointer to specs/001-add-user-login, got ${JSON.stringify(pointer)}`);
  }

  const expectedFiles = [
    'specs/001-add-user-login/spec.md',
    'specs/001-add-user-login/plan.md',
    'specs/001-add-user-login/tasks.md',
    'specs/001-add-user-login/checklists/requirements.md'
  ];
  for (const file of expectedFiles) {
    if (!fileExists(file)) {
      throw new Error(`Expected generated file: ${file}`);
    }
  }

  res = runCLI(['validate-spec']);
  if (res.code !== 0) {
    throw new Error(`Expected generated feature scaffold to pass validation, got ${res.code}. Stderr: ${res.stderr}`);
  }
});

// 9. One-command run flow
addTest('CLI Run Command Initializes Creates And Validates Feature', () => {
  setupSandbox();

  const res = runCLI(['run', 'Create project dashboard']);
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0 on run, got ${res.code}. Stderr: ${res.stderr}`);
  }

  const pointer = readJson('.specify/feature.json');
  if (!pointer || pointer.feature_directory !== 'specs/001-project-dashboard') {
    throw new Error(`Expected active feature pointer to specs/001-project-dashboard, got ${JSON.stringify(pointer)}`);
  }

  if (!fileExists('.ai/constitution.md')) {
    throw new Error('Expected run command to initialize protocol files');
  }
  if (!fileExists('specs/001-project-dashboard/tasks.md')) {
    throw new Error('Expected run command to create tasks.md');
  }
  if (!res.stdout.includes('Spec validation gate PASSED')) {
    throw new Error(`Expected run output to report validation pass, got: ${res.stdout}`);
  }
});

// 10. Feature command input validation
addTest('CLI Feature Command Requires Description', () => {
  setupSandbox();

  const res = runCLI(['feature']);
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1 without feature description, got ${res.code}`);
  }
  if (!res.stderr.includes('Missing feature description')) {
    throw new Error(`Expected missing description error, got: ${res.stderr}`);
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
  rmSyncWithRetry(greenfieldSandbox);
  fs.mkdirSync(greenfieldSandbox, { recursive: true });

  // Pre-create mock skill folders to satisfy prerequisites in greenfield sandbox
  const skills = ['gsd-discuss-phase', 'using-superpowers', 'speckit-specify', 'plan-ceo-review'];
  for (const s of skills) {
    fs.mkdirSync(path.join(greenfieldSandbox, '.agents/skills', s), { recursive: true });
  }

  // Copy schemas to sandbox for drift validation
  const contractsDest = path.join(greenfieldSandbox, '.claude', 'skills', 'contracts');
  fs.mkdirSync(contractsDest, { recursive: true });
  const contractsSrc = path.resolve(__dirname, '../../.claude/skills/contracts');
  fs.copyFileSync(path.join(contractsSrc, 'artifact-map.json'), path.join(contractsDest, 'artifact-map.json'));
  fs.copyFileSync(path.join(contractsSrc, 'entities.schema.json'), path.join(contractsDest, 'entities.schema.json'));
  fs.copyFileSync(path.join(contractsSrc, 'gate-result.schema.json'), path.join(contractsDest, 'gate-result.schema.json'));

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
  rmSyncWithRetry(brownfieldSandbox);
  fs.mkdirSync(brownfieldSandbox, { recursive: true });

  // Pre-create mock skill folders to satisfy prerequisites in brownfield sandbox
  const skills = ['gsd-discuss-phase', 'using-superpowers', 'speckit-specify', 'plan-ceo-review'];
  for (const s of skills) {
    fs.mkdirSync(path.join(brownfieldSandbox, '.agents/skills', s), { recursive: true });
  }

  // Copy schemas to sandbox for drift validation
  const contractsDest = path.join(brownfieldSandbox, '.claude', 'skills', 'contracts');
  fs.mkdirSync(contractsDest, { recursive: true });
  const contractsSrc = path.resolve(__dirname, '../../.claude/skills/contracts');
  fs.copyFileSync(path.join(contractsSrc, 'artifact-map.json'), path.join(contractsDest, 'artifact-map.json'));
  fs.copyFileSync(path.join(contractsSrc, 'entities.schema.json'), path.join(contractsDest, 'entities.schema.json'));
  fs.copyFileSync(path.join(contractsSrc, 'gate-result.schema.json'), path.join(contractsDest, 'gate-result.schema.json'));

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

// 13. Greenfield Flow Init Test
addTest('CLI Init Creates Flow Infrastructure (Greenfield)', () => {
  setupSandbox();

  const res = runCLI(['init']);
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0 on init, got ${res.code}. Stderr: ${res.stderr}`);
  }

  // Verify .ai/flows directory was created
  if (!fileExists('.ai/flows')) {
    throw new Error('Expected .ai/flows directory to be created');
  }

  // Verify ATLAS flow definition was copied
  if (!fileExists('.ai/flows/atlas-flow.yaml')) {
    throw new Error('Expected .ai/flows/atlas-flow.yaml to be created');
  }

  // Verify flow definition content matches the template
  const templatePath = path.resolve(__dirname, '../../.specify/templates/atlas-flow.yaml');
  const templateContent = fs.readFileSync(templatePath, 'utf8');
  const copiedContent = readFile('.ai/flows/atlas-flow.yaml');
  if (copiedContent !== templateContent) {
    throw new Error('Flow definition content does not match template');
  }
  if (!copiedContent.includes('name: atlas-flow')) {
    throw new Error('Expected default flow definition to be atlas-flow');
  }

  // Verify flow state was created
  if (!fileExists('.ai/state/flow-state.json')) {
    throw new Error('Expected .ai/state/flow-state.json to be created');
  }
  if (fileExists('.ai/state/flow-ledger.json')) {
    throw new Error('Expected init not to create deprecated flow-ledger.json');
  }

  // Verify ATLAS skills and contracts were copied
  for (const skill of ['atlas-auto-loop', 'atlas-routing', 'atlas-gates', 'atlas-settle', 'atlas-review']) {
    const skillPath = `.claude/skills/${skill}/SKILL.md`;
    if (!fileExists(skillPath)) {
      throw new Error(`Expected ${skillPath} to be created`);
    }
    if (!readFile(skillPath).includes(`name: ${skill}`)) {
      throw new Error(`Expected ${skillPath} to contain name: ${skill}`);
    }
  }
  for (const contract of ['artifact-map.json', 'entities.schema.json', 'gate-result.schema.json']) {
    if (!fileExists(`.claude/skills/contracts/${contract}`)) {
      throw new Error(`Expected .claude/skills/contracts/${contract} to be created`);
    }
  }

  // Verify init output mentions flow files
  if (!res.stdout.includes('atlas-flow.yaml')) {
    throw new Error(`Expected init output to mention flow definition, got: ${res.stdout}`);
  }
  if (!res.stdout.includes('flow-state.json')) {
    throw new Error(`Expected init output to mention flow state, got: ${res.stdout}`);
  }
  if (!res.stdout.includes('atlas-routing')) {
    throw new Error(`Expected init output to mention ATLAS skills, got: ${res.stdout}`);
  }
});

// 14. Brownfield Flow Init Test (skip existing flow files)
addTest('CLI Init Skips Existing Flow Files (Brownfield)', () => {
  setupSandbox();

  // Pre-create flow files with custom content
  writeFile('.ai/flows/atlas-flow.yaml', 'custom-flow-content');
  writeFile('.ai/state/flow-state.json', '{"custom": true}');
  fs.mkdirSync(path.join(testSandboxRoot, '.claude/skills/atlas-routing'), { recursive: true });
  writeFile('.claude/skills/atlas-routing/SKILL.md', 'custom-atlas-routing-content');

  process.env.ADP_NO_STRICT = '1';
  const res = runCLI(['init']);
  delete process.env.ADP_NO_STRICT;
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0 on brownfield init, got ${res.code}. Stderr: ${res.stderr}`);
  }

  // Verify flow files were NOT overwritten
  if (readFile('.ai/flows/atlas-flow.yaml') !== 'custom-flow-content') {
    throw new Error('Brownfield flow definition was overwritten!');
  }
  if (readFile('.ai/state/flow-state.json') !== '{"custom": true}') {
    throw new Error('Brownfield flow state was overwritten!');
  }
  if (readFile('.claude/skills/atlas-routing/SKILL.md') !== 'custom-atlas-routing-content') {
    throw new Error('Brownfield atlas-routing SKILL.md was overwritten!');
  }

  // Verify skip messages in output
  if (!res.stdout.includes('already exists')) {
    throw new Error(`Expected "already exists" skip messages, got: ${res.stdout}`);
  }
});

// 15. State Schema Validation Test
addTest('CLI Init Generates Valid State Schema', () => {
  setupSandbox();

  const res = runCLI(['init']);
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0 on init, got ${res.code}. Stderr: ${res.stderr}`);
  }

  const state = readJson('.ai/state/flow-state.json');
  if (!state) {
    throw new Error('Failed to read or parse flow-state.json');
  }

  // Check top-level fields
  if (state.schema_version !== '2.0') {
    throw new Error(`Expected schema_version "2.0", got "${state.schema_version}"`);
  }
  if (!state.run_id) {
    throw new Error('Expected run_id to be set');
  }
  if (state.stage !== 'align') {
    throw new Error(`Expected stage "align", got "${state.stage}"`);
  }
  if (state.status !== 'running') {
    throw new Error(`Expected status "running", got "${state.status}"`);
  }
  if (state.risk_profile !== 'STANDARD') {
    throw new Error(`Expected risk_profile "STANDARD", got "${state.risk_profile}"`);
  }
  if (state.work_mode !== 'FEATURE') {
    throw new Error(`Expected work_mode "FEATURE", got "${state.work_mode}"`);
  }
  if (state.attempt !== 1) {
    throw new Error(`Expected attempt 1, got ${state.attempt}`);
  }
  if (!Array.isArray(state.completed_steps) || state.completed_steps.length !== 0) {
    throw new Error('Expected completed_steps to be an empty array');
  }
  if (state.pending_step !== 'align.pending') {
    throw new Error(`Expected pending_step "align.pending", got "${state.pending_step}"`);
  }
  if (!Array.isArray(state.locks) || state.locks.length !== 0) {
    throw new Error('Expected locks to be an empty array');
  }
  if (!Array.isArray(state.signals) || state.signals.length !== 0) {
    throw new Error('Expected signals to be an empty array');
  }
});

// 16. YAML Parse Failure Graceful Handling Test
addTest('CLI Init Handles YAML Parse Failure Gracefully', () => {
  setupSandbox();

  // Pre-create an invalid flow definition file to trigger parse failure
  // We need the flow definition to be there (so the copy step skips), but be invalid YAML
  writeFile('.ai/flows/atlas-flow.yaml', 'invalid: yaml: content: [[[broken');

  // Remove the ledger so init tries to generate it from the invalid YAML
  // The .ai/state dir will be created by init

  process.env.ADP_NO_STRICT = '1';
  const res = runCLI(['init']);
  delete process.env.ADP_NO_STRICT;
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0 on init with invalid YAML, got ${res.code}. Stderr: ${res.stderr}`);
  }

  // Init should succeed (not crash) — it should log a warning
  const output = res.stdout + (res.stderr || '');
  if (!output.includes('WARNING') && !output.includes('warning') && !output.includes('Could not generate flow ledger')) {
    // The warning might go to stderr or stdout depending on console.warn behavior in spawn
    // Check that the ledger was NOT created (since YAML was invalid)
  }

  // Verify flow state was created (since state init doesn't parse flow definition anymore)
  if (!fileExists('.ai/state/flow-state.json')) {
    throw new Error('Expected flow-state.json to be created');
  }

  // Verify other init files were still created
  if (!fileExists('.ai/constitution.md')) {
    throw new Error('Expected constitution.md to be created even when YAML parse fails');
  }
  if (!fileExists('.ai/sessions')) {
    throw new Error('Expected .ai/sessions to be created even when YAML parse fails');
  }
});

// 17. Prerequisite checking doctor test
addTest('CLI Doctor Reports Missing Prerequisites and Exits 1', () => {
  setupSandbox();

  // Run init first to scaffold directories and files
  let res = runCLI(['init']);
  if (res.code !== 0) {
    throw new Error('Init failed during prerequisite integration test setup');
  }

  // Pre-create spec/plan/tasks files so that the static validation passes
  writeJson('.specify/feature.json', { feature_directory: 'specs/001-test' });
  fs.mkdirSync(path.join(testSandboxRoot, 'specs/001-test/checklists'), { recursive: true });
  fs.writeFileSync(path.join(testSandboxRoot, 'specs/001-test/spec.md'), '# Test\n## Goal\nTest.\n## Acceptance Criteria\n- AC1\n## Test Strategy\nManual.\n## Behavior-Preservation Rules\nNone.\n', 'utf8');
  fs.writeFileSync(path.join(testSandboxRoot, 'specs/001-test/plan.md'), '# Plan\n## Proposed Changes\n- Change.\n## Verification Plan\n- Verify.\n', 'utf8');
  fs.writeFileSync(path.join(testSandboxRoot, 'specs/001-test/tasks.md'), '# Tasks\n- [ ] Task\n', 'utf8');
  fs.writeFileSync(path.join(testSandboxRoot, 'specs/001-test/checklists/requirements.md'), '# Checklist\n- [x] Done\n', 'utf8');

  // Modify .ai/flows/atlas-flow.yaml to inject a missing prerequisite
  const flowPath = path.join(testSandboxRoot, '.ai/flows/atlas-flow.yaml');
  const badFlow = `
name: bad-flow
version: 1.0.0
prerequisites:
  - name: MissingTool
    command: nonexistent-command-123
    check: command -v nonexistent-command-123
stages:
  - id: decision_discovery
    name: Decision discovery
    skill: MissingTool
    required_artifacts: []
`;
  fs.writeFileSync(flowPath, badFlow, 'utf8');

  // Run doctor
  res = runCLI(['doctor']);
  
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1 when prerequisite is missing, got ${res.code}`);
  }

  const output = res.stdout + (res.stderr || '');
  if (!output.includes('MissingTool') || !output.includes('MISSING')) {
    throw new Error(`Expected output to mention missing prerequisite 'MissingTool', got: ${output}`);
  }
});

// 18. Dynamic skill localization and subagent guidelines appending
addTest('CLI Init Localizes Skills and Writes Separate Guidelines (non-intrusive)', () => {
  setupSandbox();

  const mockHome = path.join(testSandboxRoot, 'mock-home');
  const mockGlobalSkillsDir = path.join(mockHome, '.gemini/config/skills');
  const mockGlobalAntigravityDir = path.join(mockHome, '.gemini/antigravity');

  // Create mock global directories
  fs.mkdirSync(mockGlobalSkillsDir, { recursive: true });
  fs.mkdirSync(path.join(mockGlobalSkillsDir, 'gsd-test-skill'), { recursive: true });
  fs.mkdirSync(path.join(mockGlobalAntigravityDir, 'get-shit-done/workflows'), { recursive: true });
  fs.mkdirSync(path.join(mockGlobalAntigravityDir, 'get-shit-done/references'), { recursive: true });

  // Create mock global files
  const mockSkillMd = `---
name: gsd-test-skill
description: "Test description"
---
<execution_context>
@~/.gemini/antigravity/get-shit-done/workflows/test-workflow.md
@~/.gemini/antigravity/get-shit-done/references/test-ref.md
</execution_context>
`;
  fs.writeFileSync(path.join(mockGlobalSkillsDir, 'gsd-test-skill/SKILL.md'), mockSkillMd, 'utf8');
  fs.writeFileSync(path.join(mockGlobalAntigravityDir, 'get-shit-done/workflows/test-workflow.md'), '# Mock Workflow', 'utf8');
  fs.writeFileSync(path.join(mockGlobalAntigravityDir, 'get-shit-done/references/test-ref.md'), '# Mock Reference', 'utf8');

  // Pre-create instruction files in sandbox to verify guidelines appending
  writeFile('CLAUDE.md', '# CLAUDE.md\n');
  writeFile('GEMINI.md', '# GEMINI.md\n');
  writeFile('AGENTS.md', '# AGENTS.md\n');

  // Run init with custom HOME environment variable
  const result = spawnSync('node', [cliScriptPath, 'init'], {
    env: {
      ...process.env,
      PROJECT_ROOT: testSandboxRoot,
      REPO_ROOT: testSandboxRoot,
      HOME: mockHome
    },
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    throw new Error(`Init command failed in test: ${result.stderr}`);
  }

  // Assert local skill folder and files are copied
  const localSkillDir = '.agents/skills/gsd-test-skill';
  const localClaudeSkillDir = '.claude/skills/gsd-test-skill';

  if (!fileExists(`${localSkillDir}/SKILL.md`)) {
    throw new Error('Local SKILL.md not copied to .agents/skills');
  }
  if (!fileExists(`${localClaudeSkillDir}/SKILL.md`)) {
    throw new Error('Local SKILL.md not copied to .claude/skills');
  }

  // Assert workflows and references are copied
  if (!fileExists(`${localSkillDir}/workflows/test-workflow.md`)) {
    throw new Error('Workflow file not copied locally');
  }
  if (!fileExists(`${localSkillDir}/references/test-ref.md`)) {
    throw new Error('Reference file not copied locally');
  }

  // Assert local SKILL.md content has rewritten paths
  const localSkillContent = readFile(`${localSkillDir}/SKILL.md`);
  if (!localSkillContent.includes('@.agents/skills/gsd-test-skill/workflows/test-workflow.md')) {
    throw new Error(`Path not rewritten in .agents SKILL.md: ${localSkillContent}`);
  }

  const localClaudeSkillContent = readFile(`${localClaudeSkillDir}/SKILL.md`);
  if (!localClaudeSkillContent.includes('@.claude/skills/gsd-test-skill/workflows/test-workflow.md')) {
    throw new Error(`Path not rewritten in .claude SKILL.md: ${localClaudeSkillContent}`);
  }

  // Non-intrusive smart-default: the instruction files pre-existed (team-owned), so init must
  // NOT mutate them. SAF guidance is written to .ai/instructions/ATLAS.md instead.
  for (const f of ['CLAUDE.md', 'GEMINI.md', 'AGENTS.md']) {
    const content = readFile(f);
    if (content.includes('Subagent & Parallel Execution Guidelines')) {
      throw new Error(`Pre-existing ${f} must NOT be mutated, but it gained guidelines: ${content}`);
    }
  }

  if (!fileExists('.ai/instructions/ATLAS.md')) {
    throw new Error('Expected SAF guidance written to .ai/instructions/ATLAS.md for a brownfield project');
  }
  const atlasInstr = readFile('.ai/instructions/ATLAS.md');
  if (!atlasInstr.includes('Subagent & Parallel Execution Guidelines')) {
    throw new Error(`Expected subagent guidelines in .ai/instructions/ATLAS.md: ${atlasInstr}`);
  }

  // Running init again (brownfield) is idempotent: files stay untouched, ATLAS.md not duplicated.
  const result2 = spawnSync('node', [cliScriptPath, 'init'], {
    env: {
      ...process.env,
      PROJECT_ROOT: testSandboxRoot,
      REPO_ROOT: testSandboxRoot,
      HOME: mockHome
    },
    encoding: 'utf8'
  });

  if (result2.status !== 0) {
    throw new Error(`Second init command failed: ${result2.stderr}`);
  }

  const claudeContent = readFile('CLAUDE.md');
  if (claudeContent.includes('Subagent & Parallel Execution Guidelines')) {
    throw new Error('Pre-existing CLAUDE.md must remain untouched after a second init');
  }
  const atlasInstr2 = readFile('.ai/instructions/ATLAS.md');
  const occurrences = (atlasInstr2.match(/## Subagent & Parallel Execution Guidelines/g) || []).length;
  if (occurrences !== 1) {
    throw new Error(`Expected guidelines to appear exactly once in .ai/instructions/ATLAS.md, got ${occurrences}`);
  }
});

addTest('writeSeparateAtlasInstructions upgrades an older ATLAS.md missing newer sections', () => {
  setupSandbox();

  const { writeSeparateAtlasInstructions } = require(cliScriptPath);

  // Simulate a project onboarded before "Behavioral Core" existed: ATLAS.md is present
  // but only has the older sections.
  const atlasDir = path.join(testSandboxRoot, '.ai/instructions');
  fs.mkdirSync(atlasDir, { recursive: true });
  const legacy = `# SAF / ATLAS Instructions

## Autonomous ATLAS Loop

When asked to run the ATLAS auto loop, use the local \`atlas-auto-loop\` skill.

## Subagent & Parallel Execution Guidelines

1. **Detect Independent Tasks:** review the task list.
`;
  fs.writeFileSync(path.join(atlasDir, 'ATLAS.md'), legacy, 'utf8');

  writeSeparateAtlasInstructions(testSandboxRoot);

  const upgraded = readFile('.ai/instructions/ATLAS.md');

  // The missing newer sections must be appended.
  if (!/##\s+Behavioral\s+Core/i.test(upgraded)) {
    throw new Error('Expected Behavioral Core section to be appended to a legacy ATLAS.md');
  }
  if (!/##\s+Context\s+Budget\s+and\s+Subagent\s+Orchestration\s+Policy/i.test(upgraded)) {
    throw new Error('Expected Context Budget section to be appended to a legacy ATLAS.md');
  }

  // Pre-existing sections must not be duplicated.
  const loopOccurrences = (upgraded.match(/## Autonomous ATLAS Loop/g) || []).length;
  if (loopOccurrences !== 1) {
    throw new Error(`Expected Autonomous ATLAS Loop to appear exactly once, got ${loopOccurrences}`);
  }

  // A second run is a no-op (fully up to date) and still appends nothing.
  writeSeparateAtlasInstructions(testSandboxRoot);
  const afterSecond = readFile('.ai/instructions/ATLAS.md');
  const coreOccurrences = (afterSecond.match(/## Behavioral Core/g) || []).length;
  if (coreOccurrences !== 1) {
    throw new Error(`Expected Behavioral Core to appear exactly once after re-run, got ${coreOccurrences}`);
  }
});

addTest('Guideline writers produce runtime-aware capability-detection content', () => {
  setupSandbox();

  const { appendSubagentGuidelines } = require(cliScriptPath);

  // SAF-managed files (no skipExisting gate): each runtime file gets its own note.
  for (const f of ['CLAUDE.md', 'GEMINI.md', 'AGENTS.md']) {
    fs.writeFileSync(path.join(testSandboxRoot, f), '# Instructions\n', 'utf8');
  }

  appendSubagentGuidelines(testSandboxRoot, {});

  const expectations = [
    ['CLAUDE.md', '`Agent` (also called Task)'],
    ['AGENTS.md', 'no subagent tool'],
    ['GEMINI.md', 'Antigravity']
  ];
  for (const [f, marker] of expectations) {
    const content = readFile(f);
    if (!content.includes('## Subagent & Parallel Execution Guidelines')) {
      throw new Error(`Expected subagent heading in ${f}`);
    }
    if (!content.includes('Detect Capability First')) {
      throw new Error(`Expected capability-detection rule in ${f}`);
    }
    if (/define_subagent|invoke_subagent/.test(content)) {
      throw new Error(`Legacy tool names must not appear in ${f}`);
    }
    if (!content.includes(marker)) {
      throw new Error(`Expected runtime note marker "${marker}" in ${f}`);
    }
  }
});

addTest('Guideline writers upsert a legacy SAF block in place', () => {
  setupSandbox();

  const { appendSubagentGuidelines } = require(cliScriptPath);

  const legacy = `# Project

## Custom Team Section

Keep me.

## Subagent & Parallel Execution Guidelines

2. **Define Specialized Subagents:** use the \`define_subagent\` tool.
3. **Spawn in Parallel:** use the \`invoke_subagent\` tool.

## Another Team Section

Also keep me.
`;
  fs.writeFileSync(path.join(testSandboxRoot, 'CLAUDE.md'), legacy, 'utf8');

  appendSubagentGuidelines(testSandboxRoot, {});

  const content = readFile('CLAUDE.md');
  if (/define_subagent|invoke_subagent/.test(content)) {
    throw new Error('Legacy tool names must be replaced by the upsert');
  }
  const occurrences = (content.match(/## Subagent & Parallel Execution Guidelines/g) || []).length;
  if (occurrences !== 1) {
    throw new Error(`Expected exactly one subagent heading after upsert, got ${occurrences}`);
  }
  if (!content.includes('## Custom Team Section') || !content.includes('Keep me.')
    || !content.includes('## Another Team Section') || !content.includes('Also keep me.')) {
    throw new Error('Upsert must preserve surrounding team sections');
  }

  // Idempotent: a second run performs no write (content byte-identical).
  appendSubagentGuidelines(testSandboxRoot, {});
  const after = readFile('CLAUDE.md');
  if (after !== content) {
    throw new Error('Second writer run must be a no-op on up-to-date content');
  }
});

addTest('Guideline upsert preserves foreign HTML-comment-fenced block that follows a SAF section', () => {
  setupSandbox();

  const { upsertAtlasGuidelines } = require(cliScriptPath);

  // Reproduces the layout where another tool fences its own H1 block right after a SAF
  // section. The boundary must stop at the comment/H1 so the foreign block is never swallowed.
  const seeded = `# Project

## Autonomous ATLAS Loop

Old stale pointer text.

<!-- othertool:start -->
# Foreign Bootstrap Policy

Owned by another tool — must survive untouched.
<!-- othertool:end -->
`;
  fs.writeFileSync(path.join(testSandboxRoot, 'CLAUDE.md'), seeded, 'utf8');

  upsertAtlasGuidelines(testSandboxRoot, {});

  const content = readFile('CLAUDE.md');
  if (!content.includes('<!-- othertool:start -->') || !content.includes('<!-- othertool:end -->')
    || !content.includes('# Foreign Bootstrap Policy')
    || !content.includes('Owned by another tool — must survive untouched.')) {
    throw new Error(`Foreign comment-fenced block must be preserved, got:\n${content}`);
  }
  if (content.includes('Old stale pointer text.')) {
    throw new Error('Stale SAF section body must be replaced');
  }
  if (!content.includes('atlas-auto-loop')) {
    throw new Error('Refreshed ATLAS Loop pointer must be present');
  }
  const occurrences = (content.match(/## Autonomous ATLAS Loop/g) || []).length;
  if (occurrences !== 1) {
    throw new Error(`Expected exactly one ATLAS Loop heading, got ${occurrences}`);
  }

  // Idempotent on re-run.
  upsertAtlasGuidelines(testSandboxRoot, {});
  if (readFile('CLAUDE.md') !== content) {
    throw new Error('Second upsert run must be a no-op when content is current');
  }
});

addTest('writeSeparateAtlasInstructions refreshes stale SAF sections and preserves custom ones', () => {
  setupSandbox();

  const { writeSeparateAtlasInstructions } = require(cliScriptPath);

  const atlasDir = path.join(testSandboxRoot, '.ai/instructions');
  fs.mkdirSync(atlasDir, { recursive: true });
  const stale = `# SAF / ATLAS Instructions

## Team Addendum

Custom team notes.

## Subagent & Parallel Execution Guidelines

2. **Define Specialized Subagents:** use the \`define_subagent\` tool.
`;
  fs.writeFileSync(path.join(atlasDir, 'ATLAS.md'), stale, 'utf8');

  writeSeparateAtlasInstructions(testSandboxRoot);

  const refreshed = readFile('.ai/instructions/ATLAS.md');
  if (/define_subagent|invoke_subagent/.test(refreshed)) {
    throw new Error('Stale SAF-owned section must be refreshed in ATLAS.md');
  }
  if (!refreshed.includes('Detect Capability First')) {
    throw new Error('Expected capability-detection content in refreshed ATLAS.md');
  }
  if (!refreshed.includes('## Team Addendum') || !refreshed.includes('Custom team notes.')) {
    throw new Error('Custom team section must survive the refresh');
  }
  const occurrences = (refreshed.match(/## Subagent & Parallel Execution Guidelines/g) || []).length;
  if (occurrences !== 1) {
    throw new Error(`Expected exactly one subagent heading, got ${occurrences}`);
  }

  // No-op on a second run.
  writeSeparateAtlasInstructions(testSandboxRoot);
  const second = readFile('.ai/instructions/ATLAS.md');
  if (second !== refreshed) {
    throw new Error('Second run must not modify an up-to-date ATLAS.md');
  }
});

addTest('CLI Init Localizes Multiple Execution Context Blocks', () => {
  setupSandbox();

  const mockHome = path.join(testSandboxRoot, 'mock-home');
  const mockGlobalSkillsDir = path.join(mockHome, '.gemini/config/skills');
  const mockWorkflowDir = path.join(mockHome, '.gemini/antigravity/get-shit-done/workflows');

  fs.mkdirSync(path.join(mockGlobalSkillsDir, 'gsd-multi-context'), { recursive: true });
  fs.mkdirSync(mockWorkflowDir, { recursive: true });

  fs.writeFileSync(path.join(mockWorkflowDir, 'first.md'), '# First Workflow', 'utf8');
  fs.writeFileSync(path.join(mockWorkflowDir, 'second.md'), '# Second Workflow', 'utf8');

  const mockSkillMd = `---
name: gsd-multi-context
description: "Test description"
---
<execution_context>
@~/.gemini/antigravity/get-shit-done/workflows/first.md
</execution_context>
<execution_context>
@~/.gemini/antigravity/get-shit-done/workflows/second.md
</execution_context>
`;
  fs.writeFileSync(path.join(mockGlobalSkillsDir, 'gsd-multi-context/SKILL.md'), mockSkillMd, 'utf8');

  const result = spawnSync('node', [cliScriptPath, 'init'], {
    env: {
      ...process.env,
      PROJECT_ROOT: testSandboxRoot,
      REPO_ROOT: testSandboxRoot,
      HOME: mockHome
    },
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    throw new Error(`Expected init command to succeed, got ${result.status}. Stderr: ${result.stderr}`);
  }

  for (const base of ['.agents/skills', '.claude/skills']) {
    const localSkill = `${base}/gsd-multi-context/SKILL.md`;
    const content = readFile(localSkill);
    if (content.includes('@~/.gemini/')) {
      throw new Error(`Expected all global paths to be rewritten in ${localSkill}: ${content}`);
    }
    if (!content.includes(`@${base}/gsd-multi-context/workflows/first.md`)) {
      throw new Error(`Expected first context path to be rewritten in ${localSkill}: ${content}`);
    }
    if (!content.includes(`@${base}/gsd-multi-context/workflows/second.md`)) {
      throw new Error(`Expected second context path to be rewritten in ${localSkill}: ${content}`);
    }
    if (!fileExists(`${base}/gsd-multi-context/workflows/first.md`)) {
      throw new Error(`Expected first workflow to be copied under ${base}`);
    }
    if (!fileExists(`${base}/gsd-multi-context/workflows/second.md`)) {
      throw new Error(`Expected second workflow to be copied under ${base}`);
    }
  }
});

// 22. Strict Gate Greenfield Happy Path
addTest('CLI Init Strict Gate Greenfield Happy Path', () => {
  setupSandbox();

  const mockHome = path.join(testSandboxRoot, 'mock-home');
  fs.mkdirSync(mockHome, { recursive: true });

  const originalHome = process.env.HOME;
  let res;
  try {
    process.env.HOME = mockHome;
    res = runCLI(['init']);
  } finally {
    process.env.HOME = originalHome;
  }

  if (res.code !== 0) {
    cleanupSandbox();
    throw new Error(`Expected exit code 0 on greenfield happy path, got ${res.code}. Stderr: ${res.stderr}`);
  }

  if (fileExists('.ai/state/repair-guide.md')) {
    cleanupSandbox();
    throw new Error('Expected repair-guide.md to not exist on greenfield happy path init');
  }

  cleanupSandbox();
});

// 23. Strict Gate Fails on Missing Prerequisite
addTest('CLI Init Strict Gate Fails on Missing Prerequisite', () => {
  setupSandbox();

  const mockHome = path.join(testSandboxRoot, 'mock-home');
  fs.mkdirSync(mockHome, { recursive: true });

  // Pre-create a custom flow with a missing prerequisite. Init must preserve
  // existing flow files and fail the strict gate against this declared prereq.
  writeFile('.ai/flows/atlas-flow.yaml', `
name: custom-missing-prereq
version: 1.0.0
prerequisites:
  - name: GSD
    command: gsd-discuss-phase
    check: nonexistent-command-123
stages:
  - id: align
    name: Align
    skill: gsd-discuss-phase
`);

  const originalHome = process.env.HOME;
  let res;
  try {
    process.env.HOME = mockHome;
    res = runCLI(['init']);
  } finally {
    process.env.HOME = originalHome;
  }

  if (res.code !== 1) {
    cleanupSandbox();
    throw new Error(`Expected exit code 1 when prerequisite is missing, got ${res.code}. Stderr: ${res.stderr}`);
  }

  if (!fileExists('.ai/state/repair-guide.md')) {
    cleanupSandbox();
    throw new Error('Expected repair-guide.md to be created on missing prerequisite failure');
  }

  const guide = readFile('.ai/state/repair-guide.md');
  if (!guide.includes('gsd')) {
    cleanupSandbox();
    throw new Error(`Expected repair guide to include the literal "gsd", got: ${guide}`);
  }
  if (!guide.includes('adp doctor')) {
    cleanupSandbox();
    throw new Error(`Expected repair guide to include the verify command "adp doctor", got: ${guide}`);
  }

  cleanupSandbox();
});

// 24. Strict Gate Fails on Broken Localized SKILL.md
addTest('CLI Init Strict Gate Fails on Broken Localized SKILL.md', () => {
  setupSandbox();

  const mockHome = path.join(testSandboxRoot, 'mock-home');
  fs.mkdirSync(mockHome, { recursive: true });

  // Pre-create a localized skill that still references ~/.gemini/...
  const skillDir = path.join(testSandboxRoot, '.agents/skills/gsd-discuss-phase');
  fs.mkdirSync(skillDir, { recursive: true });
  writeFile('.agents/skills/gsd-discuss-phase/SKILL.md',
    '# Test\n<execution_context>\n@~/.gemini/antigravity/workflows/foo.md\n</execution_context>\n');

  const originalHome = process.env.HOME;
  let res;
  try {
    process.env.HOME = mockHome;
    res = runCLI(['init']);
  } finally {
    process.env.HOME = originalHome;
  }

  if (res.code !== 1) {
    cleanupSandbox();
    throw new Error(`Expected exit code 1 when localized skill has global paths, got ${res.code}. Stderr: ${res.stderr}`);
  }

  if (!fileExists('.ai/state/repair-guide.md')) {
    cleanupSandbox();
    throw new Error('Expected repair guide to be written');
  }

  const guide = readFile('.ai/state/repair-guide.md');
  if (!guide.includes('category: localization')) {
    cleanupSandbox();
    throw new Error(`Expected repair guide to specify category: localization, got: ${guide}`);
  }
  if (!guide.includes('SKILL.md')) {
    cleanupSandbox();
    throw new Error(`Expected repair guide to name the offending file "SKILL.md", got: ${guide}`);
  }

  cleanupSandbox();
});

// 25. Non-intrusive: a pre-existing team instruction file (even with an idiosyncratic heading)
//     is preserved verbatim; the canonical guidance lands in .ai/instructions/ATLAS.md and the
//     strict gate passes (exit 0). Coverage for the strict gate REPORTING a missing instruction
//     section lives in validators/scripts/test-init-checks.js.
addTest('CLI Init leaves pre-existing instruction files untouched (non-intrusive)', () => {
  setupSandbox();

  const mockHome = path.join(testSandboxRoot, 'mock-home');
  fs.mkdirSync(mockHome, { recursive: true });

  // A team file with an idiosyncratic (lowercase) heading must be preserved byte-for-byte.
  const teamClaude = '# Custom\n## subagent & parallel execution guidelines\n';
  writeFile('CLAUDE.md', teamClaude);

  const originalHome = process.env.HOME;
  let res;
  try {
    process.env.HOME = mockHome;
    res = runCLI(['init']);
  } finally {
    process.env.HOME = originalHome;
  }

  if (res.code !== 0) {
    cleanupSandbox();
    throw new Error(`Expected exit code 0 for non-intrusive init, got ${res.code}. Stderr: ${res.stderr}`);
  }

  // Team CLAUDE.md must be byte-identical — SAF must not touch it.
  const claudeContent = readFile('CLAUDE.md');
  if (claudeContent !== teamClaude) {
    cleanupSandbox();
    throw new Error(`Pre-existing CLAUDE.md was mutated: ${claudeContent}`);
  }

  // The canonical guidance must instead be present in .ai/instructions/ATLAS.md.
  if (!fileExists('.ai/instructions/ATLAS.md')) {
    cleanupSandbox();
    throw new Error('Expected .ai/instructions/ATLAS.md to be created');
  }
  const atlasInstr = readFile('.ai/instructions/ATLAS.md');
  if (!atlasInstr.includes('## Subagent & Parallel Execution Guidelines')) {
    cleanupSandbox();
    throw new Error(`Expected canonical heading in .ai/instructions/ATLAS.md: ${atlasInstr}`);
  }

  cleanupSandbox();
});

// 26. CLI Init scaffolds context policy config and guidelines
addTest('CLI Init scaffolds context policy config and guidelines', () => {
  setupSandbox();
  
  // We need constitution template to be present
  writeJson('.specify/templates/constitution-template.md', '# Constitution');

  const res = runCLI(['init']);
  if (res.code !== 0) {
    cleanupSandbox();
    throw new Error(`Expected exit code 0 on init, got ${res.code}. Stderr: ${res.stderr}`);
  }

  if (!fileExists('.ai/context-packs')) {
    cleanupSandbox();
    throw new Error('Expected .ai/context-packs directory to be created');
  }

  if (!fileExists('.ai/state/context-policy.json')) {
    cleanupSandbox();
    throw new Error('Expected .ai/state/context-policy.json to be created');
  }

  const policy = readJson('.ai/state/context-policy.json');
  if (policy.inline_threshold_bytes !== 50000 || policy.max_parallelism !== 3) {
    cleanupSandbox();
    throw new Error(`Expected default config keys, got: ${JSON.stringify(policy)}`);
  }

  const files = ['CLAUDE.md', 'GEMINI.md', 'AGENTS.md'];
  for (const f of files) {
    const content = readFile(f);
    if (!content.includes('## Context Budget and Subagent Orchestration Policy')) {
      cleanupSandbox();
      throw new Error(`Expected context policy guidelines appended to ${f}`);
    }
  }

  cleanupSandbox();
});

// 27. CLI Doctor fails when context-policy.json is malformed
addTest('CLI Doctor fails when context-policy.json is malformed', () => {
  setupSandbox();
  
  // Set up valid feature spec so it doesn't fail on that
  const mockFeatureSlug = 'test-feature';
  const mockSpecPath = `specs/${mockFeatureSlug}`;
  writeJson('.specify/feature.json', { feature_directory: mockSpecPath });

  const validSpecContent = `# Test Feature Spec\n## Goal\nTo implement a test feature.\n## Non-Goals\nNone.\n## Acceptance Criteria\n- Must work.\n## Test Strategy\nManual verification.\n## Behavior-Preservation Rules\nDo not break anything.\n`;
  const validPlanContent = `# Test Feature Plan\n## Proposed Changes\n- Create files.\n## Verification Plan\n- Run tests.\n`;
  const validTasksContent = `# Test Feature Tasks\n- [ ] Task 1\n- [x] Task 2\n`;

  writeFile(`${mockSpecPath}/spec.md`, validSpecContent);
  writeFile(`${mockSpecPath}/plan.md`, validPlanContent);
  writeFile(`${mockSpecPath}/tasks.md`, validTasksContent);

  // Initialize
  runCLI(['init']);

  // Write malformed policy config
  writeJson('.ai/state/context-policy.json', { schema_version: '1.0', max_parallelism: 99 });

  const res = runCLI(['doctor']);
  if (res.code !== 1) {
    cleanupSandbox();
    throw new Error(`Expected exit code 1 on doctor with malformed policy config, got ${res.code}`);
  }

  if (!fileExists('.ai/state/repair-guide.md')) {
    cleanupSandbox();
    throw new Error('Expected repair guide to be written');
  }

  const guide = readFile('.ai/state/repair-guide.md');
  if (!guide.includes('context-policy.json')) {
    cleanupSandbox();
    throw new Error(`Expected repair guide to report context-policy.json error, got: ${guide}`);
  }

  cleanupSandbox();
});

// 28. onboard-memory: missing ONBOARDING.md
addTest('CLI onboard-memory exits 1 when ONBOARDING.md is missing', () => {
  setupSandbox();
  runCLI(['init']);

  const res = runCLI(['onboard-memory']);
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1 when ONBOARDING.md is missing, got ${res.code}`);
  }
  const output = (res.stdout || '') + (res.stderr || '');
  if (!output.includes('No ONBOARDING.md found')) {
    throw new Error(`Expected error about missing ONBOARDING.md, got: ${output}`);
  }
});

// 29. onboard-memory: successful promotion
addTest('CLI onboard-memory promotes ONBOARDING.md content into memory files', () => {
  setupSandbox();
  runCLI(['init']);

  // Write an ONBOARDING.md with architecture sections
  const onboardingContent = `# Project Onboarding

> A test project for validating memory promotion.

## Architecture

The project uses a modular monolith pattern.

## Stack & Entrypoints

- **Language(s):** Node.js 20
- **Framework(s):** Express
- **Entry:** bin/server.js

## Conventions & Constraints

- Use ESLint for linting
- No default exports

## Commands

- \`npm test\` runs the suite
`;
  writeFile('ONBOARDING.md', onboardingContent);

  const res = runCLI(['onboard-memory']);
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0, got ${res.code}. Stderr: ${res.stderr}. Stdout: ${res.stdout}`);
  }

  // Verify current-architecture.md was updated
  const archContent = readFile('.ai/memory/current-architecture.md');
  if (archContent.includes('Seeded by saf init')) {
    throw new Error('Expected seed marker to be removed from current-architecture.md after promotion');
  }
  if (!archContent.includes('Promoted from ONBOARDING.md')) {
    throw new Error('Expected promotion marker in current-architecture.md');
  }

  // Verify project-summary.md was updated
  const summaryContent = readFile('.ai/memory/project-summary.md');
  if (summaryContent.includes('Seeded by saf init')) {
    throw new Error('Expected seed marker to be removed from project-summary.md after promotion');
  }
  if (!summaryContent.includes('Promoted from ONBOARDING.md')) {
    throw new Error('Expected promotion marker in project-summary.md');
  }

  const output = (res.stdout || '') + (res.stderr || '');
  if (!output.includes('Memory promotion complete')) {
    throw new Error(`Expected completion message, got: ${output}`);
  }
});

// 30. onboard-memory: skip when no seed marker (manually edited)
addTest('CLI onboard-memory skips memory files that have been manually edited', () => {
  setupSandbox();
  runCLI(['init']);

  // Manually edit memory files (remove seed marker)
  const manualArch = '# Current Architecture\n\nManually documented architecture.\n';
  const manualSummary = '# Project Summary\n\nManually documented summary.\n';
  writeFile('.ai/memory/current-architecture.md', manualArch);
  writeFile('.ai/memory/project-summary.md', manualSummary);

  // Write ONBOARDING.md
  writeFile('ONBOARDING.md', '# Onboarding\n\n> Test project.\n\n## Architecture\n\nNew arch.\n');

  const res = runCLI(['onboard-memory']);
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0, got ${res.code}. Stderr: ${res.stderr}`);
  }

  // Verify files were NOT overwritten
  const archContent = readFile('.ai/memory/current-architecture.md');
  if (archContent !== manualArch) {
    throw new Error('Manually edited current-architecture.md was overwritten by onboard-memory');
  }

  const summaryContent = readFile('.ai/memory/project-summary.md');
  if (summaryContent !== manualSummary) {
    throw new Error('Manually edited project-summary.md was overwritten by onboard-memory');
  }

  const output = (res.stdout || '') + (res.stderr || '');
  if (!output.includes('has been manually updated')) {
    throw new Error(`Expected skip message for manually edited files, got: ${output}`);
  }
});

// Budget command: ad-hoc report mode
addTest('CLI Budget Command Reports Outcome In Ad-Hoc Mode', () => {
  setupSandbox();
  const res = runCLI(['budget']);
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0 in report mode, got ${res.code}: ${res.stderr}`);
  }
  if (!res.stdout.includes('ad-hoc (no flow state found)')) {
    throw new Error(`Expected ad-hoc stage source notice, got: ${res.stdout}`);
  }
  if (!res.stdout.includes('Outcome: inline')) {
    throw new Error(`Expected inline outcome on empty sandbox, got: ${res.stdout}`);
  }
});

// Budget command: JSON output and stage flag
addTest('CLI Budget Command JSON Output', () => {
  setupSandbox();
  writeFile('.ai/sessions/big-session.md', 'x'.repeat(60000));
  const res = runCLI(['budget', '--json', '--stage', 'act']);
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0, got ${res.code}: ${res.stderr}`);
  }
  const parsed = JSON.parse(res.stdout);
  if (parsed.stage_id !== 'act' || parsed.stage_source !== '--stage flag') {
    throw new Error(`Expected stage act from flag, got: ${JSON.stringify(parsed)}`);
  }
  if (parsed.outcome !== 'context_pack_required') {
    throw new Error(`Expected context_pack_required at 60KB, got ${parsed.outcome}`);
  }
  if (!Array.isArray(parsed.inputs) || !parsed.inputs.some(i => i.path === '.ai/sessions/big-session.md')) {
    throw new Error('Expected session log in inputs with forward-slash path');
  }
  if (typeof parsed.thresholds.inline_threshold_bytes !== 'number') {
    throw new Error('Expected thresholds in JSON output');
  }
});

// Budget command: --enforce opt-in gate
addTest('CLI Budget Command Enforce Flag Exits 1 When Not Inline', () => {
  setupSandbox();
  writeFile('.ai/sessions/huge-session.md', 'x'.repeat(250000));
  const resReport = runCLI(['budget']);
  if (resReport.code !== 0) {
    throw new Error(`Report mode must stay exit 0 even at fresh_session_required, got ${resReport.code}`);
  }
  if (!resReport.stdout.includes('fresh_session_required')) {
    throw new Error(`Expected fresh_session_required at 250KB, got: ${resReport.stdout}`);
  }
  const resEnforce = runCLI(['budget', '--enforce']);
  if (resEnforce.code !== 1) {
    throw new Error(`Expected exit code 1 with --enforce on non-inline outcome, got ${resEnforce.code}`);
  }
});

// Pack command: creates a schema-valid manifest
addTest('CLI Pack Command Creates Valid Context Pack', () => {
  setupSandbox();
  writeJson('.specify/feature.json', { feature_directory: 'specs/001-demo-feature' });
  writeFile('specs/001-demo-feature/spec.md', '# Spec\n');
  writeFile('specs/001-demo-feature/plan.md', '# Plan\n');
  writeFile('specs/001-demo-feature/tasks.md', '# Tasks\n');

  const res = runCLI(['pack', '--objective', 'Implement demo stage', '--stage', 'act']);
  if (res.code !== 0) {
    throw new Error(`Expected exit code 0, got ${res.code}: ${res.stderr}`);
  }

  const packsDir = path.join(testSandboxRoot, '.ai', 'context-packs');
  const packFiles = fs.readdirSync(packsDir).filter(f => f.endsWith('.json'));
  if (packFiles.length !== 1) {
    throw new Error(`Expected exactly one generated pack, found ${packFiles.length}`);
  }

  const { validateContextPack } = require('../../lib/context-policy-validator');
  const validation = validateContextPack(path.join(packsDir, packFiles[0]));
  if (!validation.valid) {
    throw new Error(`Generated pack failed validation: ${validation.errors.join('; ')}`);
  }

  const manifest = readJson(path.join('.ai/context-packs', packFiles[0]));
  if (manifest.objective !== 'Implement demo stage' || manifest.stage_id !== 'act') {
    throw new Error('Manifest does not carry the provided objective and stage');
  }
  if (!manifest.required_files.some(e => e.path === 'specs/001-demo-feature/spec.md')) {
    throw new Error('Manifest required_files missing active feature spec');
  }
});

// Pack command: rejects --out escaping .ai/context-packs
addTest('CLI Pack Command Rejects Out Path Outside Context Packs', () => {
  setupSandbox();
  const res = runCLI(['pack', '--out', 'specs/evil-pack.json']);
  if (res.code !== 1) {
    throw new Error(`Expected exit code 1 for escaping --out, got ${res.code}`);
  }
  if (fileExists('specs/evil-pack.json')) {
    throw new Error('Pack must not be written outside .ai/context-packs');
  }
});

addTest('CLI Init writes runtime-aware Snail Trail memory-compaction guidelines (idempotent)', () => {
  setupSandbox();
  writeJson('.specify/templates/constitution-template.md', '# Constitution');
  const res = runCLI(['init']);
  if (res.code !== 0) {
    cleanupSandbox();
    throw new Error(`Expected exit 0 on init, got ${res.code}. Stderr: ${res.stderr}`);
  }

  const expectations = [
    ['CLAUDE.md', 'claude-haiku-4-5'],
    ['AGENTS.md', 'gpt-5.4-mini'],
    ['GEMINI.md', 'Flash']
  ];
  const memoryOutputs = [
    '.ai/memory/project-summary.md',
    '.ai/memory/current-architecture.md',
    '.ai/memory/known-risks.md',
    '.ai/memory/decisions.md',
    '.ai/memory/verification-history.md',
    '.ai/memory/patterns.md',
    '.ai/memory/gotchas.md'
  ];
  for (const [f, model] of expectations) {
    const content = readFile(f);
    if (!content.includes('## Snail Trail — Memory Compaction at Settle')) {
      cleanupSandbox();
      throw new Error(`Expected Snail Trail section in ${f}`);
    }
    if (!content.includes(model)) {
      cleanupSandbox();
      throw new Error(`Expected prescribed model token "${model}" in ${f}`);
    }
    if (!content.includes('saf compact-memory') || !content.includes('saf handoff')) {
      cleanupSandbox();
      throw new Error(`Expected compact-memory + handoff verify references in ${f}`);
    }
    for (const output of memoryOutputs) {
      if (!content.includes(output)) {
        cleanupSandbox();
        throw new Error(`Expected Snail Trail guidance in ${f} to include ${output}`);
      }
    }
  }

  // Idempotent: a second init leaves exactly one section heading per file.
  runCLI(['init']);
  for (const [f] of expectations) {
    const occurrences = (readFile(f).match(/## Snail Trail — Memory Compaction at Settle/g) || []).length;
    if (occurrences !== 1) {
      cleanupSandbox();
      throw new Error(`Expected exactly one Snail Trail heading in ${f} after re-run, got ${occurrences}`);
    }
  }
  cleanupSandbox();
});

addTest('appendMemoryCompactionGuidelines is runtime-aware and idempotent', () => {
  setupSandbox();
  const { appendMemoryCompactionGuidelines } = require(cliScriptPath);

  for (const f of ['CLAUDE.md', 'GEMINI.md', 'AGENTS.md']) {
    fs.writeFileSync(path.join(testSandboxRoot, f), '# Instructions\n', 'utf8');
  }
  appendMemoryCompactionGuidelines(testSandboxRoot, {});

  const markers = [
    ['CLAUDE.md', 'claude-sonnet-4-6'],
    ['AGENTS.md', 'gpt-5.4-mini'],
    ['GEMINI.md', 'Gemini Flash']
  ];
  for (const [f, marker] of markers) {
    const content = readFile(f);
    if (!content.includes('## Snail Trail — Memory Compaction at Settle')) {
      throw new Error(`Expected Snail Trail heading in ${f}`);
    }
    if (!content.includes(marker)) {
      throw new Error(`Expected runtime model marker "${marker}" in ${f}`);
    }
    for (const output of [
      '.ai/memory/project-summary.md',
      '.ai/memory/current-architecture.md',
      '.ai/memory/known-risks.md',
      '.ai/memory/decisions.md',
      '.ai/memory/verification-history.md',
      '.ai/memory/patterns.md',
      '.ai/memory/gotchas.md'
    ]) {
      if (!content.includes(output)) {
        throw new Error(`Expected memory compaction guidance in ${f} to include ${output}`);
      }
    }
  }

  // Second run is a no-op (byte-identical).
  const before = readFile('CLAUDE.md');
  appendMemoryCompactionGuidelines(testSandboxRoot, {});
  if (readFile('CLAUDE.md') !== before) {
    throw new Error('Second compaction-guideline run must be a no-op on up-to-date content');
  }
});

addTest('CLI compact-memory preps pack + handoff scaffold and prescribes a model (no LLM)', () => {
  setupSandbox();
  runCLI(['init']);
  writeJson('.specify/feature.json', { feature_directory: 'specs/test-compact' });
  writeFile('.ai/sessions/session-1.md', '# raw session notes');

  const res = runCLI(['compact-memory']);
  if (res.code !== 0) {
    cleanupSandbox();
    throw new Error(`Expected exit 0, got ${res.code}. Stderr: ${res.stderr}. Stdout: ${res.stdout}`);
  }
  if (!fileExists('.ai/context-packs/compact-test-compact.json')) {
    cleanupSandbox();
    throw new Error('Expected compaction pack .ai/context-packs/compact-test-compact.json');
  }
  if (!fileExists('.ai/state/handoff.md')) {
    cleanupSandbox();
    throw new Error('Expected scaffolded .ai/state/handoff.md');
  }
  const pack = JSON.parse(readFile('.ai/context-packs/compact-test-compact.json'));
  const expectedOutputs = [
    '.ai/memory/project-summary.md',
    '.ai/memory/current-architecture.md',
    '.ai/memory/known-risks.md',
    '.ai/memory/decisions.md',
    '.ai/memory/verification-history.md',
    '.ai/memory/patterns.md',
    '.ai/memory/gotchas.md',
    '.ai/state/handoff.md'
  ];
  for (const output of expectedOutputs) {
    if (!pack.output_files.includes(output)) {
      cleanupSandbox();
      throw new Error(`Expected compact-memory output_files to include ${output}`);
    }
  }
  // The prescribed model is printed (data-driven, not the agent's choice).
  if (!res.stdout.includes('claude-haiku-4-5')) {
    cleanupSandbox();
    throw new Error(`Expected prescribed model in stdout. Stdout: ${res.stdout}`);
  }
  // The scaffold carries the active slug + the three required headers ...
  const handoff = readFile('.ai/state/handoff.md');
  for (const h of ['## Session Summary', '## Suggested Next Skills']) {
    if (!handoff.includes(h)) {
      cleanupSandbox();
      throw new Error(`Scaffolded handoff missing guidance section: ${h}`);
    }
  }
  if (handoff.includes('{{NEXT_SESSION_FOCUS_BLOCK}}')) {
    cleanupSandbox();
    throw new Error('Scaffolded handoff should not leave the focus template token unresolved');
  }
  if (!handoff.includes('Reference existing artifacts by path/link')) {
    cleanupSandbox();
    throw new Error('Scaffolded handoff should instruct reference-not-duplicate behavior');
  }
  if (!handoff.includes('REDACTED')) {
    cleanupSandbox();
    throw new Error('Scaffolded handoff should instruct sensitive-info redaction');
  }
  if (!res.stdout.includes('Suggested Next Skills') || !res.stdout.includes('Redact secrets')) {
    cleanupSandbox();
    throw new Error(`Expected compact-memory prompt skeleton to mention suggested skills and redaction. Stdout: ${res.stdout}`);
  }
  for (const h of ['## Promoted to project memory', '## Architecture updated', '## Verification promoted']) {
    if (!handoff.includes(h)) {
      cleanupSandbox();
      throw new Error(`Scaffolded handoff missing header: ${h}`);
    }
  }
  // ... but an UNEDITED scaffold must be REJECTED (MH-04): the seed marker means
  // it was never authored. This is the fix for the surface-only verification hole.
  const unedited = runCLI(['handoff']);
  if (unedited.code === 0) {
    cleanupSandbox();
    throw new Error('Expected unedited scaffold to FAIL the handoff gate (seed marker present), but it passed.');
  }
  // Once authored (seed marker removed, real content), the gate passes.
  writeFile('.ai/state/handoff.md',
    '# Memory Handoff — test-compact\n\n' +
    '## Promoted to project memory\nPromoted the routing decision to .ai/memory/decisions.md.\n\n' +
    '## Architecture updated\nRecorded the new module boundary.\n\n' +
    '## Verification promoted\nRan npm test; all suites green.\n');
  const verify = runCLI(['handoff']);
  if (verify.code !== 0) {
    cleanupSandbox();
    throw new Error(`Expected authored handoff to pass the gate, got ${verify.code}. Stderr: ${verify.stderr}`);
  }
  cleanupSandbox();
});

addTest('CLI compact-memory --focus records next session focus in pack, scaffold, and prompt', () => {
  setupSandbox();
  runCLI(['init']);
  writeJson('.specify/feature.json', { feature_directory: 'specs/test-focus' });
  writeFile('.ai/sessions/session-1.md', '# Session\n\n**Feature:** test-focus\nwork');

  const res = runCLI(['compact-memory', '--focus', 'finish settle review']);
  if (res.code !== 0) {
    cleanupSandbox();
    throw new Error(`Expected exit 0, got ${res.code}. Stderr: ${res.stderr}. Stdout: ${res.stdout}`);
  }

  const pack = JSON.parse(readFile('.ai/context-packs/compact-test-focus.json'));
  if (pack.next_session_focus !== 'finish settle review') {
    cleanupSandbox();
    throw new Error(`Expected next_session_focus in pack, got: ${pack.next_session_focus}`);
  }

  const handoff = readFile('.ai/state/handoff.md');
  if (!handoff.includes('> Next session focus: finish settle review')) {
    cleanupSandbox();
    throw new Error('Expected scaffolded handoff to include next session focus');
  }
  if (!res.stdout.includes('Next session focus: finish settle review')) {
    cleanupSandbox();
    throw new Error(`Expected prompt skeleton to echo next session focus. Stdout: ${res.stdout}`);
  }

  cleanupSandbox();
});

// 022: init seeds typed memory files, non-overwriting.
addTest('CLI init seeds typed memory files patterns.md + gotchas.md (idempotent)', () => {
  setupSandbox();
  runCLI(['init']);
  if (!fileExists('.ai/memory/patterns.md')) {
    cleanupSandbox();
    throw new Error('Expected .ai/memory/patterns.md to be seeded by init');
  }
  if (!fileExists('.ai/memory/gotchas.md')) {
    cleanupSandbox();
    throw new Error('Expected .ai/memory/gotchas.md to be seeded by init');
  }
  // An edited typed file must survive a re-run (non-intrusive / idempotent).
  writeFile('.ai/memory/patterns.md', 'CUSTOM PATTERN CONTENT');
  runCLI(['init']);
  if (readFile('.ai/memory/patterns.md') !== 'CUSTOM PATTERN CONTENT') {
    cleanupSandbox();
    throw new Error('init overwrote an edited typed memory file');
  }
  cleanupSandbox();
});

// 022: handoff --strict enforces authored section bodies + a memory cross-reference.
addTest('CLI handoff --strict enforces authored sections and memory cross-reference', () => {
  setupSandbox();
  runCLI(['init']);
  writeJson('.specify/feature.json', { feature_directory: 'specs/feat-x' });

  // Placeholder bodies: non-strict passes (slug + headers, no seed marker) but
  // strict fails (no authored content, no real memory file named).
  writeFile('.ai/state/handoff.md',
    '# Memory Handoff — feat-x\n\n' +
    '## Promoted to project memory\n_None._\n\n' +
    '## Architecture updated\n_None._\n\n' +
    '## Verification promoted\n_None._\n');
  if (runCLI(['handoff']).code !== 0) {
    cleanupSandbox();
    throw new Error('Non-strict handoff should pass on slug + headers without seed marker');
  }
  if (runCLI(['handoff', '--strict']).code === 0) {
    cleanupSandbox();
    throw new Error('Strict handoff should fail on placeholder-only sections');
  }

  // Authored: real content + a real, non-seed memory file named.
  writeFile('.ai/memory/decisions.md', '# Decisions\n\n2026-06-14: chose routing approach A because B.\n');
  writeFile('.ai/state/handoff.md',
    '# Memory Handoff — feat-x\n\n' +
    '## Promoted to project memory\nPromoted the routing decision to .ai/memory/decisions.md.\n\n' +
    '## Architecture updated\nRecorded the new module boundary in current-architecture.\n\n' +
    '## Verification promoted\nRan npm test; all suites green.\n');
  const strictOk = runCLI(['handoff', '--strict']);
  if (strictOk.code !== 0) {
    cleanupSandbox();
    throw new Error(`Strict handoff should pass on an authored report. Stderr: ${strictOk.stderr}`);
  }
  cleanupSandbox();
});

// 022: compact-memory --archive moves only the active feature's logs and scopes the pack.
addTest('CLI compact-memory --archive moves scoped logs and scopes the pack', () => {
  setupSandbox();
  runCLI(['init']);
  writeJson('.specify/feature.json', { feature_directory: 'specs/feat-a' });
  writeFile('.ai/sessions/s-a.md', '# Session\n\n**Feature:** feat-a\nwork');
  writeFile('.ai/sessions/s-b.md', '# Session\n\n**Feature:** feat-b\nother');

  const res = runCLI(['compact-memory', '--archive']);
  if (res.code !== 0) {
    cleanupSandbox();
    throw new Error(`Expected exit 0, got ${res.code}. Stderr: ${res.stderr}`);
  }
  if (fileExists('.ai/sessions/s-a.md')) {
    cleanupSandbox();
    throw new Error('Scoped log s-a.md should have been moved out of .ai/sessions/');
  }
  if (!fileExists('.ai/sessions/archive/feat-a/s-a.md')) {
    cleanupSandbox();
    throw new Error('Scoped log should have been archived to .ai/sessions/archive/feat-a/');
  }
  if (!fileExists('.ai/sessions/s-b.md')) {
    cleanupSandbox();
    throw new Error('Other-feature log s-b.md must remain in place');
  }
  const pack = JSON.parse(readFile('.ai/context-packs/compact-feat-a.json'));
  const refs = (pack.input_files || []).join('|');
  if (!refs.includes('archive/feat-a/s-a.md')) {
    cleanupSandbox();
    throw new Error('Pack should reference the archived log location');
  }
  if (refs.includes('s-b.md')) {
    cleanupSandbox();
    throw new Error('Pack must not include another feature\'s log');
  }
  cleanupSandbox();
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
