# Phase 10: Flow Engine Skill — Context

**Date:** 2026-05-25
**Phase:** 10-flow-engine-skill
**Requirements:** ENGINE-01, ENGINE-02, ENGINE-03, ENGINE-04

## Decisions

### D-10-01: SKILL.md + Helper Library Architecture
The flow engine skill is split into two parts:
- **SKILL.md** (`project-flow/SKILL.md`): Agent-facing instructions that describe the stage resolution algorithm, ledger update protocol, revision routing, and output format. Agents read and follow these instructions.
- **lib/flow-engine.js**: Deterministic helper module that implements stage resolution, artifact checking, ledger mutation helpers, and revision routing. Agents do not execute this JS — it exists for testing, documentation, and future CLI integration. The SKILL.md instructions mirror the module's logic.

**Rationale:** Consistent with existing `lib/` pattern (yaml-parser, flow-ledger, tool-validator). Separates testable logic from agent-readable instructions.

### D-10-02: Agent-Instructed Ledger Mutation
The agent updates `flow-ledger.json` directly by reading and writing the file. The SKILL.md provides exact field update instructions:
- Set `stages[n].status` to `in_progress` when starting, `done` when artifacts verified.
- Set `stages[n].artifacts` to array of verified artifact paths.
- Set `stages[n].completed_at` to ISO timestamp.
- Update `current_stage` to the next non-done stage ID.
- Update root `updated_at`.

**Rationale:** No CLI subprocess needed. Keeps the skill as pure agent instruction. CLI ledger commands can be added later.

### D-10-03: Structured Block Output Format
When the skill determines the next stage, it outputs a structured block:
```
═══ NEXT STAGE ═══
Stage:     Decision Discovery (decision_discovery)
Skill:     gsd-discuss-phase
Command:   node bin/adp.js new-session "discuss"
Artifacts:
  - .planning/phases/{phase_id}-CONTEXT.md [headings: "## Decisions"]
  - .planning/phases/{phase_id}-DISCUSSION-LOG.md [headings: "# Phase"]
Revision Routes:
  (none for this stage)
═══════════════════
```

**Rationale:** Deterministic, parseable, mirrors flow YAML structure. Agents can extract skill name and artifact paths without ambiguity.

### D-10-04: Simple Revision Reset
When a downstream stage triggers a revision:
1. Look up the `revision_routing` for the current stage.
2. Find the target stage ID based on the failure type.
3. Reset the target stage and all stages between target and current to `needs_revision`.
4. Set `current_stage` to the target stage ID.
5. Append a revision entry to `revision_history` with: `from_stage`, `to_stage`, `reason`, `timestamp`.

**Rationale:** The flow is sequential — resetting the range is safe. ENGINE-04 requires automatic ledger reset, not manual.

### D-10-05: Basic Inline Artifact Gates
Phase 10 includes simple artifact checks after each stage:
- File exists at the expected path.
- File is non-empty (size > 0).
If checks pass, the stage gate passes. If not, the stage status stays `in_progress` and the agent is told which artifacts are missing.

Phase 11 adds: heading validation, content checks, gate failure logging, circuit breaker (3 failures → NEEDS_HUMAN_REVIEW).

**Rationale:** ENGINE-03 requires "validate required artifacts exist." Existence + non-empty is the minimum that satisfies the requirement.

## Assumptions

- The flow definition YAML is already copied to `.ai/flows/rough-project-flow.yaml` by `adp init` (Phase 9).
- The ledger JSON is already created at `.ai/state/flow-ledger.json` by `adp init` (Phase 9).
- Agents can read and write JSON files.
- Agents can read YAML file content and extract stage definitions.
- Template placeholders like `{phase_id}` and `{feature_slug}` are resolved by the agent based on project context.

## Constraints

- The flow skill instructs agents — it does NOT spawn subprocesses or invoke tools directly.
- No LLM-as-judge for gate pass/fail decisions (deterministic only).
- The skill must work with the built-in `rough-project-flow.yaml`.
- The `lib/flow-engine.js` module must be testable independently.

## Open Questions

None — all gray areas resolved.

## Dependencies

- Phase 8: Flow definition YAML format and built-in flow (complete).
- Phase 9: Flow initialization, ledger state, SKILL.md stub (complete).
- `lib/yaml-parser.js`: Parses flow definition YAML.
- `lib/flow-ledger.js`: Creates initial ledger from flow definition.

## Deferred Ideas

- CLI commands for ledger mutation (`adp flow advance`, `adp flow reset`).
- `adp status` integration with flow ledger state.
- Multi-flow support (v3).
- Visual flow dashboard (v3).
