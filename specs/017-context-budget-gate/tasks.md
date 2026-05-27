# Tasks: Context Budget Gate and Subagent Orchestration Policy

**Input**: Design documents from `/specs/017-context-budget-gate/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks are included as requested by the plan.md verification plan.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create context pack storage folder `.ai/context-packs/` and add `.ai/context-packs/.gitkeep`
- [x] T002 Create JSON schema definition for context policy configuration in `specs/017-context-budget-gate/contracts/context-policy.schema.json`
- [x] T003 Create JSON schema definition for context pack in `specs/017-context-budget-gate/contracts/context-pack.schema.json`
- [x] T004 Create JSON schema definition for context handoff in `specs/017-context-budget-gate/contracts/context-handoff.schema.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Implement baseline schema validation helper in `lib/context-policy-validator.js`
- [x] T006 Implement policy configuration loading and threshold logic in `lib/context-budget.js`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Context Budget Gate Stage Resolution (Priority: P1)

**Goal**: Estimate context pressure and resolve next stage execution outcome (inline, context pack, or fresh session).

**Independent Test**: Run unit tests in `validators/scripts/test-context-budget.js` with mocked files and session sizes.

### Tests for User Story 1

- [x] T007 [P] [US1] Write unit tests for byte-pressure calculation and threshold logic in `validators/scripts/test-context-budget.js`

### Implementation for User Story 1

- [x] T008 [US1] Implement byte-pressure estimation logic in `lib/context-budget.js` using fs.statSync
- [x] T009 [US1] Implement decision resolver based on thresholds in `lib/context-budget.js`
- [x] T010 [US1] Integrate context budget calculation into `resolveNextStage` in `lib/flow-engine.js`
- [x] T011 [US1] Update `formatStageInstruction` in `lib/flow-engine.js` to append CONTEXT POLICY block
- [x] T012 [US1] Write unit tests for flow engine integration in `validators/scripts/test-flow-engine.js`

**Checkpoint**: User Story 1 is fully functional and testable.

---

## Phase 4: User Story 2 - Minimal Context Pack Generation (Priority: P1)

**Goal**: Generate a minimal structured context pack JSON manifest under `.ai/context-packs/`.

**Independent Test**: Verify generated context pack syntax and paths in `validators/scripts/test-context-budget.js`.

### Tests for User Story 2

- [x] T013 [P] [US2] Add unit tests for context pack schema and path validation in `validators/scripts/test-context-budget.js`

### Implementation for User Story 2

- [x] T014 [US2] Implement validation for context pack schema and relative paths in `lib/context-policy-validator.js`
- [x] T015 [US2] Update `adp init` in `bin/adp.js` to write a default `.ai/state/context-policy.json` config file and append context policy to instructions

**Checkpoint**: User Story 2 is fully functional and testable.

---

## Phase 5: User Story 3 - Conservative Subagent Fan-Out (Priority: P2)

**Goal**: Enforce parallelism caps and verify disjoint write targets for subagents.

**Independent Test**: Validate concurrent fan-out and overlap checkers in `validators/scripts/test-context-budget.js`.

### Tests for User Story 3

- [x] T016 [P] [US3] Add unit tests for subagent fan-out and parallelism checks in `validators/scripts/test-context-budget.js`

### Implementation for User Story 3

- [x] T017 [US3] Implement subagent fan-out and write target overlap checks in `lib/context-policy-validator.js`
- [x] T018 [US3] Enforce parallel subagent limit and ledger mutation protection rules in `lib/flow-engine.js`

**Checkpoint**: User Story 3 is fully functional and testable.

---

## Phase 6: User Story 4 - Strict Orchestration Validation (Priority: P1)

**Goal**: Strict validation gates for handoff, packs, and doctor/init parity.

**Independent Test**: Verify gate execution and diagnostics output in `validators/scripts/test-init-checks.js`.

### Tests for User Story 4

- [x] T019 [P] [US4] Add tests for context and policy validation gates in `validators/scripts/test-init-checks.js`

### Implementation for User Story 4

- [x] T020 [US4] Implement schema validation for handoff files in `lib/context-policy-validator.js`
- [x] T021 [US4] Update `runStrictChecks` in `lib/init-checks.js` to validate policy config, packs, and handoff files
- [x] T022 [US4] Update CLI doctor command in `bin/adp.js` to run context/policy validation gates and write `.ai/state/repair-guide.md` on failures
- [x] T023 [US4] Add integration tests in `validators/scripts/test-cli.js` verifying doctor and init command behaviors

**Checkpoint**: User Story 4 is fully functional and testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation updates and final verification

- [x] T024 [P] Update project documentation (README.md, CONTEXT.md) to describe context budget gates
- [x] T025 Run full project verification suite and ensure all tests pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: Depend on Foundational completion. US1 and US2 are P1, US3 is P2, US4 is P1.
- **Polish (Phase 7)**: Depends on all user stories being complete.

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Setup and Foundational.
2. Complete User Story 1 (Stage Resolution).
3. Complete User Story 2 (Context Pack Generation).
4. Run validation and verify MVP behavior.
