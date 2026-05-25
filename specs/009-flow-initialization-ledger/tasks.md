# Tasks: Flow Initialization and Ledger State

**Prerequisites**: plan.md and spec.md

## Package Configuration

- [x] T001 Add `"lib/"` to `"files"` array in `package.json`.

## Ledger Factory Module

- [x] T002 Create `lib/flow-ledger.js` with `createLedgerFromFlow(flowDefinition)` function.
- [x] T003 The function must extract `flow_name`, `flow_version` from the flow definition.
- [x] T004 The function must generate the `stages` array from the definition with all required tracking fields.
- [x] T005 The function must set `current_stage` to the first stage's `id`.
- [x] T006 The function must set ISO timestamps for `created_at` and `updated_at`.

## SKILL.md Template

- [x] T007 Create `.specify/templates/project-flow-skill-template.md` with YAML frontmatter and agent instructions.

## Init Extension

- [x] T008 Add `.ai/flows` to the `dirs` array in `handleInit()`.
- [x] T009 Add flow definition copy logic: copy `rough-project-flow.yaml` from package templates to `.ai/flows/` (skip-if-exists).
- [x] T010 Add ledger generation logic: parse flow YAML, call `createLedgerFromFlow()`, write to `.ai/state/flow-ledger.json` (skip-if-exists, try-catch protected).
- [x] T011 Add SKILL.md generation logic: copy template to `.agents/skills/project-flow/SKILL.md` (skip-if-exists, create directory if needed).

## Feature Directory Cleanup

- [x] T012 Update `.specify/feature.json` to point to `specs/009-flow-initialization-ledger`.

## Tests

- [x] T013 Add greenfield flow init tests to `test-cli.js` (flow YAML, ledger JSON, SKILL.md existence).
- [x] T014 Add brownfield skip test to `test-cli.js` (pre-create files, verify no overwrite).
- [x] T015 Add ledger schema validation test (stage count matches, stage IDs match, all statuses pending).

## Verification And Handoff

- [x] T016 Run `npm run validate` — spec validation passes.
- [x] T017 Run `npm test` — all tests pass including new flow init tests.
- [x] T018 Manual greenfield init verification in a temp directory.
- [x] T019 Update handoff and memory notes if needed.
