---
phase: 16-context-budget-gate-and-subagent-orchestration-policy
plan: 02
status: complete
completed: 2026-05-27
---

# Summary — Flow Engine Integration

## Findings verified

- Integrating the context policy directly into stage resolution ensures the policy decision is evaluated and presented before any work begins on a stage.
- Modifying `resolveNextStage` to return `contextPolicy` alongside `ledgerStage` and `flowStage` satisfies the integration requirement without breaking existing two-argument callers.
- Updating `formatStageInstruction` appends the rendered CONTEXT POLICY block at the end of the printed instructions, instructing the agent on necessary context setup or session stops.

## Changes

- **`lib/flow-engine.js`**
  - Updated `resolveNextStage` to accept optional `repoRoot` and `variables` parameters and return `contextPolicy` (outcome, size, inputs, policy config) on success.
  - Updated `formatStageInstruction` to accept an optional third argument `contextPolicy` and append the styled `─── CONTEXT POLICY ───` section with outcome details and actions.
- **`validators/scripts/test-flow-engine.js`**
  - Added test cases verifying context policy emission inside `resolveNextStage`.
  - Added test cases verifying `formatStageInstruction` output matches outcomes.

## Verification

- Verified that all unit tests pass:
  - `node validators/scripts/test-flow-engine.js` completes with exit code 0.
