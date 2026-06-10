#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { runStrictChecks, formatTerminal, formatMarkdownGuide } = require('../lib/init-checks');
const { extractExecutionContextBlocks } = require('../lib/skill-md-parser');
const { OwnershipStore } = require('../lib/ownership-store');

const args = process.argv.slice(2);
const command = args[0];

const USAGE = `
Usage: adp <command> [arguments]

Commands:
  init                  Safely initialize required directories and template files.
  feature <description> Create a validated Spec-Kit feature scaffold.
  run <description>     Initialize, create a feature scaffold, and validate it.
  new-session <name>    Create a new session log file and update active feature.
  status                Display active feature name, current phase, and gate status.
  doctor                Run static project integrity checks and validations.
  validate-spec         Run the deterministic specification validation gate.
  handoff               Validate memory handoff checklist completeness.
  score <task.json>     Score task risk and output profile selection.
  claim <task-slug>     Claim work unit ownership.
  lease <file>          Acquire advisory file lease lock.
  checkpoint            Write profile-switch checkpoint.
  signal <type> <val>   Log observability signal.
  onboard-memory          Promote ONBOARDING.md content into .ai/memory/ files.
  budget                Report estimated context byte pressure and policy outcome.
                        Options: --stage <id>, --json, --enforce (exit 1 unless inline).
  pack                  Generate a context pack manifest under .ai/context-packs/.
                        Options: --objective <text>, --stage <id>, --out <path>.
`;

// Target project directory: env override or caller's working directory
const repoRoot = process.env.PROJECT_ROOT || process.env.REPO_ROOT || process.cwd();
// Package install directory: for resolving bundled validators, templates, scripts
const packageRoot = path.resolve(__dirname, '..');

function runCli() {
  if (!command || command === '--help' || command === '-h') {
    console.log(USAGE.trim());
    process.exit(command ? 0 : 1);
  }

  switch (command) {
    case 'init':
      handleInit();
      break;
    case 'feature':
      handleFeature(args.slice(1), { validate: false });
      break;
    case 'run':
      handleRun(args.slice(1));
      break;
    case 'new-session':
      handleNewSession(args.slice(1));
      break;
    case 'status':
      handleStatus();
      break;
    case 'doctor':
      handleDoctor(args.slice(1));
      break;
    case 'validate-spec':
      handleValidateSpec();
      break;
    case 'handoff':
      handleHandoff();
      break;
    case 'score':
      handleScore(args.slice(1));
      break;
    case 'claim':
      handleClaim(args.slice(1));
      break;
    case 'lease':
      handleLease(args.slice(1));
      break;
    case 'checkpoint':
      handleCheckpoint(args.slice(1));
      break;
    case 'signal':
      handleSignal(args.slice(1));
      break;
    case 'onboard-memory':
      handleOnboardMemory();
      break;
    case 'budget':
      handleBudget(args.slice(1));
      break;
    case 'pack':
      handlePack(args.slice(1));
      break;
    default:
      console.error(`Error: Unknown command "${command}"`);
      console.log(USAGE.trim());
      process.exit(1);
  }
}

if (require.main === module) {
  runCli();
}

function handleInit() {
  // Non-intrusive smart-default: capture which team instruction files already exist
  // BEFORE we write anything. Pre-existing files are team-owned and must never be mutated;
  // SAF guidance for them is written to .ai/instructions/ATLAS.md instead.
  const instructionFiles = ['CLAUDE.md', 'GEMINI.md', 'AGENTS.md'];
  const preExisting = {};
  for (const f of instructionFiles) {
    preExisting[f] = fs.existsSync(path.join(repoRoot, f));
  }

  const dirs = [
    '.ai/sessions',
    '.ai/memory',
    '.ai/reviews',
    '.ai/state',
    '.ai/flows',
    '.ai/instructions',
    '.specify/templates',
    'specs',
    '.ai/context-packs',
    '.ai/claims',
    '.ai/locks',
    '.ai/signals'
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

  // Seed .ai/memory/ files from templates
  seedMemoryFiles(repoRoot);

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

  // Copy default ATLAS flow definition
  const flowDestPath = path.join(repoRoot, '.ai/flows/atlas-flow.yaml');
  const flowTemplatePath = path.join(packageRoot, '.specify/templates/atlas-flow.yaml');
  if (!fs.existsSync(flowDestPath)) {
    if (fs.existsSync(flowTemplatePath)) {
      fs.copyFileSync(flowTemplatePath, flowDestPath);
      console.log('[init] Created .ai/flows/atlas-flow.yaml (copied from template)');
    } else {
      console.warn('[init] WARNING: Flow template not found at .specify/templates/atlas-flow.yaml, skipping flow definition copy.');
    }
  } else {
    console.log('[init] .ai/flows/atlas-flow.yaml already exists, skipping.');
  }

  // Generate flow state
  const statePath = path.join(repoRoot, '.ai/state/flow-state.json');
  if (!fs.existsSync(statePath)) {
    try {
      let featureSlug = 'unknown';
      const specifyFeaturePath = path.join(repoRoot, '.specify/feature.json');
      if (fs.existsSync(specifyFeaturePath)) {
        try {
          const raw = JSON.parse(fs.readFileSync(specifyFeaturePath, 'utf8'));
          if (raw.feature_directory) {
            featureSlug = path.basename(raw.feature_directory.replace(/\/+$/, ''));
          }
        } catch (e) {}
      }

      const defaultState = {
        schema_version: '2.0',
        run_id: 'run_' + Math.random().toString(36).substr(2, 9),
        feature_slug: featureSlug,
        risk_profile: 'STANDARD',
        work_mode: 'FEATURE',
        stage: 'align',
        status: 'running',
        attempt: 1,
        completed_steps: [],
        pending_step: 'align.pending',
        locks: [],
        signals: [],
        consecutive_failures: 0,
        retry_count: 0,
        verified_artifacts: []
      };

      const flowState = require('../lib/flow-state');
      flowState.save(repoRoot, defaultState);
      console.log('[init] Created .ai/state/flow-state.json');
    } catch (e) {
      console.warn(`[init] WARNING: Could not generate flow state: ${e.message}`);
    }
  } else {
    console.log('[init] .ai/state/flow-state.json already exists, skipping.');
  }

  initializePackagedAtlasAssets(repoRoot);

  // Update .gitignore (idempotent, additive). Intentionally NOT subject to non-intrusive
  // gating: it protects the team from committing SAF runtime state (.ai/state, .ai/locks,
  // sessions, context packs) and is preventive plumbing, not workflow instruction.
  updateGitignore(repoRoot);

  // Localize GSD skills (additive, no-overwrite).
  localizeGlobalSkills(repoRoot);

  // Non-intrusive smart-default: skip instruction files the team already had; their
  // guidance goes to .ai/instructions/ATLAS.md. Files SAF created this run get filled normally.
  const guidelineOpts = { skipExisting: preExisting };
  upsertAtlasGuidelines(repoRoot, guidelineOpts);
  appendSubagentGuidelines(repoRoot, guidelineOpts);
  appendContextPolicyGuidelines(repoRoot, guidelineOpts);
  appendBehavioralCoreGuidelines(repoRoot, guidelineOpts);

  const skippedInstructionFiles = instructionFiles.filter((f) => preExisting[f]);
  if (skippedInstructionFiles.length > 0) {
    writeSeparateAtlasInstructions(repoRoot);
    console.log(`[init] Team instruction files already exist (${skippedInstructionFiles.join(', ')}).`);
    console.log('[init] SAF guidance written to .ai/instructions/ATLAS.md — your files were left untouched.');
  }

  // Write default context-policy.json config if absent
  const policyPath = path.join(repoRoot, '.ai/state/context-policy.json');
  if (!fs.existsSync(policyPath)) {
    const defaultPolicy = {
      schema_version: "1.0.0",
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
    fs.writeFileSync(policyPath, JSON.stringify(defaultPolicy, null, 2) + '\n', 'utf8');
    console.log('[init] Created .ai/state/context-policy.json');
  } else {
    console.log('[init] .ai/state/context-policy.json already exists, skipping.');
  }

  runAndReport(repoRoot, 'init');

  console.log('[init] Initialization complete.');
}

function seedMemoryFiles(root) {
  const memoryFiles = [
    { target: '.ai/memory/project-summary.md', template: 'memory-project-summary-template.md' },
    { target: '.ai/memory/current-architecture.md', template: 'memory-current-architecture-template.md' },
    { target: '.ai/memory/known-risks.md', template: 'memory-known-risks-template.md' },
    { target: '.ai/memory/decisions.md', template: 'memory-decisions-template.md' },
    { target: '.ai/memory/verification-history.md', template: 'memory-verification-history-template.md' }
  ];

  for (const { target, template } of memoryFiles) {
    const targetPath = path.join(root, target);
    const templatePath = path.join(packageRoot, '.specify/templates', template);

    if (!fs.existsSync(targetPath)) {
      if (fs.existsSync(templatePath)) {
        fs.copyFileSync(templatePath, targetPath);
        console.log(`[init] Created ${target} (copied from template)`);
      } else {
        // Fallback: create minimal placeholder
        const name = path.basename(target, '.md').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        fs.writeFileSync(targetPath, `<!-- Seeded by saf init. Update during Memory Handoff. -->\n# ${name}\n\n_No content yet. Update during Memory Handoff (Step 5.5)._\n`, 'utf8');
        console.log(`[init] Created ${target} (default written)`);
      }
    } else {
      console.log(`[init] ${target} already exists, skipping.`);
    }
  }
}

function handleFeature(cmdArgs, options = {}) {
  const description = normalizeDescription(cmdArgs);
  const result = createFeatureScaffold(description);

  console.log(`[feature] Created feature scaffold: ${result.featureDirectory}`);
  console.log('[feature] Active feature pointer updated: .specify/feature.json');

  if (options.validate) {
    console.log('[feature] Running spec validation gate...');
    const valResult = runSpecValidatorSync(false);
    if (valResult.status !== 0) {
      console.error('[feature] Spec validation gate FAILED.');
      process.exit(1);
    }
    console.log('[feature] Spec validation gate PASSED.');
  }

  printFeatureNextSteps(result.featureDirectory);
  process.exit(0);
}

function handleRun(cmdArgs) {
  const description = normalizeDescription(cmdArgs);
  handleInit();
  const result = createFeatureScaffold(description);

  console.log(`[run] Created feature scaffold: ${result.featureDirectory}`);
  console.log('[run] Running spec validation gate...');
  const valResult = runSpecValidatorSync(false);
  if (valResult.status !== 0) {
    console.error('[run] Spec validation gate FAILED.');
    process.exit(1);
  }

  console.log('[run] Spec validation gate PASSED.');
  printFeatureNextSteps(result.featureDirectory);
  process.exit(0);
}

function normalizeDescription(cmdArgs) {
  const description = cmdArgs.join(' ').trim();
  if (!description) {
    console.error('Error: Missing feature description.');
    console.error(`Usage: adp ${command} "<feature description>"`);
    process.exit(1);
  }
  return description;
}

function createFeatureScaffold(description) {
  const shortName = createShortName(description);
  const featureDirectory = resolveNextFeatureDirectory(shortName);
  const fullFeatureDirectory = path.join(repoRoot, featureDirectory);

  if (fs.existsSync(fullFeatureDirectory)) {
    console.error(`Error: Feature directory already exists: ${featureDirectory}`);
    process.exit(1);
  }

  fs.mkdirSync(path.join(fullFeatureDirectory, 'checklists'), { recursive: true });

  const safeDescription = sanitizeArtifactText(description);
  const createdDate = new Date().toISOString().split('T')[0];
  const featureName = titleCase(shortName);

  fs.writeFileSync(
    path.join(fullFeatureDirectory, 'spec.md'),
    renderSpec({ featureName, safeDescription }),
    'utf8'
  );
  fs.writeFileSync(
    path.join(fullFeatureDirectory, 'plan.md'),
    renderPlan({ featureName, featureDirectory, safeDescription, createdDate }),
    'utf8'
  );
  fs.writeFileSync(
    path.join(fullFeatureDirectory, 'tasks.md'),
    renderTasks({ featureName }),
    'utf8'
  );
  fs.writeFileSync(
    path.join(fullFeatureDirectory, 'checklists/requirements.md'),
    renderRequirementsChecklist({ featureName, createdDate }),
    'utf8'
  );

  const featurePointerPath = path.join(repoRoot, '.specify/feature.json');
  fs.mkdirSync(path.dirname(featurePointerPath), { recursive: true });
  fs.writeFileSync(
    featurePointerPath,
    JSON.stringify({ feature_directory: featureDirectory }, null, 2) + '\n',
    'utf8'
  );

  return { featureDirectory, shortName };
}

function createShortName(description) {
  const stopWords = new Set([
    'a', 'an', 'and', 'app', 'build', 'create', 'for', 'implement', 'make',
    'of', 'please', 'the', 'to', 'with'
  ]);
  const words = description
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter(word => !stopWords.has(word))
    .slice(0, 4);

  if (words.length === 0) {
    return 'new-feature';
  }
  return words.join('-');
}

function resolveNextFeatureDirectory(shortName) {
  const specsDir = path.join(repoRoot, 'specs');
  fs.mkdirSync(specsDir, { recursive: true });

  const nextNumber = fs.readdirSync(specsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name.match(/^(\d{3})-/))
    .filter(Boolean)
    .map(match => Number(match[1]))
    .reduce((max, current) => Math.max(max, current), 0) + 1;

  return `specs/${String(nextNumber).padStart(3, '0')}-${shortName}`;
}

function sanitizeArtifactText(value) {
  return value
    .replace(/\bTODO\b/gi, 'pending item')
    .replace(/\bTBD\b/gi, 'to be decided')
    .replace(/\bFIXME\b/gi, 'fix request')
    .replace(/\bXXX\b/gi, 'placeholder marker')
    .replace(/NEEDS\s+CLARIFICATION/gi, 'requires a product decision');
}

function titleCase(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function printFeatureNextSteps(featureDirectory) {
  console.log('[next] Review generated artifacts:');
  console.log(`[next] - ${featureDirectory}/spec.md`);
  console.log(`[next] - ${featureDirectory}/plan.md`);
  console.log(`[next] - ${featureDirectory}/tasks.md`);
  console.log('[next] Then refine with agent skills or start implementation after validation.');
}

function renderSpec({ featureName, safeDescription }) {
  return `# ${featureName}

## Goal

Create a feature packet for this request: ${safeDescription}

The generated scaffold gives the team a validated starting point for agent-assisted planning and implementation.

## Non-Goals

- Declare implementation complete.
- Replace product, engineering, QA, or release review.
- Add behavior outside the supplied feature request.

## Acceptance Criteria

1. The feature request is captured in the canonical feature specification.
2. The implementation plan identifies the intended change area at a high level.
3. The task list gives the implementing agent a concrete starting checklist.
4. The generated feature packet passes deterministic validation before code execution begins.

## Test Strategy

- Validate the generated feature packet with the deterministic spec validator.
- Add implementation-specific tests during planning and execution.
- Verify acceptance criteria before release handoff.

## Behavior-Preservation Rules

- Preserve existing behavior unless the feature request explicitly changes it.
- Keep changes scoped to the accepted feature packet.
- Run relevant verification before marking tasks complete.

## User Scenarios

### Primary Scenario

A project maintainer asks for the feature, reviews the generated packet, refines it as needed, and then uses the accepted artifacts to guide implementation.

## Functional Requirements

- FR-001: The project must capture the requested feature in spec.md.
- FR-002: The project must keep planning and task artifacts in the same feature directory.
- FR-003: The project must validate the feature packet before implementation.

## Assumptions

- The generated packet is a starting point and may be refined before coding.
- Detailed technical choices are finalized during planning.
`;
}

function renderPlan({ featureName, featureDirectory, safeDescription, createdDate }) {
  return `# Implementation Plan: ${featureName}

**Date**: ${createdDate} | **Spec**: [spec.md](./spec.md)

## Proposed Changes

- Review the feature request: ${safeDescription}
- Refine the generated specification with product and engineering details.
- Identify impacted files and tests during implementation planning.
- Execute the task list only after the deterministic validation gate passes.

## Verification Plan

- Run \`adp validate-spec\` before implementation.
- Add focused tests for changed behavior.
- Run the relevant project verification commands before handoff.

## Artifact Layout

- \`${featureDirectory}/spec.md\`
- \`${featureDirectory}/plan.md\`
- \`${featureDirectory}/tasks.md\`
- \`${featureDirectory}/checklists/requirements.md\`
`;
}

function renderTasks({ featureName }) {
  return `# Tasks: ${featureName}

**Prerequisites**: plan.md and spec.md

## Specification Review

- [ ] T001 Review generated spec for scope and acceptance criteria.
- [ ] T002 Refine plan with impacted files, risks, and verification commands.

## Implementation

- [ ] T003 Implement the accepted feature changes.
- [ ] T004 Add or update tests for the changed behavior.

## Verification And Handoff

- [ ] T005 Run deterministic spec validation.
- [ ] T006 Run project verification commands.
- [ ] T007 Update handoff and memory notes if the feature changes durable project knowledge.
`;
}

function renderRequirementsChecklist({ featureName, createdDate }) {
  return `# Specification Quality Checklist: ${featureName}

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: ${createdDate}
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] Mandatory sections are present
- [x] User value is captured
- [x] Implementation is not marked complete

## Requirement Completeness

- [x] Acceptance criteria are present
- [x] Test strategy is present
- [x] Behavior preservation rules are present

## Feature Readiness

- [x] Feature packet can pass deterministic validation
- [x] Next implementation step is explicit

## Notes

- Generated by the CLI flow as a baseline checklist.
`;
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
  const statePath = path.join(repoRoot, '.ai/state/flow-state.json');

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

  if (fs.existsSync(statePath)) {
    try {
      const raw = fs.readFileSync(statePath, 'utf8');
      const state = JSON.parse(raw);
      console.log(`Current Stage: ${state.stage || 'N/A'}`);
      console.log(`Status: ${state.status || 'N/A'}`);
      console.log(`Risk Profile: ${state.risk_profile || 'N/A'}`);
      console.log(`Work Mode: ${state.work_mode || 'N/A'}`);
      console.log(`Attempt: ${state.attempt || '1'}`);
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
      console.error(`Error parsing .ai/state/flow-state.json: ${e.message}`);
      process.exit(1);
    }
  } else {
    console.log('No flow state progress recorded yet.');
  }
  process.exit(0);
}

function handleDoctor(cmdArgs = []) {
  const checkLocks = cmdArgs.includes('--check-locks');

  runAndReport(repoRoot, 'doctor');

  const claimsStore = new OwnershipStore(path.join(repoRoot, '.ai/claims'));
  const locksStore = new OwnershipStore(path.join(repoRoot, '.ai/locks'));
  
  const claims = claimsStore.list();
  const locks = locksStore.list();

  console.log(`[doctor] Active claims: ${claims.length}`);
  console.log(`[doctor] Active locks: ${locks.length}`);

  // Scan for stale claims
  const claimsDir = claimsStore.dirPath;
  if (fs.existsSync(claimsDir)) {
    try {
      const files = fs.readdirSync(claimsDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const key = file.slice(0, -5);
        const filePath = path.join(claimsDir, file);
        const content = fs.readFileSync(filePath, 'utf8').trim();
        if (content) {
          const meta = JSON.parse(content);
          let isDead = false;
          try {
            process.kill(meta.pid, 0);
          } catch (err) {
            if (err.code === 'ESRCH') isDead = true;
          }
          const elapsed = (Date.now() - new Date(meta.acquired_at).getTime()) / 1000;
          const cap = meta.stale_lock_cap_seconds || 3600;
          if (isDead || elapsed > cap) {
            console.log(`[doctor] Warning: Stale claim detected on task '${key}' (pid: ${meta.pid} dead=${isDead}, age: ${Math.round(elapsed)}s, cap: ${cap}s)`);
          }
        }
      }
    } catch (e) {}
  }

  // Scan for stale locks
  const locksDir = locksStore.dirPath;
  if (fs.existsSync(locksDir)) {
    try {
      const files = fs.readdirSync(locksDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const key = file.slice(0, -5);
        const filePath = path.join(locksDir, file);
        const content = fs.readFileSync(filePath, 'utf8').trim();
        if (content) {
          const meta = JSON.parse(content);
          let isDead = false;
          try {
            process.kill(meta.pid, 0);
          } catch (err) {
            if (err.code === 'ESRCH') isDead = true;
          }
          const elapsed = (Date.now() - new Date(meta.acquired_at).getTime()) / 1000;
          const cap = meta.stale_lock_cap_seconds || 3600;
          if (isDead || elapsed > cap) {
            console.log(`[doctor] Warning: Stale lease lock detected on file '${key}' (pid: ${meta.pid} dead=${isDead}, age: ${Math.round(elapsed)}s, cap: ${cap}s)`);
          }
        }
      }
    } catch (e) {}
  }

  if (checkLocks) {
    if (claims.length > 0) {
      console.log('\nActive Claims:');
      for (const c of claims) {
        const taskName = c.task || c.key;
        console.log(`  - Task: ${taskName} (owner: ${c.owner}, pid: ${c.pid}, acquired: ${c.acquired_at})`);
      }
    }
    if (locks.length > 0) {
      console.log('\nActive Leases/Locks:');
      for (const l of locks) {
        let targetFile = l.key;
        try {
          const lockPath = path.join(locksStore.dirPath, l.key + '.json');
          const data = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
          if (data.target_file) {
            targetFile = path.relative(repoRoot, data.target_file);
          }
        } catch (e) {}
        console.log(`  - File: ${targetFile} (owner: ${l.owner}, pid: ${l.pid}, acquired: ${l.acquired_at})`);
      }
    }
  }

  // Check observability signals
  const signalsFile = path.join(repoRoot, '.ai/signals/current-period.md');
  if (fs.existsSync(signalsFile)) {
    try {
      const content = fs.readFileSync(signalsFile, 'utf8');
      const entries = (content.match(/###\s+\[/g) || []).length;
      console.log(`[doctor] Observability signals: ${entries} logged in current-period.md`);
    } catch (e) {
      console.log(`[doctor] Warning: Failed to read observability signals file: ${e.message}`);
    }
  } else {
    console.log(`[doctor] Observability signals: none (current-period.md missing)`);
  }

  // Check profile-switch checkpoints
  const stateDir = path.join(repoRoot, '.ai/state');
  if (fs.existsSync(stateDir)) {
    try {
      const files = fs.readdirSync(stateDir).filter(f => /^profile-switch-.*\.md$/.test(f));
      console.log(`[doctor] Profile-switch checkpoints: ${files.length} found`);
    } catch (e) {}
  }

  // Check context handoff
  const handoffPath = path.join(repoRoot, '.ai/state/context-handoff.json');
  if (fs.existsSync(handoffPath)) {
    try {
      const raw = fs.readFileSync(handoffPath, 'utf8');
      const handoff = JSON.parse(raw);
      console.log(`[doctor] Context handoff: present (resume stage: ${handoff.resume_stage}, next skill: ${handoff.next_skill})`);
    } catch (e) {
      console.log(`[doctor] Warning: Context handoff file present but malformed: ${e.message}`);
    }
  } else {
    console.log(`[doctor] Context handoff: none`);
  }

  console.log('[doctor] Running artifact drift validator...');
  try {
    const { validateDrift } = require('../lib/validate-drift');
    const driftResults = validateDrift(repoRoot);
    for (const res of driftResults) {
      console.log(`[doctor] Drift Check [${res.check}]: ${res.status} - ${res.message}`);
    }
  } catch (e) {
    console.error(`[doctor] Error running drift validator: ${e.message}`);
  }

  // Check if an active feature exists before running spec validation
  const specifyFeatureCheck = path.join(repoRoot, '.specify/feature.json');
  let hasActiveFeature = false;
  if (fs.existsSync(specifyFeatureCheck)) {
    try {
      const raw = JSON.parse(fs.readFileSync(specifyFeatureCheck, 'utf8'));
      if (raw.feature_directory) {
        const normDir = raw.feature_directory.replace(/\/+$/, '');
        hasActiveFeature = fs.existsSync(path.join(repoRoot, normDir));
      }
    } catch (e) {
      // malformed pointer — let validator report it
      hasActiveFeature = true;
    }
  }

  if (!hasActiveFeature) {
    console.log('[doctor] Spec validation gate SKIPPED (no active feature). Run `saf feature "..."` to create one.');
    console.log('[doctor] Project is healthy.');
    process.exit(0);
  }

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

function copyDirectoryNoOverwrite(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    return { copied: 0, skipped: 0, missing: true };
  }

  let copied = 0;
  let skipped = 0;
  fs.mkdirSync(destDir, { recursive: true });

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      const child = copyDirectoryNoOverwrite(srcPath, destPath);
      copied += child.copied;
      skipped += child.skipped;
      continue;
    }

    if (fs.existsSync(destPath)) {
      skipped++;
      continue;
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    copied++;
  }

  return { copied, skipped, missing: false };
}

function initializePackagedAtlasAssets(repoRoot) {
  const assetDirs = [
    '.claude/skills/atlas-auto-loop',
    '.claude/skills/atlas-routing',
    '.claude/skills/atlas-gates',
    '.claude/skills/atlas-settle',
    '.claude/skills/atlas-review',
    '.claude/skills/saf-upgrade',
    '.claude/skills/contracts'
  ];

  let totalCopied = 0;
  let totalSkipped = 0;
  let anyMissing = false;

  for (const relDir of assetDirs) {
    const srcDir = path.join(packageRoot, relDir);

    // Copy to .claude/skills/...
    const destDir = path.join(repoRoot, relDir);
    const result = copyDirectoryNoOverwrite(srcDir, destDir);

    if (result.missing) {
      console.warn(`[init] WARNING: Packaged ATLAS asset missing: ${relDir}`);
      anyMissing = true;
      continue;
    } else if (result.copied > 0) {
      console.log(`[init] Created ${relDir} (${result.copied} files copied, ${result.skipped} existing skipped)`);
    } else {
      console.log(`[init] ${relDir} already exists, skipping.`);
    }
    totalCopied += result.copied;
    totalSkipped += result.skipped;

    // Also copy to .agents/skills/... to support Gemini/Antigravity and other agents that look there
    const agentsRelDir = relDir.replace('.claude/skills', '.agents/skills');
    const agentsDestDir = path.join(repoRoot, agentsRelDir);
    const agentsResult = copyDirectoryNoOverwrite(srcDir, agentsDestDir);
    if (agentsResult.copied > 0) {
      console.log(`[init] Created ${agentsRelDir} (${agentsResult.copied} files copied, ${agentsResult.skipped} existing skipped)`);
    }
    totalCopied += agentsResult.copied;
    totalSkipped += agentsResult.skipped;
  }

  recordSkillsVersionStamp(repoRoot, { copied: totalCopied, skipped: totalSkipped, anyMissing });
}

// Records which SAF version localized the packaged skills, so `saf doctor` can
// flag stale copies (init is no-overwrite, so skills never refresh in place).
// The stamp is written ONLY after a full fresh localization: any skipped file
// means pre-existing skills of unknown vintage are still on disk, and the
// stamp must keep reflecting them (or stay absent) for the doctor warning to fire.
function recordSkillsVersionStamp(repoRoot, totals) {
  if (totals.anyMissing || totals.skipped > 0) {
    return;
  }

  const stampPath = path.join(repoRoot, '.ai/state/skills-version.json');
  try {
    const pkg = require(path.join(packageRoot, 'package.json'));
    const stamp = {
      schema_version: '1.0',
      saf_version: pkg.version,
      localized_at: new Date().toISOString()
    };
    fs.mkdirSync(path.dirname(stampPath), { recursive: true });
    fs.writeFileSync(stampPath, JSON.stringify(stamp, null, 2) + '\n', 'utf8');
    console.log(`[init] Recorded localized skills version ${pkg.version} (.ai/state/skills-version.json)`);
  } catch (e) {
    console.warn(`[init] WARNING: Could not record skills version stamp: ${e.message}`);
  }
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

function runAndReport(repoRoot, source) {
  if (process.env.ADP_NO_STRICT === '1') {
    process.stderr.write(`[${source}] strict checks skipped (ADP_NO_STRICT=1)\n`);
    return;
  }

  const report = runStrictChecks(repoRoot);
  process.stderr.write(formatTerminal(report, source));

  const guidePath = path.join(repoRoot, '.ai/state/repair-guide.md');
  if (!report.ok) {
    fs.mkdirSync(path.dirname(guidePath), { recursive: true });
    fs.writeFileSync(guidePath, formatMarkdownGuide(report, { source }), 'utf8');
    console.error(`[${source}] Repair guide written to .ai/state/repair-guide.md`);
    process.exit(1);
  }

  // success: clean up stale repair guide
  if (fs.existsSync(guidePath)) {
    try {
      fs.unlinkSync(guidePath);
    } catch (e) {
      // ignore unlink errors
    }
  }
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

function resolveHomePath(filePath) {
  const os = require('os');
  const homeDir = process.env.HOME || os.homedir();
  if (filePath.startsWith('~')) {
    return path.join(homeDir, filePath.slice(1));
  }
  if (filePath.startsWith('$HOME')) {
    return path.join(homeDir, filePath.slice(5));
  }
  return filePath;
}

function localizeGlobalSkills(repoRoot) {
  const os = require('os');
  const homeDir = process.env.HOME || os.homedir();
  const globalSkillsDir = path.join(homeDir, '.gemini/config/skills');

  if (!fs.existsSync(globalSkillsDir)) {
    console.log('[init] Global skills directory does not exist, skipping GSD skill localization.');
    return;
  }

  console.log('[init] Localizing global GSD skills...');
  try {
    const entries = fs.readdirSync(globalSkillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('gsd-')) {
        const skillSlug = entry.name;
        const globalSkillPath = path.join(globalSkillsDir, skillSlug);
        const globalSkillMdPath = path.join(globalSkillPath, 'SKILL.md');

        if (!fs.existsSync(globalSkillMdPath)) {
          continue;
        }

        const localAgentsSkillDir = path.join(repoRoot, '.agents/skills', skillSlug);
        const localClaudeSkillDir = path.join(repoRoot, '.claude/skills', skillSlug);

        const agentsExists = fs.existsSync(localAgentsSkillDir);
        const claudeExists = fs.existsSync(localClaudeSkillDir);

        if (agentsExists && claudeExists) {
          console.log(`[init] Local skill folders for ${skillSlug} already exist, skipping.`);
          continue;
        }

        let skillContent = fs.readFileSync(globalSkillMdPath, 'utf8');

        // Extract referenced workflow/reference files in all <execution_context> blocks.
        const blocks = extractExecutionContextBlocks(skillContent);
        const referencedFiles = [];
        for (const block of blocks) {
          const lines = block.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('@')) {
              const rawPath = trimmed.slice(1).trim();
              referencedFiles.push(rawPath);
            }
          }
        }

        const copiedFileMap = new Map();
        for (const rawPath of referencedFiles) {
          const absPath = resolveHomePath(rawPath);
          if (fs.existsSync(absPath)) {
            const normalizedAbsPath = absPath.replace(/\\/g, '/');
            const isWorkflow = normalizedAbsPath.includes('/workflows/');
            const subFolder = isWorkflow ? 'workflows' : 'references';
            const fileName = path.basename(absPath);

            if (!agentsExists) {
              const destPath = path.join(localAgentsSkillDir, subFolder, fileName);
              fs.mkdirSync(path.dirname(destPath), { recursive: true });
              fs.copyFileSync(absPath, destPath);
            }
            if (!claudeExists) {
              const destPath = path.join(localClaudeSkillDir, subFolder, fileName);
              fs.mkdirSync(path.dirname(destPath), { recursive: true });
              fs.copyFileSync(absPath, destPath);
            }
            copiedFileMap.set(rawPath, { subFolder, fileName });
          } else {
            console.warn(`[init] WARNING: Global context file not found: ${rawPath}`);
          }
        }

        if (!agentsExists) {
          fs.mkdirSync(localAgentsSkillDir, { recursive: true });
          let localContent = skillContent;
          for (const [rawPath, info] of copiedFileMap.entries()) {
            const relPath = `.agents/skills/${skillSlug}/${info.subFolder}/${info.fileName}`;
            localContent = localContent.split(rawPath).join(relPath);
          }
          fs.writeFileSync(path.join(localAgentsSkillDir, 'SKILL.md'), localContent, 'utf8');
          console.log(`[init] Localized skill to .agents/skills/${skillSlug}`);
        }

        if (!claudeExists) {
          fs.mkdirSync(localClaudeSkillDir, { recursive: true });
          let localContent = skillContent;
          for (const [rawPath, info] of copiedFileMap.entries()) {
            const relPath = `.claude/skills/${skillSlug}/${info.subFolder}/${info.fileName}`;
            localContent = localContent.split(rawPath).join(relPath);
          }
          fs.writeFileSync(path.join(localClaudeSkillDir, 'SKILL.md'), localContent, 'utf8');
          console.log(`[init] Localized skill to .claude/skills/${skillSlug}`);
        }
      }
    }
  } catch (e) {
    console.warn(`[init] WARNING: Failed to localize global skills: ${e.message}`);
  }
}

function removeAtlasGuidelineSections(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const kept = [];

  for (let i = 0; i < lines.length; i++) {
    if (/^## (?:Autonomous )?ATLAS Loop\s*$/.test(lines[i])) {
      while (i + 1 < lines.length && !/^## /.test(lines[i + 1])) {
        i++;
      }
      continue;
    }

    kept.push(lines[i]);
  }

  return kept.join('\n');
}

function upsertAtlasGuidelines(repoRoot, opts = {}) {
  const skipExisting = (opts && opts.skipExisting) || {};
  const newBlock = `## Autonomous ATLAS Loop\n\nWhen asked to run the ATLAS auto loop, use the local \`atlas-auto-loop\` skill.\nRead \`.ai/state/flow-state.json\`, resolve \`.ai/flows/atlas-flow.yaml\`, and follow the skill instructions.\nDo not read or create \`.ai/state/flow-ledger.json\`.`;

  for (const f of ['CLAUDE.md', 'GEMINI.md', 'AGENTS.md']) {
    if (skipExisting[f]) continue;
    const p = path.join(repoRoot, f);
    try {
      if (!fs.existsSync(p)) continue;
      let content = fs.readFileSync(p, 'utf8');

      const withoutAtlas = removeAtlasGuidelineSections(content).trimEnd();
      const nextContent = withoutAtlas ? `${withoutAtlas}\n\n${newBlock}\n` : `${newBlock}\n`;
      fs.writeFileSync(p, nextContent, 'utf8');
      console.log(`[init] Upserted Autonomous ATLAS Loop pointer in ${f}`);
    } catch (e) {
      console.warn(`[init] WARNING: Failed to update ${f} with ATLAS Loop guidelines: ${e.message}`);
    }
  }
}

function appendSubagentGuidelines(repoRoot, opts = {}) {
  const skipExisting = (opts && opts.skipExisting) || {};
  const guidelinesBlock = `
## Subagent & Parallel Execution Guidelines

1. **Detect Independent Tasks:** Before starting execution, review the task list (e.g., \`tasks.md\`) to identify independent, non-sequential tasks.
2. **Define Specialized Subagents:** For each independent task or sub-project, define a specialized subagent using the \`define_subagent\` tool.
3. **Spawn in Parallel:** Invoke the defined subagents in parallel using the \`invoke_subagent\` tool to execute tasks concurrently.
4. **Limit Context Size:** Do not pass large session logs or redundant context files to subagents. Keep their context focused and lightweight.
5. **Coordinate & Wait:** Wait for all parallel subagents to complete before advancing to downstream tasks that depend on their outputs.
`;

  const files = ['CLAUDE.md', 'GEMINI.md', 'AGENTS.md'];
  for (const f of files) {
    if (skipExisting[f]) continue;
    const filePath = path.join(repoRoot, f);
    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        if (!content.match(/##\s+Subagent\s+&\s+Parallel\s+Execution\s+Guidelines/i)) {
          if (content && !content.endsWith('\n')) {
            content += '\n';
          }
          content += guidelinesBlock.trim() + '\n';
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`[init] Appended subagent guidelines to ${f}`);
        } else {
          console.log(`[init] Subagent guidelines already present in ${f}, skipping.`);
        }
      } catch (e) {
        console.warn(`[init] WARNING: Failed to update ${f} with subagent guidelines: ${e.message}`);
      }
    }
  }
}

function appendContextPolicyGuidelines(repoRoot, opts = {}) {
  const skipExisting = (opts && opts.skipExisting) || {};
  const guidelinesBlock = `
## Context Budget and Subagent Orchestration Policy

1. **Estimate Byte Pressure:** Before starting any flow stage, estimate the byte pressure locally to decide the execution path (inline, context pack, or fresh session).
2. **Configure Thresholds:** Set conservative size thresholds (e.g. 50KB inline, 200KB context pack) in \`.ai/state/context-policy.json\` to prevent context bloat.
3. **Generate Context Packs:** When context packs are required, generate a structured pack containing only essential files and omit all others.
4. **Use Fresh Sessions:** When byte pressure exceeds limits, write a handoff artifact (\`.ai/state/context-handoff.json\`) and resume from a clean session.
5. **Protect Ledger State:** Parallel subagents must run in isolated workspaces with disjoint write targets and must never modify the central ledger.
`;

  const files = ['CLAUDE.md', 'GEMINI.md', 'AGENTS.md'];
  for (const f of files) {
    if (skipExisting[f]) continue;
    const filePath = path.join(repoRoot, f);
    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        if (!content.match(/##\s+Context\s+Budget\s+and\s+Subagent\s+Orchestration\s+Policy/i)) {
          if (content && !content.endsWith('\n')) {
            content += '\n';
          }
          content += guidelinesBlock.trim() + '\n';
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`[init] Appended context policy guidelines to ${f}`);
        } else {
          console.log(`[init] Context policy guidelines already present in ${f}, skipping.`);
        }
      } catch (e) {
        console.warn(`[init] WARNING: Failed to update ${f} with context policy guidelines: ${e.message}`);
      }
    }
  }
}

function appendBehavioralCoreGuidelines(repoRoot, opts = {}) {
  const skipExisting = (opts && opts.skipExisting) || {};
  const guidelinesBlock = `
## Behavioral Core

1. **State Assumptions:** Before implementation, name any assumptions that affect scope, behavior, data, or verification.
2. **Prefer Simplicity:** Choose the smallest sufficient implementation path and avoid speculative abstractions.
3. **Respect Boundaries:** Touch only files and symbols that are in scope for the accepted task, claim, or plan.
4. **Define Verification:** Know the command, test, or observable check that proves completion before claiming success.
`;

  const files = ['CLAUDE.md', 'GEMINI.md', 'AGENTS.md'];
  for (const f of files) {
    if (skipExisting[f]) continue;
    const filePath = path.join(repoRoot, f);
    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        if (!content.match(/##\s+Behavioral\s+Core/i)) {
          if (content && !content.endsWith('\n')) {
            content += '\n';
          }
          content += guidelinesBlock.trim() + '\n';
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`[init] Appended behavioral core guidelines to ${f}`);
        } else {
          console.log(`[init] Behavioral core guidelines already present in ${f}, skipping.`);
        }
      } catch (e) {
        console.warn(`[init] WARNING: Failed to update ${f} with behavioral core guidelines: ${e.message}`);
      }
    }
  }
}

// Non-intrusive output. Mirrors the four guideline blocks that upsertAtlasGuidelines /
// appendSubagentGuidelines / appendContextPolicyGuidelines / appendBehavioralCoreGuidelines
// would otherwise inject into the team's CLAUDE.md/GEMINI.md/AGENTS.md. Written only when
// those files pre-existed.
function writeSeparateAtlasInstructions(repoRoot) {
  const dir = path.join(repoRoot, '.ai/instructions');
  const dest = path.join(dir, 'ATLAS.md');

  const header = `# SAF / ATLAS Instructions

> Your project already had instruction files (CLAUDE.md / GEMINI.md / AGENTS.md), so Snail
> Agent Flow did not modify them. The guidance SAF would normally add lives here instead.
> To follow SAF, read this file alongside your existing instruction files.
`;

  // Each section is keyed by a regex matching its \`##\` heading so re-runs append only
  // the blocks that are missing (idempotent upgrades), instead of skipping the whole file.
  const sections = [
    {
      match: /##\s+Autonomous\s+ATLAS\s+Loop/i,
      body: `## Autonomous ATLAS Loop

When asked to run the ATLAS auto loop, use the local \`atlas-auto-loop\` skill.
Read \`.ai/state/flow-state.json\`, resolve \`.ai/flows/atlas-flow.yaml\`, and follow the skill instructions.
Do not read or create \`.ai/state/flow-ledger.json\`.`,
    },
    {
      match: /##\s+Subagent\s+&\s+Parallel\s+Execution\s+Guidelines/i,
      body: `## Subagent & Parallel Execution Guidelines

1. **Detect Independent Tasks:** Before starting execution, review the task list (e.g., \`tasks.md\`) to identify independent, non-sequential tasks.
2. **Define Specialized Subagents:** For each independent task or sub-project, define a specialized subagent using the \`define_subagent\` tool.
3. **Spawn in Parallel:** Invoke the defined subagents in parallel using the \`invoke_subagent\` tool to execute tasks concurrently.
4. **Limit Context Size:** Do not pass large session logs or redundant context files to subagents. Keep their context focused and lightweight.
5. **Coordinate & Wait:** Wait for all parallel subagents to complete before advancing to downstream tasks that depend on their outputs.`,
    },
    {
      match: /##\s+Context\s+Budget\s+and\s+Subagent\s+Orchestration\s+Policy/i,
      body: `## Context Budget and Subagent Orchestration Policy

1. **Estimate Byte Pressure:** Before starting any flow stage, estimate the byte pressure locally to decide the execution path (inline, context pack, or fresh session).
2. **Configure Thresholds:** Set conservative size thresholds (e.g. 50KB inline, 200KB context pack) in \`.ai/state/context-policy.json\` to prevent context bloat.
3. **Generate Context Packs:** When context packs are required, generate a structured pack containing only essential files and omit all others.
4. **Use Fresh Sessions:** When byte pressure exceeds limits, write a handoff artifact (\`.ai/state/context-handoff.json\`) and resume from a clean session.
5. **Protect Ledger State:** Parallel subagents must run in isolated workspaces with disjoint write targets and must never modify the central ledger.`,
    },
    {
      match: /##\s+Behavioral\s+Core/i,
      body: `## Behavioral Core

1. **State Assumptions:** Before implementation, name any assumptions that affect scope, behavior, data, or verification.
2. **Prefer Simplicity:** Choose the smallest sufficient implementation path and avoid speculative abstractions.
3. **Respect Boundaries:** Touch only files and symbols that are in scope for the accepted task, claim, or plan.
4. **Define Verification:** Know the command, test, or observable check that proves completion before claiming success.`,
    },
  ];

  try {
    fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(dest)) {
      const content = header + '\n' + sections.map((s) => s.body).join('\n\n') + '\n';
      fs.writeFileSync(dest, content, 'utf8');
      console.log('[init] Created .ai/instructions/ATLAS.md');
      return;
    }

    // File exists: append only the sections it is missing so older onboarded projects
    // pick up guidance added after they were first initialized.
    let content = fs.readFileSync(dest, 'utf8');
    const missing = sections.filter((s) => !s.match.test(content));
    if (missing.length === 0) {
      console.log('[init] .ai/instructions/ATLAS.md already up to date, skipping.');
      return;
    }

    if (content && !content.endsWith('\n')) {
      content += '\n';
    }
    content += '\n' + missing.map((s) => s.body).join('\n\n') + '\n';
    fs.writeFileSync(dest, content, 'utf8');
    console.log(`[init] Updated .ai/instructions/ATLAS.md (added ${missing.length} missing section(s)).`);
  } catch (e) {
    console.warn(`[init] WARNING: Failed to write .ai/instructions/ATLAS.md: ${e.message}`);
  }
}

function updateGitignore(repoRoot) {
  const gitignorePath = path.join(repoRoot, '.gitignore');
  const ignoreBlock = `
# Snail Agent Flow / ATLAS Loop
.ai/sessions/
.ai/state/
.ai/claims/
.ai/locks/
.ai/signals/
.ai/context-packs/
.ai/state/repair-guide.md
.gsd/
.gsd-id
.mcp.json
.bg-shell/
.specify/**/*.local
specs/**/*.local
`;

  try {
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, ignoreBlock.trim() + '\n', 'utf8');
      console.log('[init] Created .gitignore with Snail Agent Flow rules.');
      return;
    }

    let content = fs.readFileSync(gitignorePath, 'utf8');
    if (!content.includes('# Snail Agent Flow / ATLAS Loop')) {
      if (content && !content.endsWith('\n')) {
        content += '\n';
      }
      content += ignoreBlock.trim() + '\n';
      fs.writeFileSync(gitignorePath, content, 'utf8');
      console.log('[init] Appended Snail Agent Flow rules to .gitignore.');
    } else {
      console.log('[init] Snail Agent Flow rules already present in .gitignore, skipping.');
    }
  } catch (e) {
    console.warn(`[init] WARNING: Failed to update .gitignore: ${e.message}`);
  }
}

function handleScore(cmdArgs) {
  if (cmdArgs.length === 0) {
    console.error('Error: Missing task JSON file. Usage: adp score <task.json>');
    process.exit(1);
  }

  const filePath = path.resolve(repoRoot, cmdArgs[0]);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const task = JSON.parse(raw);
    const { score } = require('../lib/profile-scorer');
    const result = score(task);
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(`Error scoring task: ${e.message}`);
    process.exit(1);
  }
}

function handleClaim(cmdArgs) {
  const { ClaimManager } = require('../lib/claim-manager');
  const claimManager = new ClaimManager(path.join(repoRoot, '.ai/claims'));

  // parse options
  let release = false;
  let status = false;
  let taskSlug = null;
  let owner = process.env.USER || process.env.USERNAME || 'agent';
  let profile = null;
  let scope = [];

  for (let i = 0; i < cmdArgs.length; i++) {
    const arg = cmdArgs[i];
    if (arg === '--release') {
      release = true;
    } else if (arg === '--status') {
      status = true;
    } else if (arg === '--owner') {
      owner = cmdArgs[++i];
    } else if (arg === '--profile') {
      profile = cmdArgs[++i];
    } else if (arg === '--scope') {
      scope = cmdArgs[++i].split(',');
    } else if (arg.startsWith('--')) {
      console.error(`Error: Unknown flag "${arg}"`);
      process.exit(1);
    } else {
      taskSlug = arg;
    }
  }

  if (!taskSlug) {
    console.error('Error: Missing task slug. Usage: adp claim <task-slug> [options]');
    process.exit(1);
  }

  try {
    if (release) {
      const released = claimManager.release(taskSlug, owner);
      if (released) {
        console.log(`[claim] Released task: ${taskSlug}`);
      } else {
        console.log(`[claim] No active claim found for task: ${taskSlug}`);
      }
      process.exit(0);
    }

    if (status) {
      const record = claimManager.status(taskSlug);
      if (record) {
        console.log(JSON.stringify(record, null, 2));
      } else {
        console.log(`[claim] Task ${taskSlug} is not currently claimed.`);
      }
      process.exit(0);
    }

    // Default: acquire claim
    claimManager.claim(taskSlug, { owner, profile, scope });
    console.log(`[claim] Successfully claimed task: ${taskSlug} (owner: ${owner})`);
    process.exit(0);
  } catch (e) {
    console.error(`Error handling claim: ${e.message}`);
    process.exit(1);
  }
}

function handleLease(cmdArgs) {
  const { LeaseManager } = require('../lib/lease-manager');
  const leaseManager = new LeaseManager(path.join(repoRoot, '.ai/locks'));

  // parse options
  let release = false;
  let file = null;
  let owner = process.env.USER || process.env.USERNAME || 'agent';
  let purpose = null;
  let stale_lock_cap_seconds = 3600;

  for (let i = 0; i < cmdArgs.length; i++) {
    const arg = cmdArgs[i];
    if (arg === '--release') {
      release = true;
    } else if (arg === '--owner') {
      owner = cmdArgs[++i];
    } else if (arg === '--purpose') {
      purpose = cmdArgs[++i];
    } else if (arg === '--stale_lock_cap_seconds') {
      stale_lock_cap_seconds = parseInt(cmdArgs[++i], 10);
    } else if (arg.startsWith('--')) {
      console.error(`Error: Unknown flag "${arg}"`);
      process.exit(1);
    } else {
      file = arg;
    }
  }

  if (!file) {
    console.error('Error: Missing file path. Usage: adp lease <file> [options]');
    process.exit(1);
  }

  // Normalize to absolute path
  const absFile = path.resolve(repoRoot, file);

  try {
    if (release) {
      const released = leaseManager.release(absFile, owner);
      if (released) {
        console.log(`[lease] Released lease on: ${file}`);
      } else {
        console.log(`[lease] No active lease found for file: ${file}`);
      }
      // Sync lock removal to flow-state
      try {
        const flowStateMod = require('../lib/flow-state');
        const state = flowStateMod.load(repoRoot);
        if (state) {
          const relFile = path.relative(repoRoot, absFile);
          state.locks = (state.locks || []).filter(l => l.file !== relFile);
          flowStateMod.save(repoRoot, state);
        }
      } catch (syncErr) {
        console.warn('[lease] Warning: Could not sync to flow-state.json:', syncErr.message);
      }
      process.exit(0);
    }

    // Default: acquire lease
    leaseManager.acquire(absFile, { owner, purpose, stale_lock_cap_seconds });
    console.log(`[lease] Successfully leased file: ${file} (owner: ${owner})`);
    // Sync lock acquisition to flow-state
    try {
      const flowStateMod = require('../lib/flow-state');
      const state = flowStateMod.load(repoRoot);
      if (state) {
        const relFile = path.relative(repoRoot, absFile);
        if (!state.locks) state.locks = [];
        if (!state.locks.some(l => l.file === relFile)) {
          state.locks.push({ file: relFile, acquired_at: new Date().toISOString() });
        }
        flowStateMod.save(repoRoot, state);
      }
    } catch (syncErr) {
      console.warn('[lease] Warning: Could not sync to flow-state.json:', syncErr.message);
    }
    process.exit(0);
  } catch (e) {
    console.error(`Error handling lease: ${e.message}`);
    process.exit(1);
  }
}

function handleCheckpoint(cmdArgs) {
  const { writeProfileSwitch } = require('../lib/checkpoint-writer');
  
  let from = null;
  let to = null;
  let reason = '';
  let completed_files = [];
  let active_risks = [];
  let resume_steps = [];
  
  for (let i = 0; i < cmdArgs.length; i++) {
    const arg = cmdArgs[i];
    if (arg === '--switch') {
      from = cmdArgs[++i];
      to = cmdArgs[++i];
    } else if (arg === '--reason') {
      reason = cmdArgs[++i];
    } else if (arg === '--completed') {
      completed_files = cmdArgs[++i].split(',').map(f => f.trim()).filter(Boolean);
    } else if (arg === '--risks') {
      active_risks = cmdArgs[++i].split(',').map(r => r.trim()).filter(Boolean);
    } else if (arg === '--resume') {
      resume_steps = cmdArgs[++i].split(',').map(s => s.trim()).filter(Boolean);
    } else {
      console.error(`Error: Unknown argument or flag "${arg}"`);
      process.exit(1);
    }
  }

  if (!from || !to) {
    console.error('Error: Missing --switch <from> <to>.');
    process.exit(1);
  }
  
  if (!reason) {
    console.error('Error: Missing --reason "<text>".');
    process.exit(1);
  }

  try {
    const targetDir = path.join(repoRoot, '.ai/state');
    const writtenPath = writeProfileSwitch({
      from,
      to,
      reason,
      completed_files,
      active_risks,
      resume_steps
    }, targetDir);
    console.log(`[checkpoint] Checkpoint written to: ${path.relative(repoRoot, writtenPath)}`);
    process.exit(0);
  } catch (e) {
    console.error(`Error writing checkpoint: ${e.message}`);
    process.exit(1);
  }
}

function handleSignal(cmdArgs) {
  const { logSignal } = require('../lib/signal-logger');
  
  if (cmdArgs.length < 2) {
    console.error('Error: Missing signal type or value. Usage: adp signal <type> <value> [--reason "<text>"]');
    process.exit(1);
  }

  const type = cmdArgs[0];
  const value = cmdArgs[1];
  let reason = '';

  for (let i = 2; i < cmdArgs.length; i++) {
    const arg = cmdArgs[i];
    if (arg === '--reason') {
      reason = cmdArgs[++i];
    } else {
      console.error(`Error: Unknown flag/argument "${arg}"`);
      process.exit(1);
    }
  }

  try {
    const targetDir = path.join(repoRoot, '.ai/signals');
    const writtenPath = logSignal(type, value, reason, targetDir);
    console.log(`[signal] Observability signal logged to: ${path.relative(repoRoot, writtenPath)}`);
    process.exit(0);
  } catch (e) {
    console.error(`Error logging signal: ${e.message}`);
    process.exit(1);
  }
}

/**
 * Resolves the stage id for budget/pack commands:
 * explicit --stage flag, else .ai/state/flow-state.json, else ad-hoc.
 */
function resolveStageForBudget(stageFlag) {
  if (stageFlag) {
    return { stageId: stageFlag, stageSource: '--stage flag' };
  }
  try {
    const flowState = require('../lib/flow-state').load(repoRoot);
    if (flowState && flowState.stage) {
      return { stageId: flowState.stage, stageSource: '.ai/state/flow-state.json' };
    }
  } catch (e) {
    // Unreadable or invalid flow state: fall through to ad-hoc mode
  }
  return { stageId: 'adhoc', stageSource: 'ad-hoc (no flow state found)' };
}

/**
 * Looks up the stage definition in .ai/flows/atlas-flow.yaml so the budget
 * walk includes the stage's required artifacts. Falls back to a stub stage
 * (sessions, packs, and handoff inputs are still counted).
 */
function findFlowStage(stageId) {
  try {
    const flowPath = path.join(repoRoot, '.ai/flows/atlas-flow.yaml');
    if (fs.existsSync(flowPath)) {
      const { parseYaml } = require('../lib/yaml-parser');
      const flowDef = parseYaml(fs.readFileSync(flowPath, 'utf8'));
      if (flowDef && Array.isArray(flowDef.stages)) {
        const found = flowDef.stages.find(s => s && s.id === stageId);
        if (found) {
          return { flowStage: found, fromDefinition: true };
        }
      }
    }
  } catch (e) {
    // Unparsable flow definition: fall back to stub stage
  }
  return { flowStage: { id: stageId, required_artifacts: [] }, fromDefinition: false };
}

function readFeatureVariables() {
  const variables = {};
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(repoRoot, '.specify/feature.json'), 'utf8'));
    if (raw && typeof raw.feature_directory === 'string' && raw.feature_directory.trim()) {
      variables.feature_dir = raw.feature_directory.replace(/[\/\\]+$/, '');
    }
  } catch (e) {
    // No active feature pointer: budget walk simply skips feature artifacts
  }
  return variables;
}

function handleBudget(cmdArgs) {
  let stageFlag = null;
  let asJson = false;
  let enforce = false;

  for (let i = 0; i < cmdArgs.length; i++) {
    const arg = cmdArgs[i];
    if (arg === '--stage') {
      stageFlag = cmdArgs[++i];
      if (!stageFlag) {
        console.error('Error: --stage requires a stage id.');
        process.exit(1);
      }
    } else if (arg === '--json') {
      asJson = true;
    } else if (arg === '--enforce') {
      enforce = true;
    } else {
      console.error(`Error: Unknown flag/argument "${arg}"`);
      process.exit(1);
    }
  }

  const { loadPolicyConfig, estimateBudget, computeOutcome } = require('../lib/context-budget');
  const { stageId, stageSource } = resolveStageForBudget(stageFlag);
  const { flowStage, fromDefinition } = findFlowStage(stageId);
  const variables = readFeatureVariables();

  const policyConfig = loadPolicyConfig(repoRoot);
  const estimate = estimateBudget(flowStage, repoRoot, variables);
  const totalBytes = estimate.totalBytes;
  const inputs = estimate.inputs.map(input => ({
    path: String(input.path).split(path.sep).join('/'),
    bytes: input.bytes
  }));
  const outcome = computeOutcome(totalBytes, flowStage.id, policyConfig);

  if (asJson) {
    console.log(JSON.stringify({
      stage_id: stageId,
      stage_source: stageSource,
      stage_in_flow_definition: fromDefinition,
      estimated_bytes: totalBytes,
      thresholds: {
        inline_threshold_bytes: policyConfig.inline_threshold_bytes,
        pack_threshold_bytes: policyConfig.pack_threshold_bytes
      },
      inputs,
      outcome
    }, null, 2));
  } else {
    console.log(`[budget] Stage: ${stageId} (${stageSource})`);
    if (!fromDefinition) {
      console.log('[budget] Stage not found in flow definition; stage-specific artifacts skipped.');
    }
    console.log(`[budget] Estimated byte pressure: ${totalBytes} bytes (heuristic, not tokens)`);
    console.log(`[budget] Thresholds: inline <= ${policyConfig.inline_threshold_bytes}, context pack <= ${policyConfig.pack_threshold_bytes}, above => fresh session`);
    const topInputs = inputs.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 10);
    if (topInputs.length > 0) {
      console.log(`[budget] Largest inputs (${inputs.length} total):`);
      for (const input of topInputs) {
        console.log(`  - ${input.path} (${input.bytes} bytes)`);
      }
    }
    console.log(`[budget] Outcome: ${outcome}`);
    if (outcome === 'inline') {
      console.log('[budget] Action: proceed inline.');
    } else if (outcome === 'context_pack_required') {
      console.log('[budget] Action: run `saf pack` and hand the pack to a subagent or fresh session.');
    } else {
      console.log('[budget] Action: write a handoff (.ai/state/context-handoff.json) and resume in a fresh session.');
    }
  }

  if (enforce && outcome !== 'inline') {
    process.exit(1);
  }
  process.exit(0);
}

function handlePack(cmdArgs) {
  let stageFlag = null;
  let objective = null;
  let outPath = null;

  for (let i = 0; i < cmdArgs.length; i++) {
    const arg = cmdArgs[i];
    if (arg === '--stage') {
      stageFlag = cmdArgs[++i];
    } else if (arg === '--objective') {
      objective = cmdArgs[++i];
    } else if (arg === '--out') {
      outPath = cmdArgs[++i];
    } else {
      console.error(`Error: Unknown flag/argument "${arg}"`);
      process.exit(1);
    }
  }
  if ((stageFlag !== null && !stageFlag) || (objective !== null && !objective) || (outPath !== null && !outPath)) {
    console.error('Error: --stage, --objective, and --out each require a value.');
    process.exit(1);
  }

  const { generatePack } = require('../lib/context-pack-generator');
  const { stageId, stageSource } = resolveStageForBudget(stageFlag);

  const result = generatePack(repoRoot, { stageId, objective, outPath });
  if (!result.ok) {
    console.error('[pack] Context pack generation failed:');
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(`[pack] Stage: ${stageId} (${stageSource})`);
  console.log(`[pack] Context pack written: ${path.relative(repoRoot, result.path)}`);
  console.log(`[pack] Required files: ${result.manifest.required_files.length}, omissions: ${result.manifest.omissions.length}`);
  console.log('[pack] Hand this pack to a subagent or fresh session; it should read only the listed files.');
  process.exit(0);
}

function handleOnboardMemory() {
  const onboardingPath = path.join(repoRoot, 'ONBOARDING.md');
  if (!fs.existsSync(onboardingPath)) {
    console.error('[onboard-memory] No ONBOARDING.md found at project root.');
    console.error('[onboard-memory] Run project-onboarding skill first to generate it.');
    process.exit(1);
  }

  const archPath = path.join(repoRoot, '.ai/memory/current-architecture.md');
  const summaryPath = path.join(repoRoot, '.ai/memory/project-summary.md');

  if (!fs.existsSync(archPath)) {
    console.error('[onboard-memory] .ai/memory/current-architecture.md not found.');
    console.error('[onboard-memory] Run `saf init` first.');
    process.exit(1);
  }

  const onboardingContent = fs.readFileSync(onboardingPath, 'utf8');
  const SEED_MARKER = 'Seeded by saf init';

  // Extract architecture from ONBOARDING.md
  const sections = extractOnboardingSections(onboardingContent);

  // Update current-architecture.md if still seeded
  const archContent = fs.readFileSync(archPath, 'utf8');
  if (archContent.includes(SEED_MARKER)) {
    const newArch = buildArchitectureMemory(sections);
    fs.writeFileSync(archPath, newArch, 'utf8');
    console.log('[onboard-memory] Updated .ai/memory/current-architecture.md from ONBOARDING.md');
  } else {
    console.log('[onboard-memory] current-architecture.md has been manually updated. Skipping.');
  }

  // Update project-summary.md if still seeded
  if (fs.existsSync(summaryPath)) {
    const summaryContent = fs.readFileSync(summaryPath, 'utf8');
    if (summaryContent.includes(SEED_MARKER)) {
      const newSummary = buildProjectSummary(sections);
      fs.writeFileSync(summaryPath, newSummary, 'utf8');
      console.log('[onboard-memory] Updated .ai/memory/project-summary.md from ONBOARDING.md');
    } else {
      console.log('[onboard-memory] project-summary.md has been manually updated. Skipping.');
    }
  }

  console.log('[onboard-memory] Memory promotion complete.');
  process.exit(0);
}

function extractOnboardingSections(content) {
  const sections = {};
  const headingRegex = /^## (.+)$/gm;
  let match;
  const headings = [];

  while ((match = headingRegex.exec(content)) !== null) {
    headings.push({ title: match[1].trim(), index: match.index });
  }

  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].index;
    const end = i + 1 < headings.length ? headings[i + 1].index : content.length;
    const sectionContent = content.slice(start, end).trim();
    sections[headings[i].title.toLowerCase()] = sectionContent;
  }

  // Extract purpose line (first blockquote or first paragraph after # heading)
  const purposeMatch = content.match(/^>\s*(.+)$/m);
  if (purposeMatch) {
    sections['_purpose'] = purposeMatch[1].trim();
  }

  return sections;
}

function buildArchitectureMemory(sections) {
  let result = '<!-- Promoted from ONBOARDING.md by saf onboard-memory -->\n';
  result += '# Current Architecture\n\n';

  if (sections['architecture']) {
    result += sections['architecture'] + '\n\n';
  }

  if (sections['stack & entrypoints']) {
    result += sections['stack & entrypoints'] + '\n\n';
  }

  if (sections['conventions & constraints']) {
    result += sections['conventions & constraints'] + '\n\n';
  }

  result += '## Architecture Decisions\n\n';
  result += '_No decisions recorded yet. Update during Memory Handoff (Step 5.5)._\n';

  return result;
}

function buildProjectSummary(sections) {
  let result = '<!-- Promoted from ONBOARDING.md by saf onboard-memory -->\n';
  result += '# Project Summary\n\n';

  if (sections['_purpose']) {
    result += '## Purpose\n\n' + sections['_purpose'] + '\n\n';
  }

  if (sections['stack & entrypoints']) {
    result += sections['stack & entrypoints'] + '\n\n';
  }

  if (sections['commands']) {
    result += sections['commands'] + '\n\n';
  }

  result += '## Current State\n\n';
  result += '_Update during Memory Handoff (Step 5.5)._\n';

  return result;
}

module.exports = {
  removeAtlasGuidelineSections,
  upsertAtlasGuidelines,
  appendSubagentGuidelines,
  appendContextPolicyGuidelines,
  appendBehavioralCoreGuidelines,
  writeSeparateAtlasInstructions
};

