# Memory Handoff Report

- **Feature:** 017-context-budget-gate
- **Date:** 2026-05-27

## Promoted to project memory
- Byte-Pressure Heuristics: Local and offline estimation of context pressure based on sizes of files on disk.
- Orchestration Outcomes: Resolves stages to exactly one of `inline`, `context_pack_required`, or `fresh_session_required`.
- Context Packs: Path-only relative JSON manifests specifying objectives, allowed paths, omissions, and verification.
- Handoff Manifest: Structured `.ai/state/context-handoff.json` to resume states across fresh sessions.
- Subagent Protection: Capped concurrency (default 3) and verification of disjoint write targets for parallel subagents.
- Strict Validation Gate: Fails closed on path traversal, overlapping targets, or config schema errors.

## Architecture updated
- Added `lib/context-budget.js` to load policy configs, walk files, and calculate byte pressure.
- Added `lib/context-policy-validator.js` with schema validators for policy config, packs, and handoffs.
- Added schemas in `specs/017-context-budget-gate/contracts/` for configs, packs, and handoff files.
- Modified `lib/flow-engine.js` to calculate byte pressure on stage resolution and output context policy blocks.
- Modified `lib/init-checks.js` to run strict checks for policy configs, context packs, and handoffs.
- Modified `bin/adp.js` to scaffold policy config during `init` and run validation gates in `doctor`.

## Verification promoted
- Added unit tests in `validators/scripts/test-context-budget.js` for calculators, schemas, and subagents.
- Extended validation tests in `validators/scripts/test-flow-engine.js`, `test-init-checks.js`, and `test-cli.js`.
- Verified commands: `node bin/adp.js doctor`, `node bin/adp.js init`, and the full validation suite (`npm test`).
