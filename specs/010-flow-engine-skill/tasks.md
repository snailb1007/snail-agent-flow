# Tasks: Flow Engine Skill

**Prerequisites**: plan.md and spec.md

## Slice 1: Flow Engine Library Core

- [x] T001 Create `lib/flow-engine.js` with `validateLedger(ledger)` — checks required fields, valid stage IDs, valid status enum values. Returns `{ valid, errors }`.
- [x] T002 Add `resolveNextStage(ledger, flowDefinition)` — returns first `needs_revision` stage, else first `pending` stage, else null. Includes flow definition metadata in return.
- [x] T003 Add `checkArtifacts(flowStage, repoRoot, variables)` — resolves template variables in paths, checks file existence and non-empty. Returns `{ passed, results }`.
- [x] T004 Add `advanceStage(ledger, stageId, artifactPaths)` — sets status `done`, records artifacts, timestamps, advances `current_stage`.
- [x] T005 Add `triggerRevision(ledger, fromStageId, toStageId, reason)` — resets range to `needs_revision`, clears artifacts/gate_result, increments revision_count, logs to revision_history.
- [x] T006 Add `formatStageInstruction(flowStage, ledgerStage)` — returns structured block string matching D-10-03 format.
- *Validation*: All functions exported, each callable with mock data. ✅

## Slice 2: Flow Engine SKILL.md

- [x] T007 Replace `.agents/skills/project-flow/SKILL.md` with full engine instructions: YAML frontmatter, Quick Start, Starting a Flow, Resuming a Flow, Stage Resolution Algorithm, Completing a Stage, Triggering a Revision, Variable Resolution, Structured Output Format, Files Reference.
- [x] T008 Include JSON before/after examples for: starting a stage, completing a stage, triggering a revision.
- [x] T009 Include Variable Resolution table mapping `{phase_id}`, `{feature_slug}`, `{feature_dir}` to sources.
- *Validation*: SKILL.md is a valid Gemini skill with frontmatter. Instructions are actionable. ✅

## Slice 3: Template Update

- [x] T010 Update `.specify/templates/project-flow-skill-template.md` to match the new full SKILL.md content.
- *Validation*: Template matches installed SKILL.md. ✅

## Slice 4: Test Suite

- [x] T011 Create `validators/scripts/test-flow-engine.js` with tests for all 6 exported functions.
- [x] T012 Add `resolveNextStage` tests: all pending, partial done, needs_revision priority, all done.
- [x] T013 Add `checkArtifacts` tests: all exist, missing file, empty file, template variable resolution.
- [x] T014 Add `advanceStage` tests: normal advance, all stages done.
- [x] T015 Add `triggerRevision` tests: range reset, revision_history logging, edge cases (first stage, adjacent stage).
- [x] T016 Add `validateLedger` tests: valid ledger, missing fields, invalid status values.
- [x] T017 Add `formatStageInstruction` tests: output format, missing command handling.
- [x] T018 Update `package.json` test script to include `node validators/scripts/test-flow-engine.js`.
- *Validation*: `npm test` passes with all new tests. ✅ (78 tests passed)

## Slice 5: Feature Pointer and Spec Validation

- [x] T019 Update `.specify/feature.json` to point to `specs/010-flow-engine-skill`.
- [x] T020 Create `specs/010-flow-engine-skill/checklists/requirements.md` with quality checklist.
- [x] T021 Run `npm run validate` — spec validation passes. ✅
- [x] T022 Run `npm test` — all tests pass including new flow engine tests. ✅
