# Budget and Pack CLI Commands

## Goal

Expose the existing context-budget gate (feature 017) as user-facing CLI commands so agents and developers can measure byte pressure and generate context packs on demand, outside the flow engine. Two new commands: `saf budget` reports the estimated byte pressure and policy decision for the current (or given) stage; `saf pack` generates a schema-valid context-pack manifest under `.ai/context-packs/`.

## Non-Goals

- Token counting or any online tokenization (byte-pressure heuristic only, per 017 locked assumption).
- Changing default flow-engine behavior or existing command signatures.
- Blocking behavior by default: `saf budget` is report-only unless the caller passes `--enforce` (opt-in, per `docs/compatibility-policy.md`).
- Automatic subagent spawning or session management.

## Acceptance Criteria

1. `saf budget` prints estimated total bytes, configured thresholds, per-input breakdown, and exactly one outcome of `inline`, `context_pack_required`, or `fresh_session_required`; exit code is 0 in report mode.
2. `saf budget --enforce` exits 1 when the outcome is not `inline`; `saf budget --json` emits machine-readable JSON.
3. `saf pack` writes a manifest to `.ai/context-packs/` that passes `validateContextPack` from `lib/context-policy-validator.js`; generation fails closed (exit 1, nothing written) if the built manifest is invalid.
4. Both commands work without a flow state file (ad-hoc mode: sessions, packs, and handoff inputs are still counted; stage-specific artifacts are skipped with a notice).
5. Existing commands, flags, exit codes, and default outputs are unchanged.

## Test Strategy

- Unit tests for the pack generator in `validators/scripts/test-context-pack-generator.js` (manifest fields, relative paths, fail-closed validation).
- CLI integration tests in `validators/scripts/test-cli.js` for `budget` (report, `--json`, `--enforce`) and `pack` (file creation, schema validity, ad-hoc mode).
- Full suite via `npm test`.

## Behavior-Preservation Rules

- Reuse `estimateBudget`, `computeOutcome`, `loadPolicyConfig`, and `validateContextPack` as-is; no signature changes to `lib/` modules.
- New commands only; the dispatcher gains two cases and the usage text gains two lines.
- Offline and deterministic: no network, no LLM calls.

## User Scenarios

### Primary Scenario

Before starting a heavy stage, an agent runs `saf budget`. The command reports 180 KB estimated pressure and the outcome `context_pack_required`. The agent runs `saf pack --objective "Implement settle-stage verification"`, receives the manifest path, hands the pack to a subagent or fresh session, and proceeds with a minimal context.

### Secondary Scenario

A CI step runs `saf budget --enforce --stage act`. Because accumulated session logs push the estimate past the fresh-session threshold, the command exits 1 and the pipeline surfaces the gate before the agent burns context.

## Functional Requirements

- FR-001: `saf budget` resolves the stage from `--stage <id>`, else `.ai/state/flow-state.json`, else runs in ad-hoc mode, and prints bytes, thresholds, inputs, and the policy outcome.
- FR-002: `saf budget --json` prints a single JSON object with `stage_id`, `estimated_bytes`, `thresholds`, `inputs`, and `outcome`; `--enforce` maps non-inline outcomes to exit code 1.
- FR-003: `saf pack` builds a manifest with all schema-required fields (schema_version, created_at, stage_id, objective, required_files, omissions, expected_outputs, validation_commands, stop_conditions), referencing files by workspace-relative path only.
- FR-004: `saf pack` validates the manifest with `validateContextPack` before writing and refuses to write an invalid pack.
- FR-005: Both commands honor `PROJECT_ROOT`/`REPO_ROOT` environment overrides like every other command.

## Assumptions

- Thresholds and budget inputs come from `.ai/state/context-policy.json` with the same defaults as `lib/context-budget.js`.
- The byte-pressure heuristic and its conservative UTF-8 bias remain as locked in feature 017.
- Pack filenames use stage id plus an ISO-derived timestamp; collisions within the same second are acceptable to overwrite-protect by failing if the target exists.
