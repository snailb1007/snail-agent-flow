---
phase: "09"
name: "flow-initialization-and-ledger-state"
created: 2026-05-25
---

# Phase 9: Flow Initialization and Ledger State — Context

## Decisions

- **D-09-01: Extend handleInit()**: The existing `handleInit()` function in `bin/adp.js` will be extended to create `.ai/flows/` directory and copy the default flow definition. No new CLI subcommand.
- **D-09-02: Flow Copy Destination**: The default flow definition is copied from `.specify/templates/rough-project-flow.yaml` to `.ai/flows/rough-project-flow.yaml` in the target project. This is the per-project customizable copy.
- **D-09-03: Ledger State Schema**: The ledger file at `.ai/state/flow-ledger.json` contains:
  - `flow_name`: string — name of the active flow
  - `flow_version`: string — version from the flow definition
  - `flow_definition_path`: string — relative path to the flow definition file
  - `current_stage`: string — ID of the first non-done stage
  - `created_at`: ISO timestamp
  - `updated_at`: ISO timestamp
  - `stages`: array of stage objects, each containing:
    - `id`: string — matches flow definition stage ID
    - `name`: string — human-readable name
    - `status`: enum — `pending` | `in_progress` | `done` | `blocked` | `needs_revision`
    - `artifacts`: array of `{path, verified, verified_at}` objects (initially empty)
    - `gate_result`: object `{passed, checked_at, failure_reason}` or null
    - `started_at`: ISO timestamp or null
    - `completed_at`: ISO timestamp or null
    - `revision_count`: number (default 0)
  - `revision_history`: array of `{from_stage, to_stage, reason, timestamp}` objects (initially empty)
- **D-09-04: Brownfield Strategy**: Skip-if-exists for all created files and directories. Consistent with existing `handleInit()` pattern. No deep merge, no backup-and-overwrite.
- **D-09-05: SKILL.md Stub**: A Gemini skill stub is generated at `.agents/skills/project-flow/SKILL.md` with YAML frontmatter (`name: project-flow`, `description`) and instructions pointing agents to the flow definition and ledger. Phase 10 will replace this with the full engine.
- **D-09-06: Ledger Initialization from Flow Definition**: The init command reads the flow definition YAML using `lib/yaml-parser.js`, extracts the stage list, and generates the ledger with all stages set to `pending`.
- **D-09-07: Package Distribution Fix**: Add `lib/` to the `files` array in `package.json` so the YAML parser and tool validator ship with the package.
- **D-09-08: Feature Directory Fix**: Remove the misnamed `specs/009-artifact-gate-enforcement` scaffold and create a correctly-named spec for Phase 9.

## Discretion Areas

- Exact wording of the SKILL.md stub instructions.
- Whether to log a warning or silently skip when brownfield files are detected.
- Ordering of init steps (directories first, then files, then ledger).

## Deferred Ideas

- Flow engine stage resolution logic (Phase 10).
- Artifact gate enforcement (Phase 11).
- Flow validator and corruption detection (Phase 13).
- `adp status` integration with flow ledger (Phase 10 or later).
