const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '../..');
const tempRoot = path.resolve(repoRoot, '.specify/fixtures/test-bootstrap-sandbox');

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

// 1. Pack the package
console.log('[test-bootstrap] Running npm pack...');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const packResult = spawnSync(npmCmd, ['pack', '--json'], { cwd: repoRoot, encoding: 'utf8', shell: process.platform === 'win32' });
if (packResult.status !== 0) {
  console.error(packResult.stderr || packResult.stdout);
  process.exit(1);
}
const packMeta = JSON.parse(packResult.stdout);
const tarballName = packMeta[0].filename;
const tarballPath = path.join(repoRoot, tarballName);
console.log(`[test-bootstrap] Packed successfully: ${tarballPath}`);

try {
  // 2. Setup sandbox
  rmSyncWithRetry(tempRoot);
  fs.mkdirSync(tempRoot, { recursive: true });

  // 3. Initialize target project package.json
  fs.writeFileSync(path.join(tempRoot, 'package.json'), JSON.stringify({
    name: 'test-target-project',
    version: '1.0.0',
    private: true
  }), 'utf8');

  // Install packed package
  console.log('[test-bootstrap] Installing tarball in sandbox...');
  const installResult = spawnSync(npmCmd, ['install', tarballPath], {
    cwd: tempRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32'
  });
  if (installResult.status !== 0) {
    throw new Error(`Failed to install packed package: ${installResult.stderr || installResult.stdout}`);
  }

  // 4. Run saf init
  console.log('[test-bootstrap] Running saf init...');
  const cliBin = path.join(tempRoot, 'node_modules/snail-agent-flow/bin/adp.js');
  // We set env REPO_ROOT and PROJECT_ROOT to tempRoot to ensure adp respects the sandbox directory.
  const initResult = spawnSync('node', [cliBin, 'init'], {
    cwd: tempRoot,
    env: {
      ...process.env,
      PROJECT_ROOT: tempRoot,
      REPO_ROOT: tempRoot
    },
    encoding: 'utf8'
  });
  if (initResult.status !== 0) {
    throw new Error(`saf init failed: ${initResult.stderr || initResult.stdout}`);
  }

  // 5. Assert expected files exist
  const expectedFiles = [
    '.ai/flows/atlas-flow.yaml',
    '.ai/state/flow-state.json',
    '.ai/state/context-policy.json',
    '.ai/constitution.md',
    'CLAUDE.md',
    'GEMINI.md',
    'AGENTS.md',
    '.claude/skills/atlas-routing/SKILL.md',
    '.claude/skills/atlas-gates/SKILL.md',
    '.claude/skills/atlas-settle/SKILL.md',
    '.claude/skills/atlas-review/SKILL.md',
    '.claude/skills/contracts/artifact-map.json',
    '.claude/skills/contracts/entities.schema.json',
    '.claude/skills/contracts/gate-result.schema.json'
  ];

  for (const file of expectedFiles) {
    const fullPath = path.join(tempRoot, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Expected initialized file to exist: ${file}`);
    }
  }

  // Assert legacy file doesn't exist
  if (fs.existsSync(path.join(tempRoot, '.ai/state/flow-ledger.json'))) {
    throw new Error('Expected init to not create deprecated flow-ledger.json');
  }

  console.log('[test-bootstrap] Expected files verified successfully.');

  // 6. Setup dummy spec so saf doctor can pass spec validation
  const specDir = path.join(tempRoot, 'specs/test-feature');
  fs.mkdirSync(specDir, { recursive: true });
  fs.mkdirSync(path.join(specDir, 'checklists'), { recursive: true });
  
  fs.writeFileSync(path.join(specDir, 'spec.md'), `# Test Feature
## Goal
Test.
## Non-Goals
None.
## Acceptance Criteria
- AC1
## Test Strategy
Manual.
## Behavior-Preservation Rules
None.
`, 'utf8');

  fs.writeFileSync(path.join(specDir, 'plan.md'), `# Test Feature Plan
## Proposed Changes
- Change.
## Verification Plan
- Verify.
`, 'utf8');

  fs.writeFileSync(path.join(specDir, 'tasks.md'), `# Test Feature Tasks
- [ ] Task
`, 'utf8');

  fs.writeFileSync(path.join(specDir, 'checklists/requirements.md'), `# Quality Checklist
- [x] Done
`, 'utf8');

  fs.writeFileSync(path.join(tempRoot, '.specify/feature.json'), JSON.stringify({
    feature_directory: 'specs/test-feature'
  }), 'utf8');

  // 7. Run saf doctor
  console.log('[test-bootstrap] Running saf doctor...');
  const doctorResult = spawnSync('node', [cliBin, 'doctor'], {
    cwd: tempRoot,
    env: {
      ...process.env,
      PROJECT_ROOT: tempRoot,
      REPO_ROOT: tempRoot
    },
    encoding: 'utf8'
  });
  if (doctorResult.status !== 0) {
    throw new Error(`saf doctor failed: ${doctorResult.stderr || doctorResult.stdout}`);
  }

  console.log('[test-bootstrap] saf doctor passed successfully!');
} finally {
  // Clean up
  console.log('[test-bootstrap] Cleaning up...');
  rmSyncWithRetry(tempRoot);
  if (fs.existsSync(tarballPath)) {
    fs.unlinkSync(tarballPath);
  }
}
console.log('✅ Target project bootstrap smoke test passed!');
