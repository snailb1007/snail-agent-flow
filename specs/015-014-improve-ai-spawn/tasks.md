# Tasks: Improve AI for Spawn Subagent Support

**Prerequisites**: plan.md and spec.md

## Specification Review

- [x] T001 Review generated spec for scope and acceptance criteria.
- [x] T002 Refine plan with impacted files, risks, and verification commands.

## Implementation

- [x] T003 Implement dynamic skill discovery and localization in `bin/adp.js`:
  - Scan `~/.gemini/config/skills/` for directories starting with `gsd-`.
  - For each folder, read `SKILL.md` (if present) and parse `<execution_context>` blocks for global paths.
  - Copy referenced workflow and reference files to workspace subdirectories `.agents/skills/<skill-slug>/` and `.claude/skills/<skill-slug>/`.
  - Copy and write rewritten `SKILL.md` files where global paths are replaced with workspace-relative ones.
  - Handle missing global files gracefully by logging warnings and not crashing.
  - Skip overwriting if local destination files already exist (brownfield preservation).
- [x] T004 Implement subagent & parallel execution guidelines appending logic in `bin/adp.js`:
  - Format a standardized `## Subagent & Parallel Execution Guidelines` markdown block.
  - For `CLAUDE.md`, `GEMINI.md`, and `AGENTS.md`, check if the section exists; if not, append it to the end of the file.
- [x] T005 Add dynamic localization and instruction tests to `validators/scripts/test-cli.js`.

## Verification And Handoff

- [x] T006 Run deterministic spec validation (`node validators/scripts/validate-spec.js`).
- [x] T007 Run full test suite (`npm test`).
- [x] T008 Perform manual verification of `init` command output and verify local files.
- [x] T009 Update handoff and memory notes.
