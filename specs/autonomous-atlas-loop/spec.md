# Autonomous ATLAS Loop

## Goal

Implement a fully autonomous ATLAS loop where the AI agent reads `flow-state.json`, selects the next stage, executes the necessary skill/tool, runs deterministic gate scripts, and transitions — without manual CLI intervention. Fix all script/state mismatches that currently prevent autonomous operation.

## Non-Goals

- Replacing the CLI entirely — CLI remains available for manual/debugging use
- Testing agent intelligence or reasoning quality
- Building a web UI for the ATLAS loop
- Changing the 5-stage model (align/trace/lay/act/settle)

## Acceptance Criteria

- AC1: `score-and-claim.js --auto --description "text"` generates valid flow-state with STANDARD profile, syncs `.specify/feature.json`
- AC2: `score-and-claim.js` with BUGFIX/PROTOTYPE override sets `work_mode` correctly while `risk_profile` stays in {FAST, STANDARD, FULL}
- AC3: `saf lease <file>` syncs lock entry into `flow-state.json.locks` on acquire and removes on release
- AC4: `handleLease` normalizes file paths to absolute via repoRoot before LeaseManager calls
- AC5: `lay-preflight.js` falls back to `.ai/locks/` scan when `state.locks` is empty, syncs discovered locks into state before returning PASS
- AC6: `settle-full.js` orchestrates verify → signal-log → release-locks → mark done with configurable verify command (CLI arg → flow-state → atlas-flow.yaml → npm test)
- AC7: `atlas-flow.yaml` extended with `agent_action`, `gate`, `post_gate`, `verify_command` fields per stage
- AC8: `upsertAtlasGuidelines()` replaces old `## ATLAS Loop` or existing `## Autonomous ATLAS Loop` idempotently
- AC9: All 22 deterministic rail tests pass via `npm test`
- AC10: Agent instruction files (CLAUDE.md, GEMINI.md, AGENTS.md) contain `## Autonomous ATLAS Loop` section

## Test Strategy

Deterministic rail tests only. Each test verifies a specific script's state I/O (file reads/writes, exit codes, JSON structure). No agent behavior testing.

Test runner: `npm test` which includes all `test-*.js` files under `tests/`.

## Behavior-Preservation Rules

- Existing `score-and-claim.js` with full JSON payload must continue working (backward compatible)
- Existing `saf lease` CLI interface unchanged (new flags optional)
- Existing `settle.js` remains functional (settle-full.js is additive)
- Existing `lay-preflight.js` behavior unchanged when `state.locks` is non-empty
- Existing `transition.js` contract unchanged
