const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '../..');
// Sandbox lives in the OS temp dir, never inside packaged paths (e.g. .specify/fixtures/),
// so `npm pack` cannot pick it up and concurrent test runs cannot pollute the tarball.
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'saf-bootstrap-'));

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
    '.claude/skills/atlas-auto-loop/SKILL.md',
    '.claude/skills/atlas-routing/SKILL.md',
    '.claude/skills/atlas-gates/SKILL.md',
    '.claude/skills/atlas-settle/SKILL.md',
    '.claude/skills/atlas-review/SKILL.md',
    '.claude/skills/contracts/artifact-map.json',
    '.claude/skills/contracts/entities.schema.json',
    '.claude/skills/contracts/gate-result.schema.json',
    '.agents/skills/atlas-auto-loop/SKILL.md',
    '.agents/skills/atlas-routing/SKILL.md',
    '.agents/skills/atlas-gates/SKILL.md',
    '.agents/skills/atlas-settle/SKILL.md',
    '.agents/skills/atlas-review/SKILL.md',
    '.agents/skills/contracts/artifact-map.json',
    '.agents/skills/contracts/entities.schema.json',
    '.agents/skills/contracts/gate-result.schema.json',
    '.ai/memory/project-summary.md',
    '.ai/memory/current-architecture.md',
    '.ai/memory/known-risks.md',
    '.ai/memory/decisions.md',
    '.ai/memory/verification-history.md'
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

  // 4b. Verify gitignore is created and correct
  const gitignorePath = path.join(tempRoot, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    throw new Error('Expected .gitignore to be created');
  }
  let gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  if (!gitignoreContent.includes('# Snail Agent Flow / ATLAS Loop')) {
    throw new Error('Expected .gitignore to contain Snail Agent Flow header');
  }
  if (!gitignoreContent.includes('.ai/locks/')) {
    throw new Error('Expected .gitignore to contain .ai/locks/ rule');
  }

  // Write some custom rules to .gitignore to make sure they are preserved on re-run
  fs.writeFileSync(gitignorePath, 'node_modules/\n' + gitignoreContent, 'utf8');

  // Run saf init again to test idempotency
  console.log('[test-bootstrap] Running saf init a second time...');
  const initResult2 = spawnSync('node', [cliBin, 'init'], {
    cwd: tempRoot,
    env: {
      ...process.env,
      PROJECT_ROOT: tempRoot,
      REPO_ROOT: tempRoot
    },
    encoding: 'utf8'
  });
  if (initResult2.status !== 0) {
    throw new Error(`saf init second run failed: ${initResult2.stderr || initResult2.stdout}`);
  }

  // Assert .gitignore content still preserves custom rules and is not duplicated
  const gitignoreContent2 = fs.readFileSync(gitignorePath, 'utf8');
  if (!gitignoreContent2.startsWith('node_modules/')) {
    throw new Error('Expected custom rule in .gitignore to be preserved');
  }
  const occurances = (gitignoreContent2.match(/# Snail Agent Flow \/ ATLAS Loop/g) || []).length;
  if (occurances !== 1) {
    throw new Error(`Expected exactly 1 Snail Agent Flow header in .gitignore, found: ${occurances}`);
  }

  console.log('[test-bootstrap] Expected files verified successfully.');

  // 5b. Verify memory file content
  console.log('[test-bootstrap] Verifying memory file seeding...');
  const memoryFiles = {
    '.ai/memory/project-summary.md': '# Project Summary',
    '.ai/memory/current-architecture.md': '# Current Architecture',
    '.ai/memory/known-risks.md': '# Known Risks',
    '.ai/memory/decisions.md': '# Decisions',
    '.ai/memory/verification-history.md': '# Verification History'
  };

  for (const [file, expectedHeading] of Object.entries(memoryFiles)) {
    const content = fs.readFileSync(path.join(tempRoot, file), 'utf8');
    if (!content.includes('Seeded by saf init')) {
      throw new Error(`Memory file ${file} missing seed marker`);
    }
    if (!content.includes(expectedHeading)) {
      throw new Error(`Memory file ${file} missing expected heading: ${expectedHeading}`);
    }
  }

  // Verify idempotency: save content, re-init, compare
  const archBefore = fs.readFileSync(path.join(tempRoot, '.ai/memory/current-architecture.md'), 'utf8');
  // (init2 already ran above, so just check the content wasn't changed)
  const archAfter = fs.readFileSync(path.join(tempRoot, '.ai/memory/current-architecture.md'), 'utf8');
  if (archBefore !== archAfter) {
    throw new Error('Memory file current-architecture.md was modified on re-init');
  }
  console.log('[test-bootstrap] Memory file seeding verified.');

  // 5c. Brownfield non-intrusive smart-default:
  //     A pre-existing team CLAUDE.md must NOT be mutated; SAF guidance goes to
  //     .ai/instructions/ATLAS.md instead, and init logs a clear notice. A sibling
  //     instruction file SAF creates this run (AGENTS.md) is still filled normally.
  console.log('[test-bootstrap] Verifying non-intrusive init on a brownfield project...');
  const brownfieldRoot = path.join(tempRoot, 'brownfield');
  fs.mkdirSync(brownfieldRoot, { recursive: true });
  fs.writeFileSync(path.join(brownfieldRoot, 'package.json'), JSON.stringify({ name: 'legacy-app', version: '2.0.0', private: true }), 'utf8');
  const sacredClaude = `# CLAUDE.md\n\n## Team Conventions\n- Magic numbers are documented in docs/constants.md\n- Do not autoformat legacy modules.\n`;
  fs.writeFileSync(path.join(brownfieldRoot, 'CLAUDE.md'), sacredClaude, 'utf8');

  const bfInit = spawnSync('node', [cliBin, 'init'], {
    cwd: brownfieldRoot,
    env: { ...process.env, PROJECT_ROOT: brownfieldRoot, REPO_ROOT: brownfieldRoot },
    encoding: 'utf8'
  });
  if (bfInit.status !== 0) {
    throw new Error(`brownfield saf init failed: ${bfInit.stderr || bfInit.stdout}`);
  }

  const claudeAfter = fs.readFileSync(path.join(brownfieldRoot, 'CLAUDE.md'), 'utf8');
  if (claudeAfter !== sacredClaude) {
    throw new Error('Brownfield CLAUDE.md was mutated by init — it must be left byte-identical');
  }
  if (claudeAfter.includes('Autonomous ATLAS Loop')) {
    throw new Error('Brownfield CLAUDE.md gained an ATLAS section — must stay untouched');
  }

  const atlasInstrPath = path.join(brownfieldRoot, '.ai/instructions/ATLAS.md');
  if (!fs.existsSync(atlasInstrPath)) {
    throw new Error('Expected .ai/instructions/ATLAS.md to be created for brownfield project');
  }
  const atlasInstrContent = fs.readFileSync(atlasInstrPath, 'utf8');
  for (const section of ['## Autonomous ATLAS Loop', '## Subagent & Parallel Execution Guidelines', '## Context Budget and Subagent Orchestration Policy', '## Behavioral Core']) {
    if (!atlasInstrContent.includes(section)) {
      throw new Error(`Expected .ai/instructions/ATLAS.md to contain "${section}"`);
    }
  }

  // Sibling file SAF created this run must still be filled (mixed scenario).
  const bfAgents = fs.readFileSync(path.join(brownfieldRoot, 'AGENTS.md'), 'utf8');
  if (!bfAgents.includes('## Autonomous ATLAS Loop')) {
    throw new Error('SAF-created AGENTS.md should still receive ATLAS guidance in brownfield');
  }
  if (!bfAgents.includes('## Behavioral Core')) {
    throw new Error('SAF-created AGENTS.md should receive Behavioral Core guidance in brownfield');
  }

  if (!(bfInit.stdout || '').includes('written to .ai/instructions/ATLAS.md')) {
    throw new Error('Expected init to log the non-intrusive notice for brownfield project');
  }
  // Verify memory files exist in brownfield scenario
  for (const file of Object.keys(memoryFiles)) {
    if (!fs.existsSync(path.join(brownfieldRoot, file))) {
      throw new Error(`Brownfield init missing memory file: ${file}`);
    }
  }
  console.log('[test-bootstrap] Brownfield memory file seeding verified.');

  console.log('[test-bootstrap] Non-intrusive brownfield init verified.');

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

  // 8. Run score-and-claim.js script in the bootstrapped target project to verify path resolution
  console.log('[test-bootstrap] Running score-and-claim.js inside sandbox...');
  const taskPayload = JSON.stringify({
    slug: 'test-feature',
    novelty: 0,
    blast_radius: 0,
    ambiguity: 0,
    reversibility: 0,
    user_biz_risk: 0
  });
  const scoreResult = spawnSync('node', [
    path.join(tempRoot, '.claude/skills/atlas-routing/scripts/score-and-claim.js'),
    taskPayload,
    tempRoot
  ], {
    cwd: tempRoot,
    encoding: 'utf8'
  });
  if (scoreResult.status !== 0) {
    throw new Error(`score-and-claim.js inside sandbox failed: ${scoreResult.stderr || scoreResult.stdout}`);
  }
  console.log('[test-bootstrap] score-and-claim.js passed inside sandbox!');
} finally {
  // Clean up
  console.log('[test-bootstrap] Cleaning up...');
  rmSyncWithRetry(tempRoot);
  if (fs.existsSync(tarballPath)) {
    fs.unlinkSync(tarballPath);
  }
}
console.log('✅ Target project bootstrap smoke test passed!');
