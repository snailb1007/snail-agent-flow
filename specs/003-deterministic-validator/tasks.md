# Tasks: Deterministic Validator, Drift Checks, and Human Review Packet

**Input**: Design documents from `specs/003-deterministic-validator/`

**Prerequisites**: plan.md (required), spec.md (required)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initial folder structure and file setups.

- [ ] T001 Create validators directory structure `validators/scripts/`
- [ ] T002 Initialize validator script `validators/scripts/validate-spec.js` and test file `validators/scripts/test-validator.js` with boilerplate

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities for file/state manipulation that all stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Setup test framework helper to mock file systems in `validators/scripts/test-validator.js`
- [ ] T004 Implement active feature path resolution logic in `validators/scripts/validate-spec.js` (read `.specify/feature.json`)
- [ ] T005 Implement `run-state.json` parsing and writing utility in `validators/scripts/validate-spec.js`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Running the Deterministic Validator (Priority: P1) 🎯 MVP

**Goal**: Validate spec/plan/tasks files for existence, required headings, and scan for forbidden placeholders.

**Independent Test**: Run validator against a mock spec folder with missing headings/placeholders, verify exit codes (1) and stdout/stderr error taxonomy.

- [ ] T006 [US1] Implement file existence checks for `spec.md`, `plan.md`, `tasks.md` in `validators/scripts/validate-spec.js`
- [ ] T007 [US1] Implement `spec.md` heading validation (Goal, Non-Goals, Acceptance Criteria, Test Strategy, Behavior-Preservation Rules) in `validators/scripts/validate-spec.js`
- [ ] T008 [US1] Implement `plan.md` heading validation (Proposed Changes, Verification Plan) in `validators/scripts/validate-spec.js`
- [ ] T009 [US1] Implement `tasks.md` checklist pattern validation in `validators/scripts/validate-spec.js`
- [ ] T010 [US1] Implement case-insensitive placeholder scan for TODO, TBD, NEEDS CLARIFICATION, FIXME, XXX in `validators/scripts/validate-spec.js`
- [ ] T011 [US1] Write automated test cases for file, heading, and placeholder validations in `validators/scripts/test-validator.js`

**Checkpoint**: User Story 1 (core validation) is fully functional and testable.

---

## Phase 4: User Story 2 - Path Drift & Spec-Kit Ownership Verification (Priority: P2)

**Goal**: Scan legacy directories recursively for markdown specs and verify Spec-Kit ownership of files to prevent path/tool conflicts.

**Independent Test**: Place a markdown file in a legacy path and verify the validator fails with Path Drift.

- [ ] T012 [US2] Implement recursive directory scan for legacy spec files (`.specify/specs/`, `specs/current/`, `.ai/specs/`) in `validators/scripts/validate-spec.js`
- [ ] T013 [US2] Implement Spec-Kit ownership validation to prevent competing files in `validators/scripts/validate-spec.js`
- [ ] T014 [US2] Write automated tests for path drift and ownership validation in `validators/scripts/test-validator.js`

**Checkpoint**: User Stories 1 and 2 are functional and verified.

---

## Phase 5: User Story 3 - Retry Tracking & Human Review Packet Generation (Priority: P3)

**Goal**: Maintain consecutive failure count in `run-state.json`, generate human review packet on the 3rd failure, and return correct exit codes.

**Independent Test**: Mock 3 validation failures and assert that a formatted human review packet is created at `.ai/reviews/<feature-slug>/human-review.md` and exit code 10 is returned.

- [ ] T015 [US3] Implement retry counter increment/reset logic in `validators/scripts/validate-spec.js`
- [ ] T016 [US3] Implement human review packet template copy and replacement logic in `validators/scripts/validate-spec.js`
- [ ] T017 [US3] Implement exit code handling (0 on pass, 1 on block < 3, 10 on Needs Review) in `validators/scripts/validate-spec.js`
- [ ] T018 [US3] Write automated tests for retry limit logic and human review packet generation in `validators/scripts/test-validator.js`

**Checkpoint**: All user stories are independently functional and fully covered by tests.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, CLI integration, and final verification.

- [ ] T019 [P] Update project documentation (CONTEXT.md, CLAUDE.md/GEMINI.md references) with validator instructions
- [ ] T020 [P] Integrate validator run command into local npm scripts or dev helper commands
- [ ] T021 Run full validator test suite and self-verify the active feature folder `specs/003-deterministic-validator`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - Can proceed sequentially in priority order (P1 → P2 → P3).
- **Polish (Final Phase)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2).
- **User Story 2 (P2)**: Can start after Foundational (Phase 2).
- **User Story 3 (P3)**: Can start after Foundational (Phase 2).

### Parallel Opportunities

- T019 and T020 in Polish phase can run in parallel.

---

## Parallel Example: Polish Phase

```bash
Task: "Update project documentation (CONTEXT.md, CLAUDE.md/GEMINI.md references)"
Task: "Integrate validator run command into local npm scripts or dev helper commands"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently.

### Incremental Delivery

1. Complete Setup + Foundational.
2. Add User Story 1 → Test independently.
3. Add User Story 2 → Test independently.
4. Add User Story 3 → Test independently.
5. Perform Polish phase.
