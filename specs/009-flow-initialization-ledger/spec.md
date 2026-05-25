# Flow Initialization and Ledger State

## Goal

Extend `adp init` to bootstrap flow infrastructure: copy the default flow definition into the target project, create the ledger state file that tracks stage progress, and generate a Gemini skill stub for agent discoverability.

This is the bridge between Phase 8's declarative flow definition format and Phase 10's flow engine skill. After this phase, any project can `adp init` and get a flow-ready `.ai/` directory with the default 10-stage rough-project-flow installed and a ledger initialized with all stages pending.

## Non-Goals

- Implement the flow engine that reads the ledger and dispatches skills (Phase 10).
- Implement deterministic artifact gate checking (Phase 11).
- Implement the flow validator or corruption detection (Phase 13).
- Add `adp status` integration with the flow ledger (deferred).
- Auto-install missing prerequisite tools (PRD non-goal).

## Acceptance Criteria

1. `adp init` on a greenfield project creates `.ai/flows/` containing `rough-project-flow.yaml` copied from the package template.
2. `adp init` creates `.ai/state/flow-ledger.json` initialized by parsing the flow definition — all stages set to `pending`, timestamps set, revision history empty.
3. `adp init` generates `.agents/skills/project-flow/SKILL.md` with valid YAML frontmatter and instructions referencing the flow definition and ledger paths.
4. `adp init` on a brownfield project with existing `.ai/flows/`, `flow-ledger.json`, or `project-flow/SKILL.md` skips those files without overwriting or corrupting them.
5. A YAML parse failure during init is caught and logged as a warning — init continues with directory creation and template copies but skips ledger generation.
6. `lib/` is listed in the `files` array of `package.json` so the YAML parser and tool validator ship with the package.
7. All existing tests continue to pass after the changes.
8. New tests verify: greenfield init creates flow files, brownfield init skips existing files, ledger schema matches the flow definition stages.

## Test Strategy

- **Automated:** Extend `test-cli.js` with tests for:
  - Greenfield init creates `.ai/flows/rough-project-flow.yaml`
  - Greenfield init creates `.ai/state/flow-ledger.json` with correct schema
  - Greenfield init creates `.agents/skills/project-flow/SKILL.md`
  - Brownfield init skips all three when they exist
  - Ledger stage count matches flow definition stage count
  - Ledger stage IDs match flow definition stage IDs
- **Manual:** Run `adp init` in a temp directory and inspect the output files.
- **Regression:** Run `npm test` to verify all existing tests pass.

## Behavior-Preservation Rules

- Existing `adp init` behavior must not change for the directories and files it already creates (`.ai/sessions`, `.ai/memory`, `.ai/reviews`, `.ai/state`, `.specify/templates`, `specs`, `constitution.md`, `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`).
- The init command must remain synchronous and zero-network.
- No external npm dependencies may be added.

## User Scenarios

### Scenario 1: Greenfield Project Init

A developer starts a new project and runs `adp init`. They get the standard `.ai/` infrastructure plus:
- `.ai/flows/rough-project-flow.yaml` — the default 10-stage flow, ready to customize
- `.ai/state/flow-ledger.json` — initialized with all stages `pending`
- `.agents/skills/project-flow/SKILL.md` — agents can discover the flow

### Scenario 2: Brownfield Project Re-Init

A developer runs `adp init` on a project that already has flow infrastructure from a previous init or manual setup. All existing flow files are preserved. Init prints skip messages for each.

### Scenario 3: Corrupted Template

The flow definition template at `.specify/templates/rough-project-flow.yaml` is missing or malformed. Init creates the directories and standard files but skips ledger generation, logging a warning.

## Functional Requirements

- FR-001: `handleInit()` creates `.ai/flows/` directory if it does not exist.
- FR-002: `handleInit()` copies `.specify/templates/rough-project-flow.yaml` to `.ai/flows/rough-project-flow.yaml` if the destination does not exist.
- FR-003: `handleInit()` parses the flow definition using `lib/yaml-parser.js` and generates `.ai/state/flow-ledger.json` with full tracking fields if the destination does not exist.
- FR-004: `handleInit()` creates `.agents/skills/project-flow/` and writes `SKILL.md` if it does not exist.
- FR-005: All new file creation follows the skip-if-exists brownfield pattern.
- FR-006: YAML parse errors during init are caught and logged without crashing.
- FR-007: `package.json` `files` array includes `lib/`.

## Assumptions

- The flow definition template at `.specify/templates/rough-project-flow.yaml` exists and is valid YAML (shipped with the package from Phase 8).
- `lib/yaml-parser.js` correctly parses the flow definition format (tested in Phase 8).
- The ledger schema defined here is forward-compatible with Phase 10's flow engine requirements.
