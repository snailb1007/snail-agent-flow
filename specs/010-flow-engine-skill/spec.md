# Flow Engine Skill

## Goal

Package the flow orchestrator as a Gemini skill under `.agents/skills/project-flow/` that agents mention in chat to start, resume, or inspect the declarative project flow. The skill reads the flow definition from `.ai/flows/`, reads ledger state from `.ai/state/flow-ledger.json`, determines the next actionable stage, and instructs the agent which skill or command to invoke.

This replaces the Phase 9 stub SKILL.md with a fully functional flow engine that automates stage resolution, artifact verification, ledger updates, and revision routing.

## Non-Goals

- Spawning subprocesses or directly invoking tools — the skill instructs agents, not executes.
- Full artifact gate enforcement with heading validation, content checks, and circuit breaker — that is Phase 11 (GATE-01 through GATE-04).
- Flow definition syntax validation — that is Phase 13 (FVALID-01 through FVALID-04).
- Multi-flow support — that is v3 (MULTI-01).
- CLI commands for ledger mutation — agents update the ledger directly.

## Acceptance Criteria

1. **ENGINE-01**: A Gemini skill exists at `.agents/skills/project-flow/SKILL.md` with valid YAML frontmatter and complete instructions for starting, resuming, and inspecting the flow.
2. **ENGINE-02**: The skill instructs agents to read the flow definition YAML and ledger JSON, determine the first non-done stage, and output a structured block with the stage name, skill to invoke, command, required artifacts, and revision routes.
3. **ENGINE-03**: After a stage completes, the skill instructs the agent to verify required artifacts exist (file exists and non-empty), update the ledger status to `done`, record artifact paths, and advance to the next stage.
4. **ENGINE-04**: Revision loops are supported — the skill instructs the agent how to route back to the correct upstream stage, reset affected ledger entries, and log the revision reason in `revision_history`.
5. **Helper module**: A `lib/flow-engine.js` module implements stage resolution, basic artifact checking, ledger mutation helpers, and revision routing as testable functions.
6. **Template variable resolution**: The SKILL.md includes a variable resolution section mapping `{phase_id}`, `{feature_slug}`, and `{feature_dir}` to their project-context sources.
7. **Ledger mutation examples**: The SKILL.md includes exact JSON before/after examples for common ledger updates (start stage, complete stage, trigger revision).
8. **Tests**: Unit tests for `lib/flow-engine.js` cover stage resolution, artifact checking, ledger mutation, and revision routing.

## Test Strategy

- Unit tests for `lib/flow-engine.js`:
  - `resolveNextStage()` returns the first non-done stage.
  - `resolveNextStage()` returns `needs_revision` stages before `pending` stages.
  - `checkArtifacts()` detects missing files and empty files.
  - `advanceStage()` updates status, artifacts, timestamps correctly.
  - `triggerRevision()` resets the correct range of stages and logs revision history.
  - `triggerRevision()` handles edge cases: revision to first stage, revision to adjacent stage.
- Integration with existing `npm test` — new test file added to the test command.
- `npm run validate` must continue to pass with the new spec directory.

## Behavior-Preservation Rules

- Preserve the existing `lib/flow-ledger.js` module (Phase 9). The new `lib/flow-engine.js` imports from it but does not modify it.
- Preserve the existing `lib/yaml-parser.js` module (Phase 8). The engine imports it for parsing flow definitions.
- Preserve the existing `lib/tool-validator.js` module (Phase 8). Not directly used by the engine but must not be broken.
- Preserve the existing `bin/adp.js` CLI. No changes to the CLI in this phase.
- The SKILL.md replaces the Phase 9 stub entirely but maintains backward compatibility — an agent that read the stub will find the same file paths and concepts, plus the new engine instructions.

## User Scenarios

### Scenario 1: Starting a new flow

An agent mentions the `project-flow` skill in chat. The SKILL.md instructs the agent to:
1. Read `.ai/flows/rough-project-flow.yaml` for the stage sequence.
2. Read `.ai/state/flow-ledger.json` for current progress.
3. Find the first stage with status `pending` or `needs_revision`.
4. Output the structured block with the stage details.
5. The agent then invokes the indicated skill.

### Scenario 2: Resuming a flow mid-session

An agent returns after a context reset. The SKILL.md instructs the agent to:
1. Read the ledger and find the current stage.
2. If the current stage is `in_progress`, check if its artifacts exist.
3. If artifacts exist, mark the stage `done` and advance.
4. If artifacts don't exist, remind the agent to complete the stage.

### Scenario 3: Triggering a revision

During the plan critique stage, the agent discovers the spec is incomplete. The SKILL.md instructs:
1. Look up `revision_routing` for the current stage.
2. Find the matching failure type (e.g., `spec_failed`).
3. Reset stages from the target through the current stage to `needs_revision`.
4. Log the revision in `revision_history`.
5. Output the structured block for the target stage.

## Functional Requirements

- FR-001: The SKILL.md must be a valid Gemini skill with `name` and `description` in YAML frontmatter.
- FR-002: The `lib/flow-engine.js` module must export: `resolveNextStage()`, `checkArtifacts()`, `advanceStage()`, `triggerRevision()`, `formatStageInstruction()`, `validateLedger()`.
- FR-003: `resolveNextStage()` must prioritize `needs_revision` stages over `pending` stages.
- FR-004: `checkArtifacts()` must accept a `variables` map for resolving template paths (e.g., `{feature_dir}` → `specs/010-flow-engine-skill`) and verify file existence and non-empty content (size > 0 bytes).
- FR-005: `advanceStage()` must update `status`, `artifacts`, `completed_at`, `current_stage`, and `updated_at`.
- FR-006: `triggerRevision()` must reset all stages between the target and current (inclusive of target) to `needs_revision`, clear their `artifacts` arrays and `gate_result`, increment `revision_count`, and append to `revision_history`.
- FR-010: `validateLedger()` must perform lightweight schema validation (required fields exist, stage IDs non-empty, statuses are valid enum values) before any mutation operation.
- FR-007: `formatStageInstruction()` must output a structured block matching the format in D-10-03.
- FR-008: The SKILL.md must include a variable resolution table for template variables.
- FR-009: The SKILL.md must include exact JSON mutation examples.

## Assumptions

- The flow definition YAML and ledger JSON already exist (created by `adp init` in Phase 9).
- Agents can read and write JSON files.
- Template variables like `{phase_id}` are resolved by the agent from project context.
- The `lib/flow-engine.js` module is consumed by tests and potentially future CLI commands, not by agents directly.
