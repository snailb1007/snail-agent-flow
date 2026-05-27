# Memory Handoff Report

- **Feature:** 011-prerequisite-tool-checker-installation
- **Date:** May 25, 2026

## Promoted to project memory
- **Deterministic Prerequisite Tool Validation**: Introduced a local checking framework that validates prerequisite CLI tools and skill folders (e.g., GSD, Superpowers, Spec-Kit, GStack) before feature execution.
- **Stage Gating & Ledger State Integration**: Added logic to verify if prerequisite tools for a stage's designated skill/command are available. If missing, the flow engine halts execution, updates the stage status in `.ai/state/flow-ledger.json` to `blocked`, and logs a warning block.
- **Dynamic Help & Installation Guide Database**: Created an instructions database containing platform-specific (macOS/npm/git) installation guides and descriptions for core prerequisite tools, dynamically generating repair guides on failure.
- **Case-Insensitive Substring Matching**: Implemented substring and case-insensitive matching for mapping stage skills or commands to their respective declared prerequisite entries (e.g. stage skill `gsd-discuss-phase` matches prerequisite `GSD`).

## Architecture updated
- `lib/tool-validator.js`: Added `validatePrerequisites` to check tool availability (probing paths `.agents/skills/<slug>`, `.claude/skills/<slug>`, `~/.gemini/config/skills/<slug>`, or running checks/PATH command fallbacks) and `getToolInstructions` to fetch tool guides from the new `INSTRUCTIONS_DB` mapping database.
- `lib/flow-engine.js`: Implemented `checkStagePrerequisites(flowStage, prerequisites, repoRoot)` to inspect prerequisites for a specific stage before executing it.
- `lib/init-checks.js`: Integrated `validatePrerequisites` checks into `runStrictChecks` to verify prerequisites defined in the flow definition, returning failures under the `prereqs.<tool>` ID if any required tool is missing.
- `bin/adp.js`: Extended the `doctor` CLI command to run flow prerequisite checks via strict checks and exit with code `1` if any are missing.
- `.agents/skills/project-flow/SKILL.md` & `.specify/templates/project-flow-skill-template.md`: Updated quick start and stage resolution algorithm instructions to require checking prerequisites, print warning blocks on failure, update the ledger stage status to `"blocked"`, and halt.

## Verification promoted
- **Unit Tests**:
  - `validators/scripts/test-flow-engine.js`: Added tests for `checkStagePrerequisites()` covering successful validation, missing prerequisites (with descriptions/instructions), and case-insensitive substring matching.
- **CLI Integration Tests**:
  - `validators/scripts/test-cli.js`: Added CLI tests validating that `adp doctor` fails with exit code 1 when a prerequisite is missing and outputs the corresponding error and instructions. Also added tests to verify that `adp init` fails under the strict checks gate if prerequisite skills are not localized or present.
- **Verification Commands**:
  - `npm test`
  - `node validators/scripts/test-cli.js`
  - `node validators/scripts/test-flow-engine.js`
