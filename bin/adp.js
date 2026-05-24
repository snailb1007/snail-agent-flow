#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const args = process.argv.slice(2);
const command = args[0];

const USAGE = `
Usage: adp <command> [arguments]

Commands:
  init                  Safely initialize required directories and template files.
  new-session <name>    Create a new session log file and update active feature.
  status                Display active feature name, current phase, and gate status.
  doctor                Run static project integrity checks and validations.
  validate-spec         Run the deterministic specification validation gate.
  handoff               Validate memory handoff checklist completeness.
`;

if (!command || command === '--help' || command === '-h') {
  console.log(USAGE.trim());
  process.exit(command ? 0 : 1);
}

// Target project directory: env override or caller's working directory
const repoRoot = process.env.PROJECT_ROOT || process.env.REPO_ROOT || process.cwd();
// Package install directory: for resolving bundled validators, templates, scripts
const packageRoot = path.resolve(__dirname, '..');

// Router
switch (command) {
  case 'init':
    handleInit();
    break;
  case 'new-session':
    handleNewSession(args.slice(1));
    break;
  case 'status':
    handleStatus();
    break;
  case 'doctor':
    handleDoctor();
    break;
  case 'validate-spec':
    handleValidateSpec();
    break;
  case 'handoff':
    handleHandoff();
    break;
  default:
    console.error(`Error: Unknown command "${command}"`);
    console.log(USAGE.trim());
    process.exit(1);
}

function handleInit() {
  const dirs = [
    '.ai/sessions',
    '.ai/memory',
    '.ai/reviews',
    '.ai/state',
    '.specify/templates',
    'specs'
  ];

  console.log('[init] Initializing directories...');
  for (const d of dirs) {
    const fullPath = path.join(repoRoot, d);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`[init] Created directory: ${d}`);
    } else {
      console.log(`[init] Directory already exists: ${d}`);
    }
  }

  // Copy constitution template or write default
  const constitutionPath = path.join(repoRoot, '.ai/constitution.md');
  const constitutionTemplatePath = path.join(packageRoot, '.specify/templates/constitution-template.md');
  if (!fs.existsSync(constitutionPath)) {
    if (fs.existsSync(constitutionTemplatePath)) {
      fs.copyFileSync(constitutionTemplatePath, constitutionPath);
      console.log('[init] Created .ai/constitution.md (copied from template)');
    } else {
      const defaultConstitution = `# Repository Constitution

## Engineering Principles
- Preserve existing behavior by default.
- Smallest safe change.
- Test-backed implementation.
- Review before finalization.
- No shipping without verification.
`;
      fs.writeFileSync(constitutionPath, defaultConstitution, 'utf8');
      console.log('[init] Created .ai/constitution.md (default written)');
    }
  } else {
    console.log('[init] .ai/constitution.md already exists, skipping.');
  }

  // Write CLAUDE.md template if missing
  const claudePath = path.join(repoRoot, 'CLAUDE.md');
  if (!fs.existsSync(claudePath)) {
    const defaultClaude = `# CLAUDE.md

## Build & Test Commands
- Build: \`npm run build\` (if applicable)
- Test: \`npm test\`
- Validation: \`npm run validate\`
`;
    fs.writeFileSync(claudePath, defaultClaude, 'utf8');
    console.log('[init] Created CLAUDE.md');
  } else {
    console.log('[init] CLAUDE.md already exists, skipping.');
  }

  // Write GEMINI.md template if missing
  const geminiPath = path.join(repoRoot, 'GEMINI.md');
  if (!fs.existsSync(geminiPath)) {
    const defaultGemini = `# GEMINI.md

## Execution guidelines
- Respect environment constraints.
- Run deterministic validators.
`;
    fs.writeFileSync(geminiPath, defaultGemini, 'utf8');
    console.log('[init] Created GEMINI.md');
  } else {
    console.log('[init] GEMINI.md already exists, skipping.');
  }

  // Write AGENTS.md template if missing
  const agentsPath = path.join(repoRoot, 'AGENTS.md');
  if (!fs.existsSync(agentsPath)) {
    const defaultAgents = `# AGENTS.md

## Agent Protocol Instructions
- Read spec.md for feature requirements.
- Follow plan.md for architecture.
- Complete tasks.md checklist.
`;
    fs.writeFileSync(agentsPath, defaultAgents, 'utf8');
    console.log('[init] Created AGENTS.md');
  } else {
    console.log('[init] AGENTS.md already exists, skipping.');
  }

  console.log('[init] Initialization complete.');
}

function handleNewSession(cmdArgs) {
  if (cmdArgs.length === 0) {
    console.error('Error: Missing session name. Usage: adp new-session <name>');
    process.exit(1);
  }

  const name = cmdArgs[0];
  if (!/^[A-Za-z0-9._-]+$/.test(name)) {
    console.error('Error: Session name may only contain letters, numbers, dots, underscores, and hyphens.');
    process.exit(1);
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const sessionDir = path.join(repoRoot, '.ai/sessions');

  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const sessionPath = path.join(sessionDir, `${dateStr}-${name}.md`);

  // Try to find active feature slug
  let activeFeature = 'None';
  const specifyFeaturePath = path.join(repoRoot, '.specify/feature.json');
  if (fs.existsSync(specifyFeaturePath)) {
    try {
      const raw = fs.readFileSync(specifyFeaturePath, 'utf8');
      const data = JSON.parse(raw);
      if (data.feature_directory) {
        activeFeature = path.basename(data.feature_directory.replace(/\/+$/, ''));
      }
    } catch (e) {
      // ignore
    }
  }

  const sessionTemplate = `# Session: ${name}

**Date:** ${dateStr}
**Feature:** ${activeFeature}

## Activities
- [ ] Initial session log for ${name}.
`;

  fs.writeFileSync(sessionPath, sessionTemplate, 'utf8');
  console.log(`[session] Created new session log: .ai/sessions/${dateStr}-${name}.md`);
  process.exit(0);
}

function handleStatus() {
  const specifyFeaturePath = path.join(repoRoot, '.specify/feature.json');
  const runStatePath = path.join(repoRoot, '.ai/state/run-state.json');

  if (!fs.existsSync(specifyFeaturePath)) {
    console.log('No active feature found. Run adp init or specify active-feature in .specify/feature.json.');
    process.exit(0);
  }

  let featureDirectory = '';
  try {
    const raw = fs.readFileSync(specifyFeaturePath, 'utf8');
    const data = JSON.parse(raw);
    featureDirectory = data.feature_directory;
  } catch (e) {
    console.error(`Error parsing .specify/feature.json: ${e.message}`);
    process.exit(1);
  }

  if (!featureDirectory) {
    console.log('No active feature found.');
    process.exit(0);
  }

  const normDir = featureDirectory.replace(/\/+$/, '');
  const featureSlug = path.basename(normDir);

  console.log(`Active Feature Slug: ${featureSlug}`);
  console.log(`Active Feature Directory: ${featureDirectory}`);

  if (fs.existsSync(runStatePath)) {
    try {
      const raw = fs.readFileSync(runStatePath, 'utf8');
      const state = JSON.parse(raw);
      console.log(`Current Phase: ${state.current_phase || 'N/A'}`);
      console.log(`Last Gate: ${state.last_gate || 'N/A'}`);
      console.log(`Last Gate Status: ${state.last_gate_status || 'N/A'}`);
      console.log(`Retry Count: ${state.retry_count !== undefined ? state.retry_count : '0'}`);
      if (Array.isArray(state.verified_artifacts) && state.verified_artifacts.length > 0) {
        console.log('Verified Artifacts:');
        state.verified_artifacts.forEach(art => {
          console.log(`  - ${path.basename(art)} (${art})`);
        });
      }
    } catch (e) {
      console.error(`Error parsing .ai/state/run-state.json: ${e.message}`);
      process.exit(1);
    }
  } else {
    console.log('No run state progress recorded yet.');
  }
  process.exit(0);
}

function handleDoctor() {
  const dirs = [
    '.ai/sessions',
    '.ai/memory',
    '.ai/reviews',
    '.ai/state',
    '.specify/templates',
    'specs'
  ];

  console.log('[doctor] Running static sanity checks...');
  let failed = false;
  for (const d of dirs) {
    const fullPath = path.join(repoRoot, d);
    if (!fs.existsSync(fullPath)) {
      console.error(`[doctor] ERROR: Directory is missing: ${d}`);
      failed = true;
    }
  }

  const constitutionPath = path.join(repoRoot, '.ai/constitution.md');
  if (!fs.existsSync(constitutionPath)) {
    console.error('[doctor] ERROR: .ai/constitution.md is missing');
    failed = true;
  }

  if (failed) {
    console.error('[doctor] Static checks FAILED.');
    process.exit(1);
  }
  console.log('[doctor] Static sanity checks PASSED.');

  console.log('[doctor] Running spec validation gate...');
  const valResult = runSpecValidatorSync(false);
  if (valResult.status !== 0) {
    console.error('[doctor] Spec validation gate FAILED.');
    process.exit(1);
  }

  console.log('[doctor] Spec validation gate PASSED.');
  console.log('[doctor] Project is healthy.');
  process.exit(0);
}

function handleValidateSpec() {
  const validatorScript = path.join(packageRoot, 'validators/scripts/validate-spec.js');
  const result = spawnSync('node', [validatorScript, ...args.slice(1)], {
    env: {
      ...process.env,
      PROJECT_ROOT: repoRoot,
      REPO_ROOT: repoRoot
    },
    stdio: 'inherit'
  });
  process.exit(result.status === null ? 1 : result.status);
}

function runSpecValidatorSync(silent = false) {
  const validatorScript = path.join(packageRoot, 'validators/scripts/validate-spec.js');
  const result = spawnSync('node', [validatorScript], {
    env: {
      ...process.env,
      PROJECT_ROOT: repoRoot,
      REPO_ROOT: repoRoot
    },
    stdio: silent ? 'pipe' : 'inherit',
    encoding: 'utf8'
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

function handleHandoff() {
  let activeFeature = '';
  const specifyFeaturePath = path.join(repoRoot, '.specify/feature.json');
  if (fs.existsSync(specifyFeaturePath)) {
    try {
      const raw = fs.readFileSync(specifyFeaturePath, 'utf8');
      const data = JSON.parse(raw);
      if (data.feature_directory) {
        activeFeature = path.basename(data.feature_directory.replace(/\/+$/, ''));
      }
    } catch (e) {
      // ignore
    }
  }

  if (!activeFeature) {
    console.error('Error: No active feature found in .specify/feature.json.');
    process.exit(1);
  }

  const handoffPath = path.join(repoRoot, '.ai/state/handoff.md');
  if (!fs.existsSync(handoffPath)) {
    console.error(`ERROR: Memory handoff report (${handoffPath}) is missing.`);
    process.exit(1);
  }

  let handoffContent = '';
  try {
    handoffContent = fs.readFileSync(handoffPath, 'utf8');
  } catch (e) {
    console.error(`Error reading memory handoff report: ${e.message}`);
    process.exit(1);
  }

  // Check active feature slug exists in handoff.md
  if (!handoffContent.includes(activeFeature)) {
    console.error(`ERROR: Handoff file does not list active feature slug: ${activeFeature}`);
    process.exit(1);
  }

  // Check required headings
  const requiredHeaders = [
    '## Promoted to project memory',
    '## Architecture updated',
    '## Verification promoted'
  ];
  let missing = false;
  for (const header of requiredHeaders) {
    if (!handoffContent.includes(header)) {
      console.error(`ERROR: Handoff file missing section: ${header.replace(/^## /, '')}`);
      missing = true;
    }
  }

  if (missing) {
    process.exit(1);
  }

  console.log('[validator] Memory Handoff report matches protocol validation criteria.');
  process.exit(0);
}
