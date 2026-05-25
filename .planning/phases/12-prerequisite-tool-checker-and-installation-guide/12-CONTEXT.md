# Phase 12: Prerequisite Tool Checker and Installation Guide — Context

**Date:** 2026-05-25
**Phase:** 12-prerequisite-tool-checker-and-installation-guide
**Requirements:** WARN-01, WARN-02, WARN-03, WARN-04

## Decisions

### D-12-01: Extend `adp doctor` for Prerequisite Checking
We will extend the `adp doctor` command to check for the presence of prerequisite tools declared in the active flow definition. 
- It will read `.ai/flows/rough-project-flow.yaml` to extract the `prerequisites` list.
- It will call `validatePrerequisites` from `lib/tool-validator.js`.
- If any tools are missing, it will output structured warnings and precise, platform-specific installation instructions (such as macOS `brew` or `npm` directions), and exit with a failure code (1) to indicate the environment is not healthy.

**Rationale:** SEM-01 and CLI-01 establish `adp doctor` as the standard CLI health check. Bundling prerequisite checking there avoids command fatigue and ensures the environment is fully verified before feature work.

### D-12-02: Flow Engine Skill Integration
We will integrate tool verification with the `project-flow` engine skill.
- Before resolving the next stage's instruction block, the flow engine will check if the tool required for that stage's `skill` is available.
- Specifically, it will look up the `prerequisites` list in the flow definition and find the entry matching the stage's declared `skill` or `command`.
- If the required tool is missing, the engine will output a `⚠️ PREREQUISITE WARNING` block instead of the standard instruction block, mark the stage status as `blocked` in the ledger, and halt execution.

**Rationale:** WARN-04 requires halting or warning before attempting to execute stages with missing tools. This prevents agents from running commands they don't have, avoiding unrecoverable execution errors.

### D-12-03: Structured Installation Database
We will implement a structured database/dictionary of platform-specific installation instructions in a new module or within the checker.
- The instructions will cover key tools in the flow:
  - **GSD** (`gsd-discuss-phase`): "Download and copy the GSD skill folder to .agents/skills/gsd-discuss-phase or ~/.gemini/config/skills/gsd-discuss-phase"
  - **Superpowers** (`using-superpowers`): "Download and copy the Superpowers skill folder to .agents/skills/using-superpowers or ~/.gemini/config/skills/using-superpowers"
  - **Spec-Kit** (`speckit-specify`): "Download and copy the Spec-Kit skill folder to .agents/skills/speckit-specify or ~/.gemini/config/skills/speckit-specify"
  - **GStack** (`plan-ceo-review`): "Download and copy the GStack skill folder to .agents/skills/plan-ceo-review or ~/.gemini/config/skills/plan-ceo-review"

**Rationale:** WARN-03 requires guiding the user through setting up missing tools with brew/npm/git instructions.

## Assumptions

- The active flow definition is located at `.ai/flows/rough-project-flow.yaml` in the target project.
- `lib/tool-validator.js` correctly checks local skill paths and fallback commands on system PATH.
- macOS is the primary target OS for custom instructions, with standard node/npm setups.

## Constraints

- No automatic installation of tools — users must perform setup manually.
- No external HTTP requests to fetch instructions — the database is fully offline and local.
- Checking must be deterministic (no LLM-as-judge).

## Open Questions

None.

## Dependencies

- Phase 8: `lib/tool-validator.js` (complete).
- Phase 10: `lib/flow-engine.js` (complete) and `project-flow` skill (complete).
