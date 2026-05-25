# Memory Handoff Report

- **Feature**: 011-prerequisite-tool-checker-installation
- **Date**: 2026-05-25

## Promoted to project memory
Successfully implemented the Prerequisite Tool Checker and Installation Guide feature (Phase 12).
- Extended the `adp doctor` CLI command to load the active flow, parse its prerequisite tools, check system availability via `lib/tool-validator.js`, output precise installation instructions, and exit with code 1 if any tools are missing.
- Implemented and exported the `checkStagePrerequisites` matching helper in `lib/flow-engine.js` to match stages to required prerequisite tools case-insensitively.
- Integrated prerequisite validation into `.agents/skills/project-flow/SKILL.md` and `.specify/templates/project-flow-skill-template.md` to output warning blocks, set ledger stage status to `"blocked"`, and halt advancement when tools are missing.

## Architecture updated
- Modified `lib/tool-validator.js` to include a structured dictionary `INSTRUCTIONS_DB` and the `getToolInstructions(name)` helper for platform-specific (macOS brew/npm/git) setup instructions.
- Modified `bin/adp.js`'s `handleDoctor()` to load `.ai/flows/rough-project-flow.yaml` and validate prerequisites, exiting with code 1 if missing.
- Modified `lib/flow-engine.js` with `checkStagePrerequisites()`.
- Updated flow engine SKILL.md and its source template.

## Verification promoted
- Added unit tests in `validators/scripts/test-flow-engine.js` to verify prerequisite checking and matching (now 89/89 tests pass).
- Added integration tests in `validators/scripts/test-cli.js` to verify `adp doctor` prerequisite warning block output and exit code 1 handling (now 20/20 tests pass).
- Updated test sandbox setups to pre-create mock skill directories to ensure self-contained, offline-compatible test executions.
