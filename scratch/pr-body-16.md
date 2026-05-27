## Summary

**Phase 16: Context budget gate and subagent orchestration policy**
**Goal:** Add a deterministic context budget and orchestration policy layer so the flow engine can decide when work stays inline, when it must hand off to a fresh session, and when independent tasks should run as isolated subagents with minimal context packs instead of inheriting a large chat history.
**Status:** Verified ✓

This phase implements a completely offline, deterministic context budget gate and subagent orchestration policy layer. It calculates estimated context pressure based on file sizes on disk (a byte-pressure heuristic). Based on configurable thresholds, the flow engine resolves outcomes to either keep execution `inline`, require a `context_pack_required` for spawning isolated subagents, or stop for a `fresh_session_required` using well-known handoff files.

## Changes

### Plan 16-01: Core Foundation Modules
Foundation modules for deterministic budget estimation (`lib/context-budget.js`) and schema/rules validation (`lib/context-policy-validator.js`).
- **Key files:** [lib/context-budget.js](file:///Volumes/D/snail-agent-flow/lib/context-budget.js), [lib/context-policy-validator.js](file:///Volumes/D/snail-agent-flow/lib/context-policy-validator.js), [validators/scripts/test-context-budget.js](file:///Volumes/D/snail-agent-flow/validators/scripts/test-context-budget.js)

### Plan 16-02: Flow Engine Integration
Wires context policy resolution and actions into `resolveNextStage` and `formatStageInstruction`.
- **Key files:** [lib/flow-engine.js](file:///Volumes/D/snail-agent-flow/lib/flow-engine.js), [validators/scripts/test-flow-engine.js](file:///Volumes/D/snail-agent-flow/validators/scripts/test-flow-engine.js)

### Plan 16-03: Validation and CLI Integration
Integrates checks into `runStrictChecks`, adds default configuration scaffolding and guidelines to `adp init`, and enforces doctor validation gates.
- **Key files:** [lib/init-checks.js](file:///Volumes/D/snail-agent-flow/lib/init-checks.js), [bin/adp.js](file:///Volumes/D/snail-agent-flow/bin/adp.js), [validators/scripts/test-init-checks.js](file:///Volumes/D/snail-agent-flow/validators/scripts/test-init-checks.js), [validators/scripts/test-cli.js](file:///Volumes/D/snail-agent-flow/validators/scripts/test-cli.js)

## Requirements Addressed

- **CTX-01**: Estimation of context budget and three-outcome stage resolution.
- **CTX-02**: Context pack schema and path existence/traversal checks.
- **CTX-03**: Subagent parallelization caps and fan-out overlap checkers.
- **CTX-04**: Fresh session handoff schema and resume stage verification.
- **CTX-05**: Strict gates validation integrated into `adp doctor` and `adp init`.

## Verification

- [x] Automated verification: all 218 tests passed successfully (`npm test`).
- [x] Manual verification: executed `adp doctor` showing clean status.

## Key Decisions

- Use local, offline filesystem byte-pressure heuristics instead of active LLM/token estimation API.
- Maintain idempotency during configuration and instruction updates so existing setups are preserved.
- Establish `.ai/state/context-handoff.json` as the well-known resume linkage by convention.
