# Implementation Plan: Context Budget Gate and Subagent Orchestration Policy

**Branch**: `017-context-budget-gate` | **Date**: 2026-05-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/017-context-budget-gate/spec.md`

## Summary

This feature implements a deterministic, offline context budget gate and subagent orchestration policy layer for the AI delivery pipeline. It calculates estimated context pressure based on file sizes on disk (a byte-pressure heuristic) rather than live token counts. The flow engine resolves outcomes (`inline`, `context_pack_required`, or `fresh_session_required`) and appends them to stage instructions, guiding agents when to stay inline, when to spawn isolated subagents with minimal context packs, and when to pause and hand off to fresh sessions using structured handoff files.

## Technical Context

**Language/Version**: Node.js v18+

**Primary Dependencies**: None (only Node.js built-ins like `fs`, `path`, `os`, `child_process`)

**Storage**: Local files (`.ai/state/context-policy.json`, `.ai/state/context-handoff.json`, `.ai/context-packs/*.json`)

**Testing**: Node.js assert-based unit tests (`validators/scripts/test-context-budget.js`, and extensions to `validators/scripts/test-flow-engine.js`, `validators/scripts/test-init-checks.js`, `validators/scripts/test-cli.js`)

**Target Platform**: macOS, Linux

**Project Type**: CLI / Flow Engine Orchestrator

**Performance Goals**: Gate execution under 100ms

**Constraints**: Completely offline, deterministic, no LLM-as-judge calls

**Scale/Scope**: Local developer workspace validation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Preserve Existing Behavior**: Checked. The signature of `resolveNextStage` is extended additively with optional parameters so existing tests and callers are unaffected.
- **Verification Gaps**: Checked. All changes will be validated by a dedicated unit test suite running under `npm test`.
- **Offline Integrity**: Checked. No network calls or runtime LLM validation is introduced.

## Project Structure

### Documentation (this feature)

```text
specs/017-context-budget-gate/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output: schemas and models
├── quickstart.md        # Phase 1 output: usage and integration guide
├── contracts/           # Phase 1 output: JSON schemas for configurations
│   ├── context-policy.schema.json
│   ├── context-pack.schema.json
│   └── context-handoff.schema.json
└── tasks.md             # Phase 2 output (created by /speckit-tasks command)
```

### Source Code (repository root)

```text
lib/
├── context-budget.js           # Budget estimation & outcome decision logic
├── context-policy-validator.js  # Schema & orchestration rules validator
├── flow-engine.js              # Modified to call context-budget & append policy instructions
└── init-checks.js              # Modified to run context & policy validators
validators/scripts/
├── test-context-budget.js      # New unit tests
├── test-flow-engine.js         # Extended for resolveNextStage/formatStageInstruction
├── test-init-checks.js         # Extended for runStrictChecks policy gate
└── test-cli.js                 # Extended for adp doctor/init integration
.ai/
└── context-packs/              # Directory for context pack JSON files
```

**Structure Decision**: Standard library layout. Implementation lives in new modules inside `lib/` and is integrated into existing scripts (`lib/flow-engine.js`, `lib/init-checks.js`), while unit tests are added to `validators/scripts/`.

## Proposed Changes

We will implement the feature in three phases corresponding to the Roadmap waves:

### Phase 1: Core Foundation Modules
- **lib/context-budget.js**: Implement budget estimation using `fs.statSync` to sum files (declared artifacts, session logs, planning files, context packs, handoffs). Implement `computeOutcome` to apply thresholds and overrides. Implement `loadPolicyConfig` to load/merge the configuration file.
- **lib/context-policy-validator.js**: Implement fail-closed schema validators for policy config, context packs, and handoff files, including write-target uniqueness checks for fan-out subagents.
- **validators/scripts/test-context-budget.js**: Write a dedicated unit test suite.
- **.ai/context-packs/.gitkeep**: Create the context pack storage folder.

### Phase 2: Flow Engine Integration
- **lib/flow-engine.js**: Extend `resolveNextStage` to return `contextPolicy` (outcome, size, input list, config) additively. Extend `formatStageInstruction` to append the `CONTEXT POLICY` section to printed stage information.
- **validators/scripts/test-flow-engine.js**: Add tests verifying the returned metadata and stage instruction output block.

### Phase 3: Validation and CLI Integration
- **lib/init-checks.js**: Add static validation gates to `runStrictChecks` to verify the policy config (`.ai/state/context-policy.json`), context packs (`.ai/context-packs/*.json`), and handoff (`.ai/state/context-handoff.json`).
- **bin/adp.js**: Update `handleInit` to write a default `.ai/state/context-policy.json` and append the new `## Context Budget and Subagent Orchestration Policy` block to instructions.
- **validators/scripts/test-init-checks.js** and **test-cli.js**: Verify validation gates and doctor/init execution logic.

## Verification Plan

### Automated Tests
- Run `node validators/scripts/test-context-budget.js` to verify estimation and schema rules.
- Run `npm test` to verify the complete suite runs successfully.

### Manual Verification
- Run `node bin/adp.js init` on a clean directory to verify defaulting and instruction updates.
- Run `node bin/adp.js doctor` to verify health checks report policy configurations correctly.
