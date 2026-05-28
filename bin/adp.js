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
    '.ai/flows',
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

  // Copy default flow definition
  const flowDestPath = path.join(repoRoot, '.ai/flows/rough-project-flow.yaml');
  const flowTemplatePath = path.join(packageRoot, '.specify/templates/rough-project-flow.yaml');
  if (!fs.existsSync(flowDestPath)) {
    if (fs.existsSync(flowTemplatePath)) {
      fs.copyFileSync(flowTemplatePath, flowDestPath);
      console.log('[init] Created .ai/flows/rough-project-flow.yaml (copied from template)');
    } else {
      console.warn('[init] WARNING: Flow template not found at .specify/templates/rough-project-flow.yaml, skipping flow definition copy.');
    }
  } else {
    console.log('[init] .ai/flows/rough-project-flow.yaml already exists, skipping.');
  }

  // Generate flow ledger state
  const ledgerPath = path.join(repoRoot, '.ai/state/flow-ledger.json');
  if (!fs.existsSync(ledgerPath)) {
    try {
      const { parseYaml } = require('../lib/yaml-parser');
      const { createLedgerFromFlow } = require('../lib/flow-ledger');
      // Read the flow definition (prefer the just-copied project copy, fall back to package template)
      const flowSource = fs.existsSync(flowDestPath) ? flowDestPath : flowTemplatePath;
      if (fs.existsSync(flowSource)) {
        const flowYaml = fs.readFileSync(flowSource, 'utf8');
        const flowDef = parseYaml(flowYaml);
        const ledger = createLedgerFromFlow(flowDef, '.ai/flows/rough-project-flow.yaml');
        fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n', 'utf8');
        console.log('[init] Created .ai/state/flow-ledger.json (initialized from flow definition)');
      } else {
        console.warn('[init] WARNING: No flow definition available, skipping ledger generation.');
      }
    } catch (e) {
      console.warn(`[init] WARNING: Could not generate flow ledger: ${e.message}`);
      console.warn('[init] Flow definition may be malformed. Ledger generation skipped.');
    }
  } else {
    console.log('[init] .ai/state/flow-ledger.json already exists, skipping.');
  }

  // Generate project-flow SKILL.md stub
  const skillDir = path.join(repoRoot, '.agents/skills/project-flow');
  const skillPath = path.join(skillDir, 'SKILL.md');
  const skillTemplatePath = path.join(packageRoot, '.specify/templates/project-flow-skill-template.md');
  if (!fs.existsSync(skillPath)) {
    if (fs.existsSync(skillTemplatePath)) {
      fs.mkdirSync(skillDir, { recursive: true });
      fs.copyFileSync(skillTemplatePath, skillPath);
      console.log('[init] Created .agents/skills/project-flow/SKILL.md (copied from template)');
    } else {
      console.warn('[init] WARNING: SKILL.md template not found, skipping skill stub generation.');
    }
  } else {
    console.log('[init] .agents/skills/project-flow/SKILL.md already exists, skipping.');
  }

  // Also initialize for Claude Code if needed
  const claudeSkillDir = path.join(repoRoot, '.claude/skills/project-flow');
  const claudeSkillPath = path.join(claudeSkillDir, 'SKILL.md');
  if (!fs.existsSync(claudeSkillPath)) {
    if (fs.existsSync(skillTemplatePath)) {
      fs.mkdirSync(claudeSkillDir, { recursive: true });
      fs.copyFileSync(skillTemplatePath, claudeSkillPath);
      console.log('[init] Created .claude/skills/project-flow/SKILL.md (copied from template)');
    }
  } else {
    console.log('[init] .claude/skills/project-flow/SKILL.md already exists, skipping.');
  }

  // Localize GSD skills and append subagent guidelines
  localizeGlobalSkills(repoRoot);
  appendSubagentGuidelines(repoRoot);
  appendContextPolicyGuidelines(repoRoot);

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

function handleDoctor(cmdArgs = []) {
  const checkLocks = cmdArgs.includes('--check-locks');

  runAndReport(repoRoot, 'doctor');

  const claimsStore = new OwnershipStore(path.join(repoRoot, '.ai/claims'));
  const locksStore = new OwnershipStore(path.join(repoRoot, '.ai/locks'));
  
  const claims = claimsStore.list();
  const locks = locksStore.list();

  console.log(`[doctor] Active claims: ${claims.length}`);
  console.log(`[doctor] Active locks: ${locks.length}`);

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
  if (filePath.startsWith('~')) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  if (filePath.startsWith('$HOME')) {
    return path.join(os.homedir(), filePath.slice(5));
  }
  return filePath;
}

function localizeGlobalSkills(repoRoot) {
  const os = require('os');
  const homeDir = os.homedir();
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
            const isWorkflow = absPath.includes('/workflows/');
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

function appendSubagentGuidelines(repoRoot) {
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

function appendContextPolicyGuidelines(repoRoot) {
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

  try {
    if (release) {
      const released = leaseManager.release(file, owner);
      if (released) {
        console.log(`[lease] Released lease on: ${file}`);
      } else {
        console.log(`[lease] No active lease found for file: ${file}`);
      }
      process.exit(0);
    }

    // Default: acquire lease
    leaseManager.acquire(file, { owner, purpose, stale_lock_cap_seconds });
    console.log(`[lease] Successfully leased file: ${file} (owner: ${owner})`);
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



