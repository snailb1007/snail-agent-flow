# Tasks: Flow Definition Format and Built-in Flow

**Prerequisites**: plan.md and spec.md

## Slice 1: Built-in Flow YAML & Custom Example Templates
- [ ] T001 Create default `rough-project-flow.yaml` template file in `.specify/templates/rough-project-flow.yaml`.
- [ ] T002 Create `custom-flow-example.yaml` template file in `.specify/templates/custom-flow-example.yaml`.
- *Validation*: Verify both files are written and structurally aligned with D-08-02.

## Slice 2: Zero-Dependency YAML Parser Utility
- [ ] T003 Create `lib/yaml-parser.js` implementing pure JS line-by-line parsing:
  - Handles indentation levels, objects, arrays, nested keys, comments, empty lines, and multiline strings.
  - Throws informative syntax error messages with line numbers on parsing failure.
- *Validation*: Manually verify with small string samples.

## Slice 3: Prerequisite Tool Validator Utility
- [ ] T004 Create `lib/tool-validator.js` implementing tool verification logic:
  - Checks if skill directories exist in `.agents/skills/`, `.claude/skills/`, or user config folders.
  - Spawns `command -v <command>` with `child_process.spawnSync` to check CLI binaries on system PATH.
- *Validation*: Test with a mock config folder structure and system commands.

## Slice 4: Automated Testing & CI Integration
- [ ] T005 Create `validators/scripts/test-flow-parser.js` to run unit test suite on parser and tool validator.
- [ ] T006 Update `package.json` to include `node validators/scripts/test-flow-parser.js` in the `test` command.
- *Validation*: Run `npm test` and verify all tests pass.

## Slice 5: Spec Validation & Phase Documentation
- [ ] T007 Run `node validators/scripts/validate-spec.js` to ensure the new spec directory conforms to Spec-Kit requirements.
- [ ] T008 Update `.planning/STATE.md` and `.planning/PROJECT.md` with Phase 8 progress.
